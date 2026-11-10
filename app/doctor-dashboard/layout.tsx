"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home, MessageSquare, BookOpen, CalendarCheck, Clock, Bell, LogOut, Settings, User, Users,
  CalendarDays, X, Stethoscope, Heart, Star, FileText, AlarmClock, Zap, Video, BarChart3,
  PanelLeftClose, PanelLeftOpen, MoreHorizontal, ChevronDown,
} from "lucide-react";
import { startPolling } from "@/lib/polling";
import { loadUser, signOut, type AuthUser } from "@/lib/supabase/auth";
import { subscribeToNotifications, initPresence } from "@/lib/realtime/subscriptions";
import VerificationBanner from "@/components/doctor/VerificationBanner";
import { Avatar, NAV_BG, NAV_DARK, ACCENT, TEAL, timeAgo } from "@/components/doctor/ui";

// ── Navigation ────────────────────────────────────────────────
interface NavItem { href: string; label: string; icon: React.ElementType; exact?: boolean }

const NAV: NavItem[] = [
  { href: "/doctor-dashboard", label: "Home", icon: Home, exact: true },
  { href: "/doctor-dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/doctor-dashboard/patients", label: "Patients", icon: Users },
  { href: "/doctor-dashboard/followups", label: "Follow-ups", icon: CalendarCheck },
  { href: "/doctor-dashboard/history", label: "History", icon: Clock },
  { href: "/doctor-dashboard/feed", label: "Blogs", icon: BookOpen },
  { href: "/doctor-dashboard/doctors", label: "Doctors", icon: Stethoscope },
];
const MANAGE: NavItem[] = [
  { href: "/doctor-dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/doctor-dashboard/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/doctor-dashboard/profile", label: "My Profile", icon: User },
  { href: "/doctor-dashboard/settings", label: "Settings", icon: Settings },
];
// The four tabs on the phone's bottom bar (the 5th, "More", opens the full menu)
const MOBILE_TABS = [NAV[0], NAV[1], NAV[3], NAV[4]];

const TITLES: [string, string][] = [
  ["/doctor-dashboard/messages", "Messages"], ["/doctor-dashboard/patients", "Patients"],
  ["/doctor-dashboard/followups", "Follow-ups"], ["/doctor-dashboard/history", "History"],
  ["/doctor-dashboard/feed", "Blogs"], ["/doctor-dashboard/doctors", "Doctors"],
  ["/doctor-dashboard/analytics", "Analytics"], ["/doctor-dashboard/schedule", "Schedule"],
  ["/doctor-dashboard/profile", "My Profile"], ["/doctor-dashboard/settings", "Settings"],
  ["/doctor-dashboard/notifications", "Notifications"],
];
const titleFor = (path: string) => TITLES.find(([p]) => path === p || path.startsWith(p + "/"))?.[1] ?? "Dashboard";

const NOTIF_ICONS: Record<string, React.ElementType> = {
  message: MessageSquare, chat: MessageSquare, comment: Heart, review: Star, blog: FileText,
  reminder: AlarmClock, doctor_available: Zap, queue_called: Bell, follow_up: AlarmClock,
  consultation_complete: Video, saved_doctor_online: Star, system: Bell,
};

interface DoctorMeta { avatar?: string; specialty?: string; status?: string; hospital?: string }
interface NotifItem { id: string; type: string; title: string; body: string; time: string; read: boolean; actionUrl?: string }

const isActive = (pathname: string, item: NavItem) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

// ── Notification bell + dropdown ──────────────────────────────
function NotifBell({ notifs, onMarkRead, onMarkAll, dark = false }: {
  notifs: NotifItem[]; onMarkRead: (id: string) => void; onMarkAll: () => void; dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${dark ? "text-white/85 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100"}`}
      >
        <Bell className="w-5 h-5" strokeWidth={1.9} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl border border-slate-200 bg-white z-50 overflow-hidden shadow-float animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-display font-bold text-slate-800 text-sm">Notifications</p>
            {unread > 0 && (
              <button onClick={onMarkAll} className="text-[12px] font-semibold hover:underline" style={{ color: ACCENT }}>Mark all read</button>
            )}
          </div>
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center py-10">
                <Bell className="w-7 h-7 text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">No notifications yet</p>
              </div>
            ) : notifs.slice(0, 15).map((n) => {
              const Icon = NOTIF_ICONS[n.type] ?? Bell;
              const href = n.actionUrl?.startsWith("/doctor-dashboard") ? n.actionUrl : null;
              const inner = (
                <>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.read ? "bg-slate-100" : "bg-teal-50"}`}>
                    <Icon className="w-4 h-4" style={{ color: n.read ? "#94a3b8" : ACCENT }} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-[13px] leading-snug ${n.read ? "font-medium text-slate-600" : "font-bold text-slate-900"}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-slate-400 line-clamp-1">{n.body}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.time)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TEAL }} />}
                </>
              );
              const cls = "w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors";
              return href
                ? <Link key={n.id} href={href} onClick={() => { onMarkRead(n.id); setOpen(false); }} className={cls}>{inner}</Link>
                : <button key={n.id} onClick={() => onMarkRead(n.id)} className={cls}>{inner}</button>;
            })}
          </div>
          <Link href="/doctor-dashboard/notifications" onClick={() => setOpen(false)}
            className="block text-center border-t border-slate-100 px-4 py-3 text-[12px] font-bold hover:bg-slate-50" style={{ color: ACCENT }}>
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Profile dropdown (desktop/tablet) ─────────────────────────
function UserMenu({ user, meta, onSignOut }: { user: AuthUser | null; meta: DoctorMeta; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const name = user?.name ?? "Doctor";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu"
        className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
        <Avatar name={name} src={meta.avatar} size={32} />
        <div className="hidden xl:block text-left leading-tight">
          <p className="text-[13px] font-bold text-slate-800">Dr. {name}</p>
          <p className="text-[11px] text-slate-400">{meta.specialty || "Physician"}</p>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white z-50 p-1.5 shadow-float animate-fade-in">
          {[{ href: "/doctor-dashboard/profile", label: "My Profile", icon: User }, { href: "/doctor-dashboard/settings", label: "Settings", icon: Settings }].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-50">
              <Icon className="w-4 h-4 text-slate-400" /> {label}
            </Link>
          ))}
          <div className="h-px bg-slate-100 my-1" />
          <button role="menuitem" onClick={onSignOut} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-rose-600 hover:bg-rose-50">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sidebar (desktop rail/full + phone drawer) ────────────────
function SidebarContent({ pathname, user, meta, isOnline, collapsed, onClose, onSignOut }: {
  pathname: string; user: AuthUser | null; meta: DoctorMeta; isOnline: boolean;
  collapsed: boolean; onClose?: () => void; onSignOut: () => void;
}) {
  const drawer = !!onClose;                       // the phone drawer always shows labels
  const labelCls = drawer ? "" : collapsed ? "hidden" : "hidden lg:inline";
  const itemAlign = drawer ? "justify-start" : collapsed ? "justify-center" : "justify-center lg:justify-start";
  const showProfile = drawer ? "block" : collapsed ? "hidden" : "hidden lg:block";
  const name = user?.name ?? "Doctor";

  const renderLink = ({ href, label, icon: Icon, exact }: NavItem) => {
    const active = isActive(pathname, { href, label, icon: Icon, exact });
    return (
      <Link key={href} href={href} onClick={onClose} title={label} aria-current={active ? "page" : undefined}
        className={`group relative flex items-center ${itemAlign} gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 ${active ? "bg-white/[0.12] text-white" : "text-slate-300/90 hover:bg-white/[0.07] hover:text-white"}`}>
        {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: TEAL }} />}
        <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} style={active ? { color: TEAL } : undefined} />
        <span className={labelCls}>{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full text-white" style={{ background: `linear-gradient(185deg, ${NAV_DARK} 0%, ${NAV_BG} 100%)` }}>
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 h-16 shrink-0 ${drawer ? "" : collapsed ? "justify-center" : "justify-center lg:justify-start"}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${TEAL}, ${ACCENT})`, boxShadow: "0 4px 14px rgba(12,188,173,0.35)" }}>
          <Stethoscope className="w-[18px] h-[18px] text-white" />
        </div>
        <div className={`leading-none ${labelCls}`}>
          <p className="font-display font-extrabold text-[15px] tracking-tight">Nova Health</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] mt-1" style={{ color: TEAL }}>Doctor Portal</p>
        </div>
        {drawer && (
          <button onClick={onClose} aria-label="Close menu" className="ml-auto w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/15">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Profile */}
      <div className="px-3 pb-3 shrink-0">
        <div className={`rounded-2xl bg-white/[0.06] border border-white/10 ${drawer ? "p-3" : collapsed ? "p-1.5" : "p-1.5 lg:p-3"}`}>
          <div className={`flex items-center gap-3 ${drawer ? "" : "justify-center lg:justify-start"}`}>
            <div className="relative shrink-0">
              <Avatar name={name} src={meta.avatar} size={drawer ? 44 : 38} />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isOnline ? "bg-emerald-400" : "bg-slate-400"}`} style={{ borderColor: NAV_DARK }} />
            </div>
            <div className={`min-w-0 ${showProfile}`}>
              <p className="font-display font-bold text-[14px] leading-tight truncate">Dr. {name}</p>
              <p className="text-[11.5px] text-slate-300/80 truncate">{meta.specialty || "Physician"}</p>
            </div>
          </div>
          <div className={`mt-2.5 ${showProfile}`}>
            <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-1 rounded-full ${isOnline ? "bg-emerald-400/[0.15] text-emerald-300" : "bg-white/10 text-slate-300"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-400"}`} />
              {isOnline ? "Online · accepting patients" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* Links */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 space-y-0.5" aria-label="Main">
        {NAV.map(renderLink)}
        <p className={`px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400/80 ${labelCls}`}>Manage</p>
        {!drawer && collapsed && <div className="h-px bg-white/10 my-3" />}
        {!drawer && !collapsed && <div className="h-px bg-white/10 my-3 lg:hidden" />}
        {MANAGE.map(renderLink)}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <button onClick={onSignOut} title="Sign out"
          className={`w-full flex items-center ${itemAlign} gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium text-slate-300/90 hover:bg-rose-500/[0.15] hover:text-rose-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400`}>
          <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
          <span className={labelCls}>Sign out</span>
        </button>
      </div>
    </div>
  );
}

// ── The shell ─────────────────────────────────────────────────
export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [meta, setMeta] = useState<DoctorMeta>({});
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);

  // Auth guard + profile
  useEffect(() => {
    (async () => {
      const u = await loadUser();
      if (!u) { router.replace("/doctor-login"); return; }
      if (u.role !== "doctor") { router.replace(u.role === "admin" ? "/admin-dashboard" : "/dashboard"); return; }
      setUser(u);
      setReady(true);
      initPresence(u.id);
      try {
        const r = await fetch(`/api/doctor/profile?doctorId=${u.id}`);
        const j = await r.json();
        if (j.data) setMeta({ avatar: j.data.avatar_url, specialty: j.data.specialty, status: j.data.status, hospital: j.data.hospital });
      } catch { /* the shell works without the profile */ }
    })();
  }, [router]);

  // The home page announces online/offline changes so the sidebar stays truthful
  useEffect(() => {
    const onStatus = (e: Event) => {
      const status = (e as CustomEvent).detail?.status as string | undefined;
      if (status) setMeta((m) => ({ ...m, status }));
    };
    window.addEventListener("nova:doctor-status", onStatus);
    return () => window.removeEventListener("nova:doctor-status", onStatus);
  }, []);

  // Notifications: realtime + a gentle poll as a safety net
  const fetchNotifs = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`/api/notifications?userId=${uid}`);
      const j = await res.json();
      if (j.data) {
        setNotifs(j.data.map((n: any) => ({
          id: n.id, type: n.type, title: n.title, body: n.message ?? "",
          time: n.created_at, read: n.read ?? false, actionUrl: n.action_url ?? undefined,
        })));
      }
    } catch { /* retried on the next tick */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifs(user.id);
    const stopPolling = startPolling(() => fetchNotifs(user.id), 30000);
    const unsub = subscribeToNotifications(user.id, (n) => {
      setNotifs((prev) => [{ id: n.id, type: n.type, title: n.title, body: n.message ?? "", time: n.created_at, read: false, actionUrl: n.action_url ?? undefined }, ...prev]);
    });
    return () => { stopPolling(); unsub(); };
  }, [user, fetchNotifs]);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const markRead = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notifId: id }) });
    } catch { /* cosmetic */ }
  };
  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAll: true }) });
    } catch { /* cosmetic */ }
  };
  const handleSignOut = async () => { await signOut(); router.push("/doctor-login"); };

  const isOnline = ["available", "in_consultation"].includes(meta.status || "");

  // The live consultation screen is full-screen (no shell)
  if (pathname === "/doctor-dashboard/consult") return <>{children}</>;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6fa]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAV_BG}, ${ACCENT})`, boxShadow: "0 10px 30px rgba(26,53,88,0.25)" }}>
            <Stethoscope className="w-7 h-7 text-white" />
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: TEAL, animationDelay: `${i * 0.15}s` }} />)}
          </div>
        </div>
      </div>
    );
  }

  const title = titleFor(pathname);
  const sidebarW = collapsed ? "md:w-[76px]" : "md:w-[76px] lg:w-[268px]";
  const contentML = collapsed ? "md:ml-[76px]" : "md:ml-[76px] lg:ml-[268px]";

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-white focus:text-slate-800 focus:shadow-lg">
        Skip to content
      </a>

      {/* ── Sidebar: icon rail on tablets, full on desktops ── */}
      <aside className={`hidden md:block fixed top-0 left-0 h-full ${sidebarW} z-40 transition-[width] duration-300`} style={{ boxShadow: "4px 0 24px rgba(16,36,63,0.12)" }}>
        <SidebarContent pathname={pathname} user={user} meta={meta} isOnline={isOnline} collapsed={collapsed} onSignOut={handleSignOut} />
      </aside>

      {/* ── Phone drawer ── */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute top-0 left-0 h-full w-[300px] max-w-[85vw] animate-slide-up shadow-float" role="dialog" aria-label="Menu">
            <SidebarContent pathname={pathname} user={user} meta={meta} isOnline={isOnline} collapsed={false} onClose={() => setDrawerOpen(false)} onSignOut={handleSignOut} />
          </aside>
        </div>
      )}

      <div className={`${contentML} min-h-screen flex flex-col transition-[margin] duration-300`}>
        {/* ── Top bar: phones ── */}
        <header className="md:hidden sticky top-0 z-30 h-14 px-3 flex items-center justify-between text-white" style={{ background: `linear-gradient(90deg, ${NAV_DARK}, ${NAV_BG})`, boxShadow: "0 2px 12px rgba(16,36,63,0.25)" }}>
          <button onClick={() => setDrawerOpen(true)} aria-label="Open menu" className="relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
            <Avatar name={user?.name ?? "D"} src={meta.avatar} size={36} />
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isOnline ? "bg-emerald-400" : "bg-slate-400"}`} style={{ borderColor: NAV_DARK }} />
          </button>
          <p className="font-display font-bold text-[16px]">{title === "Dashboard" ? "Nova Health" : title}</p>
          <NotifBell notifs={notifs} onMarkRead={markRead} onMarkAll={markAllRead} dark />
        </header>

        {/* ── Top bar: tablets & desktops ── */}
        <header className="hidden md:flex sticky top-0 z-30 h-16 px-5 lg:px-8 items-center justify-between bg-white/[0.85] backdrop-blur-md border-b border-slate-200/80">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:flex w-10 h-10 rounded-xl items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
              {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
            <h1 className="font-display font-extrabold text-[19px] text-slate-900 truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`hidden sm:inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full border ${isOnline ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
              {isOnline ? "Online" : "Offline"}
            </span>
            <NotifBell notifs={notifs} onMarkRead={markRead} onMarkAll={markAllRead} />
            <UserMenu user={user} meta={meta} onSignOut={handleSignOut} />
          </div>
        </header>

        <main id="main" className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-7 pb-28 md:pb-10">
          <VerificationBanner />
          {children}
        </main>
      </div>

      {/* ── Bottom tabs: phones ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200" style={{ paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -4px 20px rgba(16,36,63,0.08)" }} aria-label="Primary">
        <div className="grid grid-cols-5 px-1 pt-1.5 pb-1.5">
          {MOBILE_TABS.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center gap-0.5 py-1.5 rounded-xl">
                {active && <span className="absolute -top-1.5 w-8 h-[3px] rounded-full" style={{ background: TEAL }} />}
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.3 : 1.8} style={{ color: active ? NAV_BG : "#94a3b8" }} />
                <span className="text-[10.5px] font-semibold" style={{ color: active ? NAV_BG : "#94a3b8" }}>{item.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setDrawerOpen(true)} className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl" aria-label="More">
            <MoreHorizontal className="w-[22px] h-[22px] text-slate-400" strokeWidth={1.8} />
            <span className="text-[10.5px] font-semibold text-slate-400">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}