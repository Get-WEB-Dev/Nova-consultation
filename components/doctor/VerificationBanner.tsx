"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, EyeOff } from "lucide-react";

/**
 * Tells a doctor WHY patients can't see them yet.
 * - not verified  → waiting for admin approval
 * - verified but hidden → an admin has hidden the profile
 * Renders nothing once the doctor is verified and public.
 */
export default function VerificationBanner() {
    const [state, setState] = useState<"unverified" | "hidden" | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/doctor/profile");
                const j = await res.json();
                if (!res.ok || !j.data) return;
                if (!j.data.is_verified) setState("unverified");
                else if (!j.data.is_published) setState("hidden");
            } catch {
                /* a banner is optional — never break the page */
            }
        })();
    }, []);

    if (!state) return null;

    const unverified = state === "unverified";
    return (
        <div className={`mb-4 flex items-start gap-3 p-4 rounded-2xl border ${unverified ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-slate-50 border-slate-200 text-slate-700"}`}>
            {unverified ? <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" /> : <EyeOff className="w-5 h-5 shrink-0 mt-0.5" />}
            <div className="text-sm">
                <p className="font-semibold">
                    {unverified ? "Your account is awaiting verification" : "Your profile is hidden from patients"}
                </p>
                <p className="mt-0.5 opacity-90">
                    {unverified
                        ? "Patients can't find you until an admin approves your account. Make sure your profile and credentials are complete."
                        : "An administrator has hidden your public profile. Contact support if you think this is a mistake."}
                    {unverified && (
                        <> <Link href="/doctor-dashboard/profile" className="underline font-semibold">Complete your profile</Link></>
                    )}
                </p>
            </div>
        </div>
    );
}