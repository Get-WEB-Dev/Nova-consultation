"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw, TrendingUp, TrendingDown, Users, Star, CheckCircle2, Wallet, Clock, Repeat } from "lucide-react";

interface Analytics {
    summary: {
        totalSeen: number; thisMonth: number; lastMonth: number; completionRate: number;
        missed: number; cancelled: number; uniquePatients: number; returningPatients: number;
        avgDurationMinutes: number; avgRating: number; ratingCount: number;
        fee: number; earningsThisMonth: number; earningsTotal: number;
    };
    last30: { days: string[]; counts: number[] };
    byWeekday: number[];
    outcomes: Record<string, number>;
    ratingDistribution: number[];
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const OUTCOME_LABEL: Record<string, string> = {
    completed: "Resolved", follow_up: "Needs follow-up", referred: "Referred", emergency: "Emergency",
};
const nf = new Intl.NumberFormat();

function Stat({ icon: Icon, label, value, sub, tone = "blue" }: { icon: any; label: string; value: string; sub?: React.ReactNode; tone?: "blue" | "green" | "amber" | "violet" }) {
    const tones = { blue: "bg-blue-50 text-blue-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600" };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon className="w-5 h-5" /></div>
            <div className="min-w-0">
                <p className="text-[22px] font-extrabold text-slate-900 leading-none">{value}</p>
                <p className="text-[12px] font-semibold text-slate-600 mt-1.5">{label}</p>
                {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function AnalyticsPage() {
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/doctor/analytics");
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error || "Could not load your analytics");
            setData(j.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    if (loading && !data) {
        return (
            <div className="space-y-4 animate-pulse max-w-5xl">
                <div className="h-8 w-48 bg-white rounded-xl" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-white rounded-2xl" />)}</div>
                <div className="h-48 bg-white rounded-2xl" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 text-center py-10 space-y-3 max-w-md mx-auto">
                <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                <p className="text-sm text-slate-600">{error ?? "Something went wrong"}</p>
                <button onClick={load} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">Try again</button>
            </div>
        );
    }

    const s = data.summary;
    const change = s.lastMonth > 0 ? Math.round(((s.thisMonth - s.lastMonth) / s.lastMonth) * 100) : null;
    const maxDay = Math.max(1, ...data.last30.counts);
    const maxWeekday = Math.max(1, ...data.byWeekday);
    const maxRating = Math.max(1, ...data.ratingDistribution);
    const outcomeEntries = Object.entries(data.outcomes);
    const outcomeTotal = outcomeEntries.reduce((a, [, n]) => a + n, 0);

    return (
        <div className="space-y-5 max-w-5xl pb-10">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="font-extrabold text-slate-900 text-[20px]">Analytics</h1>
                    <p className="text-[12px] text-slate-400 mt-0.5">Your performance over the last 12 months</p>
                </div>
                <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            {s.totalSeen === 0 && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
                    No completed consultations yet. Your numbers will appear here after your first consultation.
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat icon={CheckCircle2} tone="blue" label="Consultations this month" value={nf.format(s.thisMonth)}
                    sub={change === null ? "No data for last month" : (
                        <span className={`inline-flex items-center gap-1 ${change >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(change)}% vs last month
                        </span>
                    )} />
                <Stat icon={Star} tone="amber" label="Average rating" value={s.ratingCount ? s.avgRating.toFixed(1) : "—"} sub={`${s.ratingCount} review${s.ratingCount === 1 ? "" : "s"}`} />
                <Stat icon={Users} tone="violet" label="Patients seen" value={nf.format(s.uniquePatients)} sub={`${s.returningPatients} returning`} />
                <Stat icon={Wallet} tone="green" label="Est. earnings this month" value={nf.format(s.earningsThisMonth)} sub={`${nf.format(s.fee)} per consultation`} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Stat icon={CheckCircle2} tone="green" label="Completion rate" value={`${s.completionRate}%`} sub={`${s.missed} missed · ${s.cancelled} cancelled`} />
                <Stat icon={Clock} tone="blue" label="Average length" value={s.avgDurationMinutes ? `${s.avgDurationMinutes} min` : "—"} />
                <Stat icon={Repeat} tone="violet" label="Total consultations" value={nf.format(s.totalSeen)} sub="last 12 months" />
                <Stat icon={Wallet} tone="green" label="Est. earnings (12 mo)" value={nf.format(s.earningsTotal)} sub="fee × consultations" />
            </div>

            {/* Last 30 days */}
            <section className="bg-white rounded-2xl border border-slate-100 p-5">
                <h2 className="font-bold text-slate-800 text-[14px] mb-4">Last 30 days</h2>
                <div className="flex items-end gap-[3px] h-32">
                    {data.last30.days.map((day, i) => (
                        <div key={day} className="flex-1 flex flex-col justify-end h-full" title={`${new Date(day + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}: ${data.last30.counts[i]}`}>
                            <div className="w-full rounded-t bg-blue-500/80 hover:bg-blue-600 transition-colors"
                                style={{ height: `${(data.last30.counts[i] / maxDay) * 100}%`, minHeight: data.last30.counts[i] ? 4 : 2, opacity: data.last30.counts[i] ? 1 : 0.25 }} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-2">
                    <span>{new Date(data.last30.days[0] + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}</span>
                    <span>Today</span>
                </div>
            </section>

            <div className="grid lg:grid-cols-3 gap-4">
                {/* Weekdays */}
                <section className="bg-white rounded-2xl border border-slate-100 p-5">
                    <h2 className="font-bold text-slate-800 text-[14px] mb-4">Busiest days</h2>
                    <div className="space-y-2">
                        {WEEKDAYS.map((d, i) => (
                            <div key={d} className="flex items-center gap-2 text-[12px]">
                                <span className="w-8 text-slate-500 font-semibold">{d}</span>
                                <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(data.byWeekday[i] / maxWeekday) * 100}%` }} />
                                </div>
                                <span className="w-6 text-right text-slate-500">{data.byWeekday[i]}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Ratings */}
                <section className="bg-white rounded-2xl border border-slate-100 p-5">
                    <h2 className="font-bold text-slate-800 text-[14px] mb-4">Ratings</h2>
                    {s.ratingCount === 0 ? (
                        <p className="text-[12px] text-slate-400">No reviews yet</p>
                    ) : (
                        <div className="space-y-2">
                            {[5, 4, 3, 2, 1].map((n) => (
                                <div key={n} className="flex items-center gap-2 text-[12px]">
                                    <span className="w-8 text-slate-500 font-semibold flex items-center gap-0.5">{n}<Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
                                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(data.ratingDistribution[n - 1] / maxRating) * 100}%` }} />
                                    </div>
                                    <span className="w-6 text-right text-slate-500">{data.ratingDistribution[n - 1]}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Outcomes */}
                <section className="bg-white rounded-2xl border border-slate-100 p-5">
                    <h2 className="font-bold text-slate-800 text-[14px] mb-4">How consultations ended</h2>
                    {outcomeTotal === 0 ? (
                        <p className="text-[12px] text-slate-400">Record an outcome in your consultation notes to see this.</p>
                    ) : (
                        <div className="space-y-3">
                            {outcomeEntries.sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                                <div key={k}>
                                    <div className="flex justify-between text-[12px] mb-1">
                                        <span className="text-slate-600 font-semibold">{OUTCOME_LABEL[k] ?? k}</span>
                                        <span className="text-slate-400">{n} · {Math.round((n / outcomeTotal) * 100)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${k === "emergency" ? "bg-rose-500" : k === "follow_up" ? "bg-amber-400" : k === "referred" ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${(n / outcomeTotal) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <p className="text-[11px] text-slate-400">Earnings are estimates (your fee × completed consultations). They are not payment records.</p>
        </div>
    );
}