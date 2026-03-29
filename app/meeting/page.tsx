"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle, Clock, Star, ArrowRight, Home,
  FileText, Calendar, Loader2,
} from "lucide-react";
import Image from "next/image";
import WaitingRoom from "./WaitingRoom";
import MeetingRoom from "./MeetingRoom";

type MeetingState = "waiting" | "in_call" | "ended";

function MeetingFlow() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorName = searchParams.get("doctor") || "Dr. Sarah Johnson";
  const doctorAvatar =
    searchParams.get("avatar") ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=1B3A5C&color=fff&size=128`;
  const doctorSpecialty = searchParams.get("specialty") || "General Practice";
  const doctorId = searchParams.get("doctorId") || "d-demo";
  const patientId = searchParams.get("patientId") || "p-demo";
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime] = useState(new Date());

  const [state, setState] = useState<MeetingState>("waiting");

  if (state === "waiting") {
    return (
      <WaitingRoom
        doctorName={doctorName}
        doctorAvatar={doctorAvatar}
        doctorSpecialty={doctorSpecialty}
        patientId={patientId}
        doctorId={doctorId}
        onStartCall={(cid) => {
          if (cid) setConsultationId(cid);
          setState("in_call");
        }}
        onLeave={() => router.push("/dashboard")}
      />
    );
  }

  if (state === "in_call") {
    return (
      <MeetingRoom
        consultationId={consultationId}
        doctorId={doctorId}
        patientId={patientId}
        onEnd={() => setState("ended")}
      />
    );
  }

  // state === "ended" — Consultation summary screen
  const endTime = new Date();
  const durationMins = Math.max(1, Math.round((endTime.getTime() - callStartTime.getTime()) / 60000));

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white px-4">
      <div className="w-full max-w-lg">
        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">
          Consultation Complete
        </h2>
        <p className="text-slate-400 text-center mb-8">
          Thank you for using Nova Health
        </p>

        {/* Summary card */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-6">
          {/* Doctor info */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-700/50">
            <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-slate-600">
              <Image
                src={doctorAvatar}
                alt={doctorName}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <p className="text-white font-semibold">{doctorName}</p>
              <p className="text-slate-400 text-sm">{doctorSpecialty}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-5 h-5 text-primary-400" />
              </div>
              <p className="text-xs text-slate-400">Date</p>
              <p className="text-sm font-medium text-white">
                {endTime.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Clock className="w-5 h-5 text-primary-400" />
              </div>
              <p className="text-xs text-slate-400">Duration</p>
              <p className="text-sm font-medium text-white">{durationMins} min</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <FileText className="w-5 h-5 text-primary-400" />
              </div>
              <p className="text-xs text-slate-400">Notes</p>
              <p className="text-sm font-medium text-white">Saved</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-primary-500/20"
          >
            <Home className="w-5 h-5" />
            Return to Dashboard
          </button>
          <button
            onClick={() => router.push("/dashboard?tab=history")}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3.5 rounded-xl transition-all"
          >
            <FileText className="w-5 h-5" />
            View Consultation History
          </button>
        </div>

        {/* Footer note */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Your consultation notes and follow-up details have been saved.
          <br />
          You can access them anytime from your dashboard.
        </p>
      </div>
    </div>
  );
}

export default function MeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          <span className="text-slate-400">Loading…</span>
        </div>
      }
    >
      <MeetingFlow />
    </Suspense>
  );
}
