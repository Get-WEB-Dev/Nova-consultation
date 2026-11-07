"use client";

import { useEffect, useState } from "react";
import { X, FileText, BadgeCheck, XCircle, Loader2, ExternalLink } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";
import { useToast, timeAgo } from "@/components/admin/AdminUI";

interface Creds {
    licenseNumber: string;
    licenseAuthority: string | null;
    status: "pending" | "approved" | "rejected";
    rejectionReason: string | null;
    submittedAt: string;
    documentUrl: string;
}

export default function DoctorReviewModal({ doctor, onClose, onDone }: {
    doctor: { id: string; name: string; specialty: string; hospital: string | null };
    onClose: () => void;
    onDone: () => void;
}) {
    const toast = useToast();
    const [creds, setCreds] = useState<Creds | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        adminFetch<{ data: Creds | null }>(`/api/admin/doctors/credentials?doctorId=${doctor.id}`)
            .then((j) => { if (!cancelled) setCreds(j.data); })
            .catch((e) => { if (!cancelled) setError(e.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [doctor.id]);

    const decide = async (kind: "approve" | "reject") => {
        if (kind === "reject" && reason.trim().length < 10) {
            return toast("error", "Write a reason of at least 10 characters");
        }
        setBusy(true);
        try {
            await adminFetch("/api/admin/doctors", {
                method: "PATCH",
                body: JSON.stringify(
                    kind === "approve"
                        ? { doctorId: doctor.id, action: "verify", value: true }
                        : { doctorId: doctor.id, action: "reject", reason: reason.trim() }
                ),
            });
            toast("success", kind === "approve" ? `${doctor.name} approved and published` : `${doctor.name} was rejected`);
            onDone();
        } catch (e: any) {
            toast("error", e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 animate-fade-up" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="font-display font-semibold text-slate-800 truncate">{doctor.name}</h3>
                        <p className="text-xs text-slate-500">{doctor.specialty}{doctor.hospital ? ` · ${doctor.hospital}` : ""}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-300 hover:text-slate-500"><X className="w-4 h-4" /></button>
                </div>

                {loading ? (
                    <div className="animate-shimmer h-28 rounded-xl" />
                ) : error ? (
                    <p className="text-sm text-rose-600">{error}</p>
                ) : !creds ? (
                    <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4">
                        This doctor hasn&apos;t submitted a medical license yet, so they can&apos;t be approved.
                    </p>
                ) : (
                    <div className="space-y-3 text-sm">
                        <div className="rounded-xl bg-slate-50 p-4 space-y-1">
                            <p><span className="text-slate-400">License no.</span> <span className="font-semibold text-slate-700">{creds.licenseNumber}</span></p>
                            <p><span className="text-slate-400">Issued by</span> <span className="text-slate-700">{creds.licenseAuthority || "—"}</span></p>
                            <p><span className="text-slate-400">Submitted</span> <span className="text-slate-700">{timeAgo(creds.submittedAt)}</span></p>
                        </div>
                        <a href={creds.documentUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-primary-600 font-medium hover:underline">
                            <FileText className="w-4 h-4" /> View license document <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <p className="text-[11px] text-slate-400">The link expires in 2 minutes. Each view is recorded in the activity log.</p>
                    </div>
                )}

                {rejecting && (
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500}
                        placeholder="Tell the doctor what to fix (they will see this)…" className="input-field" />
                )}

                <div className="flex justify-end gap-2 pt-1">
                    {!rejecting ? (
                        <>
                            <button onClick={() => setRejecting(true)} disabled={busy || !creds} className="btn btn-sm btn-secondary">
                                <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                            <button onClick={() => decide("approve")} disabled={busy || !creds} className="btn btn-sm btn-success">
                                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />} Approve & publish
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setRejecting(false)} disabled={busy} className="btn btn-sm btn-secondary">Back</button>
                            <button onClick={() => decide("reject")} disabled={busy} className="btn btn-sm btn-danger">
                                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Send rejection
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}