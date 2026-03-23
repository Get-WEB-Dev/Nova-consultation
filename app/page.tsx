"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Stethoscope,
  HeartPulse,
  Brain,
  Baby,
  Bone,
  Eye,
  Activity,
  Search,
  Star,
  ArrowRight,
  Calendar,
  Video,
  UserCircle,
  Pill,
  Menu,
  X,
  MapPin,
  CheckCircle,
  Shield,
  Clock,
  Users,
  Zap,
  ChevronRight,
} from "lucide-react";
import ModernFooter from "@/components/ui/ModernFooter";
import ModernNavbar from "@/components/ui/ModernNavbar";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#003580"; // dark navy (booking.com)
const NAV_DARK = "#00224f";
const ACCENT = "#0071c2"; // sky/booking blue
const SKY = "#38bdf8"; // lighter sky blue for accents

// ── Data ─────────────────────────────────────────────────────────────────────
const DOCTORS = [
  {
    name: "Dr. Sarah Jenkins",
    specialty: "Cardiology",
    image:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    reviews: 128,
    hospital: "Nova General Hospital",
    fee: 450,
  },
  {
    name: "Dr. Michael Chen",
    specialty: "Neurology",
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
    reviews: 93,
    hospital: "City Medical Center",
    fee: 380,
  },
  {
    name: "Dr. Emily Carter",
    specialty: "Dermatology",
    image:
      "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600",
    rating: 5.0,
    reviews: 312,
    hospital: "Skin & Care Clinic",
    fee: 320,
  },
  {
    name: "Dr. James Wilson",
    specialty: "Orthopedics",
    image:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
    reviews: 84,
    hospital: "Sports Medicine Institute",
    fee: 410,
  },
  {
    name: "Dr. Aisha Patel",
    specialty: "Pediatrics",
    image:
      "https://images.unsplash.com/photo-1594824432258-f99f2b09e25d?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    reviews: 215,
    hospital: "Children's Health Clinic",
    fee: 280,
  },
  {
    name: "Dr. Robert Fox",
    specialty: "General Medicine",
    image:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600",
    rating: 4.6,
    reviews: 156,
    hospital: "Community Care Center",
    fee: 250,
  },
];

const SPECIALTIES = [
  { name: "Cardiology", icon: HeartPulse, color: "#ef4444", bg: "#fff1f2" },
  { name: "Neurology", icon: Brain, color: "#a855f7", bg: "#faf5ff" },
  { name: "Pediatrics", icon: Baby, color: ACCENT, bg: "#eff6ff" },
  { name: "Orthopedics", icon: Bone, color: "#f97316", bg: "#fff7ed" },
  { name: "Ophthalmology", icon: Eye, color: "#14b8a6", bg: "#f0fdfa" },
  { name: "Dermatology", icon: Activity, color: "#ec4899", bg: "#fdf2f8" },
  {
    name: "General Medicine",
    icon: Stethoscope,
    color: "#22c55e",
    bg: "#f0fdf4",
  },
  { name: "Physiotherapy", icon: Activity, color: "#6366f1", bg: "#eef2ff" },
];

const BLOGS = [
  {
    title: "10 Daily Habits for a Healthier Heart",
    category: "Cardiology",
    image:
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=800",
    date: "Mar 12, 2026",
  },
  {
    title: "Understanding Mental Health and Brain Functions",
    category: "Neurology",
    image:
      "https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&q=80&w=800",
    date: "Mar 15, 2026",
  },
  {
    title: "Skincare Basics: Protecting Your Complexion",
    category: "Dermatology",
    image:
      "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=800",
    date: "Mar 18, 2026",
  },
];

const STEPS = [
  {
    title: "Create Account",
    description: "Sign up in minutes — no insurance needed.",
    icon: UserCircle,
  },
  {
    title: "Choose a Doctor",
    description: "Filter by specialty, rating, and availability.",
    icon: Search,
  },
  {
    title: "Video Consultation",
    description: "Meet your doctor via secure HD video call.",
    icon: Video,
  },
  {
    title: "Get a Care Plan",
    description: "Receive prescriptions, referrals, or follow-up care.",
    icon: Pill,
  },
];

const TRUST_ITEMS = [
  {
    icon: Shield,
    label: "Verified Doctors",
    desc: "Every doctor is licensed & credential-checked",
  },
  {
    icon: Clock,
    label: "Available 24/7",
    desc: "Book appointments any time, day or night",
  },
  {
    icon: Users,
    label: "50,000+ Patients",
    desc: "Trusted by patients across the country",
  },
  {
    icon: CheckCircle,
    label: "Secure & Private",
    desc: "Your health data is encrypted and protected",
  },
];

// ── Status dot colors ─────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  available: "#22c55e",
  busy: "#f59e0b",
  offline: "#94a3b8",
};

export default function LandingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{
        background: "#f0f4f8",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* ══════════════════════════════════════════════════════
          STICKY NAV
      ══════════════════════════════════════════════════════ */}
      <ModernNavbar />

      {/* ══════════════════════════════════════════════════════
          HERO — full-width, booking.com style
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden pt-14"
        style={{ background: NAV_BG, minHeight: "92vh" }}
      >
        {/* Background blobs */}
        <div
          className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)",
            transform: "translate(20%, -20%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(0,113,194,0.15) 0%, transparent 70%)",
            transform: "translate(-20%, 20%)",
          }}
        />

        {/* Hero grid: text left, doctor image right */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-0 grid lg:grid-cols-2 gap-0 items-center">
          {/* ── LEFT: Text + Search ── */}
          <div className="pb-16 lg:pb-10 pt-8 lg:pr-8">
            {/* Pill badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold mb-6 border"
              style={{
                background: "rgba(56,189,248,0.12)",
                borderColor: "rgba(56,189,248,0.3)",
                color: SKY,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: SKY }}
              />
              2,000+ Verified Doctors Available Now
            </div>

            <h1
              className="text-white font-extrabold leading-[1.1] mb-5"
              style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
            >
              Your Health,
              <br />
              <span style={{ color: SKY }}>Our Priority.</span>
              <br />
              <span
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "0.75em",
                  fontWeight: 700,
                }}
              >
                Find & Book Top Doctors
              </span>
            </h1>

            <p
              className="text-[15px] leading-relaxed mb-8 max-w-lg"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Connect with verified specialists in minutes. Compare ratings,
              fees, and availability — then book instantly with a single tap.
            </p>

            {/* Search bar — booking.com style with sky yellow-border equivalent (sky border) */}
            <div
              className="rounded-2xl overflow-hidden border-2 mb-5"
              style={{
                borderColor: SKY,
                boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              {/* Row 1: Doctor search + Location */}
              <div className="flex flex-col sm:flex-row">
                <div
                  className="flex-1 flex items-center gap-2.5 bg-white px-4 py-3.5 sm:border-r"
                  style={{ borderColor: "#e2e8f0" }}
                >
                  <Stethoscope
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: ACCENT }}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Doctor name, specialty…"
                    className="flex-1 text-[14px] font-medium outline-none placeholder:text-slate-400"
                    style={{ color: "#1e293b" }}
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")}>
                      <X className="w-4 h-4 text-slate-300" />
                    </button>
                  )}
                </div>
                <div
                  className="flex items-center gap-2.5 bg-white px-4 py-3.5 border-t sm:border-t-0"
                  style={{ borderColor: "#e2e8f0", minWidth: 160 }}
                >
                  <MapPin
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: ACCENT }}
                  />
                  <input
                    type="text"
                    value={locationTerm}
                    onChange={(e) => setLocationTerm(e.target.value)}
                    placeholder="City or hospital…"
                    className="flex-1 text-[14px] font-medium outline-none placeholder:text-slate-400"
                    style={{ color: "#1e293b" }}
                  />
                </div>
              </div>
              {/* Row 2: Search button full width */}
              <Link
                href={
                  searchTerm
                    ? `/doctors?q=${encodeURIComponent(searchTerm)}`
                    : "/doctors"
                }
                className="flex items-center justify-center gap-2 w-full py-3.5 text-[14px] font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.99]"
                style={{ background: NAV_DARK }}
              >
                <Search className="w-4 h-4" /> Search Doctors
              </Link>
            </div>

            {/* Quick specialty chips */}
            <div className="flex flex-wrap gap-2">
              {["Dermatology", "Cardiology", "Pediatrics", "Neurology"].map(
                (s) => (
                  <Link
                    key={s}
                    href={`/doctors?specialty=${encodeURIComponent(s)}`}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-all hover:bg-white/20"
                    style={{
                      borderColor: "rgba(255,255,255,0.2)",
                      color: "rgba(255,255,255,0.75)",
                    }}
                  >
                    {s}
                  </Link>
                ),
              )}
            </div>

            {/* Doctor CTA */}
            <p
              className="text-[13px] mt-5"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              Are you a doctor?{" "}
              <Link
                href="/doctor/signup"
                className="font-bold underline underline-offset-2 transition-colors"
                style={{ color: SKY }}
              >
                Join MediBook →
              </Link>
            </p>
          </div>

          {/* ── RIGHT: Doctor image ── */}
          {/* ── RIGHT: Doctor image ── */}
          <div
            className="relative"
            style={{ height: "clamp(560px, 85vh, 860px)" }}
          >
            {/* Soft sky-blue glow behind the figure */}
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{
                height: "85%",
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(56,189,248,0.22) 0%, transparent 70%)",
              }}
            />

            {/* Doctor image — fills the column, pinned to the bottom, perfectly straight */}
            <Image
              src="/doctors.png"
              alt="Doctor"
              fill
              priority
              className="object-contain"
              style={{
                objectPosition: "",
                filter: "drop-shadow(0 0 48px rgba(56,189,248,0.28))",
              }}
            />

            {/* Floating stat: patients */}
            <div
              className="absolute top-10 left-4 bg-white rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.18)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#eff6ff" }}
              >
                <Users className="w-4 h-4" style={{ color: ACCENT }} />
              </div>
              <div>
                <p className="text-[18px] font-extrabold text-slate-900 leading-none">
                  50K+
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Happy Patients
                </p>
              </div>
            </div>

            {/* Floating stat: rating */}
            <div
              className="absolute top-1/3 right-4 bg-white rounded-2xl px-4 py-3"
              style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.18)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-[18px] font-extrabold text-slate-900">
                  4.9
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Avg. Rating
              </p>
              <p
                className="text-[10px] font-semibold mt-0.5"
                style={{ color: ACCENT }}
              >
                2,000+ Doctors
              </p>
            </div>
          </div>
        </div>

        {/* Stats strip at bottom of hero */}
        <div
          className="relative z-20"
          style={{
            background: NAV_DARK,
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
            >
              {[
                { number: "50+", label: "Partner Clinics" },
                { number: "2K+", label: "Verified Doctors" },
                { number: "50K+", label: "Patients Served" },
                { number: "4.9★", label: "Average Rating" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center py-3 px-4"
                >
                  <p className="text-[22px] font-extrabold text-white leading-none">
                    {s.number}
                  </p>
                  <p
                    className="text-[11px] font-semibold mt-1"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CARE SPECIALTIES  (booking.com category row style)
      ══════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex items-end justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <p
                className="text-[11px] font-extrabold uppercase tracking-widest mb-1.5"
                style={{ color: ACCENT }}
              >
                Specialties
              </p>
              <h2 className="text-[24px] sm:text-[32px] font-extrabold text-slate-900 leading-tight">
                Comprehensive Care
              </h2>
              <p className="text-slate-500 text-[14px] mt-1">
                Browse specialties and find the right expert for your needs.
              </p>
            </div>
            <Link
              href="/doctors"
              className="hidden sm:flex items-center gap-1.5 text-[13px] font-bold transition-colors flex-shrink-0"
              style={{ color: ACCENT }}
            >
              All Specialties <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Grid: 4 on desktop, 2 on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
            {SPECIALTIES.map((spec) => (
              <Link
                key={spec.name}
                href={`/doctors?specialty=${encodeURIComponent(spec.name)}`}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-slate-100 text-center transition-all hover:shadow-lg hover:-translate-y-0.5 group cursor-pointer bg-white"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: spec.bg }}
                >
                  <spec.icon
                    className="w-6 h-6"
                    style={{ color: spec.color }}
                  />
                </div>
                <p className="text-[11px] sm:text-[12px] font-bold text-slate-700 leading-tight">
                  {spec.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TRUST / WHY MEDIBOOK — dark navy band
      ══════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20" style={{ background: NAV_BG }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <p
              className="text-[11px] font-extrabold uppercase tracking-widest mb-2"
              style={{ color: SKY }}
            >
              Why MediBook
            </p>
            <h2 className="text-[24px] sm:text-[32px] font-extrabold text-white leading-tight">
              Healthcare you can trust
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRUST_ITEMS.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 border transition-all hover:border-sky-400/30"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(56,189,248,0.15)" }}
                >
                  <item.icon className="w-6 h-6" style={{ color: SKY }} />
                </div>
                <p className="font-extrabold text-white text-[15px] mb-1">
                  {item.label}
                </p>
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURED DOCTORS  (booking.com property card style)
      ══════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <p
                className="text-[11px] font-extrabold uppercase tracking-widest mb-1.5"
                style={{ color: ACCENT }}
              >
                Top Rated
              </p>
              <h2 className="text-[24px] sm:text-[32px] font-extrabold text-slate-900">
                Meet our top specialists
              </h2>
              <p className="text-slate-500 text-[14px] mt-1">
                Highly rated, experienced, and ready to help you today.
              </p>
            </div>
            <Link
              href="/doctors"
              className="hidden sm:flex items-center gap-1.5 text-[13px] font-bold flex-shrink-0"
              style={{ color: ACCENT }}
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Desktop: 3-col wide cards. Mobile: scrollable row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DOCTORS.slice(0, 6).map((doc, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer flex flex-col"
                style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
              >
                {/* Image */}
                <div
                  className="relative h-52 overflow-hidden"
                  style={{
                    background:
                      "linear-gradient(160deg, #cfe0ff 0%, #a8c8f8 100%)",
                  }}
                >
                  <Image
                    src={doc.image}
                    alt={doc.name}
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                  {/* Rating badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 backdrop-blur-sm shadow">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {doc.rating}
                  </div>
                  {/* Available dot */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Available
                  </div>
                </div>
                {/* Content */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-extrabold text-[15px] text-slate-900 mb-0.5 group-hover:text-blue-700 transition-colors">
                    {doc.name}
                  </h3>
                  <p
                    className="text-[12px] font-semibold mb-1"
                    style={{ color: ACCENT }}
                  >
                    {doc.specialty}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {doc.hospital}
                  </p>

                  <div className="border-t border-dashed border-slate-100 pt-3 mt-auto flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-400">
                        Consultation fee
                      </p>
                      <p
                        className="text-[15px] font-extrabold leading-tight"
                        style={{ color: ACCENT }}
                      >
                        {doc.fee}{" "}
                        <span className="text-[10px] font-semibold text-slate-500">
                          Birr
                        </span>
                      </p>
                    </div>
                    <Link
                      href="/login"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-extrabold text-white transition-all active:scale-95 hover:opacity-90"
                      style={{ background: NAV_BG }}
                    >
                      <Zap className="w-3.5 h-3.5" /> Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-extrabold text-white text-[14px] transition-all hover:opacity-90 active:scale-95"
              style={{ background: NAV_BG }}
            >
              View All Doctors <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20" style={{ background: "#eef2f7" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <p
              className="text-[11px] font-extrabold uppercase tracking-widest mb-2"
              style={{ color: ACCENT }}
            >
              Simple Process
            </p>
            <h2 className="text-[24px] sm:text-[32px] font-extrabold text-slate-900">
              How it works
            </h2>
            <p className="text-slate-500 text-[14px] mt-2">
              Get the care you need in four simple steps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((step, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl p-6 text-center relative hover:shadow-lg transition-all"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                {/* Step number */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center shadow-md"
                  style={{ background: NAV_BG }}
                >
                  {idx + 1}
                </div>
                {/* Connector line (not on last) */}
                {idx < 3 && (
                  <div
                    className="hidden lg:block absolute top-6 left-full w-5 h-0.5 z-10"
                    style={{
                      background:
                        "linear-gradient(90deg, #cbd5e1, transparent)",
                    }}
                  />
                )}
                <div
                  className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 mt-2"
                  style={{ background: "#eff6ff" }}
                >
                  <step.icon className="w-7 h-7" style={{ color: ACCENT }} />
                </div>
                <h3 className="font-extrabold text-[15px] text-slate-800 mb-2">
                  {step.title}
                </h3>
                <p className="text-[12px] text-slate-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HEALTH BLOG
      ══════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <p
                className="text-[11px] font-extrabold uppercase tracking-widest mb-1.5"
                style={{ color: ACCENT }}
              >
                Blog
              </p>
              <h2 className="text-[24px] sm:text-[32px] font-extrabold text-slate-900">
                Health Insights
              </h2>
              <p className="text-slate-500 text-[14px] mt-1">
                Expert articles to help you stay informed and healthy.
              </p>
            </div>
            <Link
              href="/blogs"
              className="hidden sm:flex items-center gap-1.5 text-[13px] font-bold flex-shrink-0"
              style={{ color: ACCENT }}
            >
              All articles <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Desktop: featured big left + 2 stacked right. Mobile: single column */}
          <div className="grid lg:grid-cols-5 gap-5">
            {/* Big featured */}
            <div
              className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer"
              style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
            >
              <div className="relative h-56 sm:h-72 overflow-hidden bg-slate-100">
                <Image
                  src={BLOGS[0].image}
                  alt={BLOGS[0].title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div
                  className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-bold text-white"
                  style={{ background: ACCENT }}
                >
                  {BLOGS[0].category}
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-[11px] text-slate-400 font-semibold mb-2">
                  {BLOGS[0].date}
                </p>
                <h3 className="font-extrabold text-[18px] sm:text-[20px] text-slate-900 mb-3 leading-snug group-hover:text-blue-700 transition-colors">
                  {BLOGS[0].title}
                </h3>
                <span
                  className="inline-flex items-center gap-1 text-[13px] font-bold"
                  style={{ color: ACCENT }}
                >
                  Read article <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* 2 stacked */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              {BLOGS.slice(1).map((blog, i) => (
                <div
                  key={i}
                  className="flex gap-3 bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                  style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}
                >
                  <div className="relative w-28 sm:w-36 flex-shrink-0 bg-slate-100">
                    <Image
                      src={blog.image}
                      alt={blog.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full w-fit mb-2"
                      style={{ background: "#eff6ff", color: ACCENT }}
                    >
                      {blog.category}
                    </span>
                    <h3 className="font-bold text-[13px] text-slate-800 leading-snug group-hover:text-blue-700 transition-colors line-clamp-3">
                      {blog.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      {blog.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA BANNER — dark navy
      ══════════════════════════════════════════════════════ */}
      <section
        className="py-16 sm:py-24 relative overflow-hidden"
        style={{ background: NAV_BG }}
      >
        {/* Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(ellipse, rgba(56,189,248,0.12) 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p
            className="text-[11px] font-extrabold uppercase tracking-widest mb-3"
            style={{ color: SKY }}
          >
            Start Today
          </p>
          <h2 className="text-[26px] sm:text-[36px] font-extrabold text-white leading-tight mb-4">
            Ready to take control
            <br className="hidden sm:block" /> of your health?
          </h2>
          <p
            className="text-[15px] mb-10 max-w-xl mx-auto"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Join thousands of patients who trust MediBook for their healthcare.
            Book your first consultation in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-extrabold text-white text-[15px] transition-all hover:opacity-90 active:scale-95"
              style={{
                background: SKY,
                boxShadow: `0 8px 24px rgba(56,189,248,0.3)`,
              }}
            >
              <Zap className="w-5 h-5" /> Get Started — It's Free
            </Link>
            <Link
              href="/doctors"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-extrabold text-[15px] transition-all hover:bg-white/15 active:scale-95 border"
              style={{
                color: "white",
                borderColor: "rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
              }}
            >
              Browse Doctors <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Micro trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10">
            {[
              "No subscription needed",
              "50K+ happy patients",
              "Available 24/7",
            ].map((t) => (
              <div
                key={t}
                className="flex items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <CheckCircle className="w-3.5 h-3.5" style={{ color: SKY }} />{" "}
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}
