"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { PageHeader } from "@/components/admin/AdminUI";

interface Analytics {
    series: { day: string; users: number; consultations: number; completed: number }[];
    statuses: Record<string, number>;
    avg_wait_minutes: number | null;
    avg_duration_minutes: number | null;
    avg_rating: number | null;
    top_doctors: { name: string; specialty: string; completed: number; rating: number | null }[];
    by_specialty: { specialty: string; n: number }[];
}
const RANGES = [7, 30, 90];
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function Bars({ values, labels, color }: { values: number[]; labels: string[]; color: string }) {
    const max = Math.max(1, ...values);
    return (
        <div className="flex items-end gap-[2px] h-32">
            {values.map((v, i) => (
                <div key={i} title={`${labels[i]}: ${v}`} className={`flex-1 rounded-t ${color}`}
                    style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }} />
            ))}
        </div>
    );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="card">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-slate-700 mt-1">{value}</p>
            {sub && <p className="text-[11px] text-slate-300 mt-0.5">{sub}</p>}
        </div>
    );
}

export default function AdminAnalyticsPage() {
    const [days, setDays] = useState(30);
    const [data, setData] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<{ data: Analytics }>(`/api/admin/analytics?days=${days}`);
            setData(json.data);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    }, [days]);
    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-6 animate-fade-up">
            <PageHeader title="Analytics" subtitle="How the platform is being used"
                right={
                    <div className="flex gap-2">
                        {RANGES.map((r) => (
                            <button key={r} onClick={() => setDays(r)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${days === r ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                                {r} days
                            </button>
                        ))}
                        <button onClick={load} disabled={loading} className="btn btn-sm btn-secondary">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                } />

            {error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={load} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : !data ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="animate-shimmer h-24 rounded-2xl" />)}</div>
            ) : (() => {
                const days_ = data.series.map((s) => s.day.slice(5));
                const total = sum(data.series.map((s) => s.consultations));
                const done = sum(data.series.map((s) => s.completed));
                const maxStatus = Math.max(1, ...Object.values(data.statuses));
                const maxSpec = Math.max(1, ...data.by_specialty.map((s) => s.n));
                return (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            <Kpi label="New users" value={sum(data.series.map((s) => s.users)).toLocaleString()} sub={`last ${days} days`} />
                            <Kpi label="Consultations" value={total.toLocaleString()} sub={`${done.toLocaleString()} completed`} />
                            <Kpi label="Completion rate" value={total ? `${Math.round((done / total) * 100)}%` : "—"} />
                            <Kpi label="Average wait" value={data.avg_wait_minutes != null ? `${data.avg_wait_minutes} min` : "—"} sub="queue → start" />
                            <Kpi label="Average length" value={data.avg_duration_minutes != null ? `${data.avg_duration_minutes} min` : "—"} />
                            <Kpi label="Patient rating" value={data.avg_rating != null ? `★ ${data.avg_rating}` : "—"} />
                        </div>

                        <div className="grid lg:grid-cols-2 gap-4">
                            <section className="card space-y-3">
                                <h2 className="font-semibold text-slate-700 text-sm">Consultations per day</h2>
                                <Bars values={data.series.map((s) => s.consultations)} labels={days_} color="bg-accent-500" />
                            </section>
                            <section className="card space-y-3">
                                <h2 className="font-semibold text-slate-700 text-sm">New users per day</h2>
                                <Bars values={data.series.map((s) => s.users)} labels={days_} color="bg-primary-500" />
                            </section>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-4">
                            <section className="card space-y-3">
                                <h2 className="font-semibold text-slate-700 text-sm">By status</h2>
                                {Object.keys(data.statuses).length === 0 && <p className="text-xs text-slate-300">No consultations in this period</p>}
                                {Object.entries(data.statuses).map(([s, n]) => (
                                    <div key={s} className="text-xs">
                                        <div className="flex justify-between text-slate-500 mb-1"><span className="capitalize">{s.replace("_", " ")}</span><span>{n}</span></div>
                                        <div className="h-1.5 bg-slate-100 rounded"><div className="h-1.5 rounded bg-slate-500" style={{ width: `${(n / maxStatus) * 100}%` }} /></div>
                                    </div>
                                ))}
                            </section>
                            <section className="card space-y-3">
                                <h2 className="font-semibold text-slate-700 text-sm">By specialty</h2>
                                {data.by_specialty.length === 0 && <p className="text-xs text-slate-300">No data yet</p>}
                                {data.by_specialty.map((s) => (
                                    <div key={s.specialty} className="text-xs">
                                        <div className="flex justify-between text-slate-500 mb-1"><span>{s.specialty}</span><span>{s.n}</span></div>
                                        <div className="h-1.5 bg-slate-100 rounded"><div className="h-1.5 rounded bg-accent-500" style={{ width: `${(s.n / maxSpec) * 100}%` }} /></div>
                                    </div>
                                ))}
                            </section>
                            <section className="card space-y-3">
                                <h2 className="font-semibold text-slate-700 text-sm">Top doctors</h2>
                                {data.top_doctors.length === 0 && <p className="text-xs text-slate-300">No data yet</p>}
                                {data.top_doctors.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <div className="min-w-0"><p className="font-semibold text-slate-700 truncate">{d.name}</p><p className="text-slate-400 truncate">{d.specialty}</p></div>
                                        <div className="text-right shrink-0"><p className="text-slate-600">{d.completed} done</p>{d.rating != null && <p className="text-amber-500">★ {d.rating}</p>}</div>
                                    </div>
                                ))}
                            </section>
                        </div>
                    </>
                );
            })()}
        </div>
    );
}