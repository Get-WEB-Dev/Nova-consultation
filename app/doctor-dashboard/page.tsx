"use client";

import { useEffect, useState } from "react";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import Link from "next/link";
import {
    Calendar, Users, Activity, Star, Video, Clock,
    ArrowRight, CheckCircle2, AlertCircle, TrendingUp,
    Stethoscope, MessageSquare, Bell, UserCheck, Timer,
    ChevronRight, Zap, Award,
} from "lucide-react";

interface DoctorProfile {
    id: string;
    specialty: string;
    status: string;
    fee: number;
    patients_served: number;
    rating: number;
    review_count: number;
    consultation_duration_mins: number;
    hospital: string | null;
    experience_years: number;
}

interface Consultation {
    id: string;
    patientId: string;
    patientName: string;
    patientEmail: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number | null;
    isFollowUp: boolean;
    created_at: string;
}

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    waiting: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    completed: { bg: "bg-primary-50", text: "text-primary-700", dot: "bg-primary-500" },
    missed: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
    follow_up: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
    cancelled: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
};

function StatCard({ icon: Icon, label, value, sub, gradient, href }: {
    icon: any; label: string; value: string | number; sub?: string; gradient: string; href?: string;
}) {
    const inner = (
        <div className="card group hover:scale-[1.02] transition-all duration-200 cursor-pointer">
            <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
                {href && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />}
            </div>
            <p className="font-display font-bold text-2xl text-slate-800 leading-none">{value}</p>
            <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
    return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

export default function DoctorDashboardPage() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [profile, setProfile] = useState<DoctorProfile | null>(null);
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = getUser();
        if (!u) return;
        setUser(u);

        async function loadData() {
            try {
                const [profileRes, consultsRes, notifRes] = await Promise.all([
                    fetch(`/api/doctor/profile?doctorId=${u!.id}`).then(r => r.json()),
                    fetch(`/api/doctor/consultations?doctorId=${u!.id}`).then(r => r.json()).catch(() => ({ data: [] })),
                    fetch(`/api/notifications?userId=${u!.id}`).then(r => r.json()).catch(() => ({ data: [] })),
                ]);
                if (profileRes.data) setProfile(profileRes.data);
                setConsultations(consultsRes.data || []);
                setNotifications((notifRes.data || []).slice(0, 4));
            } catch (err) {
                console.error("Failed to load doctor data:", err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleAcceptConsultation = async (consultationId: string) => {
        try {
            await fetch("/api/doctor/consultations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consultationId, status: "active" }),
            });
            setConsultations(prev => prev.map(c => c.id === consultationId ? { ...c, status: "active" } : c));
        } catch (err) { console.error(err); }
    };

    const waiting = consultations.filter(c => c.status === "waiting");
    const active = consultations.filter(c => c.status === "active");
    const completed = consultations.filter(c => c.status === "completed");
    const recent = consultations.slice(0, 6);
    const unreadNotifs = notifications.filter(n => !n.read);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-32 bg-slate-200 rounded-2xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
                </div>
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-64 bg-slate-200 rounded-2xl" />
                    <div className="h-64 bg-slate-200 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-up max-w-7xl">
            {/* Hero greeting */}
            <div className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 rounded-2xl p-6 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-20" />
                <div className="absolute bottom-0 right-12 w-32 h-32 bg-white/5 rounded-full translate-y-16" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-primary-200 text-sm font-medium mb-1">{todayStr}</p>
                        <h1 className="font-display font-bold text-2xl text-white">
                            {greeting}, Dr. {user?.name?.split(" ").slice(-1)[0] || "Doctor"} 👋
                        </h1>
                        <p className="text-primary-200 text-sm mt-1.5">
                            {profile?.specialty ? `${profile.specialty} · ` : ""}{profile?.hospital || "Nova Health Clinic"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                            {waiting.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-medium">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    {waiting.length} patient{waiting.length !== 1 ? "s" : ""} waiting
                                </div>
                            )}
                            {active.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5 text-xs text-white font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    {active.length} active session{active.length !== 1 ? "s" : ""}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        {active.length > 0 ? (
                            <Link href="/doctor-dashboard/consultations"
                                className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-50 transition-all text-sm shadow-md">
                                <Video className="w-4 h-4" />
                                Join Session
                            </Link>
                        ) : waiting.length > 0 ? (
                            <Link href="/doctor-dashboard/consultations"
                                className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-primary-50 transition-all text-sm shadow-md">
                                <UserCheck className="w-4 h-4" />
                                Accept Patient
                            </Link>
                        ) : (
                            <Link href="/doctor-dashboard/consultations"
                                className="inline-flex items-center gap-2 bg-white/15 text-white font-medium px-4 py-2.5 rounded-xl hover:bg-white/25 transition-all text-sm border border-white/20">
                                <Calendar className="w-4 h-4" />
                                View Consultations
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={AlertCircle}
                    label="Waiting"
                    value={waiting.length}
                    sub="Pending requests"
                    gradient="from-amber-500 to-orange-400"
                    href="/doctor-dashboard/consultations"
                />
                <StatCard
                    icon={Activity}
                    label="Active"
                    value={active.length}
                    sub="In progress"
                    gradient="from-emerald-600 to-emerald-400"
                    href="/doctor-dashboard/consultations"
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Completed"
                    value={completed.length}
                    sub="All time"
                    gradient="from-primary-600 to-primary-400"
                    href="/doctor-dashboard/consultations"
                />
                <StatCard
                    icon={Users}
                    label="Total Patients"
                    value={profile?.patients_served || 0}
                    sub="Served"
                    gradient="from-purple-600 to-purple-400"
                    href="/doctor-dashboard/patients"
                />
            </div>

            {/* Practice stats row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gold-50 flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5 text-gold-400 fill-gold-400" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-slate-800">{profile?.rating?.toFixed(1) || "—"}</p>
                        <p className="text-xs text-slate-500">{profile?.review_count || 0} reviews</p>
                    </div>
                </div>
                <div className="card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                        <Timer className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-slate-800">{profile?.consultation_duration_mins || 15}<span className="text-sm font-normal text-slate-500"> min</span></p>
                        <p className="text-xs text-slate-500">Session length</p>
                    </div>
                </div>
                <div className="card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-50 flex items-center justify-center flex-shrink-0">
                        <Award className="w-5 h-5 text-accent-500" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-slate-800">${profile?.fee || 0}</p>
                        <p className="text-xs text-slate-500">Consultation fee</p>
                    </div>
                </div>
            </div>

            {/* Main content grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Consultations */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display font-semibold text-slate-800">Recent Consultations</h2>
                        <Link href="/doctor-dashboard/consultations" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                            View all <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {/* Waiting patients - urgent */}
                    {waiting.length > 0 && (
                        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <p className="text-sm font-semibold text-amber-800">{waiting.length} Patient{waiting.length !== 1 ? "s" : ""} Waiting</p>
                            </div>
                            <div className="space-y-2">
                                {waiting.slice(0, 3).map(c => (
                                    <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                            <span className="text-amber-700 text-xs font-bold uppercase">{c.patientName?.[0] || "P"}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{c.patientName || "Unknown"}</p>
                                            <p className="text-xs text-slate-400">{new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                                        </div>
                                        <button onClick={() => handleAcceptConsultation(c.id)}
                                            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                                            <Zap className="w-3 h-3" />
                                            Accept
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All recent */}
                    {recent.length === 0 ? (
                        <div className="card text-center py-12">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                <Calendar className="w-7 h-7 text-slate-300" />
                            </div>
                            <p className="font-medium text-slate-500">No consultations yet</p>
                            <p className="text-xs text-slate-400 mt-1">Patients will appear here when they request consultations</p>
                        </div>
                    ) : (
                        <div className="card p-0 overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-100">
                                <p className="text-sm font-semibold text-slate-700">Consultation History</p>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {recent.map(c => {
                                    const sc = statusColors[c.status] || statusColors.cancelled;
                                    return (
                                        <div key={c.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                                            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                                <span className="text-primary-700 text-xs font-bold uppercase">{c.patientName?.[0] || "P"}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold text-slate-700 truncate">{c.patientName || "Unknown Patient"}</p>
                                                    {c.isFollowUp && <span className="text-[10px] bg-purple-50 text-purple-600 font-medium px-1.5 py-0.5 rounded-full">Follow-up</span>}
                                                </div>
                                                <p className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {c.durationMinutes && (
                                                    <span className="text-xs text-slate-400 hidden sm:block">{c.durationMinutes}m</span>
                                                )}
                                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                    {c.status.replace("_", " ")}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="px-5 py-3 border-t border-slate-100">
                                <Link href="/doctor-dashboard/consultations" className="text-xs font-medium text-primary-600 flex items-center gap-1 hover:text-primary-700">
                                    View all consultations <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right sidebar */}
                <div className="space-y-4">
                    {/* Notifications */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                <Bell className="w-4 h-4 text-slate-400" />
                                Notifications
                                {unreadNotifs.length > 0 && (
                                    <span className="w-5 h-5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadNotifs.length}</span>
                                )}
                            </h3>
                            <Link href="/notifications" className="text-xs text-primary-600 hover:text-primary-700">See all</Link>
                        </div>
                        {notifications.length === 0 ? (
                            <div className="text-center py-6">
                                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">No notifications</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {notifications.slice(0, 4).map(n => (
                                    <div key={n.id} className={`flex gap-2.5 p-2.5 rounded-xl transition-colors ${n.read ? "bg-slate-50" : "bg-primary-50"}`}>
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? "bg-slate-300" : "bg-primary-500"}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{n.title}</p>
                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick links */}
                    <div className="card">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
                        <div className="space-y-2">
                            {[
                                { href: "/doctor-dashboard/consultations", icon: Activity, label: "Manage Consultations", color: "text-emerald-600 bg-emerald-50" },
                                { href: "/doctor-dashboard/patients", icon: Users, label: "View Patients", color: "text-primary-600 bg-primary-50" },
                                { href: "/doctor-dashboard/schedule", icon: Clock, label: "Set Availability", color: "text-purple-600 bg-purple-50" },
                                { href: "/doctor-dashboard/profile", icon: Stethoscope, label: "Edit Profile", color: "text-gold-600 bg-gold-50" },
                            ].map(({ href, icon: Icon, label, color }) => (
                                <Link key={href} href={href}
                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 flex-1">{label}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Profile summary */}
                    {profile && (
                        <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <span className="font-bold text-sm">{user?.name?.[0] || "D"}</span>
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">{user?.name}</p>
                                    <p className="text-primary-200 text-xs">{profile.specialty}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/10 rounded-lg p-2 text-center">
                                    <p className="font-bold text-base">{profile.experience_years || 0}</p>
                                    <p className="text-primary-200 text-[10px]">Years exp.</p>
                                </div>
                                <div className="bg-white/10 rounded-lg p-2 text-center">
                                    <p className="font-bold text-base">{profile.review_count || 0}</p>
                                    <p className="text-primary-200 text-[10px]">Reviews</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
