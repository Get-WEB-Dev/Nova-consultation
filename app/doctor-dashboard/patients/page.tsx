"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/supabase/auth";
import Link from "next/link";
import {
    Users, Search, X, Mail, Phone, Calendar,
    ChevronRight, Activity, Clock, MessageSquare,
    UserCircle, FileText, ChevronDown, ChevronUp,
} from "lucide-react";

interface Patient {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    phone: string | null;
    dob: string | null;
    role: string;
    created_at: string;
}

interface PatientConsultation {
    id: string;
    status: string;
    created_at: string;
    durationMinutes: number | null;
    isFollowUp: boolean;
}

function PatientCard({ patient, consultations, isExpanded, onToggle }: {
    patient: Patient;
    consultations: PatientConsultation[];
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const completedCount = consultations.filter(c => c.status === "completed").length;
    const lastConsult = consultations[0];
    const initials = patient.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "P";

    return (
        <div className="card p-0 overflow-hidden hover:shadow-card-hover transition-all">
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-bold text-sm">{initials}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{patient.name}</p>
                                {patient.email && (
                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                        <Mail className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{patient.email}</span>
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {completedCount} visit{completedCount !== 1 ? "s" : ""}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            {patient.phone && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {patient.phone}
                                </span>
                            )}
                            {patient.dob && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(patient.dob).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                            )}
                            {lastConsult && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Last: {new Date(lastConsult.created_at).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 mt-3">
                    <a href={`mailto:${patient.email}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-primary-600 bg-slate-50 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Message
                    </a>
                    <button onClick={onToggle}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all">
                        <FileText className="w-3.5 h-3.5" />
                        History ({consultations.length})
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            {/* Consultation history panel */}
            {isExpanded && consultations.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Consultation History</p>
                    <div className="space-y-2">
                        {consultations.slice(0, 5).map(c => (
                            <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    c.status === "completed" ? "bg-primary-500" :
                                    c.status === "active" ? "bg-emerald-500" :
                                    c.status === "missed" ? "bg-rose-500" : "bg-slate-400"
                                }`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-700">{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                                    <p className="text-[11px] text-slate-400 capitalize">
                                        {c.status.replace("_", " ")}
                                        {c.isFollowUp && " · Follow-up"}
                                        {c.durationMinutes && ` · ${c.durationMinutes} min`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {consultations.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-2">No consultation history</p>
                    )}
                </div>
            )}

            {isExpanded && consultations.length === 0 && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-4 text-center">
                    <p className="text-xs text-slate-400">No consultation history yet</p>
                </div>
            )}
        </div>
    );
}

export default function DoctorPatientsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [consultations, setConsultations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"name" | "recent">("recent");

    useEffect(() => {
        const u = getUser();
        if (!u) return;

        Promise.all([
            fetch(`/api/doctor/patients?doctorId=${u.id}`).then(r => r.json()),
            fetch(`/api/doctor/consultations?doctorId=${u.id}`).then(r => r.json()).catch(() => ({ data: [] })),
        ]).then(([patRes, conRes]) => {
            setPatients(patRes.data || []);
            setConsultations(conRes.data || []);
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const getPatientConsultations = (patientId: string): PatientConsultation[] => {
        return consultations
            .filter(c => c.patientId === patientId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .map(c => ({
                id: c.id,
                status: c.status,
                created_at: c.created_at,
                durationMinutes: c.durationMinutes,
                isFollowUp: c.isFollowUp,
            }));
    };

    let filtered = patients.filter(p => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return p.name?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q);
    });

    if (sortBy === "name") {
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else {
        filtered = [...filtered].sort((a, b) => {
            const aConsults = getPatientConsultations(a.id);
            const bConsults = getPatientConsultations(b.id);
            if (!aConsults.length && !bConsults.length) return 0;
            if (!aConsults.length) return 1;
            if (!bConsults.length) return -1;
            return new Date(bConsults[0].created_at).getTime() - new Date(aConsults[0].created_at).getTime();
        });
    }

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-slate-200 rounded-xl w-40 animate-pulse" />
                <div className="grid sm:grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-36 bg-slate-200 rounded-2xl animate-pulse" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-up max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-display font-bold text-2xl text-slate-800">My Patients</h1>
                    <p className="text-sm text-slate-500 mt-1">{patients.length} patient{patients.length !== 1 ? "s" : ""} total</p>
                </div>
            </div>

            {/* Search & sort */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                    {(["recent", "name"] as const).map(sort => (
                        <button key={sort} onClick={() => setSortBy(sort)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all
                                ${sortBy === sort ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                            {sort === "recent" ? "Most Recent" : "By Name"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-slate-800">{patients.length}</p>
                        <p className="text-xs text-slate-500">Total patients</p>
                    </div>
                </div>
                <div className="card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-50 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-accent-500" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-slate-800">{consultations.filter(c => c.status === "completed").length}</p>
                        <p className="text-xs text-slate-500">Completed sessions</p>
                    </div>
                </div>
                <div className="card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-slate-800">{consultations.filter(c => c.isFollowUp).length}</p>
                        <p className="text-xs text-slate-500">Follow-ups</p>
                    </div>
                </div>
            </div>

            {/* Patient list */}
            {filtered.length === 0 ? (
                <div className="card text-center py-14">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-500">{search ? "No patients found" : "No patients yet"}</p>
                    <p className="text-xs text-slate-400 mt-1">
                        {search ? "Try a different search term" : "Patients will appear here after their first consultation"}
                    </p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                    {filtered.map(p => {
                        const patientConsults = getPatientConsultations(p.id);
                        return (
                            <PatientCard
                                key={p.id}
                                patient={p}
                                consultations={patientConsults}
                                isExpanded={expandedId === p.id}
                                onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
