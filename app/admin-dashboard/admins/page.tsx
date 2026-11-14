"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ShieldCheck, ShieldOff, Crown } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { PRESETS, PERMISSION_LABELS, PERMISSIONS } from "@/lib/admin-permissions";
import { useToast, PageHeader, ConfirmDialog, EmptyState, timeAgo } from "@/components/admin/AdminUI";
import { Avatar, Panel } from "@/components/admin/kit";

interface AdminRow { id: string; name: string; email: string; role: string; isSuperAdmin: boolean; since: string; permissions: string[]; access: string }
type Dialog = null | { kind: "super"; row: AdminRow; make: boolean } | { kind: "remove"; row: AdminRow };

export default function AdminAdminsPage() {
    const toast = useToast();
    const [rows, setRows] = useState<AdminRow[]>([]);
    const [me, setMe] = useState<{ id: string; isSuperAdmin: boolean } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialog, setDialog] = useState<Dialog>(null);
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

    const patch = async (userId: string, body: object, ok: string) => {
        setBusy(true);
        try {
            await adminFetch("/api/admin/admins", { method: "PATCH", body: JSON.stringify({ userId, ...body }) });
            toast("success", ok);
            await load();
        } catch (e: any) { toast("error", e.message); }
        finally { setBusy(false); setDialog(null); }
    };

    const removeAdmin = async (row: AdminRow) => {
        setBusy(true);
        try {
            await adminFetch("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId: row.id, role: "patient" }) });
            toast("success", `${row.name} is no longer an admin`);
            await load();
        } catch (e: any) { toast("error", e.message); }
        finally { setBusy(false); setDialog(null); }
    };

    const iAmSuper = !!me?.isSuperAdmin;

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader title="Admins" subtitle="Who can sign in to this dashboard, and what each person may do"
                right={<Link href="/admin-dashboard/users" className="btn btn-sm btn-secondary">Add admin from Users</Link>} />

            {loading ? (
                <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="animate-shimmer h-20 rounded-2xl" />)}</div>
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
                    {rows.map((a) => {
                        const isMe = a.id === me?.id;
                        const editable = iAmSuper && !isMe;
                        return (
                            <div key={a.id} className="flex items-center gap-3 px-4 py-3.5 flex-wrap lg:flex-nowrap">
                                <Avatar name={a.name} size={40} />
                                <div className="flex-1 min-w-[180px]">
                                    <p className="text-sm font-semibold text-slate-700 truncate">
                                        {a.name} {isMe && <span className="badge badge-navy ml-1">You</span>}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">{a.email} · admin since {timeAgo(a.since)}</p>
                                </div>

                                {a.isSuperAdmin ? (
                                    <span className="badge badge-gold flex items-center gap-1"><Crown className="w-3 h-3" /> Super admin</span>
                                ) : editable ? (
                                    <select value={a.access} disabled={busy} aria-label={`Access level for ${a.name}`}
                                        onChange={(e) => patch(a.id, { preset: e.target.value }, `${a.name} is now ${PRESETS[e.target.value].label}`)}
                                        className="input-field !w-auto !py-1.5 text-sm">
                                        {a.access === "custom" && <option value="custom" disabled>Custom</option>}
                                        {Object.entries(PRESETS).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
                                    </select>
                                ) : (
                                    <span className="badge badge-slate">{PRESETS[a.access]?.label ?? "Custom"}</span>
                                )}

                                {editable && (
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setDialog({ kind: "super", row: a, make: !a.isSuperAdmin })} className="btn btn-sm btn-secondary" disabled={busy}>
                                            <Crown className="w-3.5 h-3.5" /> {a.isSuperAdmin ? "Remove super admin" : "Make super admin"}
                                        </button>
                                        {!a.isSuperAdmin && (
                                            <button onClick={() => setDialog({ kind: "remove", row: a })} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50" title="Remove admin access" aria-label="Remove admin access">
                                                <ShieldOff className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!iAmSuper && !loading && !error && (
                <p className="text-xs text-slate-400">Only super admins can change access levels.</p>
            )}

            <Panel title="What can each access level do?">
                <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(PRESETS).map(([key, p]) => (
                        <div key={key} className="rounded-xl bg-slate-50 p-3.5">
                            <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary-500" /> {p.label}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>
                            <ul className="mt-2 space-y-1">
                                {p.permissions.includes("all")
                                    ? <li className="text-xs text-slate-600">Everything below</li>
                                    : p.permissions.map((perm) => <li key={perm} className="text-xs text-slate-600">• {PERMISSION_LABELS[perm as (typeof PERMISSIONS)[number]]}</li>)}
                            </ul>
                        </div>
                    ))}
                    <div className="rounded-xl bg-amber-50 p-3.5 md:col-span-2">
                        <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5" /> Super admin</p>
                        <p className="text-xs text-amber-700 mt-0.5">Everything, plus: send announcements, change platform settings, and manage other admins. There must always be at least one.</p>
                    </div>
                </div>
            </Panel>

            <ConfirmDialog open={dialog?.kind === "super"} danger={dialog?.kind === "super" && dialog.make} loading={busy}
                title={dialog?.kind === "super" && dialog.make ? "Make this person a super admin?" : "Remove super-admin rights?"}
                message={dialog?.kind === "super" ? (dialog.make ? `${dialog.row.name} will be able to change platform settings, send announcements and manage other admins.` : `${dialog.row.name} will keep their admin access but lose super-admin rights.`) : ""}
                confirmLabel={dialog?.kind === "super" && dialog.make ? "Make super admin" : "Remove"}
                onConfirm={() => dialog?.kind === "super" && patch(dialog.row.id, { superAdmin: dialog.make }, dialog.make ? `${dialog.row.name} is now a super admin` : `${dialog.row.name} is no longer a super admin`)}
                onCancel={() => setDialog(null)} />
            <ConfirmDialog open={dialog?.kind === "remove"} danger loading={busy} title="Remove admin access?"
                message={dialog?.kind === "remove" ? `${dialog.row.name} will lose access to the dashboard immediately and become a regular patient account.` : ""}
                confirmLabel="Remove access" onConfirm={() => dialog?.kind === "remove" && removeAdmin(dialog.row)} onCancel={() => setDialog(null)} />
        </div>
    );
}