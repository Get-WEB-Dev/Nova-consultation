"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell, MessageCircle, ShieldCheck, CheckCheck, BellRing, Users, Zap,
  Bookmark, CheckCircle2, Activity, Calendar,
} from "lucide-react";
import { startPolling } from "@/lib/polling";
import { notifyError } from "@/lib/auth-fetch";
import { PageHeader, Card, EmptyState, ErrorState, SkeletonRows, Chip, ACCENT, timeAgo, dayGroup } from "@/components/doctor/ui";

interface Notification {
  id: string; type: string; title: string; message: string | null;
  read: boolean; action_url?: string | null; created_at: string;
}

const TYPE_META: Record<string, { icon: any; color: string; bg: string }> = {
  doctor_available: { icon: Zap, color: "#16a34a", bg: "#f0fdf4" },
  queue_called: { icon: Users, color: "#d97706", bg: "#fffbeb" },
  follow_up: { icon: BellRing, color: ACCENT, bg: "#eff6ff" },
  consultation_complete: { icon: CheckCircle2, color: "#0891b2", bg: "#ecfeff" },
  saved_doctor_online: { icon: Bookmark, color: "#e11d48", bg: "#fff1f2" },
  chat: { icon: MessageCircle, color: ACCENT, bg: "#eff6ff" },
  system: { icon: ShieldCheck, color: "#64748b", bg: "#f8fafc" },
  new_consultation: { icon: Activity, color: "#d97706", bg: "#fffbeb" },
  appointment: { icon: Calendar, color: "#7c3aed", bg: "#f5f3ff" },
};
const CONSULT_TYPES = ["queue_called", "new_consultation", "follow_up", "consultation_complete"];
type Tab = "all" | "unread" | "consult" | "chat" | "system";

export default function DoctorNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not load notifications");
      setItems(json.data ?? []);
      setError(null);
    } catch (e: any) {
      if (!quiet) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return startPolling(() => load(true), 30000); // quiet background refresh
  }, [load]);

  // Optimistic update with rollback if the server says no
  const patch = async (body: object, optimistic: (n: Notification) => Notification) => {
    const before = items;
    setItems((prev) => prev.map(optimistic));
    try {
      const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
    } catch {
      setItems(before);
      notifyError("Couldn't update the notification. Please try again.");
    }
  };
  const markRead = (id: string) => patch({ notifId: id }, (n) => (n.id === id ? { ...n, read: true } : n));
  const markAll = () => patch({ markAll: true }, (n) => ({ ...n, read: true }));

  const unread = items.filter((n) => !n.read).length;
  const counts = useMemo(() => ({
    all: items.length,
    unread,
    consult: items.filter((n) => CONSULT_TYPES.includes(n.type)).length,
    chat: items.filter((n) => n.type === "chat").length,
    system: items.filter((n) => n.type === "system").length,
  }), [items, unread]);

  const filtered = items.filter((n) =>
    tab === "all" ? true : tab === "unread" ? !n.read : tab === "consult" ? CONSULT_TYPES.includes(n.type) : n.type === tab);

  const groups = (["Today", "Yesterday", "Earlier"] as const)
    .map((g) => ({ label: g, rows: filtered.filter((n) => dayGroup(n.created_at) === g) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-4 max-w-2xl pb-10">
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        right={unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 hover:bg-slate-50">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      />

      <div className="flex gap-2 flex-wrap">
        <Chip active={tab === "all"} onClick={() => setTab("all")} count={counts.all}>All</Chip>
        <Chip active={tab === "unread"} onClick={() => setTab("unread")} count={counts.unread}>Unread</Chip>
        <Chip active={tab === "consult"} onClick={() => setTab("consult")} count={counts.consult}>Consults</Chip>
        <Chip active={tab === "chat"} onClick={() => setTab("chat")} count={counts.chat}>Messages</Chip>
        <Chip active={tab === "system"} onClick={() => setTab("system")} count={counts.system}>System</Chip>
      </div>

      {loading ? <SkeletonRows count={5} height="h-20" />
        : error ? <ErrorState message={error} onRetry={() => load()} />
          : filtered.length === 0 ? (
            <EmptyState icon={Bell}
              title={tab === "unread" ? "No unread notifications" : "Nothing here yet"}
              text={tab === "all" ? "New patients, messages and follow-up reminders will show up here." : "Try a different filter."} />
          ) : (
            <div className="space-y-5">
              {groups.map((g) => (
                <section key={g.label}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">{g.label}</p>
                  <div className="space-y-2">
                    {g.rows.map((n) => {
                      const meta = TYPE_META[n.type] ?? TYPE_META.system;
                      const Icon = meta.icon;
                      // Only link inside the doctor portal (some stored links point to pages that don't exist)
                      const href = n.action_url && n.action_url.startsWith("/doctor-dashboard") ? n.action_url : null;
                      const body = (
                        <Card className={`p-3.5 flex items-start gap-3 transition-all ${n.read ? "" : "border-blue-200 bg-blue-50/40"} ${href ? "hover:shadow-md" : ""}`}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                            <Icon className="w-[18px] h-[18px]" style={{ color: meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-[13px] leading-snug ${n.read ? "font-semibold text-slate-700" : "font-extrabold text-slate-900"}`}>{n.title}</p>
                              <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                            </div>
                            {n.message && <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>}
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: ACCENT }} aria-label="Unread" />}
                        </Card>
                      );
                      return href
                        ? <Link key={n.id} href={href} onClick={() => !n.read && markRead(n.id)} className="block">{body}</Link>
                        : <div key={n.id} onClick={() => !n.read && markRead(n.id)} className={n.read ? "" : "cursor-pointer"}>{body}</div>;
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
    </div>
  );
}