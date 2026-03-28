"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import Image from "next/image";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Zap,
  Play,
  Stethoscope,
  Power,
  ChevronRight,
  SkipForward,
  FileText,
  Pill,
  AlertCircle,
  CalendarDays,
  TrendingUp,
  Video,
} from "lucide-react";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#003580";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
  specialty: string;
  status: string;
  fee: number;
  patients_served: number;
  rating: number;
  review_count: number;
  experience_years: number;
  hospital: string | null;
}
interface QueuePatient {
  id: string;
  patientName: string;
  patientAvatar?: string;
  symptoms?: string;
  duration?: string;
  severity?: string;
  notes?: string;
  joinedAt: string;
  queuePosition: number;
}
interface ConsultSummary {
  patientName: string;
  issue: string;
  durationMinutes: number;
}
interface FollowUpItem {
  id: string;
  patientName: string;
  reason: string;
  scheduledAt: string;
}
interface PendingTask {
  id: string;
  type: "note" | "prescription";
  patientName: string;
  details: string;
}

// ── Status toggle ─────────────────────────────────────────────────────────────
function StatusToggle({
  online,
  onChange,
  busy,
}: {
  online: boolean;
  onChange: (v: boolean) => void;
  busy: boolean;
}) {
  return (
    <button
      onClick={() => !busy && onChange(!online)}
      disabled={busy}
      className="flex items-center gap-2.5 px-4 py-2 rounded-xl font-bold text-[13px] transition-all disabled:opacity-60 border"
      style={
        online
          ? { background: "#f0fdf4", color: "#15803d", borderColor: "#bbf7d0" }
          : { background: "#f8fafc", color: "#475569", borderColor: "#e2e8f0" }
      }
    >
      <span className="relative flex items-center justify-center w-5 h-5">
        {online ? (
          <>
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-40"
              style={{ background: "#22c55e" }}
            />
            <span
              className="relative w-3 h-3 rounded-full"
              style={{ background: "#22c55e" }}
            />
          </>
        ) : (
          <Power className="w-4 h-4 text-slate-400" />
        )}
      </span>
      {online ? "Online & Accepting" : "Currently Offline"}
    </button>
  );
}

// ── Severity badge ────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity?: string }) {
  if (!severity) return null;
  const cfg: Record<string, { bg: string; text: string; border: string }> = {
    Severe: { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
    Moderate: { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
    Mild: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  };
  const s = cfg[severity] ?? cfg.Mild;
  return (
    <span
      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {severity}
    </span>
  );
}

// ── Queue card ────────────────────────────────────────────────────────────────
function QueueCard({
  p,
  pos,
  onStart,
  onSkip,
}: {
  p: QueuePatient;
  pos: number;
  onStart: () => void;
  onSkip: () => void;
}) {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(p.joinedAt).getTime()) / 60000),
  );
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-4"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar + position */}
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
            {p.patientAvatar ? (
              <Image
                src={p.patientAvatar}
                alt={p.patientName}
                width={44}
                height={44}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-extrabold text-slate-400 text-base">
                  {p.patientName[0]}
                </span>
              </div>
            )}
          </div>
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold shadow"
            style={{ background: NAV_BG }}
          >
            {pos}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-extrabold text-[14px] text-slate-900">
              {p.patientName}
            </p>
            <SeverityBadge severity={p.severity} />
          </div>
          <p className="text-[12px] text-slate-500 truncate">
            {p.symptoms || "No symptoms specified"}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Clock
              className="w-3 h-3 flex-shrink-0"
              style={{ color: mins >= 10 ? "#f59e0b" : "#94a3b8" }}
            />
            <span
              className="text-[11px] font-bold"
              style={{ color: mins >= 10 ? "#f59e0b" : "#94a3b8" }}
            >
              {mins} min wait
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onSkip}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all active:scale-95"
          >
            <SkipForward className="w-3.5 h-3.5" /> Skip
          </button>
          <button
            onClick={onStart}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-extrabold text-white transition-all active:scale-95"
            style={{ background: ACCENT }}
          >
            <Play className="w-3 h-3 fill-white" /> Start
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Empty queue ───────────────────────────────────────────────────────────────
function EmptyQueue() {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white border border-dashed border-slate-200 rounded-2xl">
      <div className="relative mb-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "#eff6ff" }}
        >
          <Stethoscope className="w-7 h-7" style={{ color: ACCENT }} />
        </div>
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full animate-ping opacity-30"
          style={{ background: "#22c55e" }}
        />
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full"
          style={{ background: "#22c55e" }}
        />
      </div>
      <p className="font-extrabold text-slate-700">Waiting for patients…</p>
      <p className="text-[12px] text-slate-400 mt-1">
        Your queue will appear here when patients join.
      </p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function DoctorHomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [lastConsult, setLastConsult] = useState<ConsultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Session setup state
  const [maxPatients, setMaxPatients] = useState(10);
  const [avgTime, setAvgTime] = useState(15);
  const [sessionFee, setSessionFee] = useState(0);

  // Remote follow-ups & pending tasks
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);

  useEffect(() => {
    const u = getUser();
    if (!u) return;
    setUser(u);

    const loadData = () =>
      Promise.all([
        fetch(`/api/doctor/profile?doctorId=${u.id}`).then((r) => r.json()),
        fetch(`/api/queue?doctorId=${u.id}`)
          .then((r) => r.json())
          .catch(() => ({ data: [] })),
        fetch(`/api/doctor/consultations?doctorId=${u.id}`)
          .then((r) => r.json())
          .catch(() => ({ data: [] })),
        fetch(`/api/follow-ups?doctorId=${u.id}`)
          .then((r) => r.json())
          .catch(() => ({ data: [] })),
        fetch(`/api/doctor/pending-tasks?doctorId=${u.id}`)
          .then((r) => r.json())
          .catch(() => ({ data: [] })),
      ])
        .then(([p, q, c, f, t]) => {
          if (p.data) {
            setProfile(p.data);
            setIsOnline(
              ["available", "in_consultation"].includes(p.data.status),
            );
            setSessionFee(p.data.fee || 0);
          }
          const sorted = [...(q.data || [])].sort((a: any, b: any) => {
            const order: Record<string, number> = {
              Severe: 0,
              Moderate: 1,
              Mild: 2,
            };
            return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
          });
          setQueue(
            sorted.map((e: any, i: number) => ({
              id: e.id,
              patientName: e.patientName || e.patient_name || "Patient",
              patientAvatar: e.patientAvatar,
              symptoms: e.symptoms,
              duration: e.duration,
              severity: e.severity,
              notes: e.notes,
              joinedAt: e.joinedAt || e.joined_at || new Date().toISOString(),
              queuePosition: i + 1,
            })),
          );
          const today = new Date().toDateString();
          const done = (c.data || []).filter(
            (x: any) =>
              x.status === "completed" &&
              new Date(x.created_at).toDateString() === today,
          );
          setCompletedToday(done.length);
          const allDone = (c.data || []).filter(
            (x: any) => x.status === "completed",
          );
          if (allDone.length) {
            const last = allDone.sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )[0];
            setLastConsult({
              patientName: last.patientName || "Patient",
              issue: last.diagnosis || last.summary || last.notes || "General consultation",
              durationMinutes: last.durationMinutes || 0,
            });
          }

          if (f.data) {
            setFollowUps(
              f.data.map((x: any) => ({
                id: x.id,
                patientName: x.patientName || x.users?.name || "Patient",
                reason: x.reason || x.diagnosis || x.summary || "Follow-up",
                scheduledAt: x.scheduledAt || x.follow_up_scheduled_at,
              }))
            );
          }
          if (t.data) {
            setPendingTasks(t.data);
          }
        })
        .finally(() => setLoading(false));

    loadData();
    const iv = setInterval(loadData, 10000);
    return () => clearInterval(iv);
  }, []);

  const toggleStatus = async (val: boolean) => {
    if (!user || toggling) return;
    setToggling(true);
    setIsOnline(val);
    try {
      await fetch("/api/doctor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: user.id,
          status: val ? "available" : "offline",
        }),
      });
    } catch { }
    setToggling(false);
  };

  // Derived session estimates
  const estimatedDuration = maxPatients * avgTime;
  const estimatedHours = Math.floor(estimatedDuration / 60);
  const estimatedMins = estimatedDuration % 60;

  if (loading)
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-14 bg-white rounded-2xl" />
        <div className="h-40 bg-white rounded-2xl" />
        <div className="h-64 bg-white rounded-2xl" />
      </div>
    );

  return (
    <div className="space-y-5 pb-10">
      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-slate-900 text-[18px] sm:text-[20px]">
            {isOnline ? "Live Session" : "Physician Portal"}
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {profile?.specialty || "Specialist"} ·{" "}
            {isOnline ? `${queue.length} in queue` : "Offline"}
          </p>
        </div>
        <StatusToggle
          online={isOnline}
          onChange={toggleStatus}
          busy={toggling}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          OFFLINE STATE
      ═══════════════════════════════════════════════════════════════ */}
      {!isOnline && (
        <div className="space-y-5">
          {/* ── Session Setup ── */}
          <div
            className="bg-white border border-slate-200 rounded-2xl p-5"
            style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
          >
            <div
              className="h-1 rounded-full mb-5"
              style={{
                background: `linear-gradient(90deg, ${NAV_BG}, ${ACCENT}, ${SKY})`,
              }}
            />
            <h2 className="font-extrabold text-slate-900 text-[15px] mb-4">
              Session Setup
            </h2>

            <div className="grid sm:grid-cols-3 gap-4 mb-5">
              {/* Max patients */}
              <div>
                <label
                  className="block text-[10px] font-extrabold uppercase tracking-widest mb-1.5"
                  style={{ color: ACCENT }}
                >
                  Max Patients
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMaxPatients((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center font-extrabold text-[17px] text-slate-900">
                    {maxPatients}
                  </span>
                  <button
                    onClick={() => setMaxPatients((p) => p + 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Avg time */}
              <div>
                <label
                  className="block text-[10px] font-extrabold uppercase tracking-widest mb-1.5"
                  style={{ color: ACCENT }}
                >
                  Avg. Time (min)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAvgTime((t) => Math.max(5, t - 5))}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    −
                  </button>
                  <span className="flex-1 text-center font-extrabold text-[17px] text-slate-900">
                    {avgTime}
                  </span>
                  <button
                    onClick={() => setAvgTime((t) => t + 5)}
                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Consultation fee */}
              <div>
                <label
                  className="block text-[10px] font-extrabold uppercase tracking-widest mb-1.5"
                  style={{ color: ACCENT }}
                >
                  Fee (Birr)
                </label>
                <input
                  type="number"
                  value={sessionFee}
                  onChange={(e) => setSessionFee(+e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[15px] font-extrabold text-slate-900 outline-none focus:border-blue-300 transition-colors text-center bg-slate-50"
                />
              </div>
            </div>

            {/* Session estimate */}
            <div
              className="rounded-xl p-4 border border-dashed border-slate-200"
              style={{ background: "#f8fafc" }}
            >
              <p className="text-[10px] font-extrabold uppercase tracking-widest mb-3 text-slate-400">
                Session Estimate
              </p>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Clock
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: ACCENT }}
                  />
                  <div>
                    <p className="text-[10px] text-slate-400">Est. Duration</p>
                    <p className="font-extrabold text-[15px] text-slate-900">
                      {estimatedHours > 0 ? `${estimatedHours}h ` : ""}
                      {estimatedMins > 0 ? `${estimatedMins}m` : "0m"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: ACCENT }}
                  />
                  <div>
                    <p className="text-[10px] text-slate-400">Queue Cap</p>
                    <p className="font-extrabold text-[15px] text-slate-900">
                      {maxPatients} patients
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: ACCENT }}
                  />
                  <div>
                    <p className="text-[10px] text-slate-400">Total Revenue</p>
                    <p className="font-extrabold text-[15px] text-slate-900">
                      {(sessionFee * maxPatients).toLocaleString()} Birr
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Today's Follow-ups + Pending Tasks (2-col) ── */}
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Follow-ups */}
            <div
              className="bg-white border border-slate-200 rounded-2xl p-5"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-[14px] text-slate-900 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" style={{ color: ACCENT }} />{" "}
                  Today's Follow-Ups
                </h3>
                <Link
                  href="/doctor/follow-ups"
                  className="text-[11px] font-bold flex items-center gap-0.5"
                  style={{ color: ACCENT }}
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {followUps.length === 0 ? (
                <p className="text-[12px] text-slate-400 text-center py-4">
                  No follow-ups today
                </p>
              ) : (
                <div className="space-y-3">
                  {followUps.slice(0, 3).map((fu) => (
                    <div
                      key={fu.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: "#f8fafc" }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-[12px] font-extrabold"
                        style={{ background: ACCENT }}
                      >
                        {fu.patientName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 truncate">
                          {fu.patientName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {fu.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending tasks */}
            <div
              className="bg-white border border-slate-200 rounded-2xl p-5"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
            >
              <h3 className="font-extrabold text-[14px] text-slate-900 flex items-center gap-1.5 mb-4">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Pending Tasks
              </h3>

              {pendingTasks.length === 0 ? (
                <p className="text-[12px] text-slate-400 text-center py-4">
                  All caught up ✓
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-2.5 rounded-xl border border-amber-100"
                      style={{ background: "#fffbeb" }}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "#fef3c7" }}
                      >
                        {task.type === "note" ? (
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <Pill className="w-3.5 h-3.5 text-amber-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-amber-800 capitalize">
                          {task.type}
                        </p>
                        <p className="text-[10px] text-amber-700">
                          {task.patientName} · {task.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Last Session Summary ── */}
          {(completedToday > 0 || lastConsult) && (
            <div
              className="bg-white border border-slate-200 rounded-2xl p-5"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
            >
              <h3 className="font-extrabold text-[14px] text-slate-900 flex items-center gap-1.5 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: ACCENT }} />{" "}
                Last Session Summary
              </h3>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <div>
                    <p className="text-[10px] text-slate-400">
                      Completed Today
                    </p>
                    <p className="font-extrabold text-[17px] text-slate-900">
                      {completedToday}
                    </p>
                  </div>
                </div>
                {lastConsult && (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: ACCENT }} />
                      <div>
                        <p className="text-[10px] text-slate-400">
                          Last Duration
                        </p>
                        <p className="font-extrabold text-[17px] text-slate-900">
                          {lastConsult.durationMinutes}m
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex-1 min-w-0 p-3 rounded-xl border border-slate-100"
                      style={{ background: "#f8fafc" }}
                    >
                      <p className="text-[10px] text-slate-400">Last Patient</p>
                      <p className="font-bold text-[12px] text-slate-800 truncate">
                        {lastConsult.patientName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {lastConsult.issue}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Start Session CTA ── */}
          <div
            className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden"
            style={{
              background: NAV_BG,
              boxShadow: "0 4px 20px rgba(0,53,128,0.3)",
            }}
          >
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)",
                transform: "translate(20%, -30%)",
              }}
            />
            <div className="relative z-10">
              <p
                className="text-[11px] font-extrabold uppercase tracking-widest mb-1"
                style={{ color: SKY }}
              >
                Ready to consult?
              </p>
              <h3 className="font-extrabold text-white text-[18px] sm:text-[20px] leading-tight">
                Start New Consultation Session
              </h3>
              <p
                className="text-[13px] mt-1"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Go online to accept up to {maxPatients} patients · {avgTime} min
                avg · {sessionFee} Birr/session
              </p>
            </div>
            <button
              onClick={() => toggleStatus(true)}
              className="relative z-10 flex items-center gap-2 px-8 py-3.5 rounded-xl font-extrabold text-[14px] transition-all active:scale-95 hover:opacity-90 flex-shrink-0 w-full sm:w-auto justify-center"
              style={{ background: SKY, color: "#00224f" }}
            >
              <Zap className="w-5 h-5" /> Go Online Now
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ONLINE STATE
      ═══════════════════════════════════════════════════════════════ */}
      {isOnline && (
        <div className="space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#fffbeb" }}
              >
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Queue
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="font-extrabold text-[24px] text-slate-900">
                    {queue.length}
                  </p>
                  <span className="text-[12px] text-slate-400">waiting</span>
                </div>
              </div>
            </div>

            <div
              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#f0fdf4" }}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Today
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="font-extrabold text-[24px] text-slate-900">
                    {completedToday}
                  </p>
                  <span className="text-[12px] text-slate-400">done</span>
                </div>
              </div>
            </div>
          </div>

          {/* Queue list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-extrabold text-[15px] text-slate-900 flex items-center gap-2">
                Waiting Queue
                {queue.length > 0 && (
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: ACCENT }}
                  >
                    {queue.length}
                  </span>
                )}
              </h2>
              <span className="text-[11px] text-slate-400">
                Sorted by severity
              </span>
            </div>

            {queue.length === 0 ? (
              <EmptyQueue />
            ) : (
              <div className="space-y-3">
                {queue.map((p, i) => (
                  <QueueCard
                    key={p.id}
                    p={p}
                    pos={i + 1}
                    onStart={() =>
                      (window.location.href = `/doctor-dashboard/consult?patientId=${p.id}`)
                    }
                    onSkip={() =>
                      setQueue((prev) => {
                        const arr = [...prev];
                        const [item] = arr.splice(i, 1);
                        arr.push(item);
                        return arr.map((x, j) => ({
                          ...x,
                          queuePosition: j + 1,
                        }));
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Floating CTA */}
          {queue.length > 0 && (
            <div className="fixed bottom-20 lg:bottom-6 inset-x-0 px-4 pointer-events-none z-50 flex justify-center">
              <Link
                href="/doctor-dashboard/consult"
                className="pointer-events-auto flex items-center gap-3 px-8 py-4 rounded-2xl font-extrabold text-[14px] transition-all active:scale-[0.98] shadow-2xl"
                style={{
                  background: NAV_BG,
                  color: "white",
                  boxShadow: "0 8px 32px rgba(0,53,128,0.4)",
                }}
              >
                <span className="relative flex h-3.5 w-3.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                    style={{ background: "#22c55e" }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white"
                    style={{ background: "#22c55e" }}
                  />
                </span>
                Start Next Consultation
                <Video className="w-4 h-4 ml-1" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
