"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeft, Printer, MessageSquare, User, Star, AlertCircle, RefreshCw, AlertTriangle, Calendar, ChevronRight,
} from "lucide-react";
import { NAV_BG, ACCENT, Avatar } from "@/components/doctor/ui";
import { StatusPill, OutcomeBadge, fmtDate, fmtTime, fmtDateTime, ageFrom } from "@/components/doctor/records";

interface Record_ {
    id: string; status: string; isFollowUp: boolean; followUpScheduledAt: string | null; followUpPriority: string | null; followUpPlan: string | null;
    outcome: string | null; createdAt: string; startedAt: string | null; endedAt: string | null; durationMinutes: number | null;
    chiefComplaint: string | null; symptoms: string | null; symptomsDuration: string | null; clinicalNotes: string | null;
    diagnosis: string | null; prescription: string | null; summary: string | null; rating: number | null;
    visitNumber: number | null; totalVisits: number; previousVisit: { id: string; date: string; diagnosis: string | null } | null;
    patient: { id: string; name: string; email: string | null; avatar: string | null; phone: string | null; dob: string | null; bloodType: string | null; allergies: string | null };
    doctor: { name: string | null; specialty: string | null; hospital: string | null };
}

// Print: hide the app shell and print only the record
const PRINT_CSS = `
@media print {
  aside, header, nav, a[href="#main"], [data-noprint] { display: none !important; }
  div[class*="md:ml-"] { margin-left: 0 !important; }
  main { padding: 0 !important; max-width: none !important; }
  body { background: #fff !important; }
  article, section { break-inside: avoid; }
}`;

function Section({ title, value, tall = false }: { title: string; value: string | null; tall?: boolean }) {
    return (
        <section className="py-4 first:pt-0 last:pb-0">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</h4>
            <p className={`mt-1.5 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words ${value ? "text-slate-800" : "text-slate-300"} ${tall ? "min-h-[3rem]" : ""}`}>{value || "Not recorded"}</p>
        </section>
    );
}

export default function ConsultationRecordPage() {
    const { id } = useParams<{ id: string }>();
    const [rec, setRec] = useState<Record_ | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`/api/doctor/consultations/${id}`);
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(res.status === 403 ? "You don't have access to this record." : res.status === 404 ? "This consultation doesn't exist." : j.error || "Could not load this record");
            setRec(j.data);
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const back = (
        <Link href="/doctor-dashboard/history" data-noprint className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> History
        </Link>
    );

    if (loading) return <div className="space-y-4 animate-pulse">{back}<div className="h-28 rounded-2xl bg-white border border-slate-200" /><div className="h-96 rounded-2xl bg-white border border-slate-200" /></div>;
    if (error || !rec) {
        return (
            <div className="space-y-4">{back}
                <div className="bg-white border border-slate-200 rounded-2xl text-center py-14 px-6 max-w-md mx-auto">
                    <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" /><p className="font-display font-bold text-slate-800 mt-3">{error ?? "Something went wrong"}</p>
                    <button onClick={load} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: NAV_BG }}><RefreshCw className="w-4 h-4" /> Try again</button>
                </div>
            </div>
        );
    }

    const p = rec.patient, age = ageFrom(p.dob);
    const hasFollowUp = !!(rec.followUpScheduledAt || rec.followUpPlan || rec.outcome === "follow_up");
    const timeline = [
        { label: "Patient joined the queue", at: rec.createdAt },
        { label: "Consultation started", at: rec.startedAt },
        { label: "Consultation ended", at: rec.endedAt },
    ].filter((t) => t.at);

    return (
        <div className="space-y-5 pb-10 max-w-4xl">
            <style>{PRINT_CSS}</style>
            {back}

            {/* Printed letterhead (hidden on screen) */}
            <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-2">
                <p className="text-[20px] font-extrabold text-slate-900">Nova Health — Consultation Record</p>
                <p className="text-[12px] text-slate-600">{[rec.doctor.name && `Dr. ${rec.doctor.name}`, rec.doctor.specialty, rec.doctor.hospital].filter(Boolean).join(" · ")}</p>
            </div>

            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Consultation record</p>
                        <h2 className="font-display font-extrabold text-[22px] text-slate-900 mt-1">{fmtDate(rec.createdAt)} · {fmtTime(rec.createdAt)}</h2>
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap"><StatusPill status={rec.status} /><OutcomeBadge outcome={rec.outcome} />
                        
                        </div>
                    </div>
                    <button onClick={() => window.print()} data-noprint className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: NAV_BG }}>
                        <Printer className="w-4 h-4" /> Print / Save PDF
                    </button>
                </div>

                <div className="mt-5 pt-5 border-t border-slate-100 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <Avatar name={p.name} src={p.avatar} size={52} />
                        <div className="min-w-0">
                            <p className="font-display font-bold text-[16px] text-slate-900 truncate">{p.name}</p>
                            <p className="text-[12.5px] text-slate-500">{[age ? `${age} years` : null, p.bloodType ? `Blood type ${p.bloodType}` : null, p.phone].filter(Boolean).join(" · ") || p.email || "—"}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap" data-noprint>
                        <Link href={`/doctor-dashboard/patients/${p.id}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50"><User className="w-3.5 h-3.5" /> Patient record</Link>
                        <Link href={`/doctor-dashboard/messages?patient=${p.id}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50"><MessageSquare className="w-3.5 h-3.5" /> Message</Link>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Duration", value: rec.durationMinutes ? `${rec.durationMinutes} min` : "—" },
                        { label: "Visit number", value: rec.visitNumber ? `${rec.visitNumber} of ${rec.totalVisits}` : "—" },
                        { label: "Started", value: fmtTime(rec.startedAt) },
                        { label: "Ended", value: fmtTime(rec.endedAt) },
                    ].map((x) => (
                        <div key={x.label} className="rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3">
                            <p className="text-[11px] text-slate-400 font-semibold">{x.label}</p>
                            <p className="font-display font-extrabold text-[16px] text-slate-900 mt-0.5">{x.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {p.allergies && (
                <div role="alert" className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div><p className="text-[13px] font-extrabold text-rose-800">Patient allergies</p><p className="text-[13.5px] text-rose-900 mt-0.5 whitespace-pre-wrap">{p.allergies}</p></div>
                </div>
            )}

            {/* Clinical record */}
            <article className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 divide-y divide-slate-100">
                <Section title="Chief complaint" value={rec.chiefComplaint} />
                {(rec.symptoms || rec.symptomsDuration) && <Section title="Reported by the patient" value={[rec.symptoms, rec.symptomsDuration && `For ${rec.symptomsDuration}`].filter(Boolean).join("\n")} />}
                <Section title="Clinical notes" value={rec.clinicalNotes} tall />
                <Section title="Diagnosis" value={rec.diagnosis} />
                <Section title="Prescription" value={rec.prescription} />
                {rec.summary && rec.summary !== rec.diagnosis && <Section title="Summary" value={rec.summary} />}
            </article>

            {hasFollowUp && (
                <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6">
                    <h3 className="font-display font-bold text-[15px] text-amber-900 flex items-center gap-2"><Calendar className="w-4 h-4" /> Follow-up</h3>
                    <div className="grid sm:grid-cols-3 gap-3 mt-3 text-[13.5px]">
                        <div><p className="text-[11px] font-bold uppercase text-amber-700/70">Scheduled</p><p className="text-amber-950 font-semibold mt-0.5">{rec.followUpScheduledAt ? fmtDateTime(rec.followUpScheduledAt) : "Not scheduled"}</p></div>
                        <div><p className="text-[11px] font-bold uppercase text-amber-700/70">Priority</p><p className="text-amber-950 font-semibold mt-0.5 capitalize">{rec.followUpPriority || "—"}</p></div>
                    </div>
                    {rec.followUpPlan && <p className="mt-3 text-[14px] text-amber-950 whitespace-pre-wrap">{rec.followUpPlan}</p>}
                    <Link href={`/doctor-dashboard/followups/${rec.id}`} data-noprint className="inline-flex items-center gap-1 mt-3 text-[12.5px] font-bold text-amber-900 hover:underline">Manage this follow-up <ChevronRight className="w-3.5 h-3.5" /></Link>
                </section>
            )}

            <div className="grid sm:grid-cols-2 gap-5">
                <section className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h3 className="font-display font-bold text-[14.5px] text-slate-900">Timeline</h3>
                    <ol className="mt-3 space-y-3 border-l-2 border-slate-100 ml-1.5">
                        {timeline.map((t) => (
                            <li key={t.label} className="pl-4 relative"><span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: ACCENT }} />
                                <p className="text-[13px] font-semibold text-slate-700">{t.label}</p><p className="text-[12px] text-slate-400">{fmtDateTime(t.at)}</p></li>
                        ))}
                    </ol>
                </section>
                <section className="bg-white border border-slate-200 rounded-2xl p-5">
                    <h3 className="font-display font-bold text-[14.5px] text-slate-900">Patient feedback & history</h3>
                    <div className="mt-3 flex items-center gap-1">
                        {rec.rating ? [1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-5 h-5 ${n <= rec.rating! ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />) : <span className="text-[13px] text-slate-300">No rating given</span>}
                    </div>
                    {rec.previousVisit ? (
                        <Link href={`/doctor-dashboard/history/${rec.previousVisit.id}`} data-noprint className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                            <div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase text-slate-400">Previous visit</p><p className="text-[13px] font-semibold text-slate-800 truncate">{fmtDate(rec.previousVisit.date)}{rec.previousVisit.diagnosis ? ` · ${rec.previousVisit.diagnosis}` : ""}</p></div>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                        </Link>
                    ) : <p className="mt-4 text-[12.5px] text-slate-400">This is the first recorded visit with this patient.</p>}
                </section>
            </div>

            <p className="hidden print:block text-[11px] text-slate-500 border-t border-slate-300 pt-3">
                Confidential medical record · Printed {new Date().toLocaleString()} · Record ID {rec.id}
            </p>
        </div>
    );
}