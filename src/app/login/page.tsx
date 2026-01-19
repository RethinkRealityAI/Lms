'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PublicNav } from '@/components/public-nav';
import { toast } from 'sonner';
import { z } from 'zod';
import { BookOpen, Loader2, Mail, Lock, User, AlertCircle, CheckCircle2, Globe } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  role: z.enum(['admin', 'student']),
  verificationCode: z.string().optional(),
}).refine((data) => {
  if (data.role === 'admin' && !data.verificationCode) {
    return false;
  }
  return true;
}, {
  message: "Verification code is required for instructors",
  path: ["verificationCode"],
});

function LoginContent() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student' as 'admin' | 'student',
    verificationCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Check for verification success or errors from callback
  useEffect(() => {
    const verified = searchParams.get('verified');
    const error = searchParams.get('error');
    const tab = searchParams.get('tab');

    if (verified === 'true') {
      toast.success('Email verified successfully!', {
        description: `Your account has been verified. You can now sign in.`,
        icon: <CheckCircle2 className="h-5 w-5" />,
      });
      // Clear the URL parameters
      window.history.replaceState({}, '', '/login');
    } else if (error) {
      toast.error('Verification Error', {
        description: decodeURIComponent(error),
      });
      // Clear the URL parameters
      window.history.replaceState({}, '', '/login');
    }

    if (tab === 'signup') {
      setActiveTab('signup');
    } else if (tab === 'signin') {
      setActiveTab('signin');
    }
  }, [searchParams]);

  const validateForm = () => {
    try {
      if (activeTab === 'signin') {
        signInSchema.parse({
          email: formData.email,
          password: formData.password,
        });
      } else {
        signUpSchema.parse(formData);
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many login attempts. Please wait a few minutes before trying again.');
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('Authentication failed. Please try again.');
      }

      let userData = null;
      let userError = null;
      
      // Try to get user profile
      const profileResult = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', data.user.id)
        .single();
      
      userData = profileResult.data;
      userError = profileResult.error;

      // If profile doesn't exist, try to create it from user metadata
      if (userError || !userData) {
        console.log('Profile not found, attempting to create from metadata');
        
        const role = data.user.user_metadata?.role || 'student';
        const fullName = data.user.user_metadata?.full_name || '';
        
        const { error: createError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: data.user.email || formData.email.trim().toLowerCase(),
            role: role,
            full_name: fullName,
          }]);

        if (createError) {
          // Check if it's a duplicate key error (profile was created by trigger)
          if (createError.code === '23505') {
            // Profile exists now, fetch it again
            const { data: retryData } = await supabase
              .from('users')
              .select('role, full_name')
              .eq('id', data.user.id)
              .single();
            userData = retryData;
          } else {
            console.error('Profile creation error:', createError);
            // Still allow login with default role
            userData = { role: role, full_name: fullName };
          }
        } else {
          userData = { role: role, full_name: fullName };
        }
      }

      const finalRole = userData?.role || 'student';
      const finalName = userData?.full_name;

      toast.success('Welcome back!', {
        description: `You have successfully signed in${finalName ? `, ${finalName}` : ''}.`,
      });

      // Use replace to avoid back button issues
      router.replace(finalRole === 'admin' ? '/admin' : '/student');
    } catch (err: any) {
      toast.error('Sign in failed', {
        description: err.message || 'Please check your credentials and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Validate verification code for admin signup
      if (formData.role === 'admin') {
        if (!formData.verificationCode || formData.verificationCode.trim() === '') {
          setErrors({ verificationCode: 'Verification code is required for admin signup' });
          setLoading(false);
          return;
        }

        const { data: codeData, error: codeError } = await supabase
          .from('verification_codes')
          .select('*')
          .eq('code', formData.verificationCode.trim())
          .eq('role', 'admin')
          .single();

        if (codeError || !codeData) {
          setErrors({ verificationCode: 'Invalid verification code' });
          setLoading(false);
          return;
        }

        if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
          setErrors({ verificationCode: 'Verification code has expired' });
          setLoading(false);
          return;
        }

        if (codeData.current_uses >= codeData.max_uses) {
          setErrors({ verificationCode: 'Verification code has reached its maximum usage' });
          setLoading(false);
          return;
        }
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email.trim().toLowerCase())
        .single();

      if (existingUser) {
        setErrors({ email: 'An account with this email already exists. Please sign in instead.' });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            role: formData.role,
            full_name: formData.fullName.trim(),
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        } else if (error.message.includes('Password')) {
          throw new Error('Password does not meet requirements. Please check the password requirements.');
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('Account creation failed. Please try again.');
      }

      // Increment verification code usage for admin
      if (formData.role === 'admin' && formData.verificationCode) {
        try {
          await supabase.rpc('increment_code_usage', { p_code: formData.verificationCode.trim() });
        } catch (rpcError) {
          console.error('Failed to increment code usage:', rpcError);
          // Don't fail signup if this fails, but log it
        }
      }

      // Wait a moment for the database trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify that the user profile was created by the trigger
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, email, role, full_name')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profileData) {
        console.error('Profile verification error:', profileError);
        
        // If profile doesn't exist, try to create it manually as a fallback
        const { error: manualCreateError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: data.user.email || formData.email.trim().toLowerCase(),
            role: formData.role,
            full_name: formData.fullName.trim(),
          }]);

        if (manualCreateError) {
          console.error('Manual profile creation error:', manualCreateError);
          
          // Check if it's a duplicate key error (profile was created by trigger but we didn't see it)
          if (manualCreateError.code === '23505') {
            // Profile exists, continue
            console.log('Profile already exists (created by trigger)');
          } else {
            // Real error, clean up auth user
            await supabase.auth.signOut();
            throw new Error('Account created but profile setup failed. Please contact support with error code: PROFILE_CREATE_FAILED');
          }
        }
      }

      toast.success('Account created successfully!', {
        description: data.session 
          ? 'You have been automatically signed in.' 
          : 'Please check your email and click the verification link to activate your account.',
        icon: <CheckCircle2 className="h-5 w-5" />,
        duration: data.session ? 3000 : 6000,
      });

      // If session exists, redirect to appropriate dashboard
      if (data.session) {
        router.replace(formData.role === 'admin' ? '/admin' : '/student');
      } else {
        // Clear form and switch to sign in tab, but keep email
        setActiveTab('signin');
        setFormData({ 
          email: formData.email, 
          password: '', 
          fullName: '', 
          role: 'student', 
          verificationCode: '' 
        });
        
        // Show additional help message
        setTimeout(() => {
          toast.info('Check your spam folder', {
            description: 'If you don\'t see the verification email in your inbox, please check your spam or junk folder.',
            duration: 5000,
          });
        }, 2000);
      }
    } catch (err: any) {
      toast.error('Sign up failed', {
        description: err.message || 'Please check your information and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '', textColor: 'text-slate-600' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'];
    const textColors = ['text-red-600', 'text-orange-600', 'text-yellow-600', 'text-green-600', 'text-emerald-600'];

    return {
      strength,
      label: labels[strength - 1] || '',
      color: colors[strength - 1] || 'bg-slate-200',
      textColor: textColors[strength - 1] || 'text-slate-600',
    };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!resetEmail.trim()) {
      setErrors({ resetEmail: 'Please enter your email address' });
      return;
    }

    const emailSchema = z.string().email('Please enter a valid email address');
    try {
      emailSchema.parse(resetEmail.trim());
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ resetEmail: error.errors[0].message });
      }
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetSent(true);
      toast.success('Password reset email sent!', {
        description: 'Please check your email for instructions to reset your password.',
      });
    } catch (err: any) {
      toast.error('Failed to send reset email', {
        description: err.message || 'Please try again later.',
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-red-100 selection:text-red-900">
      <PublicNav transparentInitially={false} />
      
      <div className="flex-1 flex items-center justify-center relative overflow-y-auto bg-white pt-16 pb-8">
        {/* Dynamic Background Elements - matching Home Page */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="w-full max-w-[900px] flex flex-col md:flex-row shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden bg-white/40 backdrop-blur-2xl border border-white/50 m-3 relative z-10">
        {/* Left Side: Brand/Marketing */}
        <div className="hidden md:flex flex-col justify-between w-1/2 p-8 bg-gradient-to-br from-[#991B1B] to-[#DC2626] text-white relative">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(135deg,white,transparent)] opacity-20" />

          <div className="relative">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-4 border border-white/30 shadow-inner">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-3 leading-tight">
              GANSID <br />
              <span className="font-light opacity-80 text-xl">Learning Portal</span>
            </h1>
            <p className="text-white/80 text-base leading-relaxed max-w-sm font-medium">
              Empowering healthcare providers through modular, evidence-based education in inherited blood disorders.
            </p>
          </div>

          <div className="relative mt-6 space-y-3">
            <div className="flex items-center gap-3 text-sm font-bold bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
              <span>Expert-led clinical courses</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center shadow-lg">
                <Globe className="h-3.5 w-3.5 text-white" />
              </div>
              <span>Global community network</span>
            </div>
          </div>

          <p className="relative text-[10px] opacity-50 font-black uppercase tracking-widest leading-tight pt-[5px] pb-[5px]">
            © 2026 Global Action Network for Sickle Cell and Other Inherited Blood Disorders
          </p>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-6 md:p-8 bg-white/60 overflow-y-auto max-h-[calc(100vh-6rem)]">
          <div className="md:hidden flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-gradient-to-br from-[#991B1B] to-[#DC2626] rounded-xl flex items-center justify-center text-white shadow-lg">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tighter">GANSID</span>
          </div>

          <div className="mb-5">
            <h2 className="text-2xl font-black text-slate-900 mb-1.5 tracking-tight">
              {activeTab === 'signin' ? 'Welcome Back' : 'Join Our Community'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {activeTab === 'signin'
                ? 'Sign in to access your modules and continue learning.'
                : 'Create your account to start your clinical training journey.'}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200">
              <TabsTrigger
                value="signin"
                className="rounded-xl font-bold data-[state=active]:!bg-[#2563EB] data-[state=active]:!text-white data-[state=active]:shadow-sm transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-xl font-bold data-[state=active]:!bg-[#DC2626] data-[state=active]:!text-white data-[state=active]:shadow-sm transition-all"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="doctor@hospital.org"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`pl-12 h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] transition-all font-medium ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1 font-bold">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="signin-password" className="text-xs font-black uppercase tracking-widest text-slate-400">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`pl-12 h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-100 focus:border-[#2563EB] transition-all font-medium ${errors.password ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1 font-bold">{errors.password}</p>}
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold bg-[#2563EB] hover:bg-[#1D4ED8] shadow-xl shadow-blue-100 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Sign In'}
                </Button>
              </form>

              {/* Forgot Password Modal */}
              {showForgotPassword && (
                <div className="mt-6 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 backdrop-blur-sm animate-in zoom-in-95 duration-300">
                  {!resetSent ? (
                    <>
                      <h3 className="text-sm font-black text-slate-900 mb-2 uppercase tracking-wider">Reset Password</h3>
                      <p className="text-xs text-slate-600 mb-4 font-medium">
                        Enter your clinical email and we'll send a secure reset link.
                      </p>
                      <form onSubmit={handleForgotPassword} className="space-y-3">
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className={`pl-12 h-12 bg-white border-slate-200 rounded-xl font-medium ${errors.resetEmail ? 'border-red-500' : ''}`}
                          />
                        </div>
                        {errors.resetEmail && <p className="text-xs text-red-500 font-bold">{errors.resetEmail}</p>}
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            className="flex-1 h-12 text-sm font-bold bg-[#2563EB] hover:bg-[#1D4ED8] rounded-xl"
                            disabled={resetLoading}
                          >
                            {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-12 text-sm font-bold text-slate-500 rounded-xl"
                            onClick={() => {
                              setShowForgotPassword(false);
                              setResetEmail('');
                              setResetSent(false);
                              setErrors({});
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900 mb-1 uppercase tracking-wider">Check Your Inbox</h3>
                      <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">
                        We've sent a secure password reset link to <br /><strong className="text-slate-900">{resetEmail}</strong>
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 text-sm font-bold border-slate-200 rounded-xl"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetEmail('');
                          setResetSent(false);
                        }}
                      >
                        Return to Sign In
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="signup" className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name</Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#DC2626] transition-colors" />
                      <Input
                        id="signup-name"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="pl-11 h-11 bg-white border-slate-200 rounded-xl font-medium focus:ring-red-100 focus:border-[#DC2626]"
                        placeholder="Dr. John Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role" className="text-xs font-black uppercase tracking-widest text-slate-400">Role</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as 'admin' | 'student' })}>
                      <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl font-bold focus:ring-red-100 focus:border-[#DC2626]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student" className="font-bold">Learner</SelectItem>
                        <SelectItem value="admin" className="font-bold">Instructor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.role === 'admin' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="signup-code" className="text-xs font-black uppercase tracking-widest text-slate-400">Instructor Verification Code</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#DC2626]" />
                      <Input
                        id="signup-code"
                        value={formData.verificationCode}
                        onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                        className={`pl-11 h-11 bg-white border-slate-200 rounded-xl font-medium focus:ring-red-100 focus:border-[#DC2626] ${errors.verificationCode ? 'border-red-500' : ''}`}
                        placeholder="Enter authorization code"
                      />
                    </div>
                    {errors.verificationCode && <p className="text-xs text-red-500 mt-1 font-bold">{errors.verificationCode}</p>}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#DC2626]" />
                    <Input
                      id="signup-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`pl-11 h-11 bg-white border-slate-200 rounded-xl font-medium focus:ring-red-100 focus:border-[#DC2626] ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="clinician@hospital.org"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1 font-bold">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs font-black uppercase tracking-widest text-slate-400">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#DC2626]" />
                    <Input
                      id="signup-password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`pl-11 h-11 bg-white border-slate-200 rounded-xl font-medium focus:ring-red-100 focus:border-[#DC2626] ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1 font-bold">{errors.password}</p>}
                  
                  {/* Password Requirements Display */}
                  <div className="mt-2 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-[#0F172A] mb-2 uppercase tracking-widest">Security Requirements:</p>
                    <ul className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-orange-600">
                      <li className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-600' : ''}`}>
                        {formData.password.length >= 8 ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                        )}
                        <span>8+ Characters</span>
                      </li>
                      <li className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/[A-Z]/.test(formData.password) ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                        )}
                        <span>Uppercase</span>
                      </li>
                      <li className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/[0-9]/.test(formData.password) ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                        )}
                        <span>Number</span>
                      </li>
                      <li className={`flex items-center gap-2 ${/[a-z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                        {/[a-z]/.test(formData.password) ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />
                        )}
                        <span>Lowercase</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl font-black uppercase tracking-widest bg-[#DC2626] hover:bg-[#991B1B] shadow-xl shadow-red-100 mt-2 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-[#DC2626]" /></div>}>
      <LoginContent />
    </Suspense>
  );
}

