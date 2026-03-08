"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    LayoutDashboard, Users, LogOut,
    Stethoscope, Menu, X, User, Clock,
    Bell, ChevronDown, Activity,
    Shield, Wifi, WifiOff, Circle,
} from "lucide-react";
import { getUser, signOut, type AuthUser } from "@/lib/supabase/auth";

const doctorNav = [
    { href: "/doctor-dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true, description: "Overview & stats" },
    { href: "/doctor-dashboard/consultations", label: "Consultations", icon: Activity, exact: false, description: "Active & history" },
    { href: "/doctor-dashboard/patients", label: "Patients", icon: Users, exact: false, description: "Patient records" },
    { href: "/doctor-dashboard/schedule", label: "Schedule", icon: Clock, exact: false, description: "Availability" },
    { href: "/doctor-dashboard/profile", label: "Profile", icon: User, exact: false, description: "Edit profile" },
];

const statusConfig: Record<string, { color: string; label: string; text: string; bg: string }> = {
    available: { color: "bg-emerald-500", label: "Available", text: "text-emerald-600", bg: "bg-emerald-50" },
    busy: { color: "bg-amber-500", label: "Busy", text: "text-amber-600", bg: "bg-amber-50" },
    in_consultation: { color: "bg-blue-500", label: "In Session", text: "text-blue-600", bg: "bg-blue-50" },
    offline: { color: "bg-slate-400", label: "Offline", text: "text-slate-500", bg: "bg-slate-100" },
};

export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [ready, setReady] = useState(false);
    const [notifCount, setNotifCount] = useState(0);
    const [doctorStatus, setDoctorStatus] = useState("available");
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            const { loadUser } = await import("@/lib/supabase/auth");
            const u = await loadUser();
            if (!u) { router.replace("/doctor-login"); return; }
            if (u.role !== "doctor") {
                if (u.role === "admin") router.replace("/admin-dashboard");
                else router.replace("/dashboard");
                return;
            }
            setUser(u);
            setReady(true);

            try {
                const res = await fetch(`/api/doctor/profile?doctorId=${u.id}`);
                const json = await res.json();
                if (json.data) setDoctorStatus(json.data.status || "available");
            } catch { /* ignore */ }

            try {
                const nRes = await fetch(`/api/notifications?userId=${u.id}`);
                const nJson = await nRes.json();
                setNotifCount((nJson.data || []).filter((n: any) => !n.read).length);
            } catch { /* ignore */ }
        }
        checkAuth();
    }, [router]);

    const handleStatusChange = async (newStatus: string) => {
        if (!user) return;
        setDoctorStatus(newStatus);
        setStatusMenuOpen(false);
        try {
            await fetch("/api/doctor/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ doctorId: user.id, status: newStatus }),
            });
        } catch { /* ignore */ }
    };

    const handleSignOut = () => { signOut(); router.push("/doctor-login"); };

    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

    const currentStatus = statusConfig[doctorStatus] || statusConfig.available;

    if (!ready) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center shadow-lg">
                        <Stethoscope className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex gap-1.5">
                        {[0,1,2].map(i => (
                            <div key={i} className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200/80 flex flex-col
                transition-transform duration-300 ease-in-out
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `} style={{ boxShadow: "4px 0 24px rgba(0,0,0,0.06)" }}>
                {/* Brand */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-slate-200">
                        <Image src="/favicon.png" alt="Nova Health" width={36} height={36} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <p className="font-display font-bold text-sm text-slate-800 leading-tight">Nova Health</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <Shield className="w-2.5 h-2.5 text-primary-500" />
                            <span className="text-[10px] font-medium text-primary-600 uppercase tracking-wider">Doctor Portal</span>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Doctor info */}
                <div className="px-4 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">{user?.name?.[0] || "D"}</span>
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${currentStatus.color} ring-2 ring-white`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">Dr. {user?.name?.split(" ").slice(-1)[0] || "Doctor"}</p>
                            <div className="relative">
                                <button onClick={() => setStatusMenuOpen(!statusMenuOpen)} className={`flex items-center gap-1 text-xs font-medium ${currentStatus.text}`}>
                                    <span>{currentStatus.label}</span>
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                                {statusMenuOpen && (
                                    <div className="absolute left-0 top-5 z-50 bg-white rounded-xl shadow-elevated border border-slate-100 py-1 w-36">
                                        {Object.entries(statusConfig).map(([key, cfg]) => (
                                            <button key={key} onClick={() => handleStatusChange(key)}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium hover:bg-slate-50 ${doctorStatus === key ? cfg.text : "text-slate-600"}`}>
                                                <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
                                                {cfg.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-3">Navigation</p>
                    {doctorNav.map(({ href, label, icon: Icon, exact, description }) => {
                        const active = isActive(href, exact);
                        return (
                            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                                    ${active ? "bg-primary-600 text-white shadow-md shadow-primary-600/25" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all
                                    ${active ? "bg-white/20" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate leading-none">{label}</p>
                                    <p className={`text-[10px] truncate mt-0.5 ${active ? "text-primary-200" : "text-slate-400"}`}>{description}</p>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Sign out */}
                <div className="px-3 py-4 border-t border-slate-100">
                    <button onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all group">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center transition-all">
                            <LogOut className="w-4 h-4" />
                        </div>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Main */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                {/* Top bar */}
                <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80" style={{ boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center justify-between h-14 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500">
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="hidden sm:flex items-center gap-2 text-sm">
                                <span className="text-slate-400">Doctor Portal</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-slate-700 font-semibold">
                                    {doctorNav.find(n => isActive(n.href, n.exact))?.label || "Dashboard"}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl ${currentStatus.bg}`}>
                                <div className={`w-2 h-2 rounded-full ${currentStatus.color} animate-pulse`} />
                                <span className={`text-xs font-semibold ${currentStatus.text}`}>{currentStatus.label}</span>
                            </div>

                            <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500">
                                <Bell className="w-5 h-5" />
                                {notifCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                        {notifCount > 9 ? "9+" : notifCount}
                                    </span>
                                )}
                            </Link>

                            <Link href="/doctor-dashboard/profile" className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-primary-400 flex items-center justify-center">
                                    <span className="text-white font-bold text-xs">{user?.name?.[0] || "D"}</span>
                                </div>
                                <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate hidden sm:block">{user?.name}</span>
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="flex-1 px-4 sm:px-6 py-6 pb-10">
                    {children}
                </main>

                <footer className="px-6 py-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400 text-center">Nova Health Doctor Portal · Secure & HIPAA Compliant</p>
                </footer>
            </div>
        </div>
    );
}
