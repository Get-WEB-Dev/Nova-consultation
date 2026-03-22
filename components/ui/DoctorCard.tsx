"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star, Clock, Languages, Users, Video,
  Bell, BellRing, Bookmark, BookmarkCheck,
} from "lucide-react";
import type { DoctorStatus } from "@/lib/types";
import { getUser } from "@/lib/supabase/auth";

// ── Module-level shared cache ─────────────────────────────────
// All DoctorCard instances on a page share a single in-flight request
// for saved IDs. This prevents N identical requests firing simultaneously
// when a page renders multiple cards. The cache is keyed by userId and
// invalidated whenever a save/unsave action completes.
let _savedCache: { userId: string; ids: Set<string> } | null = null;
let _pendingFetch: Promise<Set<string>> | null = null;

function fetchSavedIds(userId: string): Promise<Set<string>> {
  // Return cached result for this user
  if (_savedCache && _savedCache.userId === userId) {
    return Promise.resolve(_savedCache.ids);
  }
  // Return in-flight request if one is already running
  if (_pendingFetch) return _pendingFetch;

  _pendingFetch = fetch(`/api/saved-doctors?patientId=${userId}`)
    .then((r) => (r.ok ? r.json() : { data: [] }))
    .then((json) => {
      const ids = new Set<string>(json.data ?? []);
      _savedCache = { userId, ids };
      _pendingFetch = null;
      return ids;
    })
    .catch(() => {
      _pendingFetch = null;
      return new Set<string>();
    });

  return _pendingFetch;
}

// Call after save/unsave to force next render to re-fetch
function invalidateSavedCache() {
  _savedCache = null;
  _pendingFetch = null;
}
// ─────────────────────────────────────────────────────────────

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  experience: number;
  rating: number;
  reviews: number;
  avatar: string;
  available: boolean;
  fee: number;
  tags: string[];
  languages: string[];
  gender?: string;
  patientsServed?: number;
  consultationType?: string;
  status?: DoctorStatus;
  onlineNow?: boolean;
  nextAvailableSlot?: string;
  locationCity?: string;
  consultationDurationMinutes?: number;
  compact?: boolean;
  // Optional: parent can inject initial saved state to avoid a redundant fetch
  initialSaved?: boolean;
}

const STATUS_CONFIG: Record<DoctorStatus, { label: string; dot: string; badge: string }> = {
  available: { label: "Available Now", dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  busy: { label: "Busy — Join Queue", dot: "bg-gold-400 animate-pulse", badge: "bg-gold-50 text-gold-700 border border-gold-200" },
  in_consultation: { label: "In Consultation", dot: "bg-orange-400 animate-pulse", badge: "bg-orange-50 text-orange-700 border border-orange-200" },
  offline: { label: "Offline", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-500 border border-slate-200" },
};

function FullDoctorCard(props: DoctorCardProps) {
  const {
    id, name, specialty, hospital, experience, rating, reviews,
    avatar, fee, tags, languages, patientsServed, consultationType,
    status = "offline", onlineNow, nextAvailableSlot,
    consultationDurationMinutes, initialSaved,
  } = props;

  const cfg = STATUS_CONFIG[status];

  // ── Saved state — one shared fetch per page, not one per card ──
  const [saved, setSaved] = useState<boolean>(initialSaved ?? false);
  const [reminded, setReminded] = useState<boolean>(false);
  const [loadedSaved, setLoadedSaved] = useState(initialSaved !== undefined);

  useEffect(() => {
    if (loadedSaved) return;
    const user = getUser();
    if (!user) return;

    fetchSavedIds(user.id).then((ids) => {
      setSaved(ids.has(id));
      setLoadedSaved(true);
    });
  }, [id, loadedSaved]);

  // Re-check when auth changes (login/logout)
  useEffect(() => {
    const handler = () => {
      invalidateSavedCache();
      setLoadedSaved(false);
    };
    window.addEventListener("hc-auth-change", handler);
    return () => window.removeEventListener("hc-auth-change", handler);
  }, []);

  // ── Toggle save — calls /api/saved-doctors ─────────────────
  const toggleSave = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    const user = getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const newSaved = !saved;
    setSaved(newSaved);

    // Optimistically update the shared cache
    if (_savedCache && _savedCache.userId === user.id) {
      if (newSaved) {
        _savedCache.ids.add(id);
      } else {
        _savedCache.ids.delete(id);
      }
    }

    try {
      const res = await fetch("/api/saved-doctors", {
        method: newSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: user.id, doctorId: id }),
      });
      if (!res.ok) {
        // Rollback
        setSaved(!newSaved);
        if (_savedCache && _savedCache.userId === user.id) {
          if (newSaved) _savedCache.ids.delete(id);
          else _savedCache.ids.add(id);
        }
      }
    } catch {
      setSaved(!newSaved);
      invalidateSavedCache();
    }
  }, [id, saved]);

  // ── Toggle remind me — calls /api/remind-me ────────────────
  const toggleRemind = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    const user = getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const newReminded = !reminded;
    setReminded(newReminded);

    try {
      const res = await fetch("/api/remind-me", {
        method: newReminded ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: user.id, doctorId: id }),
      });
      if (!res.ok) {
        setReminded(!newReminded);
      }
    } catch {
      setReminded(!newReminded);
    }
  }, [id, reminded]);

  return (
    <div className="glass-card flex flex-col gap-4 p-5 hover:-translate-y-0.5 transition-all duration-300 group relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 via-teal-500 to-mint-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-start gap-3">
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
          <Image src={avatar} alt={name} fill className="object-cover" unoptimized />
          {onlineNow && (
            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-slate-800 text-base leading-tight group-hover:text-primary-600 transition-colors truncate">
                {name}
              </h3>
              <p className="text-sm text-primary-600 font-medium mt-0.5">{specialty}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">{hospital}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={toggleSave}
                className={`p-1.5 rounded-lg border transition-all ${saved
                    ? "bg-rose-50 border-rose-200 text-rose-500"
                    : "bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-400"
                  }`}
                title={saved ? "Unsave doctor" : "Save doctor"}
              >
                {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold ${cfg.badge}`}>
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        {cfg.label}
        {consultationDurationMinutes && (status === "available" || status === "busy") && (
          <span className="ml-auto text-[10px] opacity-70 font-normal flex items-center gap-1">
            <Clock className="w-3 h-3" /> {consultationDurationMinutes} min session
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gradient-to-br from-slate-50 to-primary-50/30 rounded-xl py-2.5">
          <div className="flex items-center justify-center gap-1 text-gold-400">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-sm font-semibold text-slate-800">{rating}</span>
          </div>
          <p className="text-[10px] text-slate-500">{reviews} reviews</p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-xl py-2.5">
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary-500" />
            <span className="text-sm font-semibold text-slate-800">{experience}y</span>
          </div>
          <p className="text-[10px] text-slate-500">Experience</p>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-mint-50/30 rounded-xl py-2.5">
          <p className="text-sm font-semibold text-slate-800">${fee}</p>
          <p className="text-[10px] text-slate-500">Per session</p>
        </div>
      </div>

      {patientsServed && (
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-accent-500" />
            {patientsServed.toLocaleString()} patients
          </span>
          {consultationType && (
            <span className="flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-primary-500" />
              {consultationType === "both" ? "Video & In-Person" : consultationType === "video" ? "Video" : "In-Person"}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Languages className="w-3.5 h-3.5" />
        {languages.join(", ")}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.slice(0, 3).map((tag) => (
          <span key={tag} className="badge bg-primary-50 text-primary-700 border border-primary-100">
            {tag}
          </span>
        ))}
      </div>

      {/* Offline: next available + remind me */}
      {status === "offline" && nextAvailableSlot && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-600 font-medium">Next: {nextAvailableSlot}</p>
          <button
            onClick={toggleRemind}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${reminded
                ? "bg-primary-100 text-primary-700"
                : "bg-white text-slate-600 border border-slate-200 hover:border-primary-300 hover:text-primary-600"
              }`}
          >
            {reminded ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            {reminded ? "Reminder set" : "Remind Me"}
          </button>
        </div>
      )}

      {/* CTA buttons */}
      <div className="flex gap-2 mt-auto">
        <Link href={`/doctor/${id}`} className="btn-secondary flex-1 text-sm">
          View Profile
        </Link>
        {status === "available" && (
          <Link href={`/doctor/${id}`} className="btn-primary flex-1 text-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
            <Video className="w-3.5 h-3.5" /> Join Now
          </Link>
        )}
        {(status === "busy" || status === "in_consultation") && (
          <Link href={`/doctor/${id}`} className="flex-1 text-sm flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gold-50 text-gold-700 border border-gold-200 hover:bg-gold-100 transition-colors font-medium">
            <Users className="w-3.5 h-3.5" /> Join Queue
          </Link>
        )}
        {status === "offline" && (
          <button
            onClick={toggleRemind}
            className={`flex-1 text-sm flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border transition-all font-medium ${reminded
                ? "bg-primary-50 text-primary-700 border-primary-200"
                : "bg-slate-100 text-slate-600 border-slate-200 hover:border-primary-300"
              }`}
          >
            <Bell className="w-3.5 h-3.5" /> {reminded ? "Reminder Set" : "Remind Me"}
          </button>
        )}
      </div>
    </div>
  );
}

function CompactDoctorCard({ id, name, specialty, avatar, status = "offline" }: DoctorCardProps) {
  const dot =
    status === "available" ? "bg-emerald-500 animate-pulse"
      : status === "busy" ? "bg-gold-400 animate-pulse"
        : status === "in_consultation" ? "bg-orange-400"
          : "bg-slate-400";

  return (
    <Link
      href={`/doctor/${id}`}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden ring-2 ring-primary-100 group-hover:ring-primary-400 transition-all">
        <Image src={avatar} alt={name} fill className="object-cover" unoptimized />
        <span className={`absolute bottom-0 right-0 w-3 h-3 ${dot} border-2 border-white rounded-full`} />
      </div>
      <div className="text-center">
        <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-tight group-hover:text-primary-600 transition-colors line-clamp-1">
          {name}
        </p>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">{specialty}</p>
      </div>
    </Link>
  );
}

export default function DoctorCard(props: DoctorCardProps) {
  if (props.compact) return <CompactDoctorCard {...props} />;
  return <FullDoctorCard {...props} />;
}
