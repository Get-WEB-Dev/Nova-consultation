"use client";
import Link from "next/link";
import {
  Stethoscope,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Heart,
} from "lucide-react";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#1a3558";
const NAV_DARK = "#0c192c";
const ACCENT = "#1e4470";
const SKY = "#0cbcad";

const FOOTER_LINKS = {
  "For Patients": [
    { label: "Find a Doctor", href: "/doctors" },
    { label: "Book Appointment", href: "/doctors" },
    { label: "Health Plans", href: "/plans" },
    { label: "Video Consultation", href: "/doctors" },
    { label: "Medical Records", href: "/records" },
  ],
  "For Doctors": [
    { label: "Join MediBook", href: "/doctor/signup" },
    { label: "Doctor Login", href: "/doctor-login" },
    { label: "Doctor Resources", href: "/doctor/resources" },
    { label: "Partner Clinics", href: "/clinics" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Blog", href: "/blogs" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Press", href: "/press" },
  ],
  Support: [
    { label: "Help Center", href: "/help" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

const SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Pediatrics",
  "Orthopedics",
  "Psychiatry",
  "Gynecology",
  "General Medicine",
];

export default function ModernFooter() {
  return (
    <footer style={{ background: NAV_DARK }}>
      {/* ── Top CTA strip ─────────────────────────────────────────────── */}
      <div
        className="border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: NAV_BG }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="font-extrabold text-white text-[18px] sm:text-[20px] leading-tight">
              Your health is our priority.
            </h3>
            <p
              className="text-[13px] mt-1"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Connect with a verified doctor in minutes — no waiting rooms
              needed.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/doctors"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold transition-all hover:opacity-90 active:scale-95"
              style={{ background: SKY, color: NAV_DARK }}
            >
              Find a Doctor <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold border transition-all hover:bg-white/15"
              style={{
                color: "white",
                borderColor: "rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.07)",
              }}
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main footer body ──────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 sm:gap-10">
          {/* Brand column — spans 2 cols on lg */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-4 group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:opacity-80 transition-opacity"
                style={{ background: SKY }}
              >
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-white text-[17px] tracking-tight">
                MediBook
              </span>
            </Link>

            <p
              className="text-[13px] leading-relaxed mb-5"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Ethiopia's leading digital health platform connecting patients
              with verified doctors for fast, affordable, and quality care —
              available 24/7.
            </p>

            {/* Contact info */}
            <div className="space-y-2.5">
              {[
                { icon: Phone, text: "+251 (800) 123-4567" },
                { icon: Mail, text: "support@medibook.health" },
                { icon: MapPin, text: "Addis Ababa, Ethiopia" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <item.icon
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: SKY, opacity: 0.75 }}
                  />
                  <span
                    className="text-[12px]"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p
                className="text-[10px] font-extrabold uppercase tracking-widest mb-4"
                style={{ color: SKY, opacity: 0.85 }}
              >
                {section}
              </p>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[12px] font-medium transition-all"
                      style={{ color: "rgba(255,255,255,0.52)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "white")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(255,255,255,0.52)")
                      }
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Specialty tags row */}
        <div
          className="mt-10 pt-8 border-t"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <p
            className="text-[10px] font-extrabold uppercase tracking-widest mb-4"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Browse by specialty
          </p>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <Link
                key={s}
                href={`/doctors?specialty=${encodeURIComponent(s)}`}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all"
                style={{
                  borderColor: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.5)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = SKY;
                  e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                }}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────── */}
      <div
        className="border-t"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-[11px]"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            © {new Date().getFullYear()} MediBook Health Technologies. All
            rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {["Privacy", "Terms", "Cookies"].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                className="text-[11px] font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.7)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.35)")
                }
              >
                {item}
              </Link>
            ))}
          </div>
          <p
            className="text-[11px] flex items-center gap-1"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            Made with{" "}
            <Heart
              className="w-3 h-3"
              style={{ color: "#f43f5e", fill: "#f43f5e" }}
            />{" "}
            in Ethiopia
          </p>
        </div>
      </div>
    </footer>
  );
}
