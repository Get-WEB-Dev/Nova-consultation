"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search, X, Star, Clock, DollarSign, Users, Video, Heart,
  CheckCircle, Bell, Stethoscope, MapPin, SlidersHorizontal,
  Building2, Filter, MessageSquare, ChevronDown, User,
  Award, Globe, Phone, Loader2, BadgeCheck,
} from "lucide-react";
import { getUser } from "@/lib/supabase/auth";

type SortKey = "rating" | "reviews" | "price_low" | "experience";

const NAV_BG = "#003580";
const NAV_DARK = "#002050";
const ACCENT = "#0071c2";

const CARE_CATEGORIES = [
  { label: "Dermatology", icon: "🧴", specialty: "Dermatologist" },
  { label: "Cardiology", icon: "❤️", specialty: "Cardiologist" },
  { label: "Neurology", icon: "🧠", specialty: "Neurologist" },
  { label: "Pediatrics", icon: "👶", specialty: "Pediatrician" },
  { label: "Orthopedics", icon: "🦴", specialty: "Orthopedist" },
  { label: "Psychiatry", icon: "🧘", specialty: "Psychiatrist" },
  { label: "Gynecology", icon: "🌸", specialty: "Gynecologist" },
  { label: "General", icon: "🩺", specialty: "General Practitioner" },
];

const STATUS: Record<string, { color: string; label: string; textClass: string; bgClass: string }> = {
  available: { color: "#22c55e", label: "Available", textClass: "text-emerald-700", bgClass: "bg-emerald-50 border-emerald-200" },
  busy: { color: "#f59e0b", label: "Busy", textClass: "text-amber-700", bgClass: "bg-amber-50 border-amber-200" },
  in_consultation: { color: "#f59e0b", label: "In Session", textClass: "text-amber-700", bgClass: "bg-amber-50 border-amber-200" },
  offline: { color: "#94a3b8", label: "Offline", textClass: "text-slate-500", bgClass: "bg-slate-100 border-slate-200" },
};

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  experience_years?: number;
  rating: number;
  reviews: number;
  review_count?: number;
  patients_served?: number;
  avatar: string;
  avatar_url?: string | null;
  status: string;
  hospital: string;
  fee: number;
  bio?: string | null;
  languages?: string[];
  consultation_type?: string;
}

// ─── Doctor Card ──────────────────────────────────────────────────────────────
function DoctorCard({ doc, onOpen, onMessage }: {
  doc: Doctor;
  onOpen: () => void;
  onMessage: () => void;
}) {
  const st = STATUS[doc.status] ?? STATUS.offline;
  const isOffline = doc.status === "offline";
  const avatar = doc.avatar || doc.avatar_url;
  const experience = doc.experience || doc.experience_years || 0;
  const reviews = doc.reviews || doc.review_count || 0;

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
    >
      <div className="flex">
        {/* Photo column */}
        <div
          className="relative flex-shrink-0 w-[105px] sm:w-[120px]"
          style={{ background: "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)", minHeight: 150 }}
        >
          {avatar ? (
            <Image src={avatar} alt={doc.name} width={120} height={160}
              className="w-full h-full object-cover object-top" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: NAV_BG }}>
              <span className="text-white font-extrabold text-3xl">{doc.name[0]}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 flex flex-col gap-1">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <h3 className="font-bold text-[13px] sm:text-[14px] text-slate-900 leading-tight truncate">
                Dr. {doc.name}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">MBBS</p>
            </div>
            <span className={`flex-shrink-0 flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${st.bgClass} ${st.textClass}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
              {st.label}
            </span>
          </div>

          <p className="text-[11px] font-semibold truncate" style={{ color: ACCENT }}>{doc.specialty}</p>
          <div className="border-t border-dashed border-slate-100" />

          {doc.hospital && (
            <div className="flex items-start gap-1">
              <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">{doc.hospital}</p>
            </div>
          )}

          <div className="flex items-end justify-between gap-1 mt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span className="text-[11px] font-bold text-slate-700">{doc.rating?.toFixed(1) ?? "N/A"}</span>
                <span className="text-[9px] text-slate-400">({reviews})</span>
              </div>
              <span className="text-[10px] text-slate-300">·</span>
              <span className="text-[10px] text-slate-500">{experience}y exp</span>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[8px] text-slate-400 leading-none">Consultation fee</p>
              <p className="text-[13px] font-extrabold leading-tight" style={{ color: ACCENT }}>
                {doc.fee} <span className="text-[9px] font-semibold text-slate-500">Birr</span>
              </p>
              <p className="text-[8px] text-slate-400 leading-none">Incl. VAT · per visit</p>
            </div>
          </div>

          <div className="flex gap-1.5 mt-1">
            <button onClick={(e) => { e.stopPropagation(); onOpen(); }}
              className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
              View Profile
            </button>
            <button onClick={(e) => { e.stopPropagation(); onMessage(); }}
              className="flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 px-2.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all">
              <MessageSquare className="w-3 h-3" />
            </button>
            {isOffline ? (
              <button className="flex-1 flex items-center justify-center gap-1 text-[11px] font-bold py-1.5 rounded-lg transition-all active:scale-95 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100">
                <Bell className="w-3 h-3" /> Remind Me
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onOpen(); }}
                className="flex-1 text-[11px] font-bold py-1.5 rounded-lg text-white transition-all active:scale-95 hover:opacity-90"
                style={{ background: NAV_BG }}>
                Collaborate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Bottom Sheet ──────────────────────────────────────────────────────
function FilterSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl max-h-[88vh] overflow-y-auto p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        {children}
        <button onClick={onClose} className="w-full py-3 rounded-xl text-white font-bold text-sm mt-2" style={{ background: NAV_BG }}>
          Show Results
        </button>
      </div>
    </div>
  );
}

// ─── Shared Filter Content ────────────────────────────────────────────────────
function FilterContent({ statusFilter, setStatusFilter, maxPrice, setMaxPrice, minRating, setMinRating,
  minExperience, setMinExperience, sortBy, setSortBy, activeCount, clearFilters }: any) {
  return (
    <>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Availability</p>
        {[
          { k: "all", l: "All Doctors", c: "" },
          { k: "available", l: "Available Now", c: "#22c55e" },
          { k: "busy", l: "Busy / In Session", c: "#f59e0b" },
          { k: "offline", l: "Offline", c: "#94a3b8" },
        ].map((s) => (
          <button key={s.k} onClick={() => setStatusFilter(s.k)}
            className={`w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors mb-0.5 ${statusFilter === s.k ? "font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
            style={statusFilter === s.k ? { background: "#eff6ff", color: NAV_BG } : {}}>
            {s.c ? <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.c }} /> : <span className="w-2 h-2 flex-shrink-0" />}
            <span className="flex-1 text-left">{s.l}</span>
            {statusFilter === s.k && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ACCENT }} />}
          </button>
        ))}
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Max Fee: {maxPrice} Birr</p>
        <input type="range" min={100} max={2000} step={50} value={maxPrice}
          onChange={(e) => setMaxPrice(+e.target.value)} className="w-full" style={{ accentColor: NAV_BG }} />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>100</span><span>2000 Birr</span></div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Min Rating</p>
        <div className="flex gap-1.5 flex-wrap">
          {[0, 4, 4.5, 4.8].map((r) => (
            <button key={r} onClick={() => setMinRating(r)}
              className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
              style={minRating === r ? { background: NAV_BG, color: "white", borderColor: NAV_BG } : { borderColor: "#e2e8f0", color: "#475569" }}>
              {r === 0 ? "Any" : `${r}+★`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Min Experience</p>
        <div className="flex gap-1.5 flex-wrap">
          {[0, 2, 5, 10].map((y) => (
            <button key={y} onClick={() => setMinExperience(y)}
              className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
              style={minExperience === y ? { background: NAV_BG, color: "white", borderColor: NAV_BG } : { borderColor: "#e2e8f0", color: "#475569" }}>
              {y === 0 ? "Any" : `${y}y+`}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sort By</p>
        <div className="space-y-0.5">
          {[
            { k: "rating", l: "Top Rated", icon: Star },
            { k: "reviews", l: "Most Reviewed", icon: Users },
            { k: "price_low", l: "Lowest Fee", icon: DollarSign },
            { k: "experience", l: "Most Experienced", icon: Clock },
          ].map(({ k, l, icon: Icon }) => (
            <button key={k} onClick={() => setSortBy(k as SortKey)}
              className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors"
              style={sortBy === k ? { background: "#eff6ff", color: NAV_BG, fontWeight: 600 } : { color: "#475569" }}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" /> {l}
              {sortBy === k && <CheckCircle className="w-3.5 h-3.5 ml-auto" style={{ color: ACCENT }} />}
            </button>
          ))}
        </div>
      </div>

      {activeCount > 0 && (
        <button onClick={clearFilters}
          className="w-full text-sm font-semibold py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
          Clear all filters
        </button>
      )}
    </>
  );
}

// ─── Profile Modal ──────────────────────────────────────────────────────────
function ProfileModal({ doctor, onClose, onMessage }: {
  doctor: Doctor; onClose: () => void; onMessage: (d: Doctor) => void;
}) {
  const experience = doctor.experience || doctor.experience_years || 0;
  const reviews = doctor.reviews || doctor.review_count || 0;
  const avatar = doctor.avatar || doctor.avatar_url;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[5%] bottom-[5%] z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-lg mx-auto"
        style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div className="relative h-32 flex-shrink-0" style={{ background: `linear-gradient(135deg, ${NAV_BG}, ${ACCENT})` }}>
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 -mt-12 pb-4 flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 mb-3 relative">
            {avatar ? (
              <Image src={avatar} alt={doctor.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: NAV_BG }}>
                <span className="text-white font-extrabold text-3xl">{doctor.name[0]}</span>
              </div>
            )}
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">Dr. {doctor.name}</h2>
              <p className="text-sm font-semibold" style={{ color: ACCENT }}>{doctor.specialty}</p>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${doctor.status === "available" ? "bg-emerald-400" : doctor.status === "offline" ? "bg-slate-300" : "bg-amber-400"}`} />
              <span className={`text-[12px] font-semibold ${doctor.status === "available" ? "text-emerald-600" : doctor.status === "offline" ? "text-slate-400" : "text-amber-600"}`}>
                {STATUS[doctor.status]?.label ?? "Offline"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
          {doctor.bio && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">About</p>
              <p className="text-sm text-slate-600 leading-relaxed">{doctor.bio}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Clock, label: "Experience", value: `${experience} years` },
              { icon: Star, label: "Rating", value: `${doctor.rating?.toFixed(1) ?? "N/A"} (${reviews} reviews)` },
              { icon: Users, label: "Patients", value: doctor.patients_served?.toLocaleString() ?? "0" },
              { icon: Building2, label: "Hospital", value: doctor.hospital ?? "Independent" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
                </div>
                <p className="text-[13px] font-bold text-slate-800">{value}</p>
              </div>
            ))}
          </div>
          {doctor.languages && doctor.languages.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Languages</p>
              <div className="flex flex-wrap gap-2">
                {doctor.languages.map((l) => (
                  <span key={l} className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-slate-200 bg-white text-slate-600">{l}</span>
                ))}
              </div>
            </div>
          )}
          <div className="p-4 rounded-xl border border-blue-100" style={{ background: "#eff6ff" }}>
            <p className="text-[10px] font-extrabold uppercase tracking-wider mb-1" style={{ color: ACCENT }}>Consultation Fee</p>
            <p className="text-2xl font-extrabold text-slate-900">{doctor.fee ?? 0} <span className="text-sm font-bold text-slate-500">Birr/session</span></p>
            <p className="text-xs text-slate-500 mt-0.5">{doctor.consultation_type || "Video consultation"}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-white flex-shrink-0">
          <button onClick={() => { onMessage(doctor); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] border transition-all"
            style={{ borderColor: ACCENT, color: ACCENT }}>
            <MessageSquare className="w-4 h-4" /> Send Message
          </button>
          <button onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-[13px] text-white transition-all"
            style={{ background: NAV_BG }}>
            <Video className="w-4 h-4" /> Collaborate
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DoctorsDashboardPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [specialty, setSpecialty] = useState("All");
  const [minExperience, setMinExperience] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2000);
  const [minRating, setMinRating] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [viewDoctor, setViewDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/doctors");
        if (res.ok) {
          const j = await res.json();
          setDoctors(j.data || j || []);
        }
      } catch { }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = [...doctors];
    if (query) {
      const q = query.toLowerCase();
      r = r.filter((d) =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        (d.hospital ?? "").toLowerCase().includes(q)
      );
    }
    if (location) {
      const l = location.toLowerCase();
      r = r.filter((d) => (d.hospital ?? "").toLowerCase().includes(l));
    }
    if (specialty !== "All") r = r.filter((d) => d.specialty === specialty);
    const exp = (d: Doctor) => d.experience || d.experience_years || 0;
    if (minExperience > 0) r = r.filter((d) => exp(d) >= minExperience);
    if (maxPrice < 2000) r = r.filter((d) => d.fee <= maxPrice);
    if (minRating > 0) r = r.filter((d) => d.rating >= minRating);
    if (statusFilter === "available") r = r.filter((d) => d.status === "available");
    else if (statusFilter === "busy") r = r.filter((d) => d.status === "busy" || d.status === "in_consultation");
    else if (statusFilter === "offline") r = r.filter((d) => d.status === "offline");
    switch (sortBy) {
      case "rating": r.sort((a, b) => b.rating - a.rating); break;
      case "reviews": r.sort((a, b) => (b.reviews || b.review_count || 0) - (a.reviews || a.review_count || 0)); break;
      case "price_low": r.sort((a, b) => a.fee - b.fee); break;
      case "experience": r.sort((a, b) => exp(b) - exp(a)); break;
    }
    return r;
  }, [doctors, query, location, specialty, minExperience, maxPrice, minRating, statusFilter, sortBy]);

  const clearFilters = () => {
    setSpecialty("All"); setMinExperience(0); setMaxPrice(2000);
    setMinRating(0); setStatusFilter("all");
  };
  const activeCount = [
    specialty !== "All", minExperience > 0, maxPrice < 2000, minRating > 0, statusFilter !== "all",
  ].filter(Boolean).length;

  const filterProps = {
    statusFilter, setStatusFilter, maxPrice, setMaxPrice, minRating, setMinRating,
    minExperience, setMinExperience, sortBy, setSortBy, activeCount, clearFilters,
  };

  const handleMessage = (doctor: Doctor) => {
    router.push(`/doctor-dashboard/messages?contactId=${doctor.id}&contactName=${encodeURIComponent(doctor.name)}`);
  };

  const onlineCount = doctors.filter((d) => d.status !== "offline").length;

  return (
    <div className="space-y-0 pb-10 max-w-5xl">
      {/* ── HERO SEARCH ─────────────────────────── */}
      <div className="px-4 pt-2 pb-5 -mx-4 sm:-mx-6 lg:-mx-8 sm:px-6 lg:px-8 rounded-b-2xl" style={{ background: NAV_BG }}>
        <h1 className="text-white font-extrabold text-[18px] sm:text-2xl mb-0.5">
          Doctor Directory
        </h1>
        <p className="text-blue-200 text-xs mb-4">
          {doctors.length} registered · <span className="text-emerald-300 font-semibold">{onlineCount} online now</span>
        </p>
        <div className="flex flex-col sm:flex-row rounded-xl overflow-hidden border-2 border-yellow-400"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
          <div className="flex-1 flex items-center gap-2 bg-white px-3 py-3 sm:border-r sm:border-slate-200">
            <Stethoscope className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Doctor name or specialty…"
              className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none" />
            {query && <button onClick={() => setQuery("")}><X className="w-4 h-4 text-slate-300" /></button>}
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-3 border-t border-slate-100 sm:border-t-0 sm:border-r sm:border-slate-200 sm:min-w-[160px]">
            <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="City or hospital…"
              className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none" />
          </div>
          <button className="flex items-center justify-center gap-2 px-5 py-3 font-bold text-sm text-white"
            style={{ background: NAV_DARK }}>
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
      </div>

      {/* ── CARE QUICK FILTERS ─────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setSpecialty("All")}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] sm:text-[12px] font-bold border transition-all whitespace-nowrap"
              style={specialty === "All" ? { background: NAV_BG, color: "white", borderColor: NAV_BG }
                : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
              🏥 All Care
            </button>
            {CARE_CATEGORIES.map((cat) => (
              <button key={cat.specialty} onClick={() => setSpecialty(specialty === cat.specialty ? "All" : cat.specialty)}
                className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] sm:text-[12px] font-bold border transition-all whitespace-nowrap"
                style={specialty === cat.specialty ? { background: NAV_BG, color: "white", borderColor: NAV_BG }
                  : { background: "white", color: "#475569", borderColor: "#e2e8f0" }}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT ────────────────────────── */}
      <div className="flex gap-4 pt-4">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 sticky top-16"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filters
              </h3>
              {activeCount > 0 && (
                <button onClick={clearFilters} className="text-xs font-semibold hover:underline" style={{ color: ACCENT }}>Clear</button>
              )}
            </div>
            <FilterContent {...filterProps} />
          </div>
        </aside>

        {/* Doctor list */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500">
              <span className="font-bold text-slate-800">{filtered.length}</span> doctors found
              {specialty !== "All" && <span className="ml-1 font-medium" style={{ color: ACCENT }}>· {specialty}</span>}
            </p>
            <button onClick={() => setShowFilters(true)}
              className="md:hidden flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              {activeCount > 0 && (
                <span className="w-4 h-4 text-[9px] font-extrabold rounded-full flex items-center justify-center text-white"
                  style={{ background: NAV_BG }}>{activeCount}</span>
              )}
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl h-36 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <p className="font-bold text-slate-700 text-sm">No doctors found</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Try different search terms or filters</p>
              <button onClick={clearFilters} className="text-sm font-semibold hover:underline" style={{ color: ACCENT }}>
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((doc) => (
                <DoctorCard key={doc.id} doc={doc}
                  onOpen={() => setViewDoctor(doc)}
                  onMessage={() => handleMessage(doc)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet filter */}
      <FilterSheet open={showFilters} onClose={() => setShowFilters(false)}>
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800">Filters & Sort</h3>
          {activeCount > 0 && (
            <button onClick={clearFilters} className="text-xs font-semibold" style={{ color: ACCENT }}>Clear all</button>
          )}
        </div>
        <FilterContent {...filterProps} />
      </FilterSheet>

      {viewDoctor && (
        <ProfileModal doctor={viewDoctor} onClose={() => setViewDoctor(null)} onMessage={handleMessage} />
      )}
    </div>
  );
}
