"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { PageHeader, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface Entry {
    id: string; admin_email: string | null; action: string;
    target_type: string | null; target_id: string | null; details: string | null; created_at: string;
}

// Plain-English version of each action code
const LABELS: Record<string, string> = {
    "user.role_changed": "changed a user's role",
    "user.deleted": "deleted a user",
    "doctor.verified": "verified a doctor",
    "doctor.unverified": "revoked a doctor's verification",
    "doctor.published": "published a doctor",
    "doctor.unpublished": "hid a doctor",
    "consultation.cancelled": "cancelled a consultation",
    "post.published": "published a post",
    "post.hidden": "hid a post",
    "post.deleted": "deleted a post",
};
const DOT: Record<string, string> = {
    user: "bg-primary-500", doctor: "bg-accent-500", consultation: "bg-gold-500", post: "bg-slate-500",
};
const FILTERS = ["all", "user", "doctor", "consultation", "post"];

export default function AdminActivityPage() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("all");

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<{ data: Entry[] }>("/api/admin/activity");
            setEntries(json.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const visible = useMemo(
        () => entries.filter((e) => filter === "all" || e.action.startsWith(filter + ".")),
        [entries, filter]
    );

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader
                title="Activity Log"
                subtitle="A record of every admin action — latest 200"
                right={<button onClick={load} disabled={loading} className="btn btn-sm btn-secondary"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh</button>}
            />

            <div className="flex gap-2 flex-wrap">
                {FILTERS.map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filter === f ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                        {f}
                    </button>
                ))}
            </div>

            {loading && entries.length === 0 ? (
                <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="animate-shimmer h-14 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
                    <button onClick={load} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : visible.length === 0 ? (
                <EmptyState text="No activity recorded yet" />
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {visible.map((e) => (
                        <div key={e.id} className="flex items-start gap-3 px-4 py-3">
                            <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${DOT[e.action.split(".")[0]] ?? "bg-slate-300"}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-700">
                                    <span className="font-semibold">{e.admin_email ?? "An admin"}</span>{" "}
                                    {LABELS[e.action] ?? e.action}
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
        </div>
    );
}