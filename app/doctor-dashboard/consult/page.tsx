"use client";

/**
 * Doctor Consultation Portal
 *
 * Uses Zoom Video SDK for video.
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
  Loader2, Check, CheckCheck
} from "lucide-react";
import ZoomVideoCall from "@/app/components/ZoomVideoCall";

/* ── Types ── */
interface Patient {
  id: string; user_id?: string; queue_id?: string; consultation_id?: string;
  name: string; symptoms?: string; duration?: string; severity?: string;
  notes?: string; joinedAt: string; started_at?: string; status: "active" | "waiting" | "follow_up";
}
interface ChatMsg {
  id: string; from: "doctor" | "patient"; text: string; time: string;
  attachment_url?: string; attachment_name?: string; attachment_type?: string;
  status?: "sent" | "delivered";
}

/* ── Zoom Video SDK ── */

/* ── Small components ── */
function Timer({ start }: { start: Date }) {
  const [s, setS] = useState(0);
  useEffect(() => { const t = setInterval(() => setS(Math.floor((Date.now() - start.getTime()) / 1000)), 1000); return () => clearInterval(t); }, [start]);
  const isOvertime = s > 15 * 60; // 15 mins
  return <span className={`font-mono ${isOvertime ? 'text-red-400 font-bold animate-pulse' : ''}`}>{String(Math.floor(s / 60)).padStart(2, "0")}:{String(s % 60).padStart(2, "0")}</span>;
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
  const [rightTab, setRightTab] = useState<"queue" | "info" | "chat" | "notes" | "files">("info");
  const [chats, setChats] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState({
    chiefComplaint: "",
    diagnosis: "",
    prescription: "",
    clinicalNotes: "",
    followUpPlan: "",
  });
  const [notesSaved, setNotesSaved] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [fileCategory, setFileCategory] = useState<"document" | "prescription" | "lab_result">("document");

  // Mobile layout control
  const [mobileToolsSize, setMobileToolsSize] = useState<"min" | "half" | "max">("half");

  const [toasts, setToasts] = useState<{ id: string, msg: string, type: 'success' | 'error' | 'info' }[]>([]);
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const saveNotes = async () => {
    if (!active || !active.consultation_id || (!doctorProfileId && !doctorUserId)) return;
    setIsSavingNotes(true);
    try {
      const res = await fetch('/api/consultations/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: active.consultation_id,
          doctorId: doctorProfileId || doctorUserId,
          patientId: active.id,
          notes: notes
        })
      });
      if (!res.ok) throw new Error("Failed to save notes");
      setNotesSaved(true);
      showToast("Notes saved successfully", "success");
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
      console.error(err);
      showToast("Could not save notes. Please try again.", "error");
    } finally {
      setIsSavingNotes(false);
    }
  };
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

  // End call
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [ending, setEnding] = useState(false);
  const [outcome, setOutcome] = useState<"completed" | "follow_up" | "referred" | "emergency">("completed");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpPriority, setFollowUpPriority] = useState<"low" | "medium" | "high">("medium");

  // Doctor IDs
  const [doctorUserId, setDoctorUserId] = useState<string | null>(null);
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);
  const prevQueueIdsRef = useRef<string[]>([]);

  // Computed Zoom room name — fallback to doctorId+patientId if no consultation_id
  const roomName = active?.consultation_id
    ? `NovaHealth_${active.consultation_id.replace(/-/g, "")}`
    : (active && (doctorProfileId || doctorUserId))
      ? `NovaHealth_${(doctorProfileId || doctorUserId || "").replace(/-/g, "")}_${active.id.replace(/-/g, "")}`
      : null;

  // Auto-create consultation if queue entry has none
  useEffect(() => {
    if (!active || active.consultation_id || !doctorProfileId || !active.id) return;
    const createConsult = async () => {
      try {
        const res = await fetch("/api/consultations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doctorId: doctorProfileId, patientId: active.id }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.id) {
            // Update the queue entry with the new consultation_id
            setQueue((prev) =>
              prev.map((p, i) =>
                i === activeIdx ? { ...p, consultation_id: json.data.id } : p
              )
            );
          }
        }
      } catch (e) {
        console.warn("Auto-create consultation for doctor failed:", e);
      }
    };
    createConsult();
  }, [active?.id, active?.consultation_id, doctorProfileId, activeIdx]);

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
          const newQueue = json.data.map((e: any, i: number) => ({
            id: e.patient_id,
            user_id: e.patient_id,
            queue_id: e.id,
            consultation_id: e.consultation_id,
            name: e.patientName || "Patient",
            symptoms: e.symptoms,
            duration: e.duration,
            severity: e.severity,
            joinedAt: e.joined_at,
            status: i === 0 ? "active" : "waiting",
          }));

          const newIds = newQueue.map((p: any) => p.id);
          if (prevQueueIdsRef.current.length > 0) {
            const added = newIds.filter((id: any) => !prevQueueIdsRef.current.includes(id));
            if (added.length > 0) showToast(`${added.length} new patient(s) joined the queue!`, "info");
          }
          prevQueueIdsRef.current = newIds;

          // Only update if data changed to prevent unnecessary re-renders
          setQueue((prev) => {
            const prevIds = prev.map((p) => p.id + (p.consultation_id || "")).join(",");
            const newJoinIds = newQueue.map((p: any) => p.id + (p.consultation_id || "")).join(",");
            return prevIds === newJoinIds ? prev : newQueue;
          });
        }
      } catch (_) { }
    };
    loadQueue();
    const interval = setInterval(loadQueue, 8000);
    return () => clearInterval(interval);
  }, [doctorUserId, doctorProfileId]);

  // (Zoom initialization is handled by ZoomVideoCall)

  // ────────────────────────────────────────────
  // 4. Poll messages
  // ────────────────────────────────────────────
  useEffect(() => {
    if (!active || (!active.consultation_id && !doctorProfileId)) return;
    const controller = new AbortController();
    const fetchMsgs = async () => {
      try {
        const dId = doctorProfileId || doctorUserId;
        // ALWAYS fetch full history between doctor and patient if both IDs are known
        const queryParams = (dId && active.id) ? `doctorId=${dId}&patientId=${active.id}` : `consultationId=${active.consultation_id}`;
        const res = await fetch(`/api/messages?${queryParams}`, { signal: controller.signal });
        const json = await res.json();
        if (json.data) {
          setChats(json.data.map((m: any) => ({
            id: m.id,
            from: m.sender_role === "doctor" ? "doctor" : "patient",
            text: m.body || "",
            attachment_url: m.attachment_url,
            attachment_name: m.attachment_name,
            attachment_type: m.attachment_type,
            status: "delivered",
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })));
        }
      } catch (_) { }
    };
    fetchMsgs();
    const interval = setInterval(fetchMsgs, 5000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [active?.consultation_id, active?.id, doctorProfileId, doctorUserId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chats]);

  // ────────────────────────────────────────────
  // 5. Chat — send text (uses doctorProfileId!)
  // ────────────────────────────────────────────
  const sendChat = useCallback(() => {
    if (!input.trim() || !active || !doctorProfileId) return;
    const msgText = input.trim();
    const tempId = Date.now().toString();
    setChats(p => [...p, { id: tempId, from: "doctor", text: msgText, status: "sent", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
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
    }).then(res => {
      if (!res.ok) throw new Error("API error");
    }).catch((err) => {
      console.error(err);
      showToast("Failed to send message.", "error");
      setChats(p => p.filter(m => m.id !== tempId));
    });
  }, [input, active, doctorUserId, doctorProfileId, showToast]);

  // ────────────────────────────────────────────
  // 6. Chat — file upload
  // ────────────────────────────────────────────
  const handleChatFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active || !doctorProfileId) return;
    const isImage = file.type.startsWith("image/");
    const tempId = Date.now().toString();
    // Optimistic
    setChats(p => [...p, { id: tempId, from: "doctor", text: "", attachment_url: URL.createObjectURL(file), attachment_name: file.name, attachment_type: isImage ? "image" : "document", status: "sent", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    try {
      showToast("Uploading file...", "info");
      const fd = new FormData(); fd.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const msgRes = await fetch('/api/messages', {
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
      if (!msgRes.ok) throw new Error('Message post failed');
      showToast("File uploaded", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to upload file.", "error");
      setChats(p => p.filter(m => m.id !== tempId));
    }
    e.target.value = "";
  }, [active, doctorUserId, doctorProfileId, showToast]);

  // ────────────────────────────────────────────
  // 7. End consultation
  // ────────────────────────────────────────────
  const endConsult = useCallback(async () => {
    if (!active) return;

    // Validation: Require basic notes if not emergency
    if (outcome !== 'emergency' && (!notes.diagnosis.trim() || !notes.prescription.trim() || !notes.clinicalNotes.trim())) {
      showToast("Please complete the required medical notes.", "error");
      return;
    }
    // Validation: Require follow-up details if outcome is follow_up
    if (outcome === 'follow_up' && (!followUpDate || !followUpTime)) {
      showToast("Please specify the follow-up date and time.", "error");
      return;
    }

    setEnding(true);
    try {
      const consultId = active.consultation_id;

      // 1. Save structured notes
      await fetch('/api/consultations/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: consultId,
          doctorId: doctorProfileId || doctorUserId,
          patientId: active.id,
          notes: notes
        })
      });

      // 2. Calculate duration
      const startedAt = active.started_at || active.joinedAt;
      const durationMinutes = startedAt
        ? Math.round((Date.now() - new Date(startedAt).getTime()) / 60000)
        : undefined;

      // 3. Update consultation status with full structured data
      const statusToSave = outcome === 'follow_up' ? 'follow_up' : 'completed';
      const followUpScheduledAt = (outcome === 'follow_up' && followUpDate && followUpTime)
        ? new Date(`${followUpDate}T${followUpTime}`).toISOString()
        : undefined;

      await fetch('/api/doctor/consultations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: consultId,
          status: statusToSave,
          notes: `${notes.chiefComplaint}\n${notes.clinicalNotes}`.trim() || undefined,
          summary: notes.diagnosis || undefined,
          outcome,
          followUpPriority: followUpPriority || undefined,
          diagnosis: notes.diagnosis || undefined,
          prescription: notes.prescription || undefined,
          clinicalNotes: notes.clinicalNotes || undefined,
          chiefComplaint: notes.chiefComplaint || undefined,
          followUpPlan: notes.followUpPlan || undefined,
          isFollowUp: outcome === 'follow_up',
          followUpScheduledAt,
          durationMinutes,
        })
      });

      // 4. Create follow-up entry if applicable
      if (outcome === 'follow_up' && followUpScheduledAt) {
        await fetch('/api/follow-ups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consultationId: consultId,
            scheduledAt: followUpScheduledAt,
          })
        });
      }

      // 5. Remove from queue
      const dId = doctorProfileId || doctorUserId;
      if (dId) await fetch("/api/queue", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: dId, patientId: active.id })
      });

      setShowEndDialog(false);
    } catch (err) {
      console.error("Failed to end consult", err);
      showToast("Failed to end consultation. Please try again.", "error");
      setEnding(false);
      return;
    }

    setTimeout(() => {
      const next = queue.filter((_, i) => i !== activeIdx);
      showToast(`Consultation with ${active.name} ended.`, "success");
      if (!next.length) { router.push("/doctor-dashboard"); return; }
      setQueue(next); setActiveIdx(0); setEnding(false);
      setNotes({ chiefComplaint: "", diagnosis: "", prescription: "", clinicalNotes: "", followUpPlan: "" });
      setOutcome("completed"); setFollowUpDate(""); setFollowUpTime("");
      setChats([]); setNotesSaved(false);
    }, 500);
  }, [queue, activeIdx, router, doctorUserId, doctorProfileId, active, showToast, notes, outcome, followUpDate, followUpTime, followUpPriority]);

  // ────────────────────────────────────────────
  const TABS = [
    { key: "queue" as const, icon: Users, label: "Queue", mobileOnly: true },
    { key: "info" as const, icon: FileText, label: "Info" },
    { key: "chat" as const, icon: MessageSquare, label: "Chat" },
    { key: "notes" as const, icon: Activity, label: "Notes" },
    { key: "files" as const, icon: Paperclip, label: "Files" },
  ];

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────
  return (
    <div className="h-screen h-[100dvh] bg-[#0A0E14] flex flex-col overflow-hidden select-none">
      {/* ── End Consultation Dialog ── */}
      {showEndDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0E14]/80 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-white/[0.02]">
              <div>
                <h3 className="text-white text-lg font-bold">End Consultation</h3>
                <p className="text-slate-400 text-xs mt-0.5">Please finalize session details for {active?.name}</p>
              </div>
              <button onClick={() => setShowEndDialog(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 custom-scrollbar">
              {/* Outcome Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Consultation Outcome</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { val: 'completed', label: 'Completed' },
                    { val: 'follow_up', label: 'Follow-up' },
                    { val: 'referred', label: 'Referred' },
                    { val: 'emergency', label: 'Emergency' }
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setOutcome(opt.val as any)} className={`py-2 px-3 text-sm font-medium rounded-xl border transition-all ${outcome === opt.val ? 'bg-primary-600/20 border-primary-500/50 text-primary-300' : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.06]'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Follow-up fields */}
              {outcome === 'follow_up' && (
                <div className="bg-primary-950/20 border border-primary-500/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">Follow-up Schedule</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Date</label>
                      <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="w-full bg-[#0A0E14] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Time</label>
                      <input type="time" value={followUpTime} onChange={e => setFollowUpTime(e.target.value)} className="w-full bg-[#0A0E14] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500/50" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Priority</label>
                    <div className="flex gap-2">
                      {['low', 'medium', 'high'].map(p => (
                        <button key={p} onClick={() => setFollowUpPriority(p as any)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize border ${followUpPriority === p ? (p === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : p === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30') : 'bg-white/[0.04] text-slate-500 border-transparent hover:bg-white/[0.08]'}`}>{p}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Notes Verification */}
              <div>
                <div className="flex items-center justify-between mb-3 block">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required Medical Notes</label>
                  {notesSaved && <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Synced</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500">Diagnosis {outcome !== 'emergency' && <span className="text-red-400">*</span>}</label>
                    <input value={notes.diagnosis} onChange={e => setNotes(p => ({ ...p, diagnosis: e.target.value }))} placeholder="Diagnosis..." className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500/50" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500">Prescription {outcome !== 'emergency' && <span className="text-red-400">*</span>}</label>
                    <input value={notes.prescription} onChange={e => setNotes(p => ({ ...p, prescription: e.target.value }))} placeholder="Prescription..." className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500/50" />
                  </div>
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-[10px] text-slate-500">Clinical Notes {outcome !== 'emergency' && <span className="text-red-400">*</span>}</label>
                    <textarea value={notes.clinicalNotes} onChange={e => setNotes(p => ({ ...p, clinicalNotes: e.target.value }))} placeholder="Clinical notes..." className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary-500/50 resize-none min-h-[60px]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex gap-3 flex-shrink-0 bg-white/[0.02]">
              <button onClick={() => setShowEndDialog(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
              <button onClick={endConsult} disabled={ending} className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50">
                {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneOff className="w-4 h-4" />}
                Confirm End Consultation
              </button>
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

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* ── LEFT: Queue (Desktop Only) ── */}
        <div className="hidden lg:flex w-56 xl:w-64 bg-[#111827] border-r border-white/[0.06] flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-white/[0.06]"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Queue</p></div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
            {queue.map((p, i) => (
              <button key={p.id + i} onClick={() => { setActiveIdx(i); }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${i === activeIdx ? "bg-primary-600/20 border-primary-500/40" : "bg-white/[0.03] border-white/[0.04] hover:bg-white/[0.06]"} ${(p.severity?.toLowerCase() === 'high' || p.severity?.toLowerCase() === 'severe') && i !== activeIdx ? "border-red-500/30 bg-red-500/5" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <div className="relative"><PatientAvatar name={p.name} size="sm" />{i === activeIdx && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111827]" />}</div>
                  <div className="flex-1 min-w-0"><p className={`text-sm font-semibold truncate ${i === activeIdx ? "text-white" : "text-slate-300"}`}>{p.name}</p></div>
                  {(p.severity?.toLowerCase() === 'high' || p.severity?.toLowerCase() === 'severe') && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Urgent" />}
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
        <div className={`flex-col min-w-0 lg:flex-1 ${rightTab === 'queue' ? 'hidden lg:flex' : 'flex'}`}
          style={{
            height: rightTab === 'queue' ? '0' : (typeof window !== 'undefined' && window.innerWidth < 1024)
              ? (mobileToolsSize === 'min' ? '70vh' : mobileToolsSize === 'max' ? '25vh' : '40vh')
              : 'auto'
          }}>
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
              <>
                <ZoomVideoCall
                  roomName={roomName}
                  userName="Doctor"
                  onReady={() => { }}
                  onLeave={() => setShowEndDialog(true)}
                />
                <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 lg:hidden">
                  <button onClick={() => setShowEndDialog(true)} disabled={ending || !active} className="w-10 h-10 rounded-full bg-red-600/90 hover:bg-red-600 flex items-center justify-center text-white shadow-lg backdrop-blur-sm transition-all"><PhoneOff className="w-4 h-4" /></button>
                </div>
              </>
            ) : null}
          </div>

          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center justify-center gap-2.5 py-4 px-4 bg-[#111827] border-t border-white/[0.06] flex-shrink-0">
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

        {/* ── RIGHT/BOTTOM: Tools ── */}
        <div className="flex flex-col flex-1 lg:flex-none lg:w-72 xl:w-80 bg-[#111827] lg:border-l border-t lg:border-t-0 border-white/[0.06] flex-shrink-0 transition-all duration-300"
          style={{
            height: (typeof window !== 'undefined' && window.innerWidth < 1024)
              ? (mobileToolsSize === 'min' ? '30vh' : mobileToolsSize === 'max' ? '75vh' : '60vh')
              : 'auto'
          }}>
          {/* Mobile Handle */}
          <div className="lg:hidden flex items-center justify-center py-2 cursor-ns-resize active:bg-white/5"
            onClick={() => setMobileToolsSize(p => p === 'min' ? 'half' : p === 'half' ? 'max' : 'min')}>
            <div className="w-10 h-1 bg-white/10 rounded-full" />
          </div>

          <div className="flex border-b border-white/[0.06] flex-shrink-0 overflow-x-auto custom-scrollbar">
            {TABS.map(({ key, icon: Icon, label, mobileOnly }) => (
              <button key={key} onClick={() => setRightTab(key as any)}
                className={`flex-1 min-w-[60px] py-3 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${mobileOnly ? 'flex lg:hidden' : 'flex'} ${rightTab === key ? "text-white border-b-2 border-primary-400" : "text-slate-600 hover:text-slate-400"}`}>
                <Icon className="w-4 h-4" /><span className="hidden xl:block mt-1">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* QUEUE TAB (Mobile Only) */}
            {rightTab === "queue" && (
              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 lg:hidden">
                {queue.map((p, i) => (
                  <button key={p.id + i} onClick={() => { setActiveIdx(i); setRightTab("info"); }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${i === activeIdx ? "bg-primary-600/20 border-primary-500/40" : "bg-white/[0.03] border-white/[0.04] hover:bg-white/[0.06]"} ${(p.severity?.toLowerCase() === 'high' || p.severity?.toLowerCase() === 'severe') && i !== activeIdx ? "border-red-500/30 bg-red-500/5" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="relative"><PatientAvatar name={p.name} size="sm" />{i === activeIdx && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111827]" />}</div>
                      <div className="flex-1 min-w-0"><p className={`text-sm font-semibold truncate ${i === activeIdx ? "text-white" : "text-slate-300"}`}>{p.name}</p></div>
                      {(p.severity?.toLowerCase() === 'high' || p.severity?.toLowerCase() === 'severe') && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Urgent" />}
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
                  </div>
                )}
              </div>
            )}
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
                            <div className={`flex items-center gap-1 justify-end text-[10px] mt-1 ${msg.from === "doctor" ? "text-primary-200" : "text-slate-500"}`}>
                              {msg.time}
                              {msg.from === 'doctor' && (msg.status === 'sent' ? <Check className="w-3 h-3" /> : <CheckCheck className="w-3 h-3" />)}
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="leading-relaxed">{msg.text}</p>
                            <div className={`flex items-center gap-1 justify-end text-[10px] mt-0.5 ${msg.from === "doctor" ? "text-primary-200" : "text-slate-500"}`}>
                              {msg.time}
                              {msg.from === 'doctor' && (msg.status === 'sent' ? <Check className="w-3 h-3" /> : <CheckCheck className="w-3 h-3" />)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-white/[0.06] flex-shrink-0 flex flex-col gap-2">
                  <div className="flex overflow-x-auto gap-2 custom-scrollbar pb-1">
                    {["Hi, how can I help?", "Please describe your symptoms.", "I will be with you shortly.", "Please upload your reports."].map((r, i) => (
                      <button key={i} onClick={() => setInput(r)} className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:bg-white/10 text-[10px] text-slate-300 transition-colors">{r}</button>
                    ))}
                  </div>
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
              <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
                <div className="flex items-center justify-between mb-1 flex-shrink-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Structured Notes</p>
                  {notesSaved && <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saved</span>}
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {[
                    { key: "chiefComplaint", label: "Chief Complaint", placeholder: "Patient's primary issue..." },
                    { key: "diagnosis", label: "Diagnosis", placeholder: "Condition diagnosed..." },
                    { key: "prescription", label: "Prescription", placeholder: "Medications prescribed, dosages..." },
                    { key: "clinicalNotes", label: "Clinical Notes", placeholder: "Observations, vitals..." },
                    { key: "followUpPlan", label: "Follow-up Plan", placeholder: "Next steps..." }
                  ].map((field) => (
                    <div key={field.key} className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-400">{field.label}</label>
                      <textarea
                        value={notes[field.key as keyof typeof notes]}
                        onChange={e => setNotes(p => ({ ...p, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl text-slate-200 text-sm p-3 focus:outline-none focus:border-primary-500/40 placeholder-slate-700 resize-none min-h-[80px]"
                      />
                    </div>
                  ))}
                </div>

                <button onClick={saveNotes} disabled={isSavingNotes} className={`flex-shrink-0 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${notesSaved ? "bg-emerald-600 text-white" : "bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"}`}>
                  {isSavingNotes ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : notesSaved ? <><CheckCircle2 className="w-4 h-4" />Saved!</> : <><CheckCircle2 className="w-4 h-4" />Save Notes</>}
                </button>
              </div>
            )}

            {/* FILES TAB */}
            {rightTab === "files" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shared Files</p>
                <div className="flex flex-col gap-2 mb-2">
                  <label className="text-xs text-slate-400 font-semibold">Upload Category</label>
                  <div className="flex bg-white/[0.02] p-1 rounded-xl border border-white/10">
                    {[
                      { val: 'document', label: 'Document' },
                      { val: 'prescription', label: 'Prescription' },
                      { val: 'lab_result', label: 'Lab Result' }
                    ].map(c => (
                      <button key={c.val} onClick={() => setFileCategory(c.val as any)} className={`flex-1 text-[10px] md:text-xs py-1.5 rounded-lg transition-all ${fileCategory === c.val ? 'bg-primary-600/20 text-primary-400 font-semibold' : 'text-slate-500 hover:text-slate-300'}`}>{c.label}</button>
                    ))}
                  </div>
                </div>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/[0.08] rounded-xl p-5 cursor-pointer hover:border-primary-500/40 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] group-hover:bg-primary-500/10 flex items-center justify-center transition-colors"><Plus className="w-5 h-5 text-slate-500 group-hover:text-primary-400" /></div>
                  <p className="text-xs text-slate-500 text-center">Click to share a file</p>
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !active || !doctorProfileId) return;
                    const isImage = file.type.startsWith("image/");
                    const fd = new FormData(); fd.append('file', file);
                    try {
                      showToast("Uploading file...", "info");
                      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
                      if (!uploadRes.ok) throw new Error('Upload failed');
                      const uploadData = await uploadRes.json();
                      const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultationId: active.consultation_id || undefined, patientId: active.user_id || active.id, doctorId: doctorProfileId, senderId: doctorUserId, senderRole: 'doctor', attachmentUrl: uploadData.url, attachmentName: uploadData.name, attachmentType: isImage ? 'image' : 'document' }) });
                      if (!res.ok) throw new Error('Message API failed');
                      showToast("File shared successfully", "success");
                    } catch (err) {
                      console.error(err);
                      showToast("Failed to upload file.", "error");
                    }
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

      {/* ── TOASTS ── */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium border ${t.type === 'error' ? 'bg-red-950/90 text-red-200 border-red-900/50' : t.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-900/50' : 'bg-slate-800/90 text-slate-200 border-slate-700/50'} pointer-events-auto transition-all duration-300`}>
            {t.type === 'error' ? <AlertCircle className="w-4 h-4" /> : t.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
