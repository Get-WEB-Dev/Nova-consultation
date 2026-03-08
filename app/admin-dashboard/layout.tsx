"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    LayoutDashboard, Users, Stethoscope, LogOut,
    Shield, Menu, X,
} from "lucide-react";
import { getUser, signOut, type AuthUser } from "@/lib/supabase/auth";

const adminNav = [
    { href: "/admin-dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/admin-dashboard/users", label: "Users", icon: Users },
    { href: "/admin-dashboard/doctors", label: "Doctors", icon: Stethoscope },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            const { loadUser } = await import("@/lib/supabase/auth");
            const u = await loadUser();
            if (!u) {
                router.replace("/admin-login");
                return;
            }
            if (u.role !== "admin") {
                if (u.role === "doctor") router.replace("/doctor-dashboard");
                else router.replace("/dashboard");
                return;
            }
            setUser(u);
            setReady(true);
        }
        checkAuth();
    }, [router]);

    const handleSignOut = () => {
        signOut();
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
            {/* Top bar */}
            <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100/80 shadow-sm">
                <div className="flex items-center justify-between h-14 px-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-slate-50 text-slate-500"
                        >
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <Link href="/admin-dashboard" className="flex items-center gap-2 font-display font-bold text-primary-600">
                            <div className="w-8 h-8 rounded-lg overflow-hidden">
                                <Image src="/favicon.png" alt="Nova Health" width={32} height={32} className="w-full h-full object-cover" />
                            </div>
                            <span className="hidden sm:inline">Nova Health</span>
                            <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700 text-white">Admin</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        {user && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                    <Shield className="w-3 h-3 text-slate-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate hidden sm:inline">{user.name}</span>
                            </div>
                        )}
                        <button onClick={handleSignOut} className="btn-ghost text-slate-500 text-sm">
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className={`
          fixed md:sticky top-14 left-0 z-40 h-[calc(100vh-3.5rem)] w-56 bg-white border-r border-slate-100 transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
                    <nav className="p-3 space-y-1">
                        {adminNav.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive(href)
                                    ? "bg-slate-100 text-slate-800 shadow-sm"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </Link>
                        ))}
                    </nav>
                </aside>

                {/* Overlay on mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/20 z-30 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content */}
                <main className="flex-1 max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
