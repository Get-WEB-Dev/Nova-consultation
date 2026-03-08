"use client";

import { useEffect, useState } from "react";
import {
    Stethoscope, Search, X, CheckCircle2, XCircle,
    Eye, EyeOff, AlertCircle, Shield, ShieldCheck,
} from "lucide-react";

interface DoctorData {
    id: string;
    user_id: string;
    specialty: string;
    hospital: string | null;
    experience_years: number;
    rating: number;
    review_count: number;
    fee: number;
    status: string;
    is_verified: boolean;
    is_published: boolean;
    patients_served: number;
    consultation_type: string;
    location_city: string | null;
    created_at: string;
    users: { name: string; email: string; avatar_url: string | null };
}

export default function AdminDoctorsPage() {
    const [doctors, setDoctors] = useState<DoctorData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetch("/api/admin/doctors")
            .then(r => r.json())
            .then(json => setDoctors(json.data || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const showMsg = (type: "success" | "error", text: string) => {
        setActionMsg({ type, text });
        setTimeout(() => setActionMsg(null), 3000);
    };

    const togglePublish = async (doctorId: string, current: boolean) => {
        try {
            await fetch("/api/admin/doctors", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ doctorId, action: "publish", value: !current }),
            });
            setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, is_published: !current } : d));
            showMsg("success", !current ? "Doctor published" : "Doctor unpublished");
        } catch {
            showMsg("error", "Failed to update");
        }
    };

    const toggleVerify = async (doctorId: string, current: boolean) => {
        try {
            await fetch("/api/admin/doctors", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ doctorId, action: "verify", value: !current }),
            });
            setDoctors(prev => prev.map(d => d.id === doctorId ? { ...d, is_verified: !current } : d));
            showMsg("success", !current ? "Doctor verified" : "Verification removed");
        } catch {
            showMsg("error", "Failed to update");
        }
    };

    const filtered = search.trim()
        ? doctors.filter(d =>
            d.users?.name?.toLowerCase().includes(search.toLowerCase()) ||
            d.specialty?.toLowerCase().includes(search.toLowerCase()) ||
            d.users?.email?.toLowerCase().includes(search.toLowerCase())
        )
        : doctors;

    const statusColors: Record<string, string> = {
        available: "bg-green-50 text-green-600",
        busy: "bg-amber-50 text-amber-600",
        in_consultation: "bg-primary-50 text-primary-600",
        offline: "bg-slate-100 text-slate-500",
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="animate-shimmer h-20 rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fade-up">
            <div>
                <h1 className="font-display font-bold text-xl text-slate-800">Doctors Management</h1>
                <p className="text-sm text-slate-500 mt-1">{doctors.length} registered doctors</p>
            </div>

            {/* Action message */}
            {actionMsg && (
                <div className={`flex items-center gap-2 p-3 rounded-xl text-sm animate-fade-up ${actionMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                    {actionMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {actionMsg.text}
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search doctors by name, specialty, or email..."
                    className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-primary-400 transition-colors"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Doctors list */}
            {filtered.length === 0 ? (
                <div className="card text-center py-10">
                    <Stethoscope className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No doctors found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(d => (
                        <div key={d.id} className="card">
                            <div className="flex items-start gap-3">
                                <div className="w-11 h-11 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-accent-700 text-sm font-bold uppercase">{d.users?.name?.[0] || "D"}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-semibold text-slate-700">{d.users?.name || "Unknown"}</p>
                                        <span className={`badge text-[10px] ${statusColors[d.status] || "bg-slate-50 text-slate-500"}`}>
                                            {d.status}
                                        </span>
                                        {d.is_verified && (
                                            <span className="badge text-[10px] bg-green-50 text-green-600">
                                                <ShieldCheck className="w-3 h-3 mr-0.5" /> Verified
                                            </span>
                                        )}
                                        {!d.is_published && (
                                            <span className="badge text-[10px] bg-slate-100 text-slate-500">
                                                <EyeOff className="w-3 h-3 mr-0.5" /> Hidden
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{d.specialty} · {d.users?.email}</p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                        <span>⭐ {d.rating?.toFixed(1)} ({d.review_count} reviews)</span>
                                        <span>💰 ${d.fee}</span>
                                        <span>🏥 {d.hospital || "—"}</span>
                                        <span>📍 {d.location_city || "—"}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => toggleVerify(d.id, d.is_verified)}
                                        className={`p-2 rounded-lg transition-colors ${d.is_verified
                                                ? "bg-green-50 text-green-600 hover:bg-green-100"
                                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                            }`}
                                        title={d.is_verified ? "Remove verification" : "Verify doctor"}
                                    >
                                        <Shield className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => togglePublish(d.id, d.is_published)}
                                        className={`p-2 rounded-lg transition-colors ${d.is_published
                                                ? "bg-primary-50 text-primary-600 hover:bg-primary-100"
                                                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                            }`}
                                        title={d.is_published ? "Unpublish" : "Publish"}
                                    >
                                        {d.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
