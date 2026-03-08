"use client";

import { useEffect, useState, useCallback } from "react";
import { getUser } from "@/lib/supabase/auth";
import Link from "next/link";
import {
    Calendar, Search, X, CheckCircle2, Clock, Video,
    ChevronDown, ChevronUp, MessageSquare, FileText,
    UserCheck, AlertCircle, Loader2, Filter, RefreshCw,
    Zap, Eye, Activity,
} from "lucide-react";

interface Consultation {
    id: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    patientAvatar: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
    notes: string | null;
    summary: string | null;
    isFollowUp: boolean;
    followUpScheduledAt: string | null;
    created_at: string;
}

const STATUS_TABS = ["all", "waiting", "active", "completed", "missed", "follow_up"] as const;

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
    waiting: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Waiting" },
    completed: { bg: "bg-primary-50", text: "text-primary-700", dot: "bg-primary-500", label: "Completed" },
    missed: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Missed" },
    follow_up: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500", label: "Follow-up" },
    cancelled: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400", label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = statusConfig[status] || statusConfig.cancelled;
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function ConsultationDetailPanel({ consultation, onClose, onStatusUpdate }: {
    consultation: Consultation;
    onClose: () => void;
    onStatusUpdate: (id: string, status: string, notes?: string, summary?: string) => void;
}) {
    const [notes, setNotes] = useState(consultation.notes || "");
    const [summary, setSummary] = useState(consultation.summary || "");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onStatusUpdate(consultation.id, consultation.status, notes, summary);
        setSaving(false);
    };

    return (
        <div className="card border border-slate-200 animate-fade-up">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 font-bold uppercase">{consultation.patientName?.[0] || "P"}</span>
                    </div>
                    <div>
                        <h3 className="font-display font-semibold text-slate-800">{consultation.patientName}</h3>
                        <p className="text-xs text-slate-500">{consultation.patientEmail}</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-1">Status</p>
                    <StatusBadge status={consultation.status} />
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-1">Duration</p>
                    <p className="text-sm font-semibold text-slate-700">{consultation.durationMinutes ? `${consultation.durationMinutes} min` : "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-1">Date</p>
                    <p className="text-sm font-semibold text-slate-700">{new Date(consultation.created_at).toLocaleDateString()}</p>
                </div>
            </div>

            {consultation.isFollowUp && (
                <div className="mb-4 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700 font-medium">
                    Follow-up consultation
                    {consultation.followUpScheduledAt && ` · Scheduled: ${new Date(consultation.followUpScheduledAt).toLocaleDateString()}`}
                </div>
            )}

            <div className="space-y-3">
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Clinical Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Add clinical notes..."
                        className="w-full input-field resize-none text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Consultation Summary
                    </label>
                    <textarea
                        value={summary}
                        onChange={e => setSummary(e.target.value)}
                        rows={2}
                        placeholder="Add a summary for the patient..."
                        className="w-full input-field resize-none text-sm"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-xs px-4 py-2">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Save Notes
                </button>
                {(consultation.status === "active") && (
                    <Link href={`/meeting?consultationId=${consultation.id}&role=doctor`}
                        className="btn-accent flex items-center gap-2 text-xs px-4 py-2">
                        <Video className="w-3.5 h-3.5" />
                        Join Video Call
                    </Link>
                )}
                {consultation.status === "active" && (
                    <button onClick={() => onStatusUpdate(consultation.id, "completed", notes, summary)}
                        className="btn-secondary flex items-center gap-2 text-xs px-4 py-2">
                        End Session
                    </button>
                )}
            </div>
        </div>
    );
}

export default function DoctorConsultationsPage() {
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const loadConsultations = useCallback(async (isRefresh = false) => {
        const u = getUser();
        if (!u) return;
        if (isRefresh) setRefreshing(true);

        try {
            const res = await fetch(`/api/doctor/consultations?doctorId=${u.id}`);
            const json = await res.json();
            setConsultations(json.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadConsultations(); }, [loadConsultations]);

    const handleStatusUpdate = async (consultationId: string, status: string, notes?: string, summary?: string) => {
        try {
            await fetch("/api/doctor/consultations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consultationId, status, notes, summary }),
            });
            setConsultations(prev => prev.map(c =>
                c.id === consultationId ? { ...c, status, notes: notes ?? c.notes, summary: summary ?? c.summary } : c
            ));
        } catch (err) { console.error(err); }
    };

    const filtered = consultations.filter(c => {
        if (filter !== "all" && c.status !== filter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return c.patientName.toLowerCase().includes(q) || c.patientEmail.toLowerCase().includes(q);
        }
        return true;
    });

    const counts = STATUS_TABS.reduce((acc, tab) => {
        acc[tab] = tab === "all" ? consultations.length : consultations.filter(c => c.status === tab).length;
        return acc;
    }, {} as Record<string, number>);

    const waiting = consultations.filter(c => c.status === "waiting");
    const active = consultations.filter(c => c.status === "active");

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-slate-200 rounded-xl w-48 animate-pulse" />
                <div className="h-24 bg-slate-200 rounded-2xl animate-pulse" />
                {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />)}
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-up max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-display font-bold text-2xl text-slate-800">Consultations</h1>
                    <p className="text-sm text-slate-500 mt-1">{consultations.length} total consultations</p>
                </div>
                <button onClick={() => loadConsultations(true)} disabled={refreshing}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Urgent: waiting patients */}
            {waiting.length > 0 && (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <p className="font-semibold text-amber-800">{waiting.length} Patient{waiting.length > 1 ? "s" : ""} Waiting</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {waiting.map(c => (
                            <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-amber-700 text-xs font-bold uppercase">{c.patientName?.[0] || "P"}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 truncate">{c.patientName}</p>
                                    <p className="text-xs text-slate-400">
                                        {Math.floor((Date.now() - new Date(c.created_at).getTime()) / 60000)}m ago
                                    </p>
                                </div>
                                <button onClick={() => handleStatusUpdate(c.id, "active")}
                                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0">
                                    <Zap className="w-3 h-3" />
                                    Accept
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active sessions */}
            {active.length > 0 && (
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-5 h-5 text-emerald-600" />
                        <p className="font-semibold text-emerald-800">{active.length} Active Session{active.length > 1 ? "s" : ""}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {active.map(c => (
                            <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-emerald-700 text-xs font-bold uppercase">{c.patientName?.[0] || "P"}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 truncate">{c.patientName}</p>
                                    <p className="text-xs text-slate-400">Session in progress</p>
                                </div>
                                <Link href={`/meeting?consultationId=${c.id}&role=doctor`}
                                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex-shrink-0">
                                    <Video className="w-3 h-3" />
                                    Join
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search patients..."
                        className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
                    {STATUS_TABS.map(tab => (
                        <button key={tab} onClick={() => setFilter(tab)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition-all
                                ${filter === tab ? "bg-white text-primary-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                            {tab === "all" ? "All" : tab.replace("_", " ")}
                            {counts[tab] > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                    ${filter === tab ? "bg-primary-100 text-primary-600" : "bg-slate-200 text-slate-500"}`}>
                                    {counts[tab]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results */}
            {filtered.length === 0 ? (
                <div className="card text-center py-14">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Calendar className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-500">No consultations found</p>
                    <p className="text-xs text-slate-400 mt-1">Try changing your filters or search query</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(c => {
                        const sc = statusConfig[c.status] || statusConfig.cancelled;
                        const isExpanded = expandedId === c.id;
                        return (
                            <div key={c.id} className="card p-0 overflow-hidden">
                                <div
                                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50/60 transition-colors"
                                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                >
                                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-primary-700 text-xs font-bold uppercase">{c.patientName?.[0] || "P"}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold text-slate-700">{c.patientName || "Unknown"}</p>
                                            {c.isFollowUp && <span className="text-[10px] bg-purple-50 text-purple-600 font-medium px-1.5 py-0.5 rounded-full">Follow-up</span>}
                                        </div>
                                        <p className="text-xs text-slate-400 truncate">{c.patientEmail} · {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {c.durationMinutes && <span className="text-xs text-slate-400 hidden sm:block">{c.durationMinutes}m</span>}
                                        <StatusBadge status={c.status} />

                                        {/* Quick actions */}
                                        <div className="flex gap-1 ml-1" onClick={e => e.stopPropagation()}>
                                            {c.status === "waiting" && (
                                                <button onClick={() => handleStatusUpdate(c.id, "active")}
                                                    title="Accept"
                                                    className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {c.status === "active" && (
                                                <Link href={`/meeting?consultationId=${c.id}&role=doctor`}
                                                    title="Join video"
                                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                                    <Video className="w-3.5 h-3.5" />
                                                </Link>
                                            )}
                                        </div>

                                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-100 p-4">
                                        <ConsultationDetailPanel
                                            consultation={c}
                                            onClose={() => setExpandedId(null)}
                                            onStatusUpdate={handleStatusUpdate}
                                        />
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
