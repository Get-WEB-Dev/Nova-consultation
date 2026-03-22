"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadUser, getUser, type AuthUser } from "@/lib/supabase/auth";
import Navbar from "@/components/layout/Navbar";

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
      // Role-based access: only patients can access this dashboard
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

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 bg-nova-mesh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center animate-breathe shadow-glow-navy">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500/60 rounded-full animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 bg-nova-mesh">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
