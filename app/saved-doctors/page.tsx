"use client";

import { useEffect, useState } from "react";
import DoctorCard from "@/components/ui/DoctorCard";
import Link from "next/link";
import { Bookmark, Stethoscope, Loader2 } from "lucide-react";
import type { Doctor } from "@/lib/types";
import { getUser, loadUser } from "@/lib/supabase/auth";

// ── MOCK FALLBACK (disabled) ─────────────────────────────────
// localStorage fallback was: JSON.parse(localStorage.getItem('nova-saved-doctors') || '[]')
// All saved state is now persisted in Supabase via /api/saved-doctors
// ─────────────────────────────────────────────────────────────

export default function SavedDoctorsPage() {
  const [savedDoctors, setSavedDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // Get the current user
      let user = getUser();
      if (!user) user = await loadUser();

      // Fetch all doctors and the user's saved IDs in parallel
      const [docsRes, savedRes] = await Promise.all([
        fetch("/api/doctors").then((r) => r.json()),
        user
          ? fetch(`/api/saved-doctors?patientId=${user.id}`).then((r) => r.json())
          : Promise.resolve({ data: [] }),
      ]);

      const allDoctors: Doctor[] = docsRes.data ?? docsRes;
      const savedIds: string[] = savedRes.data ?? [];
      setSavedDoctors(allDoctors.filter((d) => savedIds.includes(d.id)));
    } catch {
      setSavedDoctors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("hc-auth-change", handler);
    return () => window.removeEventListener("hc-auth-change", handler);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800 flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-rose-400 fill-rose-400" /> Saved Doctors
        </h1>
        <p className="text-slate-500 text-sm mt-1">Doctors you&apos;ve saved for quick access</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
          <p className="text-sm text-slate-500">Loading saved doctors...</p>
        </div>
      ) : savedDoctors.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-8 h-8 text-rose-200" />
          </div>
          <p className="text-slate-500 font-medium">No saved doctors yet</p>
          <p className="text-slate-400 text-sm mt-1">Save doctors from their profile to find them quickly</p>
          <Link href="/doctors" className="btn-primary mt-4 inline-flex">
            <Stethoscope className="w-4 h-4" /> Browse Doctors
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedDoctors.map((doc) => (
            <DoctorCard key={doc.id} {...doc} />
          ))}
        </div>
      )}
    </div>
  );
}
