"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
    Mail, Lock, ArrowRight, Stethoscope, Eye, EyeOff,
    Loader2, AlertCircle, User, Building2, DollarSign, Clock,
    Camera, CheckCircle2, Globe, BookOpen,
} from "lucide-react";
import { signIn, loadUser } from "@/lib/supabase/auth";

const SPECS = ["General Practice", "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology", "Neurology", "Oncology", "Orthopedics", "Pediatrics", "Psychiatry", "Surgery", "Urology", "Other"];

type Tab = "login" | "register";

function DoctorLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "register" ? "register" : "login");
    const [step, setStep] = useState(1); // registration has 2 steps

    // Shared
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Register step 1
    const [name, setName] = useState("");
    const [specialty, setSpecialty] = useState("");
    const [hospital, setHospital] = useState("");
    const [experience, setExperience] = useState("");
    const [fee, setFee] = useState("");

    // Register step 2
    const [bio, setBio] = useState("");
    const [languages, setLanguages] = useState(["English"]);
    const [profilePicture, setProfilePicture] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadUser().then(u => {
            if (!u) return;
            if (u.role === "doctor") router.replace("/doctor-dashboard");
            else if (u.role === "admin") router.replace("/admin-dashboard");
            else router.replace("/dashboard");
        });
    }, [router]);

    const handleLogin = async () => {
        if (!email || !password) { setError("Email and password are required."); return; }
        setLoading(true); setError(null);
        try {
            const u = await signIn(email, password);
            if (u.role !== "doctor") { setError("This account is not a doctor account. Please use the patient login."); return; }
            router.push("/doctor-dashboard");
        } catch (e: any) { setError(e.message || "Sign in failed."); }
        finally { setLoading(false); }
    };

    const handleRegisterStep1 = () => {
        if (!name.trim()) { setError("Full name is required."); return; }
        if (!specialty) { setError("Please select your specialty."); return; }
        if (!email.trim()) { setError("Email is required."); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        setError(null); setStep(2);
    };

    const handleRegister = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name: name.trim(), role: "doctor", specialty, hospital: hospital || null, fee: fee ? parseFloat(fee) : 0, experience_years: experience ? parseInt(experience) : 0, languages, profile_picture: profilePicture }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Sign up failed.");
            const u = await signIn(email, password);
            if (u.role !== "doctor") throw new Error("Role mismatch.");
            router.push("/doctor-dashboard");
        } catch (e: any) { setError(e.message || "Registration failed."); }
        finally { setLoading(false); }
    };

    const LANG_OPTIONS = ["English", "Arabic", "French", "Spanish", "Mandarin", "Portuguese", "German", "Amharic"];
    const toggleLang = (l: string) => setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImage(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("bucket", "profile-pictures"); // Or just leave empty for default
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (!res.ok) throw new Error("Image upload failed.");
            const data = await res.json();
            setProfilePicture(data.url);
        } catch (e: any) {
            setError(e.message || "Upload error");
        } finally {
            setUploadingImage(false);
            e.target.value = "";
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50/40 flex flex-col">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-4 max-w-md mx-auto w-full">
                <Link href="/" className="flex items-center gap-2 font-display font-bold text-primary-600">
                    <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm"><Image src="/favicon.png" alt="Nova" width={32} height={32} /></div>
                    Nova Health
                </Link>
                <Link href="/login" className="text-xs font-medium text-slate-500 hover:text-primary-600">Patient Login</Link>
            </div>

            <div className="flex-1 flex items-center justify-center px-5 py-6">
                <div className="w-full max-w-md">
                    {/* Hero */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-600/25">
                            <Stethoscope className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="font-display font-bold text-2xl text-slate-900">Doctor Portal</h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {tab === "login" ? "Welcome back, Doctor" : step === 1 ? "Join Nova Health as a Doctor" : "Almost there — tell us more"}
                        </p>
                    </div>

                    {/* Tab switcher */}
                    <div className="flex bg-slate-100 rounded-2xl p-1 mb-6 shadow-inner">
                        {(["login", "register"] as Tab[]).map(t => (
                            <button key={t} onClick={() => { setTab(t); setError(null); setStep(1); }}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${tab === t ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                {t === "login" ? "Sign In" : "Register"}
                            </button>
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 p-3.5 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 space-y-4">
                        {/* LOGIN */}
                        {tab === "login" && (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="doctor@example.com" onKeyDown={e => e.key === "Enter" && handleLogin()}
                                            className="input-field pl-10" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()}
                                            className="input-field pl-10 pr-10" />
                                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <button onClick={handleLogin} disabled={loading}
                                    className="w-full btn-primary py-3 text-sm disabled:opacity-60 mt-2">
                                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </>
                        )}

                        {/* REGISTER STEP 1 */}
                        {tab === "register" && step === 1 && (
                            <>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Full Name *</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Smith" className="input-field pl-10" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Specialty *</label>
                                    <div className="relative">
                                        <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select value={specialty} onChange={e => setSpecialty(e.target.value)} className="input-field pl-10 appearance-none bg-white">
                                            <option value="">Select specialty...</option>
                                            {SPECS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Email *</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="doctor@hospital.com" className="input-field pl-10" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Password *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="min. 6 characters" className="input-field pl-10 pr-10" />
                                        <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1"><Building2 className="w-3 h-3" /> Hospital</label>
                                        <input type="text" value={hospital} onChange={e => setHospital(e.target.value)} placeholder="Hospital name" className="input-field text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1"><Clock className="w-3 h-3" /> Exp. (yrs)</label>
                                        <input type="number" value={experience} onChange={e => setExperience(e.target.value)} placeholder="0" min="0" className="input-field text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1"><DollarSign className="w-3 h-3" /> Consultation Fee ($)</label>
                                    <input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0.00" min="0" step="5" className="input-field" />
                                </div>
                                <button onClick={handleRegisterStep1} className="w-full btn-primary py-3 text-sm">
                                    Continue <ArrowRight className="w-4 h-4" />
                                </button>
                            </>
                        )}

                        {/* REGISTER STEP 2 */}
                        {tab === "register" && step === 2 && (
                            <>
                                <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl mb-4">
                                    <CheckCircle2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
                                    <p className="text-xs font-medium text-primary-700">Basic info saved. Add more to boost your profile.</p>
                                </div>
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1"><Camera className="w-3 h-3" /> Profile Picture</label>
                                    <div className="flex flex-col items-center gap-3">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 hover:border-primary-400 hover:bg-slate-50 cursor-pointer transition-all relative group"
                                        >
                                            {profilePicture ? (
                                                <Image src={profilePicture} alt="Profile preview" fill className="object-cover" />
                                            ) : (
                                                uploadingImage ? <Loader2 className="w-6 h-6 animate-spin text-primary-500" /> : <Camera className="w-6 h-6 text-slate-400 group-hover:text-primary-500 transition-colors" />
                                            )}
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                        <p className="text-xs text-slate-400 text-center">Click to upload your profile picture</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1"><BookOpen className="w-3 h-3" /> Bio (optional)</label>
                                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell patients about your expertise, approach, and what makes you unique..."
                                        className="input-field text-sm resize-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1"><Globe className="w-3 h-3" /> Languages</label>
                                    <div className="flex flex-wrap gap-2">
                                        {LANG_OPTIONS.map(l => (
                                            <button key={l} onClick={() => toggleLang(l)} type="button"
                                                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${languages.includes(l) ? "bg-primary-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => setStep(1)} className="flex-1 btn-secondary py-3 text-sm">Back</button>
                                    <button onClick={handleRegister} disabled={loading || uploadingImage} className="flex-1 btn-primary py-3 text-sm disabled:opacity-60">
                                        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center mt-2">You can update these anytime from your profile.</p>
                            </>
                        )}
                    </div>

                    {/* Step indicator for register */}
                    {tab === "register" && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                            {[1, 2].map(s => (
                                <div key={s} className={`h-1.5 rounded-full transition-all ${s <= step ? "bg-primary-600 w-8" : "bg-slate-200 w-4"}`} />
                            ))}
                        </div>
                    )}

                    <p className="text-center text-xs text-slate-400 mt-5">
                        Not a doctor?{" "}
                        <Link href="/login" className="text-primary-600 font-semibold hover:underline">Patient Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function DoctorLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>}>
            <DoctorLoginForm />
        </Suspense>
    );
}
