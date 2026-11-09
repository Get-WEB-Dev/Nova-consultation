"use client";

import { useState } from "react";
import { Search, Eye, EyeOff, Trash2, AlertCircle } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useServerList } from "@/lib/use-server-list";
import Pagination from "@/components/admin/Pagination";
import { useToast, PageHeader, ConfirmDialog, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface Row {
    id: string; rating: number; comment: string | null; isPublished: boolean;
    createdAt: string; patient: string; doctor: string; specialty: string;
}
const FILTERS = ["all", "published", "hidden", "low"];

export default function AdminReviewsPage() {
    const toast = useToast();
    const [filter, setFilter] = useState("all");
    const [del, setDel] = useState<Row | null>(null);
    const [busy, setBusy] = useState(false);
    const { rows, total, counts, loading, error, q, setQ, page, setPage, pageSize, reload } =
        useServerList<Row>("/api/admin/reviews", filter === "all" ? {} : { status: filter });

    const toggle = async (r: Row) => {
        try {
            await adminFetch("/api/admin/reviews", { method: "PATCH", body: JSON.stringify({ reviewId: r.id, isPublished: !r.isPublished }) });
            toast("success", r.isPublished ? "Review hidden" : "Review is public again");
            await reload();
        } catch (e: any) { toast("error", e.message); }
    };

    const remove = async () => {
        if (!del) return;
        setBusy(true);
        try {
            await adminFetch("/api/admin/reviews", { method: "DELETE", body: JSON.stringify({ reviewId: del.id }) });
            toast("success", "Review deleted");
            setDel(null);
            await reload();
        } catch (e: any) { toast("error", e.message); setDel(null); }
        finally { setBusy(false); }
    };

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader title="Reviews" subtitle="Moderate patient reviews. Hidden reviews stop counting toward a doctor's rating." />

            <div className="space-y-3">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search review text…" className="input-field pl-10" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {FILTERS.map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filter === f ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                            {f === "low" ? "1–2 stars" : f} <span className="opacity-60">{counts[f] ?? 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading && rows.length === 0 ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="animate-shimmer h-20 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={reload} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : rows.length === 0 ? (
                <EmptyState text="No reviews match" />
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {rows.map((r) => (
                        <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-amber-500 tracking-wide">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                                <p className="text-sm text-slate-700 break-words mt-0.5">{r.comment || <span className="text-slate-300">No written comment</span>}</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {r.patient} → Dr. {r.doctor.replace(/^dr\.?\s*/i, "")}{r.specialty ? ` · ${r.specialty}` : ""} · {timeAgo(r.createdAt)}
                                </p>
                            </div>
                            <span className={`badge ${r.isPublished ? "badge-green" : "badge-slate"}`}>{r.isPublished ? "Public" : "Hidden"}</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => toggle(r)} className="p-2 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-50" title={r.isPublished ? "Hide" : "Publish"}>
                                    {r.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button onClick={() => setDel(r)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} disabled={loading} />

            <ConfirmDialog open={!!del} danger loading={busy} title="Delete this review?"
                message="It will be permanently removed and the doctor's rating recalculated. Consider hiding it instead."
                confirmLabel="Delete" onConfirm={remove} onCancel={() => setDel(null)} />
        </div>
    );
}