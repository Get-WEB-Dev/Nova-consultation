"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Mail, Lock, User, ArrowRight,
  Stethoscope, Heart, Shield, Eye, EyeOff,
  Loader2, AlertCircle,
} from "lucide-react";
import { signIn, signUp, getUser, loadUser } from "@/lib/supabase/auth";

type Tab = "login" | "register";
type Role = "user";
type Lang = "en" | "am";

const T = {
  en: {
    login: "Sign In", register: "Create Account",
    email: "Email Address", password: "Password", name: "Full Name",
    selectRole: "I am a...",
    roleUser: "Patient / User", roleDoctor: "Doctor", rolePro: "Health Professional",
    noAccount: "Don't have an account?", haveAccount: "Already have an account?",
    welcome: "Welcome back", join: "Join Nova Health",
    loginSub: "Sign in to access your health dashboard",
    registerSub: "Create a free account to get started",
    showPw: "Show password", hidePw: "Hide password", forgotpw: "Forgot password?",
    signingIn: "Signing in...", creatingAccount: "Creating account...",
  },
  am: {
    login: "ግባ", register: "ተመዝገብ",
    email: "ኢሜይል አድራሻ", password: "የይለፍ ቃል", name: "ሙሉ ስም",
    selectRole: "እኔ ነኝ...",
    roleUser: "ታካሚ / ተጠቃሚ", roleDoctor: "ዶክተር", rolePro: "የጤና ባለሙያ",
    noAccount: "መለያ የለዎትም?", haveAccount: "መለያ አለዎት?",
    welcome: "እንኳን ደህና መጡ", join: "Nova Health ይቀላቀሉ",
    loginSub: "የጤና ዳሽቦርድዎን ለመድረስ ይግቡ",
    registerSub: "ለመጀመር ነፃ መለያ ይፍጠሩ",
    showPw: "የይለፍ ቃል አሳይ", hidePw: "የይለፍ ቃል ደብቅ", forgotpw: "የይለፍ ቃል ረሱ?",
    signingIn: "በመግባት ላይ...", creatingAccount: "መለያ በመፍጠር ላይ...",
  },
} as const;

// Role selector removed — patient signup is only for patients.
// Doctors register via /doctor-login, admins via admin flow.

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<Lang>("en");
  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "register" ? "register" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = T[lang];

  useEffect(() => {
    // If already logged in, redirect based on role
    loadUser().then((user) => {
      if (user) {
        if (user.role === "doctor") router.replace("/doctor-dashboard");
        else if (user.role === "admin") router.replace("/admin-dashboard");
        else router.replace("/dashboard");
      }
    });
    const stored = localStorage.getItem("hc-lang") as Lang | null;
    if (stored) setLang(stored);
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener("hc-lang-change", handler);
    return () => window.removeEventListener("hc-lang-change", handler);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let loggedInUser;
      if (tab === "login") {
        loggedInUser = await signIn(email, password);
      } else {
        loggedInUser = await signUp(email, password, name || email.split("@")[0], "user");
        // New user: clear onboarding so it shows after sign up
        localStorage.removeItem("nova-onboarding-done");
      }

      // Role-based redirect: doctors and admins cannot access patient portal
      if (loggedInUser.role === "doctor") {
        router.push("/doctor-dashboard");
        return;
      }
      if (loggedInUser.role === "admin") {
        router.push("/admin-dashboard");
        return;
      }

      const redirectTo = searchParams.get("redirect") || "/dashboard";
      router.push(redirectTo);
    } catch (err: any) {
      const msg = err?.message || "Authentication failed";
      if (msg.includes("Invalid login")) {
        setError("Invalid email or password. Please try again.");
      } else if (msg.includes("User already registered")) {
        setError("An account with this email already exists. Try signing in.");
      } else if (msg.includes("Password should be")) {
        setError("Password must be at least 6 characters.");
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
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          {(["login", "register"] as Tab[]).map((t2) => (
            <button
              key={t2}
              onClick={() => { setTab(t2); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab === t2
                ? "bg-white text-primary-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {t2 === "login" ? t.login : t.register}
            </button>
          ))}
        </div>

        <div className="text-center mb-6">
          <h1 className="font-display font-bold text-xl text-slate-800">
            {tab === "login" ? t.welcome : t.join}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {tab === "login" ? t.loginSub : t.registerSub}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-fade-up">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <div className="animate-fade-up">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                <User className="w-3.5 h-3.5" /> {t.name}
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Your full name" required />
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              <Mail className="w-3.5 h-3.5" /> {t.email}
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" required />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              <Lock className="w-3.5 h-3.5" /> {t.password}
            </label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pr-10" placeholder="••••••••" required minLength={6} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {tab === "login" && (
              <div className="text-right mt-1.5">
                <button type="button" className="text-xs text-primary-600 hover:underline">{t.forgotpw}</button>
              </div>
            )}
          </div>

          {/* Role selector removed — this page only registers patients.
              Doctors register via /doctor-login, admins via admin flow. */}

          <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-base disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {tab === "login" ? t.signingIn : t.creatingAccount}
              </>
            ) : (
              <>
                {tab === "login" ? t.login : t.register}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-sm text-slate-500 text-center mt-5">
          {tab === "login" ? t.noAccount : t.haveAccount}{" "}
          <button onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(null); }} className="text-primary-600 hover:underline font-semibold">
            {tab === "login" ? t.register : t.login}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
