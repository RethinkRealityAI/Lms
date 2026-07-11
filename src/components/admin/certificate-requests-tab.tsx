'use client';

import { useEffect, useState, useCallback } from 'react';
import type { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCmeRequests, resolveCmeRequest } from '@/lib/db';
import type { CmeCertificateRequestWithUser } from '@/types';
import { toast } from 'sonner';
import { Clock, Loader2, RefreshCw, X, Award, Check } from 'lucide-react';

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function cmeStatusBadge(status: CmeCertificateRequestWithUser['status']) {
  const map: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    issued: 'bg-green-50 text-green-700 border-green-200',
    declined: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return <Badge variant="outline" className={`font-bold capitalize ${map[status] || map.pending}`}>{status}</Badge>;
}

export function CertificateRequestsTab({
  supabase,
  institutionId,
}: {
  supabase: ReturnType<typeof createClient>;
  institutionId: string | null;
}) {
  const [requests, setRequests] = useState<CmeCertificateRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    const data = await getCmeRequests(supabase, institutionId);
    const sorted = [...data].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0;
    });
    setRequests(sorted);
    setLoading(false);
  }, [supabase, institutionId]);

  useEffect(() => {
    if (institutionId) fetchRequests();
  }, [institutionId, fetchRequests]);

  const handleResolve = async (id: string, status: 'issued' | 'declined') => {
    setResolvingId(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Could not identify the current admin.'); return; }
      if (!institutionId) { toast.error('Institution not resolved.'); return; }
      const { error } = await resolveCmeRequest(supabase, id, user.id, status, institutionId);
      if (error) { toast.error(error); return; }
      toast.success(status === 'issued' ? 'Marked certificate as issued' : 'Request declined');
      await fetchRequests();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500 font-medium">
          {requests.length} total request{requests.length !== 1 ? 's' : ''} for CME certificates
        </p>
        <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading} className="rounded-xl font-bold gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-slate-300 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-400">Loading requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Award className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-700 mb-1">No certificate requests</h3>
            <p className="text-sm text-slate-400 font-medium max-w-sm text-center">
              When learners who have completed all courses request their certificate, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Card key={req.id} className="border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
              <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5">
                <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] flex items-center justify-center text-white text-sm font-black">
                  {(req.user?.full_name || req.user?.email || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm truncate">{req.user?.full_name || 'Unnamed'}</span>
                    {cmeStatusBadge(req.status)}
                    {req.program_label === 'EdApp import' && (
                      <Badge variant="outline" className="font-bold bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-2 py-0 shrink-0 cursor-default"
                        title="Completed the CME request module on the old platform — confirm delivery, then mark issued.">
                        EdApp import
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate">{req.user?.email || '—'}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> Requested {timeAgo(req.requested_at)}
                    {' · '}{new Date(req.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {req.program_label && req.program_label !== 'EdApp import' ? ` · ${req.program_label}` : ''}
                  </p>
                  {req.notes && <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 max-w-prose" title={req.notes}>{req.notes}</p>}
                </div>
                {req.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" disabled={resolvingId === req.id || !institutionId} onClick={() => handleResolve(req.id, 'issued')}
                      className="rounded-xl font-bold gap-2 bg-[#1E3A5F] hover:bg-[#0F172A]">
                      {resolvingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Mark Certificate Issued
                    </Button>
                    <Button size="sm" variant="outline" disabled={resolvingId === req.id || !institutionId} onClick={() => handleResolve(req.id, 'declined')}
                      className="rounded-xl font-bold gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                      <X className="h-3.5 w-3.5" /> Decline
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
