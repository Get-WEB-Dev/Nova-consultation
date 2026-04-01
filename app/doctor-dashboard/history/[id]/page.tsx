"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    ChevronLeft, Activity, Thermometer, Heart, Droplets, Stethoscope, ClipboardList, Info, Pill, Paperclip, MessageSquarePlus, Calendar, CheckSquare, RotateCcw, Loader2, GitFork, ShieldCheck, ShieldAlert, Siren, Shield, CheckCircle2, ZapOff, Zap, Clock
} from "lucide-react";
import { getUser } from "@/lib/supabase/auth";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    active: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", label: "Active", icon: Zap },
    waiting: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Waiting", icon: Clock },
    completed: { bg: "bg-sky-50 border-sky-200", text: "text-sky-700", label: "Completed", icon: CheckCircle2 },
    missed: { bg: "bg-rose-50 border-rose-200", text: "text-rose-700", label: "Missed", icon: ZapOff },
    follow_up: { bg: "bg-violet-50 border-violet-200", text: "text-violet-700", label: "Follow-up", icon: GitFork },
};

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    low: { bg: "bg-slate-100", text: "text-slate-500", icon: Shield, label: "Low Risk" },
    medium: { bg: "bg-amber-50", text: "text-amber-600", icon: ShieldCheck, label: "Medium Risk" },
    high: { bg: "bg-orange-50", text: "text-orange-600", icon: ShieldAlert, label: "High Risk" },
    critical: { bg: "bg-rose-50", text: "text-rose-600", icon: Siren, label: "Critical Risk" },
};

function StatusBadge({ status }: { status: string }) {
    const s = STATUS_CONFIG[status] || STATUS_CONFIG.missed;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.bg} ${s.text}`}>
            <Icon className="w-3.5 h-3.5" /> {s.label}
        </span>
    );
}

function SeverityBadge({ severity }: { severity: string }) {
    if (!severity) return null;
    const s = SEVERITY_CONFIG[severity];
    if (!s) return null;
    const Icon = s.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-transparent ${s.bg} ${s.text}`}>
            <Icon className="w-3.5 h-3.5" /> {s.label}
        </span>
    );
}

export default function HistoryDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [c, setC] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchC = async () => {
            try {
                const u = getUser();
                if (!u) return;
                const res = await fetch(`/api/doctor/consultations?doctorId=${u.id}`);
                if (res.ok) {
                    const j = await res.json();
                    const items = j.data || [];
                    const row = items.find((x: any) => x.id === params.id);
                    if (row) {
                        setC({
                            ...row,
                            patientName: row.patientName || 'Unknown',
                            patientEmail: row.patientEmail || '',
                            durationMinutes: row.durationMinutes ?? null,
                            diagnosis: row.diagnosis ?? row.summary ?? null,
                            notes: row.clinicalNotes ?? row.notes ?? null,
                            summary: row.summary ?? null,
                            prescriptions: row.prescription ? [{ drug: row.prescription, dose: '', frequency: '', duration: '' }] : undefined,
                            followUpNote: row.followUpPlan ?? null,
                        });
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchC();
    }, [params.id]);

    const updateConsultation = async (patch: any) => {
        if (!c) return;
        setC({ ...c, ...patch });
        try {
            await fetch('/api/doctor/consultations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    consultationId: c.id,
                    status: patch.status || c.status,
                    notes: patch.notes !== undefined ? patch.notes : c.notes,
                    summary: patch.diagnosis !== undefined ? patch.diagnosis : c.summary,
                    followUpPlan: patch.followUpNote !== undefined ? patch.followUpNote : c.followUpNote,
                    followUpScheduledAt: patch.followUpScheduledAt !== undefined ? patch.followUpScheduledAt : c.followUpScheduledAt,
                    reviewed: patch.reviewed !== undefined ? patch.reviewed : c.reviewed
                })
            });
        } catch (e) { }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">Loading details...</p>
            </div>
        );
    }

    if (!c) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Record Not Found</h2>
                <p className="text-slate-500 mb-6">This consultation record is missing or deleted.</p>
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
                Back to History
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>

                {/* Header Block */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 sm:px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xl font-bold text-slate-600 flex-shrink-0">
                        {c.patientName[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-extrabold text-slate-900 text-xl sm:text-2xl">{c.patientName}</h1>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="text-[13px] text-slate-500 flex items-center gap-1.5 font-medium">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {new Date(c.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {c.durationMinutes && (
                                <span className="text-[13px] text-slate-500 flex items-center gap-1.5 font-medium">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    {c.durationMinutes} minutes
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0">
                        <StatusBadge status={c.status} />
                        {c.severity && <SeverityBadge severity={c.severity} />}
                    </div>
                </div>

                {/* Content Block */}
                <div className="p-6 sm:p-8 space-y-8">

                    {/* Vitals Strip */}
                    {c.vitals && Object.values(c.vitals).some(Boolean) && (
                        <section>
                            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
                                <Activity className="w-4 h-4" /> Patient Vitals
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    c.vitals.bp && { icon: <Activity className="text-rose-400" />, label: "Blood Pressure", val: c.vitals.bp },
                                    c.vitals.temp && { icon: <Thermometer className="text-amber-400" />, label: "Temperature", val: `${c.vitals.temp}°C` },
                                    c.vitals.pulse && { icon: <Heart className="text-pink-400" />, label: "Heart Rate", val: `${c.vitals.pulse} bpm` },
                                    c.vitals.spo2 && { icon: <Droplets className="text-sky-400" />, label: "SpO2 Level", val: `${c.vitals.spo2}%` },
                                ].filter(Boolean).map((v: any) => (
                                    <div key={v.label} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 border border-slate-200 shadow-sm flex-1 min-w-[140px]">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">{v.icon}</div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{v.label}</p>
                                            <p className="text-sm font-bold text-slate-800">{v.val}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-8">
                            {/* Diagnosis */}
                            {c.diagnosis && (
                                <section>
                                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
                                        <Stethoscope className="w-4 h-4" /> Diagnosis
                                    </h3>
                                    <div className="bg-sky-50 rounded-xl p-4 border border-sky-100 shadow-sm">
                                        <p className="text-base font-bold text-sky-800 leading-relaxed">{c.diagnosis}</p>
                                    </div>
                                </section>
                            )}

                            {/* Notes */}
                            {c.notes && (
                                <section>
                                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
                                        <ClipboardList className="w-4 h-4" /> Clinical Notes
                                    </h3>
                                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                        <p className="text-sm text-slate-700 leading-loose whitespace-pre-wrap">{c.notes}</p>
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="space-y-8">
                            {/* Prescriptions */}
                            {c.prescriptions?.length > 0 && (
                                <section>
                                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
                                        <Pill className="w-4 h-4" /> Prescriptions & Medications
                                    </h3>
                                    <div className="space-y-3">
                                        {c.prescriptions.map((p: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                                        <Pill className="w-4 h-4 text-blue-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{p.drug}</p>
                                                        {(p.dose || p.frequency) && (
                                                            <p className="text-[11px] text-slate-500 mt-0.5">{p.dose} {p.dose && p.frequency ? "·" : ""} {p.frequency}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {p.duration && <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{p.duration}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Attachments */}
                            {c.attachments?.length > 0 && (
                                <section>
                                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
                                        <Paperclip className="w-4 h-4" /> Files & Attachments ({c.attachments.length})
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {c.attachments.map((a: any, i: number) => (
                                            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[12px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl px-3 py-2 transition-colors">
                                                <Paperclip className="w-4 h-4 opacity-70" /> {a.name}
                                            </a>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    </div>

                    <div className="h-px bg-slate-200 w-full" />

                    {/* Follow-ups */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
                                <MessageSquarePlus className="w-4 h-4" /> Follow-up Note
                            </h3>
                            {c.followUpNote ? (
                                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                                    <p className="text-sm text-violet-900">{c.followUpNote}</p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No note added.</p>
                            )}
                        </div>

                        {c.followUpScheduledAt && (
                            <div>
                                <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-3">
                                    <Calendar className="w-4 h-4" /> Next Follow-up
                                </h3>
                                <div className="flex items-center gap-3 bg-white rounded-xl p-4 border border-violet-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400" />
                                    <GitFork className="w-5 h-5 text-violet-400 shrink-0" />
                                    <div>
                                        <p className="text-[13px] font-bold text-slate-800">
                                            {new Date(c.followUpScheduledAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Action Bar */}
                <div className="p-6 border-t border-slate-200 flex flex-wrap items-center gap-3 bg-slate-50">
                    <button
                        onClick={() => updateConsultation({ reviewed: !c.reviewed })}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${c.reviewed ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"}`}
                    >
                        <CheckSquare className="w-4 h-4" />
                        {c.reviewed ? "Reviewed" : "Mark as Reviewed"}
                    </button>

                    {c.status === "completed" && (
                        <button
                            onClick={() => updateConsultation({ status: "active" })}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-sky-600 border border-sky-200 hover:bg-sky-50 transition-all"
                        >
                            <RotateCcw className="w-4 h-4" /> Re-open Consultation
                        </button>
                    )}

                    <div className="flex-1" />

                    <button
                        onClick={() => {
                            const d = prompt("Enter next follow-up date (YYYY-MM-DDTHH:MM):", c.followUpScheduledAt ? c.followUpScheduledAt.slice(0, 16) : "");
                            if (d) updateConsultation({ followUpScheduledAt: new Date(d).toISOString() });
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition-all"
                    >
                        <Calendar className="w-4 h-4" /> Schedule Follow-up
                    </button>

                    <button
                        onClick={() => {
                            const n = prompt("Follow-up note:", c.followUpNote || "");
                            if (n) updateConsultation({ followUpNote: n });
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm hover:opacity-90"
                        style={{ background: NAV_BG }}
                    >
                        <MessageSquarePlus className="w-4 h-4" /> Add Note
                    </button>
                </div>
            </div>
        </div>
    );
}
