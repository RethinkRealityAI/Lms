'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type EmailTemplate,
} from '@/lib/db/email-templates';
import { getInstitutionBranding } from '@/lib/tenant/branding';
import { SYSTEM_EMAIL_MERGE_TAGS } from '@/lib/email/render';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Mail,
  Send,
  Save,
  Plus,
  Trash2,
  Loader2,
  Eye,
  Users,
  Sparkles,
  Tag,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';

interface Props {
  institutionId: string;
  institutionSlug: string;
}

interface PlatformUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface UserGroup {
  id: string;
  name: string;
  member_count: number;
}

function mergeTagsForTemplate(template: EmailTemplate | null): string[] {
  if (!template) return [];
  if (template.category === 'system' && template.system_type) {
    return SYSTEM_EMAIL_MERGE_TAGS[template.system_type]?.tags ?? [];
  }
  return SYSTEM_EMAIL_MERGE_TAGS.custom.tags;
}

export function EmailAdminDashboard({ institutionId, institutionSlug }: Props) {
  const branding = getInstitutionBranding(institutionSlug);
  const supabase = createClient();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null);
  const [smtpFrom, setSmtpFrom] = useState<string | null>(null);

  const [allUsers, setAllUsers] = useState<PlatformUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [composeTemplateId, setComposeTemplateId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [testMode, setTestMode] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const composeTemplate = useMemo(
    () => templates.find((t) => t.id === composeTemplateId) ?? null,
    [templates, composeTemplateId],
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return allUsers.slice(0, 50);
    return allUsers
      .filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 50);
  }, [allUsers, userSearch]);

  const selectedUsers = useMemo(
    () => allUsers.filter((u) => selectedUserIds.has(u.id)),
    [allUsers, selectedUserIds],
  );

  const recipientCount = selectedUserIds.size + selectedGroupIds.size;

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getEmailTemplates(supabase, institutionId);
      setTemplates(rows);
      if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
      if (!composeTemplateId && rows.length > 0) setComposeTemplateId(rows[0].id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [supabase, institutionId, selectedId, composeTemplateId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    fetch('/api/notify/test')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSmtpConfigured(Boolean(data.configured));
          setSmtpFrom(data.from ?? null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    supabase
      .from('users')
      .select('id, email, full_name')
      .eq('institution_id', institutionId)
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setAllUsers((data as PlatformUser[]) ?? []));

    supabase
      .from('user_groups')
      .select('id, name, user_group_members(count)')
      .eq('institution_id', institutionId)
      .order('name')
      .then(({ data }) => {
        setGroups(
          (data ?? []).map((g: { id: string; name: string; user_group_members: { count: number }[] }) => ({
            id: g.id,
            name: g.name,
            member_count: g.user_group_members?.[0]?.count ?? 0,
          })),
        );
      });
  }, [supabase, institutionId]);

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditDescription(selected.description ?? '');
    setEditSubject(selected.subject_template);
    setEditBody(selected.body_html_template);
    setPreviewHtml(null);
  }, [selected]);

  const insertMergeTag = (tag: string, field: 'subject' | 'body') => {
    const token = `{{${tag}}}`;
    if (field === 'subject') setEditSubject((s) => `${s}${token}`);
    else setEditBody((b) => `${b}${token}`);
  };

  const handleSaveTemplate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateEmailTemplate(supabase, selected.id, {
        name: selected.category === 'custom' ? editName : undefined,
        description: editDescription,
        subjectTemplate: editSubject,
        bodyHtmlTemplate: editBody,
      });
      toast.success('Template saved');
      await loadTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const created = await createEmailTemplate(supabase, {
        institutionId,
        name: newTemplateName.trim(),
        subjectTemplate: 'Message from {{institutionName}}',
        bodyHtmlTemplate: `<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">{{greeting}}</p>
<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:24px;">{{customMessage}}</p>`,
        createdBy: user?.id,
      });
      toast.success('Custom template created');
      setCreateOpen(false);
      setNewTemplateName('');
      await loadTemplates();
      setSelectedId(created.id);
      setComposeTemplateId(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selected || selected.category === 'system') return;
    if (!window.confirm(`Delete template "${selected.name}"?`)) return;
    try {
      await deleteEmailTemplate(supabase, selected.id);
      toast.success('Template deleted');
      setSelectedId(null);
      await loadTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handlePreview = async () => {
    if (!selected) return;
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/admin/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selected.id,
          previewName: 'Alex Example',
          customMessage: customMessage || 'This is a preview of your custom message.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Preview failed');
      setPreviewSubject(data.subject);
      setPreviewHtml(data.html);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!composeTemplateId) return;
    setSending(true);
    setConfirmOpen(false);
    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: composeTemplateId,
          userIds: [...selectedUserIds],
          groupIds: [...selectedGroupIds],
          customMessage: composeTemplate?.category === 'custom' ? customMessage : undefined,
          testMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Send failed');
      if (data.reason === 'smtp_not_configured') {
        toast.error('SMTP not configured on the server');
        return;
      }
      toast.success(`Sent ${data.sent} of ${data.total} emails`, {
        description:
          data.failed > 0
            ? `${data.failed} failed, ${data.skipped} skipped`
            : data.skipped > 0
              ? `${data.skipped} skipped (no email)`
              : undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      filteredUsers.forEach((u) => next.add(u.id));
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-8 sm:px-10 text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`,
        }}
      >
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-2">
            <Sparkles className="h-4 w-4" />
            {branding.name} Communications
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Email Studio</h1>
          <p className="mt-2 text-white/90 text-sm sm:text-base max-w-xl">
            Edit automated templates, preview with your brand, and send bulk messages to learners and groups.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {smtpConfigured === true ? (
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/25">
                <CheckCircle2 className="h-3 w-3 mr-1" /> SMTP connected
              </Badge>
            ) : smtpConfigured === false ? (
              <Badge variant="destructive" className="bg-red-900/40 border-red-300/30">
                <AlertCircle className="h-3 w-3 mr-1" /> SMTP not configured
              </Badge>
            ) : null}
            {smtpFrom && (
              <span className="text-xs text-white/70 truncate max-w-md">From: {smtpFrom}</span>
            )}
          </div>
        </div>
        <Mail className="absolute right-6 bottom-0 h-32 w-32 text-white/10 translate-y-4" />
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-11">
          <TabsTrigger value="templates" className="gap-2">
            <Tag className="h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-2">
            <Send className="h-4 w-4" /> Compose &amp; Send
          </TabsTrigger>
        </TabsList>

        {/* ── Templates tab ── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid lg:grid-cols-[280px_1fr] gap-4 min-h-[520px]">
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Templates</CardTitle>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-2 space-y-1 max-h-[480px] overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                        selectedId === t.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted/80 border border-transparent'
                      }`}
                    >
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant={t.category === 'system' ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
                          {t.category}
                        </Badge>
                        {t.system_type && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {t.system_type}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md flex flex-col">
              {selected ? (
                <>
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle>{selected.name}</CardTitle>
                        <CardDescription>{selected.description ?? 'No description'}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handlePreview} disabled={previewLoading}>
                          {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}
                          Preview
                        </Button>
                        <Button size="sm" onClick={handleSaveTemplate} disabled={saving}>
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                          Save
                        </Button>
                        {selected.category === 'custom' && (
                          <Button size="sm" variant="destructive" onClick={handleDeleteTemplate}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selected.category === 'custom' && (
                      <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Description</Label>
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Internal note about when to use this template"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Subject line</Label>
                      <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Body HTML</Label>
                      <Textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={12}
                        className="font-mono text-xs leading-relaxed"
                      />
                      <p className="text-xs text-muted-foreground">
                        Inner content only — the branded header and footer are added automatically.
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Merge tags</Label>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {mergeTagsForTemplate(selected).map((tag) => (
                          <Button
                            key={tag}
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs font-mono"
                            onClick={() => insertMergeTag(tag, 'body')}
                          >
                            {`{{${tag}}}`}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {previewHtml && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-sm font-medium">Preview: {previewSubject}</p>
                        <iframe
                          title="Email preview"
                          srcDoc={previewHtml}
                          className="w-full h-80 rounded-lg border bg-white"
                          sandbox=""
                        />
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center flex-1 text-muted-foreground py-20">
                  Select a template to edit
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── Compose tab ── */}
        <TabsContent value="compose" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" /> Message
                </CardTitle>
                <CardDescription>Choose a template and optional custom content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Template</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={composeTemplateId}
                    onChange={(e) => setComposeTemplateId(e.target.value)}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>
                {composeTemplate?.category === 'custom' && (
                  <div className="space-y-1.5">
                    <Label>Custom message</Label>
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={5}
                      placeholder="Your announcement or message — inserted as {{customMessage}}"
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 rounded-lg border p-3 bg-muted/40 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                  />
                  <span className="text-sm">
                    Prefix subject with [TEST] (recommended for trial sends)
                  </span>
                </label>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={sending || recipientCount === 0 || !smtpConfigured}
                  onClick={() => setConfirmOpen(true)}
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send to {selectedUserIds.size} user{selectedUserIds.size === 1 ? '' : 's'}
                      {selectedGroupIds.size > 0 &&
                        ` + ${selectedGroupIds.size} group${selectedGroupIds.size === 1 ? '' : 's'}`}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Recipients
                </CardTitle>
                <CardDescription>
                  {allUsers.length.toLocaleString()} active users in {branding.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name or email…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                    Select shown
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUserIds(new Set())}
                  >
                    Clear users
                  </Button>
                </div>
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {selectedUsers.map((u) => (
                      <Badge key={u.id} variant="secondary" className="gap-1 pr-1">
                        {u.full_name ?? u.email}
                        <button type="button" onClick={() => toggleUser(u.id)} aria-label="Remove">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                  {filteredUsers.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={selectedUserIds.has(u.id)}
                        onChange={() => toggleUser(u.id)}
                      />
                      <span className="truncate flex-1">
                        <span className="font-medium">{u.full_name ?? '—'}</span>
                        <span className="text-muted-foreground ml-2">{u.email}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {groups.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label>Groups (bulk)</Label>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {groups.map((g) => (
                        <label
                          key={g.id}
                          className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={selectedGroupIds.has(g.id)}
                            onChange={() => toggleGroup(g.id)}
                          />
                          <span className="flex-1">{g.name}</span>
                          <span className="text-xs text-muted-foreground">{g.member_count} members</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm bulk send</DialogTitle>
            <DialogDescription>
              You are about to send &ldquo;{composeTemplate?.name}&rdquo; to{' '}
              <strong>{selectedUserIds.size}</strong> individual
              {selectedUserIds.size === 1 ? '' : 's'}
              {selectedGroupIds.size > 0 &&
                ` plus ${selectedGroupIds.size} group${selectedGroupIds.size === 1 ? '' : 's'}`}
              . {testMode && 'Subjects will be prefixed with [TEST].'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend}>Send emails</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New custom template</DialogTitle>
            <DialogDescription>For announcements and one-off broadcasts</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. Monthly newsletter"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={saving || !newTemplateName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
