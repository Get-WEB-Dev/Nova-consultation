"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, BadgeCheck, Eye, EyeOff, ShieldOff, AlertCircle, Loader2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, PageHeader, ConfirmDialog, EmptyState, timeAgo } from "@/components/admin/AdminUI";

interface DoctorRow {
    id: string; specialty: string; hospital: string | null; experience_years: number; fee: number;
    rating: number; review_count: number; is_verified: boolean; is_published: boolean; created_at: string;
    users: { name: string; email: string } | null;
}

// A doctor is in exactly one of these three groups
const TABS = [
    { key: "pending", label: "Pending", match: (d: DoctorRow) => !d.is_verified },
    { key: "live", label: "Live", match: (d: DoctorRow) => d.is_verified && d.is_published },
    { key: "hidden", label: "Hidden", match: (d: DoctorRow) => d.is_verified && !d.is_published },
] as const;

export default function AdminDoctorsPage() {
    const toast = useToast();
    const [doctors, setDoctors] = useState<DoctorRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("pending");
    const [query, setQuery] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [revoke, setRevoke] = useState<DoctorRow | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<{ data: DoctorRow[] }>("/api/admin/doctors");
            setDoctors(json.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const act = async (d: DoctorRow, action: "verify" | "publish", value: boolean, okMessage: string) => {
        setBusyId(d.id);
        try {
            await adminFetch("/api/admin/doctors", {
                method: "PATCH",
                body: JSON.stringify({ doctorId: d.id, action, value }),
            });
            toast("success", okMessage);
            await load();
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusyId(null);
            setRevoke(null);
        }
    };

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const match = TABS.find((t) => t.key === tab)!.match;
        return doctors.filter((d) =>
            match(d) &&
            (!q || (d.users?.name ?? "").toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || (d.hospital ?? "").toLowerCase().includes(q))
        );
    }, [doctors, tab, query]);

    return (
        <div className="space-y-5 animate-fade-up">
            <PageHeader title="Doctors" subtitle="Approve new doctors and control who appears publicly" />

            <div className="flex gap-2 flex-wrap">
                {TABS.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                        {t.label} <span className="opacity-60">{doctors.filter(t.match).length}</span>
                    </button>
                ))}
            </div>

            <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, specialty or hospital…" className="input-field pl-10" />
            </div>

            {loading ? (
                <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="animate-shimmer h-24 rounded-2xl" />)}</div>
            ) : error ? (
                <div className="card text-center py-8 space-y-3">
                    <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-sm text-slate-600">{error}</p>
                    <button onClick={load} className="btn btn-sm btn-primary">Try again</button>
                </div>
            ) : visible.length === 0 ? (
                <EmptyState text={tab === "pending" ? "No doctors waiting for approval 🎉" : "No doctors in this group"} />
            ) : (
                <div className="space-y-2">
                    {visible.map((d) => {
                        const busy = busyId === d.id;
                        return (
                            <div key={d.id} className="card flex items-center gap-3 flex-wrap sm:flex-nowrap">
                                <div className="w-11 h-11 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center font-bold shrink-0">
                                    {(d.users?.name ?? "?").charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-700 truncate">{d.users?.name ?? "Unknown"}</p>
                                    <p className="text-xs text-slate-400 truncate">{d.users?.email}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {d.specialty}{d.hospital ? ` · ${d.hospital}` : ""} · {d.experience_years}y exp · ${d.fee}
                                    </p>
                                    <p className="text-[11px] text-slate-300">Registered {timeAgo(d.created_at)}{d.review_count > 0 ? ` · ★ ${d.rating} (${d.review_count})` : ""}</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                                    {!d.is_verified ? (
                                        <button disabled={busy} onClick={() => act(d, "verify", true, `${d.users?.name} verified and published`)} className="btn btn-sm btn-success">
                                            <BadgeCheck className="w-3.5 h-3.5" /> Verify & publish
                                        </button>
                                    ) : (
                                        <>
                                            <button disabled={busy}
                                                onClick={() => act(d, "publish", !d.is_published, d.is_published ? "Doctor hidden from public listings" : "Doctor is now public")}
                                                className="btn btn-sm btn-secondary">
                                                {d.is_published ? <><EyeOff className="w-3.5 h-3.5" /> Hide</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
                                            </button>
                                            <button disabled={busy} onClick={() => setRevoke(d)} className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50" title="Revoke verification">
                                                <ShieldOff className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                open={!!revoke}
                danger
                loading={!!busyId}
                title="Revoke verification?"
                message={`${revoke?.users?.name ?? "This doctor"} will be hidden from public listings and move back to Pending.`}
                confirmLabel="Revoke"
                onConfirm={() => revoke && act(revoke, "verify", false, "Verification revoked")}
                onCancel={() => setRevoke(null)}
            />
        </div>
    );
}