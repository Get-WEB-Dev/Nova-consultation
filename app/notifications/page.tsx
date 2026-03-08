"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell, Video, MessageCircle, ShieldCheck,
  CheckCheck, Bookmark, BellRing, Users, Zap, Loader2,
} from "lucide-react";
import type { Notification, NotificationType } from "@/lib/types";
import { getUser, loadUser } from "@/lib/supabase/auth";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";

// ── MOCK NOTIFICATIONS (disabled) ────────────────────────────
// const MOCK_NOTIFICATIONS: Notification[] = [
//   { id: "n1", type: "doctor_available", title: "Dr. Sarah Johnson is now available", ... },
//   ... (see git history to restore)
// ];
// ─────────────────────────────────────────────────────────────

type TabKey = "all" | "doctor_available" | "follow_up" | "chat" | "system";

const TABS: { key: TabKey; label: string; icon: typeof Bell }[] = [
  { key: "all",              label: "All",         icon: Bell          },
  { key: "doctor_available", label: "Availability", icon: Zap           },
  { key: "follow_up",        label: "Follow-ups",  icon: BellRing      },
  { key: "chat",             label: "Chat",        icon: MessageCircle },
  { key: "system",           label: "System",      icon: ShieldCheck   },
];

const TYPE_ICONS: Record<string, typeof Bell> = {
  doctor_available:      Zap,
  queue_called:          Users,
  follow_up:             BellRing,
  consultation_complete: Video,
  saved_doctor_online:   Bookmark,
  chat:                  MessageCircle,
  system:                ShieldCheck,
};

const TYPE_COLORS: Record<string, string> = {
  doctor_available:      "bg-emerald-100 text-emerald-600",
  queue_called:          "bg-gold-100 text-gold-600",
  follow_up:             "bg-primary-100 text-primary-600",
  consultation_complete: "bg-accent-100 text-accent-600",
  saved_doctor_online:   "bg-rose-100 text-rose-500",
  chat:                  "bg-accent-100 text-accent-600",
  system:                "bg-slate-100 text-slate-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Shape a raw DB notification row → Notification frontend type
function mapNotification(row: any): Notification {
  return {
    id:           row.id,
    type:         row.type as NotificationType,
    title:        row.title,
    message:      row.message,
    read:         row.read ?? false,
    doctorName:   row.doctor_name   ?? undefined,
    doctorAvatar: row.doctor_avatar ?? undefined,
    actionUrl:    row.action_url    ?? undefined,
    created_at:   row.created_at,
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const loadNotifs = useCallback(async () => {
    setLoading(true);
    try {
      let user = getUser();
      if (!user) user = await loadUser();
      if (!user) { setLoading(false); return; }
      const raw = await getNotifications(user.id);
      setNotifications(raw.map(mapNotification));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifs();
    const handler = () => loadNotifs();
    window.addEventListener("hc-auth-change", handler);
    return () => window.removeEventListener("hc-auth-change", handler);
  }, [loadNotifs]);

  const filtered =
    activeTab === "all"
      ? notifications
      : activeTab === "system"
        ? notifications.filter((n) => n.type === "system" || n.type === "consultation_complete")
        : notifications.filter((n) =>
            n.type === activeTab ||
            (n.type === "queue_called" && activeTab === "doctor_available") ||
            (n.type === "saved_doctor_online" && activeTab === "doctor_available")
          );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    const user = getUser();
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead(user.id);
  };

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead(id);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-ghost text-sm text-primary-600 flex items-center gap-1.5">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-100 gap-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === key
                ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
          <p className="text-sm text-slate-500">Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm text-slate-500">No notifications in this category</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const NIcon = TYPE_ICONS[notif.type] || Bell;
            const colorClass = TYPE_COLORS[notif.type] || "bg-slate-100 text-slate-500";
            const Wrapper = notif.actionUrl ? Link : ("div" as any);
            return (
              <Wrapper
                key={notif.id}
                href={notif.actionUrl || ""}
                onClick={() => handleMarkRead(notif.id)}
                className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 transition-all hover:shadow-md cursor-pointer ${
                  !notif.read ? "border-l-4 border-l-primary-500 border-slate-100" : "border-slate-100"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <NIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight ${!notif.read ? "font-semibold text-slate-800" : "font-medium text-slate-600"}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">{timeAgo(notif.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                  {notif.doctorName && (
                    <div className="flex items-center gap-2 mt-2">
                      {notif.doctorAvatar && (
                        <div className="relative w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                          <Image src={notif.doctorAvatar} alt="" fill className="object-cover" unoptimized />
                        </div>
                      )}
                      <span className="text-xs text-primary-600 font-medium">{notif.doctorName}</span>
                    </div>
                  )}
                </div>
                {!notif.read && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}
