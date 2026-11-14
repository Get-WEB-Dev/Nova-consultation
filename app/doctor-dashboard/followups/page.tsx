"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, CalendarCheck, CalendarClock, Check, MessageSquare, FolderOpen, ChevronLeft, ChevronRight, List,
  CalendarDays, AlertCircle, RefreshCw, Clock, AlertTriangle, CheckCircle2, Loader2, ArrowRight,
} from "lucide-react";
import { startPolling } from "@/lib/polling";
import { getUser, loadUser } from "@/lib/supabase/auth";
import { notifyError } from "@/lib/auth-fetch";
import { Avatar, NAV_BG, ACCENT } from "@/components/doctor/ui";
import { PriorityPill, RescheduleDialog, dueInfo, dayKey, TONE_STYLE, type RescheduleValues } from "@/components/doctor/followup";

interface FollowUp {
  id: string; patientId: string; patientName: string; patientAvatar: string; status: string; reason: string;
  instructions: string; scheduledAt: string | null; priority: string; consultationId: string;
}

const JSON_HEADERS = { "Content-Type": "application/json" };
const CHIPS = [["open", "Open"], ["overdue", "Overdue"], ["completed", "Completed"], ["all", "All"]] as const;
type Chip = (typeof CHIPS)[number][0];

const isOpen = (f: FollowUp) => f.status === "pending" || f.status === "missed";
const isOverdue = (f: FollowUp) => isOpen(f) && !!f.scheduledAt && new Date(f.scheduledAt).getTime() < Date.now();
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };

function bucket(f: FollowUp): string {
  if (!isOpen(f)) return f.status === "completed" ? "Completed" : "Cancelled";
  if (isOverdue(f)) return "Overdue";
  const diff = Math.round((startOfDay(new Date(f.scheduledAt!)) - startOfDay(new Date())) / 86400000);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff < 7 ? "This week" : "Later";
}
const ORDER = ["Overdue", "Today", "Tomorrow", "This week", "Later", "Completed", "Cancelled"];

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"agenda" | "calendar">("agenda");
  const [chip, setChip] = useState<Chip>("open");
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resched, setResched] = useState<FollowUp | null>(null);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<string>(() => dayKey(new Date().toISOString()));

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const u = getUser() ?? (await loadUser());
      if (!u) throw new Error("Please sign in again");
      const res = await fetch(`/api/follow-ups?doctorId=${u.id}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not load your follow-ups");
      setItems((j.data ?? []).filter((f: FollowUp) => f.scheduledAt));
      setError(null);
    } catch (e: any) { if (!quiet) setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); return startPolling(() => load(true), 30000); }, [load]);

  // ── Actions ──
  const complete = async (f: FollowUp) => {
    const before = items; setBusyId(f.id);
    setItems((l) => l.map((x) => (x.id === f.id ? { ...x, status: "completed" } : x)));
    try {
      const res = await fetch("/api/follow-ups", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ consultationId: f.consultationId, status: "completed" }) });
      if (!res.ok) throw new Error();
    } catch { setItems(before); notifyError("Couldn't mark it as completed. Please try again."); }
    finally { setBusyId(null); }
  };

  const reschedule = async (f: FollowUp, v: RescheduleValues) => {
    setSaving(true);
    try {
      const res = await fetch("/api/follow-ups", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ consultationId: f.consultationId, ...v }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn't reschedule");
      setItems((l) => l.map((x) => (x.id === f.id ? { ...x, status: "pending", scheduledAt: v.scheduledAt, priority: v.priority, instructions: v.instructions } : x)));
      setResched(null);
    } catch { /* the red toast shows the server's reason; keep the dialog open to try again */ }
    finally { setSaving(false); }
  };

  // ── Derived ──
  const todayKey = dayKey(new Date().toISOString());
  const stats = useMemo(() => ({
    upcoming: items.filter((f) => isOpen(f) && !isOverdue(f)).length,
    today: items.filter((f) => isOpen(f) && f.scheduledAt && dayKey(f.scheduledAt) === todayKey).length,
    overdue: items.filter(isOverdue).length,
    done: items.filter((f) => { const d = new Date(f.scheduledAt!); const n = new Date(); return f.status === "completed" && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length,
  }), [items, todayKey]);

  const counts = useMemo(() => ({
    open: items.filter(isOpen).length, overdue: items.filter(isOverdue).length,
    completed: items.filter((f) => f.status === "completed").length, all: items.length,
  }), [items]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((f) => chip === "all" ? true : chip === "open" ? isOpen(f) : chip === "overdue" ? isOverdue(f) : f.status === chip)
      .filter((f) => priority === "all" || f.priority === priority)
      .filter((f) => !term || f.patientName.toLowerCase().includes(term) || f.reason.toLowerCase().includes(term))
      .sort((a, b) => +new Date(a.scheduledAt!) - +new Date(b.scheduledAt!));
  }, [items, chip, priority, q]);

  const groups = ORDER.map((g) => ({ label: g, rows: filtered.filter((f) => bucket(f) === g) })).filter((g) => g.rows.length);

  // calendar
  const byDay = useMemo(() => { const m = new Map<string, FollowUp[]>(); filtered.forEach((f) => { const k = dayKey(f.scheduledAt!); m.set(k, [...(m.get(k) ?? []), f]); }); return m; }, [filtered]);
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  }, [month]);
  const dayList = byDay.get(selectedDay) ?? [];

  const renderCard = (f: FollowUp) => {
    const info = dueInfo(f.scheduledAt, f.status === "missed" ? "pending" : f.status);
    const tone = TONE_STYLE[isOverdue(f) ? "overdue" : info.tone];
    const open = isOpen(f);
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="flex items-start gap-3.5">
          <Avatar name={f.patientName} src={f.patientAvatar} size={46} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/doctor-dashboard/followups/${f.id}`} className="font-display font-bold text-[15px] text-slate-900 hover:underline">{f.patientName}</Link>
              <PriorityPill priority={f.priority} />
            </div>
            <p className="text-[13px] text-slate-500 mt-0.5 line-clamp-1">{f.reason}</p>
            {f.instructions && <p className="text-[12px] text-slate-400 mt-1 line-clamp-1">Note: {f.instructions}</p>}
          </div>
          <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: tone.bg, color: tone.fg }}>{info.label}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-3.5 pt-3.5 border-t border-slate-100">
          {open && (<>
            <button onClick={() => complete(f)} disabled={busyId === f.id} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-[12.5px] font-bold disabled:opacity-60" style={{ background: ACCENT }}>
              {busyId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Mark done
            </button>
            <button onClick={() => setResched(f)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50"><CalendarClock className="w-3.5 h-3.5" /> Reschedule</button>
          </>)}
          <Link href={`/doctor-dashboard/messages?patient=${f.patientId}`} aria-label="Message patient" className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"><MessageSquare className="w-4 h-4" /></Link>
          <Link href={`/doctor-dashboard/history/${f.consultationId}`} aria-label="Open consultation record" className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"><FolderOpen className="w-4 h-4" /></Link>
          <Link href={`/doctor-dashboard/followups/${f.id}`} className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-bold hover:underline" style={{ color: ACCENT }}>Details <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-extrabold text-[20px] text-slate-900">Follow-ups</h2>
          <p className="text-[12.5px] text-slate-400 mt-0.5">Patients you asked to come back. Reminders go to you and the patient 24 hours before.</p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
          {([["agenda", "Agenda", List], ["calendar", "Calendar", CalendarDays]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setView(k)} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold ${view === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}><Icon className="w-3.5 h-3.5" />{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200" />)}</div>{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-white border border-slate-200" />)}</div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl text-center py-14 px-6 max-w-md mx-auto">
          <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" /><p className="font-display font-bold text-slate-800 mt-3">{error}</p>
          <button onClick={() => load()} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: NAV_BG }}><RefreshCw className="w-4 h-4" /> Try again</button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl text-center py-16 px-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><CalendarCheck className="w-7 h-7 text-slate-300" /></div>
          <p className="font-display font-bold text-slate-800">No follow-ups yet</p>
          <p className="text-[13px] text-slate-400 mt-1 max-w-sm mx-auto">When you finish a consultation and choose &ldquo;Needs follow-up&rdquo;, it will be scheduled here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Clock, label: "Upcoming", value: stats.upcoming, color: "#0d7b74" },
              { icon: CalendarClock, label: "Due today", value: stats.today, color: "#b45309" },
              { icon: AlertTriangle, label: "Overdue", value: stats.overdue, color: stats.overdue ? "#be123c" : "#64748b" },
              { icon: CheckCircle2, label: "Done this month", value: stats.done, color: "#15803d" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
                <Icon className="w-4 h-4" style={{ color }} />
                <p className="font-display font-extrabold text-[26px] text-slate-900 mt-2 leading-none tabular-nums">{value}</p>
                <p className="text-[12px] text-slate-400 mt-1.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient or reason…" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-teal-500" />
              </div>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 outline-none">
                <option value="all">All priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {CHIPS.map(([k, label]) => (
                <button key={k} onClick={() => setChip(k)} className={`px-3 py-1 rounded-full text-[12px] font-bold ${chip === k ? "text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`} style={chip === k ? { background: NAV_BG } : undefined}>
                  {label} <span className="opacity-70">· {counts[k]}</span>
                </button>
              ))}
            </div>
          </div>

          {view === "agenda" ? (
            filtered.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl text-center py-14 px-6"><Search className="w-8 h-8 text-slate-300 mx-auto" /><p className="font-display font-bold text-slate-700 mt-3">Nothing here</p><p className="text-[13px] text-slate-400 mt-1">Try a different filter.</p></div>
            ) : (
              <div className="space-y-6">
                {groups.map((g) => (
                  <section key={g.label}>
                    <h3 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide mb-2.5" style={{ color: g.label === "Overdue" ? "#be123c" : "#64748b" }}>{g.label}<span className="text-slate-300">· {g.rows.length}</span></h3>
                    <div className="space-y-3">{g.rows.map((f) => <div key={f.id}>{renderCard(f)}</div>)}</div>
                  </section>
                ))}
              </div>
            )
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-extrabold text-[16px] text-slate-900">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(todayKey); }} className="px-3 h-9 rounded-xl border border-slate-200 text-[12.5px] font-bold text-slate-600 hover:bg-slate-50">Today</button>
                    <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-1">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="text-[11px] font-bold text-slate-400 py-1">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((d, i) => {
                    if (!d) return <div key={`b${i}`} />;
                    const k = dayKey(d.toISOString()), list = byDay.get(k) ?? [], sel = k === selectedDay, isToday = k === todayKey;
                    return (
                      <button key={k} onClick={() => setSelectedDay(k)} aria-label={`${d.toDateString()}, ${list.length} follow-ups`}
                        className={`aspect-square sm:aspect-[4/3] rounded-xl border text-left p-1.5 flex flex-col transition-colors ${sel ? "border-teal-600 bg-teal-50" : "border-slate-100 hover:bg-slate-50"}`}>
                        <span className={`text-[12.5px] font-bold w-6 h-6 rounded-full flex items-center justify-center ${isToday ? "text-white" : "text-slate-700"}`} style={isToday ? { background: NAV_BG } : undefined}>{d.getDate()}</span>
                        {list.length > 0 && (
                          <span className="mt-auto flex items-center gap-0.5 flex-wrap">
                            {list.slice(0, 3).map((f) => <span key={f.id} className="w-1.5 h-1.5 rounded-full" style={{ background: f.status === "completed" ? "#94a3b8" : isOverdue(f) ? "#e11d48" : f.priority === "high" ? "#e11d48" : f.priority === "low" ? "#16a34a" : "#d97706" }} />)}
                            {list.length > 3 && <span className="text-[10px] font-bold text-slate-500">+{list.length - 3}</span>}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-display font-bold text-[14.5px] text-slate-900">{new Date(selectedDay + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</h3>
                {dayList.length === 0 ? <div className="bg-white border border-slate-200 rounded-2xl text-center py-10 text-[13px] text-slate-400">No follow-ups on this day</div>
                  : dayList.map((f) => <div key={f.id}>{renderCard(f)}</div>)}
              </div>
            </div>
          )}
        </>
      )}

      <RescheduleDialog open={!!resched} patientName={resched?.patientName ?? ""} initialAt={resched?.scheduledAt} initialPriority={resched?.priority} initialPlan={resched?.instructions}
        saving={saving} onSave={(v) => resched && reschedule(resched, v)} onClose={() => setResched(null)} />
    </div>
  );
}