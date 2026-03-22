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
  Phone,
  Mail,
} from "lucide-react";
import ModernFooter from "@/components/ui/ModernFooter";

export default function LandingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const DOCTORS = [
    { name: "Dr. Sarah Jenkins", specialty: "Cardiology", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=600", rating: 4.9, reviews: 128, hospital: "Nova General Hospital" },
    { name: "Dr. Michael Chen", specialty: "Neurology", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600", rating: 4.8, reviews: 93, hospital: "City Medical Center" },
    { name: "Dr. Emily Carter", specialty: "Dermatology", image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=600", rating: 5.0, reviews: 312, hospital: "Skin & Care Clinic" },
    { name: "Dr. James Wilson", specialty: "Orthopedics", image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600", rating: 4.7, reviews: 84, hospital: "Sports Medicine Institute" },
    { name: "Dr. Aisha Patel", specialty: "Pediatrics", image: "https://images.unsplash.com/photo-1594824432258-f99f2b09e25d?auto=format&fit=crop&q=80&w=600", rating: 4.9, reviews: 215, hospital: "Children's Health Clinic" },
    { name: "Dr. Robert Fox", specialty: "General Medicine", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=600", rating: 4.6, reviews: 156, hospital: "Community Care Center" },
  ];

  const SPECIALTIES = [
    { name: "Cardiology", icon: HeartPulse, color: "text-rose-500", bg: "bg-rose-50" },
    { name: "Neurology", icon: Brain, color: "text-purple-500", bg: "bg-purple-50" },
    { name: "Pediatrics", icon: Baby, color: "text-sky-500", bg: "bg-sky-50" },
    { name: "Orthopedics", icon: Bone, color: "text-orange-500", bg: "bg-orange-50" },
    { name: "Ophthalmology", icon: Eye, color: "text-teal-500", bg: "bg-teal-50" },
    { name: "Dermatology", icon: Activity, color: "text-pink-500", bg: "bg-pink-50" },
    { name: "General Medicine", icon: Stethoscope, color: "text-emerald-500", bg: "bg-emerald-50" },
    { name: "Physiotherapy", icon: Activity, color: "text-indigo-500", bg: "bg-indigo-50" },
  ];

  const BLOGS = [
    { title: "10 Daily Habits for a Healthier Heart", category: "Cardiology", image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=600", date: "Mar 12, 2026" },
    { title: "Understanding Mental Health and Brain Functions", category: "Neurology", image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&q=80&w=600", date: "Mar 15, 2026" },
    { title: "Skincare Basics: Protecting Your Complexion", category: "Dermatology", image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80&w=600", date: "Mar 18, 2026" },
  ];

  const STEPS = [
    { title: "Create Account", description: "Sign up in minutes – no insurance needed.", icon: UserCircle },
    { title: "Choose a Doctor", description: "Select a specialist and time that fits your schedule.", icon: Calendar },
    { title: "Video Consultation", description: "Meet with your doctor via secure HD video.", icon: Video },
    { title: "Get Better", description: "Receive prescriptions, referrals, or a care plan.", icon: Pill },
  ];

  return (
    <div className="min-h-screen font-sans text-slate-800 overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════
          HERO SECTION  —  full-width dark-blue background
          ═══════════════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════
          HERO — Two-tone split: dark navy left, blue right
          ═══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        {/* Left background — dark navy */}
        <div className="absolute inset-0 bg-[#0a1628]" />
        {/* Right background — vibrant blue block behind doctor */}
        <div className="hidden lg:block absolute top-0 right-0 w-[45%] h-full bg-gradient-to-br from-sky-400 to-sky-500 rounded-bl-[80px]" />
        {/* Mobile: blue block at top behind image */}
        <div className="lg:hidden absolute top-0 right-0 w-full h-[55%] bg-gradient-to-b from-sky-400 to-sky-500 rounded-b-[60px]" />

        {/* Decorative circles on the blue panel */}
        <div className="absolute top-20 right-[5%] w-40 h-40 border-2 border-white/10 rounded-full pointer-events-none" />
        <div className="absolute top-[40%] right-[15%] w-24 h-24 border-2 border-white/10 rounded-full pointer-events-none" />
        <div className="absolute bottom-32 right-[2%] w-56 h-56 border border-white/5 rounded-full pointer-events-none" />
        {/* Decorative circles on the dark panel */}
        <div className="absolute -top-10 -left-10 w-60 h-60 border border-white/5 rounded-full pointer-events-none" />
        <div className="absolute bottom-20 left-[20%] w-32 h-32 border border-white/5 rounded-full pointer-events-none" />

        {/* ── NAVBAR ── */}
        <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#0a1628]/95 backdrop-blur-md shadow-lg shadow-black/10 py-3" : "bg-transparent py-5"}`}>
          <div className="max-w-[90rem] mx-auto px-6 md:px-12 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-9 h-9 overflow-hidden rounded-xl bg-white/15 p-1.5 group-hover:bg-white/25 transition-colors">
                <Image src="/favicon.png" alt="Nova" fill className="object-cover" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Nova</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              {["Doctors", "Blogs", "About", "Contact Us"].map(link => (
                <Link key={link} href={`/${link.toLowerCase().replace(/\s+/g, "")}`} className="text-sm font-semibold text-white/80 hover:text-white transition-colors">
                  {link}
                </Link>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              <Link href="/login" className="text-sm font-semibold text-white/80 hover:text-white transition-colors px-4 py-2">Sign In</Link>
              <Link href="/signup" className="text-sm font-bold text-[#0a1628] bg-white hover:bg-slate-100 px-5 py-2.5 rounded-full shadow-md transition-all hover:-translate-y-0.5">Sign Up</Link>
              <Link href="/doctor-login" className="text-sm font-semibold text-white/60 hover:text-white transition-colors px-4 py-2 border-l border-white/15 ml-2">Doctor Login</Link>
            </div>

            <button className="lg:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden bg-[#0d1d35] border-t border-white/10 p-6 space-y-3">
              {["Doctors", "Blogs", "About", "Contact Us"].map(link => (
                <Link key={link} href={`/${link.toLowerCase().replace(/\s+/g, "")}`} onClick={() => setMobileMenuOpen(false)} className="block font-semibold text-slate-300 hover:text-white py-2">
                  {link}
                </Link>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-center font-bold text-sky-400 py-3 rounded-xl bg-white/5">Sign In</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="text-center font-bold text-white bg-sky-500 py-3 rounded-xl">Sign Up</Link>
                <Link href="/doctor-login" onClick={() => setMobileMenuOpen(false)} className="text-center font-semibold text-slate-400 py-3 rounded-xl bg-white/5 col-span-2">Doctor Login</Link>
              </div>
            </div>
          )}
        </header>

        {/* ── HERO CONTENT ── */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-emerald-500">

          {/* SVG WAVE BACKGROUND */}
          <svg className="absolute right-0 top-0 h-full w-[60%]" viewBox="0 0 500 500" preserveAspectRatio="none">
            <path d="M0,0 C300,0 200,500 500,500 L500,0 Z" className="fill-blue-950" />
          </svg>


          {/* CONTENT */}
          <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 items-center">

            {/* LEFT SIDE TEXT */}
            <div className="text-white space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Putting your health first with empathy and skill
              </h1>
              <p className="text-white/80 max-w-md">
                We are leading healthcare facility providing exceptional service for all patients.
              </p>

              <div className="flex gap-4">
                <button className="bg-white text-teal-600 px-6 py-3 rounded-xl font-semibold">
                  Get Started
                </button>
                <button className="border border-white/40 px-6 py-3 rounded-xl">
                  Call Now
                </button>

              </div>
              <p className="text-sm text-slate-500">
                Are you a qualified doctor?{" "}
                <Link href="/doctor/signup" className="text-sky-400 font-bold underline underline-offset-2 hover:text-sky-300 transition-colors">
                  Get started now
                </Link>
              </p>
            </div>

            {/* RIGHT SIDE IMAGE */}
            <div className="relative h-[500px] md:h-[600px] w-full">
              <Image
                src="/doc.png"
                alt="Doctors"
                fill
                priority
                className="object-contain scale-110"
              />
            </div>

          </div>
        </div>

        {/* ── STATS STRIP (centered, overlapping the bottom edge) ── */}
        <div className="relative z-20 -mb-14">
          <div className="max-w-3xl mx-auto px-6">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-100 py-8 px-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                {[
                  { number: "50+", label: "Clinics" },
                  { number: "2K+", label: "Doctors" },
                  { number: "50K+", label: "Patients" },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-50 border-2 border-sky-100 flex items-center justify-center">
                      <span className="text-xl sm:text-2xl font-black text-sky-600">{stat.number}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-600">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          COMPREHENSIVE CARE  (Specialties)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-[90rem] mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">Comprehensive Care</h2>
            <p className="text-slate-500 text-lg">Browse our specialties and find the right expert for your needs.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {SPECIALTIES.map((spec) => (
              <Link
                key={spec.name}
                href={`/doctors?specialty=${encodeURIComponent(spec.name)}`}
                className="group bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${spec.bg} group-hover:scale-110 transition-transform`}>
                  <spec.icon className={`w-8 h-8 ${spec.color}`} />
                </div>
                <h3 className="font-bold text-slate-800">{spec.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FEATURED DOCTORS
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-[90rem] mx-auto px-6 md:px-12">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800">Meet our top specialists</h2>
              <p className="text-slate-500 mt-2">Highly rated, experienced, and ready to help.</p>
            </div>
            <Link href="/doctors" className="flex items-center gap-2 text-sky-600 font-bold hover:text-sky-700 transition-colors">
              View all doctors <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {DOCTORS.slice(0, 3).map((doc, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden">
                <div className="relative w-full h-64 overflow-hidden bg-slate-100">
                  <Image src={doc.image} alt={doc.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {doc.rating}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold mb-1 group-hover:text-sky-600 transition-colors">{doc.name}</h3>
                  <p className="text-sm text-slate-500 mb-1">{doc.specialty}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mb-4"><MapPin className="w-3 h-3" /> {doc.hospital}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{doc.reviews} reviews</span>
                    <Link href="/login" className="text-sm font-bold text-sky-600 hover:text-sky-700">Book now →</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-[90rem] mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">How it works</h2>
            <p className="text-slate-500 text-lg">Get the care you need in four simple steps.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-7 text-center border border-slate-100 shadow-sm hover:shadow-lg transition-all relative">
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#0a1628] text-white text-xs font-bold flex items-center justify-center shadow-md">{idx + 1}</div>
                <div className="w-16 h-16 mx-auto bg-sky-50 rounded-2xl flex items-center justify-center mb-5">
                  <step.icon className="w-8 h-8 text-sky-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HEALTH INSIGHTS (Blogs)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-[90rem] mx-auto px-6 md:px-12">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800">Health insights</h2>
              <p className="text-slate-500 mt-2">Expert articles to help you stay informed.</p>
            </div>
            <Link href="/blogs" className="flex items-center gap-2 text-sky-600 font-bold hover:text-sky-700 transition-colors">
              Read more articles <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {BLOGS.map((blog, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer">
                <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                  <Image src={blog.image} alt={blog.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">{blog.category}</div>
                </div>
                <div className="p-6">
                  <p className="text-sm font-semibold text-slate-400 mb-2">{blog.date}</p>
                  <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-sky-600 transition-colors">{blog.title}</h3>
                  <div className="inline-flex items-center gap-1 text-sky-600 font-bold text-sm">Read article <ArrowRight className="w-4 h-4" /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CTA BANNER
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-[#0a1628] py-16 sm:py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to take control of your health?</h2>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">Join thousands of patients who trust Nova for their healthcare needs. Start your journey today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-0.5 text-lg">
              Get Started – It's Free
            </Link>
            <Link href="/doctors" className="bg-white/10 hover:bg-white/15 text-white font-bold px-8 py-4 rounded-full border border-white/10 transition-all hover:-translate-y-0.5 text-lg">
              Browse Doctors
            </Link>
          </div>
        </div>
      </section>

      <ModernFooter />
    </div>
  );
}


/* <div className="flex items-center max-w-lg bg-white/10 backdrop-blur-sm border border-white/10 rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-sky-400 transition-all">
                <div className="pl-5 pr-3 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="Type Doctor name or Specialties"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 py-4 pr-2 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm sm:text-base"
                />
                <Link
                  href={searchTerm ? `/doctors?q=${encodeURIComponent(searchTerm)}` : "/doctors"}
                  className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm px-6 py-3 mr-1.5 rounded-full transition-colors whitespace-nowrap shadow-lg shadow-sky-500/30"
                >
                  <Search className="w-4 h-4" /> Search
                </Link>
              </div>

             
              /*<p className="text-sm text-slate-500">
                Are you a qualified doctor?{" "}
                <Link href="/doctor/signup" className="text-sky-400 font-bold underline underline-offset-2 hover:text-sky-300 transition-colors">
                  Get started now
                </Link>
              </p>
            </div>*/