"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  User, Shield, Heart, Phone, Calendar, Mail,
  Check, AlertCircle, Loader2, Edit3, Save, X,
} from "lucide-react";
import { getUser, loadUser } from "@/lib/supabase/auth";
import { getProfile, updateProfile } from "@/lib/api";

type Tab = "info" | "health";

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("info");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", email: "", phone: "", dob: "", bio: "",
    bloodType: "", allergies: "", emergencyContact: "",
    avatar: "",
  });

  useEffect(() => {
    (async () => {
      let u = getUser(); if (!u) u = await loadUser();
      if (!u) { setLoading(false); return; }
      try {
        const p = await getProfile(u.id);
        if (p) setForm({ name: p.name ?? "", email: p.email ?? "", phone: p.phone ?? "", dob: p.dob ?? "", bio: p.bio ?? "", bloodType: p.bloodType ?? "", allergies: p.allergies ?? "", emergencyContact: p.emergencyContact ?? "", avatar: p.avatar ?? "" });
      } catch { }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      let u = getUser(); if (!u) u = await loadUser(); if (!u) return;
      await updateProfile(u.id, form);
      setSaved(true); setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Failed to save. Please try again."); }
    setSaving(false);
  };

  const F = ({ label, name, type = "text", placeholder = "" }: { label: string; name: keyof typeof form; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      {editing ? (
        <input type={type} value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          placeholder={placeholder} className="input-field" />
      ) : (
        <p className="text-sm text-slate-700 py-2.5 px-0 border-b border-slate-100">
          {form[name] || <span className="text-slate-300 italic">Not set</span>}
        </p>
      )}
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-up pb-safe">

      {/* Profile header card */}
      <div className="glass-card overflow-hidden">
        <div className="h-24 animate-gradient-shift" style={{ background: 'linear-gradient(135deg, #1a3558 0%, #1e5080 40%, #0cbcad 80%, #14b892 100%)', backgroundSize: '200% 200%' }} />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-primary-100 ring-4 ring-white/50">
              {form.avatar ? (
                <Image src={form.avatar} alt={form.name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-primary-700 font-display font-bold text-2xl uppercase">{form.name?.[0] || "P"}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mb-1">
              {saved && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl font-semibold animate-fade-in">
                  <Check className="w-3.5 h-3.5" /> Saved
                </div>
              )}
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="btn-ghost text-xs px-3 py-1.5">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-4 py-1.5">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="btn-secondary text-xs px-4 py-1.5">
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                </button>
              )}
            </div>
          </div>
          <h2 className="font-display font-bold text-xl text-slate-800">{form.name || "Patient"}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{form.email || "No email set"}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-3 rounded-xl animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        <button className={tab === "info" ? "tab-item-active" : "tab-item-inactive"} onClick={() => setTab("info")}>
          <User className="w-4 h-4" /> Personal Info
        </button>
        <button className={tab === "health" ? "tab-item-active" : "tab-item-inactive"} onClick={() => setTab("health")}>
          <Heart className="w-4 h-4" /> Health Info
        </button>
      </div>

      {/* Personal Info */}
      {tab === "info" && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          <div className="grid sm:grid-cols-2 gap-4">
            <F label="Full Name" name="name" placeholder="Your full name" />
            <F label="Email Address" name="email" type="email" placeholder="your@email.com" />
            <F label="Phone Number" name="phone" type="tel" placeholder="+1 234 567 8900" />
            <F label="Date of Birth" name="dob" type="date" />
          </div>
          <F label="About Me" name="bio" placeholder="Brief description about yourself" />
        </div>
      )}

      {/* Health Info */}
      {tab === "health" && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          <div className="grid sm:grid-cols-2 gap-4">
            <F label="Blood Type" name="bloodType" placeholder="e.g. O+" />
            <F label="Known Allergies" name="allergies" placeholder="e.g. Penicillin" />
            <F label="Emergency Contact" name="emergencyContact" placeholder="+1 234 567 8900" />
          </div>
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 flex items-start gap-3">
            <Shield className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-primary-700 leading-relaxed">
              Your health information is private and only shared with healthcare providers during consultations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}