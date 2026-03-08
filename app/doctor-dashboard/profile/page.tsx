"use client";

import { useEffect, useState, useRef } from "react";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import {
    User, Mail, DollarSign, Stethoscope, Building2, Clock,
    Globe, Loader2, Save, CheckCircle2, AlertCircle, Camera,
    Award, Star, BookOpen, MapPin, Phone, Edit3, X,
} from "lucide-react";

interface DoctorProfile {
    id: string;
    specialty: string;
    status: string;
    fee: number;
    patients_served: number;
    rating: number;
    review_count: number;
    consultation_duration_mins: number;
    hospital: string | null;
    experience_years: number;
    languages: string[];
    gender: string | null;
    consultation_type: string;
    slug: string | null;
    bio?: string;
}

const SPECIALTIES = [
    "General Practice", "Cardiology", "Dermatology", "Endocrinology",
    "Gastroenterology", "Neurology", "Oncology", "Orthopedics",
    "Pediatrics", "Psychiatry", "Pulmonology", "Radiology",
    "Rheumatology", "Surgery", "Urology", "Other",
];

const LANGUAGES = ["English", "Spanish", "French", "Arabic", "Mandarin", "Portuguese", "German", "Italian", "Other"];

export default function DoctorProfilePage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<DoctorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeSection, setActiveSection] = useState<"professional" | "practice" | "bio">("professional");

    const [formData, setFormData] = useState({
        specialty: "",
        hospital: "",
        experience_years: 0,
        fee: 0,
        consultation_duration_mins: 15,
        languages: [] as string[],
        consultation_type: "video",
        bio: "",
        gender: "",
    });

    const [langInput, setLangInput] = useState("");

    useEffect(() => {
        const u = getUser();
        if (!u) return;
        setUser(u);

        fetch(`/api/doctor/profile?doctorId=${u.id}`)
            .then(r => r.json())
            .then(json => {
                if (json.data) {
                    setProfile(json.data);
                    setFormData({
                        specialty: json.data.specialty || "",
                        hospital: json.data.hospital || "",
                        experience_years: json.data.experience_years || 0,
                        fee: json.data.fee || 0,
                        consultation_duration_mins: json.data.consultation_duration_mins || 15,
                        languages: Array.isArray(json.data.languages) ? json.data.languages : ["English"],
                        consultation_type: json.data.consultation_type || "video",
                        bio: json.data.bio || "",
                        gender: json.data.gender || "",
                    });
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleLanguage = (lang: string) => {
        setFormData(prev => ({
            ...prev,
            languages: prev.languages.includes(lang)
                ? prev.languages.filter(l => l !== lang)
                : [...prev.languages, lang],
        }));
    };

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        setMessage(null);

        try {
            const res = await fetch("/api/doctor/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doctorId: profile.id,
                    specialty: formData.specialty,
                    hospital: formData.hospital,
                    experience_years: Number(formData.experience_years),
                    fee: Number(formData.fee),
                    consultation_duration_mins: Number(formData.consultation_duration_mins),
                    languages: formData.languages,
                    consultation_type: formData.consultation_type,
                    gender: formData.gender,
                }),
            });

            if (!res.ok) throw new Error("Failed to save profile");
            setMessage({ type: "success", text: "Profile updated successfully!" });
        } catch (err: any) {
            setMessage({ type: "error", text: err.message || "An error occurred" });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 4000);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl">
                <div className="h-8 bg-slate-200 rounded-xl w-48 animate-pulse" />
                <div className="h-48 bg-slate-200 rounded-2xl animate-pulse" />
                <div className="h-96 bg-slate-200 rounded-2xl animate-pulse" />
            </div>
        );
    }

    const sections = [
        { key: "professional", label: "Professional Details", icon: Stethoscope },
        { key: "practice", label: "Practice Info", icon: Building2 },
        { key: "bio", label: "About & Languages", icon: BookOpen },
    ] as const;

    return (
        <div className="space-y-6 animate-fade-up max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-display font-bold text-2xl text-slate-800">My Profile</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your professional information and public profile</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="btn-primary flex items-center gap-2 flex-shrink-0">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            {/* Status message */}
            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium
                    ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {message.type === "success"
                        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    {message.text}
                </div>
            )}

            {/* Profile hero card */}
            <div className="card bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-24 translate-x-12" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
                    {/* Avatar */}
                    <div className="relative group flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                            <span className="text-white font-bold text-3xl">{user?.name?.[0] || "D"}</span>
                        </div>
                        <div className="absolute inset-0 rounded-2xl bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0">
                        <h2 className="font-display font-bold text-xl text-white">{user?.name || "Doctor"}</h2>
                        <p className="text-primary-200 mt-0.5">{formData.specialty || "General Practitioner"}</p>
                        <p className="text-primary-200 text-sm mt-1 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            {formData.hospital || "Nova Health Clinic"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1 text-xs">
                                <Award className="w-3.5 h-3.5" />
                                {formData.experience_years} yrs experience
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1 text-xs">
                                <Star className="w-3.5 h-3.5 fill-gold-300 text-gold-300" />
                                {profile?.rating?.toFixed(1) || "N/A"} ({profile?.review_count || 0} reviews)
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1 text-xs">
                                <DollarSign className="w-3.5 h-3.5" />
                                ${formData.fee} / session
                            </div>
                        </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                        <p className="text-primary-200 text-xs mb-1">Email</p>
                        <p className="text-sm text-white">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Section tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {sections.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setActiveSection(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center
                            ${activeSection === key ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{label}</span>
                    </button>
                ))}
            </div>

            {/* Professional Details */}
            {activeSection === "professional" && (
                <div className="card space-y-5 animate-fade-up">
                    <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-primary-500" />
                        Professional Details
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-5">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Full Name</label>
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <User className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">{user?.name}</span>
                                <span className="ml-auto text-[10px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">Read-only</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Email</label>
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600 truncate">{user?.email}</span>
                                <span className="ml-auto text-[10px] text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full flex-shrink-0">Read-only</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" /> Medical Specialty
                            </label>
                            <select name="specialty" value={formData.specialty} onChange={handleChange} className="input-field">
                                <option value="">Select specialty...</option>
                                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                                Gender
                            </label>
                            <select name="gender" value={formData.gender} onChange={handleChange} className="input-field">
                                <option value="">Prefer not to say</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                                Years of Experience
                            </label>
                            <input type="number" name="experience_years" value={formData.experience_years}
                                onChange={handleChange} min="0" max="60" className="input-field"
                                placeholder="e.g. 10" />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                                Consultation Type
                            </label>
                            <select name="consultation_type" value={formData.consultation_type} onChange={handleChange} className="input-field">
                                <option value="video">Video Only</option>
                                <option value="in-person">In-Person Only</option>
                                <option value="both">Both</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Practice Info */}
            {activeSection === "practice" && (
                <div className="card space-y-5 animate-fade-up">
                    <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary-500" />
                        Practice Information
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                                Hospital / Clinic Name
                            </label>
                            <input type="text" name="hospital" value={formData.hospital}
                                onChange={handleChange} className="input-field"
                                placeholder="e.g. Nova Health Medical Center" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Consultation Fee (USD)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">$</span>
                                <input type="number" name="fee" value={formData.fee}
                                    onChange={handleChange} min="0" step="5" className="input-field pl-8"
                                    placeholder="0" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Session Duration (minutes)
                            </label>
                            <select name="consultation_duration_mins" value={formData.consultation_duration_mins}
                                onChange={handleChange} className="input-field">
                                {[10, 15, 20, 30, 45, 60].map(m => (
                                    <option key={m} value={m}>{m} minutes</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Stats (read-only) */}
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="font-display font-bold text-xl text-slate-800">{profile?.patients_served || 0}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Patients served</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="font-display font-bold text-xl text-slate-800">{profile?.rating?.toFixed(1) || "—"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Average rating</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3 text-center">
                            <p className="font-display font-bold text-xl text-slate-800">{profile?.review_count || 0}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Total reviews</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Bio & Languages */}
            {activeSection === "bio" && (
                <div className="card space-y-5 animate-fade-up">
                    <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary-500" />
                        About & Languages
                    </h2>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                            Professional Bio
                        </label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows={5}
                            className="input-field resize-none"
                            placeholder="Share your professional background, areas of expertise, and approach to patient care..."
                        />
                        <p className="text-xs text-slate-400 mt-1.5">This will be visible to patients on your profile page.</p>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">
                            Languages Spoken
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {LANGUAGES.map(lang => (
                                <button key={lang} onClick={() => toggleLanguage(lang)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all
                                        ${formData.languages.includes(lang)
                                            ? "bg-primary-600 text-white shadow-sm"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                    <Globe className="w-3.5 h-3.5" />
                                    {lang}
                                    {formData.languages.includes(lang) && <X className="w-3 h-3 ml-0.5" />}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            Selected: {formData.languages.length > 0 ? formData.languages.join(", ") : "None selected"}
                        </p>
                    </div>
                </div>
            )}

            {/* Save button bottom */}
            <div className="flex justify-end pb-4">
                <button onClick={handleSave} disabled={saving}
                    className="btn-primary flex items-center gap-2 px-8">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save All Changes
                </button>
            </div>
        </div>
    );
}
