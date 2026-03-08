"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

  const [state, setState] = useState<MeetingState>("waiting");

  if (state === "waiting") {
    return (
      <WaitingRoom
        doctorName={doctorName}
        doctorAvatar={doctorAvatar}
        doctorSpecialty={doctorSpecialty}
        patientId={patientId}
        doctorId={doctorId}
        onStartCall={() => setState("in_call")}
        onLeave={() => router.push("/dashboard")}
      />
    );
  }

  if (state === "in_call") {
    return <MeetingRoom />;
  }

  // state === "ended"
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white gap-4">
      <h2 className="text-2xl font-bold">Consultation Ended</h2>
      <p className="text-slate-400">Thank you for using Nova Health.</p>
      <button
        onClick={() => router.push("/dashboard")}
        className="mt-4 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-all"
      >
        Return to Dashboard
      </button>
    </div>
  );
}

export default function MeetingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
          Loading...
        </div>
      }
    >
      <MeetingFlow />
    </Suspense>
  );
}
