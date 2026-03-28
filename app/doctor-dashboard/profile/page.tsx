"use client";
import { useEffect, useState, useRef } from "react";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import {
  User,
  Mail,
  DollarSign,
  Stethoscope,
  Building2,
  Clock,
  Globe,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  Camera,
  Award,
  BookOpen,
  X,
} from "lucide-react";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

interface Profile {
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
}

const SPECS = [
  "General Practice",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
  "Pulmonology",
  "Surgery",
  "Urology",
  "Other",
];
const LANGS = [
  "English",
  "Arabic",
  "French",
  "Spanish",
  "Mandarin",
  "Portuguese",
  "German",
  "Amharic",
  "Tigrinya",
  "Other",
];

type TabKey = "info" | "practice" | "about";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tab, setTab] = useState<TabKey>("info");
  const [form, setForm] = useState({
    specialty: "",
    hospital: "",
    experience_years: 0,
    fee: 0,
    consultation_duration_mins: 15,
    languages: [] as string[],
    consultation_type: "video",
    gender: "",
    bio: "",
    profile_picture: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) return;
    setUser(u);
    fetch(`/api/doctor/profile?doctorId=${u.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.data) {
          setProfile(j.data);
          setForm({
            specialty: j.data.specialty || "",
            hospital: j.data.hospital || "",
            experience_years: j.data.experience_years || 0,
            fee: j.data.fee || 0,
            consultation_duration_mins: j.data.consultation_duration_mins || 15,
            languages: Array.isArray(j.data.languages)
              ? j.data.languages
              : ["English"],
            consultation_type: j.data.consultation_type || "video",
            gender: j.data.gender || "",
            bio: j.data.bio || "",
            profile_picture: j.data.profile_picture || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/doctor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: profile.id,
          ...form,
          experience_years: Number(form.experience_years),
          fee: Number(form.fee),
          consultation_duration_mins: Number(form.consultation_duration_mins),
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error || "Save failed");
      }
      setMsg({ ok: true, text: "Profile updated!" });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "profile-pictures");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setForm((prev) => ({ ...prev, profile_picture: data.url }));
      setMsg({ ok: true, text: "Photo uploaded — save to apply." });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading)
    return (
      <div className="space-y-4 max-w-2xl animate-pulse">
        <div className="h-44 bg-white rounded-2xl border border-slate-200" />
        <div className="h-80 bg-white rounded-2xl border border-slate-200" />
      </div>
    );

  const TABS: { k: TabKey; l: string }[] = [
    { k: "info", l: "Professional" },
    { k: "practice", l: "Practice" },
    { k: "about", l: "About" },
  ];

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-800 outline-none focus:border-blue-300 focus:bg-white transition-all";
  const labelClass =
    "block text-[10px] font-extrabold uppercase tracking-widest mb-1.5";

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-slate-900 text-[18px]">
            My Profile
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Manage your public doctor profile
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white transition-all active:scale-95 disabled:opacity-60"
          style={{ background: NAV_BG }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}{" "}
          Save
        </button>
      </div>

      {/* Toast */}
      {msg && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl text-[13px] font-semibold border ${msg.ok ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}
        >
          {msg.ok ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {msg.text}
        </div>
      )}

      {/* Profile card — LinkedIn style hero */}
      <div
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
      >
        {/* Cover */}
        <div
          className="h-24 relative"
          style={{
            background: `linear-gradient(135deg, ${NAV_BG} 0%, ${ACCENT} 60%, ${SKY} 100%)`,
          }}
        />

        {/* Avatar overlapping cover */}
        <div className="px-5 pb-4 -mt-10">
          <div
            className="relative w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-xl mb-3 cursor-pointer group"
            onClick={() => fileRef.current?.click()}
            style={{
              background: "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)",
            }}
          >
            {form.profile_picture ? (
              <img
                src={form.profile_picture}
                alt="Profile"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: NAV_BG }}
              >
                <span className="text-white font-extrabold text-2xl">
                  {user?.name?.[0]}
                </span>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileRef}
              onChange={handleImageUpload}
            />
          </div>

          <h2 className="font-extrabold text-slate-900 text-[16px] leading-tight">
            {user?.name}
          </h2>
          <p
            className="text-[12px] font-semibold mt-0.5"
            style={{ color: ACCENT }}
          >
            {form.specialty || "Doctor"}
          </p>
          {form.hospital && (
            <p className="text-[11px] text-slate-400 mt-0.5">{form.hospital}</p>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-dashed border-slate-100">
            {[
              { label: "Rating", value: profile?.rating?.toFixed(1) ?? "—" },
              { label: "Patients", value: profile?.patients_served ?? 0 },
              { label: "Reviews", value: profile?.review_count ?? 0 },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="text-center p-3 rounded-xl"
                style={{ background: "#f8fafc" }}
              >
                <p className="font-extrabold text-[16px] text-slate-900">
                  {value}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <div className="flex">
          {TABS.map(({ k, l }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className="flex-1 py-3 text-[13px] font-bold transition-all border-b-2"
              style={
                tab === k
                  ? {
                      color: NAV_BG,
                      borderBottomColor: NAV_BG,
                      background: "#eff6ff",
                    }
                  : { color: "#94a3b8", borderBottomColor: "transparent" }
              }
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Professional Info */}
      {tab === "info" && (
        <div
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "Full Name", value: user?.name, icon: User },
              { label: "Email", value: user?.email, icon: Mail },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label}>
                <p
                  className={`${labelClass} flex items-center gap-1`}
                  style={{ color: ACCENT }}
                >
                  <Icon className="w-3 h-3" /> {label}
                </p>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[13px] text-slate-600 truncate flex-1">
                    {value}
                  </p>
                  <span className="text-[9px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    Read-only
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} style={{ color: ACCENT }}>
                Specialty
              </label>
              <select
                value={form.specialty}
                onChange={(e) =>
                  setForm((p) => ({ ...p, specialty: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Select…</option>
                {SPECS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: ACCENT }}>
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gender: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label
                className={`${labelClass} flex items-center gap-1`}
                style={{ color: ACCENT }}
              >
                <Award className="w-3 h-3" /> Years Experience
              </label>
              <input
                type="number"
                value={form.experience_years}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    experience_years: parseInt(e.target.value) || 0,
                  }))
                }
                min="0"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: ACCENT }}>
                Consultation Type
              </label>
              <select
                value={form.consultation_type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, consultation_type: e.target.value }))
                }
                className={inputClass}
              >
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
        <div
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div>
            <label
              className={`${labelClass} flex items-center gap-1`}
              style={{ color: ACCENT }}
            >
              <Building2 className="w-3 h-3" /> Hospital / Clinic
            </label>
            <input
              type="text"
              value={form.hospital}
              onChange={(e) =>
                setForm((p) => ({ ...p, hospital: e.target.value }))
              }
              placeholder="e.g. MediBook Medical Center"
              className={inputClass}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                className={`${labelClass} flex items-center gap-1`}
                style={{ color: ACCENT }}
              >
                <DollarSign className="w-3 h-3" /> Fee (Birr)
              </label>
              <input
                type="number"
                value={form.fee}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    fee: parseFloat(e.target.value) || 0,
                  }))
                }
                min="0"
                step="50"
                className={inputClass}
              />
            </div>
            <div>
              <label
                className={`${labelClass} flex items-center gap-1`}
                style={{ color: ACCENT }}
              >
                <Clock className="w-3 h-3" /> Session Duration
              </label>
              <select
                value={form.consultation_duration_mins}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    consultation_duration_mins: parseInt(e.target.value),
                  }))
                }
                className={inputClass}
              >
                {[10, 15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* About & Languages */}
      {tab === "about" && (
        <div
          className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div>
            <label
              className={`${labelClass} flex items-center gap-1`}
              style={{ color: ACCENT }}
            >
              <BookOpen className="w-3 h-3" /> Professional Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              rows={5}
              placeholder="Share your background, specialties, and approach to care…"
              className={`${inputClass} resize-none leading-relaxed`}
            />
            <p className="text-[10px] text-slate-400 mt-1.5">
              Visible to patients on your public profile.
            </p>
          </div>
          <div>
            <label
              className={`${labelClass} flex items-center gap-1`}
              style={{ color: ACCENT }}
            >
              <Globe className="w-3 h-3" /> Languages Spoken
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGS.map((lang) => {
                const on = form.languages.includes(lang);
                return (
                  <button
                    key={lang}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        languages: on
                          ? p.languages.filter((l) => l !== lang)
                          : [...p.languages, lang],
                      }))
                    }
                    className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full border transition-all active:scale-95"
                    style={
                      on
                        ? {
                            background: NAV_BG,
                            color: "white",
                            borderColor: NAV_BG,
                          }
                        : {
                            background: "#f8fafc",
                            color: "#475569",
                            borderColor: "#e2e8f0",
                          }
                    }
                  >
                    <Globe className="w-3 h-3" />
                    {lang}
                    {on && <X className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Selected:{" "}
              {form.languages.length > 0 ? form.languages.join(", ") : "None"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
