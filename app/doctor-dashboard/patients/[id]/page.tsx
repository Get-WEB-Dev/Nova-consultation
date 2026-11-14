"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeft, MessageSquare, Mail, Phone, AlertTriangle, Droplet, ShieldCheck, FileText, Pill,
    Calendar, Clock, Activity, ChevronRight, AlertCircle, RefreshCw, Users,
} from "lucide-react";
import { NAV_BG, ACCENT, Avatar } from "@/components/doctor/ui";
import { StatusPill, OutcomeBadge, fmtDate, fmtTime, ageFrom } from "@/components/doctor/records";

interface Chart {
    patient: { id: string; name: string; email: string | null; avatar: string | null; phone: string | null; dob: string | null; language: string | null; memberSince: string };
    medical: { bloodType: string | null; allergies: string | null; history: string | null; emergencyContact: string | null; insurance: string | null };
    stats: { visits: number; missed: number; firstVisit: string | null; lastVisit: string | null; avgDuration: number; pendingFollowUp: { consultationId: string; scheduledAt: string; priority: string | null } | null };
    consultations: { id: string; status: string; createdAt: string; durationMinutes: number | null; isFollowUp: boolean; chiefComplaint: string | null; diagnosis: string | null; prescription: string | null; outcome: string | null }[];
    conversationId: string | null;
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white border border-slate-200 rounded-2xl ${className}`}>{children}</div>
);

function Fact({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
    return (
        <div className="flex items-start gap-3 py-3">
            <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-slate-500" /></span>
            <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                <p className={`text-[13.5px] mt-0.5 whitespace-pre-wrap break-words ${value ? "text-slate-800" : "text-slate-300"}`}>{value || "Not recorded"}</p>
            </div>
        </div>
    );
}

export default function PatientRecordPage() {
    const { id } = useParams<{ id: string }>();
    const [chart, setChart] = useState<Chart | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<"timeline" | "prescriptions">("timeline");

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch(`/api/doctor/patients/${id}`);
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(res.status === 403 ? "This patient is not in your care." : j.error || "Could not load this patient");
            setChart(j.data);
        } catch (e: any) { setError(e.message); } finally { setLoading(false); }
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const back = (
        <Link href="/doctor-dashboard/patients" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Patients
        </Link>
    );

    if (loading) return <div className="space-y-4 animate-pulse">{back}<div className="h-36 rounded-2xl bg-white border border-slate-200" /><div className="h-64 rounded-2xl bg-white border border-slate-200" /></div>;
    if (error || !chart) {
        return (
            <div className="space-y-4">{back}
                <Card className="text-center py-14 px-6 max-w-md mx-auto">
                    <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" />
                    <p className="font-display font-bold text-slate-800 mt-3">{error ?? "Something went wrong"}</p>
                    <button onClick={load} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: NAV_BG }}><RefreshCw className="w-4 h-4" /> Try again</button>
                </Card>
            </div>
        );
    }

    const { patient: p, medical: m, stats: s, consultations } = chart;
    const age = ageFrom(p.dob);
    const prescriptions = consultations.filter((c) => c.prescription);

    return (
        <div className="space-y-5 pb-10">
            {back}

            {/* Header */}
            <Card className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <Avatar name={p.name} src={p.avatar} size={72} />
                    <div className="flex-1 min-w-0">
                        <h2 className="font-display font-extrabold text-[22px] text-slate-900 leading-tight">{p.name}</h2>
                        <p className="text-[13px] text-slate-500 mt-0.5">
                            {[age ? `${age} years` : null, m.bloodType ? `Blood type ${m.bloodType}` : null, p.language ? p.language.toUpperCase() : null].filter(Boolean).join(" · ") || "No demographic details recorded"}
                        </p>
                        <div className="flex gap-4 flex-wrap mt-2 text-[12.5px] text-slate-500">
                            {p.email && <a href={`mailto:${p.email}`} className="flex items-center gap-1.5 hover:text-teal-700"><Mail className="w-3.5 h-3.5" />{p.email}</a>}
                            {p.phone && <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 hover:text-teal-700"><Phone className="w-3.5 h-3.5" />{p.phone}</a>}
                        </div>
                    </div>
                    <Link href={`/doctor-dashboard/messages?patient=${p.id}`} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-[13.5px] font-bold" style={{ background: NAV_BG }}>
                        <MessageSquare className="w-4 h-4" /> Message
                    </Link>
                </div>
            </Card>

            {/* Allergy alert: the one thing a doctor must never miss */}
            {m.allergies && (
                <div role="alert" className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div><p className="text-[13px] font-extrabold text-rose-800">Allergies</p><p className="text-[13.5px] text-rose-900 mt-0.5 whitespace-pre-wrap">{m.allergies}</p></div>
                </div>
            )}

            {s.pendingFollowUp && (
                <Link href={`/doctor-dashboard/followups/${s.pendingFollowUp.consultationId}`} className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 hover:bg-amber-100/60 transition-colors">
                    <Calendar className="w-5 h-5 text-amber-700 shrink-0" />
                    <p className="flex-1 text-[13.5px] text-amber-900"><span className="font-extrabold">Follow-up scheduled</span> for {fmtDate(s.pendingFollowUp.scheduledAt)} at {fmtTime(s.pendingFollowUp.scheduledAt)}{s.pendingFollowUp.priority ? ` · ${s.pendingFollowUp.priority} priority` : ""}</p>
                    <ChevronRight className="w-4 h-4 text-amber-700" />
                </Link>
            )}

            <div className="grid lg:grid-cols-3 gap-5 items-start">
                {/* Left: stats + timeline */}
                <div className="lg:col-span-2 space-y-5 min-w-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { icon: Activity, label: "Visits", value: String(s.visits) },
                            { icon: Calendar, label: "First seen", value: s.firstVisit ? fmtDate(s.firstVisit) : "—" },
                            { icon: Clock, label: "Last seen", value: s.lastVisit ? fmtDate(s.lastVisit) : "—" },
                            { icon: Clock, label: "Avg. length", value: s.avgDuration ? `${s.avgDuration} min` : "—" },
                        ].map(({ icon: Icon, label, value }) => (
                            <Card key={label} className="p-4">
                                <Icon className="w-4 h-4 text-slate-400" />
                                <p className="font-display font-extrabold text-[18px] text-slate-900 mt-2 leading-none">{value}</p>
                                <p className="text-[11.5px] text-slate-400 mt-1.5">{label}</p>
                            </Card>
                        ))}
                    </div>

                    <Card className="p-5">
                        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 w-fit mb-5">
                            {([["timeline", `Visits (${consultations.length})`], ["prescriptions", `Prescriptions (${prescriptions.length})`]] as const).map(([k, label]) => (
                                <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 rounded-lg text-[12.5px] font-bold ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{label}</button>
                            ))}
                        </div>

                        {tab === "timeline" ? (
                            consultations.length === 0 ? (
                                <p className="text-center text-[13px] text-slate-400 py-10">No visits recorded yet.</p>
                            ) : (
                                <ol className="space-y-3">
                                    {consultations.map((c) => (
                                        <li key={c.id}>
                                            <Link href={`/doctor-dashboard/history/${c.id}`} className="group block rounded-xl border border-slate-200 p-4 hover:border-teal-300 hover:bg-teal-50/30 transition-colors">
                                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                                    <p className="text-[12.5px] font-bold text-slate-500">{fmtDate(c.createdAt)} · {fmtTime(c.createdAt)}{c.durationMinutes ? ` · ${c.durationMinutes} min` : ""}</p>
                                                    <span className="flex items-center gap-1.5"><OutcomeBadge outcome={c.outcome} /><StatusPill status={c.status} /></span>
                                                </div>
                                                <p className="font-display font-bold text-[15px] text-slate-900 mt-2">{c.diagnosis || "No diagnosis recorded"}</p>
                                                {c.chiefComplaint && <p className="text-[13px] text-slate-500 mt-0.5 line-clamp-2">{c.chiefComplaint}</p>}
                                                <p className="text-[12px] font-bold mt-2 flex items-center gap-1 group-hover:underline" style={{ color: ACCENT }}>Open full record <ChevronRight className="w-3.5 h-3.5" /></p>
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            )
                        ) : prescriptions.length === 0 ? (
                            <p className="text-center text-[13px] text-slate-400 py-10">No prescriptions recorded.</p>
                        ) : (
                            <ul className="space-y-3">
                                {prescriptions.map((c) => (
                                    <li key={c.id}>
                                        <Link href={`/doctor-dashboard/history/${c.id}`} className="block rounded-xl border border-slate-200 p-4 hover:border-teal-300 hover:bg-teal-50/30 transition-colors">
                                            <p className="text-[12px] font-bold text-slate-400 flex items-center gap-1.5"><Pill className="w-3.5 h-3.5" /> {fmtDate(c.createdAt)}{c.diagnosis ? ` · ${c.diagnosis}` : ""}</p>
                                            <p className="text-[14px] text-slate-800 mt-1.5 whitespace-pre-wrap">{c.prescription}</p>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                {/* Right: medical profile */}
                <Card className="p-5">
                    <h3 className="font-display font-bold text-[15px] text-slate-900">Medical profile</h3>
                    <div className="divide-y divide-slate-100 mt-1">
                        <Fact icon={Droplet} label="Blood type" value={m.bloodType} />
                        <Fact icon={FileText} label="Medical history" value={m.history} />
                        <Fact icon={Phone} label="Emergency contact" value={m.emergencyContact} />
                        <Fact icon={ShieldCheck} label="Insurance" value={m.insurance} />
                        <Fact icon={Users} label="Patient since" value={fmtDate(p.memberSince)} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3">Information provided by the patient. Confirm important details during the visit.</p>
                </Card>
            </div>
        </div>
    );
}