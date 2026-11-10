"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Stethoscope, Calendar, MessageSquare, Loader2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

interface Hit { type: "user" | "doctor" | "consultation" | "message"; id: string; title: string; subtitle: string; href: string }
const ICON = { user: User, doctor: Stethoscope, consultation: Calendar, message: MessageSquare } as const;
const LABEL = { user: "User", doctor: "Doctor", consultation: "Consultation", message: "Message" } as const;

/** ⌘K / Ctrl+K from anywhere: jump to any user, doctor, consultation or message. */
export default function GlobalSearch() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const [hits, setHits] = useState<Hit[]>([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const latest = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
            else if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        if (!open) return;
        setQ(""); setHits([]); setActive(0);
        setTimeout(() => inputRef.current?.focus(), 10);
    }, [open]);

    useEffect(() => {
        const term = q.trim();
        if (term.length < 2) { setHits([]); setLoading(false); return; }
        const id = ++latest.current;
        setLoading(true);
        const t = setTimeout(async () => {
            try {
                const json = await adminFetch<{ results: Hit[] }>(`/api/admin/search?q=${encodeURIComponent(term)}`);
                if (id === latest.current) { setHits(json.results); setActive(0); }
            } catch {
                if (id === latest.current) setHits([]);
            } finally {
                if (id === latest.current) setLoading(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    const go = (h: Hit) => { setOpen(false); router.push(h.href); };

    const onInputKey = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
        else if (e.key === "Enter" && hits[active]) go(hits[active]);
    };

    return (
        <>
            <button onClick={() => setOpen(true)} aria-label="Search"
                className="flex items-center gap-2 h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-400 hover:bg-white hover:border-slate-300 transition-colors md:w-64">
                <Search className="w-4 h-4" />
                <span className="hidden md:inline flex-1 text-left">Search anything…</span>
                <kbd className="hidden md:inline text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400">⌘K</kbd>
            </button>

            {open && (
                <div className="fixed inset-0 z-[95] flex items-start justify-center pt-[12vh] px-4 bg-black/30" onClick={() => setOpen(false)}>
                    <div role="dialog" aria-label="Search" className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-up" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
                            {loading ? <Loader2 className="w-4 h-4 text-slate-400 animate-spin" /> : <Search className="w-4 h-4 text-slate-400" />}
                            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onInputKey}
                                placeholder="Search users, doctors, messages, or paste a consultation ID…"
                                className="flex-1 h-14 text-sm bg-transparent outline-none placeholder:text-slate-300" />
                            <kbd className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-400">ESC</kbd>
                        </div>
                        <div className="max-h-[50vh] overflow-y-auto">
                            {q.trim().length < 2 ? (
                                <p className="px-4 py-8 text-center text-sm text-slate-400">Type at least 2 letters</p>
                            ) : hits.length === 0 && !loading ? (
                                <p className="px-4 py-8 text-center text-sm text-slate-400">No results for “{q.trim()}”</p>
                            ) : (
                                <ul role="listbox" className="py-1.5">
                                    {hits.map((h, i) => {
                                        const Icon = ICON[h.type];
                                        return (
                                            <li key={`${h.type}-${h.id}`} role="option" aria-selected={i === active}>
                                                <button onClick={() => go(h)} onMouseEnter={() => setActive(i)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === active ? "bg-slate-50" : ""}`}>
                                                    <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-slate-500" /></span>
                                                    <span className="flex-1 min-w-0">
                                                        <span className="block text-sm font-medium text-slate-700 truncate">{h.title}</span>
                                                        <span className="block text-xs text-slate-400 truncate">{h.subtitle}</span>
                                                    </span>
                                                    <span className="text-[10px] uppercase tracking-wide text-slate-300">{LABEL[h.type]}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}