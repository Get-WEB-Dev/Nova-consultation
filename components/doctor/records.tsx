"use client";

/** Shared pieces for the patient record and consultation history screens. */
import { ACCENT } from "@/components/doctor/ui";

export const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
    completed: { bg: "#f0fdf4", fg: "#15803d", label: "Completed" },
    follow_up: { bg: "#fffbeb", fg: "#b45309", label: "Follow-up" },
    active: { bg: "#effefb", fg: ACCENT, label: "In progress" },
    waiting: { bg: "#effefb", fg: ACCENT, label: "Waiting" },
    missed: { bg: "#fff1f2", fg: "#be123c", label: "Missed" },
    cancelled: { bg: "#f1f5f9", fg: "#64748b", label: "Cancelled" },
};
export const SEEN = ["completed", "follow_up"];

export function StatusPill({ status }: { status: string }) {
    const s = STATUS_STYLE[status] ?? STATUS_STYLE.cancelled;
    return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>{s.label}</span>;
}

const OUTCOMES: Record<string, { bg: string; fg: string; label: string }> = {
    completed: { bg: "#f0fdf4", fg: "#15803d", label: "Resolved" },
    follow_up: { bg: "#fffbeb", fg: "#b45309", label: "Needs follow-up" },
    referred: { bg: "#f5f3ff", fg: "#6d28d9", label: "Referred" },
    emergency: { bg: "#fff1f2", fg: "#be123c", label: "Emergency" },
};
export function OutcomeBadge({ outcome }: { outcome?: string | null }) {
    if (!outcome || !OUTCOMES[outcome]) return null;
    const o = OUTCOMES[outcome];
    return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: o.bg, color: o.fg }}>{o.label}</span>;
}

export const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "—";
export const fmtDateTime = (iso?: string | null) => (iso ? `${fmtDate(iso)} · ${fmtTime(iso)}` : "—");

export function ageFrom(dob?: string | null): number | null {
    if (!dob) return null;
    const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000));
    return years > 0 && years < 130 ? years : null;
}