"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/supabase/auth";

type Mode = "loading" | "challenge" | "enroll";

export default function AdminMfaPage() {
    const router = useRouter();
    const started = useRef(false); // React dev mode runs effects twice; enrol only once
    const [mode, setMode] = useState<Mode>("loading");
    const [factorId, setFactorId] = useState("");
    const [qr, setQr] = useState("");
    const [secret, setSecret] = useState("");
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const init = useCallback(async () => {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) return router.replace("/admin-login");

        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === "aal2") return router.replace("/admin-dashboard");

        const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
        if (listErr) return setError(listErr.message);

        const verified = factors?.totp?.[0];
        if (verified) {
            setFactorId(verified.id);
            return setMode("challenge");
        }

        // Remove half-finished setups; they would block a new one
        for (const f of factors?.all ?? []) {
            if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
        const { data, error: enrollErr } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Nova Admin" });
        if (enrollErr || !data) return setError(enrollErr?.message ?? "Could not start two-factor setup");
        setFactorId(data.id);
        setQr(data.totp.qr_code);
        setSecret(data.totp.secret);
        setMode("enroll");
    }, [router]);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        init();
    }, [init]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
        if (verifyErr) {
            setError(verifyErr.message);
            setCode("");
            setBusy(false);
            return;
        }
        router.replace("/admin-dashboard");
    };

    const cancel = async () => {
        await signOut();
        router.replace("/admin-login");
    };

    return (
        <div className="min-h-screen bg-nova-gradient-soft flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-6 space-y-5">
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center mx-auto mb-3">
                        <Shield className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="font-display font-bold text-xl text-slate-800">
                        {mode === "enroll" ? "Set up two-factor authentication" : "Two-factor verification"}
                    </h1>
                </div>

                {error && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
                    </div>
                )}

                {mode === "loading" && !error && <div className="animate-shimmer h-32 rounded-xl" />}

                {mode === "enroll" && (
                    <div className="space-y-3 text-sm text-slate-600">
                        <p>1. Open an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…) and scan this code.</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qr} alt="Scan with your authenticator app" className="w-44 h-44 mx-auto border border-slate-200 rounded-xl p-2" />
                        <p className="text-xs text-slate-400 text-center break-all">
                            Can&apos;t scan? Enter this key instead: <span className="font-mono text-slate-600">{secret}</span>
                            <br />Keep it somewhere safe. It&apos;s how you recover access if you lose your phone.
                        </p>
                        <p>2. Enter the 6-digit code the app shows.</p>
                    </div>
                )}
                {mode === "challenge" && <p className="text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>}

                {mode !== "loading" && (
                    <form onSubmit={submit} className="space-y-3">
                        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="123456"
                            className="input-field text-center text-xl tracking-[0.4em]" />
                        <button type="submit" disabled={busy || code.length !== 6}
                            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-slate-700 to-slate-600 text-white font-semibold px-5 py-3 rounded-xl disabled:opacity-60">
                            {busy && <Loader2 className="w-4 h-4 animate-spin" />} {mode === "enroll" ? "Turn on & continue" : "Verify"}
                        </button>
                    </form>
                )}

                <button onClick={cancel} className="block mx-auto text-xs text-slate-400 hover:text-slate-600">Cancel and sign out</button>
            </div>
        </div>
    );
}