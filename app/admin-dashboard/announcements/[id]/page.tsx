"use client";

import { useParams } from "next/navigation";
import { Bell } from "lucide-react";
import { useDetail } from "@/lib/use-detail";
import { Breadcrumbs, Panel, DetailList, Stat, SkeletonBlock, PageError, CopyId, fmtDateTime } from "@/components/admin/kit";

interface Detail {
    id: string; title: string; message: string; audience: string; recipients: number;
    created_by_email: string | null; created_at: string; delivered: number; read: number; readRate: number | null;
}

export default function AdminAnnouncementDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data, loading, error, reload } = useDetail<Detail>(`/api/admin/announcements/${id}`);

    if (loading && !data) return <SkeletonBlock />;
    if (error || !data) return <PageError message={error ?? "Announcement not found"} onRetry={reload} />;
    const a = data;

    return (
        <div className="space-y-5 animate-fade-up">
            <Breadcrumbs items={[{ label: "Announcements", href: "/admin-dashboard/announcements" }, { label: a.title }]} />

            <section className="card space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display font-bold text-2xl text-slate-800">{a.title}</h1>
                    <span className="badge badge-navy capitalize">{a.audience}</span>
                    <CopyId value={a.id} />
                </div>
                <p className="text-xs text-slate-400">Sent {fmtDateTime(a.created_at)} by {a.created_by_email ?? "an admin"}</p>
            </section>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat label="Recipients" value={a.recipients.toLocaleString()} />
                <Stat label="Delivered" value={a.delivered.toLocaleString()} sub="notifications created" />
                <Stat label="Read" value={a.read.toLocaleString()} />
                <Stat label="Read rate" value={a.readRate != null ? `${a.readRate}%` : "—"} />
            </div>

            <Panel title="Read progress">
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-3 bg-primary-500 rounded-full transition-all" style={{ width: `${a.readRate ?? 0}%` }} />
                </div>
                <p className="text-xs text-slate-400 mt-2">{a.read.toLocaleString()} of {a.delivered.toLocaleString()} people have opened it.</p>
            </Panel>

            <Panel title="How it appears to users">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 max-w-md">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center shrink-0"><Bell className="w-4 h-4 text-primary-600" /></div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700">{a.title}</p>
                        <p className="text-sm text-slate-500 mt-0.5 whitespace-pre-wrap break-words">{a.message}</p>
                    </div>
                </div>
            </Panel>

            <Panel title="Details">
                <DetailList items={[
                    { label: "Audience", value: <span className="capitalize">{a.audience}</span> },
                    { label: "Sent by", value: a.created_by_email },
                    { label: "Sent at", value: fmtDateTime(a.created_at) },
                ]} />
            </Panel>
        </div>
    );
}