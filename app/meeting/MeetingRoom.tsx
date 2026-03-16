"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  Monitor, MessageCircle, Maximize2, Minimize2,
  Wifi, X, Send, Paperclip, Image as ImageIcon,
  ChevronRight, ChevronLeft, Clock, Users,
} from "lucide-react";

interface ChatMsg {
  id: string;
  from: "me" | "doctor";
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: "image" | "file";
  time: string;
}

interface MeetingRoomProps {
  consultationId?: string | null;
}

export default function MeetingRoom({ consultationId }: MeetingRoomProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorName = searchParams.get("doctor") || "Dr. Sarah Johnson";
  const doctorAvatar = searchParams.get("avatar") || "https://ui-avatars.com/api/?name=Sarah+Johnson&background=1B3A5C&color=fff&size=128";
  const maxDurationMinutes = parseInt(searchParams.get("duration") || "15", 10);
  const maxDurationSeconds = maxDurationMinutes * 60;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timeWarning, setTimeWarning] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync real-time messages
  useEffect(() => {
    if (!consultationId) return;
    const fetchMsgs = async () => {
      try {
        const res = await fetch(`/api/messages?consultationId=${consultationId}`);
        const json = await res.json();
        if (json.data) {
          const formatted = json.data.map((m: any) => ({
            id: m.id,
            from: m.sender_role === "patient" ? "me" : "doctor",
            text: m.body || "",
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            fileUrl: m.attachment_url,
            fileName: m.attachment_name,
            fileType: m.attachment_type === 'image' ? 'image' : 'file',
          }));
          setMessages(formatted);
        }
      } catch (e) { }
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () => clearInterval(interval);
  }, [consultationId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (maxDurationSeconds - next === 120) setTimeWarning(true);
        if (next >= maxDurationSeconds) {
          clearInterval(timer);
          router.push("/appointments");
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDurationSeconds]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const nowTime = () =>
    new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const sendMessage = () => {
    if (!newMsg.trim() || !consultationId) return;
    const msgText = newMsg.trim();

    // Optimistic UI update
    setMessages((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, from: "me", text: msgText, time: nowTime() },
    ]);
    setNewMsg("");

    const patientId = searchParams.get("patientId") || "p-demo";
    const doctorId = searchParams.get("doctorId") || "d-demo";

    // POST to DB
    fetch('/api/messages', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consultationId: consultationId,
        doctorId,
        patientId,
        senderId: patientId,
        senderRole: "patient",
        body: msgText
      })
    }).catch(() => { });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !consultationId) return;

    // Optimistic UI
    const isImage = file.type.startsWith("image/");
    const tempUrl = URL.createObjectURL(file);
    setMessages((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        from: "me",
        fileUrl: tempUrl,
        fileName: file.name,
        fileType: isImage ? "image" : "file",
        time: nowTime(),
      },
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      const patientId = searchParams.get("patientId") || "p-demo";
      const doctorId = searchParams.get("doctorId") || "d-demo";

      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: consultationId,
          doctorId,
          patientId,
          senderId: patientId,
          senderRole: "patient",
          attachmentUrl: data.url,
          attachmentName: data.name,
          attachmentType: isImage ? "image" : "document",
          attachmentSize: data.size,
        }),
      });
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      e.target.value = "";
    }
  };

  const endCall = () => {
    router.push("/appointments");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 overflow-hidden">
      {/* ── Top status bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-white font-mono text-sm font-medium">{formatTime(elapsed)}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${timeWarning ? "bg-rose-500/20 text-rose-300 animate-pulse" : "bg-slate-800 text-slate-300"}`}>
              <Clock className="w-3.5 h-3.5" />
              {formatTime(Math.max(0, maxDurationSeconds - elapsed))} left
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-medium">Excellent</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-xs">2 participants</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-400/50">
            <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
          </div>
          <div className="hidden sm:block">
            <p className="text-white text-sm font-medium leading-none">{doctorName}</p>
            <p className="text-emerald-400 text-xs mt-0.5">● In call</p>
          </div>
        </div>
      </div>

      {/* ── Main content: video + optional chat ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Video area ── */}
        <div className={`flex-1 relative flex items-center justify-center bg-slate-800 min-w-0 transition-all duration-300`}>
          {/* Doctor main video */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800">
              <div className="text-center">
                <div className="relative w-28 h-28 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping opacity-40" style={{ animationDuration: "3s" }} />
                  <div className="absolute inset-2 rounded-full overflow-hidden ring-4 ring-white/10">
                    <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
                  </div>
                </div>
                <p className="text-white text-base font-semibold">{doctorName}</p>
                <p className="text-slate-400 text-sm mt-1">Video consultation active</p>
              </div>
            </div>
          </div>

          {/* Doctor name label */}
          <div className="absolute bottom-20 left-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm">
            {doctorName}
          </div>

          {/* Patient PiP */}
          <div className="absolute bottom-16 right-4 w-36 sm:w-48 aspect-video bg-slate-700 rounded-xl border-2 border-slate-600 overflow-hidden shadow-xl">
            {camOn ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-700">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-primary-500/40 flex items-center justify-center mx-auto mb-1">
                    <span className="text-white font-bold text-sm">You</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-700">
                <VideoOff className="w-6 h-6 text-slate-400" />
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
              You
            </div>
          </div>

          {/* Screen share indicator */}
          {screenShare && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-emerald-500/90 text-white text-xs px-3 py-1.5 rounded-lg">
              <Monitor className="w-3.5 h-3.5" />
              Sharing screen
            </div>
          )}
        </div>

        {/* ── Chat side panel ── */}
        {chatOpen && (
          <div className="w-80 lg:w-96 bg-white flex flex-col border-l border-slate-200 flex-shrink-0 animate-slide-in-right">
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary-600" />
                <h3 className="font-semibold text-sm text-slate-800">In-Call Chat</h3>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                  {msg.from === "doctor" && (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
                      <Image src={doctorAvatar} alt={doctorName} fill className="object-cover" unoptimized />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl ${msg.from === "me" ? "rounded-br-md bg-primary-600 text-white" : "rounded-bl-md bg-white border border-slate-100 text-slate-700 shadow-sm"}`}>
                    {msg.fileType === "image" && msg.fileUrl ? (
                      <div className="p-2">
                        <img src={msg.fileUrl} alt="shared" className="rounded-lg max-w-full max-h-48 object-contain" />
                        <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>{msg.time}</p>
                      </div>
                    ) : msg.fileType === "file" ? (
                      <div className="px-3.5 py-2.5">
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${msg.from === "me" ? "bg-white/10" : "bg-slate-100"}`}>
                          <Paperclip className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs truncate max-w-[120px]">{msg.fileName}</span>
                        </div>
                        <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>{msg.time}</p>
                      </div>
                    ) : (
                      <div className="px-3.5 py-2.5">
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>{msg.time}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-primary-400 transition-colors">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-slate-400 hover:text-primary-500 transition-colors flex-shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMsg.trim()}
                  className="text-primary-600 disabled:text-slate-300 transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 px-4 py-4 bg-slate-900 border-t border-slate-800 flex-shrink-0">
        {/* Mic */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}`}
          >
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <span className="text-slate-500 text-[10px]">{micOn ? "Mute" : "Unmute"}</span>
        </div>

        {/* Camera */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setCamOn(!camOn)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOn ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"}`}
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <span className="text-slate-500 text-[10px]">{camOn ? "Stop video" : "Start video"}</span>
        </div>

        {/* Screen share */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setScreenShare(!screenShare)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${screenShare ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
          >
            <Monitor className="w-5 h-5" />
          </button>
          <span className="text-slate-500 text-[10px]">Share</span>
        </div>

        {/* Chat toggle */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative ${chatOpen ? "bg-primary-500 hover:bg-primary-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}
          >
            <MessageCircle className="w-5 h-5" />
            {messages.length > 1 && !chatOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {messages.filter(m => m.from === "doctor").length}
              </span>
            )}
          </button>
          <span className="text-slate-500 text-[10px]">Chat</span>
        </div>

        {/* Fullscreen */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={toggleFullscreen}
            className="w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-all"
          >
            {fullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <span className="text-slate-500 text-[10px]">Fullscreen</span>
        </div>

        {/* End call */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={endCall}
            className="w-14 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-lg shadow-rose-500/20"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
          <span className="text-rose-400 text-[10px]">End call</span>
        </div>
      </div>
    </div>
  );
}
