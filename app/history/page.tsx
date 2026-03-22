"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, Calendar, ChevronRight, Loader2, Clock, CheckCircle, XCircle, Activity } from "lucide-react";
import { getUser, loadUser } from "@/lib/supabase/auth";
import type { ConsultationSession } from "@/lib/types";

type StatusFilter = "all" | "completed" | "missed" | "active";

const STATUS_CONFIG: Record<string, { icon: any; label: string; cls: string }> = {
  completed:  { icon: CheckCircle, label: "Completed",  cls: "bg-emerald-50 text-emerald-700" },
  missed:     { icon: XCircle,     label: "Missed",     cls: "bg-rose-50 text-rose-600"       },
  active:     { icon: Activity,    label: "Active",     cls: "bg-primary-50 text-primary-600" },
  waiting:    { icon: Clock,       label: "Waiting",    cls: "bg-amber-50 text-amber-600"     },
  follow_up:  { icon: Calendar,    label: "Follow-up",  cls: "bg-purple-50 text-purple-600"   },
};

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ConsultationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    (async () => {
      let u = getUser(); if (!u) u = await loadUser();
      if (!u) { setLoading(false); return; }
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
    if (statusFilter !== "all") r = r.filter(s => s.status === statusFilter);
    if (query) { const q = query.toLowerCase(); r = r.filter(s => s.doctorName.toLowerCase().includes(q) || s.doctorSpecialty.toLowerCase().includes(q)); }
    return r.sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime());
  }, [sessions, query, statusFilter]);

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-up pb-safe">
      <div>
        <h1 className="font-display font-bold text-xl text-slate-800">Consultation History</h1>
        <p className="text-xs text-slate-400 mt-0.5">All your past and current consultations</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by doctor or specialty…" className="input-field pl-10" />
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {(["all","completed","missed","active"] as StatusFilter[]).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all border ${
              statusFilter === s ? "bg-primary-600 text-white border-primary-600 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-primary-300"
            }`}>
            {s}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400"><span className="font-bold text-slate-600">{filtered.length}</span> consultations</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Calendar className="w-6 h-6 text-slate-400" /></div>
          <p className="font-semibold text-slate-500">No consultations found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.active;
            const StatusIcon = cfg.icon;
            return (
              <button key={s.id} onClick={() => router.push("/appointments")}
                className="card-interactive w-full p-4 text-left group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                    <Image src={s.doctorAvatar} alt={s.doctorName} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{s.doctorName}</p>
                        <p className="text-xs text-primary-600 font-medium">{s.doctorSpecialty}</p>
                      </div>
                      <span className={`badge flex-shrink-0 ${cfg.cls}`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.created_at ? new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                      {s.durationMinutes && <span>{s.durationMinutes} min</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}