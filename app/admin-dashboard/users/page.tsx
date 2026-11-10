"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Trash2, AlertCircle, UserX, UserCheck, Download, Loader2 } from "lucide-react";
import { adminFetch, downloadCsv } from "@/lib/admin-api";
import { useServerList } from "@/lib/use-server-list";
import Pagination from "@/components/admin/Pagination";
import { getUser } from "@/lib/supabase/auth";

import { useToast, PageHeader, ConfirmDialog, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface UserRow {
    id: string; name: string; email: string; role: string; created_at: string; phone?: string | null;
    is_suspended?: boolean; suspended_reason?: string | null;
}

const ROLES = ["patient", "doctor", "professional", "admin"];
const FILTERS = ["all", ...ROLES];

type Pending =
    | { type: "role"; user: UserRow; role: string }
    | { type: "suspend"; user: UserRow; suspended: boolean }
    | { type: "delete"; user: UserRow };

export default function AdminUsersPage() {
    const toast = useToast();
    const myId = getUser()?.id;

    const [filter, setFilter] = useState("all");
    const [pending, setPending] = useState<Pending | null>(null);
    const [busy, setBusy] = useState(false);
    const [exporting, setExporting] = useState(false);

    const {
        rows: users, total, counts, loading, error, q: query, setQ: setQuery,
        page, setPage, pageSize, reload: load, exportUrl,
    } = useServerList<UserRow>("/api/admin/users", filter === "all" ? {} : { role: filter });

    const exportCsv = async () => {
        setExporting(true);
        try {
            await downloadCsv(exportUrl(), `users-${new Date().toISOString().slice(0, 10)}.csv`);
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setExporting(false);
        }
    };

    const confirmAction = async () => {
        if (!pending) return;
        setBusy(true);
        try {
            if (pending.type === "role") {
                await adminFetch("/api/admin/users", {
                    method: "PATCH",
                    body: JSON.stringify({ userId: pending.user.id, role: pending.role }),
                });
                toast("success", `${pending.user.name} is now ${pending.role}`);
            } else if (pending.type === "suspend") {
                await adminFetch("/api/admin/users", {
                    method: "PATCH",
                    body: JSON.stringify({ userId: pending.user.id, suspended: pending.suspended }),
                });
                toast("success", `${pending.user.name} was ${pending.suspended ? "suspended" : "reactivated"}`);
            } else {
                await adminFetch("/api/admin/users", {
                    method: "DELETE",
                    body: JSON.stringify({ userId: pending.user.id }),
                });
                toast("success", `${pending.user.name} was deleted`);
            }
            setPending(null);
            await load();
        } catch (e: any) {
            toast("error", e.message);
            setPending(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader
                title="Users"
                subtitle={`${(counts.all ?? 0).toLocaleString()} accounts on the platform`}
                right={
                    <button onClick={exportCsv} disabled={exporting} className="btn btn-sm btn-secondary">
                        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export CSV
                    </button>
                }
            />

            {/* Search + role filter */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email…" className="input-field pl-10" />
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

            {loading && users.length === 0 ? (
                <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="animate-shimmer h-16 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={load} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : users.length === 0 ? (
                <EmptyState text="No users match your search" />
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {users.map((u) => {
                        const isMe = u.id === myId;
                        return (
                            <div key={u.id} className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                                    {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 truncate">
                                        <Link href={`/admin-dashboard/users/${u.id}`} className="hover:underline">{u.name}</Link> {isMe && <span className="badge badge-navy ml-1">You</span>}
                                        {u.is_suspended && <span className="badge badge-rose ml-1">Suspended</span>}
                                    </p>
                                    <p className="text-xs text-slate-400 truncate">{u.email} · joined {timeAgo(u.created_at)}</p>
                                </div>
                                <select
                                    value={u.role}
                                    disabled={isMe}
                                    onChange={(e) => e.target.value !== u.role && setPending({ type: "role", user: u, role: e.target.value })}
                                    className="input-field !w-auto !py-1.5 text-xs capitalize disabled:opacity-50"
                                    title={isMe ? "You can't change your own role" : "Change role"}
                                >
                                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <button
                                    disabled={isMe}
                                    onClick={() => setPending({ type: "suspend", user: u, suspended: !u.is_suspended })}
                                    className="p-2 rounded-lg text-slate-300 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                                    title={u.is_suspended ? "Reactivate user" : "Suspend user"}
                                >
                                    {u.is_suspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                </button>
                                <button
                                    disabled={isMe}
                                    onClick={() => setPending({ type: "delete", user: u })}
                                    className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                                    title={isMe ? "You can't delete yourself" : "Delete user"}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} disabled={loading} />

            <ConfirmDialog
                open={!!pending}
                loading={busy}
                danger={pending?.type === "delete" || (pending?.type === "suspend" && pending.suspended) || (pending?.type === "role" && pending.role === "admin")}
                title={
                    pending?.type === "delete" ? "Delete this user?" :
                        pending?.type === "suspend" ? (pending.suspended ? "Suspend this user?" : "Reactivate this user?") :
                            "Change role?"
                }
                message={
                    !pending ? "" :
                        pending.type === "delete"
                            ? `${pending.user.name} (${pending.user.email}) will be permanently removed. This can't be undone.`
                            : pending.type === "suspend"
                                ? pending.suspended
                                    ? `${pending.user.name} will be signed out and blocked from the platform until you reactivate them.`
                                    : `${pending.user.name} will be able to sign in again.`
                                : pending.role === "admin"
                                    ? `${pending.user.name} will get FULL admin access to this dashboard.`
                                    : `${pending.user.name} will change from ${pending.user.role} to ${pending.role}.`
                }
                confirmLabel={
                    pending?.type === "delete" ? "Delete" :
                        pending?.type === "suspend" ? (pending.suspended ? "Suspend" : "Reactivate") :
                            "Change role"
                }
                onConfirm={confirmAction}
                onCancel={() => setPending(null)}
            />
        </div>
    );
}