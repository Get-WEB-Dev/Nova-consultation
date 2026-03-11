"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Home, MessageSquare, BookOpen, GitFork, Clock,
  Bell, LogOut, Settings, User, CalendarDays,
  ChevronLeft, ChevronRight, X, Stethoscope,
  Moon, Sun, Check, Heart, Star, FileText, AlarmClock
} from "lucide-react";
import { loadUser, signOut, type AuthUser } from "@/lib/supabase/auth";

/* ── Types ─────────────────────────────────────────────── */
interface DoctorMeta { avatar?: string; specialty?: string; bio?: string; status?: string; }

interface NotifItem {
  id: string; type: "message"|"comment"|"review"|"blog"|"reminder";
  title: string; body: string; time: string; read: boolean;
}

/* ── Nav items ─────────────────────────────────────────── */
const NAV = [
  { href:"/doctor-dashboard",           label:"Home",       icon:Home,        exact:true  },
  { href:"/doctor-dashboard/messages",  label:"Messages",   icon:MessageSquare,exact:false},
  { href:"/doctor-dashboard/feed",      label:"Blogs",      icon:BookOpen,    exact:false },
  { href:"/doctor-dashboard/followups", label:"Follow Ups", icon:GitFork,     exact:false },
  { href:"/doctor-dashboard/consultations",label:"History", icon:Clock,       exact:false },
];

const MGMT = [
  { href:"/doctor-dashboard/profile",  label:"Update Profile",    icon:User        },
  { href:"/doctor-dashboard/schedule", label:"Add / Update Schedule", icon:CalendarDays },
  { href:"/doctor-dashboard/settings", label:"Settings",          icon:Settings    },
];

/* ── Mock notifications ────────────────────────────────── */
const MOCK_NOTIFS: NotifItem[] = [
  { id:"1", type:"message",  title:"New message",         body:"Samuel sent you a message.",           time:"2m",  read:false },
  { id:"2", type:"review",   title:"New review",          body:"Hana left a 5-star review.",            time:"15m", read:false },
  { id:"3", type:"comment",  title:"Post comment",        body:"Dr. Abebe commented on your post.",     time:"1h",  read:false },
  { id:"4", type:"reminder", title:"Follow-up reminder",  body:"Aisha's follow-up is in 30 minutes.",   time:"2h",  read:true  },
  { id:"5", type:"blog",     title:"New blog post",       body:"Dr. Meron published a new article.",    time:"3h",  read:true  },
  { id:"6", type:"message",  title:"New message",         body:"John Tekle sent you files.",            time:"5h",  read:true  },
];

const NOTIF_ICONS: Record<string, React.ElementType> = {
  message: MessageSquare, comment: Heart, review: Star,
  blog: FileText, reminder: AlarmClock,
};

/* ══════════════════════════════════════════════════════════ */
export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [user,        setUser]        = useState<AuthUser | null>(null);
  const [meta,        setMeta]        = useState<DoctorMeta>({});
  const [ready,       setReady]       = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile profile drawer
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [notifs,      setNotifs]      = useState<NotifItem[]>(MOCK_NOTIFS);
  const [dark,        setDark]        = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  /* auth guard */
  useEffect(() => {
    (async () => {
      const u = await loadUser();
      if (!u) { router.replace("/doctor-login"); return; }
      if (u.role !== "doctor") { router.replace(u.role === "admin" ? "/admin-dashboard" : "/dashboard"); return; }
      setUser(u); setReady(true);
      try {
        const r = await fetch(`/api/doctor/profile?doctorId=${u.id}`);
        const j = await r.json();
        if (j.data) setMeta({ avatar:j.data.avatar_url, specialty:j.data.specialty, bio:j.data.bio, status:j.data.status });
      } catch {}
    })();
  }, [router]);

  /* dark mode */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  /* close notif on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const unread = notifs.filter(n => !n.read).length;
  const isOnline = ["available","in_consultation"].includes(meta.status || "");

  /* ── full-screen video portal ──────────────────────────────── */
  if (pathname === "/doctor-dashboard/consult") return <>{children}</>;

  /* ── loading skeleton ──────────────────────────────────────── */
  if (!ready) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-xl animate-pulse">
          <Stethoscope className="w-8 h-8 text-white" />
        </div>
        <div className="flex gap-1.5">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
      </div>
    </div>
  );

  /* ── shared notification panel ─────────────────────────────── */
  const NotifPanel = () => {
    const cats: { key: NotifItem["type"]; label: string }[] = [
      {key:"message",label:"Messages"},{key:"comment",label:"Comments"},
      {key:"review",label:"Reviews"},{key:"blog",label:"Blog Posts"},{key:"reminder",label:"Reminders"},
    ];
    return (
      <div ref={notifRef} className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-elevated border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <p className="font-bold text-slate-800 dark:text-white text-sm">Notifications</p>
          <button onClick={() => setNotifs(n => n.map(x=>({...x,read:true})))} className="text-[11px] text-primary-500 font-semibold hover:text-primary-600">Mark all read</button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {cats.map(cat => {
            const items = notifs.filter(n => n.type === cat.key);
            if (!items.length) return null;
            const Icon = NOTIF_ICONS[cat.key];
            return (
              <div key={cat.key}>
                <p className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-700/50">{cat.label}</p>
                {items.map(n => (
                  <button key={n.id} onClick={() => setNotifs(prev => prev.map(x=>x.id===n.id?{...x,read:true}:x))}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left ${!n.read?"bg-primary-50/60 dark:bg-primary-900/20":""}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.read?"bg-primary-100 dark:bg-primary-800":"bg-slate-100 dark:bg-slate-700"}`}>
                      <Icon className={`w-4 h-4 ${!n.read?"text-primary-600":"text-slate-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${!n.read?"text-slate-800 dark:text-white":"text-slate-600 dark:text-slate-300"}`}>{n.title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.time} ago</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1" />}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-[#F3F6F8] dark:bg-slate-900 transition-colors`}>

      {/* ════════════════════════════════════════════════════
          MOBILE LAYOUT (< lg)
      ════════════════════════════════════════════════════ */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-700/60" style={{boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
          <div className="flex items-center justify-between h-14 px-4">
            {/* Profile avatar → opens sidebar */}
            <button onClick={() => setSidebarOpen(true)} className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary-100 active:scale-95 transition-transform">
              {meta.avatar
                ? <Image src={meta.avatar} alt="Profile" fill className="object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center"><span className="text-white font-bold text-sm">{user?.name?.[0]}</span></div>
              }
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline?"bg-emerald-400":"bg-slate-300"}`} />
            </button>
            {/* Logo */}
            <Link href="/doctor-dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg overflow-hidden"><Image src="/favicon.png" alt="Nova" width={28} height={28} /></div>
              <div><p className="font-bold text-[13px] text-primary-700 dark:text-primary-300 leading-none">Nova Health</p><p className="text-[9px] text-primary-400 font-semibold uppercase tracking-widest">Consultancy</p></div>
            </Link>
            {/* Bell */}
            <div className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                {unread > 0 && <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread>9?"9+":unread}</span>}
              </button>
              {notifOpen && <NotifPanel />}
            </div>
          </div>
        </header>

        {/* Mobile Content */}
        <main className="pb-24 px-4 py-4">{children}</main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200/70 dark:border-slate-700/70" style={{boxShadow:"0 -4px 20px rgba(0,0,0,0.06)",paddingBottom:"env(safe-area-inset-bottom)"}}>
          <div className="flex items-center justify-around px-1 py-1.5">
            {NAV.map(({ href, label, icon:Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link key={href} href={href} className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${active?"text-primary-600":"text-slate-400"}`}>
                  {active && <div className="absolute inset-0 bg-primary-50 dark:bg-primary-900/30 rounded-xl" />}
                  <Icon className={`w-5 h-5 relative z-10 ${active?"stroke-[2.5]":""}`} />
                  <span className={`relative z-10 text-[10px] font-semibold`}>{label==="Follow Ups"?"Follows":label==="History"?"History":label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Mobile Profile Sidebar Drawer */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-800 z-50 flex flex-col animate-slide-in-right overflow-hidden" style={{boxShadow:"8px 0 40px rgba(0,0,0,0.2)"}}>
              {/* Cover */}
              <div className="h-24 bg-gradient-to-br from-primary-700 to-primary-500 relative flex-shrink-0">
                <button onClick={() => setSidebarOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              {/* Avatar */}
              <div className="px-5 pb-4 -mt-8 flex-shrink-0">
                <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-white dark:ring-slate-800 mb-3">
                  {meta.avatar
                    ? <Image src={meta.avatar} alt="Profile" fill className="object-cover" />
                    : <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center"><span className="text-white font-bold text-2xl">{user?.name?.[0]}</span></div>
                  }
                  <span className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline?"bg-emerald-400":"bg-slate-300"}`} />
                </div>
                <p className="font-bold text-slate-800 dark:text-white text-lg leading-tight">Dr. {user?.name}</p>
                {meta.specialty && <p className="text-sm text-primary-500 font-semibold mt-0.5">{meta.specialty}</p>}
                {meta.bio && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{meta.bio}</p>}
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-700 mx-5" />
              {/* Actions */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {MGMT.map(({ href, label, icon:Icon }) => (
                  <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${pathname===href?"bg-primary-50 dark:bg-primary-900/30 text-primary-600":"text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />{label}
                  </Link>
                ))}
              </div>
              <div className="px-4 pb-6 flex-shrink-0">
                <button onClick={() => { setSidebarOpen(false); signOut(); router.push("/doctor-login"); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 transition-all">
                  <LogOut className="w-4 h-4" />Sign Out
                </button>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          DESKTOP LAYOUT (≥ lg)
      ════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-800 border-r border-slate-200/70 dark:border-slate-700/70 flex flex-col z-40 transition-all duration-300 ${desktopCollapsed?"w-16":"w-60 xl:w-64"}`}
          style={{boxShadow:"2px 0 16px rgba(0,0,0,0.04)"}}>
          {/* Sidebar Header */}
          <div className="flex items-center gap-3 h-16 px-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            {/* Clickable avatar → collapse */}
            <button onClick={() => setDesktopCollapsed(!desktopCollapsed)} className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary-100 flex-shrink-0 hover:ring-primary-300 transition-all">
              {meta.avatar
                ? <Image src={meta.avatar} alt="Profile" fill className="object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center"><span className="text-white font-bold text-sm">{user?.name?.[0]}</span></div>
              }
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline?"bg-emerald-400":"bg-slate-300"}`} />
            </button>
            {!desktopCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-primary-700 dark:text-primary-300 truncate">Dr. {user?.name}</p>
                {meta.specialty && <p className="text-[10px] text-primary-400 font-semibold truncate">{meta.specialty}</p>}
              </div>
            )}
          </div>
          {/* Main nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {NAV.map(({ href, label, icon:Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${active?"bg-primary-600 text-white shadow-sm":"text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${active?"text-white":"text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"}`} />
                  {!desktopCollapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
            {/* Management section */}
            {!desktopCollapsed && (
              <div className="pt-3 mt-1 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1.5">Manage</p>
                {MGMT.map(({ href, label, icon:Icon }) => (
                  <Link key={href} href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${pathname===href?"bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white":"text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700"}`}>
                    <Icon className="w-4 h-4 flex-shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </nav>
        </aside>

        {/* Desktop Main */}
        <div className={`flex-1 min-h-screen transition-all duration-300 ${desktopCollapsed?"ml-16":"ml-60 xl:ml-64"}`}>
          {/* Desktop Top Header */}
          <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between h-16 px-6" style={{boxShadow:"0 1px 8px rgba(0,0,0,0.04)"}}>
            {/* Breadcrumb / page title */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Image src="/favicon.png" alt="Nova" width={28} height={28} className="rounded-lg" />
                <div>
                  <p className="font-bold text-sm text-primary-700 dark:text-primary-300 leading-none">Nova Health</p>
                  <p className="text-[9px] text-primary-400 font-semibold uppercase tracking-widest">Consultancy</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Dark mode */}
              <button onClick={() => setDark(!dark)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                {dark ? <Sun className="w-4.5 h-4.5 text-gold-400 w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px] text-slate-500" />}
              </button>
              {/* Notifications */}
              <div className="relative">
                <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <Bell className="w-[18px] h-[18px] text-slate-500 dark:text-slate-300" />
                  {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
                </button>
                {notifOpen && <NotifPanel />}
              </div>
              {/* Sign out */}
              <button onClick={() => { signOut(); router.push("/doctor-login"); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:block">Sign Out</span>
              </button>
            </div>
          </header>
          <main className="px-6 py-6 max-w-3xl mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
