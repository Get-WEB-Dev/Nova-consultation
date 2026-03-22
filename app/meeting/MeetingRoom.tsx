"use client";

/**
 * Patient-side Meeting Room
 *
 * Uses Zoom Video SDK for video.
 * Chat + file attachments use our own backend (/api/messages, /api/upload).
 * End-call shows confirmation, then cleans up consultation + queue.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MessageCircle, X, Send, Paperclip, Download,
  PhoneOff, Clock, Wifi,
} from "lucide-react";
import ZoomVideoCall from "../components/ZoomVideoCall";

/* ── Types ── */
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
  doctorId?: string;
  patientId?: string;
  onEnd?: () => void;
}

/* ── Zoom Video SDK ── */

export default function MeetingRoom({
  consultationId,
  doctorId: propDoctorId,
  patientId: propPatientId,
  onEnd,
}: MeetingRoomProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Props from parent, fallback to URL params
  const doctorName = searchParams.get("doctor") || "Dr. Sarah Johnson";
  const doctorAvatar =
    searchParams.get("avatar") ||
    "https://ui-avatars.com/api/?name=Doctor&background=1B3A5C&color=fff&size=128";
  const doctorId = propDoctorId || searchParams.get("doctorId") || "";
  const patientId = propPatientId || searchParams.get("patientId") || "";

  // State
  const [zoomReady, setZoomReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(consultationId || null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Room name: use consultationId if available, otherwise fallback to doctorId+patientId
  const roomName = activeConsultationId
    ? `NovaHealth_${activeConsultationId.replace(/-/g, "")}`
    : (doctorId && patientId)
      ? `NovaHealth_${doctorId.replace(/-/g, "")}_${patientId.replace(/-/g, "")}`
      : null;

  // Auto-create consultation if missing
  useEffect(() => {
    if (activeConsultationId || !doctorId || !patientId) return;
    const createConsult = async () => {
      try {
        const res = await fetch("/api/consultations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId, patientId }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.id) setActiveConsultationId(json.data.id);
        }
      } catch (e) {
        console.warn("Auto-create consultation failed:", e);
      }
    };
    createConsult();
  }, [activeConsultationId, doctorId, patientId]);

  // ────────────────────────────────────────────
  // 2. Timer
  // ────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev: number) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // ────────────────────────────────────────────
  // 3. Poll messages from our backend
  // ────────────────────────────────────────────
  useEffect(() => {
    const cid = activeConsultationId || consultationId;
    if (!cid && (!doctorId || !patientId)) return;
    const controller = new AbortController();
    const fetchMsgs = async () => {
      try {
        // ALWAYS fetch full history between doctor and patient if both IDs are known
        const params = (doctorId && patientId) ? `doctorId=${doctorId}&patientId=${patientId}` : `consultationId=${cid}`;
        const res = await fetch(`/api/messages?${params}`, { signal: controller.signal });
        const json = await res.json();
        if (json.data) {
          setMessages(
            json.data.map((m: any) => ({
              id: m.id,
              from: m.sender_role === "patient" ? "me" : "doctor",
              text: m.body || "",
              time: new Date(m.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              fileUrl: m.attachment_url,
              fileName: m.attachment_name,
              fileType:
                m.attachment_type === "image"
                  ? "image"
                  : m.attachment_url
                    ? "file"
                    : undefined,
            }))
          );
        }
      } catch (_) { }
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 5000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [activeConsultationId, consultationId, doctorId, patientId]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ────────────────────────────────────────────
  // 4. Chat — send text message
  // ────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const nowTime = () =>
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const sendMessage = useCallback(() => {
    const cid = activeConsultationId || consultationId;
    if (!newMsg.trim() || (!cid && (!doctorId || !patientId))) return;
    const text = newMsg.trim();
    setMessages((prev) => [
      ...prev,
      { id: `c-${Date.now()}`, from: "me", text, time: nowTime() },
    ]);
    setNewMsg("");
    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consultationId: cid || undefined,
        doctorId,
        patientId,
        senderId: patientId,
        senderRole: "patient",
        body: text,
      }),
    }).catch(() => { });
  }, [newMsg, activeConsultationId, consultationId, doctorId, patientId]);

  // ────────────────────────────────────────────
  // 5. Chat — file upload
  // ────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const cid = activeConsultationId || consultationId;
      if (!file || (!cid && (!doctorId || !patientId))) return;
      const isImage = file.type.startsWith("image/");
      // Optimistic
      setMessages((prev) => [
        ...prev,
        {
          id: `c-${Date.now()}`,
          from: "me",
          fileUrl: URL.createObjectURL(file),
          fileName: file.name,
          fileType: isImage ? "image" : "file",
          time: nowTime(),
        },
      ]);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultationId: cid || undefined,
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
      }
      e.target.value = "";
    },
    [activeConsultationId, consultationId, doctorId, patientId]
  );

  // ────────────────────────────────────────────
  // 6. End call — with cleanup
  // ────────────────────────────────────────────
  const handleEndCallDirect = useCallback(async () => {
    setIsEnding(true);
    setShowEndDialog(false);
    try {
      // (Zoom cleanup is handled by ZoomVideoCall unmount)

      // Update consultation status
      const cid = activeConsultationId || consultationId;
      if (cid) {
        await fetch("/api/consultations/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ consultationId: cid, status: "completed" }),
        });
      }
      // Remove from queue
      if (doctorId && patientId) {
        await fetch("/api/queue", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId, patientId }),
        });
      }
    } catch (err) {
      console.error("End call error:", err);
    }
    if (onEnd) onEnd();
    else router.push("/dashboard");
  }, [consultationId, doctorId, patientId, onEnd, router]);

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 overflow-hidden">
      {/* ── End Call Confirmation ── */}
      {showEndDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-white text-lg font-bold mb-2">
              End Consultation?
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Are you sure you want to leave this consultation with{" "}
              {doctorName}?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndDialog(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all"
              >
                Stay
              </button>
              <button
                onClick={handleEndCallDirect}
                disabled={isEnding}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {isEnding ? "Ending…" : "End Call"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-white font-mono text-sm">
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-medium">
              {zoomReady ? "Connected" : "Connecting…"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-emerald-400/50">
            <Image
              src={doctorAvatar}
              alt={doctorName}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-white text-sm font-medium leading-none">
              {doctorName}
            </p>
            <p className="text-emerald-400 text-xs mt-0.5">
              {zoomReady ? "● In call" : "● Joining…"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main: Zoom + Chat ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Zoom video area */}
        <div className="flex-1 relative bg-black min-w-0">
          {roomName ? (
            <ZoomVideoCall
              roomName={roomName}
              userName="Patient"
              onReady={() => setZoomReady(true)}
              onLeave={() => handleEndCallDirect()}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 gap-3">
              <p className="text-slate-400 text-sm">
                Waiting for meeting details...
              </p>
            </div>
          )}
        </div>

        {/* Chat side panel */}
        {chatOpen && (
          <div className="w-80 lg:w-96 bg-white flex flex-col border-l border-slate-200 flex-shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary-600" />
                <h3 className="font-semibold text-sm text-slate-800">Chat</h3>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageCircle className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">No messages yet</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Send a message to start chatting
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}
                >
                  {msg.from === "doctor" && (
                    <div className="relative w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 mt-1">
                      <Image
                        src={doctorAvatar}
                        alt={doctorName}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl ${msg.from === "me"
                      ? "rounded-br-md bg-primary-600 text-white"
                      : "rounded-bl-md bg-white border border-slate-100 text-slate-700 shadow-sm"
                      }`}
                  >
                    {msg.fileType === "image" && msg.fileUrl ? (
                      <div className="p-2">
                        <img
                          src={msg.fileUrl}
                          alt="shared"
                          className="rounded-lg max-w-full max-h-48 object-contain"
                        />
                        <p
                          className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}
                        >
                          {msg.time}
                        </p>
                      </div>
                    ) : msg.fileType === "file" ? (
                      <div className="px-3.5 py-2.5">
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 rounded-lg ${msg.from === "me" ? "bg-white/10" : "bg-slate-100"}`}
                        >
                          <Download className="w-4 h-4 flex-shrink-0" />
                          <span className="text-xs truncate max-w-[120px]">
                            {msg.fileName}
                          </span>
                        </a>
                        <p
                          className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}
                        >
                          {msg.time}
                        </p>
                      </div>
                    ) : (
                      <div className="px-3.5 py-2.5">
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p
                          className={`text-[10px] mt-1 ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}
                        >
                          {msg.time}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-primary-400">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-slate-400 hover:text-primary-500 flex-shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message…"
                  className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMsg.trim()}
                  className="text-primary-600 disabled:text-slate-300 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-slate-900 border-t border-slate-800 flex-shrink-0 z-10">
        {/* Chat toggle */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all relative ${chatOpen
            ? "bg-primary-500 text-white"
            : "bg-slate-700 hover:bg-slate-600 text-white"
            }`}
        >
          <MessageCircle className="w-5 h-5" />
          {messages.filter((m) => m.from === "doctor").length > 0 &&
            !chatOpen && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {messages.filter((m) => m.from === "doctor").length}
              </span>
            )}
        </button>
        <span className="text-slate-500 text-[10px] -ml-2">Chat</span>

        {/* End call */}
        <button
          onClick={() => setShowEndDialog(true)}
          disabled={isEnding}
          className="w-14 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
        <span className="text-rose-400 text-[10px] -ml-2">End call</span>
      </div>
    </div>
  );
}
