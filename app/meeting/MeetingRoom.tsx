"use client";

/**
 * Patient-side Meeting Room — Production-Ready
 *
 * Uses Zoom Video SDK for video (via ZoomVideoCall component).
 * Chat + file attachments use Supabase Realtime (no polling).
 * Notes & follow-up panel with auto-save.
 * End-call shows confirmation, then cleans up consultation + queue.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MessageCircle, X, Send, Paperclip, Download,
  PhoneOff, Wifi, WifiOff, Video, VideoOff,
  Mic, MicOff, FileText, ChevronRight, Check,
  CheckCheck, Loader2, AlertCircle, Clock,
} from "lucide-react";
import ZoomVideoCall from "../components/ZoomVideoCall";
import { supabase } from "@/lib/supabase/client";

/* ── Types ── */
interface ChatMsg {
  id: string;
  from: "me" | "doctor";
  text?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: "image" | "file";
  time: string;
  timestamp: number;
  status?: "sending" | "sent" | "delivered" | "seen";
}

interface MeetingRoomProps {
  consultationId?: string | null;
  doctorId?: string;
  patientId?: string;
  onEnd?: () => void;
}

interface NotesData {
  chiefComplaint: string;
  diagnosis: string;
  prescription: string;
  clinicalNotes: string;
  followUpPlan: string;
  nextAppointment: string;
}

interface ZoomState {
  videoOn: boolean;
  audioOn: boolean;
  connectionQuality: string;
  remoteCount: number;
  joined: boolean;
  reconnecting: boolean;
  cameraBlocked: boolean;
}

/* ── Helpers ── */
const nowTime = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const formatDuration = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

const isNearBottom = (el: HTMLElement, threshold = 100) => {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
};

/* ── Message grouping helper (WhatsApp-style) ── */
function groupMessages(messages: ChatMsg[]) {
  const groups: { from: "me" | "doctor"; messages: ChatMsg[]; key: string }[] = [];
  let current: typeof groups[0] | null = null;

  for (const msg of messages) {
    const shouldGroup =
      current &&
      current.from === msg.from &&
      msg.timestamp - current.messages[current.messages.length - 1].timestamp < 300000; // 5 min

    if (shouldGroup && current) {
      current.messages.push(msg);
    } else {
      current = { from: msg.from, messages: [msg], key: msg.id };
      groups.push(current);
    }
  }
  return groups;
}

/* ── Component ── */
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
  const [zoomState, setZoomState] = useState<ZoomState>({
    videoOn: false, audioOn: false, connectionQuality: "good",
    remoteCount: 0, joined: false, reconnecting: false, cameraBlocked: false,
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [doctorTyping, setDoctorTyping] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeConsultationId, setActiveConsultationId] = useState<string | null>(consultationId || null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Notes state
  const [notes, setNotes] = useState<NotesData>({
    chiefComplaint: "", diagnosis: "", prescription: "",
    clinicalNotes: "", followUpPlan: "", nextAppointment: "",
  });
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const broadcastChannelRef = useRef<any>(null);

  // Room name
  const roomName = activeConsultationId
    ? `NovaHealth_${activeConsultationId.replace(/-/g, "")}`
    : (doctorId && patientId)
      ? `NovaHealth_${doctorId.replace(/-/g, "")}_${patientId.replace(/-/g, "")}`
      : null;

  // ────────────────────────────────────────────
  // 1. Auto-create consultation if missing
  // ────────────────────────────────────────────
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
  // 3. Supabase Realtime — Messages
  // ────────────────────────────────────────────
  useEffect(() => {
    if (!doctorId || !patientId) return;

    // Initial fetch
    const fetchInitial = async () => {
      try {
        const params = `doctorId=${doctorId}&patientId=${patientId}`;
        const res = await fetch(`/api/messages?${params}`);
        const json = await res.json();
        if (json.data) {
          const mapped = json.data.map((m: any) => {
            const msg: ChatMsg = {
              id: m.id,
              from: m.sender_role === "patient" ? "me" : "doctor",
              text: m.body || "",
              time: new Date(m.created_at).toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit",
              }),
              timestamp: new Date(m.created_at).getTime(),
              fileUrl: m.attachment_url,
              fileName: m.attachment_name,
              fileType: m.attachment_type === "image" ? "image" : m.attachment_url ? "file" : undefined,
              status: "delivered",
            };
            messageIdsRef.current.add(m.id);
            return msg;
          });
          setMessages(mapped);
        }
      } catch (_) { }
    };
    fetchInitial();

    // Subscribe to new messages via Supabase Realtime
    const channel = supabase
      .channel(`messages:${doctorId}:${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `doctor_id=eq.${doctorId}`,
        },
        (payload: any) => {
          const m = payload.new;
          if (!m || m.patient_id !== patientId) return;

          // Deduplicate
          if (messageIdsRef.current.has(m.id)) return;
          messageIdsRef.current.add(m.id);

          // Only add messages from the doctor (patient messages are added optimistically)
          if (m.sender_role === "doctor") {
            const msg: ChatMsg = {
              id: m.id,
              from: "doctor",
              text: m.body || "",
              time: new Date(m.created_at).toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit",
              }),
              timestamp: new Date(m.created_at).getTime(),
              fileUrl: m.attachment_url,
              fileName: m.attachment_name,
              fileType: m.attachment_type === "image" ? "image" : m.attachment_url ? "file" : undefined,
              status: "delivered",
            };
            setMessages((prev) => [...prev, msg]);
            if (!chatOpen) {
              setUnreadCount((c) => c + 1);
            }
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [doctorId, patientId, chatOpen]);

  // ────────────────────────────────────────────
  // 3b. Broadcast channel — typing indicators
  // ────────────────────────────────────────────
  useEffect(() => {
    if (!doctorId || !patientId) return;

    const channel = supabase.channel(`typing:${doctorId}:${patientId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "typing" }, (payload: any) => {
      if (payload.payload?.role === "doctor") {
        setDoctorTyping(true);
        // Auto-clear after 3s
        setTimeout(() => setDoctorTyping(false), 3000);
      }
    });

    channel.subscribe();
    broadcastChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [doctorId, patientId]);

  // Emit typing indicator
  const emitTyping = useCallback(() => {
    if (!broadcastChannelRef.current) return;
    broadcastChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { role: "patient" },
    });
  }, []);

  // ────────────────────────────────────────────
  // 4. Auto-scroll chat (with position preservation)
  // ────────────────────────────────────────────
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll]);

  const handleChatScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    setShouldAutoScroll(isNearBottom(container));
  }, []);

  // Clear unread on chat open
  useEffect(() => {
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

  // ────────────────────────────────────────────
  // 5. Send text message
  // ────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    const cid = activeConsultationId || consultationId;
    if (!newMsg.trim() || (!cid && (!doctorId || !patientId))) return;
    const text = newMsg.trim();
    const tempId = `c-${Date.now()}`;

    // Optimistic add
    const optimistic: ChatMsg = {
      id: tempId,
      from: "me",
      text,
      time: nowTime(),
      timestamp: Date.now(),
      status: "sending",
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMsg("");
    setShouldAutoScroll(true);

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
    })
      .then(async (res) => {
        if (res.ok) {
          const json = await res.json();
          const serverId = json.data?.id;
          if (serverId) {
            messageIdsRef.current.add(serverId);
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, id: serverId || m.id, status: "sent" as const }
                : m
            )
          );
        }
      })
      .catch(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "sent" as const } : m
          )
        );
      });
  }, [newMsg, activeConsultationId, consultationId, doctorId, patientId]);

  // ────────────────────────────────────────────
  // 6. File upload with progress
  // ────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const cid = activeConsultationId || consultationId;
      if (!file || (!cid && (!doctorId || !patientId))) return;
      const isImage = file.type.startsWith("image/");

      // Optimistic
      const tempId = `c-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          from: "me",
          fileUrl: URL.createObjectURL(file),
          fileName: file.name,
          fileType: isImage ? "image" : "file",
          time: nowTime(),
          timestamp: Date.now(),
          status: "sending",
        },
      ]);
      setShouldAutoScroll(true);

      try {
        // Upload with progress tracking
        const fd = new FormData();
        fd.append("file", file);

        const xhr = new XMLHttpRequest();
        const uploadPromise = new Promise<any>((resolve, reject) => {
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
            }
          };
          xhr.onload = () => {
            setUploadProgress(null);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error("Upload failed"));
            }
          };
          xhr.onerror = () => {
            setUploadProgress(null);
            reject(new Error("Upload failed"));
          };
          xhr.open("POST", "/api/upload");
          xhr.send(fd);
        });

        const data = await uploadPromise;
        const msgRes = await fetch("/api/messages", {
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
        if (msgRes.ok) {
          const json = await msgRes.json();
          if (json.data?.id) messageIdsRef.current.add(json.data.id);
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "sent" as const } : m))
        );
      } catch (err) {
        console.error("Upload error", err);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "sent" as const } : m))
        );
      }
      e.target.value = "";
    },
    [activeConsultationId, consultationId, doctorId, patientId]
  );

  // ────────────────────────────────────────────
  // 7. Notes — auto-save with debounce
  // ────────────────────────────────────────────
  const updateNotes = useCallback(
    (field: keyof NotesData, value: string) => {
      setNotes((prev) => ({ ...prev, [field]: value }));
      setNotesSaved(false);

      if (notesSaveTimerRef.current) clearTimeout(notesSaveTimerRef.current);
      notesSaveTimerRef.current = setTimeout(async () => {
        const cid = activeConsultationId || consultationId;
        if (!cid) return;
        setNotesSaving(true);
        try {
          await fetch("/api/consultations/notes", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              consultationId: cid,
              notes: {
                chiefComplaint: notes.chiefComplaint,
                diagnosis: notes.diagnosis,
                prescription: notes.prescription,
                clinicalNotes: notes.clinicalNotes,
                followUpPlan: notes.followUpPlan,
                [field]: value,
              },
            }),
          });
          setNotesSaved(true);
        } catch (err) {
          console.error("Notes save error:", err);
        }
        setNotesSaving(false);
      }, 1500);
    },
    [activeConsultationId, consultationId, notes]
  );

  // Cleanup notes timer
  useEffect(() => {
    return () => {
      if (notesSaveTimerRef.current) clearTimeout(notesSaveTimerRef.current);
    };
  }, []);

  // ────────────────────────────────────────────
  // 8. End call — with cleanup
  // ────────────────────────────────────────────
  const handleEndCallDirect = useCallback(async () => {
    setIsEnding(true);
    setShowEndDialog(false);
    try {
      const cid = activeConsultationId || consultationId;
      if (cid) {
        await fetch("/api/consultations/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultationId: cid,
            status: "completed",
            endedAt: new Date().toISOString(),
            durationMinutes: Math.ceil(elapsed / 60),
          }),
        });
      }
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
  }, [activeConsultationId, consultationId, doctorId, patientId, onEnd, router, elapsed]);

  // ────────────────────────────────────────────
  // Memoized message groups
  // ────────────────────────────────────────────
  const messageGroups = useMemo(() => groupMessages(messages), [messages]);

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  const connectionIcon = zoomState.connectionQuality === "good"
    ? <Wifi className="w-4 h-4 text-emerald-400" />
    : <WifiOff className="w-4 h-4 text-amber-400" />;

  const connectionText = zoomState.reconnecting
    ? "Reconnecting…"
    : zoomState.joined
      ? "Connected"
      : "Connecting…";

  const connectionColor = zoomState.reconnecting
    ? "text-amber-400"
    : zoomState.joined
      ? "text-emerald-400"
      : "text-slate-400";

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900 overflow-hidden">
      {/* ── End Call Confirmation ── */}
      {showEndDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in duration-200">
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
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 flex-shrink-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Timer */}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-white font-mono text-sm">
              {formatDuration(elapsed)}
            </span>
          </div>
          {/* Connection */}
          <div className="flex items-center gap-1.5">
            {connectionIcon}
            <span className={`${connectionColor} text-xs font-medium hidden sm:inline`}>
              {connectionText}
            </span>
          </div>
        </div>
        {/* Doctor info */}
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
            <p className={`${connectionColor} text-xs mt-0.5`}>
              {zoomState.remoteCount > 0 ? "● In call" : "● Waiting…"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main: Zoom + Panels ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Zoom video area */}
        <div className={`flex-1 relative bg-black min-w-0 transition-all duration-300 ${(chatOpen || notesOpen) ? "lg:mr-0" : ""}`}>
          {roomName ? (
            <ZoomVideoCall
              roomName={roomName}
              userName="Patient"
              onReady={() => { }}
              onLeave={() => handleEndCallDirect()}
              onStateChange={(s: ZoomState) => setZoomState(s)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 gap-3">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <p className="text-slate-400 text-sm">
                Setting up meeting room...
              </p>
            </div>
          )}
        </div>

        {/* ── Chat side panel ── */}
        {chatOpen && (
          <div className="w-80 lg:w-96 bg-white flex flex-col border-l border-slate-200 flex-shrink-0 absolute sm:relative inset-0 sm:inset-auto z-20 sm:z-auto">
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
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto p-4 space-y-1 bg-slate-50/50"
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageCircle className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">No messages yet</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Send a message to start chatting
                  </p>
                </div>
              )}

              {messageGroups.map((group) => (
                <div key={group.key} className="mb-3">
                  {group.messages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"} ${idx > 0 ? "mt-0.5" : ""}`}
                    >
                      {/* Doctor avatar — only on first message in group */}
                      {msg.from === "doctor" && idx === 0 && (
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
                      {msg.from === "doctor" && idx > 0 && (
                        <div className="w-7 mr-2 flex-shrink-0" />
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl ${msg.from === "me"
                          ? `${idx === group.messages.length - 1 ? "rounded-br-md" : ""} bg-primary-600 text-white`
                          : `${idx === group.messages.length - 1 ? "rounded-bl-md" : ""} bg-white border border-slate-100 text-slate-700 shadow-sm`
                          }`}
                      >
                        {msg.fileType === "image" && msg.fileUrl ? (
                          <div className="p-2">
                            <img
                              src={msg.fileUrl}
                              alt="shared"
                              className="rounded-lg max-w-full max-h-48 object-contain"
                            />
                            <div className={`flex items-center gap-1 mt-1 ${msg.from === "me" ? "justify-end" : ""}`}>
                              <p className={`text-[10px] ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>
                                {msg.time}
                              </p>
                              {msg.from === "me" && <MessageStatus status={msg.status} />}
                            </div>
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
                            <div className={`flex items-center gap-1 mt-1 ${msg.from === "me" ? "justify-end" : ""}`}>
                              <p className={`text-[10px] ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>
                                {msg.time}
                              </p>
                              {msg.from === "me" && <MessageStatus status={msg.status} />}
                            </div>
                          </div>
                        ) : (
                          <div className="px-3.5 py-2">
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <div className={`flex items-center gap-1 mt-0.5 ${msg.from === "me" ? "justify-end" : ""}`}>
                              <p className={`text-[10px] ${msg.from === "me" ? "text-white/60" : "text-slate-400"}`}>
                                {msg.time}
                              </p>
                              {msg.from === "me" && <MessageStatus status={msg.status} />}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Typing indicator */}
              {doctorTyping && (
                <div className="flex items-center gap-2 pl-9">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="px-4 py-2 bg-primary-50 border-t border-primary-100">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-primary-500 animate-spin" />
                  <span className="text-xs text-primary-600 font-medium">Uploading… {uploadProgress}%</span>
                </div>
                <div className="w-full bg-primary-100 rounded-full h-1 mt-1">
                  <div
                    className="bg-primary-500 h-1 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Input */}
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
                  className="text-slate-400 hover:text-primary-500 flex-shrink-0 transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => {
                    setNewMsg(e.target.value);
                    emitTyping();
                  }}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message…"
                  className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMsg.trim()}
                  className="text-primary-600 disabled:text-slate-300 flex-shrink-0 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Notes & Follow-Up Panel ── */}
        {notesOpen && (
          <div className="w-80 lg:w-96 bg-white flex flex-col border-l border-slate-200 flex-shrink-0 absolute sm:relative inset-0 sm:inset-auto z-20 sm:z-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" />
                <h3 className="font-semibold text-sm text-slate-800">Notes & Follow-Up</h3>
                {notesSaving && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                  </span>
                )}
                {notesSaved && !notesSaving && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
              </div>
              <button
                onClick={() => setNotesOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notes form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <NoteField
                label="Chief Complaint"
                value={notes.chiefComplaint}
                placeholder="Patient's main concern…"
                onChange={(v) => updateNotes("chiefComplaint", v)}
              />
              <NoteField
                label="Diagnosis"
                value={notes.diagnosis}
                placeholder="Medical diagnosis…"
                onChange={(v) => updateNotes("diagnosis", v)}
              />
              <NoteField
                label="Prescription"
                value={notes.prescription}
                placeholder="Medications and dosage…"
                onChange={(v) => updateNotes("prescription", v)}
                rows={3}
              />
              <NoteField
                label="Clinical Notes"
                value={notes.clinicalNotes}
                placeholder="Additional observations…"
                onChange={(v) => updateNotes("clinicalNotes", v)}
                rows={4}
              />
              <NoteField
                label="Follow-Up Plan"
                value={notes.followUpPlan}
                placeholder="Recommended follow-up actions…"
                onChange={(v) => updateNotes("followUpPlan", v)}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Next Appointment
                </label>
                <input
                  type="date"
                  value={notes.nextAppointment}
                  onChange={(e) => updateNotes("nextAppointment", e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-3 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 flex-shrink-0 z-10">
        {/* Mic toggle */}
        <ControlButton
          active={zoomState.audioOn}
          icon={zoomState.audioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          label={zoomState.audioOn ? "Mute" : "Unmute"}
          onClick={() => {
            const el = document.querySelector(".zoom-controls .zoom-btn:first-child") as HTMLButtonElement;
            el?.click();
          }}
        />

        {/* Video toggle */}
        <ControlButton
          active={zoomState.videoOn}
          icon={zoomState.videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          label={zoomState.videoOn ? "Stop Video" : "Start Video"}
          onClick={() => {
            const el = document.querySelector(".zoom-controls .zoom-btn:nth-child(2)") as HTMLButtonElement;
            el?.click();
          }}
        />

        {/* Chat toggle */}
        <div className="relative">
          <ControlButton
            active={chatOpen}
            icon={<MessageCircle className="w-5 h-5" />}
            label="Chat"
            onClick={() => { setChatOpen(!chatOpen); if (notesOpen) setNotesOpen(false); }}
            highlight={chatOpen}
          />
          {unreadCount > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        {/* Notes toggle */}
        <ControlButton
          active={notesOpen}
          icon={<FileText className="w-5 h-5" />}
          label="Notes"
          onClick={() => { setNotesOpen(!notesOpen); if (chatOpen) setChatOpen(false); }}
          highlight={notesOpen}
        />

        {/* Spacer */}
        <div className="w-px h-8 bg-slate-700 mx-1" />

        {/* End call */}
        <button
          onClick={() => setShowEndDialog(true)}
          disabled={isEnding}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="hidden sm:inline text-sm">End</span>
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ControlButton({
  active,
  icon,
  label,
  onClick,
  highlight,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${highlight
          ? "bg-primary-500 text-white"
          : active
            ? "bg-slate-700 hover:bg-slate-600 text-white"
            : "bg-slate-700/60 hover:bg-slate-600 text-slate-400"
          }`}
      >
        {icon}
      </button>
      <span className="text-slate-500 text-[10px]">{label}</span>
    </div>
  );
}

function MessageStatus({ status }: { status?: string }) {
  if (!status || status === "sending") {
    return <Clock className="w-3 h-3 text-white/40" />;
  }
  if (status === "sent") {
    return <Check className="w-3 h-3 text-white/50" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="w-3 h-3 text-white/50" />;
  }
  if (status === "seen") {
    return <CheckCheck className="w-3 h-3 text-blue-300" />;
  }
  return null;
}

function NoteField({
  label,
  value,
  placeholder,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder:text-slate-400 focus:border-primary-400 focus:ring-1 focus:ring-primary-400 outline-none resize-none transition-all"
      />
    </div>
  );
}
