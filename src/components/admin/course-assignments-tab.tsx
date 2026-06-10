'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, User, Loader2, CalendarClock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCourseAssignments,
  setCourseUserAssignments,
  setCourseGroupAssignments,
  setCourseAssignmentDueDate,
  getGroupMemberUserIds,
} from '@/lib/db/course-assignments';
import { enrollUsers } from '@/lib/db/admin-actions';
import { AccessModePicker } from '@/components/admin/access-mode-picker';
import type { CourseAssignments } from '@/types';

async function notifyAssignmentEmails(
  courseId: string,
  userIds: string[],
  dueDateIso?: string | null,
): Promise<void> {
  if (userIds.length === 0) return;
  const res = await fetch('/api/notify/assignment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId,
      userIds,
      ...(dueDateIso ? { dueDate: dueDateIso } : {}),
    }),
  });
  if (!res.ok) return;
  const json = await res.json().catch(() => null);
  if (json && typeof json.sent === 'number' && json.sent > 0) {
    toast.success(`${json.sent} notification email${json.sent === 1 ? '' : 's'} queued`);
  }
}

interface CourseAssignmentsTabProps {
  courseId: string;
  institutionId: string;
  accessMode: 'all' | 'restricted';
  onAccessModeChange: (mode: 'all' | 'restricted') => void;
}

export function CourseAssignmentsTab({
  courseId,
  institutionId,
  accessMode,
  onAccessModeChange,
}: CourseAssignmentsTabProps) {
  const [assignments, setAssignments] = useState<CourseAssignments>({ users: [], groups: [] });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function loadAssignments() {
    setLoading(true);
    const supabase = createClient();
    const data = await getCourseAssignments(supabase, courseId);
    setAssignments(data);
    setSelectedUserIds(data.users.map((a) => a.user_id));
    setSelectedGroupIds(data.groups.map((a) => a.group_id));

    // Existing due date (single date applies to the whole assignment set)
    const { data: dueRows } = await supabase
      .from('course_user_assignments')
      .select('due_date')
      .eq('course_id', courseId)
      .not('due_date', 'is', null)
      .limit(1);
    const existingDue = dueRows?.[0]?.due_date as string | undefined;
    setDueDate(existingDue ? existingDue.slice(0, 10) : '');

    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Capture the previously-assigned user ids BEFORE saving so we can
      // notify only the newly added ones.
      const previousUserIds = assignments.users.map((a) => a.user_id);

      await supabase
        .from('courses')
        .update({ access_mode: accessMode, updated_at: new Date().toISOString() })
        .eq('id', courseId);

      await Promise.all([
        setCourseUserAssignments(supabase, courseId, selectedUserIds, user.id),
        setCourseGroupAssignments(supabase, courseId, selectedGroupIds, user.id),
      ]);

      // Apply the (optional) due date to the whole assignment set
      const dueDateIso = dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null;
      await setCourseAssignmentDueDate(supabase, courseId, dueDateIso);

      const newlyAdded = selectedUserIds.filter((id) => !previousUserIds.includes(id));
      void notifyAssignmentEmails(courseId, newlyAdded, dueDateIso).catch(() => {});

      await loadAssignments();
      toast.success('Assignments updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save assignments');
    } finally {
      setSaving(false);
    }
  }

  async function handleEnrollAssigned() {
    const directUserIds = [...new Set([...assignments.users.map((a) => a.user_id), ...selectedUserIds])];
    setEnrolling(true);
    try {
      const supabase = createClient();
      const groupIds = [...new Set([...assignments.groups.map((g) => g.group_id), ...selectedGroupIds])];
      const groupMemberIds = await getGroupMemberUserIds(supabase, groupIds);
      const userIds = [...new Set([...directUserIds, ...groupMemberIds])];
      if (userIds.length === 0) {
        toast.error('No assigned users or group members to enroll');
        return;
      }

      const { data: existingRows } = await supabase
        .from('course_enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .in('user_id', userIds);
      const alreadyEnrolled = new Set((existingRows ?? []).map((row) => row.user_id as string));

      const dueDateIso = dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null;
      const enrolled = await enrollUsers(supabase, courseId, userIds);
      toast.success(
        enrolled > 0
          ? `${enrolled} user${enrolled === 1 ? '' : 's'} newly enrolled`
          : 'All assigned users were already enrolled',
      );

      if (enrolled > 0) {
        const newlyEnrolled = userIds.filter((id) => !alreadyEnrolled.has(id));
        void notifyAssignmentEmails(courseId, newlyEnrolled, dueDateIso).catch(() => {});
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to enroll users');
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Course Access & Assignments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <AccessModePicker
          accessMode={accessMode}
          selectedUserIds={selectedUserIds}
          selectedGroupIds={selectedGroupIds}
          institutionId={institutionId}
          onAccessModeChange={onAccessModeChange}
          onSelectedUsersChange={setSelectedUserIds}
          onSelectedGroupsChange={setSelectedGroupIds}
        />

        {accessMode === 'restricted' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="assignment-due-date" className="text-sm font-medium flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-slate-500" />
                Due date (optional)
              </Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="assignment-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-44"
                />
                {dueDate && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDueDate('')}>
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Applies to all assigned users and groups for this course.
              </p>
            </div>

            {assignments.groups.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Currently Assigned Groups</Label>
                <div className="mt-2 space-y-1">
                  {assignments.groups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium">{g.group_name}</span>
                        <Badge variant="secondary" className="text-xs">{g.member_count} members</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assignments.users.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Currently Assigned Users</Label>
                <div className="mt-2 space-y-1">
                  {assignments.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-sm">{u.full_name || u.email}</span>
                        {u.full_name && <span className="text-xs text-slate-500">{u.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Assignments
          </Button>
          {accessMode === 'restricted' && (
            <Button
              variant="outline"
              onClick={handleEnrollAssigned}
              disabled={enrolling || saving}
              className="border-[#1E3A5F]/30 text-[#1E3A5F] hover:bg-[#1E3A5F]/5"
            >
              {enrolling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Enroll assigned users & groups
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
