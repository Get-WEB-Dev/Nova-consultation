"use client";

import { useEffect, useState, useMemo } from "react";
import DoctorCard from "@/components/ui/DoctorCard";
import {
  Search, SlidersHorizontal, X, Star, Clock,
  DollarSign, Users, Video, Wifi, ArrowUpDown,
} from "lucide-react";
import type { Doctor } from "@/lib/types";
import OnboardingGuide from "@/components/ui/OnboardingGuide";

type Lang = "en" | "am";
type SortKey = "rating" | "reviews" | "price_low" | "experience" | "patients";

const SPECIALTIES = [
  "All", "Cardiologist", "General Practitioner", "Dermatologist",
  "Neurologist", "Pediatrician", "Orthopedist", "Psychiatrist", "Gynecologist",
];

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Star }[] = [
  { key: "rating",     label: "Top Rated",       icon: Star   },
  { key: "reviews",    label: "Most Reviewed",    icon: Users  },
  { key: "price_low",  label: "Lowest Price",     icon: DollarSign },
  { key: "experience", label: "Most Experienced", icon: Clock  },
  { key: "patients",   label: "Most Patients",    icon: Users  },
];

const STATUS_FILTERS = [
  { key: "all",       label: "All Doctors",      dot: "" },
  { key: "available", label: "Available Now",     dot: "bg-emerald-500 animate-pulse" },
  { key: "busy",      label: "Busy — Join Queue", dot: "bg-gold-400 animate-pulse" },
  { key: "offline",   label: "Offline",           dot: "bg-slate-400" },
] as const;

const T = {
  en: {
    title: "Find a Doctor",
    subtitle: "Connect instantly with verified healthcare professionals",
    search: "Search by name, specialty, or keyword...",
    filters: "Filters",
    sort: "Sort",
    specialty: "Specialty",
    experience: "Experience",
    priceRange: "Price Range",
    rating: "Min Rating",
    availability: "Availability",
    consultation: "Consultation Type",
    gender: "Gender",
    clearAll: "Clear all",
    showing: "Showing",
    doctors: "doctors",
    noResults: "No doctors match your filters",
    availableNow: "Online Now",
    videoConsult: "Video",
    inPerson: "In-Person",
    any: "Any",
    male: "Male",
    female: "Female",
  },
  am: {
    title: "ዶክተር ይፈልጉ",
    subtitle: "ከተረጋገጡ የጤና ባለሙያዎች ጋር ወዲያውኑ ይገናኙ",
    search: "በስም ፣ ስፔሻሊቲ ወይም ቁልፍ ቃል ይፈልጉ...",
    filters: "ማጣሪያዎች",
    sort: "አደራጅ",
    specialty: "ስፔሻሊቲ",
    experience: "ልምድ",
    priceRange: "ዋጋ",
    rating: "ዝቅተኛ ደረጃ",
    availability: "ተገኝነት",
    consultation: "የምክክር ዓይነት",
    gender: "ጾታ",
    clearAll: "ሁሉንም ያጽዱ",
    showing: "",
    doctors: "ዶክተሮች",
    noResults: "ከማጣሪያዎችዎ ጋር የሚዛመድ ዶክተር የለም",
    availableNow: "አሁን ኦንላይን",
    videoConsult: "ቪዲዮ",
    inPerson: "በአካል",
    any: "ሁሉም",
    male: "ወንድ",
    female: "ሴት",
  },
} as const;

export default function DoctorsPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  // Filter state
  const [specialty, setSpecialty] = useState("All");
  const [minExperience, setMinExperience] = useState(0);
  const [maxPrice, setMaxPrice] = useState(200);
  const [minRating, setMinRating] = useState(0);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [consType, setConsType] = useState<"" | "video" | "in-person">("");
  const [genderFilter, setGenderFilter] = useState<"" | "male" | "female">("");
  const [sortBy, setSortBy] = useState<SortKey>("rating");

  const t = T[lang];

  useEffect(() => {
    const stored = localStorage.getItem("hc-lang") as Lang | null;
    if (stored) setLang(stored);
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener("hc-lang-change", handler);
    return () => window.removeEventListener("hc-lang-change", handler);
  }, []);

  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => { setDoctors(data.data || data); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let result = [...doctors];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter((d) =>
        d.name.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.hospital.toLowerCase().includes(q) ||
        d.tags.some((tg) => tg.toLowerCase().includes(q))
      );
    }
    if (specialty !== "All") result = result.filter((d) => d.specialty === specialty);
    if (minExperience > 0) result = result.filter((d) => d.experience >= minExperience);
    if (maxPrice < 200) result = result.filter((d) => d.fee <= maxPrice);
    if (minRating > 0) result = result.filter((d) => d.rating >= minRating);
    if (onlineOnly) result = result.filter((d) => d.onlineNow);
    if (statusFilter === "available") result = result.filter((d) => d.status === "available");
    else if (statusFilter === "busy") result = result.filter((d) => d.status === "busy" || d.status === "in_consultation");
    else if (statusFilter === "offline") result = result.filter((d) => d.status === "offline");
    if (consType === "video") result = result.filter((d) => d.consultationType === "video" || d.consultationType === "both");
    if (consType === "in-person") result = result.filter((d) => d.consultationType === "in-person" || d.consultationType === "both");
    if (genderFilter) result = result.filter((d) => d.gender === genderFilter);

    switch (sortBy) {
      case "rating":     result.sort((a, b) => b.rating - a.rating); break;
      case "reviews":    result.sort((a, b) => b.reviews - a.reviews); break;
      case "price_low":  result.sort((a, b) => a.fee - b.fee); break;
      case "experience": result.sort((a, b) => b.experience - a.experience); break;
      case "patients":   result.sort((a, b) => (b.patientsServed || 0) - (a.patientsServed || 0)); break;
    }
    return result;
  }, [doctors, query, specialty, minExperience, maxPrice, minRating, onlineOnly, consType, genderFilter, sortBy, statusFilter]);

  const activeFilterCount = [specialty !== "All", minExperience > 0, maxPrice < 200, minRating > 0, onlineOnly, consType !== "", genderFilter !== ""].filter(Boolean).length;

  const clearFilters = () => {
    setSpecialty("All"); setMinExperience(0); setMaxPrice(200);
    setMinRating(0); setOnlineOnly(false); setConsType(""); setGenderFilter("");
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <OnboardingGuide page="doctors" />

      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">{t.title}</h1>
        <p className="text-slate-500 text-sm mt-1">{t.subtitle}</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {STATUS_FILTERS.map(({ key, label, dot }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
              statusFilter === key
                ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
            }`}
          >
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
            {label}
          </button>
        ))}
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="flex-1 relative" data-search="doctors">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="input-field pl-11"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          data-filter="doctors"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
            showFilters ? "bg-primary-50 border-primary-400 text-primary-600" : "bg-white border-slate-200 text-slate-600 hover:border-primary-300"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">{t.filters}</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:border-primary-300 transition-all"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">{t.sort}</span>
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-elevated border border-slate-100 py-1 z-30 animate-scale-in">
              {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setSortBy(key); setShowSort(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${sortBy === key ? "text-primary-600 font-semibold bg-primary-50/50" : "text-slate-600"}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm text-slate-800">{t.filters}</h3>
            <button onClick={clearFilters} className="text-xs text-primary-600 font-medium hover:underline">{t.clearAll}</button>
          </div>
          <div className="grid md:grid-cols-3 gap-x-6 gap-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">{t.specialty}</label>
              <div className="flex flex-wrap gap-1.5">
                {SPECIALTIES.map((s) => (
                  <button key={s} onClick={() => setSpecialty(s)}
                    className={`badge transition-all ${specialty === s ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">{t.experience}: {minExperience}+ years</label>
              <input type="range" min={0} max={20} value={minExperience} onChange={(e) => setMinExperience(+e.target.value)} className="w-full accent-primary-600" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">{t.priceRange}: ≤ ${maxPrice}</label>
              <input type="range" min={0} max={200} step={10} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-full accent-primary-600" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">{t.rating}: {minRating}+ ★</label>
              <div className="flex gap-1.5">
                {[0, 4, 4.5, 4.7, 4.9].map((r) => (
                  <button key={r} onClick={() => setMinRating(r)}
                    className={`badge transition-all ${minRating === r ? "bg-gold-400 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {r === 0 ? t.any : `${r}+`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">{t.availability}</label>
              <button onClick={() => setOnlineOnly(!onlineOnly)}
                className={`badge gap-1.5 transition-all ${onlineOnly ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                <Wifi className="w-3 h-3" /> {t.availableNow}
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">{t.consultation}</label>
              <div className="flex gap-1.5">
                {(["" as const, "video" as const, "in-person" as const]).map((c) => (
                  <button key={c || "any"} onClick={() => setConsType(c)}
                    className={`badge transition-all ${consType === c ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {c === "" ? t.any : c === "video" ? t.videoConsult : t.inPerson}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">{t.gender}</label>
              <div className="flex gap-1.5">
                {(["" as const, "male" as const, "female" as const]).map((g) => (
                  <button key={g || "any"} onClick={() => setGenderFilter(g)}
                    className={`badge transition-all ${genderFilter === g ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {g === "" ? t.any : g === "male" ? t.male : t.female}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        {t.showing} <span className="font-semibold text-slate-700">{filtered.length}</span> {t.doctors}
      </p>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => <div key={i} className="bg-white rounded-2xl p-5 animate-shimmer h-72" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-primary-300" />
          </div>
          <p className="text-slate-500 font-medium mb-1">{t.noResults}</p>
          <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
          <button onClick={clearFilters} className="btn-secondary mt-4 text-sm">{t.clearAll}</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => <DoctorCard key={doc.id} {...doc} />)}
        </div>
      )}
    </div>
  );
}
