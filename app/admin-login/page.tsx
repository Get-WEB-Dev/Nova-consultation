"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    Mail, Lock, ArrowRight, Shield, Eye, EyeOff,
    Loader2, AlertCircle,
} from "lucide-react";
import { signIn, loadUser } from "@/lib/supabase/auth";

function AdminLoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadUser().then((user) => {
            // Check user_metadata for admin role — in the current system
            // we check the user's role from Supabase metadata
            if (user) router.replace("/admin-dashboard");
        });
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const user = await signIn(email, password);
            // Verify the user has admin role
            if (user.role !== "admin") {
                // Also check via API in case metadata is stale
                const res = await fetch(`/api/admin/verify?userId=${user.id}`);
                const json = await res.json();
                if (!json.isAdmin) {
                    setError("This account does not have admin privileges. Please use the patient or doctor login.");
                    setLoading(false);
                    return;
                }
            }
            router.push("/admin-dashboard");
        } catch (err: any) {
            setError(err?.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-nova-gradient-soft flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary-200/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-200/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

            <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-xl text-primary-600 mb-8 relative z-10">
                <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm">
                    <Image src="/favicon.png" alt="Nova Health" width={40} height={40} className="w-full h-full object-cover" />
                </div>
                Nova Health
            </Link>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-6 relative z-10">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <Shield className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="font-display font-bold text-xl text-slate-800">Admin Portal</h1>
                    <p className="text-sm text-slate-500 mt-1">Sign in to the administration panel</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-fade-up">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            <Mail className="w-3.5 h-3.5" /> Admin Email
                        </label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="admin@novahealth.com" required />
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            <Lock className="w-3.5 h-3.5" /> Password
                        </label>
                        <div className="relative">
                            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pr-10" placeholder="••••••••" required minLength={6} />
                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-slate-700 to-slate-600 text-white font-semibold px-5 py-3 rounded-xl hover:shadow-lg active:scale-[0.98] transition-all duration-200 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">
                        Not an admin?{" "}
                        <Link href="/login" className="text-primary-600 hover:underline font-semibold">
                            Patient Login
                        </Link>
                        {" · "}
                        <Link href="/doctor-login" className="text-primary-600 hover:underline font-semibold">
                            Doctor Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <AdminLoginForm />
        </Suspense>
    );
}
