"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw, Search, Download, Loader2, X } from "lucide-react";
import { downloadCsv } from "@/lib/admin-api";
import { useServerList } from "@/lib/use-server-list";
import Pagination from "@/components/admin/Pagination";
import { actionLabel } from "@/lib/admin-labels";
import { useToast, PageHeader, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface Entry {
    id: string; admin_email: string | null; action: string;
    target_type: string | null; target_id: string | null; details: string | null; created_at: string;
}

const DOT: Record<string, string> = {
    user: "bg-primary-500", doctor: "bg-accent-500", consultation: "bg-gold-500", post: "bg-slate-500", export: "bg-rose-500",
    review: "bg-gold-500", message: "bg-primary-500", announcement: "bg-rose-500",
};
const FILTERS = ["all", "user", "doctor", "consultation", "post", "review", "message", "announcement", "export"];

export default function AdminActivityPage() {
    const toast = useToast();
    const [category, setCategory] = useState("all");
    const [since, setSince] = useState("");
    const [until, setUntil] = useState("");
    const [exporting, setExporting] = useState(false);

    // Only send the filters that are actually set
    const extra: Record<string, string> = {};
    if (category !== "all") extra.category = category;
    if (since) extra.since = since;
    if (until) extra.until = until;

    const {
        rows: entries, total, loading, error, q, setQ,
        page, setPage, pageSize, reload, exportUrl,
    } = useServerList<Entry>("/api/admin/activity", extra);

    const exportCsv = async () => {
        setExporting(true);
        try {
            await downloadCsv(exportUrl(), `activity-log-${new Date().toISOString().slice(0, 10)}.csv`);
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader
                title="Activity Log"
                subtitle={`${total.toLocaleString()} recorded admin actions`}
                right={
                    <div className="flex gap-2">
                        <button onClick={exportCsv} disabled={exporting} className="btn btn-sm btn-secondary">
                            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export CSV
                        </button>
                        <button onClick={reload} disabled={loading} className="btn btn-sm btn-secondary">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </button>
                    </div>
                }
            />

            <div className="space-y-3">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search admin, action or details…" className="input-field pl-10" />
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                    {FILTERS.map((f) => (
                        <button key={f} onClick={() => setCategory(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${category === f ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                            {f}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 flex-wrap items-center text-xs text-slate-500">
                    <label className="flex items-center gap-1.5">From
                        <input type="date" value={since} max={until || undefined} onChange={(e) => setSince(e.target.value)} className="input-field !w-auto !py-1.5 text-xs" />
                    </label>
                    <label className="flex items-center gap-1.5">To
                        <input type="date" value={until} min={since || undefined} onChange={(e) => setUntil(e.target.value)} className="input-field !w-auto !py-1.5 text-xs" />
                    </label>
                    {(since || until) && (
                        <button onClick={() => { setSince(""); setUntil(""); }} className="flex items-center gap-1 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" /> Clear dates
                        </button>
                    )}
                </div>
            </div>

            {loading && entries.length === 0 ? (
                <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="animate-shimmer h-14 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
                    <button onClick={reload} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : entries.length === 0 ? (
                <EmptyState text="No activity matches these filters" />
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {entries.map((e) => (
                        <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                            <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${DOT[e.action.split(".")[0]] ?? "bg-slate-300"}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700">
                                    <span className="font-semibold">{e.admin_email ?? "An admin"}</span>{" "}
                                    {actionLabel(e.action)}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {e.details ?? (e.target_id ? `ID ${e.target_id.slice(0, 8)}…` : "")}
                                </p>
                            </div>
                            <span className="text-[11px] text-slate-300 shrink-0" title={new Date(e.created_at).toLocaleString()}>{timeAgo(e.created_at)}</span>
                        </div>
                    ))}
                </div>
            )}

            <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} disabled={loading} />
        </div>
    );
}