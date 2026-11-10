"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Copy, Check, Loader2, AlertCircle } from "lucide-react";

// ───────────── Formatting ─────────────
export const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d?: string | null) =>
    d ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// ───────────── Navigation ─────────────
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-400 flex-wrap">
            {items.map((it, i) => (
                <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3 h-3" />}
                    {it.href ? <Link href={it.href} className="hover:text-slate-600 hover:underline">{it.label}</Link> : <span className="text-slate-600 font-medium">{it.label}</span>}
                </span>
            ))}
        </nav>
    );
}

export function Tabs<T extends string>({ tabs, value, onChange }: {
    tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (key: T) => void;
}) {
    return (
        <div role="tablist" className="flex gap-1 border-b border-slate-200 overflow-x-auto">
            {tabs.map((t) => (
                <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
                    className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${value === t.key ? "border-primary-600 text-primary-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
                    {t.label}
                    {t.count != null && <span className="ml-1.5 text-[11px] text-slate-400">{t.count}</span>}
                </button>
            ))}
        </div>
    );
}

// ───────────── Identity ─────────────
const PALETTE = [
    "bg-primary-100 text-primary-700", "bg-teal-100 text-teal-700", "bg-accent-100 text-accent-700",
    "bg-gold-100 text-gold-700", "bg-rose-100 text-rose-700", "bg-slate-200 text-slate-700",
];

export function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
    const initials = name.replace(/^dr\.?\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
    const tone = PALETTE[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length];
    const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
    if (src) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt="" style={style} className="rounded-full object-cover shrink-0" />;
    }
    return <div style={style} aria-hidden className={`rounded-full flex items-center justify-center font-bold shrink-0 ${tone}`}>{initials}</div>;
}

export function CopyId({ value, label }: { value: string; label?: string }) {
    const [done, setDone] = useState(false);
    return (
        <button type="button" title="Copy full ID"
            onClick={() => { navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-600">
            {label ?? value.slice(0, 8)} {done ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
    );
}

// ───────────── Content blocks ─────────────
export function Panel({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={`card ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between mb-3">
                    {title && <h2 className="font-display font-semibold text-slate-800 text-[15px]">{title}</h2>}
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
    return (
        <dl className="divide-y divide-slate-50">
            {items.map((it) => (
                <div key={it.label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
                    <dt className="text-slate-400 shrink-0">{it.label}</dt>
                    <dd className="text-slate-700 text-right break-words min-w-0">{it.value ?? "—"}</dd>
                </div>
            ))}
        </dl>
    );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
    return (
        <div className="card space-y-1">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="font-display font-bold text-2xl text-slate-800 leading-tight">{value}</p>
            {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
        </div>
    );
}

const DOT = { ok: "bg-emerald-500", warn: "bg-amber-400", bad: "bg-rose-500", info: "bg-slate-300" } as const;

export function Timeline({ items }: { items: { at?: string | null; title: string; detail?: string; tone?: keyof typeof DOT }[] }) {
    return (
        <ol className="relative border-l border-slate-200 ml-2 space-y-4">
            {items.map((it, i) => (
                <li key={i} className="pl-5 relative">
                    <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${DOT[it.tone ?? "info"]}`} />
                    <p className="text-sm font-medium text-slate-700">{it.title}</p>
                    {it.detail && <p className="text-xs text-slate-500 mt-0.5">{it.detail}</p>}
                    {it.at && <p className="text-[11px] text-slate-400 mt-0.5">{fmtDateTime(it.at)}</p>}
                </li>
            ))}
        </ol>
    );
}

// ───────────── States ─────────────
export function EmptyPanel({ icon: Icon, title, text, action }: { icon: any; title: string; text?: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center text-center py-10 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Icon className="w-5 h-5 text-slate-400" /></div>
            <p className="text-sm font-semibold text-slate-600">{title}</p>
            {text && <p className="text-xs text-slate-400 mt-1 max-w-xs">{text}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function SkeletonBlock({ rows = 3 }: { rows?: number }) {
    return (
        <div className="space-y-3" aria-busy="true">
            <div className="animate-shimmer h-24 rounded-2xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].slice(0, Math.max(2, rows)).map((i) => <div key={i} className="animate-shimmer h-20 rounded-2xl" />)}</div>
            <div className="animate-shimmer h-48 rounded-2xl" />
        </div>
    );
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div className="card text-center py-10 space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <p className="text-sm text-slate-600 max-w-md mx-auto">{message}</p>
            {onRetry && <button onClick={onRetry} className="btn btn-sm btn-primary">Try again</button>}
        </div>
    );
}

// ───────────── Destructive actions: type the word to confirm ─────────────
export function TypedConfirmDialog(props: {
    open: boolean; title: string; message: string; word: string; confirmLabel?: string;
    loading?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
    const [typed, setTyped] = useState("");
    useEffect(() => { if (!props.open) setTyped(""); }, [props.open]);
    if (!props.open) return null;
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/30" onClick={props.onCancel}>
            <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm animate-fade-up" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display font-semibold text-slate-800">{props.title}</h3>
                <p className="text-sm text-slate-500 mt-1.5">{props.message}</p>
                <p className="text-xs text-slate-500 mt-4">Type <span className="font-mono font-bold text-rose-600">{props.word}</span> to confirm</p>
                <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus className="input-field mt-1.5" />
                <div className="flex justify-end gap-2 mt-5">
                    <button onClick={props.onCancel} disabled={props.loading} className="btn btn-sm btn-secondary">Cancel</button>
                    <button onClick={props.onConfirm} disabled={props.loading || typed !== props.word} className="btn btn-sm btn-danger">
                        {props.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {props.confirmLabel ?? "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}