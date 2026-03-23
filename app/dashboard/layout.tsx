"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadUser } from "@/lib/supabase/auth";
import Navbar from "@/components/layout/Navbar";
import { Stethoscope } from "lucide-react";

// ── Palette (matches site-wide theme) ────────────────────────────────────────
const NAV_BG = "#003580";
const NAV_DARK = "#00224f";
const SKY = "#38bdf8";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadUser().then((user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (user.role === "doctor") {
        router.replace("/doctor-dashboard");
        return;
      }
      if (user.role === "admin") {
        router.replace("/admin-dashboard");
        return;
      }
      setReady(true);
    });
  }, [router]);

  // ── Loading screen — styled to match the dark navy brand ─────────────────
  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: NAV_BG }}
      >
        {/* Background glows */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)",
            transform: "translate(20%, -20%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(0,113,194,0.12) 0%, transparent 70%)",
            transform: "translate(-20%, 20%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-5">
          {/* Logo icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: SKY,
              boxShadow: `0 0 40px rgba(56,189,248,0.35)`,
            }}
          >
            <Stethoscope className="w-7 h-7 text-white" />
          </div>

          {/* Brand name */}
          <p className="font-extrabold text-white text-[18px] tracking-tight">
            MediBook
          </p>

          {/* Progress bar */}
          <div
            className="w-32 h-1 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <div
              className="h-full rounded-full animate-pulse"
              style={{
                background: SKY,
                width: "60%",
                animation: "shimmer 1.6s ease-in-out infinite",
              }}
            />
          </div>

          <p
            className="text-[12px] font-medium"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Loading your dashboard…
          </p>
        </div>

        {/* Inline keyframe for shimmer */}
        <style>{`
          @keyframes shimmer {
            0%   { width: 20%; opacity: 0.6; }
            50%  { width: 80%; opacity: 1;   }
            100% { width: 20%; opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  // ── Authenticated layout ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#eef2f7" }}>
      <Navbar />
      {/* No extra padding/max-width here — the dashboard page controls its own layout */}
      <main className="pb-24 md:pb-0">{children}</main>
    </div>
  );
}
