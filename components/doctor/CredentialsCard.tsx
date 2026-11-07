"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Clock, Upload, Loader2 } from "lucide-react";

interface Credentials {
    licenseNumber: string;
    licenseAuthority: string | null;
    status: "pending" | "approved" | "rejected";
    rejectionReason: string | null;
    submittedAt: string;
}

export default function CredentialsCard() {
    const [cred, setCred] = useState<Credentials | null>(null);
    const [loading, setLoading] = useState(true);
    const [licenseNumber, setLicenseNumber] = useState("");
    const [authority, setAuthority] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/doctor/credentials");
            const json = await res.json().catch(() => ({}));
            setCred(json.data ?? null);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!file) return setError("Please attach a photo or PDF of your license");
        if (file.size > 5 * 1024 * 1024) return setError("The file must be 5 MB or smaller");
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append("licenseNumber", licenseNumber.trim());
            fd.append("licenseAuthority", authority.trim());
            fd.append("file", file);
            // No Content-Type header: the browser sets the multipart boundary itself
            const res = await fetch("/api/doctor/credentials", { method: "POST", body: fd });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || "Upload failed");
            setFile(null); setLicenseNumber(""); setAuthority("");
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    const showForm = !cred || cred.status === "rejected";

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <h2 className="font-extrabold text-slate-900 text-[15px]">Medical license verification</h2>

            {cred?.status === "approved" && (
                <div className="flex items-start gap-2 p-3.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[13px] font-semibold">
                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    Your credentials are verified (license {cred.licenseNumber}).
                </div>
            )}
            {cred?.status === "pending" && (
                <div className="flex items-start gap-2 p-3.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[13px] font-semibold">
                    <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                    Your license is under review. You&apos;ll get a notification when it&apos;s decided.
                </div>
            )}
            {cred?.status === "rejected" && (
                <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-[13px]">
                    <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold">Your credentials were not approved.</p>
                        {cred.rejectionReason && <p className="mt-0.5">Reason: {cred.rejectionReason}</p>}
                        <p className="mt-0.5">Please submit them again below.</p>
                    </div>
                </div>
            )}

            {showForm && (
                <form onSubmit={submit} className="space-y-3">
                    {!cred && (
                        <p className="text-[12px] text-slate-500">
                            Patients can only see your profile after an admin verifies your medical license.
                        </p>
                    )}
                    <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="License number" required minLength={3} maxLength={50}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px]" />
                    <input value={authority} onChange={(e) => setAuthority(e.target.value)}
                        placeholder="Issuing authority (e.g. Ministry of Health)" maxLength={120}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px]" />
                    <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-3.5 py-3 text-[13px] text-slate-500 cursor-pointer hover:bg-slate-50">
                        <Upload className="w-4 h-4" />
                        <span className="truncate">{file ? file.name : "Attach license (PDF, JPG, PNG, WebP · max 5 MB)"}</span>
                        <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {error && <p className="text-[12px] text-rose-600">{error}</p>}
                    <button type="submit" disabled={submitting}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white bg-slate-800 disabled:opacity-60">
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Submit for review
                    </button>
                </form>
            )}
        </div>
    );
}