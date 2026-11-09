"use client";
import Link from "next/link";
import { ChevronRight, Shield, Lock, Eye, Database, UserCheck, Globe } from "lucide-react";
import ModernFooter from "@/components/ui/ModernFooter";
import ModernNavbar from "@/components/ui/ModernNavbar";

const NAV_BG = "#1a3558";
const NAV_DARK = "#0c192c";
const ACCENT = "#1e4470";
const SKY = "#0cbcad";

const SECTIONS = [
  {
    id: "collection",
    icon: Database,
    title: "1. Information We Collect",
    content: [
      {
        subtitle: "Personal Information",
        text: "When you create an account, book a consultation, or contact us, we may collect your full name, email address, phone number, date of birth, gender, and payment information.",
      },
      {
        subtitle: "Health Information",
        text: "To facilitate medical consultations, we collect health-related data including medical history, symptoms, prescriptions, and consultation notes. This data is treated with the highest level of confidentiality in accordance with applicable health data protection laws.",
      },
      {
        subtitle: "Usage Data",
        text: "We automatically collect information about how you interact with our platform, including device type, browser, IP address, pages visited, and session duration. This helps us improve our services and user experience.",
      },
    ],
  },
  {
    id: "use",
    icon: Eye,
    title: "2. How We Use Your Information",
    content: [
      {
        subtitle: "",
        text: "We use the information we collect to provide, maintain, and improve our healthcare services; facilitate doctor-patient consultations and appointment scheduling; process payments and send transaction confirmations; communicate with you about your account, appointments, and service updates; ensure the security and integrity of our platform; comply with legal and regulatory requirements; and conduct analytics to enhance our services.",
      },
    ],
  },
  {
    id: "sharing",
    icon: UserCheck,
    title: "3. Information Sharing & Disclosure",
    content: [
      {
        subtitle: "With Healthcare Providers",
        text: "Your health information is shared with the doctors and medical professionals you consult with on our platform, solely for the purpose of providing medical care.",
      },
      {
        subtitle: "Service Providers",
        text: "We work with trusted third-party service providers (payment processors, cloud hosting, analytics) who process data on our behalf under strict confidentiality agreements.",
      },
      {
        subtitle: "Legal Requirements",
        text: "We may disclose your information when required by law, court order, or governmental regulation, or when necessary to protect the rights, safety, or property of Nova Health, our users, or others.",
      },
    ],
  },
  {
    id: "security",
    icon: Lock,
    title: "4. Data Security",
    content: [
      {
        subtitle: "",
        text: "We implement industry-standard security measures to protect your personal and health information. This includes encryption of data in transit and at rest (AES-256), secure authentication protocols, regular security audits and vulnerability assessments, access controls limiting data access to authorized personnel only, and secure cloud infrastructure with redundancy and backup systems. While no system is completely impervious to threats, we are committed to continuously improving our security posture.",
      },
    ],
  },
  {
    id: "rights",
    icon: Shield,
    title: "5. Your Rights & Choices",
    content: [
      {
        subtitle: "",
        text: "You have the right to access, update, or delete your personal information at any time through your account settings or by contacting our support team. You may request a copy of all data we hold about you. You can opt out of non-essential communications. You may request the restriction or cessation of data processing in certain circumstances. If you wish to delete your account, please contact us at privacy@novahealth.com and we will process your request within 30 business days.",
      },
    ],
  },
  {
    id: "international",
    icon: Globe,
    title: "6. Data Retention & Transfers",
    content: [
      {
        subtitle: "Retention",
        text: "We retain your personal data for as long as your account is active or as needed to provide services. Health records are retained in accordance with Ethiopian medical record retention requirements. After account deletion, certain data may be retained in anonymized form for analytics purposes.",
      },
      {
        subtitle: "International Transfers",
        text: "Your data may be processed on servers located outside of Ethiopia. When this occurs, we ensure appropriate safeguards are in place to protect your information in compliance with applicable data protection laws.",
      },
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#eef2f7" }}>
      <ModernNavbar />

      {/* Hero Banner */}
      <div style={{ background: NAV_BG }} className="pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div
            className="flex items-center gap-2 text-[12px] font-semibold mb-6"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span style={{ color: SKY }}>Privacy Policy</span>
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
              <Shield className="w-3.5 h-3.5" /> Your Privacy Matters
            </div>
            <h1
              className="font-extrabold text-white leading-tight mb-4"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              Privacy Policy
            </h1>
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              We are committed to protecting your privacy and ensuring the security of your
              personal and health information. This policy explains how we collect, use, and
              safeguard your data.
            </p>
          </div>
        </div>

        <div
          className="border-t"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: NAV_DARK }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                Last updated: November 1, 2026
              </p>
              <div className="flex items-center gap-4">
                {["HIPAA Aligned", "Data Encrypted", "GDPR Aware"].map((badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-1.5 text-[11px] font-bold"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    <Shield className="w-3 h-3" style={{ color: SKY }} />
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full">
        {/* Quick nav */}
        <div
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-8"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <p className="text-[11px] font-extrabold uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
            Quick Navigation
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                <s.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: ACCENT }} />
                {s.title.replace(/^\d+\.\s*/, "")}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 scroll-mt-24"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#eff6ff" }}
                >
                  <section.icon className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <h2 className="font-extrabold text-slate-900 text-[18px]">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.content.map((block, i) => (
                  <div key={i}>
                    {block.subtitle && (
                      <h3 className="font-bold text-[14px] text-slate-800 mb-1.5">{block.subtitle}</h3>
                    )}
                    <p className="text-[13px] text-slate-500 leading-relaxed">{block.text}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Contact section */}
          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              background: "rgba(26,53,88,0.04)",
              borderColor: "rgba(26,53,88,0.1)",
            }}
          >
            <h2 className="font-extrabold text-slate-900 text-[18px] mb-3">
              7. Contact Us About Privacy
            </h2>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
              If you have questions about this Privacy Policy, your personal data, or wish to
              exercise any of your rights, please contact our Data Protection team:
            </p>
            <div className="space-y-2">
              {[
                { label: "Email", value: "privacy@novahealth.com" },
                { label: "Phone", value: "+251 (800) 123-4567" },
                { label: "Address", value: "123 Nova Health Blvd, Addis Ababa, Ethiopia" },
              ].map((item) => (
                <div key={item.label} className="flex items-baseline gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest w-16" style={{ color: ACCENT }}>
                    {item.label}
                  </span>
                  <span className="text-[13px] font-semibold text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: NAV_BG }}
              >
                Contact Support <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <ModernFooter />
    </div>
  );
}

