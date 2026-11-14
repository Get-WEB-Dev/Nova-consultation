"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, ClipboardList, Loader2, Clock } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useServerList } from "@/lib/use-server-list";
import Pagination from "@/components/admin/Pagination";
import { useToast, PageHeader, ConfirmDialog } from "@/components/admin/AdminUI";
import { EmptyPanel, PageError, fmtDate } from "@/components/admin/kit";

interface Row {
    id: string; user_id: string | null; requester_email: string; request_type: "export" | "deletion" | "correction";
    status: "received" | "in_progress" | "completed" | "rejected"; details: string | null; due_at: string;
    created_by_email: string | null; handled_by_email: string | null; completed_at: string | null; created_at: string;
}
const FILTERS = ["all", "overdue", "received", "in_progress", "completed", "rejected"];
const TYPE_LABEL = { export: "Copy of data", deletion: "Deletion", correction: "Correction" } as const;
const STATUS_BADGE = { received: "badge-gold", in_progress: "badge-navy", completed: "badge-green", rejected: "badge-slate" } as const;

function Due({ r }: { r: Row }) {
    if (r.status === "completed" || r.status === "rejected") return <span className="text-xs text-slate-400">Closed {fmtDate(r.completed_at)}</span>;
    const days = Math.ceil((new Date(r.due_at).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return <span className="text-xs font-semibold text-rose-600 flex items-center gap-1"><Clock className="w-3 h-3" /> Overdue by {-days} day{days === -1 ? "" : "s"}</span>;
    return <span className={`text-xs flex items-center gap-1 ${days <= 7 ? "font-semibold text-amber-600" : "text-slate-500"}`}><Clock className="w-3 h-3" /> Due in {days} day{days === 1 ? "" : "s"}</span>;
}

export default function AdminDataRequestsPage() {
    const toast = useToast();
    const [filter, setFilter] = useState("all");
    const [pending, setPending] = useState<{ row: Row; status: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [creating, setCreating] = useState(false);
    const [email, setEmail] = useState("");
    const [type, setType] = useState("export");
    const [details, setDetails] = useState("");

    const { rows, total, counts, loading, error, q, setQ, page, setPage, pageSize, reload } =
        useServerList<Row>("/api/admin/data-requests", filter === "all" ? {} : { status: filter });

    const setStatus = async () => {
        if (!pending) return;
        setBusy(true);
        try {
            await adminFetch("/api/admin/data-requests", { method: "PATCH", body: JSON.stringify({ id: pending.row.id, status: pending.status }) });
            toast("success", "Request updated");
            await reload();
        } catch (e: any) { toast("error", e.message); }
        finally { setBusy(false); setPending(null); }
    };

    const create = async () => {
        setBusy(true);
        try {
            await adminFetch("/api/admin/data-requests", { method: "POST", body: JSON.stringify({ email: email.trim(), type, details: details.trim() || undefined }) });
            toast("success", "Request logged. The 30-day clock has started.");
            setCreating(false); setEmail(""); setDetails(""); setType("export");
            await reload();
        } catch (e: any) { toast("error", e.message); }
        finally { setBusy(false); }
    };

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader title="Data requests" subtitle="People asking for a copy, correction or deletion of their data, tracked against a 30-day deadline"
                right={<button onClick={() => setCreating(true)} className="btn btn-sm btn-primary"><Plus className="w-3.5 h-3.5" /> Log a request</button>} />

            <div className="space-y-3">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email…" className="input-field pl-10" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {FILTERS.map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filter === f ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                            {f.replace("_", " ")} <span className={f === "overdue" && (counts[f] ?? 0) > 0 && filter !== f ? "text-rose-500 font-bold" : "opacity-60"}>{counts[f] ?? 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            {error ? <PageError message={error} onRetry={reload} /> : loading && rows.length === 0 ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="animate-shimmer h-20 rounded-2xl" />)}</div>
            ) : rows.length === 0 ? (
                <div className="card"><EmptyPanel icon={ClipboardList} title="No requests here" text="When someone emails or calls asking about their data, log it so the deadline is tracked." /></div>
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {rows.map((r) => (
                        <div key={r.id} className="px-4 py-3.5 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="badge badge-navy">{TYPE_LABEL[r.request_type]}</span>
                                <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status.replace("_", " ")}</span>
                                <p className="text-sm font-semibold text-slate-700 truncate">{r.requester_email}</p>
                                <span className="ml-auto"><Due r={r} /></span>
                            </div>
                            {r.details && <p className="text-xs text-slate-500 whitespace-pre-wrap">{r.details}</p>}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] text-slate-400">Logged {fmtDate(r.created_at)}{r.created_by_email ? ` by ${r.created_by_email}` : ""}{r.handled_by_email ? ` · handled by ${r.handled_by_email}` : ""}</span>
                                <div className="ml-auto flex gap-2">
                                    {r.user_id
                                        ? <Link href={`/admin-dashboard/users/${r.user_id}`} className="btn btn-sm btn-secondary">Open account</Link>
                                        : <span className="text-[11px] text-slate-300 self-center">No account with this email</span>}
                                    {r.status === "received" && <button onClick={() => setPending({ row: r, status: "in_progress" })} className="btn btn-sm btn-secondary">Start</button>}
                                    {(r.status === "received" || r.status === "in_progress") && (
                                        <>
                                            <button onClick={() => setPending({ row: r, status: "completed" })} className="btn btn-sm btn-success">Complete</button>
                                            <button onClick={() => setPending({ row: r, status: "rejected" })} className="btn btn-sm btn-secondary">Reject</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} disabled={loading} />

            <ConfirmDialog open={!!pending} loading={busy} danger={pending?.status === "rejected"}
                title={pending?.status === "completed" ? "Mark as completed?" : pending?.status === "rejected" ? "Reject this request?" : "Start working on it?"}
                message={pending ? `${TYPE_LABEL[pending.row.request_type]} request from ${pending.row.requester_email}.` : ""}
                confirmLabel={pending?.status === "completed" ? "Complete" : pending?.status === "rejected" ? "Reject" : "Start"}
                onConfirm={setStatus} onCancel={() => setPending(null)} />

            {creating && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/30" onClick={() => !busy && setCreating(false)}>
                    <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md animate-fade-up space-y-3" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-display font-semibold text-slate-800">Log a data request</h3>
                        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Requester's email" className="input-field" autoFocus />
                        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field" aria-label="Request type">
                            <option value="export">Copy of their data</option>
                            <option value="correction">Correction</option>
                            <option value="deletion">Deletion</option>
                        </select>
                        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={1000} placeholder="What did they ask for? (optional)" className="input-field" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setCreating(false)} disabled={busy} className="btn btn-sm btn-secondary">Cancel</button>
                            <button onClick={create} disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} className="btn btn-sm btn-primary">
                                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Log request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}