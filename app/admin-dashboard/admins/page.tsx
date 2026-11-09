"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, PageHeader, ConfirmDialog, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface AdminRow { id: string; name: string; email: string; role: string; isSuperAdmin: boolean; since: string }

export default function AdminAdminsPage() {
    const toast = useToast();
    const [rows, setRows] = useState<AdminRow[]>([]);
    const [me, setMe] = useState<{ id: string; isSuperAdmin: boolean } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [target, setTarget] = useState<AdminRow | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<{ data: AdminRow[]; me: { id: string; isSuperAdmin: boolean } }>("/api/admin/admins");
            setRows(json.data);
            setMe(json.me);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const revoke = async () => {
        if (!target) return;
        setBusy(true);
        try {
            await adminFetch("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId: target.id, role: "patient" }) });
            toast("success", `${target.name} is no longer an admin`);
            setTarget(null);
            await load();
        } catch (e: any) { toast("error", e.message); setTarget(null); }
        finally { setBusy(false); }
    };

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader title="Admins" subtitle="Everyone who can sign in to this dashboard"
                right={<Link href="/admin-dashboard/users" className="btn btn-sm btn-secondary">Add admin from Users</Link>} />

            {loading ? (
                <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="animate-shimmer h-16 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={load} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : rows.length === 0 ? (
                <EmptyState text="No admins found" />
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {rows.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">{a.name.charAt(0).toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-700 truncate">
                                    {a.name} {a.id === me?.id && <span className="badge badge-navy ml-1">You</span>}
                                </p>
                                <p className="text-xs text-slate-400 truncate">{a.email} · admin since {timeAgo(a.since)}</p>
                                {a.role !== "admin" && (
                                    <p className="text-[11px] text-amber-600 mt-0.5">Has admin access through the admins table but their role is “{a.role}”. Remove access to clean this up.</p>
                                )}
                            </div>
                            {a.isSuperAdmin
                                ? <span className="badge badge-gold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Super admin</span>
                                : <span className="badge badge-slate">Admin</span>}
                            {me?.isSuperAdmin && !a.isSuperAdmin && a.id !== me.id && (
                                <button onClick={() => setTarget(a)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50" title="Remove admin access">
                                    <ShieldOff className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog open={!!target} danger loading={busy} title="Remove admin access?"
                message={`${target?.name ?? "This user"} will lose access to the dashboard immediately and become a regular patient account.`}
                confirmLabel="Remove access" onConfirm={revoke} onCancel={() => setTarget(null)} />
        </div>
    );
}