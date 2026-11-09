"use client";

/**
 * Doctor-portal design kit — the same look everywhere:
 * white cards, soft borders, blue accent, clear empty/error/loading states.
 * Import what you need:  import { PageHeader, Card, EmptyState } from "@/components/doctor/ui";
 */

import type { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export const NAV_BG = "#003580";
export const ACCENT = "#0071c2";

// ── Layout pieces ───────────────────────────────────────────
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
                <h1 className="font-extrabold text-slate-900 text-[18px] sm:text-[20px]">{title}</h1>
                {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {right}
        </div>
    );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <div className={`bg-white border border-slate-200 rounded-2xl ${className}`} style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            {children}
        </div>
    );
}

export function StatTile({ icon: Icon, label, value, bg, color }: { icon: any; label: string; value: string | number; bg: string; color: string }) {
    return (
        <Card className="p-3.5 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="min-w-0">
                <p className="font-extrabold text-slate-900 text-[17px] leading-none">{value}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">{label}</p>
            </div>
        </Card>
    );
}

// ── States ──────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, text, action }: { icon: any; title: string; text?: string; action?: ReactNode }) {
    return (
        <Card className="text-center py-12 px-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <Icon className="w-6 h-6 text-slate-300" />
            </div>
            <p className="font-bold text-slate-700 text-[14px]">{title}</p>
            {text && <p className="text-[12px] text-slate-400 mt-1 max-w-xs mx-auto">{text}</p>}
            {action && <div className="mt-4">{action}</div>}
        </Card>
    );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <Card className="text-center py-10 px-6">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-[13px] text-slate-600 mt-2">{message}</p>
            {onRetry && (
                <button onClick={onRetry} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold" style={{ background: ACCENT }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Try again
                </button>
            )}
        </Card>
    );
}

export function SkeletonRows({ count = 4, height = "h-16" }: { count?: number; height?: string }) {
    return (
        <div className="space-y-2.5 animate-pulse">
            {Array.from({ length: count }).map((_, i) => <div key={i} className={`${height} bg-white border border-slate-100 rounded-2xl`} />)}
        </div>
    );
}

// ── Small controls ──────────────────────────────────────────
export function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
    return (
        <button
            onClick={onClick}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all ${active ? "text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            style={active ? { background: NAV_BG } : undefined}
        >
            {children}{count !== undefined && <span className={`ml-1.5 ${active ? "opacity-70" : "text-slate-300"}`}>{count}</span>}
        </button>
    );
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
    const initials = (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    return src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} width={size} height={size} className="rounded-xl object-cover shrink-0" style={{ width: size, height: size }} />
    ) : (
        <div className="rounded-xl flex items-center justify-center font-bold text-white shrink-0" style={{ width: size, height: size, background: `linear-gradient(135deg, ${NAV_BG}, ${ACCENT})`, fontSize: size * 0.34 }}>
            {initials}
        </div>
    );
}

// ── Helpers ─────────────────────────────────────────────────
export function timeAgo(iso: string | null | undefined): string {
    if (!iso) return "—";
    const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    if (secs < 86400 * 30) return `${Math.floor(secs / 86400)}d ago`;
    return new Date(iso).toLocaleDateString();
}

/** "Today" / "Yesterday" / "Earlier" — for grouping lists by day. */
export function dayGroup(iso: string): "Today" | "Yesterday" | "Earlier" {
    const d = new Date(iso);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const diff = Math.round((start.getTime() - day.getTime()) / 86400000);
    return diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : "Earlier";
}