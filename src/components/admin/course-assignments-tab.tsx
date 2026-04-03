'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Users, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCourseAssignments,
  setCourseUserAssignments,
  setCourseGroupAssignments,
} from '@/lib/db/course-assignments';
import { AccessModePicker } from '@/components/admin/access-mode-picker';
import type { CourseAssignments } from '@/types';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, [courseId]);

  async function loadAssignments() {
    setLoading(true);
    const supabase = createClient();
    const data = await getCourseAssignments(supabase, courseId);
    setAssignments(data);
    setSelectedUserIds(data.users.map((a) => a.user_id));
    setSelectedGroupIds(data.groups.map((a) => a.group_id));
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('courses')
        .update({ access_mode: accessMode, updated_at: new Date().toISOString() })
        .eq('id', courseId);

      await Promise.all([
        setCourseUserAssignments(supabase, courseId, selectedUserIds, user.id),
        setCourseGroupAssignments(supabase, courseId, selectedGroupIds, user.id),
      ]);

      await loadAssignments();
      toast.success('Assignments updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save assignments');
    } finally {
      setSaving(false);
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

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Save Assignments
        </Button>
      </CardContent>
    </Card>
  );
}
