'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { Lock, Mail, Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { PublicNav } from '@/components/public-nav';

const adminSignInSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function AdminLoginPage() {
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Check if user is already authenticated and is an admin
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                    const { data: userData, error: userError } = await supabase
                        .from('users')
                        .select('role')
                        .eq('id', user.id)
                        .maybeSingle();

                    const { data: emailData } = user.email
                        ? await supabase
                            .from('users')
                            .select('role')
                            .eq('email', user.email)
                            .maybeSingle()
                        : { data: null };

                    const rawRole =
                        userData?.role ||
                        emailData?.role ||
                        user.user_metadata?.role ||
                        user.app_metadata?.role;
                    const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : rawRole;

                    if (!userError && role === 'admin') {
                        // Already authenticated as admin, redirect to admin dashboard
                        router.replace('/admin');
                        return;
                    } else if (!userError && role && role !== 'admin') {
                        // User is a student, sign them out and show error
                        await supabase.auth.signOut();
                        toast.error('Access Denied', {
                            description: 'This portal is restricted to administrators only.',
                        });
                    }
                }
            } catch (error) {
                // Silently handle error, allow login page to show
                console.error('Auth check error:', error);
            } finally {
                setCheckingAuth(false);
            }
        };

        checkAuth();
    }, [router, supabase]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            adminSignInSchema.parse(formData);
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
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) {
                // Handle specific error cases
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password. Please check your credentials.');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Please verify your email address before signing in.');
                }
                throw error;
            }

            if (!data.user) {
                throw new Error('Authentication failed. Please try again.');
            }

            let userData = null as { role?: string } | null;
            let userError = null as any;

            const profileResult = await supabase
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .maybeSingle();

            userData = profileResult.data;
            userError = profileResult.error;

            const metaRole =
                data.user.user_metadata?.role ||
                data.user.app_metadata?.role;

            const { data: emailProfile } = data.user.email
                ? await supabase
                    .from('users')
                    .select('role')
                    .eq('email', data.user.email)
                    .maybeSingle()
                : { data: null };

            // If profile doesn't exist, try to create it from metadata
            if ((userError || !userData) && !emailProfile) {
                const { error: createError } = await supabase
                    .from('users')
                    .insert([{
                        id: data.user.id,
                        email: data.user.email || formData.email.trim().toLowerCase(),
                        role: metaRole || 'student',
                    }]);

                if (createError) {
                    if (createError.code === '23505') {
                        const { data: retryData } = await supabase
                            .from('users')
                            .select('role')
                            .eq('id', data.user.id)
                            .single();
                        userData = retryData;
                    } else {
                        console.error('User profile creation error:', createError);
                    }
                } else {
                    userData = { role: metaRole || 'student' };
                }
            }

            const rawFinalRole = userData?.role || emailProfile?.role || metaRole;
            const finalRole = typeof rawFinalRole === 'string' ? rawFinalRole.trim().toLowerCase() : rawFinalRole;

            if (finalRole !== 'admin') {
                await supabase.auth.signOut();
                toast.error('Access Denied', {
                    description: 'This portal is restricted to administrators only.',
                });
                setLoading(false);
                return;
            }

            toast.success('Access Granted', {
                description: 'Welcome to the admin dashboard.',
            });

            // Use replace instead of push to avoid back button issues
            router.replace('/admin');
        } catch (err: any) {
            toast.error('Authentication Failed', {
                description: err.message || 'Please check your admin credentials and try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    // Show loading state while checking authentication
    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-slate-400">Checking authentication...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col selection:bg-red-100 selection:text-red-900">
            <PublicNav transparentInitially={false} />
            
            <div className="flex-1 flex items-center justify-center bg-white relative overflow-hidden pt-20">
                {/* Dynamic Background Elements - matching Home Page */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-50 rounded-full blur-[120px] opacity-60" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[120px] opacity-60" />
            </div>

            <Card className="w-full max-w-md bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] rounded-[3rem] relative z-10 overflow-hidden">
                <CardHeader className="text-center space-y-1 pt-12 pb-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#991B1B] to-[#DC2626] rounded-3xl flex items-center justify-center border border-white/30 shadow-xl shadow-red-100 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                            <ShieldCheck className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Admin Portal</CardTitle>
                    <CardDescription className="text-slate-500 font-medium">
                        Secure faculty access for GANSID administrators.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-10 pb-12">
                    <form onSubmit={handleSignIn} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400">Admin Email</Label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@gansid.org"
                                    className={`pl-12 h-14 bg-white/60 border-slate-200 rounded-2xl focus:ring-blue-100 focus:border-[#2563EB] transition-all font-medium ${errors.email ? 'border-red-500' : ''}`}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-red-500 mt-1 font-bold">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-slate-400">Secret Key</Label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#DC2626] transition-colors" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className={`pl-12 pr-12 h-14 bg-white/60 border-slate-200 rounded-2xl focus:ring-blue-100 focus:border-[#DC2626] transition-all font-medium ${errors.password ? 'border-red-500' : ''}`}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 mt-1 font-bold">{errors.password}</p>}
                        </div>

                        <Button type="submit" className="w-full h-14 rounded-2xl text-md font-black uppercase tracking-widest bg-gradient-to-r from-[#991B1B] to-[#DC2626] hover:opacity-90 shadow-xl shadow-red-100 mt-2 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Enter Secure Portal'}
                        </Button>

                        <div className="pt-4 text-center">
                            <Link href="/login" className="text-xs font-bold text-slate-400 hover:text-[#2563EB] transition-colors">
                                Return to Student Portal
                            </Link>
                        </div>

                        <p className="text-center text-[10px] font-black text-slate-300 mt-6 uppercase tracking-[0.2em]">
                            IP ADDRESS LOGGED • SECURE SESSION
                        </p>
                    </form>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}
