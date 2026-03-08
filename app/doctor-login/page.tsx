"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    Mail, Lock, ArrowRight, Stethoscope, Eye, EyeOff,
    Loader2, AlertCircle, User, Building2, DollarSign, Clock,
} from "lucide-react";
import { signIn, signUp, loadUser } from "@/lib/supabase/auth";

type Tab = "login" | "register";

function DoctorLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<Tab>(
        searchParams.get("tab") === "register" ? "register" : "login"
    );
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [hospital, setHospital] = useState("");
    const [fee, setFee] = useState("");
    const [experience, setExperience] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadUser().then((user) => {
            if (user && user.role === "doctor") router.replace("/doctor-dashboard");
            else if (user && user.role === "admin") router.replace("/admin-dashboard");
            else if (user) router.replace("/dashboard");
        });
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (tab === "login") {
                const user = await signIn(email, password);
                if (user.role !== "doctor") {
                    setError("This account is not registered as a doctor. Please use the patient login.");
                    setLoading(false);
                    return;
                }
                router.push("/doctor-dashboard");
            } else {
                // Register as a doctor
                if (!name.trim()) {
                    setError("Full name is required.");
                    setLoading(false);
                    return;
                }
                if (!specialty.trim()) {
                    setError("Specialty is required.");
                    setLoading(false);
                    return;
                }

                // Use the signUp function which calls /api/auth/signup
                // We need to pass doctor-specific fields via a custom fetch
                const res = await fetch("/api/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email,
                        password,
                        name: name.trim(),
                        role: "doctor",
                        specialty: specialty.trim(),
                        hospital: hospital.trim() || null,
                        fee: fee ? parseFloat(fee) : 0,
                        experience_years: experience ? parseInt(experience) : 0,
                    }),
                });

                const json = await res.json();
                if (!res.ok) {
                    throw new Error(json.error ?? "Sign up failed.");
                }

                // Now sign in to establish the session
                const user = await signIn(email, password);
                if (user.role !== "doctor") {
                    setError("Account created but role mismatch. Please contact support.");
                    setLoading(false);
                    return;
                }
                router.push("/doctor-dashboard");
            }
        } catch (err: any) {
            const msg = err?.message || "Authentication failed";
            if (msg.includes("already exists") || msg.includes("already registered")) {
                setError("An account with this email already exists. Try signing in.");
            } else {
                setError(msg);
            }
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
                {/* Tab switcher */}
                <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
                    {(["login", "register"] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setError(null); }}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === t
                                ? "bg-white text-primary-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {t === "login" ? "Sign In" : "Register"}
                        </button>
                    ))}
                </div>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <Stethoscope className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="font-display font-bold text-xl text-slate-800">Doctor Portal</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {tab === "login"
                            ? "Sign in to access your doctor dashboard"
                            : "Register as a new doctor on Nova Health"}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-fade-up">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name — register only */}
                    {tab === "register" && (
                        <div className="animate-fade-up">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                <User className="w-3.5 h-3.5" /> Full Name
                            </label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Dr. John Smith" required />
                        </div>
                    )}

                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            <Mail className="w-3.5 h-3.5" /> Email Address
                        </label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="doctor@example.com" required />
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

                    {/* Doctor-specific fields — register only */}
                    {tab === "register" && (
                        <>
                            <div className="animate-fade-up">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    <Stethoscope className="w-3.5 h-3.5" /> Specialty
                                </label>
                                <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="input-field" placeholder="e.g. Cardiologist, General Practitioner" required />
                            </div>

                            <div className="grid grid-cols-2 gap-3 animate-fade-up">
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                        <Building2 className="w-3.5 h-3.5" /> Hospital
                                    </label>
                                    <input type="text" value={hospital} onChange={(e) => setHospital(e.target.value)} className="input-field" placeholder="Hospital name" />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                        <Clock className="w-3.5 h-3.5" /> Experience (yrs)
                                    </label>
                                    <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} className="input-field" placeholder="0" min="0" />
                                </div>
                            </div>

                            <div className="animate-fade-up">
                                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    <DollarSign className="w-3.5 h-3.5" /> Consultation Fee ($)
                                </label>
                                <input type="number" value={fee} onChange={(e) => setFee(e.target.value)} className="input-field" placeholder="0.00" min="0" step="0.01" />
                            </div>
                        </>
                    )}

                    <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {tab === "login" ? "Signing in..." : "Creating account..."}
                            </>
                        ) : (
                            <>
                                {tab === "login" ? "Sign In" : "Create Doctor Account"}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">
                        Not a doctor?{" "}
                        <Link href="/login" className="text-primary-600 hover:underline font-semibold">
                            Patient Login
                        </Link>
                        {" · "}
                        <Link href="/admin-login" className="text-primary-600 hover:underline font-semibold">
                            Admin Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function DoctorLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <DoctorLoginForm />
        </Suspense>
    );
}
