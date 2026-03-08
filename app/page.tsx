import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Calendar,
  Users,
  ArrowRight,
  CheckCircle,
  Video,
  MessageCircle,
  Heart,
  Star,
  Stethoscope,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-nova-gradient-soft relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-200/15 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gold-200/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5 font-display font-bold text-lg text-primary-600">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm">
            <Image src="/favicon.png" alt="Nova Health" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          Nova Health
        </div>
        <div className="flex items-center gap-3">
          <Link href="/doctors" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors">
            <Stethoscope className="w-4 h-4" /> Doctors
          </Link>
          <Link href="/doctor-login" className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors">
            <Stethoscope className="w-4 h-4" /> Doctor Portal
          </Link>
          <Link href="/admin-login" className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <Shield className="w-4 h-4" /> Admin Portal
          </Link>
          <Link href="/login" className="btn-ghost">
            Sign In
          </Link>
          <Link href="/login?tab=register" className="btn-primary">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-12 sm:pt-16 pb-16 sm:pb-20 text-center relative z-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 bg-accent-50 text-accent-600 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-accent-100">
          <CheckCircle className="w-3.5 h-3.5" /> Trusted by 10,000+ patients
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl text-slate-900 leading-tight mb-6">
          Your Health,{" "}
          <span className="text-gradient relative">
            Connected
            <svg
              className="absolute -bottom-1 left-0 w-full"
              viewBox="0 0 300 12"
              fill="none"
            >
              <path
                d="M2 9C50 3 100 1 150 4C200 7 250 9 298 6"
                stroke="url(#underline-grad)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="underline-grad" x1="0" y1="6" x2="300" y2="6">
                  <stop offset="0%" stopColor="#1B3A5C" />
                  <stop offset="100%" stopColor="#2E8B3D" />
                </linearGradient>
              </defs>
            </svg>
          </span>
        </h1>
        <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Connect with certified doctors and health professionals from the
          comfort of your home. Quality care, anytime, anywhere.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login?tab=register"
            className="btn-primary text-base px-8 py-3.5"
          >
            Join Now <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/dashboard" className="btn-secondary text-base px-8 py-3.5">
            Meet Professionals
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-14 grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {[
            { value: "500+", label: "Doctors" },
            { value: "10K+", label: "Patients" },
            { value: "4.9★", label: "Rating" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-display font-bold text-2xl sm:text-3xl text-gradient">
                {value}
              </p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16 relative">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display font-bold text-2xl text-center text-slate-800 mb-3">
            How It Works
          </h2>
          <p className="text-sm text-slate-500 text-center mb-10 max-w-md mx-auto">
            Get started in just three simple steps
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: Users,
                title: "Create Account",
                desc: "Sign up in seconds and complete your health profile with secure, encrypted data.",
                color: "from-primary-600 to-primary-500",
              },
              {
                step: "02",
                icon: Calendar,
                title: "Consult a Doctor",
                desc: "Browse verified doctors, check availability, and book a consultation instantly.",
                color: "from-accent-500 to-accent-400",
              },
              {
                step: "03",
                icon: Video,
                title: "Start Consultation",
                desc: "Connect via HD video call, chat in real-time, and get your prescriptions digitally.",
                color: "from-gold-400 to-gold-500",
              },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="relative bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Step {step}</span>
                </div>
                <h3 className="font-display font-semibold text-slate-800 mb-2">
                  {title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display font-bold text-2xl text-center text-slate-800 mb-10">
            Why Nova Health?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Stethoscope,
                title: "Expert Doctors",
                desc: "Access verified specialists across every field of medicine.",
                color: "bg-primary-50 text-primary-600",
              },
              {
                icon: Calendar,
                title: "Easy Appointments",
                desc: "Book, reschedule, or cancel appointments in seconds.",
                color: "bg-accent-50 text-accent-600",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                desc: "Your medical data is encrypted and always under your control.",
                color: "bg-gold-50 text-gold-600",
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="card text-center hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mx-auto mb-4`}
                >
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-semibold text-slate-800 mb-2">
                  {title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal Access Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display font-bold text-2xl text-center text-slate-800 mb-3">
            Portal Access
          </h2>
          <p className="text-sm text-slate-500 text-center mb-10 max-w-md mx-auto">
            Are you a doctor or administrator? Access your dedicated portal below.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Doctor Portal Card */}
            <Link
              href="/doctor-login"
              className="group relative bg-gradient-to-br from-primary-50 to-white rounded-2xl border border-primary-100 p-6 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-100/40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-sm mb-4">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-semibold text-lg text-slate-800 mb-1">
                  Doctor Portal
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  Access your dashboard, manage consultations, view patient records, and update your schedule.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 group-hover:gap-2.5 transition-all">
                  Sign in as Doctor <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            {/* Admin Portal Card */}
            <Link
              href="/admin-login"
              className="group relative bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-6 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100/40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center shadow-sm mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-semibold text-lg text-slate-800 mb-1">
                  Admin Portal
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  Manage users, oversee doctors, view system analytics, and configure platform settings.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 group-hover:gap-2.5 transition-all">
                  Sign in as Admin <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            {/* Patient Portal Card */}
            <Link
              href="/login"
              className="group relative bg-gradient-to-br from-accent-50 to-white rounded-2xl border border-accent-100 p-6 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden sm:col-span-2 lg:col-span-1"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent-100/40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center shadow-sm mb-4">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-display font-semibold text-lg text-slate-800 mb-1">
                  Patient Portal
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  Book appointments, consult with doctors, manage your health records, and more.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 group-hover:gap-2.5 transition-all">
                  Sign in as Patient <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10">
            <h2 className="font-display font-bold text-2xl md:text-3xl mb-3">
              Ready to take care of your health?
            </h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">
              Join thousands of patients who trust Nova Health for their healthcare needs.
            </p>
            <Link
              href="/login?tab=register"
              className="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-50 hover:shadow-lg transition-all"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-slate-400">
            <div className="w-6 h-6 rounded-lg overflow-hidden">
              <Image src="/favicon.png" alt="Nova Health" width={24} height={24} className="w-full h-full object-cover opacity-50" />
            </div>
            Nova Health Consultancy
          </div>
          <p className="text-xs text-slate-400">
            © 2024 Nova Health Consultancy. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
