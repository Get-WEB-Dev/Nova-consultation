"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
    Users, Clock, PhoneCall, X, Wifi,
    Video, Shield, Loader2, CheckCircle,
    ArrowRight, User, LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface QueueParticipant {
    id: string;
    position: number;
    joinedAt: string;
    isYou: boolean;
}

interface WaitingRoomProps {
    doctorName: string;
    doctorAvatar: string;
    doctorSpecialty?: string;
    patientId: string;
    doctorId: string;
    onStartCall: (consultationId?: string) => void;
    onLeave: () => void;
}

export default function WaitingRoom({
    doctorName,
    doctorAvatar,
    doctorSpecialty = "General Practice",
    patientId,
    doctorId,
    onStartCall,
    onLeave,
}: WaitingRoomProps) {
    const [queue, setQueue] = useState<QueueParticipant[]>([]);
    const [yourPosition, setYourPosition] = useState<number>(0);
    const [estimatedWait, setEstimatedWait] = useState<number>(0);
    const [doctorReady, setDoctorReady] = useState(false);
    const [joining, setJoining] = useState(true);
    const [leaving, setLeaving] = useState(false);
    const [consultationActive, setConsultationActive] = useState(false);
    const [elapsedWait, setElapsedWait] = useState(0);
    const [consultationId, setConsultationId] = useState<string | null>(null);

    // Helper to process queue data from API response
    const processQueueData = useCallback((json: any) => {
        setYourPosition(json.position ?? yourPosition);
        setEstimatedWait(json.estimatedWait ?? estimatedWait);
        if (json.consultation_id) setConsultationId(json.consultation_id);

        // Build queue display
        const total = json.total ?? 1;
        const participants: QueueParticipant[] = [];
        for (let i = 1; i <= Math.min(total, 10); i++) {
            participants.push({
                id: `p-${i}`,
                position: i,
                joinedAt: new Date(Date.now() - (total - i) * 60000).toISOString(),
                isYou: i === (json.position ?? yourPosition),
            });
        }
        setQueue(participants);

        // Check if it's your turn
        if (json.position === 1 || json.inQueue === false) {
            setDoctorReady(true);
        }
    }, [yourPosition, estimatedWait]);

    // Join queue on mount — create consultation first
    useEffect(() => {
        const joinQueueAsync = async () => {
            try {
                // Step 1: Create consultation first so both sides have the ID
                let cid = consultationId;
                if (!cid) {
                    try {
                        const consultRes = await fetch("/api/consultations", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ doctorId, patientId }),
                        });
                        if (consultRes.ok) {
                            const consultJson = await consultRes.json();
                            if (consultJson.data?.id) {
                                cid = consultJson.data.id;
                                setConsultationId(cid);
                            }
                        }
                    } catch (e) {
                        console.warn("Create consultation failed:", e);
                    }
                }

                // Step 2: Join queue with the consultationId
                const res = await fetch("/api/queue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ doctorId, patientId, consultationId: cid }),
                });
                if (res.ok) {
                    const json = await res.json();
                    const entry = json.data ?? json;
                    setYourPosition(entry.queue_position ?? entry.position ?? 1);
                    setEstimatedWait(entry.estimated_wait_mins ?? entry.estimatedWait ?? 5);
                    if (entry.consultation_id && !cid) {
                        setConsultationId(entry.consultation_id);
                    }
                }
            } catch (_) {
                setYourPosition(1);
                setEstimatedWait(5);
            } finally {
                setJoining(false);
            }
        };
        joinQueueAsync();
    }, [doctorId, patientId]);

    // ── Supabase Realtime — subscribe to queue changes ──
    useEffect(() => {
        if (joining) return;

        // Initial fetch
        const fetchQueue = async () => {
            try {
                const res = await fetch(`/api/queue?doctorId=${doctorId}&patientId=${patientId}`);
                if (res.ok) {
                    const json = await res.json();
                    processQueueData(json);
                }
            } catch (_) { }
        };
        fetchQueue();

        // Subscribe to consultation_queue changes via Supabase Realtime
        const channel = supabase
            .channel(`queue:${doctorId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "consultation_queue",
                    filter: `doctor_id=eq.${doctorId}`,
                },
                async () => {
                    // Re-fetch queue state whenever there's a change
                    try {
                        const res = await fetch(`/api/queue?doctorId=${doctorId}&patientId=${patientId}`);
                        if (res.ok) {
                            const json = await res.json();
                            processQueueData(json);
                        }
                    } catch (_) { }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [joining, doctorId, patientId, processQueueData]);

    // Wait timer
    useEffect(() => {
        const timer = setInterval(() => setElapsedWait((p) => p + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    // Doctor readiness for position 1
    useEffect(() => {
        if (yourPosition === 1 && !joining) {
            const timeout = setTimeout(() => setDoctorReady(true), 2000);
            return () => clearTimeout(timeout);
        }
    }, [yourPosition, joining]);

    const handleLeave = useCallback(async () => {
        setLeaving(true);
        try {
            await fetch("/api/queue", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ doctorId, patientId }),
            });
        } catch (_) { }
        onLeave();
    }, [doctorId, patientId, onLeave]);

    const handleStartCall = useCallback(() => {
        setConsultationActive(true);
        setTimeout(() => onStartCall(consultationId || undefined), 500);
    }, [onStartCall, consultationId]);

    const formatWaitTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    if (joining) {
        return (
            <div className="flex flex-col h-screen w-screen bg-slate-900 items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
                <p className="text-white text-lg font-medium">Joining the queue...</p>
                <p className="text-slate-400 text-sm">Setting up your consultation</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen bg-slate-900 overflow-hidden">
            {/* ── Left Sidebar: Queue Panel ── */}
            {!consultationActive && (
                <div className="hidden md:flex w-72 lg:w-80 bg-slate-800/60 backdrop-blur-sm border-r border-slate-700/50 flex-col flex-shrink-0">
                    {/* Queue header */}
                    <div className="px-5 py-4 border-b border-slate-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-primary-400" />
                            <h2 className="text-white font-semibold text-sm">Waiting Queue</h2>
                            <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Live
                            </span>
                        </div>
                        <p className="text-slate-400 text-xs">
                            {queue.length} participant{queue.length !== 1 ? "s" : ""} waiting
                        </p>
                    </div>

                    {/* Queue list */}
                    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
                        {queue.map((p) => (
                            <div
                                key={p.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${p.isYou
                                    ? "bg-primary-500/15 border border-primary-500/30 ring-1 ring-primary-500/20"
                                    : "bg-slate-700/30 border border-transparent hover:bg-slate-700/50"
                                    }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${p.isYou
                                        ? "bg-primary-500 text-white"
                                        : p.position === 1
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : "bg-slate-600/50 text-slate-300"
                                        }`}
                                >
                                    {p.position}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                        <p className={`text-sm font-medium truncate ${p.isYou ? "text-primary-300" : "text-slate-300"}`}>
                                            {p.isYou ? "You" : `Patient #${p.position}`}
                                        </p>
                                    </div>
                                    {p.isYou && (
                                        <p className="text-xs text-primary-400/80 mt-0.5">Your position</p>
                                    )}
                                </div>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.position === 1 ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                                    }`} />
                            </div>
                        ))}

                        {queue.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <Users className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">No one in queue</p>
                            </div>
                        )}
                    </div>

                    {/* Queue info footer */}
                    <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-800/40">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Names are hidden for privacy</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Content Area ── */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Connection status bar */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-800/40 backdrop-blur-sm border-b border-slate-700/30">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <Wifi className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 text-xs font-medium">Connected</span>
                        </div>
                        <div className="w-px h-4 bg-slate-700" />
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-400 text-xs font-mono">{formatWaitTime(elapsedWait)} waiting</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLeave}
                        disabled={leaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-medium transition-all"
                    >
                        {leaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                        Leave Queue
                    </button>
                </div>

                {/* Doctor info card */}
                <div className="text-center mb-8 mt-16">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping opacity-30" style={{ animationDuration: "3s" }} />
                        <div className="absolute inset-1 rounded-full overflow-hidden ring-4 ring-slate-700">
                            <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center ring-4 ring-slate-900">
                            <Video className="w-3.5 h-3.5 text-white" />
                        </div>
                    </div>
                    <h2 className="text-white text-xl font-bold">{doctorName}</h2>
                    <p className="text-slate-400 text-sm mt-1">{doctorSpecialty}</p>
                </div>

                {/* Status card */}
                <div className="w-full max-w-md px-4">
                    {doctorReady && yourPosition <= 1 ? (
                        <div className="bg-gradient-to-br from-emerald-500/10 to-primary-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center animate-fade-up">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-white text-lg font-bold mb-2">
                                Doctor is Ready for You
                            </h3>
                            <p className="text-slate-300 text-sm mb-6">
                                {doctorName} is available now. Start your video consultation.
                            </p>
                            <button
                                onClick={handleStartCall}
                                disabled={consultationActive}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 disabled:opacity-60"
                            >
                                {consultationActive ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <PhoneCall className="w-5 h-5" />
                                        Start Video Consultation
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-center">
                            {/* Position indicator */}
                            <div className="relative w-20 h-20 mx-auto mb-5">
                                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(51 65 85 / 0.5)" strokeWidth="6" />
                                    <circle
                                        cx="40" cy="40" r="34"
                                        fill="none"
                                        stroke="url(#progressGradient)"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={`${(1 / Math.max(yourPosition, 1)) * 213.6} 213.6`}
                                        className="transition-all duration-1000"
                                    />
                                    <defs>
                                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#3b82f6" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-bold text-white">#{yourPosition}</span>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">in queue</span>
                                </div>
                            </div>

                            <h3 className="text-white text-lg font-bold mb-1">Waiting for Your Turn</h3>
                            <p className="text-slate-400 text-sm mb-5">
                                {yourPosition <= 1
                                    ? "You're next! The doctor will be with you shortly."
                                    : `There ${yourPosition - 1 === 1 ? "is" : "are"} ${yourPosition - 1} patient${yourPosition - 1 === 1 ? "" : "s"} ahead of you.`}
                            </p>

                            {/* Estimated wait */}
                            <div className="flex items-center justify-center gap-4 py-3 px-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Est. Wait</p>
                                    <p className="text-white font-bold text-lg">{estimatedWait} min</p>
                                </div>
                                <div className="w-px h-8 bg-slate-600" />
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Position</p>
                                    <p className="text-white font-bold text-lg">{yourPosition}</p>
                                </div>
                                <div className="w-px h-8 bg-slate-600" />
                                <div className="text-center">
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Waited</p>
                                    <p className="text-white font-bold text-lg">{formatWaitTime(elapsedWait)}</p>
                                </div>
                            </div>

                            {/* Waiting animation dots */}
                            <div className="flex items-center justify-center gap-1.5 mt-5">
                                <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Tips section */}
                <div className="mt-8 px-4 w-full max-w-md">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { icon: Video, label: "Camera ready", desc: "Test your camera" },
                            { icon: Wifi, label: "Good connection", desc: "Stable internet" },
                            { icon: Shield, label: "Private session", desc: "End-to-end secure" },
                        ].map(({ icon: Icon, label, desc }) => (
                            <div key={label} className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-3 text-center">
                                <Icon className="w-5 h-5 text-primary-400 mx-auto mb-1.5" />
                                <p className="text-white text-xs font-medium">{label}</p>
                                <p className="text-slate-500 text-[10px] mt-0.5">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
