"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users, CheckCircle2, Clock, Zap, Play, Stethoscope, ChevronRight, SkipForward, FileText, Pill,
  AlertCircle, CalendarDays, Video, Star, BarChart3, MessageSquare, BookOpen, Minus, Plus,
  Activity, TrendingUp, RefreshCw,
} from "lucide-react";
import { startPolling } from "@/lib/polling";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import { Card, Avatar, NAV_BG, NAV_DARK, ACCENT, TEAL, SKY } from "@/components/doctor/ui";

// ── Types ─────────────────────────────────────────────────────
interface Profile {
  specialty: string; status: string; fee: number; patients_served: number;
  rating: number; review_count: number; experience_years: number; hospital: string | null;
}
interface QueuePatient {
  id: string; patientName: string; patientAvatar?: string; symptoms?: string; duration?: string;
  severity?: string; notes?: string; joinedAt: string; queuePosition: number;
}
interface ConsultSummary { patientName: string; issue: string; durationMinutes: number }
interface FollowUpItem { id: string; patientName: string; reason: string; scheduledAt: string; status?: string }
interface PendingTask { id: string; type: "note" | "prescription"; patientName: string; details: string }

// ── Small helpers ─────────────────────────────────────────────
const waitMinutes = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
const waitTone = (m: number) => (m >= 20 ? "#e11d48" : m >= 10 ? "#d97706" : "#64748b");

function whenLabel(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - start.getTime()) / 86400000);
  if (diff === 0) return `Today · ${time}`;
  if (diff === 1) return `Tomorrow · ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
}

// ── Building blocks ───────────────────────────────────────────
function StatusSwitch({ online, busy, onChange }: { online: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch" aria-checked={online} disabled={busy} onClick={() => onChange(!online)}
      className={`flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl border transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${online ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}
    >
      <span className="text-left leading-tight">
        <span className={`block text-[13px] font-bold ${online ? "text-emerald-700" : "text-slate-600"}`}>{online ? "You're online" : "You're offline"}</span>
        <span className="block text-[11px] text-slate-400">{online ? "Accepting patients" : "Tap to start accepting"}</span>
      </span>
      <span className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${online ? "bg-emerald-500" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${online ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function SeverityBadge({ severity }: { severity?: string }) {
  if (!severity) return null;
  const cfg: Record<string, { bg: string; text: string; border: string }> = {
    Severe: { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
    Moderate: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
    Mild: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  };
  const s = cfg[severity] ?? cfg.Mild;
  return <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full border" style={{ background: s.bg, color: s.text, borderColor: s.border }}>{severity}</span>;
}

function Kpi({ icon: Icon, label, value, sub, tint, color }: { icon: any; label: string; value: string | number; sub?: string; tint: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-semibold text-slate-500">{label}</p>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tint }}><Icon className="w-4 h-4" style={{ color }} /></span>
      </div>
      <p className="font-display font-extrabold text-[28px] leading-none text-slate-900 mt-3 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1.5 truncate">{sub}</p>}
    </Card>
  );
}

function SectionCard({ title, icon: Icon, iconColor = ACCENT, href, hrefLabel = "View all", children }: {
  title: string; icon: any; iconColor?: string; href?: string; hrefLabel?: string; children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-[14.5px] text-slate-900 flex items-center gap-2">
          <Icon className="w-[18px] h-[18px]" style={{ color: iconColor }} /> {title}
        </h3>
        {href && (
          <Link href={href} className="text-[12px] font-semibold flex items-center gap-0.5 hover:underline" style={{ color: ACCENT }}>
            {hrefLabel} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}

function NextUpCard({ p, onStart, onSkip, canSkip }: { p: QueuePatient; onStart: () => void; onSkip: () => void; canSkip: boolean }) {
  const mins = waitMinutes(p.joinedAt);
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `${NAV_BG}` }} />
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ background: "#effefb", color: ACCENT }}>Next up</span>
        <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: waitTone(mins) }}>
          <Clock className="w-3.5 h-3.5" /> Waiting {mins} min
        </span>
      </div>
      <div className="flex items-start gap-4">
        <Avatar name={p.patientName} src={p.patientAvatar} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-extrabold text-[17px] text-slate-900">{p.patientName}</p>
            <SeverityBadge severity={p.severity} />
          </div>
          <p className="text-[13px] text-slate-600 mt-1 line-clamp-2">{p.symptoms || "No symptoms specified"}</p>
          {p.duration && <p className="text-[12px] text-slate-400 mt-1">Symptoms for {p.duration}</p>}
        </div>
      </div>
      <div className="flex gap-2.5 mt-5">
        <button onClick={onStart} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-[14px] text-white transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2"
          style={{ background: `${NAV_BG}`, boxShadow: "0 1px 3px rgba(16,36,63,0.12)" }}>
          <Play className="w-4 h-4 fill-white" /> Start consultation
        </button>
        {canSkip && (
          <button onClick={onSkip} className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[13px] flex items-center gap-1.5 hover:bg-slate-50">
            <SkipForward className="w-4 h-4" /> Skip
          </button>
        )}
      </div>
    </Card>
  );
}

function QueueRow({ p, pos, onStart }: { p: QueuePatient; pos: number; onStart: () => void }) {
  const mins = waitMinutes(p.joinedAt);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">{pos}</span>
      <Avatar name={p.patientName} src={p.patientAvatar} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-bold text-[13.5px] text-slate-900 truncate">{p.patientName}</p>
          <SeverityBadge severity={p.severity} />
        </div>
        <p className="text-[12px] text-slate-400 truncate">{p.symptoms || "No symptoms specified"}</p>
      </div>
      <span className="hidden sm:block text-[11.5px] font-semibold shrink-0" style={{ color: waitTone(mins) }}>{mins} min</span>
      <button onClick={onStart} aria-label={`Start consultation with ${p.patientName}`}
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white hover:opacity-90" style={{ background: ACCENT }}>
        <Play className="w-3.5 h-3.5 fill-white" />
      </button>
    </div>
  );
}

function Stepper({ label, value, onDec, onInc }: { label: string; value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <button onClick={onDec} aria-label={`Decrease ${label}`} className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50"><Minus className="w-4 h-4" /></button>
        <span className="flex-1 text-center font-display font-extrabold text-[20px] text-slate-900 tabular-nums">{value}</span>
        <button onClick={onInc} aria-label={`Increase ${label}`} className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function DoctorHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [lastConsult, setLastConsult] = useState<ConsultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);

  // Session planner
  const [maxPatients, setMaxPatients] = useState(10);
  const [avgTime, setAvgTime] = useState(15);
  const [sessionFee, setSessionFee] = useState(0);

  const [loadTick, setLoadTick] = useState(0);

  useEffect(() => {
    const u = getUser();
    if (!u) return;
    setUser(u);

    const loadData = () =>
      Promise.all([
        fetch(`/api/doctor/profile?doctorId=${u.id}`).then((r) => r.json()),
        fetch(`/api/queue?doctorId=${u.id}`).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch(`/api/doctor/consultations?doctorId=${u.id}&limit=60`).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch(`/api/follow-ups?doctorId=${u.id}`).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch(`/api/doctor/pending-tasks?doctorId=${u.id}`).then((r) => r.json()).catch(() => ({ data: [] })),
      ])
        .then(([p, q, c, f, t]) => {
          if (p.data) {
            setProfile(p.data);
            setIsOnline(["available", "in_consultation"].includes(p.data.status));
            setSessionFee((prev) => prev || p.data.fee || 0);
            setLoadFailed(false);
          } else {
            setLoadFailed(true);
          }

          const sorted = [...(q.data || [])].sort((a: any, b: any) => {
            const order: Record<string, number> = { Severe: 0, Moderate: 1, Mild: 2 };
            return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
          });
          setQueue(sorted.map((e: any, i: number) => ({
            id: e.id,
            patientName: e.patientName || e.patient_name || "Patient",
            patientAvatar: e.patientAvatar,
            symptoms: e.symptoms,
            duration: e.duration,
            severity: e.severity,
            notes: e.notes,
            joinedAt: e.joinedAt || e.joined_at || new Date().toISOString(),
            queuePosition: i + 1,
          })));

          const today = new Date().toDateString();
          const done = (c.data || []).filter((x: any) =>
            (x.status === "completed" || x.status === "follow_up") &&
            new Date(x.endedAt || x.created_at).toDateString() === today);
          setCompletedToday(done.length);

          const allDone = (c.data || []).filter((x: any) => x.status === "completed" || x.status === "follow_up");
          if (allDone.length) {
            const last = allDone.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            setLastConsult({
              patientName: last.patientName || "Patient",
              issue: last.diagnosis || last.summary || last.notes || "General consultation",
              durationMinutes: last.durationMinutes || 0,
            });
          }

          if (f.data) {
            setFollowUps(f.data.map((x: any) => ({
              id: x.id,
              patientName: x.patientName || x.users?.name || "Patient",
              reason: x.reason || x.diagnosis || x.summary || "Follow-up",
              scheduledAt: x.scheduledAt || x.follow_up_scheduled_at,
              status: x.status,
            })));
          }
          if (t.data) setPendingTasks(t.data);
        })
        .catch(() => setLoadFailed(true))
        .finally(() => setLoading(false));

    loadData();
    return startPolling(loadData, 10000);
  }, [loadTick]);

  const toggleStatus = async (val: boolean) => {
    if (!user || toggling) return;
    // Don't strand waiting patients by accident
    if (!val && queue.length > 0 &&
      !window.confirm(`${queue.length} patient${queue.length > 1 ? "s are" : " is"} still waiting. Go offline anyway?`)) {
      return;
    }
    setToggling(true);
    const previous = isOnline;
    setIsOnline(val); // optimistic: feels instant
    try {
      const status = val ? "available" : "offline";
      const res = await fetch("/api/doctor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: user.id, status }),
      });
      if (!res.ok) throw new Error("status update failed");
      window.dispatchEvent(new CustomEvent("nova:doctor-status", { detail: { status } })); // keep the sidebar in sync
    } catch {
      setIsOnline(previous); // the server kept the old status — show the truth
    }
    setToggling(false);
  };

  // Skipped patients go to the back of the line — and stay there across refreshes
  const orderedQueue = useMemo(
    () => [...queue.filter((p) => !skipped.includes(p.id)), ...queue.filter((p) => skipped.includes(p.id))],
    [queue, skipped],
  );

  const upcoming = useMemo(
    () => followUps
      .filter((f) => (!f.status || f.status === "pending") && f.scheduledAt)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 4),
    [followUps],
  );

  const startConsult = (id: string) => router.push(`/doctor-dashboard/consult?patientId=${id}`);

  const estimatedTotal = maxPatients * avgTime;
  const estH = Math.floor(estimatedTotal / 60);
  const estM = estimatedTotal % 60;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  // ── Loading skeleton ──
  if (loading && !profile) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-28 bg-white rounded-2xl border border-slate-100" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100" />)}</div>
        <div className="grid lg:grid-cols-3 gap-5"><div className="lg:col-span-2 h-72 bg-white rounded-2xl border border-slate-100" /><div className="h-72 bg-white rounded-2xl border border-slate-100" /></div>
      </div>
    );
  }

  if (loadFailed && !profile) {
    return (
      <Card className="text-center py-14 px-6 max-w-md mx-auto">
        <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" />
        <p className="font-display font-bold text-slate-800 mt-3">We couldn't load your dashboard</p>
        <p className="text-[13px] text-slate-500 mt-1">Check your connection and try again.</p>
        <button onClick={() => { setLoading(true); setLoadTick((t) => t + 1); }} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: NAV_BG }}>
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </Card>
    );
  }

  const rating = Number(profile?.rating ?? 0);

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ── Welcome + status ── */}
      <Card className="p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: "transparent" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold text-slate-400">{dateLabel}</p>
            <h2 className="font-display font-extrabold text-[22px] sm:text-[26px] text-slate-900 leading-tight mt-0.5">{greeting}, Dr. {user?.name?.split(" ")[0]}</h2>
            <p className="text-[13px] text-slate-500 mt-1">
              {isOnline
                ? queue.length > 0 ? `${queue.length} patient${queue.length > 1 ? "s are" : " is"} waiting for you.` : "You're live — waiting for patients to join."
                : "Go online when you're ready to see patients."}
            </p>
          </div>
          <StatusSwitch online={isOnline} busy={toggling} onChange={toggleStatus} />
        </div>
      </Card>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi icon={Users} label="Waiting now" value={queue.length} sub={isOnline ? "in your queue" : "go online to receive"} tint="#fffbeb" color="#d97706" />
        <Kpi icon={CheckCircle2} label="Seen today" value={completedToday} sub="consultations" tint="#ecfdf5" color="#059669" />
        <Kpi icon={Star} label="Rating" value={rating > 0 ? rating.toFixed(1) : "—"} sub={`${profile?.review_count ?? 0} review${profile?.review_count === 1 ? "" : "s"}`} tint="#fef9c3" color="#ca8a04" />
        <Kpi icon={Activity} label="Patients served" value={(profile?.patients_served ?? 0).toLocaleString()} sub={profile?.experience_years ? `${profile.experience_years} yrs experience` : undefined} tint="#effefb" color={ACCENT} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          {!isOnline ? (
            <>
              <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden text-white"
                style={{ background: `${NAV_DARK}`, boxShadow: "0 1px 3px rgba(16,36,63,0.12)" }}>
                <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full pointer-events-none" style={{ background: "transparent" }} />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: SKY }}>Ready to consult?</p>
                    <h3 className="font-display font-extrabold text-[21px] sm:text-[24px] leading-tight mt-1">Start your consultation session</h3>
                    <p className="text-[13px] text-white/60 mt-1.5">Up to {maxPatients} patients · {avgTime} min average · {sessionFee.toLocaleString()} Birr per session</p>
                  </div>
                  <button onClick={() => toggleStatus(true)} disabled={toggling}
                    className="shrink-0 flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-[14px] transition-transform active:scale-[0.98] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a3558]"
                    style={{ background: TEAL, color: NAV_DARK, boxShadow: "0 1px 3px rgba(16,36,63,0.12)" }}>
                    <Zap className="w-5 h-5" /> Go online now
                  </button>
                </div>
              </div>

              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-bold text-[15px] text-slate-900">Plan your session</h3>
                  <span className="text-[11px] text-slate-400">Estimates only</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-5">
                  <Stepper label="Max patients" value={maxPatients} onDec={() => setMaxPatients((p) => Math.max(1, p - 1))} onInc={() => setMaxPatients((p) => p + 1)} />
                  <Stepper label="Avg. minutes" value={avgTime} onDec={() => setAvgTime((t) => Math.max(5, t - 5))} onInc={() => setAvgTime((t) => t + 5)} />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Fee (Birr)</p>
                    <input type="number" min={0} value={sessionFee} onChange={(e) => setSessionFee(Math.max(0, +e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[16px] font-display font-extrabold text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    { icon: Clock, label: "Est. duration", value: `${estH > 0 ? `${estH}h ` : ""}${estM}m` },
                    { icon: Users, label: "Queue cap", value: `${maxPatients}` },
                    { icon: TrendingUp, label: "Potential revenue", value: `${(sessionFee * maxPatients).toLocaleString()}` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <Icon className="w-4 h-4 mb-1.5" style={{ color: ACCENT }} />
                      <p className="font-display font-extrabold text-[16px] text-slate-900 tabular-nums">{value}</p>
                      <p className="text-[10.5px] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-[16px] text-slate-900 flex items-center gap-2">
                  Live queue
                  {queue.length > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: ACCENT }}>{queue.length}</span>}
                </h3>
                <span className="text-[11.5px] text-slate-400">Most urgent first</span>
              </div>

              {orderedQueue.length === 0 ? (
                <Card className="text-center py-14 px-6 border-dashed">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#effefb" }}>
                      <Stethoscope className="w-7 h-7" style={{ color: ACCENT }} />
                    </div>
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 animate-ping opacity-40" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <p className="font-display font-bold text-slate-800">You're live — no one is waiting yet</p>
                  <p className="text-[12.5px] text-slate-400 mt-1 max-w-xs mx-auto">New patients appear here the moment they join your queue. This page refreshes automatically.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  <NextUpCard
                    p={orderedQueue[0]}
                    canSkip={orderedQueue.length > 1}
                    onStart={() => startConsult(orderedQueue[0].id)}
                    onSkip={() => setSkipped((s) => [...s.filter((id) => id !== orderedQueue[0].id), orderedQueue[0].id])}
                  />
                  {orderedQueue.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pt-1">Then</p>
                      {orderedQueue.slice(1).map((p, i) => <QueueRow key={p.id} p={p} pos={i + 2} onStart={() => startConsult(p.id)} />)}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── Side column (stacks on phones, 2-up on tablets) ── */}
        <div className="grid md:grid-cols-2 lg:grid-cols-1 gap-5 min-w-0">
          <SectionCard title="Upcoming follow-ups" icon={CalendarDays} href="/doctor-dashboard/followups">
            {upcoming.length === 0 ? (
              <p className="text-[12.5px] text-slate-400 text-center py-5">No follow-ups scheduled</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((fu) => {
                  const overdue = new Date(fu.scheduledAt) < new Date();
                  return (
                    <div key={fu.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/80">
                      <Avatar name={fu.patientName} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-800 truncate">{fu.patientName}</p>
                        <p className="text-[11.5px] text-slate-400 truncate">{fu.reason}</p>
                      </div>
                      <span className={`text-[10.5px] font-bold px-2 py-1 rounded-full shrink-0 ${overdue ? "bg-rose-50 text-rose-600" : "bg-teal-50 text-teal-700"}`}>
                        {overdue ? "Overdue" : whenLabel(fu.scheduledAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Pending tasks" icon={AlertCircle} iconColor="#d97706">
            {pendingTasks.length === 0 ? (
              <p className="text-[12.5px] text-slate-400 text-center py-5">All caught up ✓</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-xl border border-amber-100 bg-amber-50/60">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      {task.type === "note" ? <FileText className="w-4 h-4 text-amber-600" /> : <Pill className="w-4 h-4 text-amber-600" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-amber-900 capitalize">{task.type} needed</p>
                      <p className="text-[11.5px] text-amber-800/80 truncate">{task.patientName} · {task.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {lastConsult && (
            <SectionCard title="Last session" icon={Video}>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5">
                <p className="text-[13px] font-bold text-slate-800 truncate">{lastConsult.patientName}</p>
                <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{lastConsult.issue}</p>
                {lastConsult.durationMinutes > 0 && (
                  <p className="text-[11.5px] text-slate-400 mt-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {lastConsult.durationMinutes} min</p>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard title="Quick actions" icon={Zap}>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { href: "/doctor-dashboard/schedule", label: "Schedule", icon: CalendarDays },
                { href: "/doctor-dashboard/analytics", label: "Analytics", icon: BarChart3 },
                { href: "/doctor-dashboard/messages", label: "Messages", icon: MessageSquare },
                { href: "/doctor-dashboard/feed", label: "Write a post", icon: BookOpen },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex flex-col items-start gap-2 p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition-colors">
                  <Icon className="w-[18px] h-[18px]" style={{ color: ACCENT }} />
                  <span className="text-[12.5px] font-semibold text-slate-700">{label}</span>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Phones: always-reachable shortcut while patients are waiting */}
      {isOnline && queue.length > 0 && (
        <div className="md:hidden fixed inset-x-0 px-4 pointer-events-none z-30" style={{ bottom: "calc(76px + env(safe-area-inset-bottom))" }}>
          <Link href="/doctor-dashboard/consult" className="pointer-events-auto flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl font-bold text-[14px] text-white"
            style={{ background: `${NAV_BG}`, boxShadow: "0 1px 3px rgba(16,36,63,0.12)" }}>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-white" />
            </span>
            Start next consultation <Video className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}