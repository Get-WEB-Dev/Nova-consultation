"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarClock, Check, X, MessageSquare, User, FolderOpen, AlertCircle, RefreshCw, Loader2, Pill, Stethoscope, CalendarPlus, Save,
} from "lucide-react";
import { Avatar, NAV_BG, ACCENT } from "@/components/doctor/ui";
import { fmtDate, fmtTime } from "@/components/doctor/records";
import { PriorityPill, RescheduleDialog, dueInfo, TONE_STYLE, PRIORITIES, type RescheduleValues, type Priority } from "@/components/doctor/followup";

interface Rec {
  id: string; status: string; isFollowUp: boolean; followUpScheduledAt: string | null; followUpPriority: string | null; followUpPlan: string | null;
  createdAt: string; chiefComplaint: string | null; diagnosis: string | null; prescription: string | null; clinicalNotes: string | null;
  patient: { id: string; name: string; avatar: string | null };
}
const JSON_HEADERS = { "Content-Type": "application/json" };

export default function FollowUpDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rec, setRec] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [plan, setPlan] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/doctor/consultations/${id}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 403 ? "You don't have access to this follow-up." : res.status === 404 ? "This follow-up doesn't exist." : j.error || "Could not load this follow-up");
      setRec(j.data);
      setPlan(j.data.followUpPlan ?? "");
      setPriority((PRIORITIES as readonly string[]).includes(j.data.followUpPriority) ? j.data.followUpPriority : "medium");
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const patch = async (body: object, key: string): Promise<boolean> => {
    setBusy(key);
    try {
      const res = await fetch("/api/follow-ups", { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify({ consultationId: id, ...body }) });
      return res.ok; // a failed save already shows the red error toast (lib/auth-fetch.ts)
    } catch { return false; } finally { setBusy(null); }
  };

  const back = <Link href="/doctor-dashboard/followups" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Follow-ups</Link>;

  if (loading) return <div className="space-y-4 animate-pulse">{back}<div className="h-32 rounded-2xl bg-white border border-slate-200" /><div className="h-64 rounded-2xl bg-white border border-slate-200" /></div>;
  if (error || !rec) return (
    <div className="space-y-4">{back}
      <div className="bg-white border border-slate-200 rounded-2xl text-center py-14 px-6 max-w-md mx-auto">
        <AlertCircle className="w-9 h-9 text-rose-400 mx-auto" /><p className="font-display font-bold text-slate-800 mt-3">{error ?? "Something went wrong"}</p>
        <button onClick={load} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold" style={{ background: NAV_BG }}><RefreshCw className="w-4 h-4" /> Try again</button>
      </div>
    </div>
  );

  const hasFollowUp = rec.isFollowUp && !!rec.followUpScheduledAt;
  const open = hasFollowUp && (rec.status === "follow_up" || rec.status === "missed");
  const done = hasFollowUp && rec.status === "completed";
  const info = dueInfo(rec.followUpScheduledAt, done ? "completed" : "pending");
  const tone = TONE_STYLE[info.tone];
  const dirty = plan !== (rec.followUpPlan ?? "") || priority !== (rec.followUpPriority ?? "medium");

  const savePlan = async () => {
    if (await patch({ instructions: plan.trim(), priority }, "plan")) { setRec({ ...rec, followUpPlan: plan.trim(), followUpPriority: priority }); setSavedAt(Date.now()); setTimeout(() => setSavedAt(null), 2500); }
  };
  const doReschedule = async (v: RescheduleValues) => {
    if (await patch(v, "resched")) { setDialog(false); await load(); }
  };
  const markDone = async () => { if (await patch({ status: "completed" }, "done")) await load(); };
  const cancelFollowUp = async () => { if (await patch({ status: "cancelled" }, "cancel")) router.replace("/doctor-dashboard/followups"); };

  return (
    <div className="space-y-5 pb-10 max-w-4xl">
      {back}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar name={rec.patient.name} src={rec.patient.avatar} size={60} />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Follow-up</p>
            <h2 className="font-display font-extrabold text-[22px] text-slate-900 leading-tight">{rec.patient.name}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {hasFollowUp ? (<><span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: tone.bg, color: tone.fg }}>{info.label}</span><PriorityPill priority={rec.followUpPriority} /></>)
                : <span className="text-[11.5px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">No follow-up scheduled</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/doctor-dashboard/patients/${rec.patient.id}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50"><User className="w-3.5 h-3.5" /> Patient</Link>
            <Link href={`/doctor-dashboard/messages?patient=${rec.patient.id}`} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50"><MessageSquare className="w-3.5 h-3.5" /> Message</Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 items-start">
        {/* Schedule */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-display font-bold text-[14.5px] text-slate-900">Appointment</h3>
          {hasFollowUp ? (
            <>
              <p className="font-display font-extrabold text-[24px] text-slate-900 mt-3 leading-tight">{new Date(rec.followUpScheduledAt!).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
              <p className="text-[15px] font-semibold mt-0.5" style={{ color: ACCENT }}>{fmtTime(rec.followUpScheduledAt)}</p>
              {done && <p className="mt-3 text-[13px] font-semibold text-emerald-700">✓ This follow-up has been completed.</p>}
              {open && (
                <div className="mt-5 space-y-2">
                  <button onClick={markDone} disabled={!!busy} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-white text-[13.5px] font-bold disabled:opacity-60" style={{ background: ACCENT }}>
                    {busy === "done" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Mark as done
                  </button>
                  <button onClick={() => setDialog(true)} disabled={!!busy} className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-[13.5px] font-bold text-slate-700 hover:bg-slate-50"><CalendarClock className="w-4 h-4" /> Reschedule</button>
                  {confirmCancel ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                      <p className="text-[12.5px] text-rose-900 font-semibold">Cancel this follow-up? The patient will be told. The original consultation stays in your history.</p>
                      <div className="flex gap-2 mt-2.5">
                        <button onClick={cancelFollowUp} disabled={!!busy} className="flex-1 py-2 rounded-lg bg-rose-600 text-white text-[12.5px] font-bold">{busy === "cancel" ? "Cancelling…" : "Yes, cancel it"}</button>
                        <button onClick={() => setConfirmCancel(false)} className="flex-1 py-2 rounded-lg border border-rose-200 bg-white text-[12.5px] font-bold text-rose-700">Keep it</button>
                      </div>
                    </div>
                  ) : <button onClick={() => setConfirmCancel(true)} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-slate-500 hover:text-rose-600"><X className="w-4 h-4" /> Cancel follow-up</button>}
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 text-center py-4">
              <p className="text-[13px] text-slate-500">This consultation has no follow-up yet.</p>
              <button onClick={() => setDialog(true)} className="mt-3 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-[13.5px] font-bold" style={{ background: NAV_BG }}><CalendarPlus className="w-4 h-4" /> Schedule a follow-up</button>
            </div>
          )}
        </section>

        {/* Plan */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-display font-bold text-[14.5px] text-slate-900">Instructions &amp; priority</h3>
          <label className="block mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">Priority</label>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            {PRIORITIES.map((p) => (
              <button key={p} type="button" onClick={() => setPriority(p)} disabled={!hasFollowUp} className={`py-2.5 rounded-xl text-[13px] font-bold capitalize border disabled:opacity-50 ${priority === p ? "text-white border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`} style={priority === p ? { background: NAV_BG } : undefined}>{p}</button>
            ))}
          </div>
          <label className="block mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">Instructions for the visit</label>
          <textarea value={plan} onChange={(e) => setPlan(e.target.value)} disabled={!hasFollowUp} rows={5} maxLength={4000} placeholder={hasFollowUp ? "e.g. Bring recent blood test results. Fast for 8 hours before." : "Schedule a follow-up first"}
            className="mt-1.5 w-full px-3.5 py-3 rounded-xl border border-slate-200 text-[14px] text-slate-800 outline-none focus:border-teal-500 resize-none disabled:bg-slate-50" />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={savePlan} disabled={!dirty || busy === "plan" || !hasFollowUp} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[13px] font-bold disabled:opacity-40" style={{ background: NAV_BG }}>
              {busy === "plan" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save changes
            </button>
            {savedAt && <span className="text-[12.5px] font-semibold text-emerald-700">Saved ✓</span>}
          </div>
        </section>
      </div>

      {/* Clinical context */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-display font-bold text-[14.5px] text-slate-900">From the consultation on {fmtDate(rec.createdAt)}</h3>
          <Link href={`/doctor-dashboard/history/${rec.id}`} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold hover:underline" style={{ color: ACCENT }}><FolderOpen className="w-3.5 h-3.5" /> Open full record</Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
          {[
            { icon: Stethoscope, label: "Chief complaint", value: rec.chiefComplaint },
            { icon: Stethoscope, label: "Diagnosis", value: rec.diagnosis },
            { icon: Pill, label: "Prescription", value: rec.prescription },
            { icon: Stethoscope, label: "Clinical notes", value: rec.clinicalNotes },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><Icon className="w-3 h-3" /> {label}</p>
              <p className={`text-[14px] mt-1 whitespace-pre-wrap break-words line-clamp-5 ${value ? "text-slate-800" : "text-slate-300"}`}>{value || "Not recorded"}</p>
            </div>
          ))}
        </div>
      </section>

      <RescheduleDialog open={dialog} patientName={rec.patient.name} initialAt={rec.followUpScheduledAt} initialPriority={rec.followUpPriority} initialPlan={rec.followUpPlan}
        saving={busy === "resched"} onSave={doReschedule} onClose={() => setDialog(false)} />
    </div>
  );
}