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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-shimmer w-32 h-8 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
