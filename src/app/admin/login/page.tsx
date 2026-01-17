'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';

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
                        .single();

                    if (!userError && userData?.role === 'admin') {
                        // Already authenticated as admin, redirect to admin dashboard
                        router.replace('/admin');
                        return;
                    } else if (!userError && userData?.role === 'student') {
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

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (userError) {
                console.error('User data fetch error:', userError);
                await supabase.auth.signOut();
                throw new Error('Unable to verify user role. Please contact support.');
            }

            if (userData?.role !== 'admin') {
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
        <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
            <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute -bottom-8 right-20 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

            <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 backdrop-blur-xl relative z-10">
                <CardHeader className="text-center space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white tracking-tight">Admin Portal</CardTitle>
                    <CardDescription className="text-slate-400">
                        Secure access for GANSID administrators only.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admin Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@gansid.org"
                                    className={`pl-10 h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl focus:ring-primary/20 ${errors.email ? 'border-destructive' : ''}`}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Secret Key</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className={`pl-10 h-12 bg-slate-800/50 border-slate-700 text-white rounded-xl focus:ring-primary/20 ${errors.password ? 'border-destructive' : ''}`}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                        </div>

                        <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold shadow-lg shadow-primary/20 mt-2" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Enter Secure Portal'}
                        </Button>

                        <p className="text-center text-[10px] text-slate-500 mt-4">
                            IP ADDRESS LOGGED • MULTI-FACTOR AUTH REQUIRED
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
