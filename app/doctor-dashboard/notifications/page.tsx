"use client";

import { useEffect, useState, useCallback } from "react";
import { getUser, loadUser } from "@/lib/supabase/auth";
import Link from "next/link";
import {
    Bell, Video, MessageCircle, ShieldCheck, CheckCheck,
    BellRing, Users, Zap, Loader2, Bookmark, CheckCircle2,
    Activity, Calendar,
} from "lucide-react";

interface Notification { id: string; type: string; title: string; message: string; read: boolean; doctor_name?: string; action_url?: string; created_at: string; }

const TYPE_META: Record<string, { icon: any; color: string; bg: string }> = {
    doctor_available: { icon: Zap, color: "text-emerald-600", bg: "bg-emerald-50" },
    queue_called: { icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
    follow_up: { icon: BellRing, color: "text-primary-600", bg: "bg-primary-50" },
    consultation_complete: { icon: CheckCircle2, color: "text-accent-600", bg: "bg-accent-50" },
    saved_doctor_online: { icon: Bookmark, color: "text-rose-500", bg: "bg-rose-50" },
    chat: { icon: MessageCircle, color: "text-primary-600", bg: "bg-primary-50" },
    system: { icon: ShieldCheck, color: "text-slate-500", bg: "bg-slate-100" },
    new_consultation: { icon: Activity, color: "text-amber-600", bg: "bg-amber-50" },
    appointment: { icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
};

function timeAgo(d: string) {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function DoctorNotificationsPage() {
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("all");

    const load = useCallback(async () => {
        let u = getUser();
        if (!u) u = await loadUser();
        if (!u) { setLoading(false); return; }
        try {
            const res = await fetch(`/api/notifications?userId=${u.id}`);
            const json = await res.json();
            setNotifs(json.data || []);
        } catch { setNotifs([]); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const markRead = async (id: string) => {
        setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notifId: id }) }).catch(() => {});
    };

    const markAll = async () => {
        const u = getUser();
        if (!u) return;
        setNotifs(prev => prev.map(n => ({ ...n, read: true })));
        await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: u.id, markAll: true }) }).catch(() => {});
    };

    const TABS = [
        { key: "all", label: "All" },
        { key: "consultation", label: "Consults" },
        { key: "chat", label: "Messages" },
        { key: "system", label: "System" },
    ];

    const filtered = tab === "all" ? notifs
        : tab === "consultation" ? notifs.filter(n => ["queue_called", "new_consultation", "follow_up", "consultation_complete"].includes(n.type))
        : tab === "chat" ? notifs.filter(n => n.type === "chat")
        : notifs.filter(n => n.type === "system");

    const unread = notifs.filter(n => !n.read).length;

    return (
        <div className="space-y-4 animate-fade-up max-w-2xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display font-bold text-xl text-slate-800">Notifications</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{unread > 0 ? `${unread} unread` : "All caught up"}</p>
                </div>
                {unread > 0 && (
                    <button onClick={markAll} className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 px-3 py-2 rounded-xl hover:bg-primary-50 transition-all">
                        <CheckCheck className="w-4 h-4" /> Mark all read
                    </button>
                )}
            </div>

            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
                {TABS.map(({ key, label }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${tab === key ? "bg-white text-primary-700 shadow-sm" : "text-slate-500"}`}>
                        {label}
                        {key === "all" && unread > 0 && <span className="ml-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-primary-400 animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
                    <Bell className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">No notifications here</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(n => {
                        const meta = TYPE_META[n.type] || TYPE_META.system;
                        const Icon = meta.icon;
                        const Wrap: any = n.action_url ? Link : "div";
                        return (
                            <Wrap key={n.id} href={n.action_url || ""} onClick={() => markRead(n.id)}
                                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-sm
                                    ${!n.read ? "bg-primary-50/50 border-primary-100" : "bg-white border-slate-100"}`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                                    <Icon className={`w-5 h-5 ${meta.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-slate-800" : "font-medium text-slate-700"}`}>{n.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                    <p className="text-[10px] text-slate-400 mt-1.5">{timeAgo(n.created_at)}</p>
                                </div>
                                {!n.read && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
                            </Wrap>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
