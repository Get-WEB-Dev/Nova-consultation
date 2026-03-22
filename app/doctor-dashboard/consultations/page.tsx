"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { getUser } from "@/lib/supabase/auth";
import {
  Search, CheckCircle2, Clock, FileText, ChevronDown,
  ChevronUp, Loader2, Calendar, RefreshCw, GitFork,
  Filter, X, AlertCircle
} from "lucide-react";

interface C {
  id: string; patientName: string; patientEmail: string; status: string;
  created_at: string; durationMinutes: number | null; notes: string | null;
  summary: string | null; isFollowUp: boolean; followUpScheduledAt: string | null;
  patientId: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", label: "Active" },
  waiting: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500", label: "Waiting" },
  completed: { bg: "bg-primary-50 dark:bg-primary-900/20", text: "text-primary-700 dark:text-primary-400", dot: "bg-primary-500", label: "Completed" },
  missed: { bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500", label: "Missed" },
  follow_up: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500", label: "Follow-up" },
};

function Badge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.missed;
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span>;
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CCard({ c }: { c: C }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-primary-600 dark:text-primary-400 text-sm">{c.patientName[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-slate-800 dark:text-white text-sm">{c.patientName}</p>
              <Badge status={c.status} />
              {c.isFollowUp && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"><GitFork className="w-2.5 h-2.5" />Follow-up</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{timeAgo(c.created_at)}</span>
              {c.durationMinutes && <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{c.durationMinutes} min</span>}
            </div>
          </div>
          <div className="text-slate-300 flex-shrink-0">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-50 dark:border-slate-800 space-y-3 pt-3">
          {c.patientEmail && <p className="text-xs text-slate-400">{c.patientEmail}</p>}
          {c.notes && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notes</p><div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3"><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{c.notes}</p></div></div>}
          {c.summary && <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Summary</p><div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3"><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{c.summary}</p></div></div>}
          {c.followUpScheduledAt && (
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2.5 border border-purple-100 dark:border-purple-800">
              <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <div><p className="text-xs font-bold text-purple-700 dark:text-purple-300">Follow-up Scheduled</p><p className="text-xs text-purple-500 mt-0.5">{new Date(c.followUpScheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState<C[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [statusF, setStatusF] = useState("all");
  const [fuFilter, setFuFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [showF, setShowF] = useState(false);

  const load = useCallback(async (r = false) => {
    const u = getUser(); if (!u) return;
    if (r) setRefresh(true);
    try { const j = await fetch(`/api/doctor/consultations?doctorId=${u.id}`).then(x => x.json()); setItems(j.data || []); }
    catch { }
    if (r) setRefresh(false);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 10s so new patient consultations appear without reload
  useEffect(() => {
    const interval = setInterval(() => load(), 10000);
    return () => clearInterval(interval);
  }, [load]);

  const STATUS_TABS = [
    { k: "all", l: "All" }, { k: "completed", l: "Completed" }, { k: "active", l: "Active" },
    { k: "waiting", l: "Waiting" }, { k: "follow_up", l: "Follow-up" }, { k: "missed", l: "Missed" },
  ];

  const filtered = useMemo(() => {
    const f = items
      .filter(c => statusF === "all" || c.status === statusF)
      .filter(c => fuFilter === "all" || (fuFilter === "yes" ? c.isFollowUp : !c.isFollowUp))
      .filter(c => !search || c.patientName.toLowerCase().includes(search.toLowerCase()))
      .filter(c => !date || c.created_at.startsWith(date));

    // Group by patientId
    const groups: Record<string, C[]> = {};
    for (const c of f) {
      const pid = c.patientId || c.patientEmail || c.patientName;
      if (!groups[pid]) groups[pid] = [];
      groups[pid].push(c);
    }

    // Sort patients by latest consultation
    return Object.values(groups).sort((a, b) =>
      new Date(b[0].created_at).getTime() - new Date(a[0].created_at).getTime()
    );
  }, [items, statusF, fuFilter, search, date]);

  const stats = {
    total: items.length,
    done: items.filter(c => c.status === "completed").length,
    fu: items.filter(c => c.isFollowUp).length,
    missed: items.filter(c => c.status === "missed").length,
  };

  return (
    <div className="animate-fade-up space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl text-slate-800 dark:text-white">History</h1>
          <p className="text-xs text-slate-400 mt-0.5">{stats.total} total consultations</p>
        </div>
        <button onClick={() => load(true)} disabled={refresh} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 shadow-sm">
          <RefreshCw className={`w-4 h-4 text-slate-500 ${refresh ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { l: "Total", v: stats.total, c: "text-slate-800 dark:text-white" },
          { l: "Done", v: stats.done, c: "text-accent-600 dark:text-accent-400" },
          { l: "Follow", v: stats.fu, c: "text-purple-600 dark:text-purple-400" },
          { l: "Missed", v: stats.missed, c: "text-rose-600 dark:text-rose-400" },
        ].map(s => (
          <div key={s.l} className="bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-card border border-slate-100 dark:border-slate-800 text-center">
            <p className={`font-bold text-xl ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 shadow-sm">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by patient name…" className="flex-1 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none bg-transparent" />
          {search && <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <button onClick={() => setShowF(!showF)} className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm ${showF ? "bg-primary-600 text-white border-primary-600" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"}`}>
          <Filter className="w-4 h-4" /><span className="hidden sm:block">Filter</span>
        </button>
      </div>

      {/* Filters */}
      {showF && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-card p-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map(t => (
                <button key={t.k} onClick={() => setStatusF(t.k)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${statusF === t.k ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200"}`}>{t.l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Follow-up</p>
              <div className="flex gap-1.5">
                {[{ k: "all", l: "All" }, { k: "yes", l: "Yes" }, { k: "no", l: "No" }].map(f => (
                  <button key={f.k} onClick={() => setFuFilter(f.k)} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${fuFilter === f.k ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"}`}>{f.l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</p>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-600 dark:text-slate-300 focus:outline-none focus:border-primary-300 bg-white dark:bg-slate-800" />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading
        ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
        : filtered.length === 0
          ? <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-400">No consultations found</p>
            <p className="text-xs text-slate-300 mt-1">Try adjusting your search or filters</p>
          </div>
          : <div className="space-y-3">
            <p className="text-xs text-slate-400 font-medium">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.map((group: C[]) => (
              <div key={group[0].patientId || group[0].patientName} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group[0].patientName}</span>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></div>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">{group.length} {group.length === 1 ? 'session' : 'sessions'}</span>
                </div>
                {group.map((c: C) => <CCard key={c.id} c={c} />)}
              </div>
            ))}
          </div>
      }
    </div>
  );
}
