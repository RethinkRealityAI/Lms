'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  MessageSquare, Inbox, Loader2, RefreshCw, Search, X, Award, Flag, Lightbulb, Bug,
} from 'lucide-react';
import { FeedbackCard } from '@/components/admin/feedback-card';
import { CertificateRequestsTab } from '@/components/admin/certificate-requests-tab';
import { listFeedback, updateFeedbackStatus, deleteFeedback, type FeedbackSubmission } from '@/lib/db/feedback';
import type { FeedbackType, FeedbackStatus } from '@/lib/content/feedback-taxonomy';

/** Resolve the current tenant's institution_id from the cookie set by middleware. */
function useInstitutionId(supabase: ReturnType<typeof createClient>) {
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  useEffect(() => {
    const slug = document.cookie.split('; ').find((c) => c.startsWith('institution_slug='))?.split('=')[1];
    if (slug) {
      supabase.from('institutions').select('id').eq('slug', slug).maybeSingle()
        .then(({ data }) => { if (data) setInstitutionId(data.id); });
    }
  }, [supabase]);
  return institutionId;
}

type FilterKey = 'all' | FeedbackType | 'cme';

const FILTERS: { key: FilterKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'contact', label: 'Contact', icon: MessageSquare },
  { key: 'issue', label: 'Issues', icon: Flag },
  { key: 'suggestion', label: 'Suggestions', icon: Lightbulb },
  { key: 'bug', label: 'Bug reports', icon: Bug },
  { key: 'cme', label: 'Certificate requests', icon: Award },
];

const STATUS_FILTERS: { key: 'all' | FeedbackStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
];

export default function AdminSupportPage() {
  const supabase = createClient();
  const institutionId = useInstitutionId(supabase);

  const [items, setItems] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [search, setSearch] = useState('');

  const fetchItems = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      setItems(await listFeedback(supabase, institutionId));
    } catch (err) {
      toast.error('Failed to load feedback', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [supabase, institutionId]);

  useEffect(() => { if (institutionId) fetchItems(); }, [institutionId, fetchItems]);

  // New (unresolved) counts per type, for the filter-pill badges.
  const newCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) if (i.status === 'new') c[i.type] = (c[i.type] ?? 0) + 1;
    c.all = items.filter((i) => i.status === 'new').length;
    return c;
  }, [items]);

  const filtered = useMemo(() => items.filter((i) => {
    if (activeFilter !== 'all' && activeFilter !== 'cme' && i.type !== activeFilter) return false;
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (![i.name, i.email, i.subject, i.message].some((v) => v?.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [items, activeFilter, statusFilter, search]);

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    const prev = items;
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, status } : i)));
    try {
      await updateFeedbackStatus(supabase, id, status);
    } catch (err) {
      setItems(prev); // revert on failure
      toast.error('Could not update status', { description: err instanceof Error ? err.message : undefined });
    }
  };

  const handleDelete = async (id: string) => {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== id));
    try {
      await deleteFeedback(supabase, id);
    } catch (err) {
      setItems(prev);
      toast.error('Could not delete', { description: err instanceof Error ? err.message : undefined });
    }
  };

  const showingCme = activeFilter === 'cme';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DC2626]/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-[#DC2626]" />
          </div>
          Support
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Contact messages, issue &amp; bug reports, suggestions, and certificate requests — all in one place.
        </p>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = activeFilter === f.key;
          const count = f.key !== 'cme' ? newCounts[f.key] ?? 0 : 0;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors ${
                active ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <f.icon className="h-4 w-4" />
              {f.label}
              {count > 0 && (
                <span className={`min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full text-[10px] font-black ${
                  active ? 'bg-white/20 text-white' : 'bg-[#DC2626] text-white'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {showingCme ? (
        <CertificateRequestsTab supabase={supabase} institutionId={institutionId} />
      ) : (
        <>
          {/* Status filter + search + refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    statusFilter === s.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >{s.label}</button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, subject, or message…"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]/50 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={fetchItems} disabled={loading} className="rounded-xl font-bold gap-2 shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-slate-300 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-400">Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Inbox className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-700 mb-1">{search || statusFilter !== 'all' ? 'No matches' : 'Nothing here yet'}</h3>
                <p className="text-sm text-slate-400 font-medium max-w-sm text-center">
                  {search || statusFilter !== 'all'
                    ? 'Try a different filter or search term.'
                    : 'Contact messages, reported issues, bugs, and suggestions will appear here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <FeedbackCard key={item.id} item={item} onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
