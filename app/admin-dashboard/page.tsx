"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Users, Stethoscope, Calendar, Newspaper, Activity, Clock,
    RefreshCw, ArrowRight, BadgeCheck, AlertCircle, Loader2,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, PageHeader, StatusBadge, timeAgo, EmptyState } from "@/components/admin/AdminUI";

interface Overview {
    stats: {
        totalUsers: number; totalPatients: number; totalDoctors: number; pendingDoctors: number;
        totalConsultations: number; activeConsultations: number; completedConsultations: number;
        totalPosts: number; waitingInQueue: number;
    };
    series: { days: string[]; users: number[]; consultations: number[] };
    recentUsers: { id: string; name: string; email: string; role: string; created_at: string }[];
    recentConsultations: { id: string; status: string; createdAt: string; patientName: string; doctorName: string }[];
    pendingDoctors: { id: string; name: string; email: string; specialty: string; hospital: string | null; createdAt: string }[];
}

export default function AdminDashboardPage() {
    const toast = useToast();
    const [data, setData] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<{ data: Overview }>("/api/admin/stats");
            setData(json.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Approve a doctor straight from the dashboard
    const verifyDoctor = async (doctorId: string) => {
        setVerifyingId(doctorId);
        try {
            await adminFetch("/api/admin/doctors", {
                method: "PATCH",
                body: JSON.stringify({ doctorId, action: "verify", value: true }),
            });
            toast("success", "Doctor verified and published");
            await load();
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setVerifyingId(null);
        }
    };

    if (loading && !data) {
        return (
            <div className="space-y-4">
                <div className="animate-shimmer h-8 w-48 rounded-xl" />
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="animate-shimmer h-24 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="card text-center py-10 space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-sm text-slate-600">{error ?? "Could not load the dashboard"}</p>
                <button onClick={load} className="btn btn-sm btn-primary">Try again</button>
            </div>
        );
    }

    const { stats, series } = data;
    const cards = [
        { icon: Users, label: "Users", value: stats.totalUsers, sub: `${stats.totalPatients} patients`, href: "/admin-dashboard/users", color: "from-primary-600 to-primary-500" },
        { icon: Stethoscope, label: "Doctors", value: stats.totalDoctors, sub: `${stats.pendingDoctors} pending approval`, href: "/admin-dashboard/doctors", color: "from-accent-500 to-accent-400" },
        { icon: Calendar, label: "Consultations", value: stats.totalConsultations, sub: `${stats.completedConsultations} completed`, href: "/admin-dashboard/consultations", color: "from-gold-400 to-gold-500" },
        { icon: Activity, label: "Active now", value: stats.activeConsultations, sub: "live consultations", href: "/admin-dashboard/consultations", color: "from-green-500 to-green-400" },
        { icon: Clock, label: "In queue", value: stats.waitingInQueue, sub: "patients waiting", href: "/admin-dashboard/consultations", color: "from-slate-600 to-slate-500" },
        { icon: Newspaper, label: "Blog posts", value: stats.totalPosts, sub: "all doctors", href: "/admin-dashboard/posts", color: "from-primary-500 to-accent-500" },
    ];

    const max = Math.max(1, ...series.users, ...series.consultations);

    return (
        <div className="space-y-6 animate-fade-up">
            <PageHeader
                title="Admin Dashboard"
                subtitle="System overview and management"
                right={
                    <button onClick={load} disabled={loading} className="btn btn-sm btn-secondary">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                }
            />

            {stats.pendingDoctors > 0 && (
                <Link href="/admin-dashboard/doctors" className="flex items-center gap-3 p-4 rounded-2xl bg-gold-50 border border-gold-200 text-gold-700 hover:shadow-sm transition-all">
                    <BadgeCheck className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium flex-1">
                        {stats.pendingDoctors} doctor{stats.pendingDoctors > 1 ? "s are" : " is"} waiting for verification
                    </p>
                    <ArrowRight className="w-4 h-4" />
                </Link>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {cards.map(({ icon: Icon, label, value, sub, href, color }) => (
                    <Link key={label} href={href} className="card group hover:-translate-y-0.5 transition-all flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm shrink-0`}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-display font-bold text-2xl text-slate-800 leading-none">{value}</p>
                            <p className="text-xs font-medium text-slate-600 mt-1">{label}</p>
                            <p className="text-[11px] text-slate-400 truncate">{sub}</p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Last 7 days chart */}
            <section className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display font-semibold text-slate-800">Last 7 days</h2>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary-500" /> New users</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-400" /> Consultations</span>
                    </div>
                </div>
                <div className="flex items-end gap-2 h-32">
                    {series.days.map((day, i) => (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                            <div className="flex items-end gap-0.5 h-24 w-full justify-center">
                                <div title={`New users: ${series.users[i]}`} className="w-3 rounded-t bg-primary-500"
                                    style={{ height: `${(series.users[i] / max) * 100}%`, minHeight: series.users[i] ? 4 : 2 }} />
                                <div title={`Consultations: ${series.consultations[i]}`} className="w-3 rounded-t bg-accent-400"
                                    style={{ height: `${(series.consultations[i] / max) * 100}%`, minHeight: series.consultations[i] ? 4 : 2 }} />
                            </div>
                            <span className="text-[10px] text-slate-400">
                                {new Date(day + "T00:00:00Z").toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            <div className="grid lg:grid-cols-2 gap-4">
                {/* Pending doctors */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-display font-semibold text-slate-800">Pending approvals</h2>
                        <Link href="/admin-dashboard/doctors" className="text-xs text-primary-600 font-semibold hover:underline">View all</Link>
                    </div>
                    {data.pendingDoctors.length === 0 ? (
                        <EmptyState text="No doctors waiting — you're all caught up 🎉" />
                    ) : (
                        <div className="space-y-2">
                            {data.pendingDoctors.map((d) => (
                                <div key={d.id} className="card flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{d.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{d.specialty}{d.hospital ? ` · ${d.hospital}` : ""}</p>
                                        <p className="text-[11px] text-slate-300">{timeAgo(d.createdAt)}</p>
                                    </div>
                                    <button onClick={() => verifyDoctor(d.id)} disabled={verifyingId === d.id} className="btn btn-sm btn-success">
                                        {verifyingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}
                                        Verify
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Recent consultations */}
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-display font-semibold text-slate-800">Recent consultations</h2>
                        <Link href="/admin-dashboard/consultations" className="text-xs text-primary-600 font-semibold hover:underline">View all</Link>
                    </div>
                    {data.recentConsultations.length === 0 ? (
                        <EmptyState text="No consultations yet" />
                    ) : (
                        <div className="space-y-2">
                            {data.recentConsultations.map((c) => (
                                <div key={c.id} className="card flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{c.patientName} → Dr. {c.doctorName.replace(/^dr\.?\s*/i, "")}</p>
                                        <p className="text-[11px] text-slate-400">{timeAgo(c.createdAt)}</p>
                                    </div>
                                    <StatusBadge status={c.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Recent signups */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display font-semibold text-slate-800">Newest users</h2>
                    <Link href="/admin-dashboard/users" className="text-xs text-primary-600 font-semibold hover:underline">View all</Link>
                </div>
                <div className="card divide-y divide-slate-50 p-0">
                    {data.recentUsers.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{u.name}</p>
                                <p className="text-xs text-slate-400 truncate">{u.email}</p>
                            </div>
                            <span className="badge badge-slate">{u.role}</span>
                            <span className="text-[11px] text-slate-300 hidden sm:block w-16 text-right">{timeAgo(u.created_at)}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}