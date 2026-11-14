"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download, ChevronRight, AlertCircle, RefreshCw, ClipboardList, Activity, Calendar, Clock, Repeat } from "lucide-react";
import { startPolling } from "@/lib/polling";
import { getUser, loadUser } from "@/lib/supabase/auth";
import { Avatar, NAV_BG, ACCENT } from "@/components/doctor/ui";
import { StatusPill, OutcomeBadge, SEEN, fmtDate, fmtTime } from "@/components/doctor/records";

interface Row {
  id: string; patientId: string; patientName: string; patientAvatar: string; status: string; created_at: string;
  durationMinutes: number | null; diagnosis: string | null; chiefComplaint: string | null; prescription: string | null;
  outcome: string | null; isFollowUp: boolean;
}

const STATUS_FILTERS = [["all", "All"], ["completed", "Completed"], ["follow_up", "Follow-up"], ["missed", "Missed"], ["cancelled", "Cancelled"]] as const;
const PERIODS = [["all", "All time", 0], ["today", "Today", 1], ["7", "Last 7 days", 7], ["30", "Last 30 days", 30], ["90", "Last 90 days", 90]] as const;
const PAGE = 25;

// CSV cells that start with = + - @ can run as formulas in Excel — neutralise them
const csvCell = (v: unknown) => {
  let s = String(v ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number][0]>("all");
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [shown, setShown] = useState(PAGE);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const u = getUser() ?? (await loadUser());
      if (!u) throw new Error("Please sign in again");
      const res = await fetch(`/api/doctor/consultations?doctorId=${u.id}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not load your history");
      setRows((j.data ?? []).filter((r: Row) => r.status !== "waiting" && r.status !== "active"));
      setError(null);
    } catch (e: any) { if (!quiet) setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); return startPolling(() => load(true), 30000); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const days = PERIODS.find((p) => p[0] === period)![2];
    const since = days ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1)); return d.getTime(); })() : 0;
    return rows
      .filter((r) => status === "all" || r.status === status)
      .filter((r) => !since || new Date(r.created_at).getTime() >= since)
      .filter((r) => !term || [r.patientName, r.diagnosis, r.chiefComplaint, r.prescription].some((f) => f?.toLowerCase().includes(term)))
      .sort((a, b) => (newestFirst ? 1 : -1) * (+new Date(b.created_at) - +new Date(a.created_at)));
  }, [rows, q, status, period, newestFirst]);
  useEffect(() => setShown(PAGE), [q, status, period, newestFirst]);

  const seen = rows.filter((r) => SEEN.includes(r.status));
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const durations = seen.map((r) => r.durationMinutes).filter((n): n is number => !!n);
  const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
  const counts = Object.fromEntries(STATUS_FILTERS.map(([k]) => [k, k === "all" ? rows.length : rows.filter((r) => r.status === k).length]));

  const exportCsv = () => {
    const head = ["Date", "Time", "Patient", "Status", "Outcome", "Duration (min)", "Chief complaint", "Diagnosis", "Prescription"];
    const lines = filtered.map((r) => [fmtDate(r.created_at), fmtTime(r.created_at), r.patientName, r.status, r.outcome ?? "", r.durationMinutes ?? "", r.chiefComplaint ?? "", r.diagnosis ?? "", r.prescription ?? ""].map(csvCell).join(","));
    const blob = new Blob(["\uFEFF" + [head.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `consultation-history-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-extrabold text-[20px] text-slate-900">Consultation history</h2>
          <p className="text-[12.5px] text-slate-400 mt-0.5">Every consultation you have held, with full clinical records.</p>
        </div>
        <button onClick={exportCsv} disabled={filtered.length === 0} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200" />)}</div>{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-2xl bg-white border border-slate-200" />)}</div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl text-center py-14 px-6 max-w-md mx-auto">
          <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" /><p className="font-display font-bold text-slate-800 mt-3">{error}</p>
          <button onClick={() => load()} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: NAV_BG }}><RefreshCw className="w-4 h-4" /> Try again</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl text-center py-16 px-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><ClipboardList className="w-7 h-7 text-slate-300" /></div>
          <p className="font-display font-bold text-slate-800">No consultations yet</p>
          <p className="text-[13px] text-slate-400 mt-1">Completed consultations and their records will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Activity, label: "Consultations held", value: seen.length },
              { icon: Calendar, label: "This month", value: seen.filter((r) => new Date(r.created_at).getTime() >= monthStart).length },
              { icon: Clock, label: "Average length", value: avg ? `${avg} min` : "—" },
              { icon: Repeat, label: "Need follow-up", value: rows.filter((r) => r.status === "follow_up").length },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
                <Icon className="w-4 h-4 text-slate-400" />
                <p className="font-display font-extrabold text-[24px] text-slate-900 mt-2 leading-none tabular-nums">{value}</p>
                <p className="text-[12px] text-slate-400 mt-1.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, diagnosis, complaint, prescription…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-teal-500" />
              </div>
              <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 outline-none">
                {PERIODS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <button onClick={() => setNewestFirst((v) => !v)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50">{newestFirst ? "Newest first" : "Oldest first"}</button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_FILTERS.map(([k, label]) => (
                <button key={k} onClick={() => setStatus(k)} className={`px-3 py-1 rounded-full text-[12px] font-bold ${status === k ? "text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`} style={status === k ? { background: NAV_BG } : undefined}>
                  {label} <span className="opacity-70">· {counts[k]}</span>
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl text-center py-14 px-6">
              <Search className="w-8 h-8 text-slate-300 mx-auto" /><p className="font-display font-bold text-slate-700 mt-3">No consultations match</p><p className="text-[13px] text-slate-400 mt-1">Try a different search, status or period.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
              {filtered.slice(0, shown).map((r) => (
                <Link key={r.id} href={`/doctor-dashboard/history/${r.id}`} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  <Avatar name={r.patientName} src={r.patientAvatar} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display font-bold text-[14.5px] text-slate-900 truncate">{r.patientName}</p>
                     
                    </div>
                    <p className="text-[13px] text-slate-600 truncate mt-0.5">{r.diagnosis || r.chiefComplaint || <span className="text-slate-300">No clinical notes recorded</span>}</p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5">{fmtDate(r.created_at)} · {fmtTime(r.created_at)}{r.durationMinutes ? ` · ${r.durationMinutes} min` : ""}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0"><OutcomeBadge outcome={r.outcome} /><StatusPill status={r.status} /></div>
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
          {filtered.length > shown && (
            <div className="text-center"><button onClick={() => setShown((n) => n + PAGE)} className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 hover:bg-slate-50">Show more ({filtered.length - shown} remaining)</button></div>
          )}
          <p className="text-[11.5px] text-slate-400" style={{ color: ACCENT }}>{filtered.length} of {rows.length} records</p>
        </>
      )}
    </div>
  );
}