'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function LoginPage() {
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
  const supabase = createClient();

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

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, full_name')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error('User data fetch error:', userError);
        throw new Error('Unable to load user profile. Please contact support.');
      }

      if (!userData) {
        throw new Error('User profile not found. Please contact support.');
      }

      toast.success('Welcome back!', {
        description: `You have successfully signed in${userData.full_name ? `, ${userData.full_name}` : ''}.`,
      });

      // Use replace to avoid back button issues
      router.replace(userData.role === 'admin' ? '/admin' : '/student');
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
          emailRedirectTo: `${window.location.origin}/login`,
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

      // Create user profile
      const { error: dbError } = await supabase
        .from('users')
        .insert([{
          id: data.user.id,
          email: data.user.email || formData.email.trim().toLowerCase(),
          role: formData.role,
          full_name: formData.fullName.trim(),
        }]);

      if (dbError) {
        console.error('Database error:', dbError);
        // If user was created in auth but profile creation failed, try to clean up
        if (data.user) {
          await supabase.auth.signOut();
        }
        throw new Error('Account created but profile setup failed. Please contact support.');
      }

      toast.success('Account created successfully!', {
        description: data.session 
          ? 'You have been automatically signed in.' 
          : 'Please check your email to verify your account before signing in.',
        icon: <CheckCircle2 className="h-5 w-5" />,
      });

      // If session exists, redirect to appropriate dashboard
      if (data.session) {
        router.replace(formData.role === 'admin' ? '/admin' : '/student');
      } else {
        // Clear form and switch to sign in tab
        setActiveTab('signin');
        setFormData({ email: formData.email, password: '', fullName: '', role: 'student', verificationCode: '' });
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
        redirectTo: `${window.location.origin}/reset-password`,
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#fafafa] dark:bg-slate-950">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
      <div className="absolute top-0 -right-4 w-72 h-72 bg-secondary/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-100/20 dark:bg-pink-900/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />

      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none" />

      <div className="w-full max-w-[1000px] flex flex-col md:flex-row shadow-2xl rounded-[2rem] overflow-hidden bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 m-4">
        {/* Left Side: Brand/Marketing */}
        <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white relative">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(135deg,white,transparent)]" />

          <div className="relative">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-6 border border-white/30 shadow-inner">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">
              GANSID <br />
              <span className="font-light opacity-80 text-2xl">Learning Portal</span>
            </h1>
            <p className="text-white/80 text-lg leading-relaxed max-w-sm">
              Empowering the sickle cell community through education, research, and collaborative learning.
            </p>
          </div>

          <div className="relative mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm font-medium bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <span>Expert-led medical courses</span>
            </div>
            <div className="flex items-center gap-3 text-sm font-medium bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center shadow-lg">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <span>Global community network</span>
            </div>
          </div>

          <p className="relative text-xs opacity-50 font-medium">
            © 2026 Global Action Network for Sickle Cell
          </p>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-8 md:p-12">
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">GANSID</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {activeTab === 'signin' ? 'Welcome Back' : 'Join Our Community'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {activeTab === 'signin'
                ? 'Sign in to access your dashboard and continue learning.'
                : 'Create your account to start your learning journey with us.'}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
              <TabsTrigger
                value="signin"
                className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm transition-all"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-primary/20 ${errors.email ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive mt-1 font-medium">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="signin-password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-primary/20 ${errors.password ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {errors.password && <p className="text-xs text-destructive mt-1 font-medium">{errors.password}</p>}
                </div>

                <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98]" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Sign In'}
                </Button>
              </form>

              {/* Forgot Password Modal */}
              {showForgotPassword && (
                <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  {!resetSent ? (
                    <>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Reset Password</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                        Enter your email address and we'll send you a link to reset your password.
                      </p>
                      <form onSubmit={handleForgotPassword} className="space-y-3">
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className={`pl-10 h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg ${errors.resetEmail ? 'border-destructive' : ''}`}
                          />
                        </div>
                        {errors.resetEmail && <p className="text-xs text-destructive">{errors.resetEmail}</p>}
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            className="flex-1 h-10 text-sm"
                            disabled={resetLoading}
                          >
                            {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 text-sm"
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
                      <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Check Your Email</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                        We've sent a password reset link to <strong>{resetEmail}</strong>
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 text-sm"
                        onClick={() => {
                          setShowForgotPassword(false);
                          setResetEmail('');
                          setResetSent(false);
                        }}
                      >
                        Close
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="signup" className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-name"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role" className="text-xs font-semibold uppercase tracking-wider text-slate-500">I am a</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as any })}>
                      <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="admin">Instructor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.role === 'admin' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="signup-code" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Instructor Verification Code</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="signup-code"
                        value={formData.verificationCode}
                        onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                        className={`pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl ${errors.verificationCode ? 'border-destructive' : ''}`}
                        placeholder="Enter code"
                      />
                    </div>
                    {errors.verificationCode && <p className="text-xs text-destructive mt-1 font-medium">{errors.verificationCode}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl ${errors.email ? 'border-destructive' : ''}`}
                      placeholder="name@example.com"
                    />
                  </div>
                  {errors.email && <p className="text-xs text-destructive mt-1 font-medium">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl ${errors.password ? 'border-destructive' : ''}`}
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.password && <p className="text-xs text-destructive mt-1 font-medium">{errors.password}</p>}
                  
                  {/* Password Requirements Display */}
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Password Requirements:</p>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <li className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {formData.password.length >= 8 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span>At least 8 characters</span>
                      </li>
                      <li className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {/[A-Z]/.test(formData.password) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span>At least one uppercase letter</span>
                      </li>
                      <li className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {/[0-9]/.test(formData.password) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span>At least one number</span>
                      </li>
                      <li className={`flex items-center gap-2 ${/[a-z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}>
                        {/[a-z]/.test(formData.password) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        <span>At least one lowercase letter</span>
                      </li>
                    </ul>
                  </div>
                  
                  {formData.password && (
                    <div className="px-1 pt-2">
                      <div className="flex gap-1 h-1.5">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`h-full flex-1 rounded-full transition-all duration-500 ${i < (passwordStrength.strength || 0) ? (passwordStrength.color || 'bg-slate-200') : 'bg-slate-200 dark:bg-slate-700'}`} />
                        ))}
                      </div>
                      {passwordStrength.label && (
                        <p className={`text-xs mt-1.5 font-medium ${passwordStrength.textColor || 'text-slate-600 dark:text-slate-400'}`}>
                          Password strength: {passwordStrength.label}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full h-11 rounded-xl font-bold bg-secondary hover:bg-secondary/90 shadow-lg shadow-secondary/20 mt-2" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

