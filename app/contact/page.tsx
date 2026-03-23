"use client";
import Link from "next/link";
import { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Send,
  CheckCircle,
  ChevronRight,
  MessageCircle,
  Clock,
} from "lucide-react";
import ModernFooter from "@/components/ui/ModernFooter";
import ModernNavbar from "@/components/ui/ModernNavbar";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#003580";
const NAV_DARK = "#00224f";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

const CONTACT_ITEMS = [
  {
    icon: MapPin,
    label: "Address",
    value: "123 MediBook Health Blvd, Addis Ababa, Ethiopia",
    iconBg: "#eff6ff",
    iconColor: ACCENT,
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+251 (800) 123-4567",
    iconBg: "#f0fdf4",
    iconColor: "#22c55e",
  },
  {
    icon: Mail,
    label: "Email",
    value: "support@medibook.health",
    iconBg: "#fef3c7",
    iconColor: "#f59e0b",
  },
  {
    icon: Clock,
    label: "Working Hours",
    value: "Mon – Fri, 8:00 AM – 8:00 PM",
    iconBg: "#fdf2f8",
    iconColor: "#ec4899",
  },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

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
            <span style={{ color: SKY }}>Contact</span>
          </div>

          <div className="max-w-2xl">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold mb-5 border"
              style={{
                background: "rgba(56,189,248,0.12)",
                borderColor: "rgba(56,189,248,0.3)",
                color: SKY,
              }}
            >
              <MessageCircle className="w-3.5 h-3.5" /> We're here to help
            </div>
            <h1
              className="font-extrabold text-white leading-tight mb-4"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              Get in Touch
            </h1>
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Reach out to us for any inquiries about our services, support, or
              partnerships. Our team responds within 24 hours.
            </p>
          </div>
        </div>

        {/* Dark strip with quick stats */}
        <div
          className="border-t"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: NAV_DARK,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x"
              style={{ "--tw-divide-opacity": 1 } as any}
            >
              {[
                { value: "24h", label: "Response Time" },
                { value: "50K+", label: "Patients Helped" },
                { value: "24/7", label: "Support Available" },
                { value: "100%", label: "Satisfaction Rate" },
              ].map((s, i) => (
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

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        <div className="grid lg:grid-cols-5 gap-6 sm:gap-8 items-start">
          {/* ── LEFT: Contact info cards ── */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-extrabold text-slate-900 text-[18px] mb-5">
              Contact Information
            </h2>

            {CONTACT_ITEMS.map((item, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4 hover:shadow-md transition-all"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: item.iconBg }}
                >
                  <item.icon
                    className="w-5 h-5"
                    style={{ color: item.iconColor }}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[10px] font-extrabold uppercase tracking-widest mb-0.5"
                    style={{ color: ACCENT }}
                  >
                    {item.label}
                  </p>
                  <p className="text-[13px] font-semibold text-slate-700 leading-snug">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}

            {/* Map placeholder */}
            <div
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div
                className="h-44 relative"
                style={{
                  background:
                    "linear-gradient(135deg, #cfe0ff 0%, #a8c8f8 100%)",
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                    style={{ background: NAV_BG }}
                  >
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <p
                    className="text-[12px] font-bold"
                    style={{ color: NAV_BG }}
                  >
                    Addis Ababa, Ethiopia
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Contact form ── */}
          <div className="lg:col-span-3">
            <div
              className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8"
              style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
            >
              {/* Top accent bar */}
              <div
                className="h-1 rounded-full mb-6"
                style={{
                  background: `linear-gradient(90deg, ${NAV_BG}, ${ACCENT}, ${SKY})`,
                }}
              />

              {sent ? (
                <div className="py-12 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: "#eff6ff" }}
                  >
                    <CheckCircle
                      className="w-8 h-8"
                      style={{ color: ACCENT }}
                    />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-[20px] mb-2">
                    Message Sent!
                  </h3>
                  <p className="text-slate-500 text-[14px] mb-6">
                    We'll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setSent(false);
                      setForm({
                        name: "",
                        email: "",
                        subject: "",
                        message: "",
                      });
                    }}
                    className="text-[13px] font-bold px-5 py-2.5 rounded-xl text-white"
                    style={{ background: NAV_BG }}
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-extrabold text-slate-900 text-[18px] mb-1">
                    Send a Message
                  </h3>
                  <p className="text-[13px] text-slate-400 mb-6">
                    We typically reply within a few hours.
                  </p>

                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          className="block text-[11px] font-extrabold uppercase tracking-widest mb-1.5"
                          style={{ color: ACCENT }}
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, name: e.target.value }))
                          }
                          required
                          placeholder="Your full name"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label
                          className="block text-[11px] font-extrabold uppercase tracking-widest mb-1.5"
                          style={{ color: ACCENT }}
                        >
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, email: e.target.value }))
                          }
                          required
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        className="block text-[11px] font-extrabold uppercase tracking-widest mb-1.5"
                        style={{ color: ACCENT }}
                      >
                        Subject
                      </label>
                      <input
                        type="text"
                        value={form.subject}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, subject: e.target.value }))
                        }
                        placeholder="How can we help?"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label
                        className="block text-[11px] font-extrabold uppercase tracking-widest mb-1.5"
                        style={{ color: ACCENT }}
                      >
                        Your Message
                      </label>
                      <textarea
                        rows={5}
                        value={form.message}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, message: e.target.value }))
                        }
                        required
                        placeholder="Describe your inquiry in detail…"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:bg-white transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-extrabold text-white transition-all hover:opacity-90 active:scale-[0.99]"
                      style={{ background: NAV_BG }}
                    >
                      <Send className="w-4 h-4" /> Send Message
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <ModernFooter />
    </div>
  );
}
