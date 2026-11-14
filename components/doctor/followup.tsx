"use client";

/** Shared follow-up pieces: priority pill, "due" wording, and the reschedule dialog. */
import { useEffect, useState } from "react";
import { X, Loader2, CalendarClock } from "lucide-react";
import { NAV_BG } from "@/components/doctor/ui";

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

const P_STYLE: Record<string, { bg: string; fg: string }> = {
  high: { bg: "#fff1f2", fg: "#be123c" },
  medium: { bg: "#fffbeb", fg: "#b45309" },
  low: { bg: "#f0fdf4", fg: "#15803d" },
};
export function PriorityPill({ priority }: { priority?: string | null }) {
  const p = P_STYLE[priority ?? "medium"] ?? P_STYLE.medium;
  return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full capitalize whitespace-nowrap" style={{ background: p.bg, color: p.fg }}>{priority || "medium"}</span>;
}

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
export const dayKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** How soon is it? Gives the wording and a tone for colouring. */
export function dueInfo(iso: string | null | undefined, status: string): { label: string; tone: "overdue" | "today" | "soon" | "later" | "done" } {
  if (status === "completed") return { label: "Completed", tone: "done" };
  if (status === "cancelled") return { label: "Cancelled", tone: "done" };
  if (!iso) return { label: "No time set", tone: "later" };
  const at = new Date(iso), now = new Date();
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (at.getTime() < now.getTime()) {
    const hrs = Math.round((now.getTime() - at.getTime()) / 3600000);
    const days = Math.round(hrs / 24);
    return { label: hrs < 1 ? "Just passed" : hrs < 24 ? `Overdue by ${hrs} h` : `Overdue by ${days} day${days === 1 ? "" : "s"}`, tone: "overdue" };
  }
  const diff = Math.round((startOfDay(at) - startOfDay(now)) / 86400000);
  if (diff === 0) return { label: `Today · ${time}`, tone: "today" };
  if (diff === 1) return { label: `Tomorrow · ${time}`, tone: "soon" };
  if (diff < 7) return { label: `${at.toLocaleDateString(undefined, { weekday: "long" })} · ${time}`, tone: "soon" };
  return { label: `${at.toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${time}`, tone: "later" };
}
export const TONE_STYLE = {
  overdue: { bg: "#fff1f2", fg: "#be123c" }, today: { bg: "#fffbeb", fg: "#b45309" },
  soon: { bg: "#effefb", fg: "#0d7b74" }, later: { bg: "#f1f5f9", fg: "#475569" }, done: { bg: "#f1f5f9", fg: "#64748b" },
} as const;

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in the user's own time zone
export const toLocalInput = (iso?: string | null) => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 86400000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export interface RescheduleValues { scheduledAt: string; priority: Priority; instructions: string }

export function RescheduleDialog({ open, patientName, initialAt, initialPriority, initialPlan, saving, onSave, onClose }: {
  open: boolean; patientName: string; initialAt?: string | null; initialPriority?: string | null; initialPlan?: string | null;
  saving: boolean; onSave: (v: RescheduleValues) => void; onClose: () => void;
}) {
  const [when, setWhen] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [plan, setPlan] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // start from the current time if it is still in the future, otherwise tomorrow at the same time
    const t = initialAt && new Date(initialAt).getTime() > Date.now() ? initialAt : null;
    setWhen(toLocalInput(t));
    setPriority((PRIORITIES as readonly string[]).includes(initialPriority ?? "") ? (initialPriority as Priority) : "medium");
    setPlan(initialPlan ?? ""); setError(null);
  }, [open, initialAt, initialPriority, initialPlan]);

  if (!open) return null;

  const quick = (days: number) => {
    const base = new Date(when || toLocalInput());
    const d = new Date(); d.setDate(d.getDate() + days); d.setHours(base.getHours(), base.getMinutes(), 0, 0);
    setWhen(toLocalInput(d.toISOString()));
  };
  const submit = () => {
    const t = new Date(when);
    if (!when || Number.isNaN(t.getTime())) return setError("Pick a date and time.");
    if (t.getTime() < Date.now()) return setError("Choose a time in the future.");
    setError(null);
    onSave({ scheduledAt: t.toISOString(), priority, instructions: plan.trim() });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40" onClick={onClose}>
      <div role="dialog" aria-label="Reschedule follow-up" className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-5 shadow-float max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0"><CalendarClock className="w-5 h-5 text-teal-700" /></span>
            <div className="min-w-0"><h3 className="font-display font-extrabold text-[16px] text-slate-900">Reschedule follow-up</h3><p className="text-[12.5px] text-slate-400 truncate">{patientName}</p></div>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <label className="block mt-5 text-[11px] font-bold uppercase tracking-wide text-slate-400">New date &amp; time</label>
        <input type="datetime-local" value={when} min={toLocalInput(new Date().toISOString())} onChange={(e) => setWhen(e.target.value)}
          className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-800 outline-none focus:border-teal-500" />
        <div className="flex gap-2 mt-2 flex-wrap">
          {[["Tomorrow", 1], ["In 3 days", 3], ["In 1 week", 7], ["In 2 weeks", 14]].map(([label, d]) => (
            <button key={label as string} type="button" onClick={() => quick(d as number)} className="px-3 py-1.5 rounded-full bg-slate-100 text-[12px] font-bold text-slate-600 hover:bg-slate-200">{label}</button>
          ))}
        </div>

        <label className="block mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">Priority</label>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {PRIORITIES.map((p) => (
            <button key={p} type="button" onClick={() => setPriority(p)} className={`py-2.5 rounded-xl text-[13px] font-bold capitalize border ${priority === p ? "text-white border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`} style={priority === p ? { background: NAV_BG } : undefined}>{p}</button>
          ))}
        </div>

        <label className="block mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">Instructions for the visit</label>
        <textarea value={plan} onChange={(e) => setPlan(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. Bring recent blood test results"
          className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-800 outline-none focus:border-teal-500 resize-none" />

        {error && <p role="alert" className="mt-3 text-[12.5px] font-semibold text-rose-600">{error}</p>}
        <p className="mt-3 text-[11.5px] text-slate-400">The patient is notified of the new time.</p>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-[13.5px] font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 py-3 rounded-xl text-white text-[13.5px] font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2" style={{ background: NAV_BG }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save new time
          </button>
        </div>
      </div>
    </div>
  );
}