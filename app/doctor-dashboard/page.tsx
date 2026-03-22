"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import Image from "next/image";
import Link from "next/link";
import {
  Users, CheckCircle2, Star, ChevronLeft, ChevronRight,
  Video, Clock, Zap, Play, Stethoscope, AlertCircle, Activity,
  Power, CalendarDays, MoreVertical
} from "lucide-react";

/* ── types ─────────────────────────────────────────────── */
interface Profile {
  specialty: string; status: string; fee: number;
  patients_served: number; rating: number; review_count: number;
  experience_years: number; hospital: string | null;
}
interface QueuePatient {
  id: string; patientName: string; patientAvatar?: string;
  symptoms?: string; duration?: string; severity?: string; notes?: string;
  joinedAt: string; queuePosition: number;
}
interface ConsultSummary { patientName: string; issue: string; durationMinutes: number; }

/* ── mock data ──────────────────────────────────────────── */
const MOCK_REVIEWS = [
  { id: "1", name: "Sarah K.", rating: 5, text: "Very helpful and caring doctor. Explained everything clearly.", avatar: "S", time: "2 days ago" },
  { id: "2", name: "Mohammed A.", rating: 5, text: "Quick and professional consultation. Highly recommend!", avatar: "M", time: "3 days ago" },
  { id: "3", name: "Hana T.", rating: 4, text: "Great advice. I felt heard and understood throughout.", avatar: "H", time: "5 days ago" },
  { id: "4", name: "James L.", rating: 5, text: "Best online doctor experience I've ever had.", avatar: "J", time: "1 week ago" },
];

/* ── countdown hook ─────────────────────────────────────── */
function useCountdown(initialMs: number) {
  const [rem, setRem] = useState(initialMs);
  useEffect(() => {
    const t = setInterval(() => setRem(r => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(rem / 3600000);
  const m = Math.floor((rem % 3600000) / 60000);
  const s = Math.floor((rem % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ── Reviews Slider ─────────────────────────────────────── */
function ReviewsSlider() {
  const [idx, setIdx] = useState(0);
  const next = useCallback(() => setIdx(i => (i + 1) % MOCK_REVIEWS.length), []);
  useEffect(() => { const t = setInterval(next, 5000); return () => clearInterval(t); }, [next]);
  const r = MOCK_REVIEWS[idx];
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Star className="w-5 h-5 text-gold-500 fill-current" /> Patient Feedback
        </h2>
        <div className="flex gap-1.5">
          {MOCK_REVIEWS.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`rounded-full transition-all duration-300 ${i === idx ? "w-6 h-2 bg-primary-500" : "w-2 h-2 bg-slate-200 hover:bg-slate-300"}`} />
          ))}
        </div>
      </div>
      <div className="relative">
        <div className="flex gap-1 mb-4">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-4 h-4 ${i <= r.rating ? "fill-gold-400 text-gold-400" : "text-slate-200"}`} />)}</div>
        <p className="text-slate-600 text-base leading-relaxed italic mb-6">"{r.text}"</p>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-teal-400 flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-bold">{r.avatar}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{r.name}</p>
            <p className="text-xs text-slate-400 font-medium">{r.time}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Schedule Slider ────────────────────────────────────── */
function ScheduleSlider({ lastConsult }: { lastConsult: ConsultSummary | null }) {
  const [slide, setSlide] = useState(0);
  const countdown = useCountdown(24 * 60000 + 18000);
  const startX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) setSlide(diff > 0 ? 1 : 0);
  };
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary-500" /> Schedule
        </h2>
        <div className="flex gap-1.5">
          {[0, 1].map(i => <button key={i} onClick={() => setSlide(i)} className={`rounded-full transition-all duration-300 ${i === slide ? "w-6 h-2 bg-primary-500" : "w-2 h-2 bg-slate-200"}`} />)}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex items-stretch transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ transform: `translateX(-${slide * 100}%)` }}>
          {/* Slide 1 */}
          <div className="w-full flex-shrink-0 rounded-2xl p-6 relative overflow-hidden bg-slate-900 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-primary-300 text-xs font-bold uppercase tracking-wider mb-2">Next Session</p>
                <p className="text-white font-bold text-xl leading-tight mb-1">Morning Clinic</p>
                <p className="text-slate-400 text-sm">10:30 AM – 1:00 PM</p>
                <div className="flex items-center gap-5 mt-5">
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary-400" /><span className="text-slate-300 text-sm font-medium">8 slots</span></div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary-400" /><span className="text-slate-300 text-sm font-medium">15 min avg</span></div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 text-center flex-shrink-0 border border-white/10 shadow-xl">
                <p className="text-slate-300 text-[10px] uppercase tracking-wider font-bold mb-1">Starts in</p>
                <p className="text-white font-black text-2xl font-mono leading-none tracking-tight">{countdown}</p>
              </div>
            </div>
          </div>
          {/* Slide 2 */}
          <div className="w-full flex-shrink-0 bg-slate-50 border border-slate-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Consultation</p>
            </div>
            {lastConsult ? (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white font-bold text-lg">{lastConsult.patientName[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-lg">{lastConsult.patientName}</p>
                    <p className="text-sm text-slate-500 font-medium">{lastConsult.issue}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-slate-400"><Clock className="w-4 h-4" /><span className="text-sm font-bold">{lastConsult.durationMinutes}m</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-bold text-emerald-700">Completed successfully</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center"><span className="text-slate-500 font-bold">H</span></div>
                  <div><p className="font-bold text-slate-800 text-lg">Hana T.</p><p className="text-sm text-slate-500 font-medium">Routine Checkup</p></div>
                  <div className="ml-auto flex items-center gap-1.5 text-slate-400"><Clock className="w-4 h-4" /><span className="text-sm font-bold">12m</span></div>
                </div>
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm font-bold text-emerald-700">Completed successfully</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Toggle ──────────────────────────────────────────────── */
function StatusToggle({ online, onChange, busy }: { online: boolean; onChange: (v: boolean) => void; busy: boolean }) {
  return (
    <button
      onClick={() => !busy && onChange(!online)}
      disabled={busy}
      className={`relative flex items-center gap-3 px-5 py-2.5 rounded-full transition-all duration-300 disabled:opacity-70 font-bold text-sm shadow-sm ${online
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
        }`}
    >
      <div className="relative flex items-center justify-center w-5 h-5">
        {online ? (
          <>
            <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-40"></div>
            <div className="relative w-3 h-3 bg-emerald-500 rounded-full"></div>
          </>
        ) : (
          <Power className="w-4 h-4 text-slate-400" />
        )}
      </div>
      {online ? "Online & Accepting" : "Currently Offline"}
    </button>
  );
}

/* ── Queue Card ──────────────────────────────────────────── */
function QueueCard({ p, pos }: { p: QueuePatient; pos: number }) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(p.joinedAt).getTime()) / 60000));
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
          {p.patientAvatar
            ? <Image src={p.patientAvatar} alt={p.patientName} width={56} height={56} className="object-cover" />
            : <span className="font-bold text-slate-400 text-lg">{p.patientName[0]}</span>
          }
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shadow-md">
          <span className="text-white text-xs font-bold">{pos}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-slate-800 text-base truncate pr-2">{p.patientName}</p>
          <div className={`flex items-center gap-1.5 flex-shrink-0 ${mins >= 10 ? "text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md" : "text-slate-400"}`}>
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-black tracking-wide">{mins} MIN WAIT</span>
          </div>
        </div>
        <p className="text-sm text-slate-500 truncate">{p.symptoms || "No symptoms specified"}</p>
        {p.severity && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${p.severity === "Severe" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                p.severity === "Moderate" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                  "bg-emerald-50 text-emerald-600 border border-emerald-100"
              }`}>
              {p.severity} Priority
            </span>
          </div>
        )}
      </div>
      <button className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-primary-50 hover:text-primary-600 transition-colors">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
  );
}

/* ── Waiting animation ───────────────────────────────────── */
function WaitingAnim() {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center">
          <Stethoscope className="w-10 h-10 text-slate-300" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 animate-ping opacity-20" />
      </div>
      <p className="font-bold text-slate-700 text-lg">Waiting for patients...</p>
      <p className="text-slate-500 mt-2 font-medium">Your queue will appear here when patients join.</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function DoctorHomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [lastConsult, setLastConsult] = useState<ConsultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const u = getUser(); if (!u) return; setUser(u);
    const loadData = () => Promise.all([
      fetch(`/api/doctor/profile?doctorId=${u.id}`).then(r => r.json()),
      fetch(`/api/queue?doctorId=${u.id}`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/doctor/consultations?doctorId=${u.id}`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([p, q, c]) => {
      if (p.data) { setProfile(p.data); setIsOnline(["available", "in_consultation"].includes(p.data.status)); }
      const qData: QueuePatient[] = (q.data || []).map((e: any, i: number) => ({
        id: e.id, patientName: e.patientName || e.patient_name || "Patient",
        patientAvatar: e.patientAvatar, symptoms: e.symptoms, duration: e.duration,
        severity: e.severity, notes: e.notes,
        joinedAt: e.joinedAt || e.joined_at || new Date().toISOString(), queuePosition: i + 1,
      }));
      setQueue(qData);
      const today = new Date().toDateString();
      const done = (c.data || []).filter((x: any) => x.status === "completed" && new Date(x.created_at).toDateString() === today);
      setCompletedToday(done.length);
      const allDone = (c.data || []).filter((x: any) => x.status === "completed");
      if (allDone.length) {
        const last = allDone.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        setLastConsult({ patientName: last.patientName || "Patient", issue: last.notes || "General consultation", durationMinutes: last.durationMinutes || 0 });
      }
    }).finally(() => setLoading(false));

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleStatus = async (val: boolean) => {
    if (!user || toggling) return;
    setToggling(true); setIsOnline(val);
    try {
      await fetch("/api/doctor/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctorId: user.id, status: val ? "available" : "offline" }) });
    } catch { }
    setToggling(false);
  };

  if (loading) return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-8 animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div className="h-8 w-48 bg-slate-200 rounded-lg" />
        <div className="h-10 w-32 bg-slate-200 rounded-full" />
      </div>
      <div className="h-[200px] bg-slate-200 rounded-3xl" />
      <div className="h-[300px] bg-slate-200 rounded-3xl" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-fade-up pb-32 lg:pb-8">

      {/* ── HEADER: Professional Workspace ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-400 flex items-center justify-center text-white shadow-md">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-black text-2xl text-slate-800 tracking-tight">Physician Portal</h1>
            <p className="text-slate-500 font-medium text-sm mt-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              {profile?.specialty || "Specialist"} Workspace
            </p>
          </div>
        </div>
        <StatusToggle online={isOnline} onChange={toggleStatus} busy={toggling} />
      </div>

      {/* ── OFFLINE STATE ── */}
      {!isOnline && (
        <div className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <ScheduleSlider lastConsult={lastConsult} />
            <ReviewsSlider />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Patient Rating", value: profile?.rating?.toFixed(1) || "4.9", sub: "Out of 5.0", icon: Star, color: "text-gold-500", bg: "bg-gold-50 border-gold-100" },
              { label: "Total Patients", value: (profile?.patients_served || 0).toString(), sub: "Lifetime count", icon: Users, color: "text-primary-500", bg: "bg-primary-50 border-primary-100" },
              { label: "Experience", value: `${profile?.experience_years || 0} Yrs`, sub: "Medical practice", icon: Activity, color: "text-teal-500", bg: "bg-teal-50 border-teal-100" },
              { label: "Consult Fee", value: `$${profile?.fee || 50}`, sub: "Per session", icon: Zap, color: "text-indigo-500", bg: "bg-indigo-50 border-indigo-100" },
            ].map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-black text-3xl text-slate-800">{value}</p>
                  <p className="text-xs text-slate-400 font-medium mt-1">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl" />
            <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                <Power className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready for consultations?</h3>
                <p className="text-slate-400">Switch online to start receiving patients from the queue instantly.</p>
              </div>
            </div>
            <button onClick={() => toggleStatus(true)} className="relative z-10 w-full sm:w-auto bg-white text-slate-900 font-bold px-8 py-4 rounded-xl hover:bg-slate-100 transition-colors shadow-lg active:scale-95 whitespace-nowrap">
              Go Online Now
            </button>
          </div>
        </div>
      )}

      {/* ── ONLINE STATE ── */}
      {isOnline && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Queue</p>
                <div className="flex items-baseline gap-2">
                  <p className="font-black text-4xl text-slate-800">{queue.length}</p>
                  <span className="text-slate-500 font-medium">waiting</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Today</p>
                <div className="flex items-baseline gap-2">
                  <p className="font-black text-4xl text-slate-800">{completedToday}</p>
                  <span className="text-slate-500 font-medium">completed</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-800 text-xl flex items-center gap-3">
                Waiting Queue
                {queue.length > 0 && (
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{queue.length}</span>
                )}
              </h2>
            </div>

            {queue.length === 0 ? (
              <WaitingAnim />
            ) : (
              <div className="space-y-4">
                {queue.map((p, i) => <QueueCard key={p.id} p={p} pos={i + 1} />)}
              </div>
            )}
          </div>

          {queue.length > 0 && (
            <div className="fixed bottom-0 inset-x-0 p-4 md:p-8 pointer-events-none z-50 flex justify-center">
              <Link href="/doctor-dashboard/consult"
                className="pointer-events-auto flex items-center justify-center gap-4 w-full max-w-lg bg-slate-900 text-white font-bold text-lg py-5 px-8 rounded-full shadow-2xl hover:bg-slate-800 active:scale-[0.98] transition-all group border border-slate-700">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
                  </span>
                  Accept Next Patient
                </div>
                <div className="ml-auto w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Play className="w-4 h-4 fill-white" />
                </div>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
