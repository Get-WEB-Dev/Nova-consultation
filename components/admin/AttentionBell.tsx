"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

interface Attention { total: number; items: { key: string; label: string; count: number; href: string }[] }

/** The bell in the top bar: everything that needs an admin, from any page. */
export default function AttentionBell() {
    const [data, setData] = useState<Attention>({ total: 0, items: [] });
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try { setData((await adminFetch<{ data: Attention }>("/api/admin/attention")).data); } catch { /* keep the last values */ }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60_000);
        return () => clearInterval(t);
    }, [load]);

    useEffect(() => {
        const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    return (
        <div ref={box} className="relative">
            <button onClick={() => { setOpen((o) => !o); if (!open) load(); }} aria-label={`Alerts: ${data.total} need attention`}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50">
                <Bell className="w-[18px] h-[18px]" />
                {data.total > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {data.total > 99 ? "99+" : data.total}
                    </span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-up z-50">
                    <p className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-50">Needs attention</p>
                    {data.items.length === 0 ? (
                        <p className="flex items-center gap-2 px-4 py-5 text-sm text-emerald-600"><CheckCircle2 className="w-4 h-4" /> All clear</p>
                    ) : (
                        data.items.map((i) => (
                            <Link key={i.key} href={i.href} onClick={() => setOpen(false)} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
                                <span>{i.label}</span>
                                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold">{i.count}</span>
                            </Link>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}