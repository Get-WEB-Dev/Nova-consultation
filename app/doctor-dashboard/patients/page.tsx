"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Users, Search, Mail, Phone, ChevronDown, Activity, Repeat, Pill, MessageSquare, FolderOpen } from "lucide-react";
import { getUser, loadUser } from "@/lib/supabase/auth";
import { PageHeader, Card, StatTile, EmptyState, ErrorState, SkeletonRows, Chip, Avatar, ACCENT, timeAgo, NAV_BG } from "@/components/doctor/ui";

interface Patient { id: string; name: string; email: string; avatar_url: string | null; phone: string | null; dob: string | null }
interface Consult {
  id: string; patientId: string; status: string; created_at: string; endedAt: string | null;
  durationMinutes: number | null; isFollowUp: boolean; diagnosis: string | null; outcome: string | null;
}

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  completed: { bg: "#f0fdf4", fg: "#15803d", label: "Completed" },
  follow_up: { bg: "#fffbeb", fg: "#b45309", label: "Follow-up" },
  active: { bg: "#eff6ff", fg: ACCENT, label: "In progress" },
  waiting: { bg: "#eff6ff", fg: ACCENT, label: "Waiting" },
  missed: { bg: "#fff1f2", fg: "#be123c", label: "Missed" },
  cancelled: { bg: "#f8fafc", fg: "#64748b", label: "Cancelled" },
};
const SEEN = ["completed", "follow_up"];
type Sort = "recent" | "name" | "visits";
type Filter = "all" | "returning" | "followup";

function age(dob: string | null) {
  if (!dob) return null;
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000));
  return years > 0 && years < 130 ? years : null;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consults, setConsults] = useState<Consult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = getUser() ?? (await loadUser());
      if (!u) throw new Error("Please sign in again");
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/doctor/patients?doctorId=${u.id}`),
        fetch(`/api/doctor/consultations?doctorId=${u.id}`),
      ]);
      const [p, c] = await Promise.all([pRes.json().catch(() => ({})), cRes.json().catch(() => ({}))]);
      if (!pRes.ok || !cRes.ok) throw new Error(p.error || c.error || "Could not load your patients");
      setPatients((p.data ?? []).filter(Boolean));
      setConsults(c.data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // One pass: everything we need to know about each patient
  const stats = useMemo(() => {
    const map = new Map<string, { visits: number; last: string | null; pendingFollowUp: boolean; history: Consult[] }>();
    for (const c of consults) {
      const s = map.get(c.patientId) ?? { visits: 0, last: null, pendingFollowUp: false, history: [] };
      s.history.push(c);
      if (SEEN.includes(c.status)) {
        s.visits++;
        if (!s.last || new Date(c.created_at) > new Date(s.last)) s.last = c.created_at;
      }
      if (c.status === "follow_up") s.pendingFollowUp = true;
      map.set(c.patientId, s);
    }
    map.forEach((s) => s.history.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)));
    return map;
  }, [consults]);

  const get = (id: string) => stats.get(id) ?? { visits: 0, last: null, pendingFollowUp: false, history: [] as Consult[] };

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return patients
      .filter((p) => !q || p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))
      .filter((p) => filter === "all" ? true : filter === "returning" ? get(p.id).visits > 1 : get(p.id).pendingFollowUp)
      .sort((a, b) => {
        if (sort === "name") return (a.name ?? "").localeCompare(b.name ?? "");
        if (sort === "visits") return get(b.id).visits - get(a.id).visits;
        return +new Date(get(b.id).last ?? 0) - +new Date(get(a.id).last ?? 0);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, stats, search, sort, filter]);

  const seenTotal = consults.filter((c) => SEEN.includes(c.status)).length;
  const returning = patients.filter((p) => get(p.id).visits > 1).length;
  const needFollowUp = patients.filter((p) => get(p.id).pendingFollowUp).length;

  return (
    <div className="space-y-4 pb-10">
      <PageHeader title="My Patients" subtitle={loading ? "Loading…" : `${patients.length} patient${patients.length === 1 ? "" : "s"} you've seen`} />

      {loading ? (
        <div className="space-y-3"><SkeletonRows count={1} height="h-20" /><SkeletonRows count={4} /></div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : patients.length === 0 ? (
        <EmptyState icon={Users} title="No patients yet" text="Patients appear here after your first consultation with them." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatTile icon={Users} label="Total patients" value={patients.length} bg="#eff6ff" color={ACCENT} />
            <StatTile icon={Activity} label="Sessions done" value={seenTotal} bg="#f0fdf4" color="#16a34a" />
            <StatTile icon={Repeat} label="Returning" value={returning} bg="#f5f3ff" color="#7c3aed" />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:border-blue-400" />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 outline-none">
              <option value="recent">Most recent</option>
              <option value="visits">Most visits</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Chip active={filter === "all"} onClick={() => setFilter("all")} count={patients.length}>All</Chip>
            <Chip active={filter === "returning"} onClick={() => setFilter("returning")} count={returning}>Returning</Chip>
            <Chip active={filter === "followup"} onClick={() => setFilter("followup")} count={needFollowUp}>Needs follow-up</Chip>
          </div>

          {list.length === 0 ? (
            <EmptyState icon={Search} title="No patients match" text="Try a different search or filter." />
          ) : (
            <div className="space-y-2.5">
              {list.map((p) => {
                const s = get(p.id);
                const isOpen = open === p.id;
                const years = age(p.dob);
                return (
                  <Card key={p.id} className="overflow-hidden">
                    <button onClick={() => setOpen(isOpen ? null : p.id)} className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-slate-50/60">
                      <Avatar name={p.name} src={p.avatar_url} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-[14px] truncate">{p.name}{years ? <span className="font-medium text-slate-400 text-[12px]"> · {years} yrs</span> : null}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {s.visits} visit{s.visits === 1 ? "" : "s"} · last seen {s.last ? timeAgo(s.last) : "never"}
                        </p>
                      </div>
                      {s.pendingFollowUp && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Follow-up</span>}
                      <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 p-3.5 space-y-3 bg-slate-50/40">
                        <div className="flex gap-4 flex-wrap text-[12px] text-slate-500">
                          {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 hover:text-blue-600"><Mail className="w-3.5 h-3.5" />{p.email}</a>}
                          {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 hover:text-blue-600"><Phone className="w-3.5 h-3.5" />{p.phone}</a>}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Link href={`/doctor-dashboard/patients/${p.id}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-[12.5px] font-bold" style={{ background: NAV_BG }}><FolderOpen className="w-3.5 h-3.5" /> Open patient record</Link>
                          <Link href={`/doctor-dashboard/messages?patient=${p.id}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-[12.5px] font-bold text-slate-700 hover:bg-slate-50"><MessageSquare className="w-3.5 h-3.5" /> Message</Link>
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Recent consultations</p>
                        <div className="space-y-2">
                          {s.history.slice(0, 5).map((c) => {
                            const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.cancelled;
                            return (
                              <div key={c.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-start gap-3">
                                <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-semibold text-slate-700 flex items-center gap-1.5">
                                    {c.diagnosis ? <><Pill className="w-3 h-3 text-slate-400" />{c.diagnosis}</> : "No diagnosis recorded"}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {new Date(c.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                                    {c.durationMinutes ? ` · ${c.durationMinutes} min` : ""}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          {s.history.length > 5 && <p className="text-[11px] text-slate-400">+ {s.history.length - 5} older — see History for the full record</p>}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}