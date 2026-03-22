"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getUser, signOut, type AuthUser } from "@/lib/supabase/auth";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Calendar, Stethoscope, History,
  Bell, Globe, ChevronDown, LogOut,
  User, Settings, MessageCircle, CalendarCheck, ShieldCheck,
  ChevronRight, Search,
} from "lucide-react";

export type Lang = "en" | "am";
export function getLang(): Lang {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("hc-lang") as Lang) || "en";
}
export function setLangGlobal(lang: Lang) {
  localStorage.setItem("hc-lang", lang);
  window.dispatchEvent(new CustomEvent("hc-lang-change", { detail: lang }));
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", labelAm: "ዳሽቦርድ", icon: LayoutDashboard },
  { href: "/doctors", label: "Doctors", labelAm: "ዶክተሮች", icon: Stethoscope },
  { href: "/appointments", label: "Consultations", labelAm: "ምክክሮች", icon: Calendar },
  { href: "/history", label: "History", labelAm: "ታሪክ", icon: History },
];

const NOTIF_ICONS: Record<string, any> = {
  appointment: CalendarCheck,
  chat: MessageCircle,
  system: ShieldCheck,
  doctor_response: Stethoscope,
};

interface Notif {
  id: string; type: string; title: string;
  desc: string; time: string; read: boolean; actionUrl?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = async (uid: string) => {
    try {
      const r = await fetch(`/api/notifications?userId=${uid}`);
      const j = await r.json();
      if (j.data) setNotifs(j.data.map((n: any) => ({
        id: n.id, type: n.type, title: n.title, desc: n.message,
        time: n.created_at, read: n.read ?? false, actionUrl: n.action_url,
      })));
    } catch { }
  };

  useEffect(() => {
    setLang(getLang());
    const u = getUser(); setUser(u);
    if (u) fetchNotifs(u.id);
    const langH = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    const authH = () => { const u2 = getUser(); setUser(u2); if (u2) fetchNotifs(u2.id); };
    window.addEventListener("hc-lang-change", langH);
    window.addEventListener("hc-auth-change", authH);
    window.addEventListener("storage", authH);
    return () => {
      window.removeEventListener("hc-lang-change", langH);
      window.removeEventListener("hc-auth-change", authH);
      window.removeEventListener("storage", authH);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let unsub: (() => void) | undefined;
    import("@/lib/realtime/subscriptions").then(({ subscribeToNotifications, initPresence }) => {
      initPresence(user.id);
      unsub = subscribeToNotifications(user.id, (n: any) => {
        setNotifs(prev => [{ id: n.id, type: n.type, title: n.title, desc: n.message, time: n.created_at, read: false, actionUrl: n.action_url }, ...prev]);
      });
    });
    const iv = setInterval(() => fetchNotifs(user.id), 15000);
    return () => { unsub?.(); clearInterval(iv); };
  }, [user?.id]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const markRead = async (id: string) => {
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    try { await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notifId: id }) }); } catch { }
  };

  const handleSignOut = () => {
    signOut(); setUser(null); setNotifs([]);
    window.dispatchEvent(new Event("hc-auth-change"));
    router.push("/");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const unread = notifs.filter(n => !n.read).length;
  const toggleLang = () => { const next: Lang = lang === "en" ? "am" : "en"; setLang(next); setLangGlobal(next); };

  return (
    <>
      {/* ── Desktop Navbar ── */}
      <nav className="sticky top-0 z-50 hidden md:block border-b border-white/40"
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-glow-teal transition-shadow duration-300">
              <Image src="/favicon.png" alt="Nova Health" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-bold text-lg text-gradient">Nova Health</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label, labelAm, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive(href)
                    ? "bg-primary-50/80 text-primary-700 font-semibold shadow-soft"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {lang === "am" ? labelAm : label}
                {href === "/appointments" && unread > 0 && (
                  <span className="w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Lang toggle */}
            <button onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 border border-slate-200/60 bg-white/50 hover:border-teal-300 hover:text-teal-600 transition-all duration-200">
              <Globe className="w-3.5 h-3.5" />
              {lang === "en" ? "አማ" : "EN"}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 rounded-xl text-slate-500 hover:bg-white/60 hover:text-slate-700 transition-all duration-200">
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-notif-pop">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-float border border-white/40 overflow-hidden animate-scale-in z-50"
                  style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                  <div className="px-4 py-3 border-b border-slate-100/60 flex items-center justify-between">
                    <p className="font-display font-bold text-sm text-slate-800">Notifications</p>
                    {unread > 0 && <span className="badge-rose text-[10px]">{unread} new</span>}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="empty-state py-10">
                        <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No notifications</p>
                      </div>
                    ) : notifs.slice(0, 8).map(n => {
                      const NIcon = NOTIF_ICONS[n.type] || Bell;
                      const W = n.actionUrl ? Link : ("div" as any);
                      return (
                        <W key={n.id} href={n.actionUrl ?? ""}
                          onClick={() => { markRead(n.id); setNotifOpen(false); }}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-white/60 cursor-pointer transition-all duration-200 border-b border-slate-50/60 last:border-0 ${!n.read ? "bg-primary-50/30" : ""}`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.read ? "bg-primary-100 text-primary-600" : "bg-slate-100 text-slate-400"}`}>
                            <NIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-slate-800" : "text-slate-600"}`}>{n.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{n.desc}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0 mt-1.5" />}
                        </W>
                      );
                    })}
                  </div>
                  <Link href="/notifications" onClick={() => setNotifOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-primary-600 hover:bg-white/60 transition-all duration-200 border-t border-slate-100/60">
                    View all notifications <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* User menu */}
            {user ? (
              <div className="relative" ref={userRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-white/50 border border-slate-200/60 hover:border-teal-300 hover:bg-white/70 transition-all duration-200">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center ring-2 ring-white">
                    <span className="text-white text-xs font-bold uppercase">{user.name?.[0] || "U"}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 max-w-[90px] truncate">{user.name?.split(" ")[0]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-float border border-white/40 py-1.5 animate-scale-in z-50 overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                    <div className="px-4 py-3 border-b border-slate-100/60">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                      <p className="text-xs text-slate-400 truncate">{(user as any).email || "Patient"}</p>
                    </div>
                    <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-white/60 transition-all duration-200">
                      <User className="w-4 h-4 text-slate-400" /> Profile
                    </Link>
                    <Link href="/profile?tab=edit" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-white/60 transition-all duration-200">
                      <Settings className="w-4 h-4 text-slate-400" /> Edit Profile
                    </Link>
                    <div className="border-t border-slate-100/60 my-1" />
                    <button onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50/50 transition-all duration-200">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-primary">Sign In</Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile Top Bar ── */}
      <nav className="sticky top-0 z-50 md:hidden border-b border-white/40"
        style={{
          background: 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm">
              <Image src="/favicon.png" alt="Nova Health" width={32} height={32} className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-bold text-base text-gradient">Nova Health</span>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={toggleLang} className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-white/60 transition-all duration-200">
              <Globe className="w-3.5 h-3.5" />
            </button>
            <Link href="/notifications" className="relative p-2 rounded-lg text-slate-500 hover:bg-white/60 transition-all duration-200">
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Mobile Bottom Tab Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="border-t border-white/40"
          style={{
            background: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}>
          <div className="flex items-center justify-around px-2 max-w-md mx-auto" style={{ height: "calc(4rem + env(safe-area-inset-bottom, 0px))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {NAV_LINKS.map(({ href, label, labelAm, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] ${active ? "text-primary-600" : "text-slate-400"}`}
                >
                  <div className="relative">
                    <div className={`p-1.5 rounded-xl transition-all duration-200 ${active ? "bg-primary-50" : ""}`}>
                      <Icon className={`w-5 h-5 ${active ? "text-primary-600" : ""}`} />
                    </div>
                    {href === "/appointments" && unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 text-white text-[7px] font-bold rounded-full flex items-center justify-center ring-1 ring-white">
                        {unread > 9 ? "!" : unread}
                      </span>
                    )}
                    {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary-600 rounded-full" />}
                  </div>
                  <span className={`text-[10px] font-medium leading-none ${active ? "text-primary-600" : ""}`}>
                    {lang === "am" ? labelAm : label}
                  </span>
                </Link>
              );
            })}
            {user ? (
              <button onClick={handleSignOut} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-rose-500 min-w-[56px] transition-all duration-200">
                <div className="p-1.5"><LogOut className="w-5 h-5" /></div>
                <span className="text-[10px] font-medium leading-none">Sign Out</span>
              </button>
            ) : (
              <Link href="/login" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-slate-400 hover:text-primary-600 min-w-[56px] transition-all duration-200">
                <div className="p-1.5"><User className="w-5 h-5" /></div>
                <span className="text-[10px] font-medium leading-none">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}