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
import { User, Mail, Loader2, Save, Camera, ShieldCheck, Key, LogOut } from 'lucide-react';
import type { User as UserType } from '@/types';

export default function ProfilePage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    avatar_url: '',
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
        });
      }
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

    setSaving(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">
            {user?.full_name ? `${user.full_name} Profile` : 'My Profile'}
          </h1>
          <p className="text-slate-500 font-medium">
            Manage your personal details and account preferences.
          </p>
        </div>
        <Badge className="w-fit bg-[#0099CA] hover:bg-[#007EA0] text-white border-none font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
          Instructor Account
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
                className="bg-slate-50/50 border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] font-medium p-4"
              />
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
