"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/supabase/auth";
import { Users, Search, X, Mail, Phone, Calendar, ChevronDown, ChevronUp, Activity, MessageSquare, Clock } from "lucide-react";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";

interface Patient { id: string; name: string; email: string; avatar_url: string | null; phone: string | null; dob: string | null; created_at: string; }
interface Consult { id: string; patientId: string; status: string; created_at: string; durationMinutes: number | null; isFollowUp: boolean; }

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consults, setConsults] = useState<Consult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<"name" | "recent">("recent");

  useEffect(() => {
    const u = getUser(); if (!u) return;
    Promise.all([
      fetch(`/api/doctor/patients?doctorId=${u.id}`).then(r => r.json()),
      fetch(`/api/doctor/consultations?doctorId=${u.id}`).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([p, c]) => { setPatients(p.data || []); setConsults(c.data || []); }).finally(() => setLoading(false));
  }, []);

  const getConsults = (pid: string) => consults.filter(c => c.patientId === pid).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  let filtered = patients.filter(p => !search.trim() || p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()));
  filtered = [...filtered].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    const ac = getConsults(a.id), bc = getConsults(b.id);
    if (!ac.length && !bc.length) return 0;
    if (!ac.length) return 1; if (!bc.length) return -1;
    return new Date(bc[0].created_at).getTime() - new Date(ac[0].created_at).getTime();
  });

  const totalCompleted = consults.filter(c => c.status === "completed").length;
  const totalFollowUps = consults.filter(c => c.isFollowUp).length;

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-white rounded-xl" />
      <div className="grid sm:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-2xl" />)}</div>
    </div>
  );

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div>
        <h1 className="font-extrabold text-slate-900 text-[18px] sm:text-[20px]">My Patients</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">{patients.length} patients total</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users,    label: "Total Patients", value: patients.length,    bg: "#eff6ff", color: ACCENT    },
          { icon: Activity, label: "Sessions Done",  value: totalCompleted,     bg: "#f0fdf4", color: "#16a34a" },
          { icon: Calendar, label: "Follow-ups",     value: totalFollowUps,     bg: "#fef3c7", color: "#d97706" },
        ].map(({ icon: Icon, label, value, bg, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center gap-2.5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-slate-900 text-[17px] leading-none">{value}</p>
              <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Sort */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-300 transition-colors" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients…"
            className="flex-1 text-[13px] font-medium outline-none placeholder:text-slate-400 bg-transparent" style={{ color: "#1e293b" }} />
          {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-slate-300" /></button>}
        </div>
        <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {(["recent", "name"] as const).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className="px-3 py-2 text-[12px] font-bold transition-all"
              style={sort === s ? { background: NAV_BG, color: "white" } : { color: "#64748b" }}>
              {s === "recent" ? "Recent" : "A–Z"}
            </button>
          ))}
        </div>
      </div>

      {/* Patient list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#eff6ff" }}>
            <Users className="w-5 h-5" style={{ color: ACCENT }} />
          </div>
          <p className="font-bold text-slate-600">{search ? "No patients found" : "No patients yet"}</p>
          <p className="text-[12px] text-slate-400 mt-1">Patients will appear here after consultations</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map(p => {
            const pc = getConsults(p.id);
            const isOpen = expanded === p.id;
            const initials = p.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "P";
            const completed = pc.filter(c => c.status === "completed").length;
            return (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-extrabold text-base"
                      style={{ background: "linear-gradient(135deg, #0071c2, #003580)" }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[13px] text-slate-900 truncate">{p.name}</p>
                      {p.email && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{p.email}</p>}
                      {p.phone && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{p.phone}</p>}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: "#eff6ff", color: ACCENT }}>
                      {completed} visits
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <a href={`mailto:${p.email}`}
                      className="flex items-center gap-1.5 text-[11px] font-bold py-1.5 rounded-xl border border-slate-200 flex-1 justify-center text-slate-600 hover:bg-slate-50 transition-all">
                      <MessageSquare className="w-3.5 h-3.5" /> Message
                    </a>
                    <button onClick={() => setExpanded(isOpen ? null : p.id)}
                      className="flex items-center gap-1.5 text-[11px] font-bold py-1.5 rounded-xl flex-1 justify-center text-white transition-all active:scale-95"
                      style={{ background: NAV_BG }}>
                      <Activity className="w-3.5 h-3.5" /> History ({pc.length})
                      {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3" style={{ background: "#f8fafc" }}>
                    {pc.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-2">No consultation history</p>
                    ) : (
                      <div className="space-y-1.5">
                        {pc.slice(0, 5).map(c => (
                          <div key={c.id} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2 border border-slate-100">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "completed" ? "bg-emerald-500" : c.status === "active" ? "bg-blue-500" : c.status === "missed" ? "bg-rose-500" : "bg-slate-400"}`} />
                            <p className="text-[11px] text-slate-700 flex-1">{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                            <span className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                              {c.durationMinutes && <><Clock className="w-2.5 h-2.5" /> {c.durationMinutes}m · </>}
                              {c.status.replace("_", " ")}{c.isFollowUp ? " · FU" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
