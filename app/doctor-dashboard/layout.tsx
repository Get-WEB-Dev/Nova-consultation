"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home,
  MessageSquare,
  BookOpen,
  GitFork,
  Clock,
  Bell,
  LogOut,
  Settings,
  User,
  CalendarDays,
  X,
  Stethoscope,
  Check,
  Heart,
  Star,
  FileText,
  AlarmClock,
  Zap,
  Video,
  Loader2,
  Menu,
  ChevronRight,
} from "lucide-react";
import { loadUser, signOut, type AuthUser } from "@/lib/supabase/auth";
import {
  subscribeToNotifications,
  initPresence,
} from "@/lib/realtime/subscriptions";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#003580";
const NAV_DARK = "#00224f";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

interface DoctorMeta {
  avatar?: string;
  specialty?: string;
  bio?: string;
  status?: string;
  hospital?: string;
}
interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

const NAV = [
  { href: "/doctor-dashboard", label: "Home", icon: Home, exact: true },
  {
    href: "/doctor-dashboard/doctors",
    label: "Doctors",
    icon: User,
    exact: false,
  },

  {
    href: "/doctor-dashboard/messages",
    label: "Messages",
    icon: MessageSquare,
    exact: false,
  },
  {
    href: "/doctor-dashboard/feed",
    label: "Blogs",
    icon: BookOpen,
    exact: false,
  },
  {
    href: "/doctor-dashboard/followups",
    label: "Follow Ups",
    icon: GitFork,
    exact: false,
  },
  {
    href: "/doctor-dashboard/history",
    label: "History",
    icon: Clock,
    exact: false,
  },
];

const MGMT = [
  { href: "/doctor-dashboard/profile", label: "Update Profile", icon: User },
  { href: "/doctor-dashboard/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/doctor-dashboard/settings", label: "Settings", icon: Settings },
];

const NOTIF_ICONS: Record<string, React.ElementType> = {
  message: MessageSquare,
  chat: MessageSquare,
  comment: Heart,
  review: Star,
  blog: FileText,
  reminder: AlarmClock,
  doctor_available: Zap,
  queue_called: Bell,
  follow_up: AlarmClock,
  consultation_complete: Video,
  saved_doctor_online: Star,
  system: Bell,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [meta, setMeta] = useState<DoctorMeta>({});
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const u = await loadUser();
      if (!u) {
        router.replace("/doctor-login");
        return;
      }
      if (u.role !== "doctor") {
        router.replace(u.role === "admin" ? "/admin-dashboard" : "/dashboard");
        return;
      }
      setUser(u);
      setReady(true);
      initPresence(u.id);
      try {
        const r = await fetch(`/api/doctor/profile?doctorId=${u.id}`);
        const j = await r.json();
        if (j.data)
          setMeta({
            avatar: j.data.avatar_url,
            specialty: j.data.specialty,
            bio: j.data.bio,
            status: j.data.status,
            hospital: j.data.hospital,
          });
      } catch { }
    })();
  }, [router]);

  const fetchNotifs = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/notifications?userId=${uid}`);
      const j = await res.json();
      if (j.data)
        setNotifs(
          j.data.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.message,
            time: n.created_at,
            read: n.read ?? false,
            actionUrl: n.action_url,
          })),
        );
    } catch { }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifs(user.id);
    const iv = setInterval(() => fetchNotifs(user.id), 30000);
    const unsub = subscribeToNotifications(user.id, (n) => {
      setNotifs((prev) => [
        {
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.message ?? "",
          time: n.created_at,
          read: false,
          actionUrl: n.action_url ?? undefined,
        },
        ...prev,
      ]);
    });
    return () => {
      clearInterval(iv);
      unsub();
    };
  }, [user, fetchNotifs]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const unread = notifs.filter((n) => !n.read).length;
  const isOnline = ["available", "in_consultation"].includes(meta.status || "");

  const markRead = async (id: string) => {
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifId: id }),
      });
    } catch { }
  };
  const markAllRead = async () => {
    if (!user) return;
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, markAll: true }),
      });
    } catch { }
  };

  if (pathname === "/doctor-dashboard/consult") return <>{children}</>;

  if (!ready)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#eef2f7" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: NAV_BG }}
          >
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: ACCENT, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );

  // ── Notification Panel ──────────────────────────────────────────────────────
  const NotifPanel = () => (
    <div
      ref={notifRef}
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-slate-200 z-50 overflow-hidden bg-white"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.14)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="font-extrabold text-slate-800 text-sm">
          Notifications{" "}
          {unread > 0 && (
            <span
              className="ml-1.5 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "#ef4444" }}
            >
              {unread}
            </span>
          )}
        </p>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-[11px] font-semibold"
            style={{ color: ACCENT }}
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Bell className="w-7 h-7 text-slate-200 mb-2" />
            <p className="text-xs text-slate-400">No notifications yet</p>
          </div>
        ) : (
          notifs.slice(0, 20).map((n) => {
            const Icon = NOTIF_ICONS[n.type] ?? Bell;
            const Wrapper: any = n.actionUrl ? Link : "button";
            return (
              <Wrapper
                key={n.id}
                href={n.actionUrl ?? ""}
                onClick={() => markRead(n.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left cursor-pointer ${!n.read ? "bg-blue-50/60" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.read ? "bg-blue-100" : "bg-slate-100"}`}
                >
                  <Icon
                    className={`w-4 h-4 ${!n.read ? "text-blue-600" : "text-slate-400"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-semibold ${!n.read ? "text-slate-800" : "text-slate-600"}`}
                  >
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {n.body}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {timeAgo(n.time)}
                  </p>
                </div>
                {!n.read && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                    style={{ background: ACCENT }}
                  />
                )}
              </Wrapper>
            );
          })
        )}
      </div>
      <div className="border-t border-slate-100 px-4 py-2.5">
        <Link
          href="/doctor-dashboard/notifications"
          onClick={() => setNotifOpen(false)}
          className="text-xs font-semibold"
          style={{ color: ACCENT }}
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );

  // ── Shared sidebar content ──────────────────────────────────────────────────
  const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* ── LinkedIn-style profile card ── */}
      <div className="flex-shrink-0">
        {/* Cover image */}
        <div
          className="relative h-24 sm:h-28"
          style={{
            background: `linear-gradient(135deg, ${NAV_BG} 0%, ${ACCENT} 60%, ${SKY} 100%)`,
          }}
        >
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Avatar — large, overlapping cover */}
        <div className="px-5 pb-4 -mt-10">
          <div
            className="relative w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-xl mb-3 flex-shrink-0"
            style={{
              background: "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)",
            }}
          >
            {meta.avatar ? (
              <Image
                src={meta.avatar}
                alt="Profile"
                fill
                className="object-cover object-top"
                unoptimized
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: NAV_BG }}
              >
                <span className="text-white font-extrabold text-2xl">
                  {user?.name?.[0]}
                </span>
              </div>
            )}
            {/* Status dot */}
            <span
              className={`absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? "bg-emerald-400" : "bg-slate-300"}`}
            />
          </div>

          {/* Name & specialty */}
          <p className="font-extrabold text-slate-900 text-[15px] leading-tight">
            Dr. {user?.name}
          </p>
          {meta.specialty && (
            <p
              className="text-[12px] font-semibold mt-0.5"
              style={{ color: ACCENT }}
            >
              {meta.specialty}
            </p>
          )}
          {meta.hospital && (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Stethoscope className="w-3 h-3 flex-shrink-0" /> {meta.hospital}
            </p>
          )}
          {meta.bio && (
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-3">
              {meta.bio}
            </p>
          )}

          {/* Status badge */}
          <div
            className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${isOnline ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
            />
            {isOnline ? "Online & Accepting" : "Currently Offline"}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 mx-4 flex-shrink-0" />

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={
                active
                  ? { background: NAV_BG, color: "white" }
                  : { color: "#475569" }
              }
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = "#f0f4f8";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = "";
              }}
            >
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={active ? { color: "white" } : { color: ACCENT }}
              />
              {label}
            </Link>
          );
        })}

        {/* Manage section */}
        <div className="pt-3 mt-1 border-t border-slate-100">
          <p className="text-[10px] font-extrabold uppercase tracking-widest px-3 mb-1.5 text-slate-400">
            Manage
          </p>
          {MGMT.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all"
                style={
                  active
                    ? { background: "#eff6ff", color: ACCENT }
                    : { color: "#64748b" }
                }
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "#f0f4f8";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "";
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-slate-400" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5 flex-shrink-0 border-t border-slate-100 pt-3">
        <button
          onClick={() => {
            if (onClose) onClose();
            signOut();
            router.push("/doctor-login");
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#eef2f7" }}>
      {/* ══ MOBILE ══════════════════════════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Mobile top bar */}
        <header
          style={{ background: NAV_BG, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
          className="sticky top-0 z-40"
        >
          <div className="flex items-center justify-between h-14 px-4">
            {/* Avatar button opens drawer */}
            <button
              onClick={() => setMobileOpen(true)}
              className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0"
            >
              {meta.avatar ? (
                <Image
                  src={meta.avatar}
                  alt="Profile"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: ACCENT }}
                >
                  <span className="text-white font-extrabold text-sm">
                    {user?.name?.[0]}
                  </span>
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? "bg-emerald-400" : "bg-slate-400"}`}
              />
            </button>

            <span className="font-extrabold text-white text-base">
              MediBook
            </span>

            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-xl text-white/80"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {notifOpen && <NotifPanel />}
            </div>
          </div>
        </header>

        <main className="pb-24 px-3 py-4">{children}</main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white"
          style={{
            paddingBottom: "env(safe-area-inset-bottom)",
            boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div className="flex items-center justify-around px-1 py-1.5">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all"
                  style={{ color: active ? NAV_BG : "#94a3b8" }}
                >
                  {active && (
                    <div
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "#eff6ff" }}
                    />
                  )}
                  <Icon
                    className="w-5 h-5 relative z-10"
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span className="relative z-10 text-[10px] font-semibold whitespace-nowrap">
                    {label === "Follow Ups" ? "Follows" : label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile sidebar drawer */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              className="fixed top-0 left-0 h-full w-72 bg-white z-50 overflow-hidden"
              style={{ boxShadow: "8px 0 40px rgba(0,0,0,0.2)" }}
            >
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </aside>
          </>
        )}
      </div>

      {/* ══ DESKTOP & TABLET ════════════════════════════════════════════════ */}
      <div className="hidden md:flex min-h-screen">
        {/* Desktop sidebar — fixed, LinkedIn style */}
        <aside
          className="fixed top-0 left-0 h-full w-56 lg:w-64 xl:w-72 border-r border-slate-200 bg-white z-40 overflow-hidden"
          style={{ boxShadow: "2px 0 12px rgba(0,0,0,0.05)" }}
        >
          <SidebarContent />
        </aside>

        {/* Desktop main */}
        <div className="flex-1 min-h-screen ml-56 lg:ml-64 xl:ml-72">
          {/* Desktop top bar */}
          <header
            className="sticky top-0 z-30 border-b border-slate-200 bg-white flex items-center justify-between h-14 px-6"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: NAV_BG }}
              >
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <div>
                <p
                  className="font-extrabold text-[13px] leading-none"
                  style={{ color: NAV_BG }}
                >
                  MediBook
                </p>
                <p
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: ACCENT }}
                >
                  Doctor Portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <Bell className="w-5 h-5 text-slate-500" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
                {notifOpen && <NotifPanel />}
              </div>
              {/* Sign out */}
              <button
                onClick={() => {
                  signOut();
                  router.push("/doctor-login");
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:block">Sign Out</span>
              </button>
            </div>
          </header>

          <main className="px-5 xl:px-8 py-6 max-w-4xl">{children}</main>
        </div>
      </div>
    </div>
  );
}
