"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Mail, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useServerList } from "@/lib/use-server-list";
import Pagination from "@/components/admin/Pagination";
import { useToast, PageHeader, ConfirmDialog, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface Msg { id: string; name: string; email: string; subject: string | null; message: string; status: "new" | "read" | "resolved"; created_at: string }
const FILTERS = ["all", "new", "read", "resolved"];
const BADGE = { new: "badge-gold", read: "badge-slate", resolved: "badge-green" } as const;

export default function AdminMessagesPage() {
    const toast = useToast();
    const [filter, setFilter] = useState("all");
    const [open, setOpen] = useState<string | null>(null);
    const [del, setDel] = useState<Msg | null>(null);
    const [busy, setBusy] = useState(false);
    const { rows, total, counts, loading, error, q, setQ, page, setPage, pageSize, reload } =
        useServerList<Msg>("/api/admin/messages", filter === "all" ? {} : { status: filter });

    const setStatus = async (m: Msg, status: string, quiet = false) => {
        try {
            await adminFetch("/api/admin/messages", { method: "PATCH", body: JSON.stringify({ id: m.id, status }) });
            if (!quiet) toast("success", `Marked ${status}`);
            await reload();
        } catch (e: any) { toast("error", e.message); }
    };

    const expand = (m: Msg) => {
        const opening = open !== m.id;
        setOpen(opening ? m.id : null);
        if (opening && m.status === "new") setStatus(m, "read", true); // reading it clears "new"
    };

    const remove = async () => {
        if (!del) return;
        setBusy(true);
        try {
            await adminFetch("/api/admin/messages", { method: "DELETE", body: JSON.stringify({ id: del.id }) });
            toast("success", "Message deleted");
            setDel(null);
            await reload();
        } catch (e: any) { toast("error", e.message); setDel(null); }
        finally { setBusy(false); }
    };

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader title="Messages" subtitle="Messages sent through the website contact form" />

            <div className="space-y-3">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or subject…" className="input-field pl-10" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {FILTERS.map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filter === f ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                            {f} <span className="opacity-60">{counts[f] ?? 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading && rows.length === 0 ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="animate-shimmer h-16 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={reload} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : rows.length === 0 ? (
                <EmptyState text="No messages here" />
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {rows.map((m) => (
                        <div key={m.id} className="px-4 py-3">
                            <button onClick={() => expand(m)} className="w-full text-left flex items-start gap-3">
                                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${m.status === "new" ? "bg-primary-500" : "bg-slate-200"}`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${m.status === "new" ? "font-bold text-slate-800" : "font-semibold text-slate-600"}`}>{m.subject || "(no subject)"}</p>
                                    <p className="text-xs text-slate-400 truncate">{m.name} · {m.email} · {timeAgo(m.created_at)}</p>
                                </div>
                                <span className={`badge ${BADGE[m.status]}`}>{m.status}</span>
                            </button>
                            {open === m.id && (
                                <div className="mt-3 pl-5 space-y-3">
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{m.message}</p>
                                    <div className="flex gap-2 flex-wrap">
                                        <Link href={`/admin-dashboard/messages/${m.id}`} className="btn btn-sm btn-secondary">Open</Link>
                                        <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + (m.subject || "Your message to Nova Health"))}`} className="btn btn-sm btn-primary">
                                            <Mail className="w-3.5 h-3.5" /> Reply by email
                                        </a>
                                        {m.status !== "resolved" && (
                                            <button onClick={() => setStatus(m, "resolved")} className="btn btn-sm btn-success">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark resolved
                                            </button>
                                        )}
                                        {m.status !== "new" && (
                                            <button onClick={() => setStatus(m, "new")} className="btn btn-sm btn-secondary">Mark unread</button>
                                        )}
                                        <button onClick={() => setDel(m)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} disabled={loading} />

            <ConfirmDialog open={!!del} danger loading={busy} title="Delete this message?"
                message="It will be permanently removed." confirmLabel="Delete" onConfirm={remove} onCancel={() => setDel(null)} />
        </div>
    );
}