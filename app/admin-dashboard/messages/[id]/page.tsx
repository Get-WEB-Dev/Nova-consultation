"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Mail, CheckCircle2, User } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useDetail } from "@/lib/use-detail";
import { useToast } from "@/components/admin/AdminUI";
import { Breadcrumbs, Avatar, Panel, Tabs, Timeline, DetailList, CopyId, SkeletonBlock, PageError, fmtDateTime } from "@/components/admin/kit";
import NotesPanel from "@/components/admin/NotesPanel";

interface Msg {
    id: string; name: string; email: string; subject: string | null; message: string;
    status: "new" | "read" | "resolved"; created_at: string;
    account: { id: string; name: string; role: string } | null;
}
const BADGE = { new: "badge-gold", read: "badge-slate", resolved: "badge-green" } as const;
type Tab = "message" | "notes";

export default function AdminMessageDetailPage() {
    const { id } = useParams<{ id: string }>();
    const toast = useToast();
    const { data, loading, error, reload } = useDetail<Msg>(`/api/admin/messages/${id}`);
    const [tab, setTab] = useState<Tab>("message");
    const [busy, setBusy] = useState(false);

    const setStatus = async (status: string) => {
        setBusy(true);
        try {
            await adminFetch("/api/admin/messages", { method: "PATCH", body: JSON.stringify({ id, status }) });
            toast("success", `Marked ${status}`);
            await reload();
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusy(false);
        }
    };

    if (loading && !data) return <SkeletonBlock />;
    if (error || !data) return <PageError message={error ?? "Message not found"} onRetry={reload} />;
    const m = data;
    const subject = m.subject || "(no subject)";

    return (
        <div className="space-y-5 animate-fade-up">
            <Breadcrumbs items={[{ label: "Messages", href: "/admin-dashboard/messages" }, { label: subject }]} />

            <section className="card flex items-start gap-4 flex-wrap">
                <Avatar name={m.name} size={56} />
                <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="font-display font-bold text-xl text-slate-800">{subject}</h1>
                        <span className={`badge ${BADGE[m.status]}`}>{m.status}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{m.name} · {m.email}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">Received {fmtDateTime(m.created_at)} · <CopyId value={m.id} /></p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + subject)}`} className="btn btn-sm btn-primary"><Mail className="w-3.5 h-3.5" /> Reply by email</a>
                    {m.status !== "resolved" && <button onClick={() => setStatus("resolved")} disabled={busy} className="btn btn-sm btn-success"><CheckCircle2 className="w-3.5 h-3.5" /> Mark resolved</button>}
                    {m.status !== "new" && <button onClick={() => setStatus("new")} disabled={busy} className="btn btn-sm btn-secondary">Mark unread</button>}
                </div>
            </section>

            {m.account && (
                <Link href={`/admin-dashboard/users/${m.account.id}`} className="card flex items-center gap-3 hover:shadow-sm transition-all">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center"><User className="w-4 h-4 text-primary-600" /></div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-700">This sender is a registered {m.account.role}</p>
                        <p className="text-xs text-slate-400">Open {m.account.name}&apos;s account to see their history before you reply</p>
                    </div>
                </Link>
            )}

            <Tabs tabs={[{ key: "message", label: "Message" }, { key: "notes", label: "Notes" }]} value={tab} onChange={setTab} />

            {tab === "message" && (
                <div className="grid md:grid-cols-3 gap-4">
                    <Panel className="md:col-span-2"><p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">{m.message}</p></Panel>
                    <div className="space-y-4">
                        <Panel title="Timeline">
                            <Timeline items={[
                                { at: m.created_at, title: "Message received", tone: "info" },
                                ...(m.status !== "new" ? [{ at: null, title: m.status === "resolved" ? "Resolved" : "Opened by an admin", tone: (m.status === "resolved" ? "ok" : "info") as "ok" | "info" }] : []),
                            ]} />
                        </Panel>
                        <Panel title="Sender">
                            <DetailList items={[{ label: "Name", value: m.name }, { label: "Email", value: m.email }]} />
                        </Panel>
                    </div>
                </div>
            )}
            {tab === "notes" && <Panel><NotesPanel entityType="message" entityId={m.id} /></Panel>}
        </div>
    );
}