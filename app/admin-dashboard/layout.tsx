"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
    LayoutDashboard, Users, Stethoscope, LogOut, Calendar, Newspaper, Menu, X, History, Settings,
    BarChart3, Star, MessageSquare, Megaphone, ShieldCheck, ChevronDown, FileBarChart,HeartPulse, ClipboardList,
} from "lucide-react";
import { loadUser, signOut, type AuthUser } from "@/lib/supabase/auth";
import { ToastProvider } from "@/components/admin/AdminUI";
import { Avatar } from "@/components/admin/kit";
import GlobalSearch from "@/components/admin/GlobalSearch";
import AttentionBell from "@/components/admin/AttentionBell";

const NAV = [
    {
        title: null, items: [
            { href: "/admin-dashboard", label: "Overview", icon: LayoutDashboard },
            { href: "/admin-dashboard/analytics", label: "Analytics", icon: BarChart3 },
            { href: "/admin-dashboard/reports", label: "Reports", icon: FileBarChart },
        ]
    },
    {
        title: "People", items: [
            { href: "/admin-dashboard/users", label: "Users", icon: Users },
            { href: "/admin-dashboard/doctors", label: "Doctors", icon: Stethoscope },
            { href: "/admin-dashboard/admins", label: "Admins", icon: ShieldCheck },
             { href: "/admin-dashboard/data-requests", label: "Data requests", icon: ClipboardList },
        ]
    },
    {
        title: "Operations", items: [
            { href: "/admin-dashboard/consultations", label: "Consultations", icon: Calendar },
            { href: "/admin-dashboard/reviews", label: "Reviews", icon: Star },
            { href: "/admin-dashboard/messages", label: "Messages", icon: MessageSquare },
        ]
    },
    {
        title: "Content", items: [
            { href: "/admin-dashboard/posts", label: "Blog posts", icon: Newspaper },
            { href: "/admin-dashboard/announcements", label: "Announcements", icon: Megaphone },
        ]
    },
    {
        title: "System", items: [
             { href: "/admin-dashboard/system", label: "System health", icon: HeartPulse },
            { href: "/admin-dashboard/activity", label: "Activity log", icon: History },
            { href: "/admin-dashboard/settings", label: "Settings", icon: Settings },
        ]
    },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isSuper, setIsSuper] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [ready, setReady] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function checkAuth() {
            try {
                const u = await loadUser();
                if (!u) { router.replace("/admin-login"); return; }
                // The server decides who is an admin (never trust the client)
                const res = await fetch("/api/admin/verify");
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json.isAdmin) { router.replace("/admin-login"); return; }
                // Server requires two-factor for admins and this session has not used it yet
                if (json.mfaRequired && json.aal !== "aal2") { router.replace("/admin-login/mfa"); return; }
                setUser(u);
                setIsSuper(!!json.isSuperAdmin);
                setReady(true);
            } catch {
                router.replace("/admin-login");
            }
        }
        checkAuth();
    }, [router]);

    useEffect(() => {
        const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push("/admin-login");
    };

    const isActive = (href: string) =>
        pathname === href || (href !== "/admin-dashboard" && pathname.startsWith(href));

    if (!ready) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-shimmer w-32 h-8 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 print:hidden">
                <div className="flex items-center justify-between h-14 px-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu" className="md:hidden p-2 rounded-lg hover:bg-slate-50 text-slate-500">
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <Link href="/admin-dashboard" className="flex items-center gap-2 font-display font-bold text-primary-600">
                            <div className="w-8 h-8 rounded-lg overflow-hidden">
                                <Image src="/favicon.png" alt="Nova Health" width={32} height={32} className="w-full h-full object-cover" />
                            </div>
                            <span className="hidden sm:inline">Nova Health</span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700 text-white">Admin</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        <GlobalSearch />
                        <AttentionBell />
                        <div ref={menuRef} className="relative">
                            <button onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen}
                                className="flex items-center gap-2 pl-1 pr-2 h-9 rounded-xl hover:bg-slate-50">
                                <Avatar name={user?.name ?? "Admin"} size={28} />
                                <span className="hidden sm:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">{user?.name}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                            {menuOpen && (
                                <div role="menu" className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-up">
                                    <div className="px-4 py-3 border-b border-slate-50">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{user?.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                                        <span className={`badge mt-2 ${isSuper ? "badge-gold" : "badge-slate"}`}>{isSuper ? "Super admin" : "Admin"}</span>
                                    </div>
                                    <Link href="/admin-dashboard/settings" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                                        <Settings className="w-4 h-4" /> Settings & security
                                    </Link>
                                    <button role="menuitem" onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                                        <LogOut className="w-4 h-4" /> Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                <aside className={`print:hidden fixed md:sticky top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-60 bg-white border-r border-slate-100 overflow-y-auto transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
                    <nav className="p-3 space-y-5" aria-label="Main">
                        {NAV.map((group, gi) => (
                            <div key={gi} className="space-y-0.5">
                                {group.title && <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300">{group.title}</p>}
                                {group.items.map(({ href, label, icon: Icon }) => (
                                    <Link key={href} href={href} onClick={() => setSidebarOpen(false)} aria-current={isActive(href) ? "page" : undefined}
                                        className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive(href) ? "bg-primary-50 text-primary-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}>
                                        {isActive(href) && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary-600" />}
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </nav>
                </aside>

                {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

                <main className="flex-1 min-w-0 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10 print:max-w-none print:p-0">
                    <ToastProvider>{children}</ToastProvider>
                </main>
            </div>
        </div>
    );
}