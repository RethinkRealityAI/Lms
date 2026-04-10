'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { awardCertificates } from '@/lib/db/certificates';
import { toast } from 'sonner';
import { Award, Search, Users, User } from 'lucide-react';
import type { CertificateTemplate, Course } from '@/types';

interface AwardCertificateModalProps {
  open: boolean;
  onClose: () => void;
  templates: CertificateTemplate[];
  institutionId: string;
  onAwarded: () => void;
}

interface SearchResult {
  id: string;
  email: string;
  full_name: string | null;
}

interface GroupResult {
  id: string;
  name: string;
  member_count: number;
}

export function AwardCertificateModal({
  open,
  onClose,
  templates,
  institutionId,
  onAwarded,
}: AwardCertificateModalProps) {
  const supabase = createClient();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [courseId, setCourseId] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'users' | 'group'>('users');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SearchResult[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [awarding, setAwarding] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('user_groups')
      .select('id, name, user_group_members(count)')
      .eq('institution_id', institutionId)
      .then(({ data }) => {
        setGroups(
          (data ?? []).map((g: any) => ({
            id: g.id,
            name: g.name,
            member_count: g.user_group_members?.[0]?.count ?? 0,
          }))
        );
      });

    supabase
      .from('courses')
      .select('id, title, description, is_published, created_at, updated_at, created_by, institution_id')
      .eq('institution_id', institutionId)
      .order('title')
      .then(({ data }) => setCourses((data as Course[]) ?? []));
  }, [open, institutionId]);

  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name')
        .or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
        .limit(10);
      setSearchResults((data as SearchResult[]) ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleAward = async () => {
    if (!templateId || !reason.trim()) {
      toast.error('Please select a template and provide a reason');
      return;
    }

    setAwarding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let userIds: string[];

      if (mode === 'group' && selectedGroupId) {
        const { data: members } = await supabase
          .from('user_group_members')
          .select('user_id')
          .eq('group_id', selectedGroupId)
          .not('user_id', 'is', null);
        userIds = (members ?? []).map((m: any) => m.user_id);
      } else {
        userIds = selectedUsers.map((u) => u.id);
      }

      if (userIds.length === 0) {
        toast.error('No recipients selected');
        return;
      }

      const result = await awardCertificates(supabase, {
        user_ids: userIds,
        institution_id: institutionId,
        template_id: templateId,
        course_id: courseId || undefined,
        awarded_by: user.id,
        award_reason: reason,
      });

      toast.success(`Awarded ${result.inserted} certificate(s)`, {
        description: result.skipped > 0 ? `${result.skipped} skipped (already awarded)` : undefined,
      });

      onAwarded();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to award certificates');
    } finally {
      setAwarding(false);
    }
  };

  const toggleUser = (user: SearchResult) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#1E3A5F]" />
            Award Certificate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Template</Label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full h-9 border rounded-md px-3 text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Course (optional)</Label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full h-9 border rounded-md px-3 text-sm"
            >
              <option value="">No course — manual award</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              variant={mode === 'users' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('users')}
              className={mode === 'users' ? 'bg-[#1E3A5F]' : ''}
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Individual Users
            </Button>
            <Button
              variant={mode === 'group' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('group')}
              className={mode === 'group' ? 'bg-[#1E3A5F]' : ''}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              User Group
            </Button>
          </div>

          {mode === 'users' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-9"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => toggleUser(u)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${
                        selectedUsers.some((s) => s.id === u.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      {u.full_name ?? u.email} <span className="text-slate-400">({u.email})</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full cursor-pointer hover:bg-blue-200"
                      onClick={() => toggleUser(u)}
                    >
                      {u.full_name ?? u.email} &times;
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Select Group</Label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full h-9 border rounded-md px-3 text-sm"
              >
                <option value="">Choose a group...</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.member_count} members)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Workshop attendance, Prior learning recognition..."
              rows={2}
            />
          </div>

          <Button
            onClick={handleAward}
            disabled={awarding || !templateId || !reason.trim()}
            className="w-full bg-[#1E3A5F] hover:bg-[#162d4a]"
          >
            {awarding ? 'Awarding...' : 'Award Certificate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
