'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  Mail,
  Clock,
  ChevronDown,
  ChevronUp,
  Inbox,
  Loader2,
  RefreshCw,
  ExternalLink,
  Trash2,
  Search,
  X,
} from 'lucide-react';

interface Submission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Resolve the current tenant's institution_id from the cookie set by middleware. */
function useInstitutionId(supabase: ReturnType<typeof createClient>) {
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  useEffect(() => {
    const slugCookie = document.cookie
      .split('; ')
      .find((c) => c.startsWith('institution_slug='));
    const slug = slugCookie?.split('=')[1];
    if (slug) {
      supabase
        .from('institutions')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setInstitutionId(data.id);
        });
    }
  }, [supabase]);
  return institutionId;
}

export default function AdminSupportPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const supabase = createClient();
  const institutionId = useInstitutionId(supabase);

  const fetchSubmissions = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubmissions(data);
    }
    setLoading(false);
  }, [supabase, institutionId]);

  useEffect(() => {
    if (institutionId) fetchSubmissions();
  }, [institutionId, fetchSubmissions]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase
      .from('contact_submissions')
      .delete()
      .eq('id', id);

    if (!error) {
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
    setDeleting(null);
  };

  const filtered = submissions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.subject.toLowerCase().includes(q) ||
      s.message.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DC2626]/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-[#DC2626]" />
            </div>
            Support Messages
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {submissions.length} total message{submissions.length !== 1 ? 's' : ''} from the contact form
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSubmissions}
          disabled={loading}
          className="rounded-xl font-bold gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, subject, or message..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]/50 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-slate-300 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-400">Loading messages...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700 mb-1">
              {search ? 'No matches found' : 'No messages yet'}
            </h3>
            <p className="text-sm text-slate-400 font-medium max-w-sm text-center">
              {search
                ? 'Try a different search term.'
                : 'When visitors submit the contact form, their messages will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((submission) => {
            const isExpanded = expandedId === submission.id;
            return (
              <Card
                key={submission.id}
                className={`border transition-all duration-200 ${
                  isExpanded
                    ? 'border-[#DC2626]/20 shadow-md ring-1 ring-[#DC2626]/10'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : submission.id)}
                  className="w-full text-left p-4 sm:p-5"
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] flex items-center justify-center text-white text-sm font-black">
                      {submission.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {submission.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] font-bold px-2 py-0 border-slate-200 text-slate-400"
                        >
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          {timeAgo(submission.created_at)}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-slate-700 truncate">
                        {submission.subject}
                      </p>
                      {!isExpanded && (
                        <p className="text-xs text-slate-400 font-medium truncate mt-0.5">
                          {submission.message}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
                    <div className="border-t border-slate-100 pt-4">
                      {/* Email */}
                      <div className="flex items-center gap-2 mb-4">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <a
                          href={`mailto:${submission.email}`}
                          className="text-sm font-bold text-[#0099CA] hover:text-[#DC2626] transition-colors"
                        >
                          {submission.email}
                        </a>
                      </div>

                      {/* Message */}
                      <div className="bg-slate-50 rounded-xl p-4 mb-4">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {submission.message}
                        </p>
                      </div>

                      {/* Timestamp */}
                      <p className="text-xs text-slate-400 font-medium mb-4">
                        Received{' '}
                        {new Date(submission.created_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          asChild
                          className="rounded-xl font-bold gap-2 bg-[#1E3A5F] hover:bg-[#0F172A]"
                        >
                          <a
                            href={`mailto:${submission.email}?subject=Re: ${encodeURIComponent(submission.subject)}`}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Reply via Email
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl font-bold gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          disabled={deleting === submission.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(submission.id);
                          }}
                        >
                          {deleting === submission.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
