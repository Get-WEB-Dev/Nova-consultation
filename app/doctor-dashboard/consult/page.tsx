"use client";

/**
 * Doctor Consultation Portal
 *
 * Uses Jitsi Meet External API (meet.jit.si) for video.
 * Right panel has: Patient Info, Chat (with files), Notes, Files tabs.
 * Chat + file attachments use our backend (/api/messages, /api/upload).
 * All message operations use doctorProfileId (not auth UUID).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  MessageSquare, Paperclip, FileText, ChevronLeft,
  Send, X, Clock, AlertCircle, CheckCircle2, SkipForward,
  Users, Stethoscope, Activity, Plus, Download, CalendarPlus,
  Loader2
} from "lucide-react";
import JitsiWrapper from "@/app/components/JitsiWrapper";

/* ── Types ── */
interface Patient {
  id: string; user_id?: string; queue_id?: string; consultation_id?: string;
  name: string; symptoms?: string; duration?: string; severity?: string;
  notes?: string; joinedAt: string; status: "active" | "waiting" | "follow_up";
}
interface ChatMsg {
  id: string; from: "doctor" | "patient"; text: string; time: string;
  attachment_url?: string; attachment_name?: string; attachment_type?: string;
}

/* ── Jitsi type ── */
declare global {
  interface Window { JitsiMeetExternalAPI: any; }
}

/* ── Small components ── */
function Timer({ start }: { start: Date }) {
  const [s, setS] = useState(0);
  useEffect(() => { const t = setInterval(() => setS(Math.floor((Date.now() - start.getTime()) / 1000)), 1000); return () => clearInterval(t); }, [start]);
  return <span className="font-mono">{String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}</span>;
}

function PatientAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-xl" }[size];
  return <div className={`${sz} rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0`}><span className="text-white font-bold">{name[0]}</span></div>;
}

/* ────────────────────────────────────────────────────────────── */
export default function ConsultPortal() {
  const router = useRouter();

  // Queue
  const [queue, setQueue] = useState<Patient[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [startTime] = useState(new Date());
  const active = queue[activeIdx];

  // Right panel
  const [rightTab, setRightTab] = useState<"info" | "chat" | "notes" | "files">("info");
  const [chats, setChats] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

  // End call
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [ending, setEnding] = useState(false);

  // Doctor IDs
  const [doctorUserId, setDoctorUserId] = useState<string | null>(null);
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);

  // Computed Jitsi room name
  const roomName = active?.consultation_id ? `NovaHealth_${active.consultation_id.replace(/-/g, "")}` : null;

  // ────────────────────────────────────────────
  // 1. Load doctor user
  // ────────────────────────────────────────────
  useEffect(() => {
    const { getUser } = require("@/lib/supabase/auth");
    const docUser = getUser();
    if (docUser) setDoctorUserId(docUser.id);
  }, []);

  // ────────────────────────────────────────────
  // 2. Load queue + doctor profile ID
  // ────────────────────────────────────────────
  useEffect(() => {
    if (!doctorUserId) return;
    const loadQueue = async () => {
      try {
        // Resolve profile ID
        if (!doctorProfileId) {
          const profileRes = await fetch(`/api/doctor/profile?doctorId=${doctorUserId}`);
          const pData = await profileRes.json();
          if (pData.data?.id) setDoctorProfileId(pData.data.id);
        }
        const dId = doctorProfileId || doctorUserId;
        const res = await fetch(`/api/queue?doctorId=${dId}`);
        const json = await res.json();
        if (json.data) {
          setQueue(json.data.map((e: any, i: number) => ({
            id: e.patient_id,
            user_id: e.patient_id,
            queue_id: e.id,
            consultation_id: e.consultation_id,
            name: e.patientName || "Patient",
            joinedAt: e.joined_at,
            status: i === 0 ? "active" : "waiting",
          })));
        }
      } catch (_) { }
    };
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, [doctorUserId, doctorProfileId]);

  // (Jitsi initialization is now handled by JitsiWrapper)

  // ────────────────────────────────────────────
  // 4. Poll messages
  // ────────────────────────────────────────────
  useEffect(() => {
    if (!active || (!active.consultation_id && !doctorProfileId)) return;
    const fetchMsgs = async () => {
      try {
        const queryParams = active.consultation_id ? `consultationId=${active.consultation_id}` : `doctorId=${doctorProfileId || doctorUserId}&patientId=${active.id}`;
        const res = await fetch(`/api/messages?${queryParams}`);
        const json = await res.json();
        if (json.data) {
          setChats(json.data.map((m: any) => ({
            id: m.id,
            from: m.sender_role === "doctor" ? "doctor" : "patient",
            text: m.body || "",
            attachment_url: m.attachment_url,
            attachment_name: m.attachment_name,
            attachment_type: m.attachment_type,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })));
        }
      } catch (_) { }
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () => clearInterval(interval);
  }, [active?.consultation_id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chats]);

  // ────────────────────────────────────────────
  // 5. Chat — send text (uses doctorProfileId!)
  // ────────────────────────────────────────────
  const sendChat = useCallback(() => {
    if (!input.trim() || !active || !doctorProfileId) return;
    const msgText = input.trim();
    setChats(p => [...p, { id: Date.now().toString(), from: "doctor", text: msgText, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setInput("");
    fetch('/api/messages', {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consultationId: active.consultation_id || undefined,
        doctorId: doctorProfileId, // ← profile ID, not auth UUID
        patientId: active.id,
        senderId: doctorUserId,
        senderRole: "doctor",
        body: msgText,
      })
    }).catch(() => { });
  }, [input, active, doctorUserId, doctorProfileId]);

  // ────────────────────────────────────────────
  // 6. Chat — file upload
  // ────────────────────────────────────────────
  const handleChatFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active || !doctorProfileId) return;
    const isImage = file.type.startsWith("image/");
    // Optimistic
    setChats(p => [...p, { id: Date.now().toString(), from: "doctor", text: "", attachment_url: URL.createObjectURL(file), attachment_name: file.name, attachment_type: isImage ? "image" : "document", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    try {
      const fd = new FormData(); fd.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: active.consultation_id || undefined,
          patientId: active.user_id || active.id,
          doctorId: doctorProfileId,
          senderId: doctorUserId,
          senderRole: 'doctor',
          attachmentUrl: uploadData.url,
          attachmentName: uploadData.name,
          attachmentType: isImage ? 'image' : 'document',
          attachmentSize: uploadData.size,
        })
      });
    } catch (err) { console.error(err); }
    e.target.value = "";
  }, [active, doctorUserId, doctorProfileId]);

  // ────────────────────────────────────────────
  // 7. End consultation
  // ────────────────────────────────────────────
  const endConsult = useCallback(async (scheduleFollowUp: boolean = false) => {
    if (!active) return;
    setEnding(true);
    setShowEndDialog(false);
    try {
      // (Jitsi disposal is handled by JitsiWrapper unmount)

      // Update status
      await fetch('/api/consultations/status', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: active.consultation_id, status: scheduleFollowUp ? 'follow_up' : 'completed' })
      });
      // Remove from queue
      const dId = doctorProfileId || doctorUserId;
      if (dId) await fetch("/api/queue", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: dId, patientId: active.id })
      });
    } catch (err) { console.error("Failed to end consult", err); }

    setTimeout(() => {
      const next = queue.filter((_, i) => i !== activeIdx);
      if (!next.length) { router.push("/doctor-dashboard"); return; }
      setQueue(next); setActiveIdx(0); setEnding(false); setNotes(""); setChats([]); setNotesSaved(false);
    }, 500);
  }, [queue, activeIdx, router, doctorUserId, doctorProfileId, active]);

  // ────────────────────────────────────────────
  const TABS = [
    { key: "info" as const, icon: FileText, label: "Info" },
    { key: "chat" as const, icon: MessageSquare, label: "Chat" },
    { key: "notes" as const, icon: Activity, label: "Notes" },
    { key: "files" as const, icon: Paperclip, label: "Files" },
  ];

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#0A0E14] flex flex-col overflow-hidden select-none">
      {/* ── End Consultation Dialog ── */}
      {showEndDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a2233] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-white text-lg font-bold mb-2">End Consultation</h3>
            <p className="text-slate-400 text-sm mb-6">How would you like to end this session with {active?.name}?</p>
            <div className="space-y-2.5">
              <button onClick={() => endConsult(false)} disabled={ending} className="w-full flex items-center gap-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50">
                <PhoneOff className="w-5 h-5" />
                <div className="text-left"><p className="text-sm font-semibold">End Consultation</p><p className="text-xs text-red-400/70">Mark completed and remove from queue</p></div>
              </button>
              <button onClick={() => endConsult(true)} disabled={ending} className="w-full flex items-center gap-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50">
                <CalendarPlus className="w-5 h-5" />
                <div className="text-left"><p className="text-sm font-semibold">Schedule Follow-up</p><p className="text-xs text-purple-400/70">End and add to follow-up list</p></div>
              </button>
              <button onClick={() => setShowEndDialog(false)} className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div className="h-12 bg-[#111827] border-b border-white/[0.06] flex items-center justify-between px-4 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/doctor-dashboard")} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"><ChevronLeft className="w-4 h-4" /><span className="hidden sm:block">Exit</span></button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary-400" /><span className="text-white text-sm font-semibold hidden sm:block">Consultation Portal</span></div>
        </div>
        <div className="flex items-center gap-2">
          {active && <div className="flex items-center gap-2 bg-white/[0.06] rounded-xl px-3 py-1.5 text-sm text-slate-300"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><Timer start={startTime} /></div>}
          <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-xl px-3 py-1.5"><Users className="w-3.5 h-3.5 text-slate-400" /><span className="text-slate-300 text-xs font-medium">{queue.length} in queue</span></div>
        </div>
        <div className="w-20" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Queue ── */}
        <div className="hidden lg:flex w-56 xl:w-64 bg-[#111827] border-r border-white/[0.06] flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-white/[0.06]"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Queue</p></div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {queue.map((p, i) => (
              <button key={p.id + i} onClick={() => { setActiveIdx(i); }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${i === activeIdx ? "bg-primary-600/20 border-primary-500/40" : "bg-white/[0.03] border-white/[0.04] hover:bg-white/[0.06]"}`}>
                <div className="flex items-center gap-2.5">
                  <div className="relative"><PatientAvatar name={p.name} size="sm" />{i === activeIdx && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111827]" />}</div>
                  <div className="flex-1 min-w-0"><p className={`text-sm font-semibold truncate ${i === activeIdx ? "text-white" : "text-slate-300"}`}>{p.name}</p></div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${i === activeIdx ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{i === activeIdx ? "Active" : "Waiting"}</span>
                  <span className="text-[10px] text-slate-600 ml-auto">{Math.floor((Date.now() - new Date(p.joinedAt).getTime()) / 60000)}m</span>
                </div>
              </button>
            ))}
            {queue.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-slate-500 text-sm">No patients in queue</p>
                <p className="text-slate-600 text-xs mt-1">Patients will appear when they join</p>
              </div>
            )}
          </div>
        </div>

        {/* ── CENTER: Video ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative overflow-hidden bg-[#0A0E14]">
            {!active ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0A0E14] z-10">
                <div className="text-center">
                  <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">No active consultation</p>
                  <p className="text-slate-600 text-sm mt-1">Patients will appear when they join the queue</p>
                  <button onClick={() => router.push("/doctor-dashboard")} className="text-primary-400 text-sm mt-3 hover:text-primary-300">Return to dashboard</button>
                </div>
              </div>
            ) : roomName ? (
              <JitsiWrapper
                roomName={roomName}
                displayName="Doctor"
                onReadyToClose={() => setShowEndDialog(true)}
              />
            ) : null}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2.5 py-4 px-4 bg-[#111827] border-t border-white/[0.06] flex-shrink-0">
            <button onClick={() => setShowEndDialog(true)} disabled={ending || !active}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 mx-1">
              <PhoneOff className="w-4 h-4" /><span className="text-sm">End</span>
            </button>
            {queue.length > 1 && (
              <button onClick={() => setShowEndDialog(true)} className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] text-slate-300 text-sm px-4 py-2.5 rounded-xl transition-all">
                <SkipForward className="w-4 h-4" /><span className="hidden sm:block">Next</span>
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Tools ── */}
        <div className="hidden lg:flex w-72 xl:w-80 bg-[#111827] border-l border-white/[0.06] flex-col flex-shrink-0">
          <div className="flex border-b border-white/[0.06] flex-shrink-0">
            {TABS.map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setRightTab(key)}
                className={`flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${rightTab === key ? "text-white border-b-2 border-primary-400" : "text-slate-600 hover:text-slate-400"}`}>
                <Icon className="w-4 h-4" /><span className="hidden xl:block">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* INFO TAB */}
            {rightTab === "info" && active && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center gap-3 mb-1"><PatientAvatar name={active.name} size="md" /><div><p className="text-white font-bold text-sm">{active.name}</p><p className="text-slate-500 text-xs">Intake Summary</p></div></div>
                {[
                  { label: "Symptoms", value: active.symptoms, icon: AlertCircle, color: "text-red-400" },
                  { label: "Duration", value: active.duration, icon: Clock, color: "text-amber-400" },
                  { label: "Severity", value: active.severity, icon: Activity, color: "text-orange-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white/[0.04] rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1"><Icon className={`w-3.5 h-3.5 ${color}`} /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span></div>
                    <p className="text-slate-200 text-sm">{value || "—"}</p>
                  </div>
                ))}
              </div>
            )}

            {/* CHAT TAB */}
            {rightTab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chats.length === 0 && <div className="flex flex-col items-center justify-center py-12 text-center"><MessageSquare className="w-8 h-8 text-slate-700 mb-2" /><p className="text-slate-500 text-sm">No messages yet</p></div>}
                  {chats.map(msg => (
                    <div key={msg.id} className={`flex ${msg.from === "doctor" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm ${msg.from === "doctor" ? "bg-primary-600 text-white rounded-br-sm" : "bg-white/[0.08] text-slate-200 rounded-bl-sm"}`}>
                        {msg.attachment_url ? (
                          <div>
                            {msg.attachment_type === 'image' ? (
                              <img src={msg.attachment_url} alt={msg.attachment_name || "image"} className="rounded-lg max-w-full max-h-40 object-contain" />
                            ) : (
                              <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><Download className="w-4 h-4" /><span className="text-xs truncate">{msg.attachment_name || 'File'}</span></a>
                            )}
                            <p className={`text-[10px] mt-1 ${msg.from === "doctor" ? "text-primary-200" : "text-slate-500"}`}>{msg.time}</p>
                          </div>
                        ) : (
                          <><p className="leading-relaxed">{msg.text}</p><p className={`text-[10px] mt-0.5 ${msg.from === "doctor" ? "text-primary-200" : "text-slate-500"}`}>{msg.time}</p></>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
                  <input type="file" ref={chatFileRef} className="hidden" onChange={handleChatFileUpload} accept="image/*,.pdf,.doc,.docx,.txt" />
                  <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2">
                    <button onClick={() => chatFileRef.current?.click()} className="text-slate-500 hover:text-primary-400 transition-colors flex-shrink-0" title="Attach file"><Paperclip className="w-4 h-4" /></button>
                    <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="Type a message…" className="flex-1 bg-transparent text-slate-200 text-sm placeholder-slate-600 focus:outline-none" />
                    <button onClick={sendChat} disabled={!input.trim()} className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"><Send className="w-3.5 h-3.5 text-white" /></button>
                  </div>
                </div>
              </>
            )}

            {/* NOTES TAB */}
            {rightTab === "notes" && (
              <div className="flex-1 flex flex-col p-3 gap-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Consultation Notes</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={`Notes for ${active?.name || "patient"}…\n\n• Diagnosis\n• Prescription\n• Follow-up`} className="flex-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-xl text-slate-200 text-sm p-3 focus:outline-none focus:border-primary-500/40 placeholder-slate-700 resize-none" />
                <button onClick={() => { setNotesSaved(true); setTimeout(() => setNotesSaved(false), 2000); }} className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${notesSaved ? "bg-emerald-600 text-white" : "bg-accent-500 hover:bg-accent-600 text-white"}`}>
                  {notesSaved ? <><CheckCircle2 className="w-4 h-4" />Saved!</> : <><CheckCircle2 className="w-4 h-4" />Save Notes</>}
                </button>
              </div>
            )}

            {/* FILES TAB */}
            {rightTab === "files" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shared Files</p>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/[0.08] rounded-xl p-5 cursor-pointer hover:border-primary-500/40 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] group-hover:bg-primary-500/10 flex items-center justify-center transition-colors"><Plus className="w-5 h-5 text-slate-500 group-hover:text-primary-400" /></div>
                  <p className="text-xs text-slate-500 text-center">Click to share a file</p>
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !active || !doctorProfileId) return;
                    const fd = new FormData(); fd.append('file', file);
                    try {
                      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                      if (!uploadRes.ok) throw new Error('Upload failed');
                      const uploadData = await uploadRes.json();
                      await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: active.consultation_id || undefined, patientId: active.user_id || active.id, doctorId: doctorProfileId, senderId: doctorUserId, senderRole: 'doctor', attachmentUrl: uploadData.url, attachmentName: uploadData.name, attachmentType: file.type.startsWith('image/') ? 'image' : 'document' }) });
                    } catch (err) { console.error(err); }
                  }} />
                </label>
                <div className="space-y-2">
                  {chats.filter(m => m.attachment_url).map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 p-2.5 bg-white/[0.04] rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">{m.attachment_type === 'image' ? 'IMG' : 'DOC'}</div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-300 truncate">{m.attachment_name || 'File'}</p><p className="text-[10px] text-slate-600">From {m.from}</p></div>
                      <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-400 transition-colors"><Download className="w-4 h-4" /></a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
