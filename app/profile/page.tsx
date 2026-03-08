"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  User, Heart, Save, CheckCircle, AlertCircle, Loader2,
} from "lucide-react";
import { getUser, loadUser } from "@/lib/supabase/auth";
import { getProfile, updateProfile } from "@/lib/api";

// ── MOCK PROFILE (disabled) ───────────────────────────────────
// const MOCK_PROFILE = {
//   name: "Alex Hailu",
//   email: "alex@example.com",
//   phone: "+251 912 345 678",
//   dob: "1995-06-15",
//   bio: "Health-conscious individual looking for convenient access to quality healthcare.",
//   avatar: "https://ui-avatars.com/api/?name=Alex+Hailu&background=1B3A5C&color=fff&size=128",
//   bloodType: "O+",
//   allergies: "Penicillin",
//   emergencyContact: "+251 911 222 333",
// };
// ─────────────────────────────────────────────────────────────

type Lang = "en" | "am";

const T = {
  en: {
    title: "My Profile",
    subtitle: "Manage your personal and health information",
    personalInfo: "Personal Information",
    healthInfo: "Health Information",
    name: "Full Name", email: "Email", phone: "Phone", dob: "Date of Birth",
    bio: "About Me", bloodType: "Blood Type", allergies: "Allergies",
    emergency: "Emergency Contact", save: "Save Changes", saved: "Saved!",
    loading: "Loading profile...", error: "Could not load profile.",
  },
  am: {
    title: "መገለጫዬ",
    subtitle: "የግል እና የጤና መረጃዎን ያስተዳድሩ",
    personalInfo: "የግል መረጃ",
    healthInfo: "የጤና መረጃ",
    name: "ሙሉ ስም", email: "ኢሜይል", phone: "ስልክ", dob: "የልደት ቀን",
    bio: "ስለ እኔ", bloodType: "የደም ዓይነት", allergies: "አለርጂዎች",
    emergency: "የአደጋ ጊዜ ዕውቅያ", save: "ለውጦችን ያስቀምጡ", saved: "ተቀምጧል!",
    loading: "መገለጫ በመጫን ላይ...", error: "መገለጫ መጫን አልቻለም።",
  },
} as const;

interface ProfileState {
  name: string;
  email: string;
  phone: string;
  dob: string;
  bio: string;
  avatar: string;
  bloodType: string;
  allergies: string;
  emergencyContact: string;
}

const EMPTY_PROFILE: ProfileState = {
  name: "", email: "", phone: "", dob: "", bio: "",
  avatar: "", bloodType: "", allergies: "", emergencyContact: "",
};

export default function ProfilePage() {
  const [lang, setLang] = useState<Lang>("en");
  const [profile, setProfile] = useState<ProfileState>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = T[lang];

  // Language sync
  useEffect(() => {
    const stored = localStorage.getItem("hc-lang") as Lang | null;
    if (stored) setLang(stored);
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener("hc-lang-change", handler);
    return () => window.removeEventListener("hc-lang-change", handler);
  }, []);

  // Load real profile from Supabase on mount
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        // Ensure the auth cache is hydrated
        let user = getUser();
        if (!user) user = await loadUser();
        if (!user) { setLoading(false); return; }

        const data = await getProfile(user.id);
        setProfile({
          name:             data.name             ?? "",
          email:            data.email            ?? "",
          phone:            data.phone            ?? "",
          dob:              data.dob              ?? "",
          bio:              data.bio              ?? "",
          avatar:           data.avatar           ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name ?? "")}&background=1B3A5C&color=fff&size=128`,
          bloodType:        data.bloodType        ?? "",
          allergies:        data.allergies        ?? "",
          emergencyContact: data.emergencyContact ?? "",
        });
      } catch (err: any) {
        setError(err.message ?? t.error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();

    // Re-load if auth changes
    const handler = () => loadProfile();
    window.addEventListener("hc-auth-change", handler);
    return () => window.removeEventListener("hc-auth-change", handler);
  }, []);

  const handleSave = async () => {
    const user = getUser();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, {
        name:             profile.name,
        phone:            profile.phone,
        dob:              profile.dob,
        bio:              profile.bio,
        bloodType:        profile.bloodType,
        allergies:        profile.allergies,
        emergencyContact: profile.emergencyContact,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof ProfileState, val: string) =>
    setProfile((p) => ({ ...p, [key]: val }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <p className="text-sm text-slate-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">{t.title}</h1>
        <p className="text-slate-500 text-sm mt-1">{t.subtitle}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Avatar section */}
      <div className="card flex items-center gap-5">
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
          <Image
            src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || "U")}&background=1B3A5C&color=fff&size=128`}
            alt={profile.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg text-slate-800">{profile.name || "—"}</h2>
          <p className="text-sm text-slate-500">{profile.email}</p>
          <span className="badge-green mt-2 text-[10px]">
            <CheckCircle className="w-3 h-3" /> Verified Patient
          </span>
        </div>
      </div>

      {/* Personal Info */}
      <div className="card">
        <h3 className="font-display font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-primary-500" /> {t.personalInfo}
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.name}</label>
            <input type="text" value={profile.name} onChange={(e) => update("name", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.email}</label>
            <input type="email" value={profile.email} disabled className="input-field opacity-60 cursor-not-allowed" title="Email cannot be changed here" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.phone}</label>
            <input type="tel" value={profile.phone} onChange={(e) => update("phone", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.dob}</label>
            <input type="date" value={profile.dob} onChange={(e) => update("dob", e.target.value)} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.bio}</label>
            <textarea value={profile.bio} onChange={(e) => update("bio", e.target.value)} rows={3} className="input-field resize-none" />
          </div>
        </div>
      </div>

      {/* Health Info */}
      <div className="card">
        <h3 className="font-display font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Heart className="w-4 h-4 text-accent-500" /> {t.healthInfo}
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.bloodType}</label>
            <input type="text" value={profile.bloodType} onChange={(e) => update("bloodType", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.allergies}</label>
            <input type="text" value={profile.allergies} onChange={(e) => update("allergies", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.emergency}</label>
            <input type="tel" value={profile.emergencyContact} onChange={(e) => update("emergencyContact", e.target.value)} className="input-field" />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className={`${saved ? "btn-accent" : "btn-primary"} px-8`}>
          {saved
            ? <><CheckCircle className="w-4 h-4" /> {t.saved}</>
            : saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              : <><Save className="w-4 h-4" /> {t.save}</>
          }
        </button>
      </div>
    </div>
  );
}
