"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { getUser } from "@/lib/supabase/auth";
import {
  Search,
  CheckCircle2,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  RefreshCw,
  GitFork,
  Filter,
  X,
  AlertCircle,
  Activity,
  Thermometer,
  Heart,
  Droplets,
  Pill,
  Paperclip,
  Eye,
  RotateCcw,
  MessageSquarePlus,
  CalendarPlus,
  ShieldAlert,
  ShieldCheck,
  Shield,
  ChevronRight,
  Stethoscope,
  ClipboardList,
  User,
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  Siren,
  CheckSquare,
  MoreHorizontal,
  ArrowUpRight,
  ZapOff,
  Zap,
  Info,
  SlidersHorizontal,
  BarChart3,
  ListFilter,
  Waves,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Vitals {
  bp?: string;
  temp?: number;
  pulse?: number;
  spo2?: number;
}

interface Prescription {
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
}

interface Attachment {
  name: string;
  type: "image" | "pdf" | "lab";
  url: string;
}

interface C {
  id: string;
  patientName: string;
  patientEmail: string;
  status: string;
  created_at: string;
  durationMinutes: number | null;
  notes: string | null;
  summary: string | null;
  isFollowUp: boolean;
  followUpScheduledAt: string | null;
  patientId: string;
  diagnosis?: string;
  prescriptions?: Prescription[];
  vitals?: Vitals;
  attachments?: Attachment[];
  severity?: "low" | "medium" | "high" | "critical";
  reviewed?: boolean;
  followUpNote?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    dot: string;
    label: string;
    icon: React.ReactNode;
  }
> = {
  active: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    label: "Active",
    icon: <Zap className="w-3 h-3" />,
  },
  waiting: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    label: "Waiting",
    icon: <Clock className="w-3 h-3" />,
  },
  completed: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-800",
    text: "text-sky-700 dark:text-sky-400",
    dot: "bg-sky-500",
    label: "Completed",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  missed: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
    label: "Missed",
    icon: <ZapOff className="w-3 h-3" />,
  },
  follow_up: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-800",
    text: "text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
    label: "Follow-up",
    icon: <GitFork className="w-3 h-3" />,
  },
};

const SEVERITY_CONFIG = {
  low: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-500 dark:text-slate-400",
    icon: <Shield className="w-3 h-3" />,
    label: "Low",
    bar: "bg-slate-400",
  },
  medium: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
    icon: <ShieldCheck className="w-3 h-3" />,
    label: "Medium",
    bar: "bg-amber-400",
  },
  high: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-600 dark:text-orange-400",
    icon: <ShieldAlert className="w-3 h-3" />,
    label: "High",
    bar: "bg-orange-500",
  },
  critical: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
    icon: <Siren className="w-3 h-3" />,
    label: "Critical",
    bar: "bg-rose-500",
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isToday(d: string) {
  const today = new Date();
  const dt = new Date(d);
  return (
    dt.getFullYear() === today.getFullYear() &&
    dt.getMonth() === today.getMonth() &&
    dt.getDate() === today.getDate()
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusOrder(s: string) {
  return (
    { active: 0, waiting: 1, follow_up: 2, completed: 3, missed: 4 }[s] ?? 5
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

// ─── Badge Components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.missed;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: C["severity"] }) {
  if (!severity) return null;
  const s = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

// ─── Vitals Strip ─────────────────────────────────────────────────────────────

function VitalsStrip({ vitals }: { vitals: Vitals }) {
  const items = [
    vitals.bp && {
      icon: <Activity className="w-3 h-3 text-rose-400" />,
      label: "BP",
      value: vitals.bp,
    },
    vitals.temp && {
      icon: <Thermometer className="w-3 h-3 text-amber-400" />,
      label: "Temp",
      value: `${vitals.temp}°C`,
    },
    vitals.pulse && {
      icon: <Heart className="w-3 h-3 text-pink-400" />,
      label: "HR",
      value: `${vitals.pulse} bpm`,
    },
    vitals.spo2 && {
      icon: <Droplets className="w-3 h-3 text-sky-400" />,
      label: "SpO₂",
      value: `${vitals.spo2}%`,
    },
  ].filter(Boolean) as {
    icon: React.ReactNode;
    label: string;
    value: string;
  }[];

  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((v) => (
        <div
          key={v.label}
          className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 py-1.5 border border-slate-100 dark:border-slate-700"
        >
          {v.icon}
          <span className="text-[10px] font-semibold text-slate-400 uppercase">
            {v.label}
          </span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {v.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Action Menu ─────────────────────────────────────────────────────────────

function ActionMenu({
  c,
  onUpdate,
}: {
  c: C;
  onUpdate: (id: string, patch: Partial<C>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const actions = [
    {
      icon: <Eye className="w-3.5 h-3.5" />,
      label: c.reviewed ? "Mark Unreviewed" : "Mark Reviewed",
      onClick: () => onUpdate(c.id, { reviewed: !c.reviewed }),
    },
    {
      icon: <MessageSquarePlus className="w-3.5 h-3.5" />,
      label: "Add Follow-up Note",
      onClick: () => {
        const n = prompt("Follow-up note:");
        if (n) onUpdate(c.id, { followUpNote: n });
      },
    },
    {
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      label: "Re-open Consultation",
      onClick: () => onUpdate(c.id, { status: "active" }),
    },
    {
      icon: <CalendarPlus className="w-3.5 h-3.5" />,
      label: "Schedule Follow-up",
      onClick: () => {
        const d = prompt("Follow-up date (YYYY-MM-DDTHH:MM):");
        if (d) onUpdate(c.id, { followUpScheduledAt: d });
      },
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1 min-w-[180px]">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                a.onClick();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <span className="text-slate-400">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Consultation Card ────────────────────────────────────────────────────────

function CCard({
  c,
  isLast,
  onUpdate,
}: {
  c: C;
  isLast: boolean;
  onUpdate: (id: string, patch: Partial<C>) => void;
}) {
  const [open, setOpen] = useState(false);
  const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.missed;

  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center pt-4 flex-shrink-0">
        <div
          className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ring-2 flex-shrink-0 ${status.dot} ring-current`}
          style={{
            color:
              c.status === "active"
                ? "#10b981"
                : c.status === "waiting"
                  ? "#f59e0b"
                  : c.status === "completed"
                    ? "#0ea5e9"
                    : c.status === "missed"
                      ? "#f43f5e"
                      : "#8b5cf6",
          }}
        />
        {!isLast && (
          <div className="w-px flex-1 mt-1 bg-slate-100 dark:bg-slate-800 min-h-4" />
        )}
      </div>

      {/* Card */}
      <div
        className={`flex-1 mb-3 bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden transition-all ${c.reviewed ? "border-slate-100 dark:border-slate-800" : "border-sky-100 dark:border-sky-900/50"}`}
      >
        {/* Severity bar */}
        {c.severity && (
          <div className={`h-0.5 w-full ${SEVERITY_CONFIG[c.severity].bar}`} />
        )}

        {/* Header */}
        <button onClick={() => setOpen(!open)} className="w-full text-left">
          <div className="flex items-start gap-3 p-3.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={c.status} />
                {c.severity && <SeverityBadge severity={c.severity} />}
                {c.isFollowUp && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800">
                    <GitFork className="w-2.5 h-2.5" />
                    Follow-up
                  </span>
                )}
                {c.reviewed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                    <CheckSquare className="w-3 h-3" />
                    Reviewed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {fmtDate(c.created_at)}
                </span>
                {c.durationMinutes && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {c.durationMinutes} min
                  </span>
                )}
                {c.diagnosis && (
                  <span className="text-[11px] text-sky-500 flex items-center gap-1 font-medium">
                    <Stethoscope className="w-3 h-3" />
                    {c.diagnosis}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <ActionMenu c={c} onUpdate={onUpdate} />
              <div className="text-slate-300 p-1">
                {open ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Expanded */}
        {open && (
          <div className="border-t border-slate-50 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800/50">
            {/* Vitals */}
            {c.vitals && Object.values(c.vitals).some(Boolean) && (
              <div className="px-3.5 py-3">
                <SectionLabel
                  icon={<Activity className="w-3 h-3" />}
                  label="Vitals"
                />
                <VitalsStrip vitals={c.vitals} />
              </div>
            )}

            {/* Diagnosis */}
            {c.diagnosis && (
              <div className="px-3.5 py-3">
                <SectionLabel
                  icon={<Stethoscope className="w-3 h-3" />}
                  label="Diagnosis"
                />
                <div className="bg-sky-50 dark:bg-sky-950/30 rounded-xl px-3 py-2.5 border border-sky-100 dark:border-sky-900">
                  <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">
                    {c.diagnosis}
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {c.notes && (
              <div className="px-3.5 py-3">
                <SectionLabel
                  icon={<ClipboardList className="w-3 h-3" />}
                  label="Clinical Notes"
                />
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2.5">
                  {c.notes}
                </p>
              </div>
            )}

            {/* Summary */}
            {c.summary && (
              <div className="px-3.5 py-3">
                <SectionLabel
                  icon={<Info className="w-3 h-3" />}
                  label="Summary"
                />
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {c.summary}
                </p>
              </div>
            )}

            {/* Prescriptions */}
            {c.prescriptions && c.prescriptions.length > 0 && (
              <div className="px-3.5 py-3">
                <SectionLabel
                  icon={<Pill className="w-3 h-3" />}
                  label="Prescriptions"
                />
                <div className="space-y-1.5">
                  {c.prescriptions.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-700"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          {p.drug}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.dose} · {p.frequency}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-600">
                        {p.duration}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {c.attachments && c.attachments.length > 0 && (
              <div className="px-3.5 py-3">
                <SectionLabel
                  icon={<Paperclip className="w-3 h-3" />}
                  label={`Attachments (${c.attachments.length})`}
                />
                <div className="flex flex-wrap gap-2">
                  {c.attachments.map((a, i) => (
                    <a
                      key={i}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-950/50 border border-sky-100 dark:border-sky-900 rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                      <Paperclip className="w-3 h-3" />
                      {a.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up note */}
            {c.followUpNote && (
              <div className="px-3.5 py-3">
                <SectionLabel
                  icon={<MessageSquarePlus className="w-3 h-3" />}
                  label="Follow-up Note"
                />
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-violet-50 dark:bg-violet-950/30 rounded-xl px-3 py-2.5 border border-violet-100 dark:border-violet-800">
                  {c.followUpNote}
                </p>
              </div>
            )}

            {/* Follow-up scheduled */}
            {c.followUpScheduledAt && (
              <div className="px-3.5 py-3">
                <div className="flex items-center gap-2.5 bg-violet-50 dark:bg-violet-950/30 rounded-xl px-3 py-2.5 border border-violet-100 dark:border-violet-800">
                  <Calendar className="w-4 h-4 text-violet-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-violet-700 dark:text-violet-300">
                      Follow-up Scheduled
                    </p>
                    <p className="text-[11px] text-violet-500 mt-0.5">
                      {fmtDate(c.followUpScheduledAt)}
                    </p>
                  </div>
                  {isToday(c.followUpScheduledAt) && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500 text-white animate-pulse">
                      TODAY
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="px-3.5 py-3 flex gap-2 flex-wrap">
              <button
                onClick={() => onUpdate(c.id, { reviewed: !c.reviewed })}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <CheckSquare className="w-3 h-3" />
                {c.reviewed ? "Unmark" : "Mark Reviewed"}
              </button>
              {c.status === "completed" && (
                <button
                  onClick={() => onUpdate(c.id, { status: "active" })}
                  className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-open
                </button>
              )}
              <button
                onClick={() => {
                  const n = prompt("Follow-up note:");
                  if (n) onUpdate(c.id, { followUpNote: n });
                }}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
              >
                <MessageSquarePlus className="w-3 h-3" />
                Add Note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-slate-400">{icon}</span>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

// ─── Patient Group ─────────────────────────────────────────────────────────────

function PatientGroup({
  group,
  onUpdate,
}: {
  group: C[];
  onUpdate: (id: string, patch: Partial<C>) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const patient = group[0];
  const latest = group.reduce((a, b) =>
    new Date(a.created_at) > new Date(b.created_at) ? a : b,
  );
  const hasActive = group.some(
    (c) => c.status === "active" || c.status === "waiting",
  );

  return (
    <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      {/* Patient header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${hasActive ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white" : "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-500 dark:text-slate-300"}`}
          >
            {patient.patientName[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                {patient.patientName}
              </p>
              {hasActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {group.length} session{group.length > 1 ? "s" : ""} · Last:{" "}
              {timeAgo(latest.created_at)}
              {patient.patientEmail && ` · ${patient.patientEmail}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex gap-1">
              {Array.from(new Set(group.map((c) => c.status)))
                .slice(0, 3)
                .map((s) => (
                  <span
                    key={s}
                    className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.dot || "bg-slate-400"}`}
                  />
                ))}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
            />
          </div>
        </div>
      </button>

      {/* Timeline */}
      {!collapsed && (
        <div className="px-4 pb-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {group.map((c, i) => (
            <CCard
              key={c.id}
              c={c}
              isLast={i === group.length - 1}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Today's Follow-ups ───────────────────────────────────────────────────────

function TodayFollowUps({ items }: { items: C[] }) {
  if (!items.length) return null;
  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20 rounded-2xl border border-violet-200 dark:border-violet-800/50 overflow-hidden">
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-violet-500 flex items-center justify-center">
          <Bell className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-violet-800 dark:text-violet-200">
            Today's Follow-ups
          </p>
          <p className="text-[11px] text-violet-500">
            {items.length} scheduled for today
          </p>
        </div>
        <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500 text-white">
          {items.length}
        </span>
      </div>
      <div className="px-3 pb-3 space-y-2">
        {items.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 bg-white dark:bg-slate-900/80 rounded-xl border border-violet-100 dark:border-violet-800/30 px-3 py-2.5 shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-violet-600 dark:text-violet-400">
              {c.patientName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                {c.patientName}
              </p>
              {c.followUpScheduledAt && (
                <p className="text-[10px] text-violet-500 mt-0.5">
                  {fmtDate(c.followUpScheduledAt)}
                </p>
              )}
            </div>
            {c.diagnosis && (
              <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                {c.diagnosis}
              </span>
            )}
            <ArrowUpRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Filter Panel ─────────────────────────────────────────────────────────────

interface Filters {
  status: string;
  fuFilter: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  severity: string;
  hasDiagnosis: boolean;
  hasPrescriptions: boolean;
}

function FilterPanel({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const set = (k: keyof Filters, v: unknown) =>
    onChange({ ...filters, [k]: v });
  const STATUS_TABS = [
    "all",
    "active",
    "waiting",
    "completed",
    "follow_up",
    "missed",
  ];
  const SEVERITY_TABS = ["all", "low", "medium", "high", "critical"];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-4">
      {/* Status */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Status
        </p>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => set("status", t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${filters.status === t ? "bg-sky-600 text-white border-sky-600" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"}`}
            >
              {t === "all" ? "All" : STATUS_CONFIG[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {/* Severity */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Severity
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_TABS.map((t) => (
            <button
              key={t}
              onClick={() => set("severity", t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all capitalize ${filters.severity === t ? "bg-sky-600 text-white border-sky-600" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Row: Follow-up + Has Diagnosis + Has Rx */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Follow-up
          </p>
          <div className="flex gap-1.5">
            {["all", "yes", "no"].map((f) => (
              <button
                key={f}
                onClick={() => set("fuFilter", f)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize transition-all ${filters.fuFilter === f ? "bg-sky-600 text-white border-sky-600" : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100"}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.hasDiagnosis}
            onChange={(e) => set("hasDiagnosis", e.target.checked)}
            className="w-3.5 h-3.5 accent-sky-600"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Has Diagnosis
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.hasPrescriptions}
            onChange={(e) => set("hasPrescriptions", e.target.checked)}
            className="w-3.5 h-3.5 accent-sky-600"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Has Prescription
          </span>
        </label>
      </div>

      {/* Date range */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Date Range
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              From
            </span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => set("dateFrom", e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-300 focus:outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              To
            </span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => set("dateTo", e.target.value)}
              className="text-xs text-slate-600 dark:text-slate-300 focus:outline-none bg-transparent"
            />
          </div>
          {(filters.dateFrom || filters.dateTo) && (
            <button
              onClick={() => onChange({ ...filters, dateFrom: "", dateTo: "" })}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: Filters = {
  status: "all",
  fuFilter: "all",
  search: "",
  dateFrom: "",
  dateTo: "",
  severity: "all",
  hasDiagnosis: false,
  hasPrescriptions: false,
};

export default function HistoryPage() {
  const [items, setItems] = useState<C[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(async (manual = false) => {
    const u = getUser();
    if (!u) return;
    if (manual) setRefreshing(true);
    try {
      const j = await fetch(`/api/doctor/consultations?doctorId=${u.id}`).then(
        (x) => x.json(),
      );
      setItems(j.data || []);
    } catch {}
    if (manual) setRefreshing(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: attempt WebSocket, fall back to polling
  useEffect(() => {
    const u = getUser();
    if (!u) return;
    try {
      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL || "wss://localhost:3001"}/consultations?doctorId=${u.id}`,
      );
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "consultation_update") {
            setItems((prev) => {
              const idx = prev.findIndex((c) => c.id === msg.data.id);
              if (idx >= 0) {
                const n = [...prev];
                n[idx] = { ...n[idx], ...msg.data };
                return n;
              }
              return [msg.data, ...prev];
            });
          }
        } catch {}
      };
      ws.onerror = () => {
        ws.close();
      };
      return () => {
        ws.close();
      };
    } catch {
      // Fall back to polling
      const iv = setInterval(() => load(), 10000);
      return () => clearInterval(iv);
    }
  }, [load]);

  const handleUpdate = useCallback((id: string, patch: Partial<C>) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    // Optimistically persist
    fetch(`/api/doctor/consultations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const f = items
      .filter((c) => filters.status === "all" || c.status === filters.status)
      .filter(
        (c) =>
          filters.fuFilter === "all" ||
          (filters.fuFilter === "yes" ? c.isFollowUp : !c.isFollowUp),
      )
      .filter(
        (c) =>
          !filters.search ||
          c.patientName.toLowerCase().includes(filters.search.toLowerCase()) ||
          (c.diagnosis || "")
            .toLowerCase()
            .includes(filters.search.toLowerCase()),
      )
      .filter((c) => !filters.dateFrom || c.created_at >= filters.dateFrom)
      .filter(
        (c) => !filters.dateTo || c.created_at <= filters.dateTo + "T23:59:59",
      )
      .filter(
        (c) => filters.severity === "all" || c.severity === filters.severity,
      )
      .filter((c) => !filters.hasDiagnosis || !!c.diagnosis)
      .filter(
        (c) =>
          !filters.hasPrescriptions ||
          (c.prescriptions && c.prescriptions.length > 0),
      );

    const groups: Record<string, C[]> = {};
    for (const c of f) {
      const pid = c.patientId || c.patientEmail || c.patientName;
      if (!groups[pid]) groups[pid] = [];
      groups[pid].push(c);
    }

    for (const g of Object.values(groups)) {
      g.sort(
        (a, b) =>
          statusOrder(a.status) - statusOrder(b.status) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    return Object.values(groups).sort((a, b) => {
      const so = statusOrder(a[0].status) - statusOrder(b[0].status);
      return so !== 0
        ? so
        : new Date(b[0].created_at).getTime() -
            new Date(a[0].created_at).getTime();
    });
  }, [items, filters]);

  const todayFollowUps = useMemo(
    () =>
      items
        .filter((c) => c.followUpScheduledAt && isToday(c.followUpScheduledAt))
        .sort(
          (a, b) =>
            new Date(a.followUpScheduledAt!).getTime() -
            new Date(b.followUpScheduledAt!).getTime(),
        ),
    [items],
  );

  const stats = useMemo(
    () => ({
      total: items.length,
      done: items.filter((c) => c.status === "completed").length,
      active: items.filter(
        (c) => c.status === "active" || c.status === "waiting",
      ).length,
      fu: items.filter((c) => c.isFollowUp).length,
      missed: items.filter((c) => c.status === "missed").length,
      critical: items.filter(
        (c) => c.severity === "critical" || c.severity === "high",
      ).length,
    }),
    [items],
  );

  const activeFilterCount =
    Object.entries(filters).filter(
      ([k, v]) =>
        k !== "status" &&
        k !== "fuFilter" &&
        v &&
        v !== "all" &&
        v !== false &&
        v !== "",
    ).length +
    (filters.status !== "all" ? 1 : 0) +
    (filters.fuFilter !== "all" ? 1 : 0);

  return (
    <div className="animate-fade-up space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">
            Patient History
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {stats.total} consultations across {filtered.length} patients
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 shadow-sm transition-all"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          <span className="hidden sm:block">Refresh</span>
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            {
              l: "Total",
              v: stats.total,
              c: "text-slate-700 dark:text-slate-200",
              sub: "consultations",
            },
            {
              l: "Active",
              v: stats.active,
              c: "text-emerald-600 dark:text-emerald-400",
              sub: "in session",
            },
            {
              l: "Completed",
              v: stats.done,
              c: "text-sky-600 dark:text-sky-400",
              sub: "sessions",
            },
            {
              l: "Follow-ups",
              v: stats.fu,
              c: "text-violet-600 dark:text-violet-400",
              sub: "scheduled",
            },
            {
              l: "Missed",
              v: stats.missed,
              c: "text-rose-500 dark:text-rose-400",
              sub: "sessions",
            },
            {
              l: "High Risk",
              v: stats.critical,
              c: "text-orange-600 dark:text-orange-400",
              sub: "critical+high",
            },
          ].map((s) => (
            <div
              key={s.l}
              className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-800 text-center"
            >
              <p className={`font-bold text-lg leading-none ${s.c}`}>{s.v}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wide">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Today's Follow-ups */}
      {!loading && todayFollowUps.length > 0 && (
        <TodayFollowUps items={todayFollowUps} />
      )}

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={filters.search}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
            placeholder="Search patient, diagnosis…"
            className="flex-1 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none bg-transparent"
          />
          {filters.search && (
            <button
              onClick={() => setFilters((f) => ({ ...f, search: "" }))}
              className="text-slate-400 hover:text-slate-600 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm relative ${showFilters || activeFilterCount > 0 ? "bg-sky-600 text-white border-sky-600" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:block">Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && <FilterPanel filters={filters} onChange={setFilters} />}

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-7 h-7 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-bold text-slate-500 dark:text-slate-400">
            No consultations found
          </p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-1.5 max-w-xs mx-auto">
            Try adjusting your search terms or filters to find what you're
            looking for
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="mt-4 text-xs font-semibold text-sky-600 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-xs text-slate-400 font-medium">
              {filtered.length} patient{filtered.length !== 1 ? "s" : ""} ·{" "}
              {filtered.reduce((a, g) => a + g.length, 0)} session
              {filtered.reduce((a, g) => a + g.length, 0) !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <ListFilter className="w-3 h-3" />
              Sorted by priority
            </div>
          </div>
          {filtered.map((group) => (
            <PatientGroup
              key={group[0].patientId || group[0].patientName}
              group={group}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
