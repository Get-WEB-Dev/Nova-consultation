"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Users,
  Clock,
  Star,
  ChevronRight,
  Heart,
  Zap,
  CheckCircle,
  Award,
  Globe,
  Stethoscope,
  ArrowRight,
} from "lucide-react";
import ModernFooter from "@/components/ui/ModernFooter";
import ModernNavbar from "@/components/ui/ModernNavbar";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#003580";
const NAV_DARK = "#00224f";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

const STATS = [
  { value: "50+", label: "Partner Clinics" },
  { value: "2K+", label: "Verified Doctors" },
  { value: "50K+", label: "Patients Served" },
  { value: "4.9★", label: "Average Rating" },
];

const VALUES = [
  {
    icon: Shield,
    title: "Trust & Safety",
    desc: "Every doctor on MediBook is license-verified and credential-checked before they can see patients.",
    iconBg: "#eff6ff",
    iconColor: ACCENT,
  },
  {
    icon: Clock,
    title: "Always Available",
    desc: "Book consultations 24 hours a day, 7 days a week — around your schedule, not ours.",
    iconBg: "#f0fdf4",
    iconColor: "#22c55e",
  },
  {
    icon: Heart,
    title: "Patient-First Care",
    desc: "We built every feature around one question: what does the patient actually need to get better care?",
    iconBg: "#fdf2f8",
    iconColor: "#ec4899",
  },
  {
    icon: Globe,
    title: "Accessible to All",
    desc: "We serve patients in multiple languages across the country, making quality healthcare truly universal.",
    iconBg: "#fef3c7",
    iconColor: "#f59e0b",
  },
];

const TEAM = [
  {
    name: "Dr. Amir Tesfaye",
    role: "Chief Medical Officer",
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400",
  },
  {
    name: "Sara Bekele",
    role: "Chief Executive Officer",
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400",
  },
  {
    name: "Yonas Girma",
    role: "Head of Technology",
    image:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400",
  },
  {
    name: "Dr. Meron Alemu",
    role: "Head of Patient Success",
    image:
      "https://images.unsplash.com/photo-1594824432258-f99f2b09e25d?auto=format&fit=crop&q=80&w=400",
  },
];

const MILESTONES = [
  {
    year: "2021",
    title: "Founded",
    desc: "MediBook was started with a mission to make quality healthcare accessible to everyone in Ethiopia.",
  },
  {
    year: "2022",
    title: "First 1,000 Doctors",
    desc: "Onboarded our first thousand verified doctors across 12 medical specialties.",
  },
  {
    year: "2023",
    title: "10K Patients",
    desc: "Reached 10,000 active patients and launched our mobile app with instant booking.",
  },
  {
    year: "2024",
    title: "50K Patients",
    desc: "Expanded to all major cities, adding video consultations and real-time queue management.",
  },
  {
    year: "2025",
    title: "National Leader",
    desc: "Became Ethiopia's largest digital healthcare platform with 50+ partner clinics.",
  },
];

export default function AboutPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#eef2f7" }}
    >
      <ModernNavbar />

      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <div style={{ background: NAV_BG }} className="pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Breadcrumb */}
          <div
            className="flex items-center gap-2 text-[12px] font-semibold mb-6"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span style={{ color: SKY }}>About</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left text */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold mb-5 border"
                style={{
                  background: "rgba(56,189,248,0.12)",
                  borderColor: "rgba(56,189,248,0.3)",
                  color: SKY,
                }}
              >
                <Stethoscope className="w-3.5 h-3.5" /> Our Story
              </div>
              <h1
                className="font-extrabold text-white leading-tight mb-4"
                style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
              >
                Putting Your Health
                <br />
                <span style={{ color: SKY }}>First, Always.</span>
              </h1>
              <p
                className="text-[15px] leading-relaxed mb-6"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                MediBook was built on a simple belief: every person deserves
                fast, affordable access to a great doctor. We connect patients
                with verified specialists in minutes — no waiting rooms, no
                paperwork, no barriers.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/doctors"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white transition-all hover:opacity-90 active:scale-95"
                  style={{ background: SKY, color: NAV_DARK }}
                >
                  <Zap className="w-4 h-4" /> Find a Doctor
                </Link>
                <Link
                  href="/contact"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold border transition-all hover:bg-white/15"
                  style={{
                    color: "white",
                    borderColor: "rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.08)",
                  }}
                >
                  Contact Us <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right: doctor image */}
            <div
              className="relative h-56 sm:h-72 lg:h-80 rounded-2xl overflow-hidden hidden sm:block"
              style={{
                background: "linear-gradient(160deg, #1e4d8c 0%, #0a2a5e 100%)",
              }}
            >
              <Image
                src="/doc.png"
                alt="MediBook Doctors"
                fill
                className="object-contain object-bottom"
                style={{ filter: "drop-shadow(0 0 24px rgba(56,189,248,0.3))" }}
              />
              {/* Floating card */}
              <div className="absolute bottom-4 left-4 bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "#eff6ff" }}
                >
                  <Users className="w-4 h-4" style={{ color: ACCENT }} />
                </div>
                <div>
                  <p className="text-[16px] font-extrabold text-slate-900 leading-none">
                    50K+
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Happy Patients
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div
          className="border-t"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: NAV_DARK,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {STATS.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center py-3 px-4 border-r border-white/10 last:border-0"
                >
                  <p className="text-[20px] font-extrabold text-white leading-none">
                    {s.value}
                  </p>
                  <p
                    className="text-[10px] font-semibold mt-0.5"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MISSION ─────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p
                className="text-[11px] font-extrabold uppercase tracking-widest mb-2"
                style={{ color: ACCENT }}
              >
                Our Mission
              </p>
              <h2
                className="font-extrabold text-slate-900 leading-tight mb-4"
                style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}
              >
                Healthcare that works
                <br />
                for every Ethiopian
              </h2>
              <p className="text-[14px] text-slate-500 leading-relaxed mb-4">
                We're building the infrastructure for a healthier nation — one
                consultation at a time. By digitising the entire patient journey
                from search to diagnosis, we're cutting the time between "I feel
                unwell" and "I have a care plan" from days to minutes.
              </p>
              <p className="text-[14px] text-slate-500 leading-relaxed">
                Our platform serves patients in Amharic and English, accepting
                all payment methods so that no one is turned away from great
                medical care.
              </p>

              <div className="mt-6 space-y-2.5">
                {[
                  "Verified & licensed doctors only",
                  "Transparent fees in Ethiopian Birr",
                  "Available in Amharic & English",
                  "Secure, encrypted patient data",
                ].map((point) => (
                  <div key={point} className="flex items-center gap-2.5">
                    <CheckCircle
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: ACCENT }}
                    />
                    <p className="text-[13px] font-semibold text-slate-700">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: values grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VALUES.map((v, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: v.iconBg }}
                  >
                    <v.icon
                      className="w-5 h-5"
                      style={{ color: v.iconColor }}
                    />
                  </div>
                  <p className="font-extrabold text-[14px] text-slate-900 mb-1">
                    {v.title}
                  </p>
                  <p className="text-[12px] text-slate-500 leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TIMELINE ────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16" style={{ background: "#eef2f7" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p
              className="text-[11px] font-extrabold uppercase tracking-widest mb-2"
              style={{ color: ACCENT }}
            >
              Our Journey
            </p>
            <h2 className="font-extrabold text-slate-900 text-[22px] sm:text-[28px]">
              How we got here
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div
              className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, #cbd5e1 10%, #cbd5e1 90%, transparent)",
              }}
            />

            <div className="space-y-6 sm:space-y-0">
              {MILESTONES.map((m, i) => (
                <div
                  key={i}
                  className={`relative sm:flex sm:gap-8 ${i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"} items-center mb-6 sm:mb-10`}
                >
                  {/* Content card */}
                  <div
                    className={`sm:w-[calc(50%-2rem)] bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all ${i % 2 === 0 ? "sm:text-right" : "sm:text-left"}`}
                    style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                  >
                    <p
                      className="text-[10px] font-extrabold uppercase tracking-widest mb-1"
                      style={{ color: ACCENT }}
                    >
                      {m.year}
                    </p>
                    <p className="font-extrabold text-[15px] text-slate-900 mb-1">
                      {m.title}
                    </p>
                    <p className="text-[12px] text-slate-500 leading-relaxed">
                      {m.desc}
                    </p>
                  </div>

                  {/* Centre dot */}
                  <div className="hidden sm:flex w-16 flex-shrink-0 items-center justify-center">
                    <div
                      className="w-5 h-5 rounded-full border-4 border-white shadow-md"
                      style={{ background: ACCENT }}
                    />
                  </div>

                  {/* Spacer for opposite side */}
                  <div className="hidden sm:block sm:w-[calc(50%-2rem)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TEAM ────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p
              className="text-[11px] font-extrabold uppercase tracking-widest mb-2"
              style={{ color: ACCENT }}
            >
              The People
            </p>
            <h2 className="font-extrabold text-slate-900 text-[22px] sm:text-[28px]">
              Meet our leadership
            </h2>
            <p className="text-slate-500 text-[14px] mt-2">
              Passionate experts united by a mission to improve healthcare.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TEAM.map((member, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
              >
                <div
                  className="relative h-48 overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)",
                  }}
                >
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                </div>
                <div className="p-4 text-center border-t border-dashed border-slate-100">
                  <p className="font-extrabold text-[14px] text-slate-900">
                    {member.name}
                  </p>
                  <p
                    className="text-[11px] font-semibold mt-0.5"
                    style={{ color: ACCENT }}
                  >
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section
        className="py-14 sm:py-20 relative overflow-hidden"
        style={{ background: NAV_BG }}
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(ellipse, rgba(56,189,248,0.12) 0%, transparent 70%)`,
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p
            className="text-[11px] font-extrabold uppercase tracking-widest mb-3"
            style={{ color: SKY }}
          >
            Join Us
          </p>
          <h2 className="font-extrabold text-white text-[22px] sm:text-[30px] leading-tight mb-4">
            Ready to experience
            <br />
            better healthcare?
          </h2>
          <p
            className="text-[14px] mb-8"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Join 50,000 patients who trust MediBook every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-extrabold text-[14px] transition-all hover:opacity-90 active:scale-95"
              style={{
                background: SKY,
                color: NAV_DARK,
                boxShadow: `0 8px 24px rgba(56,189,248,0.3)`,
              }}
            >
              <Zap className="w-4 h-4" /> Get Started Free
            </Link>
            <Link
              href="/doctors"
              className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-extrabold text-[14px] border transition-all hover:bg-white/15 active:scale-95"
              style={{
                color: "white",
                borderColor: "rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              Browse Doctors <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}
