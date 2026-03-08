"use client";

import { useEffect, useState } from "react";
import {
    Users, Search, X, Shield, Trash2,
    AlertCircle, CheckCircle2,
} from "lucide-react";

interface UserData {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    avatar_url: string | null;
    created_at: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetch("/api/admin/users")
            .then(r => r.json())
            .then(json => setUsers(json.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: newRole }),
            });
            if (!res.ok) throw new Error("Failed");
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setActionMsg({ type: "success", text: "Role updated successfully" });
        } catch {
            setActionMsg({ type: "error", text: "Failed to update role" });
        }
        setTimeout(() => setActionMsg(null), 3000);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
        try {
            const res = await fetch("/api/admin/users", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error("Failed");
            setUsers(prev => prev.filter(u => u.id !== userId));
            setActionMsg({ type: "success", text: "User deleted successfully" });
        } catch {
            setActionMsg({ type: "error", text: "Failed to delete user" });
        }
        setTimeout(() => setActionMsg(null), 3000);
    };

    const filtered = users.filter(u => {
        if (roleFilter !== "all" && u.role !== roleFilter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
        }
        return true;
    });

    const roleBg: Record<string, string> = {
        patient: "bg-primary-50 text-primary-600",
        doctor: "bg-accent-50 text-accent-600",
        professional: "bg-gold-50 text-gold-600",
        admin: "bg-slate-700 text-white",
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <div key={i} className="animate-shimmer h-16 rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-up">
            <div>
                <h1 className="font-display font-bold text-xl text-slate-800">Users Management</h1>
                <p className="text-sm text-slate-500 mt-1">{users.length} total users</p>
            </div>

            {/* Action message */}
            {actionMsg && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm animate-fade-up ${actionMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                    {actionMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {actionMsg.text}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-primary-400 transition-colors"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-shrink-0">
                    {["all", "patient", "doctor", "professional"].map(f => (
                        <button
                            key={f}
                            onClick={() => setRoleFilter(f)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${roleFilter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <div className="card text-center py-10">
                    <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No users found</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">User</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Email</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Role</th>
                                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Joined</th>
                                    <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => (
                                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-primary-700 text-[10px] font-bold uppercase">{u.name?.[0] || "U"}</span>
                                                </div>
                                                <span className="font-medium text-slate-700 truncate max-w-[140px]">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 truncate max-w-[180px]">{u.email}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={u.role}
                                                onChange={e => handleRoleChange(u.id, e.target.value)}
                                                className={`badge cursor-pointer border-0 ${roleBg[u.role] || "bg-slate-50 text-slate-500"}`}
                                            >
                                                <option value="patient">Patient</option>
                                                <option value="doctor">Doctor</option>
                                                <option value="professional">Professional</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                                                title="Delete user"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
