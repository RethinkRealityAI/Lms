'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Users,
  Mail,
  Upload,
  Search,
  UserPlus,
  MoreVertical,
  Send,
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import type { LegacyUser, UserInvitation } from '@/types';
import type { ActiveUser } from '@/lib/db/users';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  activeUsers: ActiveUser[];
  invitations: UserInvitation[];
  legacyUsers: LegacyUser[];
  institutionId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relativeDate(iso: string | null): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    admin: 'bg-red-50 text-red-700 border-red-200',
    instructor: 'bg-violet-50 text-violet-700 border-violet-200',
    student: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <Badge className={`font-bold ${colors[role] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {role}
    </Badge>
  );
}

function statusBadge(status: UserInvitation['status']) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    pending: { cls: 'bg-green-50 text-green-700 border-green-200', icon: <Clock className="h-3 w-3 mr-1" /> },
    accepted: { cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    expired: { cls: 'bg-red-50 text-red-700 border-red-200', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
    cancelled: { cls: 'bg-slate-100 text-slate-500 border-slate-200', icon: <XCircle className="h-3 w-3 mr-1" /> },
  };
  const m = map[status] || map.pending;
  return (
    <Badge className={`font-bold ${m.cls}`}>
      {m.icon}
      {status}
    </Badge>
  );
}

function legacyStatusBadge(user: LegacyUser) {
  if (user.linked_user_id) {
    return <Badge className="font-bold bg-green-50 text-green-700 border-green-200">Joined</Badge>;
  }
  if (user.invited_at) {
    return <Badge className="font-bold bg-amber-50 text-amber-700 border-amber-200">Invited</Badge>;
  }
  return <Badge className="font-bold bg-slate-100 text-slate-500 border-slate-200">Not Invited</Badge>;
}

// ---------------------------------------------------------------------------
// Action Dropdown (simple state-based)
// ---------------------------------------------------------------------------

function ActionMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
      >
        <MoreVertical className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 min-w-[160px] bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {children}
        </div>
      )}
    </div>
  );
}

function ActionItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Table header style
// ---------------------------------------------------------------------------

const TH = 'text-xs font-bold uppercase tracking-widest text-slate-400 py-3 px-4';

// ---------------------------------------------------------------------------
// Invite User Modal
// ---------------------------------------------------------------------------

function InviteUserModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          role,
          customMessage: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send invitation');
      }
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      setRole('student');
      setMessage('');
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">Invite User</DialogTitle>
          <DialogDescription>Send an invitation to join the platform.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="font-bold text-slate-700">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="instructor">Instructor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-message" className="font-bold text-slate-700">
              Custom Message <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <textarea
              id="invite-message"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="Add a personal message to the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending}
            className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
          >
            {sending ? 'Sending...' : 'Send Invite'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Import CSV Modal
// ---------------------------------------------------------------------------

interface ParsedCsvUser {
  email: string;
  full_name: string;
  first_name: string;
  last_name: string;
  roles: string;
  occupation: string;
  affiliation: string;
  country: string;
  date_registered: string;
  avg_progress: number;
  avg_score: number | null;
  completions: number;
  completed_percent: number;
  external_id: string;
}

function ImportCsvModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const usersFileRef = useRef<HTMLInputElement>(null);
  const completionsFileRef = useRef<HTMLInputElement>(null);
  const [usersFile, setUsersFile] = useState<File | null>(null);
  const [completionsFile, setCompletionsFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsvUser[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const reset = useCallback(() => {
    setUsersFile(null);
    setCompletionsFile(null);
    setParsed([]);
    setIsParsing(false);
    setIsImporting(false);
  }, []);

  const handleParse = useCallback(() => {
    if (!usersFile) {
      toast.error('Please select a Users CSV file');
      return;
    }
    setIsParsing(true);

    Papa.parse<Record<string, string>>(usersFile, {
      header: true,
      skipEmptyLines: true,
      complete: (usersResult) => {
        const usersMap = new Map<string, ParsedCsvUser>();

        for (const row of usersResult.data) {
          const email = (row['Email'] || row['email'] || '').trim().toLowerCase();
          if (!email) continue;
          const firstName = (row['First Name'] || row['first_name'] || '').trim();
          const lastName = (row['Last Name'] || row['last_name'] || '').trim();
          usersMap.set(email, {
            email,
            full_name: (row['Full Name'] || row['full_name'] || `${firstName} ${lastName}`.trim() || '').trim(),
            first_name: firstName,
            last_name: lastName,
            roles: (row['Roles'] || row['roles'] || 'student').trim(),
            occupation: (row['Occupation'] || row['occupation'] || '').trim(),
            affiliation: (row['Affiliation'] || row['affiliation'] || row['Organization'] || '').trim(),
            country: (row['Country'] || row['country'] || '').trim(),
            date_registered: (row['Date Registered'] || row['date_registered'] || '').trim(),
            avg_progress: 0,
            avg_score: null,
            completions: 0,
            completed_percent: 0,
            external_id: (row['ID'] || row['id'] || row['External ID'] || row['external_id'] || '').trim(),
          });
        }

        if (completionsFile) {
          Papa.parse<Record<string, string>>(completionsFile, {
            header: true,
            skipEmptyLines: true,
            complete: (compResult) => {
              for (const row of compResult.data) {
                const email = (row['Email'] || row['email'] || '').trim().toLowerCase();
                const user = usersMap.get(email);
                if (!user) continue;
                user.avg_progress = parseFloat(row['Average Progress'] || row['avg_progress'] || '0') || 0;
                user.avg_score = parseFloat(row['Average Score'] || row['avg_score'] || '') || null;
                user.completions = parseInt(row['Completions'] || row['completions'] || '0', 10) || 0;
                user.completed_percent = parseFloat(row['Completed Percent'] || row['completed_percent'] || '0') || 0;
              }
              const result = Array.from(usersMap.values());
              setParsed(result);
              setIsParsing(false);
              toast.success(`Parsed ${result.length} users with completion data`);
            },
            error: () => {
              setIsParsing(false);
              toast.error('Failed to parse completions CSV');
            },
          });
        } else {
          const result = Array.from(usersMap.values());
          setParsed(result);
          setIsParsing(false);
          toast.success(`Parsed ${result.length} users`);
        }
      },
      error: () => {
        setIsParsing(false);
        toast.error('Failed to parse users CSV');
      },
    });
  }, [usersFile, completionsFile]);

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: parsed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Import failed');
      }
      const data = await res.json();
      toast.success(`Imported ${data.count ?? parsed.length} users`);
      reset();
      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-black">Import Legacy Users</DialogTitle>
          <DialogDescription>Upload CSV files exported from EdApp to import legacy user data.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Users CSV */}
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">Users CSV</Label>
            <div
              onClick={() => usersFileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 hover:bg-slate-50/50 transition-colors"
            >
              <FileSpreadsheet className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              {usersFile ? (
                <p className="text-sm font-bold text-slate-700">{usersFile.name}</p>
              ) : (
                <p className="text-sm text-slate-400">Click to select CSV file</p>
              )}
              <input
                ref={usersFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  setUsersFile(e.target.files?.[0] ?? null);
                  setParsed([]);
                }}
              />
            </div>
          </div>

          {/* Completions CSV */}
          <div className="space-y-2">
            <Label className="font-bold text-slate-700">
              Completions CSV <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <div
              onClick={() => completionsFileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-slate-300 hover:bg-slate-50/50 transition-colors"
            >
              {completionsFile ? (
                <p className="text-sm font-bold text-slate-700">{completionsFile.name}</p>
              ) : (
                <p className="text-sm text-slate-400">Click to select completions CSV</p>
              )}
              <input
                ref={completionsFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  setCompletionsFile(e.target.files?.[0] ?? null);
                  setParsed([]);
                }}
              />
            </div>
          </div>

          {/* Parse button */}
          {usersFile && parsed.length === 0 && (
            <Button onClick={handleParse} disabled={isParsing} className="w-full bg-[#1E3A5F] hover:bg-[#162d4a] text-white">
              {isParsing ? 'Parsing...' : 'Parse CSV'}
            </Button>
          )}

          {/* Preview table */}
          {parsed.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">
                Preview ({parsed.length} users{parsed.length > 10 ? ', showing first 10' : ''})
              </p>
              <div className="overflow-x-auto max-h-48 border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-bold text-slate-500">Name</th>
                      <th className="text-left px-2 py-1.5 font-bold text-slate-500">Email</th>
                      <th className="text-left px-2 py-1.5 font-bold text-slate-500">Country</th>
                      <th className="text-right px-2 py-1.5 font-bold text-slate-500">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 10).map((u, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 text-slate-700">{u.full_name || '\u2014'}</td>
                        <td className="px-2 py-1.5 text-slate-500">{u.email}</td>
                        <td className="px-2 py-1.5 text-slate-500">{u.country || '\u2014'}</td>
                        <td className="px-2 py-1.5 text-right text-slate-500">{Math.round(u.avg_progress)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          {parsed.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
            >
              {isImporting ? 'Importing...' : `Import ${parsed.length} Users`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Active Users
// ---------------------------------------------------------------------------

function ActiveUsersTab({ users }: { users: ActiveUser[] }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-black text-slate-900">Active Users</CardTitle>
            <CardDescription className="font-medium text-slate-500">
              {users.length} user{users.length !== 1 ? 's' : ''} registered on the platform.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="instructor">Instructor</option>
              <option value="student">Student</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">
            {users.length === 0 ? 'No active users yet.' : 'No users match your filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={`${TH} text-left`}>User</th>
                  <th className={`${TH} text-center`}>Role</th>
                  <th className={`${TH} text-right`}>Courses</th>
                  <th className={`${TH} text-right`}>Last Active</th>
                  <th className={`${TH} text-right`}>Joined</th>
                  <th className={`${TH} text-right w-10`}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {initials(u.full_name, u.email)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{u.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-slate-400 font-medium break-all">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">{roleBadge(u.role)}</td>
                    <td className="text-right py-3 px-4 font-bold text-slate-900">{u.enrollment_count}</td>
                    <td className="text-right py-3 px-4 text-xs text-slate-500 font-medium">
                      {relativeDate(u.last_activity)}
                    </td>
                    <td className="text-right py-3 px-4 text-xs text-slate-500 font-medium">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="text-right py-3 px-4">
                      <ActionMenu>
                        <ActionItem onClick={() => toast.info('Edit Details \u2014 Coming soon')}>Edit Details</ActionItem>
                        <ActionItem onClick={() => toast.info('Reset Password \u2014 Coming soon')}>Reset Password</ActionItem>
                        <ActionItem onClick={() => toast.info('Remove from Course \u2014 Coming soon')}>Remove from Course</ActionItem>
                      </ActionMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: Pending Invites
// ---------------------------------------------------------------------------

function PendingInvitesTab({ invitations }: { invitations: UserInvitation[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleResend = async (inv: UserInvitation) => {
    setLoadingId(inv.id);
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inv.email, role: inv.role }),
      });
      if (!res.ok) throw new Error('Failed to resend');
      toast.success(`Invitation resent to ${inv.email}`);
      router.refresh();
    } catch {
      toast.error('Failed to resend invitation');
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (inv: UserInvitation) => {
    setLoadingId(inv.id);
    try {
      const res = await fetch('/api/admin/users/invite/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: inv.id }),
      });
      if (!res.ok) throw new Error('Failed to cancel');
      toast.success(`Invitation to ${inv.email} cancelled`);
      router.refresh();
    } catch {
      toast.error('Failed to cancel invitation');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
      <CardHeader>
        <CardTitle className="text-lg font-black text-slate-900">Pending Invitations</CardTitle>
        <CardDescription className="font-medium text-slate-500">
          {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {invitations.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">
            No pending invitations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className={`${TH} text-left`}>Email</th>
                  <th className={`${TH} text-center`}>Role</th>
                  <th className={`${TH} text-left`}>Invited By</th>
                  <th className={`${TH} text-right`}>Sent</th>
                  <th className={`${TH} text-right`}>Expires</th>
                  <th className={`${TH} text-center`}>Status</th>
                  <th className={`${TH} text-right w-10`}></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{inv.email}</p>
                    </td>
                    <td className="text-center py-3 px-4">{roleBadge(inv.role)}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium text-xs">
                      {inv.inviter_name || inv.inviter_email || '\u2014'}
                    </td>
                    <td className="text-right py-3 px-4 text-xs text-slate-500 font-medium">
                      {formatDate(inv.sent_at)}
                    </td>
                    <td className="text-right py-3 px-4 text-xs text-slate-500 font-medium">
                      {formatDate(inv.expires_at)}
                    </td>
                    <td className="text-center py-3 px-4">{statusBadge(inv.status)}</td>
                    <td className="text-right py-3 px-4">
                      <ActionMenu>
                        <ActionItem onClick={() => handleResend(inv)}>
                          <span className="flex items-center gap-2">
                            <Send className="h-3 w-3" />
                            {loadingId === inv.id ? 'Sending...' : 'Resend Invite'}
                          </span>
                        </ActionItem>
                        {inv.status === 'pending' && (
                          <ActionItem onClick={() => handleCancel(inv)}>
                            <span className="flex items-center gap-2">
                              <XCircle className="h-3 w-3" />
                              Cancel Invite
                            </span>
                          </ActionItem>
                        )}
                      </ActionMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Legacy Users
// ---------------------------------------------------------------------------

function LegacyUsersTab({ users, institutionId }: { users: LegacyUser[]; institutionId: string }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.country || '').toLowerCase().includes(q)
    );
  });

  const uninvitedCount = users.filter((u) => !u.invited_at && !u.linked_user_id).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((u) => u.id)));
    }
  };

  const handleSendInvite = async (user: LegacyUser) => {
    setSendingId(user.id);
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          role: 'student',
          legacyUserId: user.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to send invite');
      toast.success(`Invitation sent to ${user.email}`);
      router.refresh();
    } catch {
      toast.error(`Failed to invite ${user.email}`);
    } finally {
      setSendingId(null);
    }
  };

  const handleBulkInvite = async () => {
    const toInvite = filtered.filter(
      (u) => selected.has(u.id) && !u.invited_at && !u.linked_user_id
    );
    if (toInvite.length === 0) {
      toast.info('No uninvited users selected');
      return;
    }
    setBulkSending(true);
    let success = 0;
    let failed = 0;
    for (const user of toInvite) {
      try {
        const res = await fetch('/api/admin/users/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            role: 'student',
            legacyUserId: user.id,
          }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setBulkSending(false);
    setSelected(new Set());
    toast.success(`Sent ${success} invitation${success !== 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`);
    router.refresh();
  };

  return (
    <>
      <ImportCsvModal open={showImport} onOpenChange={setShowImport} />

      <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white mt-4">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-black text-slate-900">Legacy Users (EdApp)</CardTitle>
              <CardDescription className="font-medium text-slate-500">
                {users.length} imported user{users.length !== 1 ? 's' : ''}{uninvitedCount > 0 ? ` \u00B7 ${uninvitedCount} not yet invited` : ''}.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search name, email, country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowImport(true)}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Bulk actions bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border-b border-blue-100">
              <span className="text-sm font-bold text-blue-700">
                {selected.size} selected
              </span>
              <Button
                size="sm"
                onClick={handleBulkInvite}
                disabled={bulkSending}
                className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-1"
              >
                <Mail className="h-3 w-3" />
                {bulkSending ? 'Sending...' : `Invite Selected (${selected.size})`}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear
              </Button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium">
              {users.length === 0
                ? 'No legacy users imported yet. Use Import CSV to get started.'
                : 'No users match your search.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleAll}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className={`${TH} text-left`}>Name</th>
                    <th className={`${TH} text-left`}>Email</th>
                    <th className={`${TH} text-left`}>Affiliation</th>
                    <th className={`${TH} text-left`}>Country</th>
                    <th className={`${TH} text-right`}>Progress</th>
                    <th className={`${TH} text-right`}>Score</th>
                    <th className={`${TH} text-right`}>Completions</th>
                    <th className={`${TH} text-center`}>Status</th>
                    <th className={`${TH} text-right w-10`}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const canInvite = !u.invited_at && !u.linked_user_id;
                    return (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() => toggleSelect(u.id)}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">
                            {u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || '\u2014'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-600 font-medium text-xs break-all">{u.email}</p>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 font-medium">
                          {u.affiliation || '\u2014'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 font-medium">
                          {u.country || '\u2014'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={u.avg_progress} className="w-12 h-2" />
                            <span className="text-xs font-bold text-slate-600 w-8 text-right">
                              {Math.round(u.avg_progress)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-xs font-bold text-slate-600">
                          {u.avg_score != null ? `${Math.round(u.avg_score)}%` : '\u2014'}
                        </td>
                        <td className="text-right py-3 px-4 font-bold text-slate-900">
                          {u.completions}
                        </td>
                        <td className="text-center py-3 px-4">
                          {legacyStatusBadge(u)}
                        </td>
                        <td className="text-right py-3 px-4">
                          {canInvite && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendInvite(u)}
                              disabled={sendingId === u.id}
                              className="gap-1 text-xs"
                            >
                              <Send className="h-3 w-3" />
                              {sendingId === u.id ? 'Sending...' : 'Invite'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export function UserManagementDashboard({
  activeUsers,
  invitations,
  legacyUsers,
  institutionId,
}: Props) {
  const [showInvite, setShowInvite] = useState(false);

  const pendingCount = invitations.filter((i) => i.status === 'pending').length;
  const uninvitedLegacy = legacyUsers.filter((u) => !u.invited_at && !u.linked_user_id).length;

  return (
    <div className="px-4 sm:px-0 space-y-8">
      <InviteUserModal open={showInvite} onOpenChange={setShowInvite} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">User Management</h2>
          <p className="text-slate-500 font-medium mt-1">
            Manage platform users, invitations, and legacy imports.
          </p>
        </div>
        <Button
          onClick={() => setShowInvite(true)}
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white gap-2 w-fit"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Active Users</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{activeUsers.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Pending Invites</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{pendingCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 text-amber-600">
                <Mail className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Legacy Users</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{legacyUsers.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 text-violet-600">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_4px_20px_rgb(0,0,0,0.04)] bg-white">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Not Yet Invited</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{uninvitedLegacy}</p>
                <p className="text-sm text-slate-500 font-medium mt-1">legacy users</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 text-red-600">
                <UserPlus className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="active" className="rounded-lg font-bold text-sm px-4">
            <Users className="h-4 w-4 mr-2" />
            Active Users
          </TabsTrigger>
          <TabsTrigger value="invites" className="rounded-lg font-bold text-sm px-4">
            <Mail className="h-4 w-4 mr-2" />
            Pending Invites
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-amber-100 text-amber-700 border-amber-200 font-bold text-[10px] px-1.5 py-0">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="legacy" className="rounded-lg font-bold text-sm px-4">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Legacy Users
            {uninvitedLegacy > 0 && (
              <Badge className="ml-2 bg-red-100 text-red-700 border-red-200 font-bold text-[10px] px-1.5 py-0">
                {uninvitedLegacy}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveUsersTab users={activeUsers} />
        </TabsContent>

        <TabsContent value="invites">
          <PendingInvitesTab invitations={invitations} />
        </TabsContent>

        <TabsContent value="legacy">
          <LegacyUsersTab users={legacyUsers} institutionId={institutionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
