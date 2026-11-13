"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ChevronDown } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { PageHeader } from "@/components/admin/AdminUI";
import { Panel, SkeletonBlock, PageError, fmtDateTime } from "@/components/admin/kit";
import CodeBlock from "@/components/admin/CodeBlock";

interface Check { id: string; group: string; label: string; status: "ok" | "warn" | "fail"; detail: string; fix?: string }
interface Result { checks: Check[]; summary: { ok: number; warn: number; fail: number }; latencyMs: number; checkedAt: string }

const ICON = {
    ok: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
    warn: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
    fail: <XCircle className="w-4 h-4 text-rose-500 shrink-0" />,
};
const GROUPS = ["Security", "Features", "Database", "Configuration"];

function Row({ c }: { c: Check }) {
    const [open, setOpen] = useState(c.status === "fail");
    return (
        <li className="py-3">
            <div className="flex items-start gap-3">
                {ICON[c.status]}
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700">{c.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 break-words">{c.detail}</p>
                </div>
                {c.fix && (
                    <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline shrink-0">
                        How to fix <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                )}
            </div>
            {c.fix && open && <div className="mt-2.5 ml-7"><CodeBlock code={c.fix} /></div>}
        </li>
    );
}

export default function AdminSystemPage() {
    const [data, setData] = useState<Result | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const run = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData((await adminFetch<{ data: Result }>("/api/admin/system")).data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { run(); }, [run]);

    const s = data?.summary;
    const healthy = s && s.fail === 0 && s.warn === 0;

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader title="System health" subtitle="Is everything installed, configured and secure?"
                right={<button onClick={run} disabled={loading} className="btn btn-sm btn-secondary"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Run checks</button>} />

            {error ? <PageError message={error} onRetry={run} /> : !data || !s ? <SkeletonBlock /> : (
                <>
                    <section className={`card flex items-center gap-4 flex-wrap ${s.fail ? "!border-rose-200 !bg-rose-50" : s.warn ? "!border-amber-200 !bg-amber-50" : "!border-emerald-200 !bg-emerald-50"}`}>
                        {s.fail ? <XCircle className="w-8 h-8 text-rose-500" /> : s.warn ? <AlertTriangle className="w-8 h-8 text-amber-500" /> : <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                        <div className="flex-1 min-w-[200px]">
                            <h2 className="font-display font-bold text-lg text-slate-800">
                                {healthy ? "Everything is healthy" : s.fail ? `${s.fail} thing${s.fail === 1 ? "" : "s"} need fixing` : `${s.warn} recommendation${s.warn === 1 ? "" : "s"}`}
                            </h2>
                            <p className="text-xs text-slate-500">{s.ok} passing · {s.warn} to review · {s.fail} failing · database responded in {data.latencyMs} ms · checked {fmtDateTime(data.checkedAt)}</p>
                        </div>
                    </section>

                    {GROUPS.map((g) => {
                        const items = data.checks.filter((c) => c.group === g);
                        if (!items.length) return null;
                        return (
                            <Panel key={g} title={g}>
                                <ul className="divide-y divide-slate-50">{items.map((c) => <Row key={c.id} c={c} />)}</ul>
                            </Panel>
                        );
                    })}
                    <p className="text-[11px] text-slate-400">This page only reports whether secrets exist. It never shows their values.</p>
                </>
            )}
        </div>
    );
}