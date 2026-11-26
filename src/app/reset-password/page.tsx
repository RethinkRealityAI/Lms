'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { withInstitutionPath } from '@/lib/tenant/path';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { parseRecoveryLink, RECOVERY_URL_KEYS } from '@/lib/auth/recovery-link';
import { Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState({ strength: 0, label: '', color: '', textColor: '' });
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // 'checking' while we turn the email link into a session; 'confirm' when the
  // link is a token hash that waits for a click (so an email scanner opening
  // the link cannot use it up); 'invalid' shows a clear way to get a new link
  // instead of bouncing the learner away (the old "flashes then disappears").
  const [linkState, setLinkState] = useState<'checking' | 'confirm' | 'ready' | 'invalid'>('checking');
  const [invalidReason, setInvalidReason] = useState<'expired' | 'other_browser' | 'missing'>('missing');
  const [pendingTokenHash, setPendingTokenHash] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const link = parseRecoveryLink(window.location.search, window.location.hash);

    const clearUrl = () => {
      const url = new URL(window.location.href);
      RECOVERY_URL_KEYS.forEach((k) => url.searchParams.delete(k));
      url.hash = '';
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    };

    const establish = async () => {
      if (link.kind === 'error') {
        clearUrl();
        setInvalidReason('expired');
        setLinkState('invalid');
        return;
      }
      if (link.kind === 'token_hash') {
        // Wait for the learner to click "Continue" (see handleConfirmLink).
        setPendingTokenHash(link.tokenHash);
        clearUrl();
        setLinkState('confirm');
        return;
      }
      if (link.kind === 'tokens') {
        const { error } = await supabase.auth.setSession({
          access_token: link.accessToken,
          refresh_token: link.refreshToken,
        });
        clearUrl();
        if (cancelled) return;
        if (error) {
          setInvalidReason('expired');
          setLinkState('invalid');
        } else {
          setLinkState('ready');
        }
        return;
      }

      // ?code= links: the browser client exchanges the code itself while it
      // initialises (getSession waits for that), as long as this is the browser
      // that requested the email and so holds the PKCE code verifier.
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (link.kind === 'code') clearUrl();
      if (session) {
        setLinkState('ready');
        return;
      }
      setInvalidReason(link.kind === 'code' ? 'other_browser' : 'missing');
      setLinkState('invalid');
    };

    establish().catch(() => {
      if (cancelled) return;
      setInvalidReason('expired');
      setLinkState('invalid');
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const handleConfirmLink = async () => {
    if (!pendingTokenHash) return;
    setConfirming(true);
    const { error } = await supabase.auth.verifyOtp({ token_hash: pendingTokenHash, type: 'recovery' });
    setConfirming(false);
    if (error) {
      setInvalidReason('expired');
      setLinkState('invalid');
      return;
    }
    setPendingTokenHash(null);
    setLinkState('ready');
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '', textColor: '' };
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
      color: colors[strength - 1] || '',
      textColor: textColors[strength - 1] || 'text-slate-600',
    };
  };

  useEffect(() => {
    setPasswordStrength(getPasswordStrength(formData.password));
  }, [formData.password]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      resetPasswordSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0].toString()] = err.message;
        });
        setErrors(newErrors);
      }
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        if (error.message.includes('same as the old password')) {
          throw new Error('New password must be different from your current password.');
        }
        throw error;
      }

      toast.success('Password reset successfully!', {
        description: 'Your password has been updated. You can now sign in with your new password.',
        icon: <CheckCircle2 className="h-5 w-5" />,
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      router.push(withInstitutionPath('/login?tab=signin', pathname));
    } catch (err: any) {
      toast.error('Password reset failed', {
        description: err.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
          {linkState === 'ready' && (
            <CardDescription>
              Enter your new password below. Make sure it meets all the requirements.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {linkState === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-8 text-slate-600" role="status">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Checking your reset link…</p>
            </div>
          )}

          {linkState === 'confirm' && (
            <div className="space-y-4 py-2 text-center">
              <p className="text-sm text-slate-600">
                Click continue to choose a new password for your account.
              </p>
              <Button
                type="button"
                onClick={handleConfirmLink}
                disabled={confirming}
                className="w-full h-12 rounded-xl text-md font-bold"
              >
                {confirming ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Continue'}
              </Button>
            </div>
          )}

          {linkState === 'invalid' && (
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="space-y-1 text-sm text-amber-900">
                  <p className="font-semibold">
                    {invalidReason === 'missing'
                      ? 'Open the link from your reset email'
                      : 'This reset link can’t be used'}
                  </p>
                  <p>
                    {invalidReason === 'other_browser'
                      ? 'For your security, a reset link only works in the same browser where you asked for it. Request a new link here, then open the email on this device.'
                      : invalidReason === 'expired'
                        ? 'It has expired or was already used. Reset links work once and expire after one hour. Request a new one below.'
                        : 'To reset your password, request a reset link and open it from your email.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => router.push(withInstitutionPath('/login?tab=forgot', pathname))}
                className="w-full h-12 rounded-xl text-md font-bold"
              >
                Request a new reset link
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push(withInstitutionPath('/login?tab=signin', pathname))}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {linkState === 'ready' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl ${errors.password ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1 font-medium">{errors.password}</p>}
              
              {/* Password Requirements */}
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
                  <li className={`flex items-center gap-2 ${/[a-z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}>
                    {/[a-z]/.test(formData.password) ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <span>At least one lowercase letter</span>
                  </li>
                  <li className={`flex items-center gap-2 ${/[0-9]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}`}>
                    {/[0-9]/.test(formData.password) ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    <span>At least one number</span>
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
                    <p className={`text-xs mt-1.5 font-medium ${passwordStrength.textColor || 'text-slate-600'}`}>
                      Password strength: {passwordStrength.label}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 rounded-xl ${errors.confirmPassword ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.confirmPassword}</p>
              )}
              {!errors.confirmPassword && formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Passwords match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Reset Password'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push(withInstitutionPath('/login', pathname))}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
