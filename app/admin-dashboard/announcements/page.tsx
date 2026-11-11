"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Loader2, Lock, ArrowRight } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useServerList } from "@/lib/use-server-list";
import Pagination from "@/components/admin/Pagination";
import { useToast, PageHeader, ConfirmDialog, timeAgo } from "@/components/admin/AdminUI";
import { Panel, EmptyPanel, PageError } from "@/components/admin/kit";

interface Row { id: string; title: string; message: string; audience: string; recipients: number; created_by_email: string | null; created_at: string }

const AUDIENCES = [
    { key: "all", label: "Everyone" },
    { key: "patients", label: "Patients" },
    { key: "doctors", label: "Doctors" },
];

export default function AdminAnnouncementsPage() {
    const toast = useToast();
    const [audience, setAudience] = useState("all");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [isSuper, setIsSuper] = useState<boolean | null>(null);
    const { rows, total, loading, error, page, setPage, pageSize, reload } = useServerList<Row>("/api/admin/announcements", {}, 10);

    useEffect(() => {
        adminFetch<{ isSuperAdmin: boolean }>("/api/admin/verify").then((j) => setIsSuper(!!j.isSuperAdmin)).catch(() => setIsSuper(false));
    }, []);

    const valid = title.trim().length >= 3 && message.trim().length >= 5;
    const label = AUDIENCES.find((a) => a.key === audience)!.label.toLowerCase();

    const send = async () => {
        setBusy(true);
        try {
            const json = await adminFetch<{ sent: number }>("/api/admin/announcements", {
                method: "POST",
                body: JSON.stringify({ audience, title: title.trim(), message: message.trim() }),
            });
            toast("success", `Sent to ${json.sent.toLocaleString()} users`);
            setTitle(""); setMessage("");
            await reload();
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusy(false);
            setConfirm(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-up">
            <PageHeader title="Announcements" subtitle="Send a notification to a group of users and see how many read it" />

            <div className="grid lg:grid-cols-5 gap-5">
                <div className="lg:col-span-2">
                    <Panel title="New announcement">
                        {isSuper === false && (
                            <p className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                                <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Only super admins can send announcements, because they reach every user. You can still see the history.
                            </p>
                        )}
                        <div className={`space-y-4 ${isSuper === false ? "opacity-50 pointer-events-none" : ""}`}>
                            <div className="flex gap-2 flex-wrap">
                                {AUDIENCES.map((a) => (
                                    <button key={a.key} onClick={() => setAudience(a.key)}
                                        className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${audience === a.key ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                            <div>
                                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Title" className="input-field" />
                                <p className="text-[11px] text-slate-300 mt-1 text-right">{title.length}/100</p>
                            </div>
                            <div>
                                <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={4} placeholder="Message" className="input-field" />
                                <p className="text-[11px] text-slate-300 mt-1 text-right">{message.length}/500</p>
                            </div>
                            <button disabled={!valid || busy} onClick={() => setConfirm(true)} className="btn btn-primary w-full justify-center">
                                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Review & send
                            </button>
                        </div>
                    </Panel>
                </div>

                <div className="lg:col-span-3 space-y-3">
                    <h2 className="font-display font-semibold text-slate-800">History</h2>
                    {error ? (
                        <PageError message={error} onRetry={reload} />
                    ) : loading && rows.length === 0 ? (
                        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="animate-shimmer h-20 rounded-2xl" />)}</div>
                    ) : rows.length === 0 ? (
                        <div className="card"><EmptyPanel icon={Megaphone} title="Nothing sent yet" text="Announcements you send will be listed here with their delivery and read numbers." /></div>
                    ) : (
                        <div className="card p-0 divide-y divide-slate-50">
                            {rows.map((a) => (
                                <Link key={a.id} href={`/admin-dashboard/announcements/${a.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{a.title}</p>
                                        <p className="text-xs text-slate-400 truncate">{a.message}</p>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            <span className="capitalize">{a.audience}</span> · {a.recipients.toLocaleString()} recipients · {a.created_by_email ?? "An admin"} · {timeAgo(a.created_at)}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                                </Link>
                            ))}
                        </div>
                    )}
                    <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} disabled={loading} />
                </div>
            </div>

            <ConfirmDialog open={confirm} loading={busy} danger title="Send this announcement?"
                message={`"${title.trim()}" will appear in the notifications of ${label}. This cannot be undone.`}
                confirmLabel="Send now" onConfirm={send} onCancel={() => setConfirm(false)} />
        </div>
    );
}