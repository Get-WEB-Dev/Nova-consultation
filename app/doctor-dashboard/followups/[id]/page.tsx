"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft, Calendar, AlertCircle, Stethoscope, Pill, FileText, Video, Check, RotateCcw, Loader2, Clock, CheckCircle2, XCircle, X
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

const PRIORITY_CONFIG = {
    high: { bg: "#fff1f2", text: "#be123c", border: "#fecdd3", label: "High" },
    medium: { bg: "#fffbeb", text: "#b45309", border: "#fde68a", label: "Medium" },
    low: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", label: "Low" },
};

const STATUS_CONFIG = {
    pending: { bg: "#eff6ff", text: ACCENT, icon: Clock, label: "Pending" },
    completed: { bg: "#f0fdf4", text: "#15803d", icon: CheckCircle2, label: "Completed" },
    missed: { bg: "#fff1f2", text: "#be123c", icon: XCircle, label: "Missed" },
    cancelled: { bg: "#f8fafc", text: "#64748b", icon: X, label: "Cancelled" },
};

function PriorityBadge({ priority }: { priority: Priority }) {
    const c = PRIORITY_CONFIG[priority];
    return (
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border" style={{ background: c.bg, color: c.text, borderColor: c.border }}>
            {c.label}
        </span>
    );
}

function StatusBadge({ status }: { status: FUStatus }) {
    const c = STATUS_CONFIG[status];
    const Icon = c.icon;
    return (
        <span className="flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
            <Icon className="w-3 h-3" />
            {c.label}
        </span>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode; }) {
    return (
        <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
            {children}
        </div>
    );
}

export default function FollowUpDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [fu, setFu] = useState<FollowUp | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFU = async () => {
            try {
                const user = getUser();
                if (!user) return;
                const res = await fetch(`/api/follow-ups?doctorId=${user.id}`);
                if (res.ok) {
                    const j = await res.json();
                    const items = j.data || [];
                    const found = items.find((f: any) => f.id === params.id);
                    if (found) setFu(found);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchFU();
    }, [params.id]);

    const handleComplete = async () => {
        if (!fu) return;
        setFu({ ...fu, status: "completed" });
        try {
            await fetch("/api/follow-ups", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consultationId: fu.id, status: "completed" }),
            });
        } catch (err) { console.error(err); }
    };

    const handleReschedule = async () => {
        const d = prompt("Enter new date/time (YYYY-MM-DDTHH:MM):", fu?.scheduledAt.slice(0, 16));
        if (!d || !fu) return;
        setFu({ ...fu, scheduledAt: new Date(d).toISOString(), status: "pending" });
        try {
            await fetch("/api/follow-ups", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consultationId: fu.id, scheduledAt: new Date(d).toISOString(), status: "pending" }),
            });
        } catch (err) { console.error(err); }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Loading details...</p>
            </div>
        );
    }

    if (!fu) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Follow-up Not Found</h2>
                <p className="text-slate-500 mb-6">This record may have been deleted or is unavailable.</p>
                <button onClick={() => router.back()} className="px-5 py-2.5 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition-colors">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-4">
                <ChevronLeft className="w-4 h-4" />
                Back to Follow-ups
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                {/* Header */}
                <div className="flex items-center gap-4 px-6 sm:px-8 py-6 flex-shrink-0" style={{ background: NAV_BG }}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-extrabold text-2xl flex-shrink-0" style={{ background: ACCENT }}>
                        {fu.patientName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-extrabold text-white text-xl sm:text-2xl leading-tight truncate">{fu.patientName}</h1>
                        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{fu.patientEmail}</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 space-y-8" style={{ background: "#f8fafc" }}>

                    {/* Schedule box */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border border-blue-100 bg-white" style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#eff6ff" }}>
                                <Calendar className="w-6 h-6" style={{ color: ACCENT }} />
                            </div>
                            <div>
                                <p className="font-bold text-sm" style={{ color: ACCENT }}>Scheduled Follow-up</p>
                                <p className="text-base font-bold text-slate-800 mt-0.5">
                                    {new Date(fu.scheduledAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-2">
                            <PriorityBadge priority={fu.priority} />
                            <StatusBadge status={fu.status} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <Section label="Reason for Follow-up">
                                <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-100 bg-rose-50">
                                    <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                                    <p className="text-sm font-medium text-rose-800 leading-relaxed">{fu.reason}</p>
                                </div>
                            </Section>

                            {fu.instructions && (
                                <Section label="Doctor Instructions">
                                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                        <p className="text-sm text-slate-700 leading-relaxed">{fu.instructions}</p>
                                    </div>
                                </Section>
                            )}

                            {fu.diagnosis && (
                                <Section label="Diagnosis">
                                    <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                        <Stethoscope className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                        <p className="text-sm font-bold text-slate-800">{fu.diagnosis}</p>
                                    </div>
                                </Section>
                            )}
                        </div>

                        <div className="space-y-6">
                            {fu.prescriptions?.length > 0 && (
                                <Section label={`Prescriptions (${fu.prescriptions.length})`}>
                                    <div className="space-y-3">
                                        {fu.prescriptions.map((rx, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                    <Pill className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700">{rx}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            )}

                            {fu.notes && (
                                <Section label="Consultation Notes">
                                    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50">
                                        <FileText className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm font-medium text-amber-900 leading-relaxed">{fu.notes}</p>
                                    </div>
                                </Section>
                            )}
                        </div>
                    </div>

                    {(fu.chat?.length ?? 0) > 0 && (
                        <Section label="Previous Messages">
                            <div className="space-y-3 p-5 rounded-2xl bg-slate-100 border border-slate-200">
                                {fu.chat!.map((m, i) => (
                                    <div key={i} className={`flex ${m.from === "doctor" ? "justify-end" : "justify-start"}`}>
                                        <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm shadow-sm" style={m.from === "doctor" ? { background: NAV_BG, color: "white", borderBottomRightRadius: 4 } : { background: "white", color: "#1e293b", border: "1px solid #e2e8f0", borderBottomLeftRadius: 4 }}>
                                            <p>{m.text}</p>
                                            <p className="text-[10px] mt-1 opacity-70 text-right">{m.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                </div>

                {/* Action Footer */}
                {fu.status === "pending" && (
                    <div className="p-6 border-t border-slate-200 bg-white flex flex-col sm:flex-row gap-3">
                        <Link
                            href={`/doctor-dashboard/consult?followUpId=${fu.id}&patientId=${fu.patientId}`}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-extrabold text-white transition-all hover:opacity-90 shadow-sm"
                            style={{ background: NAV_BG }}
                        >
                            <Video className="w-5 h-5" /> Start Follow-up Consultation
                        </Link>
                        <div className="flex gap-3">
                            <button
                                onClick={handleComplete}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all"
                            >
                                <Check className="w-5 h-5" /> Mark as Done
                            </button>
                            <button
                                onClick={handleReschedule}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all"
                            >
                                <RotateCcw className="w-5 h-5" /> Reschedule
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
