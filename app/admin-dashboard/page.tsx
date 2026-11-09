"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    Users, Stethoscope, Calendar, Activity, RefreshCw, ArrowRight, AlertCircle, BadgeCheck,
    MessageSquare, Star, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, BarChart3,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { actionLabel } from "@/lib/admin-labels";
import { PageHeader, StatusBadge, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface Overview {
    generatedAt: string;
    attention: { licenseReview: number; newMessages: number; lowReviews: number; stuckConsultations: number };
    kpis: {
        totalUsers: number; usersThisWeek: number; doctorsLive: number; doctorsTotal: number;
        consultationsToday: number; consultationsYesterday: number; activeNow: number; waitingNow: number;
    };
    trend: { day: string; users: number; consultations: number; completed: number }[];
    pendingDoctors: { id: string; name: string; specialty: string; hospital: string | null; createdAt: string; license: "pending" | "rejected" | "approved" | "none" }[];
    recentConsultations: { id: string; status: string; createdAt: string; patientName: string; doctorName: string }[];
    recentActivity: { id: string; admin_email: string | null; action: string; details: string | null; created_at: string }[];
}

const TONE = {
    rose: "bg-rose-50 border-rose-200 text-rose-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    slate: "bg-slate-50 border-slate-200 text-slate-700",
} as const;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const LICENSE_BADGE = {
    pending: { cls: "badge-gold", text: "License submitted" },
    rejected: { cls: "badge-rose", text: "Resubmission needed" },
    approved: { cls: "badge-green", text: "Approved" },
    none: { cls: "badge-slate", text: "No license yet" },
} as const;

function Kpi({ icon: Icon, label, value, sub, href, delta }: {
    icon: any; label: string; value: string | number; sub: string; href: string; delta?: number | null;
}) {
    return (
        <Link href={href} className="card hover:-translate-y-0.5 transition-all space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{label}</span>
                <Icon className="w-4 h-4 text-slate-300" />
            </div>
            <div className="flex items-end gap-2">
                <span className="font-display font-bold text-3xl text-slate-800 leading-none">{value}</span>
                {delta != null && delta !== 0 && (
                    <span className={`flex items-center text-[11px] font-semibold mb-0.5 ${delta > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {delta > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                        {Math.abs(delta)}
                    </span>
                )}
            </div>
            <p className="text-[11px] text-slate-400">{sub}</p>
        </Link>
    );
}

function SectionHead({ title, href, label = "View all" }: { title: string; href?: string; label?: string }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-slate-800">{title}</h2>
            {href && <Link href={href} className="text-xs text-primary-600 font-semibold hover:underline">{label}</Link>}
        </div>
    );
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // `silent` refreshes in the background without flashing a loading state
    const load = useCallback(async (silent = false) => {
        if (!silent) { setLoading(true); setError(null); }
        try {
            const json = await adminFetch<{ data: Overview }>("/api/admin/stats");
            setData(json.data);
        } catch (e: any) {
            if (!silent) setError(e.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        // Keep the numbers live: refresh every 30 s while the tab is visible
        const timer = setInterval(() => { if (document.visibilityState === "visible") load(true); }, 30_000);
        return () => clearInterval(timer);
    }, [load]);

    if (loading && !data) {
        return (
            <div className="space-y-4">
                <div className="animate-shimmer h-8 w-56 rounded-xl" />
                <div className="animate-shimmer h-16 rounded-2xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="animate-shimmer h-28 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="card text-center py-10 space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-sm text-slate-600">{error ?? "Could not load the dashboard"}</p>
                <button onClick={() => load()} className="btn btn-sm btn-primary">Try again</button>
            </div>
        );
    }

    const { attention: a, kpis: k, trend } = data;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    const items = [
        {
            n: a.stuckConsultations, tone: "rose" as const, icon: AlertTriangle, href: "/admin-dashboard/consultations", cta: "Check",
            text: `${plural(a.stuckConsultations, "consultation")} stuck for over 6 hours`
        },
        {
            n: a.licenseReview, tone: "amber" as const, icon: BadgeCheck, href: "/admin-dashboard/doctors", cta: "Review",
            text: `${plural(a.licenseReview, "doctor license")} waiting for review`
        },
        {
            n: a.newMessages, tone: "slate" as const, icon: MessageSquare, href: "/admin-dashboard/messages", cta: "Open",
            text: `${plural(a.newMessages, "new contact message")}`
        },
        {
            n: a.lowReviews, tone: "slate" as const, icon: Star, href: "/admin-dashboard/reviews", cta: "Moderate",
            text: `${plural(a.lowReviews, "low-rated review")} this week`
        },
    ].filter((i) => i.n > 0);

    const maxTrend = Math.max(1, ...trend.map((t) => t.consultations));
    const todayDelta = k.consultationsToday - k.consultationsYesterday;

    return (
        <div className="space-y-6 animate-fade-up">
            <PageHeader
                title={greeting}
                subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                right={
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live · updated {timeAgo(data.generatedAt)}
                        </span>
                        <button onClick={() => load()} disabled={loading} className="btn btn-sm btn-secondary">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                        </button>
                    </div>
                }
            />

            {/* 1. What needs me right now */}
            <section className="space-y-2">
                {items.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-medium">All clear. Nothing needs your attention right now.</p>
                    </div>
                ) : (
                    items.map(({ n, tone, icon: Icon, href, cta, text }) => (
                        <Link key={href} href={href} className={`flex items-center gap-3 p-3.5 rounded-2xl border hover:shadow-sm transition-all ${TONE[tone]}`}>
                            <Icon className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-medium flex-1">{text}</p>
                            <span className="flex items-center gap-1 text-xs font-semibold">{cta} <ArrowRight className="w-3.5 h-3.5" /></span>
                        </Link>
                    ))
                )}
            </section>

            {/* 2. Headline numbers */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi icon={Users} label="Users" value={k.totalUsers.toLocaleString()} sub={`+${k.usersThisWeek} this week`} href="/admin-dashboard/users" />
                <Kpi icon={Stethoscope} label="Doctors live" value={k.doctorsLive} sub={`of ${k.doctorsTotal} registered`} href="/admin-dashboard/doctors" />
                <Kpi icon={Calendar} label="Consultations today" value={k.consultationsToday} sub={`${k.consultationsYesterday} yesterday`} href="/admin-dashboard/consultations" delta={todayDelta} />
                <Kpi icon={Activity} label="Live now" value={k.activeNow} sub={`${k.waitingNow} waiting in queue`} href="/admin-dashboard/consultations" />
            </div>

            {/* 3. Trend + pending approvals */}
            <div className="grid lg:grid-cols-3 gap-4">
                <section className="card lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display font-semibold text-slate-800">Consultations, last 7 days</h2>
                        <Link href="/admin-dashboard/analytics" className="flex items-center gap-1 text-xs text-primary-600 font-semibold hover:underline">
                            <BarChart3 className="w-3.5 h-3.5" /> Full analytics
                        </Link>
                    </div>
                    {trend.length === 0 ? (
                        <p className="text-sm text-slate-300 py-8 text-center">No data yet</p>
                    ) : (
                        <>
                            <div className="flex items-end gap-2">
                                {trend.map((t) => {
                                    const height = (t.consultations / maxTrend) * 100;
                                    const done = t.consultations ? (t.completed / t.consultations) * 100 : 0;
                                    return (
                                        <div key={t.day} className="flex-1 flex flex-col items-center gap-1"
                                            title={`${t.day}: ${t.consultations} consultations, ${t.completed} completed, ${t.users} new users`}>
                                            <div className="w-full h-28 flex items-end">
                                                <div className="w-full rounded-t bg-accent-200 relative overflow-hidden"
                                                    style={{ height: `${height}%`, minHeight: t.consultations ? 4 : 2 }}>
                                                    <div className="absolute bottom-0 inset-x-0 bg-accent-500" style={{ height: `${done}%` }} />
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(t.day + "T00:00:00Z").toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-500" /> Completed</span>
                                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-200" /> Other</span>
                            </div>
                        </>
                    )}
                </section>

                <section>
                    <SectionHead title="Pending approvals" href="/admin-dashboard/doctors" />
                    {data.pendingDoctors.length === 0 ? (
                        <EmptyState text="No doctors waiting" />
                    ) : (
                        <div className="space-y-2">
                            {data.pendingDoctors.map((d) => (
                                <Link key={d.id} href="/admin-dashboard/doctors" className="card flex items-center gap-3 hover:shadow-sm transition-all">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{d.name}</p>
                                        <p className="text-xs text-slate-400 truncate">{d.specialty}{d.hospital ? ` · ${d.hospital}` : ""}</p>
                                        <span className={`badge ${LICENSE_BADGE[d.license].cls} mt-1`}>{LICENSE_BADGE[d.license].text}</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* 4. Recent activity */}
            <div className="grid lg:grid-cols-2 gap-4">
                <section>
                    <SectionHead title="Recent consultations" href="/admin-dashboard/consultations" />
                    {data.recentConsultations.length === 0 ? (
                        <EmptyState text="No consultations yet" />
                    ) : (
                        <div className="card p-0 divide-y divide-slate-50">
                            {data.recentConsultations.map((c) => (
                                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">
                                            {c.patientName} → Dr. {c.doctorName.replace(/^dr\.?\s*/i, "")}
                                        </p>
                                        <p className="text-[11px] text-slate-400">{timeAgo(c.createdAt)}</p>
                                    </div>
                                    <StatusBadge status={c.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section>
                    <SectionHead title="Recent admin activity" href="/admin-dashboard/activity" />
                    {data.recentActivity.length === 0 ? (
                        <EmptyState text="No admin activity yet" />
                    ) : (
                        <div className="card p-0 divide-y divide-slate-50">
                            {data.recentActivity.map((e) => (
                                <div key={e.id} className="px-4 py-3">
                                    <p className="text-sm text-slate-700">
                                        <span className="font-semibold">{e.admin_email ?? "An admin"}</span> {actionLabel(e.action)}
                                    </p>
                                    <p className="text-[11px] text-slate-400 truncate">
                                        {e.details ? `${e.details} · ` : ""}{timeAgo(e.created_at)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}