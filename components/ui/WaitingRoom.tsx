"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Clock, Users, Wifi, WifiOff, ArrowLeft } from "lucide-react";

interface WaitingRoomStatus {
    appointmentId: string;
    queuePosition: number;
    estimatedWaitMinutes: number;
    doctorStatus: "online" | "busy" | "away";
    patientsAhead: number;
}

interface WaitingRoomProps {
    doctorName: string;
    doctorSpecialty: string;
    doctorAvatar: string;
    appointmentTime: string;
    onLeave: () => void;
    onDoctorReady?: () => void;
}

export default function WaitingRoom({
    doctorName,
    doctorSpecialty,
    doctorAvatar,
    appointmentTime,
    onLeave,
    onDoctorReady,
}: WaitingRoomProps) {
    const [status, setStatus] = useState<WaitingRoomStatus>({
        appointmentId: "",
        queuePosition: 3,
        estimatedWaitMinutes: 12,
        doctorStatus: "busy",
        patientsAhead: 2,
    });
    const [elapsed, setElapsed] = useState(0);

    // Simulate countdown
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed((p) => p + 1);
            setStatus((prev) => {
                if (prev.estimatedWaitMinutes <= 1) {
                    // Doctor is ready
                    clearInterval(interval);
                    onDoctorReady?.();
                    return { ...prev, queuePosition: 0, estimatedWaitMinutes: 0, doctorStatus: "online", patientsAhead: 0 };
                }
                return {
                    ...prev,
                    estimatedWaitMinutes: Math.max(0, prev.estimatedWaitMinutes - (elapsed % 20 === 0 ? 1 : 0)),
                    queuePosition: prev.queuePosition > 1 && elapsed % 30 === 0 ? prev.queuePosition - 1 : prev.queuePosition,
                    patientsAhead: prev.patientsAhead > 0 && elapsed % 30 === 0 ? prev.patientsAhead - 1 : prev.patientsAhead,
                };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [elapsed, onDoctorReady]);

    const doctorStatusConfig = {
        online: { label: "Online — Ready", color: "text-accent-500", dot: "bg-accent-500", dotAnim: "animate-pulse" },
        busy: { label: "In Another Session", color: "text-gold-500", dot: "bg-gold-400", dotAnim: "animate-pulse" },
        away: { label: "Away", color: "text-slate-400", dot: "bg-slate-400", dotAnim: "" },
    };

    const cfg = doctorStatusConfig[status.doctorStatus];

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 animate-scale-in">
            {/* Decorative circles */}
            <div className="absolute top-20 right-20 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 left-20 w-48 h-48 bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Back button */}
            <button
                onClick={onLeave}
                className="absolute top-4 left-4 flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium rounded-xl px-3 py-2 hover:bg-white/10 transition-all"
            >
                <ArrowLeft className="w-4 h-4" /> Leave Waiting Room
            </button>

            <div className="relative z-10 text-center max-w-sm w-full">
                {/* Doctor avatar with pulse ring */}
                <div className="relative w-28 h-28 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-accent-500/20 animate-waiting-pulse" />
                    <div className="absolute inset-2 rounded-full overflow-hidden ring-4 ring-white/20">
                        <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
                    </div>
                </div>

                <h2 className="font-display font-bold text-xl text-white mb-1">
                    Waiting for {doctorName}
                </h2>
                <p className="text-white/60 text-sm mb-8">{doctorSpecialty}</p>

                {/* Status cards */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <Clock className="w-5 h-5 text-gold-400 mx-auto mb-2" />
                        <p className="text-2xl font-display font-bold text-white">{status.estimatedWaitMinutes}</p>
                        <p className="text-xs text-white/50">min estimated</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <Users className="w-5 h-5 text-accent-400 mx-auto mb-2" />
                        <p className="text-2xl font-display font-bold text-white">{status.patientsAhead}</p>
                        <p className="text-xs text-white/50">patients ahead</p>
                    </div>
                </div>

                {/* Queue position */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-6">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-2">Your Position in Queue</p>
                    <p className="text-4xl font-display font-bold text-white">#{status.queuePosition}</p>
                </div>

                {/* Doctor status */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot} ${cfg.dotAnim}`} />
                    <span className={`text-sm font-medium ${cfg.color}`}>
                        Doctor is {cfg.label}
                    </span>
                </div>

                {/* Appointment info */}
                <p className="text-xs text-white/40">
                    Scheduled: {appointmentTime}
                </p>
            </div>
        </div>
    );
}
