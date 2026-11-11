"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Printer, TrendingUp, TrendingDown } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { saveText } from "@/lib/download";
import { toCsv } from "@/lib/server/admin-list";
import { PageHeader } from "@/components/admin/AdminUI";
import { Panel, SkeletonBlock, PageError, fmtDate } from "@/components/admin/kit";

interface Report {
    period: { from: string; to: string; days: number; bucket: "day" | "week" };
    kpis: {
        new_users: number; new_users_prev: number; consultations: number; consultations_prev: number;
        completed: number; completed_prev: number; missed: number; cancelled: number;
        active_patients: number; active_patients_prev: number; active_doctors: number; retained_patients: number;
        avg_wait_minutes: number | null; avg_duration_minutes: number | null; avg_rating: number | null;
        estimated_value: number; doctors_live: number; total_users: number;
    };
    funnel: { signed_up: number; first_consultation: number; repeat: number };
    series: { day: string; users: number; consultations: number; completed: number }[];
    by_specialty: { specialty: string; consultations: number; completed: number; doctors_live: number }[];
    top_doctors: { id: string; name: string; specialty: string; completed: number; rating: number | null; value: number }[];
    ratings: Record<string, number>;
    statuses: Record<string, number>;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));
const PRESETS = [
    { key: "30", label: "Last 30 days", range: () => ({ from: daysAgo(29), to: iso(new Date()) }) },
    { key: "90", label: "Last 90 days", range: () => ({ from: daysAgo(89), to: iso(new Date()) }) },
    { key: "ytd", label: "This year", range: () => ({ from: `${new Date().getUTCFullYear()}-01-01`, to: iso(new Date()) }) },
    { key: "365", label: "Last 12 months", range: () => ({ from: daysAgo(364), to: iso(new Date()) }) },
];

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);

function Delta({ cur, prev }: { cur: number; prev: number }) {
    if (!prev) return <span className="text-[11px] text-slate-300">{cur ? "new" : "—"}</span>;
    const change = Math.round(((cur - prev) / prev) * 100);
    if (change === 0) return <span className="text-[11px] text-slate-400">no change</span>;
    const up = change > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-emerald-600" : "text-rose-500"}`}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {Math.abs(change)}%
        </span>
    );
}

function Kpi({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: { cur: number; prev: number } }) {
    return (
        <div className="card space-y-1 print:break-inside-avoid">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <div className="flex items-end gap-2">
                <span className="font-display font-bold text-2xl text-slate-800 leading-tight">{value}</span>
                {delta && <Delta {...delta} />}
            </div>
            {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
        </div>
    );
}

function Bars({ values, labels, color }: { values: number[]; labels: string[]; color: string }) {
    const max = Math.max(1, ...values);
    return (
        <div className="flex items-end gap-[2px] h-28" role="img" aria-label="Bar chart">
            {values.map((v, i) => (
                <div key={i} title={`${labels[i]}: ${v}`} className={`flex-1 rounded-t ${color}`} style={{ height: `${(v / max) * 100}%`, minHeight: v ? 2 : 0 }} />
            ))}
        </div>
    );
}

function Meter({ label, value, total, tone = "bg-primary-500" }: { label: string; value: number; total: number; tone?: string }) {
    const width = total ? (value / total) * 100 : 0;
    return (
        <div className="text-xs">
            <div className="flex justify-between text-slate-500 mb-1"><span>{label}</span><span>{value.toLocaleString()}{total ? ` · ${Math.round(width)}%` : ""}</span></div>
            <div className="h-2 bg-slate-100 rounded"><div className={`h-2 rounded ${tone}`} style={{ width: `${width}%` }} /></div>
        </div>
    );
}

export default function AdminReportsPage() {
    const [range, setRange] = useState(PRESETS[0].range());
    const [preset, setPreset] = useState("30");
    const [data, setData] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<{ data: Report }>(`/api/admin/reports?from=${range.from}&to=${range.to}`);
            setData(json.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [range.from, range.to]);
    useEffect(() => { load(); }, [load]);

    const exportCsv = () => {
        if (!data) return;
        const k = data.kpis;
        const rows: { section: string; item: string; value: unknown; previous?: unknown }[] = [
            { section: "Summary", item: "New users", value: k.new_users, previous: k.new_users_prev },
            { section: "Summary", item: "Consultations", value: k.consultations, previous: k.consultations_prev },
            { section: "Summary", item: "Completed consultations", value: k.completed, previous: k.completed_prev },
            { section: "Summary", item: "Active patients", value: k.active_patients, previous: k.active_patients_prev },
            { section: "Summary", item: "Active doctors", value: k.active_doctors },
            { section: "Summary", item: "Retained patients", value: k.retained_patients },
            { section: "Summary", item: "Average wait (min)", value: k.avg_wait_minutes },
            { section: "Summary", item: "Average rating", value: k.avg_rating },
            { section: "Summary", item: "Estimated value (fee x completed)", value: k.estimated_value },
            { section: "Funnel", item: "Patients who signed up", value: data.funnel.signed_up },
            { section: "Funnel", item: "Completed a first consultation", value: data.funnel.first_consultation },
            { section: "Funnel", item: "Came back for a second", value: data.funnel.repeat },
            ...data.by_specialty.flatMap((s) => [
                { section: "Specialty", item: `${s.specialty}: consultations`, value: s.consultations },
                { section: "Specialty", item: `${s.specialty}: live doctors`, value: s.doctors_live },
            ]),
            ...data.top_doctors.map((d) => ({ section: "Top doctors", item: `${d.name} (${d.specialty}): completed`, value: d.completed })),
        ];
        saveText(`nova-report-${data.period.from}_to_${data.period.to}.csv`, toCsv(rows, [
            { header: "Section", value: (r) => r.section },
            { header: "Item", value: (r) => r.item },
            { header: "Value", value: (r) => r.value },
            { header: "Previous period", value: (r) => r.previous },
        ]), "text/csv;charset=utf-8");
    };

    const k = data?.kpis;
    const totalDemand = data ? data.by_specialty.reduce((s, x) => s + x.consultations, 0) : 0;
    const totalDoctors = data ? data.by_specialty.reduce((s, x) => s + x.doctors_live, 0) : 0;
    const avgLoad = totalDoctors ? totalDemand / totalDoctors : 0;

    return (
        <div className="space-y-6 animate-fade-up">
            <div className="hidden print:block">
                <h1 className="font-display font-bold text-2xl text-slate-800">Nova Health: Platform report</h1>
                {data && <p className="text-sm text-slate-500">{fmtDate(data.period.from)} to {fmtDate(data.period.to)} · generated {new Date().toLocaleString()}</p>}
            </div>

            <div className="print:hidden space-y-4">
                <PageHeader title="Reports" subtitle="Performance of the platform over any period, compared with the period before it"
                    right={
                        <div className="flex gap-2">
                            <button onClick={exportCsv} disabled={!data} className="btn btn-sm btn-secondary"><Download className="w-3.5 h-3.5" /> CSV</button>
                            <button onClick={() => window.print()} disabled={!data} className="btn btn-sm btn-primary"><Printer className="w-3.5 h-3.5" /> Print / PDF</button>
                        </div>
                    } />
                <div className="flex gap-2 flex-wrap items-center">
                    {PRESETS.map((p) => (
                        <button key={p.key} onClick={() => { setPreset(p.key); setRange(p.range()); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${preset === p.key ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                            {p.label}
                        </button>
                    ))}
                    <span className="mx-1 text-slate-200">|</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">From
                        <input type="date" value={range.from} max={range.to} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, from: e.target.value })); }} className="input-field !w-auto !py-1.5 text-xs" />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">To
                        <input type="date" value={range.to} min={range.from} max={iso(new Date())} onChange={(e) => { setPreset("custom"); setRange((r) => ({ ...r, to: e.target.value })); }} className="input-field !w-auto !py-1.5 text-xs" />
                    </label>
                </div>
            </div>

            {error ? (
                <PageError message={error} onRetry={load} />
            ) : !data || !k ? (
                <SkeletonBlock />
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Kpi label="New users" value={k.new_users.toLocaleString()} sub={`${k.total_users.toLocaleString()} in total`} delta={{ cur: k.new_users, prev: k.new_users_prev }} />
                        <Kpi label="Active patients" value={k.active_patients.toLocaleString()} sub="had at least one session" delta={{ cur: k.active_patients, prev: k.active_patients_prev }} />
                        <Kpi label="Consultations" value={k.consultations.toLocaleString()} sub={`${k.completed.toLocaleString()} completed`} delta={{ cur: k.consultations, prev: k.consultations_prev }} />
                        <Kpi label="Completion rate" value={pct(k.completed, k.consultations) != null ? `${pct(k.completed, k.consultations)}%` : "—"} sub={`${k.missed} missed · ${k.cancelled} cancelled`} />
                        <Kpi label="Patient retention" value={pct(k.retained_patients, k.active_patients_prev) != null ? `${pct(k.retained_patients, k.active_patients_prev)}%` : "—"} sub="of last period's patients came back" />
                        <Kpi label="Average wait" value={k.avg_wait_minutes != null ? `${k.avg_wait_minutes} min` : "—"} sub="request → start" />
                        <Kpi label="Patient rating" value={k.avg_rating != null ? `★ ${k.avg_rating}` : "—"} sub={k.avg_duration_minutes != null ? `${k.avg_duration_minutes} min average session` : undefined} />
                        <Kpi label="Estimated value" value={k.estimated_value.toLocaleString()} sub="doctor fee × completed sessions" />
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Panel title="Patient journey" className="print:break-inside-avoid">
                            <p className="text-xs text-slate-400 mb-3">Patients who signed up in this period</p>
                            <div className="space-y-3">
                                <Meter label="Signed up" value={data.funnel.signed_up} total={data.funnel.signed_up} tone="bg-slate-400" />
                                <Meter label="Completed a first consultation" value={data.funnel.first_consultation} total={data.funnel.signed_up} tone="bg-primary-500" />
                                <Meter label="Came back for a second" value={data.funnel.repeat} total={data.funnel.signed_up} tone="bg-accent-500" />
                            </div>
                        </Panel>
                        <Panel title="Session quality" className="print:break-inside-avoid">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-400">Ratings</p>
                                    {[5, 4, 3, 2, 1].map((n) => (
                                        <Meter key={n} label={`${n} ★`} value={data.ratings[String(n)] ?? 0} total={Object.values(data.ratings).reduce((a, b) => a + b, 0)} tone="bg-amber-400" />
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-400">Outcomes</p>
                                    {Object.entries(data.statuses).length === 0 && <p className="text-xs text-slate-300">No sessions</p>}
                                    {Object.entries(data.statuses).map(([s, n]) => <Meter key={s} label={s.replace("_", " ")} value={n} total={k.consultations} tone="bg-slate-500" />)}
                                </div>
                            </div>
                        </Panel>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Panel title={`Consultations per ${data.period.bucket}`} className="print:break-inside-avoid">
                            <Bars values={data.series.map((s) => s.consultations)} labels={data.series.map((s) => s.day)} color="bg-accent-500" />
                        </Panel>
                        <Panel title={`New users per ${data.period.bucket}`} className="print:break-inside-avoid">
                            <Bars values={data.series.map((s) => s.users)} labels={data.series.map((s) => s.day)} color="bg-primary-500" />
                        </Panel>
                    </div>

                    <Panel title="Supply and demand by specialty" className="print:break-inside-avoid">
                        {data.by_specialty.length === 0 ? <p className="text-sm text-slate-300">No doctors registered yet</p> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="text-left text-xs text-slate-400"><th className="py-2 font-medium">Specialty</th><th className="font-medium text-right">Sessions</th><th className="font-medium text-right">Completed</th><th className="font-medium text-right">Live doctors</th><th className="font-medium text-right">Sessions / doctor</th><th /></tr></thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.by_specialty.map((s) => {
                                            const load = s.doctors_live ? s.consultations / s.doctors_live : null;
                                            const high = s.consultations > 0 && (s.doctors_live === 0 || (load != null && avgLoad > 0 && load > avgLoad * 1.5));
                                            return (
                                                <tr key={s.specialty}>
                                                    <td className="py-2.5 font-medium text-slate-700">{s.specialty}</td>
                                                    <td className="text-right text-slate-600">{s.consultations}</td>
                                                    <td className="text-right text-slate-600">{s.completed}</td>
                                                    <td className="text-right text-slate-600">{s.doctors_live}</td>
                                                    <td className="text-right text-slate-600">{load != null ? load.toFixed(1) : "—"}</td>
                                                    <td className="text-right">{high && <span className="badge badge-rose">Needs more doctors</span>}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>

                    <Panel title="Top doctors" className="print:break-inside-avoid">
                        {data.top_doctors.length === 0 ? <p className="text-sm text-slate-300">No completed sessions in this period</p> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="text-left text-xs text-slate-400"><th className="py-2 font-medium">Doctor</th><th className="font-medium">Specialty</th><th className="font-medium text-right">Completed</th><th className="font-medium text-right">Rating</th><th className="font-medium text-right">Est. value</th></tr></thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.top_doctors.map((d) => (
                                            <tr key={d.id}>
                                                <td className="py-2.5"><Link href={`/admin-dashboard/doctors/${d.id}`} className="font-medium text-slate-700 hover:underline">Dr. {d.name.replace(/^dr\.?\s*/i, "")}</Link></td>
                                                <td className="text-slate-500">{d.specialty}</td>
                                                <td className="text-right text-slate-600">{d.completed}</td>
                                                <td className="text-right text-amber-500">{d.rating != null ? `★ ${d.rating}` : "—"}</td>
                                                <td className="text-right text-slate-600">{Number(d.value).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Comparisons are against the {data.period.days} days immediately before {fmtDate(data.period.from)}. “Estimated value” adds up each doctor’s listed fee for completed
                        sessions. It is not collected revenue, because payments are not processed on the platform yet.
                    </p>
                </>
            )}
        </div>
    );
}