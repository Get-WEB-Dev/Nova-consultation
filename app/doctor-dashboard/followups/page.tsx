"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GitFork,
  Clock,
  Calendar,
  ChevronRight,
  FileText,
  Video,
  AlertCircle,
  X,
  MessageSquare,
  Plus,
  Search,
  Filter,
  Check,
  Edit3,
  Trash2,
  Bell,
  ChevronDown,
  Loader2,
  RefreshCw,
  User,
  Stethoscope,
  Pill,
  ClipboardList,
  RotateCcw,
  Phone,
  CheckCircle2,
  XCircle,
  Timer,
  SlidersHorizontal,
} from "lucide-react";
import { getUser } from "@/lib/supabase/auth";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";

type Priority = "low" | "medium" | "high";
type FUStatus = "pending" | "completed" | "missed" | "cancelled";

interface FollowUp {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  reason: string;
  instructions: string;
  scheduledAt: string;
  priority: Priority;
  status: FUStatus;
  notes: string | null;
  diagnosis: string | null;
  prescriptions: string[];
  createdAt: string;
  consultationId: string | null;
  chat?: { from: string; text: string; time: string }[];
}

const MOCK: FollowUp[] = [];

const PRIORITY_CONFIG = {
  high: { bg: "#fff1f2", text: "#be123c", border: "#fecdd3", label: "High" },
  medium: {
    bg: "#fffbeb",
    text: "#b45309",
    border: "#fde68a",
    label: "Medium",
  },
  low: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", label: "Low" },
};

const STATUS_CONFIG = {
  pending: { bg: "#eff6ff", text: ACCENT, icon: Timer, label: "Pending" },
  completed: {
    bg: "#f0fdf4",
    text: "#15803d",
    icon: CheckCircle2,
    label: "Completed",
  },
  missed: { bg: "#fff1f2", text: "#be123c", icon: XCircle, label: "Missed" },
  cancelled: { bg: "#f8fafc", text: "#64748b", icon: X, label: "Cancelled" },
};

function timeUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) {
    const ago = Math.abs(ms);
    const h = Math.floor(ago / 3600000);
    if (h < 1) return `${Math.floor(ago / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `in ${Math.floor(ms / 60000)}m`;
  if (h < 24) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const c = PRIORITY_CONFIG[priority];
  return (
    <span
      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: FUStatus }) {
  const c = STATUS_CONFIG[status];
  const Icon = c.icon;
  return (
    <span
      className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function FollowUpCard({
  fu,
  onClick,
  onComplete,
  onReschedule,
}: {
  fu: FollowUp;
  onClick: () => void;
  onComplete: () => void;
  onReschedule: () => void;
}) {
  const overdue =
    fu.status === "pending" && new Date(fu.scheduledAt) < new Date();
  const soon =
    fu.status === "pending" &&
    !overdue &&
    new Date(fu.scheduledAt).getTime() - Date.now() < 6 * 3600000;

  return (
    <div
      className={`bg-white border rounded-2xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${overdue ? "border-rose-200" : soon ? "border-amber-200" : "border-slate-200"}`}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-extrabold text-base"
          style={{
            background: overdue ? "#be123c" : soon ? "#b45309" : NAV_BG,
          }}
        >
          {fu.patientName[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-extrabold text-[14px] text-slate-900">
              {fu.patientName}
            </p>
            <PriorityBadge priority={fu.priority} />
            <StatusBadge status={fu.status} />
          </div>
          <p className="text-[12px] text-slate-600 line-clamp-1">{fu.reason}</p>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Calendar className="w-3 h-3" />
              {new Date(fu.scheduledAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span
              className={`flex items-center gap-1 text-[11px] font-bold ${overdue ? "text-rose-600" : soon ? "text-amber-600" : "text-blue-600"}`}
            >
              <Clock className="w-3 h-3" />
              {timeUntil(fu.scheduledAt)}
            </span>
          </div>

          {fu.diagnosis && (
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <Stethoscope className="w-3 h-3 flex-shrink-0" />
              {fu.diagnosis}
            </p>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
      </div>

      {/* Quick actions */}
      {fu.status === "pending" && (
        <div
          className="flex gap-2 mt-3 pt-3 border-t border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/doctor-dashboard/consult?followUpId=${fu.id}&patientId=${fu.patientId}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-extrabold text-white transition-all active:scale-95"
            style={{ background: NAV_BG }}
          >
            <Video className="w-3.5 h-3.5" /> Start Consultation
          </Link>
          <button
            onClick={onComplete}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all active:scale-95"
            style={{
              borderColor: "#bbf7d0",
              color: "#15803d",
              background: "#f0fdf4",
            }}
          >
            <Check className="w-3.5 h-3.5" /> Done
          </button>
          <button
            onClick={onReschedule}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border border-slate-200 text-slate-500 bg-slate-50 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reschedule
          </button>
        </div>
      )}
    </div>
  );
}

function DetailModal({
  fu,
  onClose,
  onComplete,
  onReschedule,
}: {
  fu: FollowUp;
  onClose: () => void;
  onComplete: () => void;
  onReschedule: () => void;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-3 top-12 bottom-12 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-lg mx-auto">
        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ background: NAV_BG }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold flex-shrink-0"
            style={{ background: ACCENT }}
          >
            {fu.patientName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-white text-[15px] leading-tight">
              {fu.patientName}
            </p>
            <p
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              {fu.patientEmail}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-5 space-y-4"
          style={{ background: "#f8fafc" }}
        >
          {/* Schedule block */}
          <div
            className="flex items-center gap-3 p-4 rounded-xl border border-blue-100"
            style={{ background: "#eff6ff" }}
          >
            <Calendar
              className="w-5 h-5 flex-shrink-0"
              style={{ color: ACCENT }}
            />
            <div className="flex-1">
              <p className="font-bold text-[12px]" style={{ color: ACCENT }}>
                Scheduled Follow-up
              </p>
              <p className="text-[13px] text-slate-700 mt-0.5">
                {new Date(fu.scheduledAt).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <PriorityBadge priority={fu.priority} />
              <StatusBadge status={fu.status} />
            </div>
          </div>

          {/* Reason */}
          <Section label="Reason for Follow-up">
            <div className="flex items-start gap-2 p-3.5 rounded-xl border border-rose-100 bg-rose-50">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-rose-700">{fu.reason}</p>
            </div>
          </Section>

          {/* Instructions */}
          {fu.instructions && (
            <Section label="Doctor Instructions">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                <p className="text-[13px] text-slate-600 leading-relaxed">
                  {fu.instructions}
                </p>
              </div>
            </Section>
          )}

          {/* Diagnosis */}
          {fu.diagnosis && (
            <Section label="Diagnosis">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200">
                <Stethoscope className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <p className="text-[13px] font-semibold text-slate-800">
                  {fu.diagnosis}
                </p>
              </div>
            </Section>
          )}

          {/* Prescriptions */}
          {fu.prescriptions?.length > 0 && (
            <Section label={`Prescriptions (${fu.prescriptions.length})`}>
              <div className="space-y-2">
                {fu.prescriptions.map((rx, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200"
                  >
                    <Pill className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <p className="text-[12px] text-slate-700">{rx}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Notes */}
          {fu.notes && (
            <Section label="Consultation Notes">
              <div className="flex items-start gap-2 p-3.5 rounded-xl border border-amber-100 bg-amber-50">
                <FileText className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-amber-800 leading-relaxed">
                  {fu.notes}
                </p>
              </div>
            </Section>
          )}

          {/* Chat history */}
          {(fu.chat?.length ?? 0) > 0 && (
            <Section label="Previous Messages">
              <div className="space-y-2">
                {fu.chat!.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.from === "doctor" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[80%] px-3 py-2.5 rounded-2xl text-[13px]"
                      style={
                        m.from === "doctor"
                          ? {
                            background: NAV_BG,
                            color: "white",
                            borderBottomRightRadius: 4,
                          }
                          : {
                            background: "white",
                            color: "#1e293b",
                            border: "1px solid #e2e8f0",
                            borderBottomLeftRadius: 4,
                          }
                      }
                    >
                      <p>{m.text}</p>
                      <p className="text-[10px] mt-0.5 opacity-60">{m.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0 bg-white flex-wrap">
          {fu.status === "pending" && (
            <>
              <Link
                href={`/doctor-dashboard/consult?followUpId=${fu.id}&patientId=${fu.patientId}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-extrabold text-white transition-all active:scale-95"
                style={{ background: NAV_BG }}
              >
                <Video className="w-4 h-4" /> Start Follow-up
              </Link>
              <button
                onClick={onComplete}
                className="px-4 py-2.5 rounded-xl text-[13px] font-bold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors active:scale-95"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={onReschedule}
                className="px-4 py-2.5 rounded-xl text-[13px] font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function RescheduleModal({
  fu,
  onSave,
  onClose,
}: {
  fu: FollowUp;
  onSave: (date: string, instructions: string, priority: Priority) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(fu.scheduledAt.slice(0, 16));
  const [instructions, setInstructions] = useState(fu.instructions);
  const [priority, setPriority] = useState<Priority>(fu.priority);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[60] bg-white rounded-2xl shadow-2xl p-6 max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-extrabold text-slate-900 text-[15px]">
            Reschedule Follow-up
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1.5">
              New Date & Time
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1.5">
              Priority
            </label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as Priority[]).map((p) => {
                const c = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold border capitalize transition-all"
                    style={
                      priority === p
                        ? {
                          background: c.bg,
                          color: c.text,
                          borderColor: c.border,
                        }
                        : { borderColor: "#e2e8f0", color: "#64748b" }
                    }
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1.5">
              Instructions
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 transition-colors resize-none"
            />
          </div>
          <button
            onClick={() => onSave(date, instructions, priority)}
            className="w-full py-3 rounded-xl font-extrabold text-[13px] text-white transition-all active:scale-95"
            style={{ background: NAV_BG }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  );
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>(MOCK);
  const [sel, setSel] = useState<FollowUp | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<FollowUp | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FUStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) return;
    const fetchFollowUps = async () => {
      try {
        const res = await fetch(`/api/follow-ups?doctorId=${user.id}`);
        const json = await res.json();
        if (json.data) {
          setItems(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowUps();
  }, []);

  // Auto-mark missed
  useEffect(() => {
    setItems((prev) =>
      prev.map((fu) =>
        fu.status === "pending" && new Date(fu.scheduledAt) < new Date()
          ? { ...fu, status: "missed" as FUStatus }
          : fu,
      ),
    );
  }, []);

  const handleComplete = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((fu) =>
        fu.id === id ? { ...fu, status: "completed" as FUStatus } : fu,
      ),
    );
    setSel(null);
    fetch("/api/follow-ups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultationId: id, status: "completed" }),
    }).catch(console.error);
  }, []);

  const handleReschedule = useCallback(
    (id: string, date: string, instructions: string, priority: Priority) => {
      setItems((prev) =>
        prev.map((fu) =>
          fu.id === id
            ? {
              ...fu,
              scheduledAt: new Date(date).toISOString(),
              instructions,
              priority,
              status: "pending" as FUStatus,
            }
            : fu,
        ),
      );
      setRescheduleItem(null);
      setSel(null);
      fetch("/api/follow-ups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: id,
          scheduledAt: new Date(date).toISOString(),
          instructions,
          priority,
          status: "pending",
        }),
      }).catch(console.error);
    },
    [],
  );

  const filtered = items.filter((fu) => {
    const matchSearch =
      fu.patientName.toLowerCase().includes(search.toLowerCase()) ||
      fu.reason.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || fu.status === statusFilter;
    const matchPriority =
      priorityFilter === "all" || fu.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const grouped = {
    missed: filtered.filter((f) => f.status === "missed"),
    pending: filtered
      .filter((f) => f.status === "pending")
      .sort((a, b) => {
        const pOrder = { high: 0, medium: 1, low: 2 };
        return pOrder[a.priority] - pOrder[b.priority];
      }),
    completed: filtered.filter((f) => f.status === "completed"),
    cancelled: filtered.filter((f) => f.status === "cancelled"),
  };

  const counts = {
    pending: items.filter((f) => f.status === "pending").length,
    missed: items.filter((f) => f.status === "missed").length,
    completed: items.filter((f) => f.status === "completed").length,
  };

  return (
    <div className="space-y-5 max-w-2xl pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-extrabold text-slate-900 text-[20px]">
            Follow-Up Manager
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {counts.pending} pending ·{" "}
            {counts.missed > 0 && (
              <span className="text-rose-600 font-semibold">
                {counts.missed} missed ·{" "}
              </span>
            )}
            {counts.completed} completed
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all active:scale-95"
          style={{ background: NAV_BG }}
        >
          <Plus className="w-4 h-4" /> Schedule Follow-up
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Pending",
            count: counts.pending,
            color: ACCENT,
            bg: "#eff6ff",
          },
          {
            label: "Missed",
            count: counts.missed,
            color: "#be123c",
            bg: "#fff1f2",
          },
          {
            label: "Completed",
            count: counts.completed,
            color: "#15803d",
            bg: "#f0fdf4",
          },
        ].map(({ label, count, color, bg }) => (
          <div
            key={label}
            className="rounded-xl p-3 text-center"
            style={{ background: bg }}
          >
            <p className="font-extrabold text-[22px]" style={{ color }}>
              {count}
            </p>
            <p className="text-[10px] font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search patients or reasons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-blue-400 bg-white transition-colors"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "pending", "missed", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all capitalize"
              style={
                statusFilter === s
                  ? { background: NAV_BG, color: "white", borderColor: NAV_BG }
                  : {
                    background: "white",
                    color: "#475569",
                    borderColor: "#e2e8f0",
                  }
              }
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(["all", "high", "medium", "low"] as const).map((p) => {
            const c = p !== "all" ? PRIORITY_CONFIG[p] : null;
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all capitalize"
                style={
                  priorityFilter === p
                    ? c
                      ? {
                        background: c.bg,
                        color: c.text,
                        borderColor: c.border,
                      }
                      : {
                        background: NAV_BG,
                        color: "white",
                        borderColor: NAV_BG,
                      }
                    : {
                      background: "white",
                      color: "#475569",
                      borderColor: "#e2e8f0",
                    }
                }
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Missed */}
      {grouped.missed.length > 0 && (
        <GroupSection title="Missed" count={grouped.missed.length} urgent>
          {grouped.missed.map((fu) => (
            <FollowUpCard
              key={fu.id}
              fu={fu}
              onClick={() => setSel(fu)}
              onComplete={() => handleComplete(fu.id)}
              onReschedule={() => setRescheduleItem(fu)}
            />
          ))}
        </GroupSection>
      )}

      {/* Pending */}
      <GroupSection title="Upcoming" count={grouped.pending.length}>
        {grouped.pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white border border-dashed border-slate-200 rounded-2xl">
            <GitFork className="w-9 h-9 text-slate-200 mb-2" />
            <p className="font-bold text-slate-500">No pending follow-ups</p>
            <p className="text-[12px] text-slate-400 mt-1">
              Schedule follow-ups from consultation records
            </p>
          </div>
        ) : (
          grouped.pending.map((fu) => (
            <FollowUpCard
              key={fu.id}
              fu={fu}
              onClick={() => setSel(fu)}
              onComplete={() => handleComplete(fu.id)}
              onReschedule={() => setRescheduleItem(fu)}
            />
          ))
        )}
      </GroupSection>

      {/* Completed */}
      {grouped.completed.length > 0 && (
        <GroupSection
          title="Completed"
          count={grouped.completed.length}
          collapsed
        >
          {grouped.completed.map((fu) => (
            <FollowUpCard
              key={fu.id}
              fu={fu}
              onClick={() => setSel(fu)}
              onComplete={() => { }}
              onReschedule={() => setRescheduleItem(fu)}
            />
          ))}
        </GroupSection>
      )}

      {/* Modals */}
      {sel && (
        <DetailModal
          fu={sel}
          onClose={() => setSel(null)}
          onComplete={() => handleComplete(sel.id)}
          onReschedule={() => {
            setRescheduleItem(sel);
            setSel(null);
          }}
        />
      )}
      {rescheduleItem && (
        <RescheduleModal
          fu={rescheduleItem}
          onSave={(d, i, p) => handleReschedule(rescheduleItem.id, d, i, p)}
          onClose={() => setRescheduleItem(null)}
        />
      )}
    </div>
  );
}

function GroupSection({
  title,
  count,
  children,
  urgent,
  collapsed: defaultCollapsed,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  urgent?: boolean;
  collapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  return (
    <div>
      <button
        className="flex items-center gap-2 mb-3 w-full text-left"
        onClick={() => setCollapsed(!collapsed)}
      >
        {urgent && (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#fff1f2" }}
          >
            <AlertCircle className="w-3 h-3" style={{ color: "#be123c" }} />
          </div>
        )}
        <h2 className="font-extrabold text-[14px] text-slate-900">
          {title} ({count})
        </h2>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${collapsed ? "-rotate-90" : ""}`}
        />
      </button>
      {!collapsed && <div className="space-y-2.5">{children}</div>}
    </div>
  );
}
