'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, Loader2, Save, Camera, ShieldCheck, Key, LogOut, BookOpen, CheckCircle, Award, BarChart3, Briefcase, Building2, Globe, ScrollText, History, Link2 } from 'lucide-react';
import type { User as UserType, CmeCertificateRequest } from '@/types';
import { isAdminRole } from '@/lib/auth/roles';
import { resolveInstitutionSlug } from '@/lib/tenant/path';
import type { StudentProgress } from '@/lib/db/analytics';
import {
  getMyCmeRequest,
  isEligibleForCme,
  requestCmeCertificate,
  cancelMyCmeRequest,
  getMyLegacyHistory,
  claimMyLegacyProfile,
  type LegacyHistory,
} from '@/lib/db';

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<StudentProgress | null>(null);
  const [cmeRequest, setCmeRequest] = useState<CmeCertificateRequest | null>(null);
  const [cmeEligible, setCmeEligible] = useState(false);
  const [cmeBusy, setCmeBusy] = useState(false);
  const [legacyHistory, setLegacyHistory] = useState<LegacyHistory | null>(null);
  const [linkingLegacy, setLinkingLegacy] = useState(false);
  // Active portal institution (dual access) — scopes stats + CME to the viewed portal.
  const [activeInstId, setActiveInstId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
    occupation: '',
    affiliation: '',
    country: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (authUser) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        toast.error('Failed to load profile', { description: error.message });
      } else if (data) {
        setUser(data);
        setFormData({
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          occupation: data.occupation || '',
          affiliation: data.affiliation || '',
          country: data.country || '',
        });
      }

      // Resolve the ACTIVE portal institution (URL/cookie slug), not the user's primary —
      // a dual-access learner's stats + CME must reflect the portal they're viewing.
      const activeSlug = resolveInstitutionSlug();
      const { data: activeInst } = await supabase
        .from('institutions')
        .select('id')
        .eq('slug', activeSlug)
        .maybeSingle();
      const resolvedInstId = (activeInst?.id as string | undefined) ?? data?.institution_id ?? null;
      setActiveInstId(resolvedInstId);

      // Learning stats, scoped to the active institution (migration 057 RPC) so the card
      // never sums a dual-access learner's two institutions together.
      if (resolvedInstId) {
        const { data: progressJson } = await supabase.rpc('get_my_student_progress', {
          p_institution_id: resolvedInstId,
        });
        if (progressJson) {
          const p = progressJson as Record<string, unknown>;
          setStats({
            user_id: authUser.id,
            email: data?.email ?? '',
            full_name: data?.full_name ?? null,
            enrollment_count: Number(p.enrollment_count ?? 0),
            completed_lessons: Number(p.completed_lessons ?? 0),
            quiz_attempts: Number(p.quiz_attempts ?? 0),
            avg_quiz_score: Number(p.avg_quiz_score ?? 0),
            certificates_earned: Number(p.certificates_earned ?? 0),
            last_activity: (p.last_activity as string | null) ?? null,
          });
        }
      }

      // Certificate of completion (CME) state + eligibility — scoped to the active portal
      // (CME/Mainpro+ is institution-specific), so a dual-access learner sees the right
      // program's eligibility and request state on each portal.
      if (resolvedInstId && data?.id) {
        const [request, eligible] = await Promise.all([
          getMyCmeRequest(supabase, data.id, resolvedInstId),
          isEligibleForCme(supabase, data.id, resolvedInstId),
        ]);
        setCmeRequest(request);
        setCmeEligible(eligible);
      }

      // Previous-platform (legacy) history, if a record is already linked
      const history = await getMyLegacyHistory(supabase, authUser.id);
      setLegacyHistory(history);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', { description: 'Please upload an image file (PNG, JPG, etc.)' });
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum image size is 2MB' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to 'avatars' bucket
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, we might need to tell them or handle it
        if (uploadError.message.includes('bucket not found')) {
          throw new Error('Avatar storage bucket not found. Please contact an administrator.');
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update form data and database
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Display image updated!');
      loadProfile();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Upload failed', { description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = formData.full_name.trim();
    if (!trimmedName) {
      toast.error('Full name is required');
      return;
    }
    if (trimmedName.length > 100) {
      toast.error('Full name must be under 100 characters');
      return;
    }
    if (formData.bio.length > 500) {
      toast.error('Bio must be under 500 characters');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: trimmedName,
          bio: formData.bio.trim(),
          avatar_url: formData.avatar_url,
          occupation: formData.occupation.trim() || null,
          affiliation: formData.affiliation.trim() || null,
          country: formData.country.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      loadProfile();
    } catch (error: any) {
      toast.error('Failed to update profile', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error('Failed to send reset link', { description: error.message });
    } else {
      toast.success('Reset link sent!', { description: 'Check your email for the password reset instructions.' });
    }
  };

  const handleRequestCme = async () => {
    if (!user || !activeInstId) return;
    setCmeBusy(true);
    try {
      const { error } = await requestCmeCertificate(supabase, activeInstId, null);
      if (error) {
        toast.error('Could not submit request', { description: error });
        return;
      }
      toast.success('Certificate request submitted', {
        description: 'Your request is now pending review.',
      });
      const request = await getMyCmeRequest(supabase, user.id, activeInstId);
      setCmeRequest(request);
    } finally {
      setCmeBusy(false);
    }
  };

  const handleCancelCme = async () => {
    if (!cmeRequest || !user || !activeInstId) return;
    setCmeBusy(true);
    try {
      const { error } = await cancelMyCmeRequest(supabase, cmeRequest.id, user.id);
      if (error) {
        toast.error('Could not cancel request', { description: error });
        return;
      }
      toast.success('Request cancelled');
      const request = await getMyCmeRequest(supabase, user.id, activeInstId);
      setCmeRequest(request);
    } finally {
      setCmeBusy(false);
    }
  };

  const handleLinkLegacy = async () => {
    setLinkingLegacy(true);
    try {
      const { claimed, reason, error } = await claimMyLegacyProfile(supabase);
      if (error) {
        toast.error('Could not link account', { description: error });
        return;
      }
      if (claimed) {
        toast.success('Linked!', { description: 'Your previous platform history is now connected.' });
        if (user) {
          const history = await getMyLegacyHistory(supabase, user.id);
          setLegacyHistory(history);
        }
      } else if (reason === 'no_match') {
        toast.info('No previous record found for your email');
      } else {
        toast.info('No previous record was linked');
      }
    } finally {
      setLinkingLegacy(false);
    }
  };

  const getInitials = (email: string, name?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Skeleton className="h-9 w-48 bg-slate-700 rounded-lg mb-2" />
          <Skeleton className="h-5 w-72 bg-slate-700 rounded-lg" />
        </div>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <Skeleton className="h-6 w-44 bg-slate-200" />
            <Skeleton className="h-4 w-64 bg-slate-200 mt-2" />
          </CardHeader>
          <CardContent className="pt-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <Skeleton className="h-32 w-32 rounded-full bg-slate-200" />
              <div className="flex-1 w-full space-y-4">
                <Skeleton className="h-11 w-full rounded-xl bg-slate-200" />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 mt-8">
              <Skeleton className="h-11 w-full rounded-xl bg-slate-200" />
              <Skeleton className="h-11 w-full rounded-xl bg-slate-200" />
            </div>
            <Skeleton className="h-24 w-full rounded-xl bg-slate-200 mt-6" />
          </CardContent>
        </Card>
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <Skeleton className="h-6 w-36 bg-slate-200" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                  <Skeleton className="h-5 w-5 rounded bg-slate-200 mb-2" />
                  <Skeleton className="h-7 w-10 bg-slate-200 mb-1" />
                  <Skeleton className="h-3 w-16 bg-slate-200" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-2">
            {user?.full_name ? `${user.full_name} Profile` : 'My Profile'}
          </h1>
          <p className="text-slate-400 font-medium">
            Manage your personal details and account preferences.
          </p>
        </div>
        <Badge className="w-fit bg-[#0099CA] hover:bg-[#007EA0] text-white border-none font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
          {isAdminRole(user?.role) ? 'Instructor' : 'Student'} Account
        </Badge>
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
          <CardTitle className="text-lg font-black text-slate-900">Personal Information</CardTitle>
          <CardDescription className="font-medium text-slate-500">
            Update your public profile details and bio.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-slate-50 shadow-xl overflow-hidden ring-4 ring-[#0F172A]/5">
                  {formData.avatar_url && (
                    <AvatarImage src={formData.avatar_url} alt={formData.full_name} className="object-cover" />
                  )}
                  <AvatarFallback className="text-4xl bg-slate-100 text-slate-400 font-black">
                    {getInitials(user?.email || '', formData.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-[#0F172A]/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm scale-95 group-hover:scale-100"
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-white mb-1" />
                      <span className="text-[10px] text-white font-black uppercase tracking-widest">Change Image</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </div>
              <div className="flex-1 w-full space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Display Image</Label>
                  <p className="text-sm text-slate-500 font-medium">Click on your photo to upload a new one. PNG or JPG, max 2MB.</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="avatar_url"
                      type="url"
                      placeholder="Or enter image URL here..."
                      value={formData.avatar_url}
                      onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                      className="h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400">Registered Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={user?.email}
                    disabled
                    className="pl-11 h-11 bg-slate-100/50 border-slate-200 rounded-xl font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB]" />
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="e.g. Dr. Jane Smith"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    maxLength={100}
                    className="pl-11 h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="occupation" className="text-xs font-black uppercase tracking-widest text-slate-400">Occupation</Label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB]" />
                  <Input
                    id="occupation"
                    type="text"
                    placeholder="e.g. Healthcare Professional"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    maxLength={100}
                    className="pl-11 h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="affiliation" className="text-xs font-black uppercase tracking-widest text-slate-400">Affiliation</Label>
                <div className="relative group">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB]" />
                  <Input
                    id="affiliation"
                    type="text"
                    placeholder="e.g. Sickle Cell Foundation"
                    value={formData.affiliation}
                    onChange={(e) => setFormData({ ...formData, affiliation: e.target.value })}
                    maxLength={150}
                    className="pl-11 h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country" className="text-xs font-black uppercase tracking-widest text-slate-400">Country</Label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB]" />
                  <Input
                    id="country"
                    type="text"
                    placeholder="e.g. Nigeria"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    maxLength={100}
                    className="pl-11 h-11 bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-xs font-black uppercase tracking-widest text-slate-400">Bio & Interests</Label>
              <Textarea
                id="bio"
                placeholder="Share your professional background and interests..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                maxLength={500}
                className="bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-medium p-4"
              />
              <p className="text-xs text-slate-400 text-right">{formData.bio.length}/500</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
              <Button
                type="button"
                variant="ghost"
                onClick={loadProfile}
                disabled={saving}
                className="font-bold text-slate-400 hover:text-slate-600 rounded-xl"
              >
                Discard Changes
              </Button>
              <Button 
                type="submit" 
                disabled={saving || uploading}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-blue-100 transition-all transform hover:scale-105"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Details
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Learning Progress Stats */}
      {stats && (
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#0099CA]" />
              Learning Progress
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Your activity and achievements across all courses.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <BookOpen className="h-5 w-5 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-black text-slate-900">{stats.enrollment_count}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Courses Enrolled</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-black text-slate-900">{stats.completed_lessons}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Lessons Done</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <BarChart3 className="h-5 w-5 text-indigo-600 mx-auto mb-2" />
                <p className="text-2xl font-black text-slate-900">
                  {stats.quiz_attempts > 0 ? `${Math.round(stats.avg_quiz_score)}%` : '—'}
                </p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Avg Quiz Score</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <Award className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-slate-900">{stats.certificates_earned}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Certificates</p>
              </div>
            </div>
            {stats.last_activity && (
              <p className="text-xs text-slate-400 font-medium mt-4 text-center">
                Last activity: {new Date(stats.last_activity).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certificate of Completion (CME) */}
      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
          <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-[#C8262A]" />
            Certificate of Completion
          </CardTitle>
          <CardDescription className="font-medium text-slate-500">
            Request your official certificate once you&apos;ve completed every module.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {cmeRequest?.status === 'issued' ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-100">
              <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-green-800">Certificate issued ✓</p>
                {cmeRequest.resolved_at && (
                  <p className="text-xs text-green-700 font-medium mt-0.5">
                    Issued {new Date(cmeRequest.resolved_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          ) : cmeRequest?.status === 'pending' ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-amber-600 shrink-0 animate-spin" />
                <p className="font-bold text-amber-800">Requested — pending review</p>
              </div>
              <Button
                variant="ghost"
                onClick={handleCancelCme}
                disabled={cmeBusy}
                className="font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl shrink-0"
              >
                {cmeBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cancel request
              </Button>
            </div>
          ) : cmeEligible ? (
            <div className="space-y-4">
              {cmeRequest?.status === 'declined' && (
                <p className="text-sm text-slate-500 font-medium">
                  Your previous request was not approved. You can submit a new request below.
                </p>
              )}
              <Button
                onClick={handleRequestCme}
                disabled={cmeBusy}
                className="bg-[#C8262A] hover:bg-[#A81E22] text-white font-bold px-8 h-12 rounded-xl shadow-lg transition-all"
              >
                {cmeBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ScrollText className="mr-2 h-4 w-4" />
                    Request Certificate of Completion
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 font-medium">
              Complete all course modules to request your certificate of completion.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden flex flex-col">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              Account Security
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Maintain your account access credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 flex-grow flex flex-col justify-between">
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Key className="h-4 w-4 text-[#2563EB]" />
                  </div>
                  <span className="font-bold text-slate-900">Change Password</span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
                  Request a password reset link to be sent to your registered email address.
                </p>
                <Button 
                  onClick={handleResetPassword}
                  className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold rounded-xl h-11"
                >
                  Email Reset Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-lg font-black text-slate-900">Registration Details</CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Your community status and history.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              <div className="flex justify-between items-center p-6">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">Status</span>
                  <span className="font-bold text-slate-900 capitalize">Active {user?.role}</span>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500" />
              </div>
              <div className="flex justify-between items-center p-6">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">Joined</span>
                  <span className="font-bold text-slate-900">
                    {new Date(user?.created_at || '').toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <Badge className="bg-slate-100 text-slate-600 border-none font-bold">Member</Badge>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-center gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">Used the previous SCAGO platform?</span>
                    <span className="font-medium text-slate-500 text-sm">
                      {legacyHistory ? 'Your old account is linked.' : 'Link it to carry over your history.'}
                    </span>
                  </div>
                  {!legacyHistory && (
                    <Button
                      variant="outline"
                      onClick={handleLinkLegacy}
                      disabled={linkingLegacy}
                      className="font-bold rounded-xl shrink-0 border-slate-200"
                    >
                      {linkingLegacy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="mr-2 h-4 w-4" />
                      )}
                      Link my old account
                    </Button>
                  )}
                </div>
                {legacyHistory && (
                  <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <History className="h-4 w-4 text-[#1A3C6E] shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-slate-600">
                      Previous platform history —{' '}
                      <span className="font-bold text-slate-900">{Math.round(legacyHistory.completed_percent ?? 0)}% complete</span>
                      {' · '}
                      <span className="font-bold text-slate-900">{legacyHistory.completions ?? 0} courses</span>
                      {' · avg score '}
                      <span className="font-bold text-slate-900">{Math.round(legacyHistory.avg_score ?? 0)}%</span>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center p-6">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 font-bold p-0 h-auto"
                  asChild
                >
                  <form action="/auth/signout" method="post">
                    <button type="submit" className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Sign Out of Session
                    </button>
                  </form>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
