'use client';

import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Users, User, Check, Globe, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { UserGroup } from '@/types';

interface UserOption {
  id: string;
  email: string;
  full_name: string | null;
}

interface AccessModePickerProps {
  accessMode: 'all' | 'restricted';
  selectedUserIds: string[];
  selectedGroupIds: string[];
  institutionId: string;
  onAccessModeChange: (mode: 'all' | 'restricted') => void;
  onSelectedUsersChange: (ids: string[]) => void;
  onSelectedGroupsChange: (ids: string[]) => void;
}

export function AccessModePicker({
  accessMode,
  selectedUserIds,
  selectedGroupIds,
  institutionId,
  onAccessModeChange,
  onSelectedUsersChange,
  onSelectedGroupsChange,
}: AccessModePickerProps) {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (accessMode !== 'restricted') return;
    const supabase = createClient();

    async function loadOptions() {
      const [groupsResult, usersResult] = await Promise.all([
        supabase
          .from('user_groups')
          .select('id, name, institution_id, description, created_at, updated_at')
          .eq('institution_id', institutionId)
          .order('name'),
        supabase
          .from('users')
          .select('id, email, full_name')
          .eq('institution_id', institutionId)
          .eq('role', 'student')
          .order('email'),
      ]);
      setGroups(groupsResult.data ?? []);
      setUsers(usersResult.data ?? []);
    }

    loadOptions();
  }, [accessMode, institutionId]);

  const selectedGroupNames = groups.filter((g) => selectedGroupIds.includes(g.id));
  const selectedUserOptions = users.filter((u) => selectedUserIds.includes(u.id));

  const filteredGroups = useMemo(() => {
    if (!groupSearch) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
  }, [groups, groupSearch]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || (u.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [users, userSearch]);

  function toggleGroup(groupId: string) {
    if (selectedGroupIds.includes(groupId)) {
      onSelectedGroupsChange(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      onSelectedGroupsChange([...selectedGroupIds, groupId]);
    }
  }

  function toggleUser(userId: string) {
    if (selectedUserIds.includes(userId)) {
      onSelectedUsersChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectedUsersChange([...selectedUserIds, userId]);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Course Access</Label>
        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            variant={accessMode === 'all' ? 'default' : 'outline'}
            size="sm"
            className={accessMode === 'all' ? 'bg-[#1E3A5F] hover:bg-[#162d4a] text-white' : ''}
            onClick={() => onAccessModeChange('all')}
          >
            <Globe className="w-4 h-4 mr-1" />
            All Students
          </Button>
          <Button
            type="button"
            variant={accessMode === 'restricted' ? 'default' : 'outline'}
            size="sm"
            className={accessMode === 'restricted' ? 'bg-[#1E3A5F] hover:bg-[#162d4a] text-white' : ''}
            onClick={() => onAccessModeChange('restricted')}
          >
            <Lock className="w-4 h-4 mr-1" />
            Restricted
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {accessMode === 'all'
            ? 'All students in your institution can access this course.'
            : 'Only assigned users and groups can access this course.'}
        </p>
      </div>

      {accessMode === 'restricted' && (
        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="groups">
              <Users className="w-4 h-4 mr-1" />
              Groups {selectedGroupIds.length > 0 && `(${selectedGroupIds.length})`}
            </TabsTrigger>
            <TabsTrigger value="users">
              <User className="w-4 h-4 mr-1" />
              Users {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="space-y-2">
            {selectedGroupNames.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedGroupNames.map((g) => (
                  <Badge key={g.id} variant="secondary" className="gap-1">
                    {g.name}
                    <button type="button" onClick={() => toggleGroup(g.id)} className="ml-1 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              placeholder="Search groups..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="max-h-40 overflow-y-auto border rounded-md">
              {filteredGroups.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-3">No groups found.</p>
              ) : (
                filteredGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left border-b last:border-0"
                  >
                    <Check className={`w-4 h-4 shrink-0 ${selectedGroupIds.includes(g.id) ? 'text-[#1E3A5F]' : 'text-transparent'}`} />
                    {g.name}
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-2">
            {selectedUserOptions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedUserOptions.map((u) => (
                  <Badge key={u.id} variant="secondary" className="gap-1">
                    {u.full_name || u.email}
                    <button type="button" onClick={() => toggleUser(u.id)} className="ml-1 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="max-h-40 overflow-y-auto border rounded-md">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-3">No users found.</p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUser(u.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left border-b last:border-0"
                  >
                    <Check className={`w-4 h-4 shrink-0 ${selectedUserIds.includes(u.id) ? 'text-[#1E3A5F]' : 'text-transparent'}`} />
                    <div className="flex flex-col">
                      <span>{u.full_name || u.email}</span>
                      {u.full_name && <span className="text-xs text-slate-500">{u.email}</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
