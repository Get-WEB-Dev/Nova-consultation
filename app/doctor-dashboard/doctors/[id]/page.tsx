"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    ChevronLeft, Star, Clock, Users, Building2, Video, MessageSquare, Loader2
} from "lucide-react";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";

const STATUS: Record<string, { color: string; label: string; textClass: string; bgClass: string }> = {
    available: { color: "#22c55e", label: "Available", textClass: "text-emerald-700", bgClass: "bg-emerald-50 border-emerald-200" },
    busy: { color: "#f59e0b", label: "Busy", textClass: "text-amber-700", bgClass: "bg-amber-50 border-amber-200" },
    in_consultation: { color: "#f59e0b", label: "In Session", textClass: "text-amber-700", bgClass: "bg-amber-50 border-amber-200" },
    offline: { color: "#94a3b8", label: "Offline", textClass: "text-slate-500", bgClass: "bg-slate-100 border-slate-200" },
};

export default function DoctorProfilePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [doctor, setDoctor] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await fetch("/api/doctors");
                if (res.ok) {
                    const j = await res.json();
                    const docs = j.data || j || [];
                    const found = docs.find((d: any) => d.id === params.id);
                    if (found) setDoctor(found);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDoc();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Doctor Not Found</h2>
                <p className="text-slate-500 mb-6">The profile you are looking for does not exist.</p>
                <button onClick={() => router.back()} className="px-5 py-2.5 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-100 transition-colors">
                    Go Back
                </button>
            </div>
        );
    }

    const experience = doctor.experience || doctor.experience_years || 0;
    const reviews = doctor.reviews || doctor.review_count || 0;
    const avatar = doctor.avatar || doctor.avatar_url;

    const handleMessage = () => {
        router.push(`/doctor-dashboard/messages?contactId=${doctor.id}&contactName=${encodeURIComponent(doctor.name)}`);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            {/* Header Navigation */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Back to Directory
            </button>

            {/* Main Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}>
                {/* Cover Image */}
                <div className="h-40 sm:h-48" style={{ background: `linear-gradient(135deg, ${NAV_BG}, ${ACCENT})` }} />

                <div className="px-6 sm:px-10 -mt-16 sm:-mt-20 pb-8 flex flex-col sm:flex-row sm:items-end gap-5">
                    {/* Avatar */}
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 relative flex-shrink-0">
                        {avatar ? (
                            <Image src={avatar} alt={doctor.name} fill className="object-cover" unoptimized />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: NAV_BG }}>
                                <span className="text-white font-extrabold text-5xl">{doctor.name[0]}</span>
                            </div>
                        )}
                    </div>

                    {/* Personal Info */}
                    <div className="flex-1 min-w-0 pt-2 sm:pt-0 sm:pb-2 flex justify-between items-start gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Dr. {doctor.name}</h1>
                            <p className="text-sm font-semibold mt-1" style={{ color: ACCENT }}>{doctor.specialty}</p>

                            <div className="flex items-center gap-2 mt-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${doctor.status === "available" ? "bg-emerald-400" : doctor.status === "offline" ? "bg-slate-300" : "bg-amber-400"}`} />
                                <span className={`text-[12px] font-semibold ${doctor.status === "available" ? "text-emerald-600" : doctor.status === "offline" ? "text-slate-400" : "text-amber-600"}`}>
                                    {STATUS[doctor.status]?.label ?? "Offline"}
                                </span>
                                <span className="text-slate-300 text-xs">•</span>
                                <span className="text-slate-500 text-xs">Consultation Fee: <strong className="text-slate-800">{doctor.fee} Birr</strong></span>
                            </div>
                        </div>

                        <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
                            <button
                                onClick={handleMessage}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[13px] border transition-all hover:bg-slate-50"
                                style={{ borderColor: ACCENT, color: ACCENT }}
                            >
                                <MessageSquare className="w-4 h-4" /> Message Colleague
                            </button>
                            <button
                                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-[13px] text-white transition-all hover:opacity-90 shadow-sm"
                                style={{ background: NAV_BG }}
                            >
                                <Video className="w-4 h-4" /> Collaborate
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex sm:hidden gap-3 px-6 pb-6 border-b border-slate-100">
                    <button
                        onClick={handleMessage}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[13px] border transition-all bg-white"
                        style={{ borderColor: ACCENT, color: ACCENT }}
                    >
                        <MessageSquare className="w-4 h-4" /> Message
                    </button>
                    <button
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-[13px] text-white transition-all"
                        style={{ background: NAV_BG }}
                    >
                        <Video className="w-4 h-4" /> Collaborate
                    </button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 sm:p-10 bg-slate-50/50">
                    <div className="md:col-span-2 space-y-8">
                        {doctor.bio && (
                            <section>
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">About Dr. {doctor.name.split(' ')[0]}</h3>
                                <p className="text-sm text-slate-600 leading-loose">{doctor.bio}</p>
                            </section>
                        )}

                        <section>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-3">Professional Info</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { icon: Clock, label: "Experience", value: `${experience} years in practice` },
                                    { icon: Building2, label: "Primary Hospital", value: doctor.hospital ?? "Independent Practitioner" },
                                    { icon: Users, label: "Patients Served", value: doctor.patients_served?.toLocaleString() ?? "0 patients" },
                                    { icon: Star, label: "Overall Rating", value: `${doctor.rating?.toFixed(1) ?? "N/A"} from ${reviews} reviews` },
                                ].map(({ icon: Icon, label, value }, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#eff6ff" }}>
                                            <Icon className="w-5 h-5" style={{ color: ACCENT }} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                                            <p className="text-sm font-bold text-slate-800">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="space-y-6">
                        {doctor.languages && doctor.languages.length > 0 && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4">Languages Spoken</h3>
                                <div className="flex flex-wrap gap-2">
                                    {doctor.languages.map((l: string) => (
                                        <span key={l} className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700">
                                            {l}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm" style={{ background: "#eff6ff" }}>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>Consultation</h3>
                            <p className="text-3xl font-extrabold text-slate-900 mb-1">{doctor.fee ?? 0} <span className="text-sm font-bold text-slate-500">Birr</span></p>
                            <p className="text-xs font-medium text-slate-500">{doctor.consultation_type || "Video & Chat consultation"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
