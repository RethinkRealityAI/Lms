'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Users, Plus, Pencil, Trash2, UserPlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMembers,
  removeGroupMember,
} from '@/lib/db/groups';
import type { UserGroupWithCounts, UserGroupMember } from '@/types';

interface GroupsTabProps {
  institutionId: string;
}

export function GroupsTab({ institutionId }: GroupsTabProps) {
  const [groups, setGroups] = useState<UserGroupWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroupWithCounts | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<UserGroupMember[]>([]);
  const [allUsers, setAllUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadGroups();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  async function loadGroups() {
    setLoading(true);
    const supabase = createClient();
    const data = await getGroups(supabase, institutionId);
    setGroups(data);
    setLoading(false);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await createGroup(supabase, {
        name: name.trim(),
        institution_id: institutionId,
        description: description.trim() || undefined,
      });
      toast.success('Group created');
      setShowCreate(false);
      setName('');
      setDescription('');
      await loadGroups();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!selectedGroup || !name.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await updateGroup(supabase, selectedGroup.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success('Group updated');
      setShowEdit(false);
      await loadGroups();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update group');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedGroup) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await deleteGroup(supabase, selectedGroup.id);
      toast.success('Group deleted');
      setShowDelete(false);
      setSelectedGroup(null);
      await loadGroups();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete group');
    } finally {
      setSaving(false);
    }
  }

  async function openMembers(group: UserGroupWithCounts) {
    setSelectedGroup(group);
    setShowMembers(true);
    setMembersLoading(true);
    const supabase = createClient();
    const [membersData, usersData] = await Promise.all([
      getGroupMembers(supabase, group.id),
      supabase
        .from('users')
        .select('id, email, full_name')
        .eq('institution_id', institutionId)
        .order('email'),
    ]);
    setMembers(membersData);
    setAllUsers(usersData.data ?? []);
    setMembersLoading(false);
  }

  async function handleAddMember(userId: string) {
    if (!selectedGroup) return;
    try {
      const supabase = createClient();
      await addGroupMembers(supabase, selectedGroup.id, [userId]);
      await openMembers(selectedGroup);
      toast.success('Member added');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add member');
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!selectedGroup) return;
    try {
      const supabase = createClient();
      await removeGroupMember(supabase, selectedGroup.id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success('Member removed');
      await loadGroups();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  function openEdit(group: UserGroupWithCounts) {
    setSelectedGroup(group);
    setName(group.name);
    setDescription(group.description ?? '');
    setShowEdit(true);
  }

  function openDelete(group: UserGroupWithCounts) {
    setSelectedGroup(group);
    setShowDelete(true);
  }

  const memberIds = new Set(members.map((m) => m.user_id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Button
          onClick={() => {
            setName('');
            setDescription('');
            setShowCreate(true);
          }}
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No groups yet</p>
          <p className="text-sm">Create a group to start bulk-assigning courses.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-600">Name</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Members</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Courses</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Created</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => (
                <tr key={group.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div>
                      <span className="font-medium">{group.name}</span>
                      {group.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{group.member_count}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{group.course_count}</Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(group.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMembers(group)}
                        title="Manage members"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(group)}
                        title="Edit group"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDelete(group)}
                        title="Delete group"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Create a new user group for bulk course assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. West Africa Region"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this group for?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !name.trim()}
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={saving || !name.trim()}
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedGroup?.name}&rdquo;? This will remove
              all members and unassign it from any courses. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Members of {selectedGroup?.name}</DialogTitle>
            <DialogDescription>Add or remove users from this group.</DialogDescription>
          </DialogHeader>
          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {availableUsers.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-slate-500 px-3 py-1.5 bg-slate-50 border-b">
                    Add member
                  </p>
                  {availableUsers.slice(0, 20).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleAddMember(u.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left border-b last:border-0"
                    >
                      <UserPlus className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{u.full_name || u.email}</span>
                      {u.full_name && (
                        <span className="text-xs text-slate-500">{u.email}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {members.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No members yet.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded"
                    >
                      <div>
                        <span className="text-sm font-medium">{m.full_name || m.email}</span>
                        {m.full_name && (
                          <span className="text-xs text-slate-500 ml-2">{m.email}</span>
                        )}
                        {m.role && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {m.role}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembers(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
