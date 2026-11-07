"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Trash2, AlertCircle } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { getUser } from "@/lib/supabase/auth";
import { useToast, PageHeader, ConfirmDialog, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface UserRow {
    id: string; name: string; email: string; role: string; created_at: string; phone?: string | null;
}

const ROLES = ["patient", "doctor", "professional", "admin"];
const FILTERS = ["all", ...ROLES];

type Pending =
    | { type: "role"; user: UserRow; role: string }
    | { type: "delete"; user: UserRow };

export default function AdminUsersPage() {
    const toast = useToast();
    const myId = getUser()?.id;

    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("all");
    const [pending, setPending] = useState<Pending | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<{ data: UserRow[] }>("/api/admin/users");
            setUsers(json.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    // How many users per role (for the filter chips)
    const counts = useMemo(() => {
        const c: Record<string, number> = { all: users.length };
        users.forEach((u) => { c[u.role] = (c[u.role] ?? 0) + 1; });
        return c;
    }, [users]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return users.filter((u) =>
            (filter === "all" || u.role === filter) &&
            (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        );
    }, [users, query, filter]);

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
            <PageHeader title="Users" subtitle={`${users.length} accounts on the platform`} />

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

            {loading ? (
                <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="animate-shimmer h-16 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={load} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState text="No users match your search" />
            ) : (
                <div className="card p-0 divide-y divide-slate-50">
                    {filtered.map((u) => {
                        const isMe = u.id === myId;
                        return (
                            <div key={u.id} className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 shrink-0">
                                    {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 truncate">
                                        {u.name} {isMe && <span className="badge badge-navy ml-1">You</span>}
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

            <ConfirmDialog
                open={!!pending}
                loading={busy}
                danger={pending?.type === "delete" || (pending?.type === "role" && pending.role === "admin")}
                title={pending?.type === "delete" ? "Delete this user?" : "Change role?"}
                message={
                    !pending ? "" :
                        pending.type === "delete"
                            ? `${pending.user.name} (${pending.user.email}) will be permanently removed. This can't be undone.`
                            : pending.role === "admin"
                                ? `${pending.user.name} will get FULL admin access to this dashboard.`
                                : `${pending.user.name} will change from ${pending.user.role} to ${pending.role}.`
                }
                confirmLabel={pending?.type === "delete" ? "Delete" : "Change role"}
                onConfirm={confirmAction}
                onCancel={() => setPending(null)}
            />
        </div>
    );
}