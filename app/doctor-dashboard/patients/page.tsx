"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/supabase/auth";
import { Users, Search, X, Mail, Phone, Calendar, ChevronDown, ChevronUp, Activity, MessageSquare } from "lucide-react";

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
        const u = getUser();
        if (!u) return;
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
            <div className="h-8 w-32 bg-slate-200 rounded-xl" />
            <div className="grid sm:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}</div>
        </div>
    );

    return (
        <div className="space-y-4 animate-fade-up">
            <div>
                <h1 className="font-display font-bold text-xl text-slate-800">My Patients</h1>
                <p className="text-xs text-slate-500 mt-0.5">{patients.length} patients</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { icon: Users, label: "Total", value: patients.length, bg: "bg-primary-50", ic: "text-primary-600" },
                    { icon: Activity, label: "Sessions", value: totalCompleted, bg: "bg-accent-50", ic: "text-accent-600" },
                    { icon: Calendar, label: "Follow-ups", value: totalFollowUps, bg: "bg-purple-50", ic: "text-purple-600" },
                ].map(({ icon: Icon, label, value, bg, ic }) => (
                    <div key={label} className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-sm flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4.5 h-4.5 ${ic}`} style={{ width: "1.1rem", height: "1.1rem" }} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-lg leading-none">{value}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & Sort */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..."
                        className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-primary-400" />
                    {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-3.5 h-3.5" /></button>}
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {(["recent", "name"] as const).map(s => (
                        <button key={s} onClick={() => setSort(s)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${sort === s ? "bg-white text-primary-700 shadow-sm" : "text-slate-500"}`}>
                            {s === "recent" ? "Recent" : "A–Z"}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 py-14 text-center">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">{search ? "No patients found" : "No patients yet"}</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                    {filtered.map(p => {
                        const pc = getConsults(p.id);
                        const isOpen = expanded === p.id;
                        const initials = p.name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "P";
                        const completed = pc.filter(c => c.status === "completed").length;
                        return (
                            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                                            <span className="text-primary-700 text-sm font-bold">{initials}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                                            {p.email && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate"><Mail className="w-3 h-3 flex-shrink-0" />{p.email}</p>}
                                            {p.phone && <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{p.phone}</p>}
                                        </div>
                                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">{completed}v</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-primary-600 bg-slate-50 hover:bg-primary-50 px-3 py-1.5 rounded-xl transition-all flex-1 justify-center">
                                            <MessageSquare className="w-3.5 h-3.5" /> Message
                                        </a>
                                        <button onClick={() => setExpanded(isOpen ? null : p.id)}
                                            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition-all flex-1 justify-center">
                                            <Activity className="w-3.5 h-3.5" /> History ({pc.length})
                                            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                                        {pc.length === 0 ? (
                                            <p className="text-xs text-slate-400 text-center py-2">No history</p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                {pc.slice(0, 5).map(c => (
                                                    <div key={c.id} className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2 border border-slate-100">
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "completed" ? "bg-primary-500" : c.status === "active" ? "bg-emerald-500" : c.status === "missed" ? "bg-rose-500" : "bg-slate-400"}`} />
                                                        <p className="text-xs text-slate-700 flex-1">{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                                        <span className="text-[10px] text-slate-500 capitalize">{c.status.replace("_", " ")}{c.isFollowUp ? " · FU" : ""}{c.durationMinutes ? ` · ${c.durationMinutes}m` : ""}</span>
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
