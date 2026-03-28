"use client";

import { useEffect, useState, useCallback } from "react";
import { getUser, loadUser } from "@/lib/supabase/auth";
import Link from "next/link";
import {
  Bell, Video, MessageCircle, ShieldCheck, CheckCheck,
  BellRing, Users, Zap, Loader2, Bookmark, CheckCircle2,
  Activity, Calendar,
} from "lucide-react";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

interface Notification {
  id: string; type: string; title: string; message: string;
  read: boolean; doctor_name?: string; action_url?: string; created_at: string;
}

const TYPE_META: Record<string, { icon: any; color: string; bg: string }> = {
  doctor_available:      { icon: Zap,          color: "#16a34a", bg: "#f0fdf4" },
  queue_called:          { icon: Users,         color: "#d97706", bg: "#fffbeb" },
  follow_up:             { icon: BellRing,      color: ACCENT,    bg: "#eff6ff" },
  consultation_complete: { icon: CheckCircle2,  color: "#0891b2", bg: "#ecfeff" },
  saved_doctor_online:   { icon: Bookmark,      color: "#e11d48", bg: "#fff1f2" },
  chat:                  { icon: MessageCircle, color: ACCENT,    bg: "#eff6ff" },
  system:                { icon: ShieldCheck,   color: "#64748b", bg: "#f8fafc" },
  new_consultation:      { icon: Activity,      color: "#d97706", bg: "#fffbeb" },
  appointment:           { icon: Calendar,      color: "#7c3aed", bg: "#f5f3ff" },
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
    await fetch("/api/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifId: id }),
    }).catch(() => {});
  };

  const markAll = async () => {
    const u = getUser(); if (!u) return;
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, markAll: true }),
    }).catch(() => {});
  };

  const TABS = [
    { key: "all",          label: "All"      },
    { key: "consultation", label: "Consults" },
    { key: "chat",         label: "Messages" },
    { key: "system",       label: "System"   },
  ];

  const filtered = tab === "all" ? notifs
    : tab === "consultation" ? notifs.filter(n => ["queue_called", "new_consultation", "follow_up", "consultation_complete"].includes(n.type))
    : tab === "chat"         ? notifs.filter(n => n.type === "chat")
    : notifs.filter(n => n.type === "system");

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="space-y-4 max-w-2xl pb-10">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-extrabold text-slate-900 text-[18px] sm:text-[20px]">Notifications</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {unread > 0 ? `${unread} unread` : "All caught up ✓"}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAll}
            className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
            style={{ color: ACCENT }}>
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="flex border-b border-slate-100">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex-1 py-3 text-[13px] font-bold transition-all border-b-2 whitespace-nowrap"
              style={tab === key
                ? { color: NAV_BG, borderBottomColor: NAV_BG, background: "#eff6ff" }
                : { color: "#94a3b8", borderBottomColor: "transparent" }}>
              {label}
              {key === "all" && unread > 0 && (
                <span className="ml-1 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: "#ef4444" }}>{unread}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: ACCENT }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "#eff6ff" }}>
              <Bell className="w-5 h-5" style={{ color: ACCENT }} />
            </div>
            <p className="font-bold text-slate-600">No notifications here</p>
            <p className="text-[12px] text-slate-400 mt-1">You're all caught up</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(n => {
              const meta = TYPE_META[n.type] || TYPE_META.system;
              const Icon = meta.icon;
              const Wrap: any = n.action_url ? Link : "div";
              return (
                <Wrap key={n.id} href={n.action_url || ""} onClick={() => markRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? "bg-blue-50/40" : ""}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: meta.bg }}>
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] leading-snug ${!n.read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: ACCENT }} />}
                </Wrap>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
