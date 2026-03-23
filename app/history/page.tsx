"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  Calendar,
  ChevronRight,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  ChevronLeft,
  Stethoscope,
} from "lucide-react";
import { getUser, loadUser } from "@/lib/supabase/auth";
import type { ConsultationSession } from "@/lib/types";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

type StatusFilter = "all" | "completed" | "missed" | "active";

const STATUS_CONFIG: Record<
  string,
  { icon: any; label: string; bg: string; color: string }
> = {
  completed: {
    icon: CheckCircle,
    label: "Completed",
    bg: "#f0fdf4",
    color: "#15803d",
  },
  missed: { icon: XCircle, label: "Missed", bg: "#fff1f2", color: "#be123c" },
  active: { icon: Activity, label: "Active", bg: "#eff6ff", color: ACCENT },
  waiting: { icon: Clock, label: "Waiting", bg: "#fffbeb", color: "#b45309" },
  follow_up: {
    icon: Calendar,
    label: "Follow-up",
    bg: "#faf5ff",
    color: "#7e22ce",
  },
};

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "active", label: "Active" },
];

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    (async () => {
      let u = getUser();
      if (!u) u = await loadUser();
      if (!u) {
        setLoading(false);
        return;
      }
      try {
        const r = await fetch(`/api/consultations?patientId=${u.id}`);
        const d = await r.json();
        setSessions(Array.isArray(d) ? d : []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let r = [...sessions];
    if (statusFilter !== "all") r = r.filter((s) => s.status === statusFilter);
    if (query) {
      const q = query.toLowerCase();
      r = r.filter(
        (s) =>
          s.doctorName.toLowerCase().includes(q) ||
          s.doctorSpecialty.toLowerCase().includes(q),
      );
    }
    return r.sort(
      (a, b) =>
        new Date(b.created_at ?? "").getTime() -
        new Date(a.created_at ?? "").getTime(),
    );
  }, [sessions, query, statusFilter]);

  return (
    <div className="min-h-screen" style={{ background: "#eef2f7" }}>
      {/* ── Page header band ── */}
      <div
        style={{ background: NAV_BG }}
        className="px-4 sm:px-6 pt-5 pb-10 relative overflow-hidden"
      >
        <div
          className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle,rgba(56,189,248,0.1) 0%,transparent 70%)",
            transform: "translate(20%,-30%)",
          }}
        />
        <div className="max-w-3xl mx-auto relative z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[12px] font-semibold mb-4 transition-colors"
            style={{ color: "rgba(255,255,255,0.6)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.6)")
            }
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(56,189,248,0.2)" }}
            >
              <Calendar className="w-5 h-5" style={{ color: SKY }} />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-[20px] leading-tight">
                Consultation History
              </h1>
              <p
                className="text-[12px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                All your past and current consultations
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div
            className="flex items-center bg-white rounded-xl overflow-hidden border-2"
            style={{
              borderColor: SKY,
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex-1 flex items-center gap-2.5 px-4 py-3">
              <Search
                className="w-4 h-4 flex-shrink-0"
                style={{ color: ACCENT }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by doctor or specialty…"
                className="flex-1 text-[14px] font-medium outline-none placeholder:text-slate-400"
                style={{ color: "#1e293b" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4 space-y-4">
        {/* Filter tabs — white pill row, floats above the body */}
        <div
          className="bg-white border border-slate-200 rounded-2xl p-1.5 flex gap-1"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          {FILTER_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setStatusFilter(t.value)}
              className="flex-1 py-2 rounded-xl text-[12px] font-bold transition-all"
              style={{
                background: statusFilter === t.value ? NAV_BG : "transparent",
                color: statusFilter === t.value ? "white" : "#64748b",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-slate-400 px-1">
          <span className="font-bold text-slate-600">{filtered.length}</span>{" "}
          consultations
        </p>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: ACCENT }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="bg-white border border-slate-200 rounded-2xl p-12 text-center"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: "#eff6ff" }}
            >
              <Calendar className="w-7 h-7" style={{ color: ACCENT }} />
            </div>
            <p className="font-bold text-slate-700 text-[15px]">
              No consultations found
            </p>
            <p className="text-[12px] text-slate-400 mt-1">
              Try adjusting your search or filter
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {filtered.map((s) => {
              const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.active;
              const StatusIcon = cfg.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => router.push("/appointments")}
                  className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all group"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  <div className="flex items-center gap-4">
                    {/* Doctor avatar */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                      {s.doctorAvatar ? (
                        <Image
                          src={s.doctorAvatar}
                          alt={s.doctorName}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: "#eff6ff" }}
                        >
                          <Stethoscope
                            className="w-5 h-5"
                            style={{ color: ACCENT }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-[14px] text-slate-900">
                            {s.doctorName}
                          </p>
                          <p
                            className="text-[11px] font-semibold"
                            style={{ color: ACCENT }}
                          >
                            {s.doctorSpecialty}
                          </p>
                        </div>
                        {/* Status badge */}
                        <span
                          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          <StatusIcon className="w-3 h-3" /> {cfg.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {s.created_at
                            ? new Date(s.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "—"}
                        </span>
                        {s.durationMinutes && (
                          <span>{s.durationMinutes} min</span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
