"use client";

import { useEffect, useState } from "react";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import {
    User, Mail, DollarSign, Stethoscope, Building2, Clock, Globe, Loader2, Save,
    CheckCircle2, AlertCircle, Camera, Award, Star, BookOpen, X, Edit3, TrendingUp,
} from "lucide-react";

interface Profile { id: string; specialty: string; status: string; fee: number; patients_served: number; rating: number; review_count: number; consultation_duration_mins: number; hospital: string | null; experience_years: number; languages: string[]; gender: string | null; consultation_type: string; slug: string | null; }

const SPECS = ["General Practice","Cardiology","Dermatology","Endocrinology","Gastroenterology","Neurology","Oncology","Orthopedics","Pediatrics","Psychiatry","Pulmonology","Surgery","Urology","Other"];
const LANGS = ["English","Arabic","French","Spanish","Mandarin","Portuguese","German","Amharic","Tigrinya","Other"];

export default function ProfilePage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [tab, setTab] = useState<"info" | "practice" | "about">("info");
    const [form, setForm] = useState({
        specialty: "", hospital: "", experience_years: 0, fee: 0,
        consultation_duration_mins: 15, languages: [] as string[],
        consultation_type: "video", gender: "", bio: "",
    });

    useEffect(() => {
        const u = getUser();
        if (!u) return;
        setUser(u);
        fetch(`/api/doctor/profile?doctorId=${u.id}`).then(r => r.json()).then(j => {
            if (j.data) {
                setProfile(j.data);
                setForm({ specialty: j.data.specialty || "", hospital: j.data.hospital || "", experience_years: j.data.experience_years || 0, fee: j.data.fee || 0, consultation_duration_mins: j.data.consultation_duration_mins || 15, languages: Array.isArray(j.data.languages) ? j.data.languages : ["English"], consultation_type: j.data.consultation_type || "video", gender: j.data.gender || "", bio: j.data.bio || "" });
            }
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const save = async () => {
        if (!profile) return;
        setSaving(true); setMsg(null);
        try {
            const res = await fetch("/api/doctor/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctorId: profile.id, specialty: form.specialty, hospital: form.hospital, experience_years: Number(form.experience_years), fee: Number(form.fee), consultation_duration_mins: Number(form.consultation_duration_mins), languages: form.languages, consultation_type: form.consultation_type, gender: form.gender }) });
            if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Save failed"); }
            setMsg({ ok: true, text: "Profile updated!" });
        } catch (e: any) { setMsg({ ok: false, text: e.message }); }
        finally { setSaving(false); setTimeout(() => setMsg(null), 4000); }
    };

    if (loading) return (
        <div className="space-y-4 animate-pulse max-w-2xl">
            <div className="h-44 bg-slate-200 rounded-3xl" />
            <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-up max-w-2xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-display font-bold text-xl text-slate-800">My Profile</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Manage your public doctor profile</p>
                </div>
                <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-2 flex-shrink-0">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
            </div>

            {msg && (
                <div className={`flex items-center gap-2 p-3.5 rounded-2xl text-sm font-medium ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {msg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    {msg.text}
                </div>
            )}

            {/* Profile hero */}
            <div className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 rounded-3xl p-5 overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
                <div className="relative flex items-center gap-4">
                    <div className="relative group flex-shrink-0">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center border-2 border-white/30">
                            <span className="text-white font-bold text-2xl">{user?.name?.[0]}</span>
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-display font-bold text-white text-lg leading-tight">{user?.name}</h2>
                        <p className="text-primary-200 text-sm">{form.specialty || "Doctor"}</p>
                        <p className="text-primary-200 text-xs mt-1">{form.hospital || "Nova Health"}</p>
                    </div>
                </div>
                <div className="relative grid grid-cols-3 gap-2 mt-4">
                    {[
                        { label: "Rating", value: profile?.rating?.toFixed(1) || "—" },
                        { label: "Patients", value: profile?.patients_served || 0 },
                        { label: "Reviews", value: profile?.review_count || 0 },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-white/15 rounded-xl p-2.5 text-center">
                            <p className="font-bold text-white text-base leading-none">{value}</p>
                            <p className="text-primary-200 text-[10px] mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {[{ k: "info", l: "Professional" }, { k: "practice", l: "Practice" }, { k: "about", l: "About & Languages" }].map(({ k, l }) => (
                    <button key={k} onClick={() => setTab(k as any)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === k ? "bg-white text-primary-700 shadow-sm" : "text-slate-500"}`}>{l}</button>
                ))}
            </div>

            {/* Professional Info */}
            {tab === "info" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 animate-fade-up">
                    {/* Read-only */}
                    <div className="grid sm:grid-cols-2 gap-3">
                        {[
                            { label: "Full Name", value: user?.name, icon: User },
                            { label: "Email", value: user?.email, icon: Mail },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label}>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                                    <p className="text-sm text-slate-600 truncate flex-1">{value}</p>
                                    <span className="text-[9px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full flex-shrink-0">Read-only</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Specialty</label>
                            <select value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} className="input-field text-sm">
                                <option value="">Select...</option>
                                {SPECS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Gender</label>
                            <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} className="input-field text-sm">
                                <option value="">Prefer not to say</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block flex items-center gap-1"><Award className="w-3 h-3" /> Years Experience</label>
                            <input type="number" value={form.experience_years} onChange={e => setForm(p => ({ ...p, experience_years: parseInt(e.target.value) || 0 }))} min="0" className="input-field text-sm" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block">Consultation Type</label>
                            <select value={form.consultation_type} onChange={e => setForm(p => ({ ...p, consultation_type: e.target.value }))} className="input-field text-sm">
                                <option value="video">Video</option>
                                <option value="in-person">In-Person</option>
                                <option value="both">Both</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Practice */}
            {tab === "practice" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 animate-fade-up">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block flex items-center gap-1"><Building2 className="w-3 h-3" /> Hospital / Clinic</label>
                        <input type="text" value={form.hospital} onChange={e => setForm(p => ({ ...p, hospital: e.target.value }))} placeholder="e.g. Nova Health Medical Center" className="input-field text-sm" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block flex items-center gap-1"><DollarSign className="w-3 h-3" /> Fee (USD)</label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">$</span>
                                <input type="number" value={form.fee} onChange={e => setForm(p => ({ ...p, fee: parseFloat(e.target.value) || 0 }))} min="0" step="5" className="input-field text-sm pl-8" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block flex items-center gap-1"><Clock className="w-3 h-3" /> Session Duration</label>
                            <select value={form.consultation_duration_mins} onChange={e => setForm(p => ({ ...p, consultation_duration_mins: parseInt(e.target.value) }))} className="input-field text-sm">
                                {[10,15,20,30,45,60].map(m => <option key={m} value={m}>{m} minutes</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Stats (read-only) */}
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                        {[
                            { label: "Patients Served", value: profile?.patients_served || 0 },
                            { label: "Rating", value: profile?.rating?.toFixed(1) || "—" },
                            { label: "Reviews", value: profile?.review_count || 0 },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                                <p className="font-bold text-slate-800 text-lg">{value}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* About & Languages */}
            {tab === "about" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 animate-fade-up">
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 block flex items-center gap-1"><BookOpen className="w-3 h-3" /> Professional Bio</label>
                        <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                            rows={5} placeholder="Share your background, specialties, and approach to care..."
                            className="input-field text-sm resize-none leading-relaxed" />
                        <p className="text-[10px] text-slate-400 mt-1.5">Visible to patients on your public profile.</p>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 block flex items-center gap-1"><Globe className="w-3 h-3" /> Languages Spoken</label>
                        <div className="flex flex-wrap gap-2">
                            {LANGS.map(lang => {
                                const on = form.languages.includes(lang);
                                return (
                                    <button key={lang} onClick={() => setForm(p => ({ ...p, languages: on ? p.languages.filter(l => l !== lang) : [...p.languages, lang] }))}
                                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${on ? "bg-primary-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                        <Globe className="w-3 h-3" />{lang}
                                        {on && <X className="w-3 h-3 ml-0.5" />}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">Selected: {form.languages.length > 0 ? form.languages.join(", ") : "None"}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
