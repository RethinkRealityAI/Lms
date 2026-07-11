'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Mail, Clock, ChevronDown, ChevronUp, ExternalLink, Trash2, Loader2,
  Link2, BookOpen, FileText, Layers, Pencil,
} from 'lucide-react';
import { withInstitutionPath } from '@/lib/tenant/path';
import {
  FEEDBACK_TYPES, FEEDBACK_STATUSES, categoryLabel,
  type FeedbackStatus,
} from '@/lib/content/feedback-taxonomy';
import type { FeedbackSubmission } from '@/lib/db/feedback';

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string | null, email: string | null): string {
  const base = name || email || '?';
  return base.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

/** A pill that links somewhere (context deep-links). */
function LinkPill({ href, icon: Icon, children, external }: {
  href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:border-[#1E3A5F] hover:text-[#1E3A5F] transition-colors max-w-full"
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{children}</span>
      {external && <ExternalLink className="h-2.5 w-2.5 opacity-50 shrink-0" />}
    </a>
  );
}

export function FeedbackCard({ item, onStatusChange, onDelete }: {
  item: FeedbackSubmission;
  onStatusChange: (id: string, status: FeedbackStatus) => void;
  onDelete: (id: string) => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const typeCfg = FEEDBACK_TYPES[item.type];
  const catLabel = categoryLabel(item.type, item.category);
  const ctx = item.context ?? {};

  // Deep links: course → admin course page; lesson → editor at that lesson/slide.
  const coursePath = ctx.course_id ? withInstitutionPath(`/admin/courses/${ctx.course_id}`, pathname) : null;
  // The editor resumes on `?slide=<slide id>` (falls back to `?lesson=`), so pass the
  // real slide_id — slide_index is a position, not an id, and would be ignored.
  const editorPath = ctx.course_id && ctx.lesson_id
    ? withInstitutionPath(
        `/admin/courses/${ctx.course_id}/editor?lesson=${ctx.lesson_id}${ctx.slide_id ? `&slide=${ctx.slide_id}` : ''}`,
        pathname,
      )
    : null;
  const pageIsInternal = typeof ctx.page_url === 'string' && /^https?:\/\//.test(ctx.page_url);

  const hasContext = ctx.page_url || ctx.course_id || ctx.lesson_id || ctx.module_title || typeof ctx.slide_index === 'number';

  const handleStatus = async (status: FeedbackStatus) => {
    if (status === item.status) return;
    setSavingStatus(true);
    await onStatusChange(item.id, status);
    setSavingStatus(false);
  };

  return (
    <Card className={`border transition-all duration-200 ${
      expanded ? 'border-[#DC2626]/20 shadow-md ring-1 ring-[#DC2626]/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
    }`}>
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] flex items-center justify-center text-white text-sm font-black">
            {initials(item.name, item.email)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-slate-900 text-sm truncate">{item.name || 'Anonymous'}</span>
              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0 ${typeCfg.pillClass}`}>{typeCfg.label}</Badge>
              {catLabel && (
                <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 bg-white border-slate-200 text-slate-500">{catLabel}</Badge>
              )}
              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0 ${FEEDBACK_STATUSES[item.status].pillClass}`}>{FEEDBACK_STATUSES[item.status].label}</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-700 truncate">{item.subject || '(no subject)'}</p>
            {!expanded && <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{item.message}</p>}
            <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" /> {timeAgo(item.created_at)}
            </p>
          </div>
          <div className="shrink-0 text-slate-400">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
          <div className="border-t border-slate-100 pt-4 space-y-4">
            {item.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <a href={`mailto:${item.email}`} className="text-sm font-bold text-[#0099CA] hover:text-[#DC2626] transition-colors">{item.email}</a>
              </div>
            )}

            {hasContext && (
              <div className="flex flex-wrap gap-1.5">
                {pageIsInternal && <LinkPill href={ctx.page_url!} icon={Link2} external>Page</LinkPill>}
                {coursePath && <LinkPill href={coursePath} icon={BookOpen}>{ctx.course_title || 'Course'}</LinkPill>}
                {editorPath && (
                  <LinkPill href={editorPath} icon={Pencil}>
                    {(ctx.lesson_title || 'Lesson')}{typeof ctx.slide_index === 'number' ? ` · Slide ${ctx.slide_index + 1}` : ''} — open editor
                  </LinkPill>
                )}
                {!editorPath && ctx.lesson_title && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-500">
                    <FileText className="h-3 w-3" /> {ctx.lesson_title}
                  </span>
                )}
                {ctx.module_title && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-500">
                    <Layers className="h-3 w-3" /> {ctx.module_title}
                  </span>
                )}
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{item.message}</p>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Received {new Date(item.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Status segmented control */}
              <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {(Object.keys(FEEDBACK_STATUSES) as FeedbackStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatus(s)}
                    disabled={savingStatus}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors disabled:opacity-50 ${
                      item.status === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {FEEDBACK_STATUSES[s].label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {item.email && (
                  <Button size="sm" asChild className="rounded-xl font-bold gap-2 bg-[#1E3A5F] hover:bg-[#0F172A]">
                    <a href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject || 'Your message')}`}>
                      <Mail className="h-3.5 w-3.5" /> Reply <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  </Button>
                )}
                <Button
                  size="sm" variant="outline"
                  className="rounded-xl font-bold gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  disabled={deleting}
                  onClick={(e) => { e.stopPropagation(); setDeleting(true); onDelete(item.id); }}
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
