"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, KeyRound, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
// import { supabase } from "@/lib/supabase/client";
import { getUser } from "@/lib/supabase/auth";
import { adminFetch } from "@/lib/admin-api";
import SignOutEverywhere from "@/components/admin/SignOutEverywhere";
import { useToast, PageHeader } from "@/components/admin/AdminUI";

interface Health {
    database: { ok: boolean; ms: number; error: string | null };
    auditLogTable: { ok: boolean };
    zoom: { ok: boolean };
    serviceRoleKey: { ok: boolean };
}

export default function AdminSettingsPage() {
    const toast = useToast();
    const me = getUser();

    // ── Change password ──
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [saving, setSaving] = useState(false);

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!me?.email) return;
        if (next.length < 8) return toast("error", "New password must be at least 8 characters");
        if (next !== confirm) return toast("error", "The new passwords don't match");
        if (next === current) return toast("error", "Choose a password different from the current one");

        setSaving(true);
        try {
            // 1) Prove the person at the keyboard knows the current password
            await adminFetch("/api/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ oldPassword: current, newPassword: next }),
            });
            toast("success", "Password updated");
            setCurrent(""); setNext(""); setConfirm("");
        } catch (err: any) {
            toast("error", err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── System health ──
    const [health, setHealth] = useState<Health | null>(null);
    const [healthLoading, setHealthLoading] = useState(true);
    const [healthError, setHealthError] = useState<string | null>(null);

    const loadHealth = useCallback(async () => {
        setHealthLoading(true);
        setHealthError(null);
        try {
            const json = await adminFetch<{ data: Health }>("/api/admin/health");
            setHealth(json.data);
        } catch (e: any) {
            setHealthError(e.message);
        } finally {
            setHealthLoading(false);
        }
    }, []);
    useEffect(() => { loadHealth(); }, [loadHealth]);

    const rows = health ? [
        { label: "Database", ok: health.database.ok, note: health.database.ok ? `Connected · ${health.database.ms} ms` : health.database.error ?? "Cannot reach the database" },
        { label: "Service role key", ok: health.serviceRoleKey.ok, note: health.serviceRoleKey.ok ? "Configured" : "SUPABASE_SERVICE_ROLE_KEY is missing" },
        { label: "Zoom video", ok: health.zoom.ok, note: health.zoom.ok ? "SDK key and secret configured" : "ZOOM_SDK_KEY / ZOOM_SDK_SECRET missing — video calls will fail" },
        { label: "Audit log", ok: health.auditLogTable.ok, note: health.auditLogTable.ok ? "Table ready" : "Table missing — run the audit log SQL in Supabase" },
    ] : [];

    return (
        <div className="space-y-6 animate-fade-up max-w-2xl">
            <PageHeader title="Settings" subtitle="Your admin account and system status" />

            {/* Account */}
            <section className="card flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                    <p className="font-display font-semibold text-slate-800 truncate">{me?.name}</p>
                    <p className="text-sm text-slate-500 truncate">{me?.email}</p>
                </div>
                <span className="badge badge-navy ml-auto">Administrator</span>
            </section>

            {/* Password */}
            <section className="card space-y-4">
                <h2 className="font-display font-semibold text-slate-800 flex items-center gap-2"><KeyRound className="w-4 h-4" /> Change password</h2>
                <form onSubmit={changePassword} className="space-y-3">
                    <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="input-field" placeholder="Current password" autoComplete="current-password" required />
                    <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="input-field" placeholder="New password (min 8 characters)" autoComplete="new-password" required minLength={8} />
                    <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input-field" placeholder="Confirm new password" autoComplete="new-password" required />
                    <button type="submit" disabled={saving} className="btn btn-md btn-primary">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />} Update password
                    </button>
                </form>
            </section>

            {/* Health */}
            <section className="card space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-display font-semibold text-slate-800">System status</h2>
                    <button onClick={loadHealth} disabled={healthLoading} className="btn btn-sm btn-secondary">
                        <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin" : ""}`} /> Re-check
                    </button>
                </div>
                {healthError && <p className="text-sm text-rose-600">{healthError}</p>}
                {healthLoading && !health ? (
                    <div className="animate-shimmer h-24 rounded-xl" />
                ) : (
                    <div className="divide-y divide-slate-50">
                        {rows.map((r) => (
                            <div key={r.label} className="flex items-center gap-3 py-2.5">
                                {r.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-700">{r.label}</p>
                                    <p className="text-xs text-slate-400">{r.note}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
            <SignOutEverywhere />
        </div>
    );
}