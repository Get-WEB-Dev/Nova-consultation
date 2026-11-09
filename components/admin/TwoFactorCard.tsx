"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ConfirmDialog, useToast } from "@/components/admin/AdminUI";

export default function TwoFactorCard() {
    const toast = useToast();
    const [factorId, setFactorId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const { data } = await supabase.auth.mfa.listFactors();
        setFactorId(data?.totp?.[0]?.id ?? null); // `totp` only lists verified authenticator apps
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);

    const remove = async () => {
        if (!factorId) return;
        setBusy(true);
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        setBusy(false);
        setConfirm(false);
        if (error) return toast("error", error.message);
        toast("success", "Two-factor authentication removed");
        await load();
    };

    if (loading) return null;

    return (
        <section className="card space-y-3">
            <h2 className="font-semibold text-slate-700">Two-factor authentication</h2>
            {factorId ? (
                <>
                    <p className="flex items-center gap-2 text-sm text-emerald-700">
                        <ShieldCheck className="w-4 h-4" /> Enabled. You&apos;ll be asked for a code from your authenticator app when you sign in.
                    </p>
                    <button onClick={() => setConfirm(true)} className="btn btn-sm btn-secondary">Remove</button>
                </>
            ) : (
                <>
                    <p className="flex items-center gap-2 text-sm text-amber-700">
                        <ShieldAlert className="w-4 h-4" /> Not set up. A password alone is not enough to protect patient data.
                    </p>
                    <Link href="/admin-login/mfa" className="btn btn-sm btn-primary">Set up with an authenticator app</Link>
                </>
            )}
            <ConfirmDialog open={confirm} danger loading={busy} title="Remove two-factor authentication?"
                message="Your account will be protected by your password only. If the server requires two-factor for admins, you will be locked out until you set it up again."
                confirmLabel="Remove" onConfirm={remove} onCancel={() => setConfirm(false)} />
        </section>
    );
}