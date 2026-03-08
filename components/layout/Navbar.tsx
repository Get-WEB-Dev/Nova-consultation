"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUser, signOut, type AuthUser } from "@/lib/supabase/auth";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Menu, X, LayoutDashboard, Calendar,
  User, LogOut, Stethoscope, Bell, Globe, Heart, Bookmark,
  CalendarCheck, MessageCircle, ShieldCheck, ChevronRight,
} from "lucide-react";

// ── Language helpers ──────────────────────────────────────────────────────────
export type Lang = "en" | "am";

export function getLang(): Lang {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("hc-lang") as Lang) || "en";
}

export function setLangGlobal(lang: Lang) {
  localStorage.setItem("hc-lang", lang);
  window.dispatchEvent(new CustomEvent("hc-lang-change", { detail: lang }));
}

// ── Nav links ─────────────────────────────────────────────────────────────────
const navLinks = [
  { href: "/dashboard", label: "Dashboard", labelAm: "ዳሽቦርድ", icon: LayoutDashboard, public: false },
  { href: "/doctors", label: "Doctors", labelAm: "ዶክተሮች", icon: Stethoscope, public: true },
  { href: "/appointments", label: "Consultations", labelAm: "ምክክሮች", icon: Calendar, public: false },
  { href: "/saved-doctors", label: "Saved", labelAm: "የተቀመጡ", icon: Bookmark, public: false },
  { href: "/profile", label: "Profile", labelAm: "መገለጫ", icon: User, public: false },
];

// mock notifications for navbar
const MOCK_NOTIFS = [
  { id: "n1", type: "appointment" as const, title: "Appointment Confirmed", desc: "Dr. Sarah Johnson — Mar 10, 10:00 AM", time: "2h ago", read: false },
  { id: "n2", type: "chat" as const, title: "New Message", desc: "Dr. Michael Chen sent you a message", time: "3h ago", read: false },
  { id: "n3", type: "system" as const, title: "Complete Your Profile", desc: "Add your medical info for better care", time: "1d ago", read: true },
];

const NOTIF_ICONS: Record<string, typeof CalendarCheck> = {
  appointment: CalendarCheck,
  chat: MessageCircle,
  system: ShieldCheck,
  doctor_response: Stethoscope,
};

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setLang(getLang());
    setUser(getUser());
    const handler = (e: Event) => setLang((e as CustomEvent<Lang>).detail);
    window.addEventListener("hc-lang-change", handler);
    // Re-check auth whenever storage changes
    const storageHandler = () => setUser(getUser());
    window.addEventListener("storage", storageHandler);
    window.addEventListener("hc-auth-change", storageHandler);
    return () => {
      window.removeEventListener("hc-lang-change", handler);
      window.removeEventListener("storage", storageHandler);
      window.removeEventListener("hc-auth-change", storageHandler);
    };
  }, []);

  const handleSignOut = () => {
    signOut();
    setUser(null);
    window.dispatchEvent(new Event("hc-auth-change"));
    router.push("/");
  };

  const toggleLang = () => {
    const next: Lang = lang === "en" ? "am" : "en";
    setLang(next);
    setLangGlobal(next);
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const unreadCount = MOCK_NOTIFS.filter((n) => !n.read).length;

  return (
    <>
      {/* ── DESKTOP TOP NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100/80 shadow-sm hidden md:block">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display font-bold text-lg text-primary-600 group"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-glow-brand transition-shadow">
              <Image src="/favicon.png" alt="Nova Health" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <span>Nova Health</span>
          </Link>

          {/* Desktop links */}
          <div className="flex items-center gap-1">
            {navLinks.map(({ href, label, labelAm, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                data-nav={href.replace("/", "")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive(href)
                  ? "bg-primary-50 text-primary-600 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {lang === "am" ? labelAm : label}
              </Link>
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Language switch */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-all text-sm font-medium"
              title={lang === "en" ? "Switch to Amharic" : "ወደ እንግሊዝኛ ቀይር"}
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "en" ? "አማ" : "EN"}
            </button>

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 rounded-xl hover:bg-slate-50 text-slate-500 transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-gold-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {/* Notification dropdown */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-elevated border border-slate-100 py-2 animate-scale-in z-50">
                  <div className="px-4 pt-2 pb-3 flex items-center justify-between">
                    <p className="text-sm font-display font-bold text-slate-800">Notifications</p>
                    <span className="badge-gold text-[10px]">{unreadCount} new</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {MOCK_NOTIFS.map((n) => {
                      const NIcon = NOTIF_ICONS[n.type] || Bell;
                      return (
                        <Link
                          key={n.id}
                          href="/notifications"
                          onClick={() => setNotifOpen(false)}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read ? "bg-primary-50/30" : ""}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${!n.read ? "bg-primary-100 text-primary-600" : "bg-slate-100 text-slate-400"}`}>
                            <NIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-tight ${!n.read ? "font-semibold text-slate-800" : "font-medium text-slate-600"}`}>{n.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{n.desc}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">{n.time}</span>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 mt-1 pt-2 px-4 pb-2">
                    <Link href="/notifications" onClick={() => setNotifOpen(false)} className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1">
                      View all notifications <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 text-[10px] font-bold uppercase">{user.name?.[0] || "U"}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate">{user.name}</span>
                </div>
                <button onClick={handleSignOut} className="btn-ghost text-slate-500">
                  <LogOut className="w-4 h-4" />
                  {lang === "am" ? "ውጣ" : "Sign Out"}
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary text-sm">
                {lang === "am" ? "ግባ" : "Sign In"}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE TOP BAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100/80 shadow-sm md:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-display font-bold text-base text-primary-600"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <Image src="/favicon.png" alt="Nova Health" width={32} height={32} className="w-full h-full object-cover" />
            </div>
            Nova Health
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === "en" ? "አማ" : "EN"}
            </button>

            <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-gold-400 text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-lg">
          <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            {navLinks.slice(0, 4).map(({ href, label, labelAm, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                data-nav={href.replace("/", "")}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[60px] ${isActive(href)
                  ? "text-primary-600"
                  : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                <div className={`p-1 rounded-lg transition-all ${isActive(href) ? "bg-primary-50" : ""}`}>
                  <Icon className={`w-5 h-5 ${isActive(href) ? "text-primary-600" : ""}`} />
                </div>
                <span className={`text-[10px] font-medium leading-none ${isActive(href) ? "text-primary-600" : ""}`}>
                  {lang === "am" ? labelAm : label}
                </span>
              </Link>
            ))}
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-slate-400 hover:text-rose-500 min-w-[60px]"
              >
                <div className="p-1">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">
                  {lang === "am" ? "ውጣ" : "Sign Out"}
                </span>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-slate-400 hover:text-primary-600 min-w-[60px]"
              >
                <div className="p-1">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">
                  {lang === "am" ? "ግባ" : "Sign In"}
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
