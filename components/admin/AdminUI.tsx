"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";

// ───────────────────────── Toasts ─────────────────────────
type ToastType = "success" | "error";
interface ToastItem { id: number; type: ToastType; message: string }

const ToastContext = createContext<(type: ToastType, message: string) => void>(() => { });

/** Usage:  const toast = useToast();  toast("success", "Saved!") */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);

    const push = useCallback((type: ToastType, message: string) => {
        const id = Date.now() + Math.random();
        setItems((list) => [...list, { id, type, message }]);
        setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 3500);
    }, []);

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-xs">
                {items.map((t) => (
                    <div
                        key={t.id}
                        className={`flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg text-sm animate-fade-up border ${t.type === "success"
                                ? "bg-white border-green-200 text-green-700"
                                : "bg-white border-rose-200 text-rose-700"
                            }`}
                    >
                        {t.type === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                        <span className="flex-1">{t.message}</span>
                        <button onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} className="text-slate-300 hover:text-slate-500">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// ───────────────────── Confirm dialog ─────────────────────
export function ConfirmDialog(props: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!props.open) return null;
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/30" onClick={props.onCancel}>
            <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-sm animate-fade-up" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display font-semibold text-slate-800">{props.title}</h3>
                <p className="text-sm text-slate-500 mt-1.5">{props.message}</p>
                <div className="flex justify-end gap-2 mt-5">
                    <button onClick={props.onCancel} disabled={props.loading} className="btn btn-sm btn-secondary">Cancel</button>
                    <button onClick={props.onConfirm} disabled={props.loading} className={`btn btn-sm ${props.danger ? "btn-danger" : "btn-primary"}`}>
                        {props.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {props.confirmLabel ?? "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ───────────────────── Small helpers ──────────────────────
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
                <h1 className="font-display font-bold text-2xl text-slate-800">{title}</h1>
                {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
            </div>
            {right}
        </div>
    );
}

export function EmptyState({ text }: { text: string }) {
    return <div className="card text-center py-10 text-sm text-slate-400">{text}</div>;
}

const STATUS_CLASS: Record<string, string> = {
    active: "badge-green", completed: "badge-navy", waiting: "badge-gold",
    missed: "badge-rose", cancelled: "badge-slate", follow_up: "badge-mint",
};
export function StatusBadge({ status }: { status: string }) {
    return <span className={`badge ${STATUS_CLASS[status] ?? "badge-slate"}`}>{status.replace("_", " ")}</span>;
}

export function timeAgo(date: string | null | undefined): string {
    if (!date) return "—";
    const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    if (secs < 86400 * 30) return `${Math.floor(secs / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
}