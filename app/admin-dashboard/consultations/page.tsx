"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, XCircle, AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, PageHeader, ConfirmDialog, EmptyState, StatusBadge, timeAgo } from "@/components/admin/AdminUI";

interface Row {
    id: string; status: string; createdAt: string; startedAt: string | null; durationMinutes: number | null;
    rating: number | null; isFollowUp: boolean; patientName: string; patientEmail: string;
    doctorName: string; specialty: string;
}

const FILTERS = ["all", "active", "waiting", "completed", "follow_up", "missed", "cancelled"];
const STUCK_AFTER_HOURS = 6; // a live session older than this is probably stuck

export default function AdminConsultationsPage() {
    const toast = useToast();
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [cancelRow, setCancelRow] = useState<Row | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<{ data: Row[] }>("/api/admin/consultations");
            setRows(json.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: rows.length };
        rows.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
        return c;
    }, [rows]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter((r) =>
            (filter === "all" || r.status === filter) &&
            (!q || r.patientName.toLowerCase().includes(q) || r.doctorName.toLowerCase().includes(q))
        );
    }, [rows, filter, query]);

    const isStuck = (r: Row) =>
        (r.status === "active" || r.status === "waiting") &&
        Date.now() - new Date(r.createdAt).getTime() > STUCK_AFTER_HOURS * 3600 * 1000;

    const doCancel = async () => {
        if (!cancelRow) return;
        setBusy(true);
        try {
            await adminFetch("/api/admin/consultations", {
                method: "PATCH",
                body: JSON.stringify({ consultationId: cancelRow.id }),
            });
            toast("success", "Consultation cancelled");
            setCancelRow(null);
            await load();
        } catch (e: any) {
            toast("error", e.message);
            setCancelRow(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader
                title="Consultations"
                subtitle="Latest 200 sessions across the platform"
                right={<button onClick={load} disabled={loading} className="btn btn-sm btn-secondary"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>}
            />

            <div className="space-y-3">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient or doctor…" className="input-field pl-10" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {FILTERS.map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filter === f ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                            {f.replace("_", " ")} <span className="opacity-60">{counts[f] ?? 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            {loading && rows.length === 0 ? (
                <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="animate-shimmer h-16 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={load} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState text="No consultations match" />
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {filtered.map((r) => {
                        const live = r.status === "active" || r.status === "waiting";
                        return (
                            <div key={r.id} className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 truncate">
                                        {r.patientName} <span className="text-slate-300 font-normal">→</span> Dr. {r.doctorName.replace(/^dr\.?\s*/i, "")}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">
                                        {r.specialty} · {timeAgo(r.createdAt)}
                                        {r.durationMinutes ? ` · ${r.durationMinutes} min` : ""}
                                        {r.rating ? ` · ★ ${r.rating}` : ""}
                                        {r.isFollowUp ? " · follow-up" : ""}
                                    </p>
                                </div>
                                {isStuck(r) && (
                                    <span className="flex items-center gap-1 text-[11px] text-gold-700 bg-gold-50 border border-gold-200 px-2 py-0.5 rounded-full">
                                        <AlertTriangle className="w-3 h-3" /> possibly stuck
                                    </span>
                                )}
                                <StatusBadge status={r.status} />
                                {live && (
                                    <button onClick={() => setCancelRow(r)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50" title="Cancel this session">
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                open={!!cancelRow}
                danger
                loading={busy}
                title="Cancel this consultation?"
                message={cancelRow ? `${cancelRow.patientName}'s session with Dr. ${cancelRow.doctorName.replace(/^dr\.?\s*/i, "")} will be marked cancelled and removed from the queue.` : ""}
                confirmLabel="Cancel session"
                onConfirm={doCancel}
                onCancel={() => setCancelRow(null)}
            />
        </div>
    );
}