"use client";

import { useState } from "react";
import { saveText } from "@/lib/download";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { UserX, UserCheck, Bell, Stethoscope, Calendar, Loader2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useDetail } from "@/lib/use-detail";
import { actionLabel } from "@/lib/admin-labels";
import { useToast, ConfirmDialog, StatusBadge, timeAgo } from "@/components/admin/AdminUI";
import {
    Breadcrumbs, Avatar, Tabs, Panel, DetailList, Timeline, CopyId, Stat, EmptyPanel,
    SkeletonBlock, PageError, TypedConfirmDialog, fmtDate, fmtDateTime,
} from "@/components/admin/kit";
import NotesPanel from "@/components/admin/NotesPanel";
import RevealGate from "@/components/admin/RevealGate";

interface UserDetail {
    user: {
        id: string; name: string; email: string; phone: string | null; avatar_url: string | null; bio: string | null;
        role: string; is_suspended: boolean; suspended_reason: string | null; suspended_at: string | null;
        created_at: string; updated_at: string; isSuperAdmin: boolean;
    };
    doctor: { id: string; specialty: string; hospital: string | null; is_verified: boolean; is_published: boolean; rating: number; review_count: number; fee: number } | null;
    stats: { consultationsAsPatient: number; completedAsPatient: number; consultationsAsDoctor: number; reviewsWritten: number; notificationsTotal: number; notificationsUnread: number };
    recentConsultations: { id: string; status: string; createdAt: string; durationMinutes: number | null; role: "patient" | "doctor"; counterparty: string; specialty: string }[];
    notifications: { id: string; type: string; title: string; message: string | null; read: boolean; created_at: string }[];
    audit: { id: string; admin_email: string | null; action: string; details: string | null; created_at: string }[];
}
interface Medical {
    dob: string | null; bloodType: string | null; allergies: string | null; emergencyContact: string | null;
    medicalHistory: string | null; insuranceProvider: string | null; insuranceId: string | null; preferredLanguage: string | null;
}

type Tab = "overview" | "consultations" | "notifications" | "activity" | "medical" | "notes";
type Dialog = null | { kind: "suspend"; suspended: boolean } | { kind: "role"; role: string } | { kind: "delete" } | { kind: "notify" };
const ROLES = ["patient", "doctor", "professional", "admin"];

export default function AdminUserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const toast = useToast();
    const { data, loading, error, reload } = useDetail<UserDetail>(`/api/admin/users/${id}`);
    const [tab, setTab] = useState<Tab>("overview");
    const [dialog, setDialog] = useState<Dialog>(null);
    const [busy, setBusy] = useState(false);
    const [nTitle, setNTitle] = useState("");
    const [nMsg, setNMsg] = useState("");

    const run = async (fn: () => Promise<unknown>, ok: string, after?: () => void) => {
        setBusy(true);
        try {
            await fn();
            toast("success", ok);
            setDialog(null);
            if (after) after(); else await reload();
        } catch (e: any) {
            toast("error", e.message);
            setDialog(null);
        } finally {
            setBusy(false);
        }
    };
    const patch = (body: object) => adminFetch("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId: id, ...body }) });

    if (loading && !data) return <SkeletonBlock />;
    if (error || !data) return <PageError message={error ?? "User not found"} onRetry={reload} />;

    const { user: u, doctor, stats } = data;
    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: "overview", label: "Overview" },
        { key: "consultations", label: "Consultations", count: stats.consultationsAsPatient + stats.consultationsAsDoctor },
        { key: "notifications", label: "Notifications", count: stats.notificationsTotal },
        { key: "activity", label: "Admin activity", count: data.audit.length },
        ...(u.role === "patient" ? [{ key: "medical" as Tab, label: "Medical profile" }] : []),
        { key: "notes", label: "Notes" },
    ];

    return (
        <div className="space-y-5 animate-fade-up">
            <Breadcrumbs items={[{ label: "Users", href: "/admin-dashboard/users" }, { label: u.name }]} />

            <section className="card flex items-start gap-4 flex-wrap">
                <Avatar name={u.name} src={u.avatar_url} size={64} />
                <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-display font-bold text-2xl text-slate-800">{u.name}</h1>
                        <span className="badge badge-navy capitalize">{u.role}</span>
                        {u.isSuperAdmin && <span className="badge badge-gold">Super admin</span>}
                        {u.is_suspended && <span className="badge badge-rose">Suspended</span>}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">Member since {fmtDate(u.created_at)} · <CopyId value={u.id} /></p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setDialog({ kind: "notify" })} className="btn btn-sm btn-secondary"><Bell className="w-3.5 h-3.5" /> Notify</button>
                    {!u.isSuperAdmin && (
                        <button onClick={() => setDialog({ kind: "suspend", suspended: !u.is_suspended })} className="btn btn-sm btn-secondary">
                            {u.is_suspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />} {u.is_suspended ? "Reactivate" : "Suspend"}
                        </button>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Consultations" value={stats.consultationsAsPatient + stats.consultationsAsDoctor} sub={stats.consultationsAsDoctor ? `${stats.consultationsAsDoctor} as doctor` : `${stats.completedAsPatient} completed`} />
                <Stat label="Reviews written" value={stats.reviewsWritten} />
                <Stat label="Notifications" value={stats.notificationsTotal} sub={`${stats.notificationsUnread} unread`} />
                <Stat label="Last updated" value={<span className="text-base">{timeAgo(u.updated_at)}</span>} />
            </div>

            <Tabs tabs={tabs} value={tab} onChange={setTab} />

            {tab === "overview" && (
                <div className="grid md:grid-cols-2 gap-4">
                    <Panel title="Account">
                        <DetailList items={[
                            { label: "Email", value: u.email },
                            { label: "Phone", value: u.phone },
                            { label: "Role", value: <span className="capitalize">{u.role}</span> },
                            { label: "Status", value: u.is_suspended ? <span className="text-rose-600 font-medium">Suspended</span> : "Active" },
                            ...(u.is_suspended ? [{ label: "Suspended on", value: fmtDateTime(u.suspended_at) }, { label: "Reason", value: u.suspended_reason }] : []),
                            { label: "Joined", value: fmtDateTime(u.created_at) },
                        ]} />
                    </Panel>
                    <div className="space-y-4">
                        {doctor && (
                            <Panel title="Doctor profile" action={<Link href={`/admin-dashboard/doctors/${doctor.id}`} className="text-xs font-semibold text-primary-600 hover:underline">Open doctor page</Link>}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-primary-600" /></div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-700">{doctor.specialty}</p>
                                        <p className="text-xs text-slate-400 truncate">{doctor.hospital ?? "No hospital listed"} · ★ {Number(doctor.rating).toFixed(1)} ({doctor.review_count})</p>
                                    </div>
                                    <span className={`badge ml-auto ${doctor.is_verified ? "badge-green" : "badge-gold"}`}>{doctor.is_verified ? "Verified" : "Pending"}</span>
                                </div>
                            </Panel>
                        )}
                        {u.bio && <Panel title="Bio"><p className="text-sm text-slate-600 whitespace-pre-wrap">{u.bio}</p></Panel>}

                        <Panel title="Data export">
                            <RevealGate<Record<string, unknown>> type="user_export" id={u.id} title="Export this person's data"
                                description="Creates a machine-readable copy of their account data: profile, sessions, reviews and notifications. Chat messages are not included. Requires a reason and is recorded.">
                                {(bundle) => (
                                    <button className="btn btn-sm btn-primary"
                                        onClick={() => saveText(`user-${u.id.slice(0, 8)}-data.json`, JSON.stringify(bundle, null, 2), "application/json")}>
                                        Download JSON
                                    </button>
                                )}
                            </RevealGate>
                        </Panel>

                        {!u.isSuperAdmin && (
                            <Panel title="Role & danger zone">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <select value={u.role} onChange={(e) => e.target.value !== u.role && setDialog({ kind: "role", role: e.target.value })} className="input-field !w-auto !py-1.5 text-sm" aria-label="Change role">
                                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <button onClick={() => setDialog({ kind: "delete" })} className="btn btn-sm btn-danger ml-auto">Delete user</button>
                                </div>
                            </Panel>
                        )}
                    </div>
                </div>
            )}

            {tab === "consultations" && (
                <Panel>
                    {data.recentConsultations.length === 0 ? (
                        <EmptyPanel icon={Calendar} title="No consultations yet" text="Sessions this person takes part in will appear here." />
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {data.recentConsultations.map((c) => (
                                <li key={c.id}>
                                    <Link href={`/admin-dashboard/consultations/${c.id}`} className="flex items-center gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{c.role === "patient" ? `With Dr. ${c.counterparty.replace(/^dr\.?\s*/i, "")}` : `Patient: ${c.counterparty}`}</p>
                                            <p className="text-xs text-slate-400">{c.specialty || "—"} · {fmtDateTime(c.createdAt)}{c.durationMinutes != null ? ` · ${c.durationMinutes} min` : ""}</p>
                                        </div>
                                        <span className="text-[11px] text-slate-300 capitalize">as {c.role}</span>
                                        <StatusBadge status={c.status} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                    {stats.consultationsAsPatient + stats.consultationsAsDoctor > data.recentConsultations.length && (
                        <p className="text-xs text-slate-400 mt-3">Showing the latest {data.recentConsultations.length}. Find older sessions under Consultations.</p>
                    )}
                </Panel>
            )}

            {tab === "notifications" && (
                <Panel>
                    {data.notifications.length === 0 ? (
                        <EmptyPanel icon={Bell} title="No notifications" text="Nothing has been sent to this person yet." />
                    ) : (
                        <ul className="divide-y divide-slate-50">
                            {data.notifications.map((n) => (
                                <li key={n.id} className="py-3 flex items-start gap-3">
                                    <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.read ? "bg-slate-200" : "bg-primary-500"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700">{n.title}</p>
                                        {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                                        <p className="text-[11px] text-slate-400 mt-1">{fmtDateTime(n.created_at)} · {n.type} · {n.read ? "read" : "unread"}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Panel>
            )}

            {tab === "activity" && (
                <Panel>
                    {data.audit.length === 0 ? (
                        <EmptyPanel icon={Calendar} title="No admin activity" text="Actions admins take on this account are listed here." />
                    ) : (
                        <Timeline items={data.audit.map((a) => ({ at: a.created_at, title: `${a.admin_email ?? "An admin"} ${actionLabel(a.action)}`, detail: a.details ?? undefined }))} />
                    )}
                </Panel>
            )}

            {tab === "medical" && (
                <Panel>
                    <RevealGate<Medical> type="user_medical" id={u.id} title="Medical profile is protected"
                        description="Allergies, history and insurance details are private health information. Opening them requires a reason and is recorded.">
                        {(m) => (
                            <DetailList items={[
                                { label: "Date of birth", value: m.dob ? fmtDate(m.dob) : null },
                                { label: "Blood type", value: m.bloodType },
                                { label: "Allergies", value: m.allergies },
                                { label: "Medical history", value: m.medicalHistory },
                                { label: "Emergency contact", value: m.emergencyContact },
                                { label: "Insurance provider", value: m.insuranceProvider },
                                { label: "Insurance ID", value: m.insuranceId },
                                { label: "Preferred language", value: m.preferredLanguage },
                            ]} />
                        )}
                    </RevealGate>
                </Panel>
            )}

            {tab === "notes" && <Panel><NotesPanel entityType="user" entityId={u.id} /></Panel>}

            <ConfirmDialog open={dialog?.kind === "suspend"} danger={dialog?.kind === "suspend" && dialog.suspended} loading={busy}
                title={dialog?.kind === "suspend" && dialog.suspended ? "Suspend this user?" : "Reactivate this user?"}
                message={dialog?.kind === "suspend" && dialog.suspended ? `${u.name} will be signed out and blocked until you reactivate them.` : `${u.name} will be able to sign in again.`}
                confirmLabel={dialog?.kind === "suspend" && dialog.suspended ? "Suspend" : "Reactivate"}
                onConfirm={() => dialog?.kind === "suspend" && run(() => patch({ suspended: dialog.suspended }), dialog.suspended ? "User suspended" : "User reactivated")}
                onCancel={() => setDialog(null)} />

            <ConfirmDialog open={dialog?.kind === "role"} danger={dialog?.kind === "role" && dialog.role === "admin"} loading={busy}
                title="Change role?"
                message={dialog?.kind === "role" ? (dialog.role === "admin" ? `${u.name} will get FULL admin access.` : `${u.name} will change from ${u.role} to ${dialog.role}.`) : ""}
                confirmLabel="Change role"
                onConfirm={() => dialog?.kind === "role" && run(() => patch({ role: dialog.role }), "Role updated")}
                onCancel={() => setDialog(null)} />

            <TypedConfirmDialog open={dialog?.kind === "delete"} loading={busy} word="DELETE" title="Delete this user permanently?"
                message={`${u.name} (${u.email}) and their data will be removed. This cannot be undone. Consider suspending instead.`}
                onConfirm={() => run(() => adminFetch("/api/admin/users", { method: "DELETE", body: JSON.stringify({ userId: id }) }), "User deleted", () => router.push("/admin-dashboard/users"))}
                onCancel={() => setDialog(null)} />

            {dialog?.kind === "notify" && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/30" onClick={() => !busy && setDialog(null)}>
                    <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md animate-fade-up space-y-3" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-display font-semibold text-slate-800">Notify {u.name}</h3>
                        <input value={nTitle} onChange={(e) => setNTitle(e.target.value)} maxLength={100} placeholder="Title" className="input-field" autoFocus />
                        <textarea value={nMsg} onChange={(e) => setNMsg(e.target.value)} maxLength={500} rows={3} placeholder="Message" className="input-field" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDialog(null)} disabled={busy} className="btn btn-sm btn-secondary">Cancel</button>
                            <button disabled={busy || nTitle.trim().length < 3 || nMsg.trim().length < 5} className="btn btn-sm btn-primary"
                                onClick={() => run(() => adminFetch(`/api/admin/users/${id}`, { method: "POST", body: JSON.stringify({ title: nTitle.trim(), message: nMsg.trim() }) }), "Notification sent", () => { setNTitle(""); setNMsg(""); reload(); })}>
                                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}