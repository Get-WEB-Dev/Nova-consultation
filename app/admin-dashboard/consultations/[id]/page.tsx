"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { XCircle, MessageSquare, Paperclip, Lock, Star } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useDetail } from "@/lib/use-detail";
import { useToast, ConfirmDialog, StatusBadge } from "@/components/admin/AdminUI";
import {
    Breadcrumbs, Avatar, Tabs, Panel, DetailList, Timeline, CopyId, Stat, EmptyPanel, SkeletonBlock, PageError, fmtDateTime,
} from "@/components/admin/kit";
import NotesPanel from "@/components/admin/NotesPanel";
import RevealGate from "@/components/admin/RevealGate";

interface ConsultDetail {
    id: string; status: string; isFollowUp: boolean; followUpScheduledAt: string | null; followUpPriority: string | null; outcome: string | null;
    createdAt: string; startedAt: string | null; endedAt: string | null; updatedAt: string; durationMinutes: number | null; rating: number | null;
    patient: { id: string; name: string; email: string };
    doctor: { id: string; userId: string | null; name: string; specialty: string; fee: number };
    review: { rating: number; comment: string | null; isPublished: boolean; createdAt: string } | null;
    messages: { total: number; attachments: number; fromPatient: number; fromDoctor: number };
    clinicalNotesRecorded: boolean;
}
interface Clinical {
    chiefComplaint: string | null; symptoms: string | null; durationDescription: string | null; diagnosis: string | null;
    prescription: string | null; clinicalNotes: string | null; summary: string | null; followUpPlan: string | null; notes: string | null;
}
type Tab = "timeline" | "messages" | "clinical" | "review" | "notes";
type Event = { at: string | null; title: string; detail?: string; tone?: "ok" | "warn" | "bad" | "info" };

export default function AdminConsultationDetailPage() {
    const { id } = useParams<{ id: string }>();
    const toast = useToast();
    const { data, loading, error, reload } = useDetail<ConsultDetail>(`/api/admin/consultations/${id}`);
    const [tab, setTab] = useState<Tab>("timeline");
    const [cancel, setCancel] = useState(false);
    const [busy, setBusy] = useState(false);

    const doCancel = async () => {
        setBusy(true);
        try {
            await adminFetch("/api/admin/consultations", { method: "PATCH", body: JSON.stringify({ consultationId: id }) });
            toast("success", "Consultation cancelled");
            await reload();
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusy(false);
            setCancel(false);
        }
    };

    if (loading && !data) return <SkeletonBlock />;
    if (error || !data) return <PageError message={error ?? "Consultation not found"} onRetry={reload} />;

    const d = data;
    const doctorName = `Dr. ${d.doctor.name.replace(/^dr\.?\s*/i, "")}`;
    const canCancel = d.status === "active" || d.status === "waiting";

    const events = ([
        { at: d.createdAt, title: "Session requested", tone: "info" },
        d.startedAt && { at: d.startedAt, title: "Session started", tone: "ok" },
        d.endedAt && { at: d.endedAt, title: "Session ended", detail: d.durationMinutes != null ? `${d.durationMinutes} minutes` : undefined, tone: "ok" },
        d.followUpScheduledAt && { at: d.followUpScheduledAt, title: "Follow-up scheduled", detail: d.followUpPriority ? `${d.followUpPriority} priority` : undefined, tone: "warn" },
        d.review && { at: d.review.createdAt, title: `Patient left a ${d.review.rating}/5 review`, tone: d.review.rating <= 2 ? "bad" : "ok" },
        (d.status === "cancelled" || d.status === "missed") && { at: d.updatedAt, title: d.status === "missed" ? "Marked as missed" : "Cancelled", tone: "bad" },
    ].filter(Boolean) as Event[]).sort((a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime());

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: "timeline", label: "Timeline" },
        { key: "messages", label: "Messages", count: d.messages.total },
        { key: "clinical", label: "Clinical notes" },
        { key: "review", label: "Review" },
        { key: "notes", label: "Notes" },
    ];

    return (
        <div className="space-y-5 animate-fade-up">
            <Breadcrumbs items={[{ label: "Consultations", href: "/admin-dashboard/consultations" }, { label: `Session ${d.id.slice(0, 8)}` }]} />

            <section className="card space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display font-bold text-2xl text-slate-800">Consultation</h1>
                    <StatusBadge status={d.status} />
                    {d.isFollowUp && <span className="badge badge-mint">Follow-up</span>}
                    <CopyId value={d.id} />
                    {canCancel && <button onClick={() => setCancel(true)} className="btn btn-sm btn-danger ml-auto"><XCircle className="w-3.5 h-3.5" /> Cancel session</button>}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                    <Link href={`/admin-dashboard/users/${d.patient.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <Avatar name={d.patient.name} size={40} />
                        <div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-slate-400">Patient</p><p className="text-sm font-semibold text-slate-700 truncate">{d.patient.name}</p><p className="text-xs text-slate-400 truncate">{d.patient.email}</p></div>
                    </Link>
                    <Link href={`/admin-dashboard/doctors/${d.doctor.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <Avatar name={d.doctor.name} size={40} />
                        <div className="min-w-0"><p className="text-[11px] uppercase tracking-wide text-slate-400">Doctor</p><p className="text-sm font-semibold text-slate-700 truncate">{doctorName}</p><p className="text-xs text-slate-400 truncate">{d.doctor.specialty}</p></div>
                    </Link>
                </div>
            </section>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Duration" value={d.durationMinutes != null ? `${d.durationMinutes} min` : "—"} />
                <Stat label="Messages" value={d.messages.total} sub={`${d.messages.fromPatient} patient · ${d.messages.fromDoctor} doctor`} />
                <Stat label="Files shared" value={d.messages.attachments} />
                <Stat label="Rating" value={d.rating != null ? `★ ${d.rating}` : "—"} sub={d.outcome ? `Outcome: ${d.outcome}` : undefined} />
            </div>

            <Tabs tabs={tabs} value={tab} onChange={setTab} />

            {tab === "timeline" && <Panel><Timeline items={events} /></Panel>}

            {tab === "messages" && (
                <Panel>
                    <EmptyPanel icon={Lock} title="Chat content is private"
                        text="Messages and files stay between the patient and the doctor, so admins can see how much was exchanged but not what was said." />
                    <DetailList items={[
                        { label: "Total messages", value: <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-slate-300" />{d.messages.total}</span> },
                        { label: "From the patient", value: d.messages.fromPatient },
                        { label: "From the doctor", value: d.messages.fromDoctor },
                        { label: "Files shared", value: <span className="inline-flex items-center gap-1"><Paperclip className="w-3.5 h-3.5 text-slate-300" />{d.messages.attachments}</span> },
                    ]} />
                </Panel>
            )}

            {tab === "clinical" && (
                <Panel>
                    <RevealGate<Clinical> type="consultation_clinical" id={d.id} title="Clinical notes are protected"
                        description={d.clinicalNotesRecorded ? "The doctor recorded a diagnosis for this session. Opening it requires a reason and is recorded." : "Symptoms and complaints may still be on file. Opening them requires a reason and is recorded."}>
                        {(c) => (
                            <DetailList items={[
                                { label: "Chief complaint", value: c.chiefComplaint },
                                { label: "Symptoms", value: c.symptoms },
                                { label: "How long", value: c.durationDescription },
                                { label: "Diagnosis", value: c.diagnosis },
                                { label: "Prescription", value: c.prescription },
                                { label: "Clinical notes", value: c.clinicalNotes },
                                { label: "Summary", value: c.summary },
                                { label: "Follow-up plan", value: c.followUpPlan },
                                { label: "Other notes", value: c.notes },
                            ]} />
                        )}
                    </RevealGate>
                </Panel>
            )}

            {tab === "review" && (
                <Panel>
                    {!d.review ? (
                        <EmptyPanel icon={Star} title="No review" text="The patient hasn't reviewed this session." />
                    ) : (
                        <div className="space-y-2">
                            <p className="text-lg text-amber-500">{"★".repeat(d.review.rating)}{"☆".repeat(5 - d.review.rating)}</p>
                            <p className="text-sm text-slate-600">{d.review.comment || <span className="text-slate-300">No written comment</span>}</p>
                            <p className="text-xs text-slate-400">{fmtDateTime(d.review.createdAt)} · <span className={d.review.isPublished ? "text-emerald-600" : "text-slate-400"}>{d.review.isPublished ? "Public" : "Hidden"}</span></p>
                            <Link href="/admin-dashboard/reviews" className="inline-block text-xs font-semibold text-primary-600 hover:underline">Moderate reviews</Link>
                        </div>
                    )}
                </Panel>
            )}

            {tab === "notes" && <Panel><NotesPanel entityType="consultation" entityId={d.id} /></Panel>}

            <ConfirmDialog open={cancel} danger loading={busy} title="Cancel this session?"
                message={`${d.patient.name}'s session with ${doctorName} will be marked cancelled and removed from the queue.`}
                confirmLabel="Cancel session" onConfirm={doCancel} onCancel={() => setCancel(false)} />
        </div>
    );
}