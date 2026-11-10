"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Eye, EyeOff, ShieldOff, FileSearch, Calendar, Star } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useDetail } from "@/lib/use-detail";
import { useToast, ConfirmDialog, StatusBadge } from "@/components/admin/AdminUI";
import {
    Breadcrumbs, Avatar, Tabs, Panel, DetailList, CopyId, Stat, EmptyPanel, SkeletonBlock, PageError, fmtDate, fmtDateTime,
} from "@/components/admin/kit";
import NotesPanel from "@/components/admin/NotesPanel";

interface DoctorDetail {
    doctor: {
        id: string; userId: string; name: string; email: string; phone: string | null; avatar: string | null; accountSuspended: boolean;
        memberSince: string; specialty: string; hospital: string | null; experienceYears: number; fee: number; languages: string[];
        gender: string | null; consultationType: string; status: string; city: string | null; slotMinutes: number; isVerified: boolean; isPublished: boolean;
    };
    metrics: {
        total: number; completed: number; missed: number; cancelled: number; completionRate: number | null; avgDuration: number | null;
        avgRating: number | null; uniquePatients: number; last30d: number; estimatedValue: number; blogPosts: number; activeSlots: number;
    };
    credentials: { license_number: string; license_authority: string | null; status: string; rejection_reason: string | null; submitted_at: string; reviewed_at: string | null } | null;
    reviews: { id: string; rating: number; comment: string | null; isPublished: boolean; createdAt: string; patient: string }[];
    recentConsultations: { id: string; status: string; createdAt: string; durationMinutes: number | null; rating: number | null; patient: string }[];
}
type Tab = "overview" | "consultations" | "reviews" | "credentials" | "notes";
type Dialog = null | "revoke" | "hide";

export default function AdminDoctorDetailPage() {
    const { id } = useParams<{ id: string }>();
    const toast = useToast();
    const { data, loading, error, reload } = useDetail<DoctorDetail>(`/api/admin/doctors/${id}`);
    const [tab, setTab] = useState<Tab>("overview");
    const [dialog, setDialog] = useState<Dialog>(null);
    const [busy, setBusy] = useState(false);

    const act = async (body: object, ok: string) => {
        setBusy(true);
        try {
            await adminFetch("/api/admin/doctors", { method: "PATCH", body: JSON.stringify({ doctorId: id, ...body }) });
            toast("success", ok);
            await reload();
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusy(false);
            setDialog(null);
        }
    };

    if (loading && !data) return <SkeletonBlock />;
    if (error || !data) return <PageError message={error ?? "Doctor not found"} onRetry={reload} />;

    const { doctor: d, metrics: m, credentials: c } = data;
    const name = `Dr. ${d.name.replace(/^dr\.?\s*/i, "")}`;
    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: "overview", label: "Overview" },
        { key: "consultations", label: "Consultations", count: m.total },
        { key: "reviews", label: "Reviews", count: data.reviews.length },
        { key: "credentials", label: "Credentials" },
        { key: "notes", label: "Notes" },
    ];

    return (
        <div className="space-y-5 animate-fade-up">
            <Breadcrumbs items={[{ label: "Doctors", href: "/admin-dashboard/doctors" }, { label: name }]} />

            <section className="card flex items-start gap-4 flex-wrap">
                <Avatar name={d.name} src={d.avatar} size={64} />
                <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-display font-bold text-2xl text-slate-800">{name}</h1>
                        <span className={`badge ${d.isVerified ? "badge-green" : "badge-gold"}`}>{d.isVerified ? "Verified" : "Pending verification"}</span>
                        <span className={`badge ${d.isPublished ? "badge-navy" : "badge-slate"}`}>{d.isPublished ? "Public" : "Hidden"}</span>
                        {d.accountSuspended && <span className="badge badge-rose">Account suspended</span>}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{d.specialty}{d.hospital ? ` · ${d.hospital}` : ""}{d.city ? ` · ${d.city}` : ""}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">Joined {fmtDate(d.memberSince)} · <CopyId value={d.id} /></p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link href={`/admin-dashboard/users/${d.userId}`} className="btn btn-sm btn-secondary">User account</Link>
                    {!d.isVerified ? (
                        <Link href="/admin-dashboard/doctors" className="btn btn-sm btn-success"><FileSearch className="w-3.5 h-3.5" /> Review license</Link>
                    ) : (
                        <>
                            <button onClick={() => (d.isPublished ? setDialog("hide") : act({ action: "publish", value: true }, "Doctor is public again"))} disabled={busy} className="btn btn-sm btn-secondary">
                                {d.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {d.isPublished ? "Hide" : "Publish"}
                            </button>
                            <button onClick={() => setDialog("revoke")} disabled={busy} className="btn btn-sm btn-danger"><ShieldOff className="w-3.5 h-3.5" /> Revoke</button>
                        </>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <Stat label="Sessions" value={m.total} sub={`${m.last30d} in last 30 days`} />
                <Stat label="Completion" value={m.completionRate != null ? `${m.completionRate}%` : "—"} sub={`${m.completed} done · ${m.missed} missed`} />
                <Stat label="Rating" value={m.avgRating != null ? `★ ${m.avgRating}` : "—"} sub="from patients" />
                <Stat label="Avg length" value={m.avgDuration != null ? `${m.avgDuration} min` : "—"} />
                <Stat label="Patients" value={m.uniquePatients} sub="unique" />
                <Stat label="Est. value" value={m.estimatedValue.toLocaleString()} sub="fee × completed (estimate)" />
            </div>

            <Tabs tabs={tabs} value={tab} onChange={setTab} />

            {tab === "overview" && (
                <div className="grid md:grid-cols-2 gap-4">
                    <Panel title="Practice">
                        <DetailList items={[
                            { label: "Specialty", value: d.specialty },
                            { label: "Hospital", value: d.hospital },
                            { label: "Experience", value: `${d.experienceYears} years` },
                            { label: "Languages", value: d.languages.join(", ") || null },
                            { label: "Session type", value: <span className="capitalize">{d.consultationType}</span> },
                            { label: "Session length", value: `${d.slotMinutes} min` },
                            { label: "Fee", value: d.fee.toLocaleString() },
                            { label: "Availability", value: `${m.activeSlots} active weekly slots` },
                            { label: "Blog posts", value: m.blogPosts },
                        ]} />
                    </Panel>
                    <Panel title="Account">
                        <DetailList items={[
                            { label: "Email", value: d.email },
                            { label: "Phone", value: d.phone },
                            { label: "Live status", value: <span className="capitalize">{d.status}</span> },
                            { label: "Cancelled sessions", value: m.cancelled },
                        ]} />
                    </Panel>
                </div>
            )}

            {tab === "consultations" && (
                <Panel>
                    {data.recentConsultations.length === 0 ? (
                        <EmptyPanel icon={Calendar} title="No sessions yet" />
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {data.recentConsultations.map((c2) => (
                                <li key={c2.id}>
                                    <Link href={`/admin-dashboard/consultations/${c2.id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{c2.patient}</p>
                                            <p className="text-xs text-slate-400">{fmtDateTime(c2.createdAt)}{c2.durationMinutes != null ? ` · ${c2.durationMinutes} min` : ""}</p>
                                        </div>
                                        {c2.rating != null && <span className="text-xs text-amber-500">★ {c2.rating}</span>}
                                        <StatusBadge status={c2.status} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {tab === "reviews" && (
                <Panel>
                    {data.reviews.length === 0 ? (
                        <EmptyPanel icon={Star} title="No reviews yet" />
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {data.reviews.map((r) => (
                                <li key={r.id} className="py-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} <span className="text-slate-500 text-xs ml-1">{r.patient}</span></p>
                                        <span className={`badge ${r.isPublished ? "badge-green" : "badge-slate"}`}>{r.isPublished ? "Public" : "Hidden"}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{r.comment || <span className="text-slate-300">No written comment</span>}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">{fmtDateTime(r.createdAt)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                    <Link href="/admin-dashboard/reviews" className="inline-block mt-3 text-xs font-semibold text-primary-600 hover:underline">Moderate reviews</Link>
                </Panel>
            )}

            {tab === "credentials" && (
                <Panel>
                    {!c ? (
                        <EmptyPanel icon={FileSearch} title="No license submitted" text="This doctor hasn't uploaded a medical license yet." />
                    ) : (
                        <>
                            <DetailList items={[
                                { label: "License number", value: c.license_number },
                                { label: "Issued by", value: c.license_authority },
                                { label: "Status", value: <span className={`badge ${c.status === "approved" ? "badge-green" : c.status === "rejected" ? "badge-rose" : "badge-gold"}`}>{c.status}</span> },
                                { label: "Submitted", value: fmtDateTime(c.submitted_at) },
                                { label: "Reviewed", value: fmtDateTime(c.reviewed_at) },
                                ...(c.rejection_reason ? [{ label: "Rejection reason", value: c.rejection_reason }] : []),
                            ]} />
                            <p className="text-xs text-slate-400 mt-3">The license document itself is opened from Doctors → Review. Every view is recorded in the Activity Log.</p>
                        </>
                    )}
                </Panel>
            )}

            {tab === "notes" && <Panel><NotesPanel entityType="doctor" entityId={d.id} /></Panel>}

            <ConfirmDialog open={dialog === "hide"} loading={busy} title="Hide this doctor?" message={`${name} will disappear from public listings. Existing patients keep their history.`}
                confirmLabel="Hide" onConfirm={() => act({ action: "publish", value: false }, "Doctor hidden")} onCancel={() => setDialog(null)} />
            <ConfirmDialog open={dialog === "revoke"} danger loading={busy} title="Revoke verification?" message={`${name} will be hidden and move back to Pending until their credentials are approved again.`}
                confirmLabel="Revoke" onConfirm={() => act({ action: "verify", value: false }, "Verification revoked")} onCancel={() => setDialog(null)} />
        </div>
    );
}