"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
    Mic, MicOff, Camera, CameraOff, PhoneOff,
    Monitor, MessageCircle, Maximize2, Minimize2,
    MoreVertical, Clock, Wifi, X, Send,
} from "lucide-react";

interface VideoCallProps {
    doctorName: string;
    doctorAvatar: string;
    onEnd: () => void;
}

interface ChatMsg {
    id: string;
    from: "me" | "doctor";
    text: string;
    time: string;
}

export default function VideoCall({ doctorName, doctorAvatar, onEnd }: VideoCallProps) {
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [screenShare, setScreenShare] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [messages, setMessages] = useState<ChatMsg[]>([
        { id: "c1", from: "doctor", text: "Hello! I can see you clearly. Let's begin.", time: "Now" },
    ]);
    const [newMsg, setNewMsg] = useState("");
    const [connectionQuality, setConnectionQuality] = useState<"excellent" | "good" | "poor">("excellent");

    // Timer
    useEffect(() => {
        const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    const sendMessage = () => {
        if (!newMsg.trim()) return;
        setMessages((prev) => [...prev, {
            id: `c-${Date.now()}`,
            from: "me",
            text: newMsg.trim(),
            time: formatTime(elapsed),
        }]);
        setNewMsg("");
        setTimeout(() => {
            setMessages((prev) => [...prev, {
                id: `c-${Date.now()}-reply`,
                from: "doctor",
                text: "Thank you for sharing. Let me note that down.",
                time: formatTime(elapsed + 3),
            }]);
        }, 2500);
    };

    const qualityConfig = {
        excellent: { label: "Excellent", color: "text-accent-500", bars: 3 },
        good: { label: "Good", color: "text-gold-500", bars: 2 },
        poor: { label: "Poor", color: "text-rose-500", bars: 1 },
    };
    const qc = qualityConfig[connectionQuality];

    return (
        <div className="flex flex-col h-screen w-screen bg-slate-900">
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-sm relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <Wifi className={`w-4 h-4 ${qc.color}`} />
                        <span className={`text-xs font-medium ${qc.color}`}>{qc.label}</span>
                    </div>
                    <span className="text-white/40">·</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-xs text-white/80 font-mono">{formatTime(elapsed)}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/90">{doctorName}</span>
                    <div className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/20">
                        <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
                    </div>
                </div>
            </div>

            {/* ── Main video area ── */}
            <div className="flex-1 flex relative">
                {/* Doctor (large) */}
                <div className={`flex-1 flex items-center justify-center bg-gradient-to-br from-primary-800 to-primary-900 relative overflow-hidden ${chatOpen ? "hidden md:flex" : "flex"}`}>
                    {/* Simulated video feed */}
                    <div className="text-center">
                        <div className="relative w-32 h-32 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full bg-accent-500/20 animate-waiting-pulse" />
                            <div className="absolute inset-2 rounded-full overflow-hidden ring-4 ring-white/10">
                                <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
                            </div>
                        </div>
                        <p className="text-white text-lg font-display font-semibold">{doctorName}</p>
                        <p className="text-white/50 text-sm mt-1">Video consultation in progress</p>
                    </div>

                    {/* Patient video (PiP) */}
                    <div className="absolute bottom-4 right-4 w-36 h-24 sm:w-48 sm:h-32 bg-primary-700 rounded-2xl border-2 border-white/10 overflow-hidden shadow-lg">
                        {camOn ? (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
                                <div className="w-12 h-12 rounded-full bg-primary-500/30 flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">You</span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary-800">
                                <CameraOff className="w-6 h-6 text-white/30" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Chat panel ── */}
                {chatOpen && (
                    <div className="w-full md:w-80 lg:w-96 bg-white flex flex-col border-l border-slate-100 animate-slide-in-right">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <h3 className="font-semibold text-sm text-slate-800">In-Call Chat</h3>
                            <button onClick={() => setChatOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${msg.from === "me"
                                        ? "bg-primary-600 text-white rounded-br-md"
                                        : "bg-slate-100 text-slate-700 rounded-bl-md"
                                        }`}>
                                        <p className="text-sm">{msg.text}</p>
                                        <p className={`text-[10px] mt-0.5 ${msg.from === "me" ? "text-white/50" : "text-slate-400"}`}>
                                            {msg.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-slate-100">
                            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-primary-400 transition-colors">
                                <input
                                    type="text"
                                    value={newMsg}
                                    onChange={(e) => setNewMsg(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                                />
                                <button onClick={sendMessage} disabled={!newMsg.trim()} className="text-primary-600 disabled:text-slate-300 transition-colors">
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Controls bar ── */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 p-4 bg-black/30 backdrop-blur-sm">
                <button
                    onClick={() => setMicOn(!micOn)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}`}
                >
                    {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <button
                    onClick={() => setCamOn(!camOn)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}`}
                >
                    {camOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                </button>

                <button
                    onClick={() => setScreenShare(!screenShare)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${screenShare ? "bg-accent-500 hover:bg-accent-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                >
                    <Monitor className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative ${chatOpen ? "bg-primary-500 hover:bg-primary-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
                >
                    <MessageCircle className="w-5 h-5" />
                </button>

                <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                >
                    {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>

                <button
                    onClick={onEnd}
                    className="w-14 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-lg shadow-rose-500/30"
                >
                    <PhoneOff className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
