'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import {
  Plus,
  Link2,
  BarChart3,
  QrCode,
  Mail,
  Pencil,
  Archive,
  RefreshCw,
  Copy,
  Check,
  Download,
  ExternalLink,
  Users,
  Loader2,
  Tag,
  ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  createReferralCode,
  updateReferralCode,
  archiveReferralCode,
  rotateReferralToken,
  referralShareUrl,
  referralReportUrl,
  type ReferralCodeWithStats,
} from '@/lib/db/referrals';
import { isValidReferralCode, suggestReferralCode } from '@/lib/referral/constants';
import { CAMPAIGN_SUGGESTIONS, normalizeCampaign } from '@/lib/referral/sources';

const fmt = new Intl.NumberFormat('en-CA');

/**
 * Run the suggestions through the same normaliser the tracked-link route uses,
 * so a tag an admin copies from here is byte-for-byte the tag that ends up on
 * the report — a suggestion that normalised to something else would quietly
 * split one placement across two rows.
 */
const CAMPAIGN_TAGS = CAMPAIGN_SUGGESTIONS.map((tag) => normalizeCampaign(tag)).filter(
  (tag): tag is string => tag !== null,
);

/** Tag applied to the QR value — see QrDialog. */
const QR_CAMPAIGN_TAG = 'qr';

function taggedShareUrl(shareUrl: string, tag: string): string {
  return `${shareUrl}?s=${tag}`;
}

interface Props {
  institutionId: string;
  institutionSlug: string;
  initialCodes: ReferralCodeWithStats[];
  origin: string;
  currentUserId: string | null;
  emailConfigured: boolean;
}

type FormState = {
  id: string | null;
  code: string;
  label: string;
  description: string;
  owner_name: string;
  owner_email: string;
  landing_path: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  code: '',
  label: '',
  description: '',
  owner_name: '',
  owner_email: '',
  landing_path: '',
  is_active: true,
};

export function ReferralsManager({
  institutionId,
  institutionSlug,
  initialCodes,
  origin,
  currentUserId,
  emailConfigured,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [codes, setCodes] = useState<ReferralCodeWithStats[]>(initialCodes);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [codeEdited, setCodeEdited] = useState(false);
  const [qrFor, setQrFor] = useState<ReferralCodeWithStats | null>(null);
  const [shareFor, setShareFor] = useState<ReferralCodeWithStats | null>(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCodeEdited(false);
    setFormOpen(true);
  };

  const openEdit = (c: ReferralCodeWithStats) => {
    setForm({
      id: c.id,
      code: c.code,
      label: c.label,
      description: c.description ?? '',
      owner_name: c.owner_name ?? '',
      owner_email: c.owner_email ?? '',
      landing_path: c.landing_path ?? '',
      is_active: c.is_active,
    });
    setCodeEdited(true);
    setFormOpen(true);
  };

  const handleLabelChange = (label: string) => {
    setForm((f) => ({
      ...f,
      label,
      // Only auto-fill the code until the admin touches it themselves.
      code: codeEdited ? f.code : suggestReferralCode(label),
    }));
  };

  const save = useCallback(async () => {
    const label = form.label.trim();
    const code = form.code.trim().toLowerCase();

    if (label.length < 2) {
      toast.error('Give this link a name (e.g. "Northwestern Ontario").');
      return;
    }
    if (!isValidReferralCode(code)) {
      toast.error('Link code must be 3–40 characters: lowercase letters, numbers and hyphens.');
      return;
    }
    if (form.landing_path && !form.landing_path.startsWith('/')) {
      toast.error('Landing page must be a path starting with "/" (e.g. /scago/clinicians).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code,
        label,
        description: form.description,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        landing_path: form.landing_path,
        is_active: form.is_active,
      };

      if (form.id) {
        const updated = await updateReferralCode(supabase, form.id, payload);
        setCodes((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
        );
        toast.success('Referral link updated');
      } else {
        const created = await createReferralCode(
          supabase,
          institutionId,
          payload,
          currentUserId,
        );
        setCodes((prev) => [
          {
            ...created,
            stats: {
              referral_code_id: created.id,
              visits: 0,
              signups: 0,
              learners_started: 0,
              courses_completed: 0,
              certificates: 0,
              last_signup_at: null,
            },
          },
          ...prev,
        ]);
        toast.success('Referral link created');
      }
      setFormOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      toast.error(
        /duplicate key|unique/i.test(message)
          ? 'That link code is already in use. Pick another.'
          : message,
      );
    } finally {
      setSaving(false);
    }
  }, [form, institutionId, supabase, currentUserId]);

  const archive = useCallback(
    async (c: ReferralCodeWithStats) => {
      if (
        !window.confirm(
          `Archive "${c.label}"?\n\nThe link stops working and disappears from this list. Learners already attributed to it keep their attribution, and the dashboard link stops resolving.`,
        )
      ) {
        return;
      }
      try {
        await archiveReferralCode(supabase, c.id);
        setCodes((prev) => prev.filter((x) => x.id !== c.id));
        toast.success('Referral link archived');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Archive failed');
      }
    },
    [supabase],
  );

  const rotate = useCallback(
    async (c: ReferralCodeWithStats) => {
      if (
        !window.confirm(
          `Issue a new dashboard link for "${c.label}"?\n\nThe existing dashboard URL stops working immediately. The sharing link /r/${c.code} is not affected.`,
        )
      ) {
        return;
      }
      try {
        const token = await rotateReferralToken(supabase, c.id);
        setCodes((prev) =>
          prev.map((x) => (x.id === c.id ? { ...x, public_token: token } : x)),
        );
        toast.success('New dashboard link issued');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not issue a new link');
      }
    },
    [supabase],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Referral links</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Give an ambassador, region or partner their own tracked link. Anyone who signs up
            after opening it is attributed to them, and they get a live dashboard showing
            accounts created, modules completed and certificates earned — with no learner names
            or contact details on it.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" /> New referral link
        </Button>
      </header>

      {codes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Link2 className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 font-bold text-slate-900">No referral links yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Create one for each region, ambassador or partner organisation whose outreach you
            want to measure.
          </p>
          <Button onClick={openCreate} className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" /> New referral link
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {codes.map((c) => (
            <ReferralCard
              key={c.id}
              code={c}
              origin={origin}
              emailConfigured={emailConfigured}
              onEdit={() => openEdit(c)}
              onArchive={() => archive(c)}
              onRotate={() => rotate(c)}
              onQr={() => setQrFor(c)}
              onShare={() => setShareFor(c)}
            />
          ))}
        </div>
      )}

      {/* ---------------- Create / edit ---------------- */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogTitle className="pr-6">{form.id ? 'Edit referral link' : 'New referral link'}</DialogTitle>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="ref-label">Name *</Label>
              <Input
                id="ref-label"
                value={form.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Northwestern Ontario"
              />
              <p className="mt-1 text-xs text-slate-500">
                Shown as the heading on their dashboard.
              </p>
            </div>

            <div>
              <Label htmlFor="ref-code">Link code *</Label>
              <Input
                id="ref-code"
                value={form.code}
                onChange={(e) => {
                  setCodeEdited(true);
                  setForm((f) => ({ ...f, code: e.target.value.toLowerCase() }));
                }}
                placeholder="northwestern-ontario"
              />
              <p className="mt-1 break-all text-xs text-slate-500">
                Their link will be{' '}
                <span className="font-mono text-slate-700">
                  {referralShareUrl(origin, form.code || 'your-code')}
                </span>
              </p>
              {form.id && (
                <p className="mt-1 text-xs text-amber-700">
                  Changing the code breaks any link already printed or sent out.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="ref-desc">Description</Label>
              <Textarea
                id="ref-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Awareness campaign for healthcare providers across the region."
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ref-owner">Contact name</Label>
                <Input
                  id="ref-owner"
                  value={form.owner_name}
                  onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label htmlFor="ref-email">Contact email</Label>
                <Input
                  id="ref-email"
                  type="email"
                  value={form.owner_email}
                  onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))}
                  placeholder="name@example.org"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ref-landing">Landing page</Label>
              <Input
                id="ref-landing"
                value={form.landing_path}
                onChange={(e) => setForm((f) => ({ ...f, landing_path: e.target.value }))}
                placeholder={`/${institutionSlug}`}
              />
              <p className="mt-1 text-xs text-slate-500">
                Where the link drops people. Leave blank for the {institutionSlug.toUpperCase()}{' '}
                home page, or use e.g.{' '}
                <span className="font-mono">/{institutionSlug}/clinicians</span>.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Active</p>
                <p className="text-xs text-slate-500">
                  When off, the link still opens but stops counting.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {form.id ? 'Save changes' : 'Create link'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {qrFor && <QrDialog code={qrFor} origin={origin} onClose={() => setQrFor(null)} />}
      {shareFor && (
        <ShareDialog
          code={shareFor}
          origin={origin}
          emailConfigured={emailConfigured}
          onClose={() => setShareFor(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

function ReferralCard({
  code,
  origin,
  emailConfigured,
  onEdit,
  onArchive,
  onRotate,
  onQr,
  onShare,
}: {
  code: ReferralCodeWithStats;
  origin: string;
  emailConfigured: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onRotate: () => void;
  onQr: () => void;
  onShare: () => void;
}) {
  const shareUrl = referralShareUrl(origin, code.code);
  const reportUrl = referralReportUrl(origin, code.public_token);
  const s = code.stats;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">{code.label}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
              {code.code}
            </span>
            {!code.is_active && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                Paused
              </span>
            )}
          </div>
          {code.description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{code.description}</p>
          )}
          {(code.owner_name || code.owner_email) && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {[code.owner_name, code.owner_email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          <IconButton title="Edit" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton title="QR code" onClick={onQr}>
            <QrCode className="h-4 w-4" />
          </IconButton>
          <IconButton title="Share links" onClick={onShare}>
            <Mail className="h-4 w-4" />
          </IconButton>
          <IconButton title="Issue a new dashboard link" onClick={onRotate}>
            <RefreshCw className="h-4 w-4" />
          </IconButton>
          <IconButton title="Archive" onClick={onArchive} danger>
            <Archive className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Link opens" value={s.visits} />
        <Stat label="Accounts" value={s.signups} />
        <Stat label="Started" value={s.learners_started} />
        <Stat label="Modules done" value={s.courses_completed} />
        <Stat label="Certificates" value={s.certificates} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <CopyRow label="Sharing link" value={shareUrl} icon={Link2} openable />
        <CopyRow label="Their dashboard" value={reportUrl} icon={BarChart3} openable />
      </div>

      <TaggedLinks shareUrl={shareUrl} />

      {!emailConfigured && (
        <p className="mt-2 text-xs text-slate-400">
          Email sending is not configured, so links must be copied and sent manually.
        </p>
      )}
    </div>
  );
}

function IconButton({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-lg border border-slate-200 p-2 transition hover:bg-slate-50 ${
        danger ? 'text-red-600 hover:border-red-200 hover:bg-red-50' : 'text-slate-600'
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{fmt.format(value)}</p>
    </div>
  );
}

function CopyRow({
  label,
  value,
  icon: Icon,
  openable,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  openable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate font-mono text-xs text-slate-700" title={value}>
          {value}
        </p>
      </div>
      {openable && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ${label}`}
          className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <button
        type="button"
        onClick={copy}
        title={`Copy ${label}`}
        className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tagged links                                                        */
/* ------------------------------------------------------------------ */

/**
 * Collapsed by default: the plain link is the one people should reach for, and
 * seven near-identical URLs on every card would bury it.
 */
function TaggedLinks({ shareUrl }: { shareUrl: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
      >
        <Tag className="h-3.5 w-3.5" />
        Tagged links
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <p className="text-xs text-slate-600">
            Each tag shows up separately on the report, so you can see which placement worked.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {CAMPAIGN_TAGS.map((tag) => (
              <CopyRow
                key={tag}
                label={tag}
                value={taggedShareUrl(shareUrl, tag)}
                icon={Tag}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* QR                                                                  */
/* ------------------------------------------------------------------ */

function QrDialog({
  code,
  origin,
  onClose,
}: {
  code: ReferralCodeWithStats;
  origin: string;
  onClose: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  // Tagged: a scan sends no referrer, so an untagged QR is indistinguishable
  // from a typed-in link and both disappear into the "direct" bucket.
  const url = taggedShareUrl(referralShareUrl(origin, code.code), QR_CAMPAIGN_TAG);

  const download = () => {
    const canvas = holder.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${code.code}-qr.png`;
    a.click();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm text-center">
        <DialogTitle className="pr-6">QR code — {code.label}</DialogTitle>
        <p className="mt-1 text-sm text-slate-600">
          For slides, posters and printed handouts. Scanning it opens the tracked link.
        </p>
        <div ref={holder} className="mx-auto mt-4 w-fit rounded-xl bg-white p-4 ring-1 ring-slate-200">
          {/* 1024px so the PNG stays crisp when scaled up for print. */}
          <QRCodeCanvas value={url} size={1024} level="M" marginSize={2} className="!h-52 !w-52" />
        </div>
        <p className="mt-3 break-all font-mono text-xs text-slate-500">{url}</p>
        <p className="mt-1 text-xs text-slate-500">
          QR scans are tagged so they appear as their own row on the report.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={download} className="gap-1.5">
            <Download className="h-4 w-4" /> Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Share by email                                                      */
/* ------------------------------------------------------------------ */

function ShareDialog({
  code,
  origin,
  emailConfigured,
  onClose,
}: {
  code: ReferralCodeWithStats;
  origin: string;
  emailConfigured: boolean;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState(code.owner_email ?? '');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const list = emails
      .split(/[,;\n]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (list.length === 0) {
      toast.error('Add at least one email address.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/referrals/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId: code.id, emails: list }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Send failed');
      if (json.reason === 'smtp_not_configured') {
        toast.error('Email is not configured on this environment.');
      } else {
        toast.success(`Sent to ${json.sent} of ${json.total}`);
        if (json.failed) toast.error(`${json.failed} failed to send`);
        onClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle className="pr-6">Send links — {code.label}</DialogTitle>
        <p className="mt-1 text-sm text-slate-600">
          Emails the sharing link and their private dashboard link.
        </p>

        <div className="mt-4">
          <Label htmlFor="share-emails">Recipients</Label>
          <Textarea
            id="share-emails"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={3}
            placeholder="name@example.org, another@example.org"
          />
          <p className="mt-1 text-xs text-slate-500">
            Separate with commas, semicolons or new lines. Max 25.
          </p>
        </div>

        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          The dashboard link is the only credential for that page — anyone holding it can view
          the report. Send it only to people who should see the numbers.
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending || !emailConfigured} className="gap-1.5">
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            <Mail className="h-4 w-4" /> Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
