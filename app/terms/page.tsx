"use client";
import Link from "next/link";
import { ChevronRight, FileText, Scale, AlertTriangle, CreditCard, Ban, RefreshCw } from "lucide-react";
import ModernFooter from "@/components/ui/ModernFooter";
import ModernNavbar from "@/components/ui/ModernNavbar";

const NAV_BG = "#1a3558";
const NAV_DARK = "#0c192c";
const ACCENT = "#1e4470";
const SKY = "#0cbcad";

const SECTIONS = [
  {
    id: "acceptance",
    icon: FileText,
    title: "1. Acceptance of Terms",
    content: [
      {
        subtitle: "",
        text: 'By accessing or using the Nova Health platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all users, including patients, healthcare providers, and visitors.',
      },
      {
        subtitle: "Eligibility",
        text: "You must be at least 18 years of age to create an account. By using the Service, you represent and warrant that you meet this requirement. Parents or legal guardians may create accounts on behalf of minors for the purpose of booking consultations.",
      },
    ],
  },
  {
    id: "services",
    icon: Scale,
    title: "2. Description of Services",
    content: [
      {
        subtitle: "",
        text: "Nova Health provides a digital platform connecting patients with licensed, verified healthcare professionals for medical consultations via video, chat, and other communication methods. We also provide appointment scheduling, medical record management, health content, and related services.",
      },
      {
        subtitle: "Not Emergency Services",
        text: "Nova Health is NOT an emergency medical service. If you are experiencing a medical emergency, call your local emergency number immediately. Our platform is designed for non-emergency consultations and should not be used as a substitute for emergency medical care.",
      },
    ],
  },
  {
    id: "accounts",
    icon: FileText,
    title: "3. User Accounts & Responsibilities",
    content: [
      {
        subtitle: "Account Security",
        text: "You are responsible for maintaining the confidentiality of your account credentials. You must immediately notify us of any unauthorized use of your account. Nova Health is not liable for any loss arising from your failure to protect your account information.",
      },
      {
        subtitle: "Accurate Information",
        text: "You agree to provide accurate, current, and complete information when creating your account and during consultations. Providing false or misleading health information may result in inappropriate medical advice and endangers your health.",
      },
      {
        subtitle: "Acceptable Use",
        text: "You agree not to misuse the Service by engaging in fraudulent activity, impersonating others, harassing healthcare providers or staff, attempting to access unauthorized areas of the platform, or using the Service for any unlawful purpose.",
      },
    ],
  },
  {
    id: "payments",
    icon: CreditCard,
    title: "4. Payments & Billing",
    content: [
      {
        subtitle: "Consultation Fees",
        text: "Consultation fees are displayed before booking and are charged in Ethiopian Birr (ETB). Fees vary by doctor, specialty, and consultation type. By booking a consultation, you agree to pay the displayed fee.",
      },
      {
        subtitle: "Refund Policy",
        text: "Refunds may be issued if a doctor fails to attend a scheduled consultation, if there are technical issues on our end that prevent the consultation, or if a cancellation is made more than 2 hours before the scheduled time. Refund requests are reviewed on a case-by-case basis and processed within 7–14 business days.",
      },
      {
        subtitle: "Payment Methods",
        text: "We accept various payment methods including mobile money, bank transfers, and card payments. All payment processing is handled by PCI-compliant third-party providers.",
      },
    ],
  },
  {
    id: "medical",
    icon: AlertTriangle,
    title: "5. Medical Disclaimer",
    content: [
      {
        subtitle: "",
        text: "Nova Health facilitates connections between patients and independent healthcare providers. We do not practice medicine and do not provide medical advice, diagnosis, or treatment. All medical services are provided by independently licensed healthcare professionals.",
      },
      {
        subtitle: "No Doctor-Patient Relationship with Nova Health",
        text: "Your use of the platform does not create a doctor-patient relationship between you and Nova Health. Any doctor-patient relationship is formed solely between you and the healthcare provider you consult with through our platform.",
      },
      {
        subtitle: "Second Opinions",
        text: "Information and advice obtained through our platform should not be considered a substitute for in-person medical examination when one is warranted. We encourage users to seek second opinions and in-person care when appropriate.",
      },
    ],
  },
  {
    id: "liability",
    icon: Ban,
    title: "6. Limitation of Liability",
    content: [
      {
        subtitle: "",
        text: 'To the maximum extent permitted by applicable law, Nova Health and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising from your use of the Service. Our total liability for any claim arising from or related to these Terms shall not exceed the amount you paid to Nova Health in the twelve (12) months preceding the claim.',
      },
    ],
  },
  {
    id: "changes",
    icon: RefreshCw,
    title: "7. Changes to Terms",
    content: [
      {
        subtitle: "",
        text: "We reserve the right to modify these Terms at any time. When changes are made, we will update the \"Last Updated\" date and notify registered users via email or in-app notification. Your continued use of the Service after changes constitutes acceptance of the modified Terms. If you do not agree to the updated Terms, you must stop using the Service and may request account deletion.",
      },
    ],
  },
];

export default function TermsOfServicePage() {
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
            <span style={{ color: SKY }}>Terms of Service</span>
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
              <FileText className="w-3.5 h-3.5" /> Legal Agreement
            </div>
            <h1
              className="font-extrabold text-white leading-tight mb-4"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
            >
              Terms of Service
            </h1>
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Please read these terms carefully before using the Nova Health platform.
              They govern your use of our services and outline the rights and
              responsibilities of all parties.
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
              <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
                By using Nova Health, you agree to these terms
              </p>
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

        {/* Important notice */}
        <div
          className="rounded-2xl p-5 border mb-6 flex items-start gap-3"
          style={{
            background: "rgba(245,158,11,0.06)",
            borderColor: "rgba(245,158,11,0.2)",
          }}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
          <div>
            <p className="font-bold text-[13px] text-slate-800 mb-1">Important Notice</p>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Nova Health is a telemedicine platform and is <strong>not</strong> a substitute for
              emergency medical services. If you are experiencing a medical emergency, please
              contact your local emergency services immediately.
            </p>
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

          {/* Governing law & Contact */}
          <section
            className="rounded-2xl p-6 sm:p-8 border"
            style={{
              background: "rgba(26,53,88,0.04)",
              borderColor: "rgba(26,53,88,0.1)",
            }}
          >
            <h2 className="font-extrabold text-slate-900 text-[18px] mb-3">
              8. Governing Law & Contact
            </h2>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
              These Terms are governed by and construed in accordance with the laws of the
              Federal Democratic Republic of Ethiopia. Any disputes arising from these Terms
              shall be subject to the exclusive jurisdiction of the courts in Addis Ababa,
              Ethiopia.
            </p>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
              For questions about these Terms of Service, please contact us:
            </p>
            <div className="space-y-2">
              {[
                { label: "Email", value: "legal@novahealth.com" },
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
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: NAV_BG }}
              >
                Contact Support <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/privacy"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-extrabold border transition-all hover:bg-slate-50"
                style={{ color: ACCENT, borderColor: "#e2e8f0" }}
              >
                Privacy Policy <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <ModernFooter />
    </div>
  );
}

