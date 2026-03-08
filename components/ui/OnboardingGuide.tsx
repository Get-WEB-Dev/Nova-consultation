"use client";

import { useState, useEffect, useCallback } from "react";
import { isLoggedIn } from "@/lib/supabase/auth";
import { X, ChevronRight, ChevronLeft, Check, ArrowUp, ArrowDown } from "lucide-react";

interface Step {
  id: string;
  title: string;
  titleAm: string;
  description: string;
  descriptionAm: string;
  selector: string;
  arrowDir: "up" | "down";
  color: string;
  colorHex: string;
  page: string;
}

const STEPS: Step[] = [
  {
    id: "d1",
    title: "Your Appointments",
    titleAm: "ቀጠሮዎችዎ",
    description: "Tap here to view upcoming consultations, join live video calls, and review your history.",
    descriptionAm: "ቀጥታ ጥሪዎችን ለመቀላቀል እና ታሪክዎን ለማየት ቀጠሮዎችን ይጫኑ።",
    selector: "[data-nav='appointments']",
    arrowDir: "up",
    color: "bg-primary-600",
    colorHex: "#1B3A5C",
    page: "dashboard",
  },
  {
    id: "d2",
    title: "Browse Doctors",
    titleAm: "ዶክተሮችን ያሳስሱ",
    description: "Find verified specialists, view profiles, check availability, and book consultations.",
    descriptionAm: "የተረጋገጡ ስፔሻሊስቶችን ያሳስሱ፣ መገለጫዎችን ይመልከቱ እና ቀጠሮ ይዙ።",
    selector: "[data-nav='doctors']",
    arrowDir: "up",
    color: "bg-accent-500",
    colorHex: "#2E8B3D",
    page: "dashboard",
  },
  {
    id: "d3",
    title: "Search Health Articles",
    titleAm: "የጤና ጽሑፎችን ፈልግ",
    description: "Use this search bar to quickly find health tips, articles, and advice from our doctors.",
    descriptionAm: "ከዶክተሮቻችን የጤና ምክሮችን እና ጽሑፎችን ለማግኘት ይህን ፍለጋ ይጠቀሙ።",
    selector: "[data-search='blog']",
    arrowDir: "up",
    color: "bg-gold-500",
    colorHex: "#E9A825",
    page: "dashboard",
  },
  {
    id: "dr1",
    title: "Search for a Doctor",
    titleAm: "ዶክተር ይፈልጉ",
    description: "Type a name, specialty, or condition to quickly find the right doctor for you.",
    descriptionAm: "ስም፣ ስፔሻሊቲ ወይም ሁኔታ ተይቦ ተስማሚ ዶክተር ፈልጉ።",
    selector: "[data-search='doctors']",
    arrowDir: "up",
    color: "bg-primary-600",
    colorHex: "#1B3A5C",
    page: "doctors",
  },
  {
    id: "dr2",
    title: "Filter Results",
    titleAm: "ውጤቶችን አጣሩ",
    description: "Narrow results by specialty, availability, price range, and consultation type.",
    descriptionAm: "በስፔሻሊቲ፣ ተገኝነት፣ ዋጋ እና የምክክር አይነት ያጣሩ።",
    selector: "[data-filter='doctors']",
    arrowDir: "up",
    color: "bg-accent-500",
    colorHex: "#2E8B3D",
    page: "doctors",
  },
  {
    id: "a1",
    title: "Join Your Live Call",
    titleAm: "ቀጥታ ጥሪዎን ይቀላቀሉ",
    description: "Click 'Join Meeting Now' to instantly start a video consultation with your doctor.",
    descriptionAm: "ወዲያውኑ ምክክር ለመጀመር 'አሁን ስብሰባ ይቀላቀሉ' ይጫኑ።",
    selector: "[data-action='join-meeting']",
    arrowDir: "down",
    color: "bg-emerald-500",
    colorHex: "#10b981",
    page: "appointments",
  },
  {
    id: "a2",
    title: "Book a New Appointment",
    titleAm: "አዲስ ቀጠሮ ይያዙ",
    description: "Tap 'Find a Doctor' to browse specialists and schedule your next consultation.",
    descriptionAm: "ስፔሻሊስቶችን ለማሳሰብ እና ቀጠሮ ለመያዝ 'ዶክተር ፈልግ' ይጫኑ።",
    selector: "[data-action='book-appointment']",
    arrowDir: "down",
    color: "bg-primary-600",
    colorHex: "#1B3A5C",
    page: "appointments",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const BOX_W = 300;
const GAP = 12;

export default function OnboardingGuide({ page = "dashboard" }: { page?: string }) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [lang, setLang] = useState<"en" | "am">("en");
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const pageSteps = STEPS.filter((s) => s.page === page);
  const step = pageSteps[stepIndex] as Step | undefined;

  // Measure target element in *viewport* coordinates (fixed positioning)
  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useEffect(() => {
    const done = localStorage.getItem("nova-onboarding-done");
    if (!done && isLoggedIn()) {
      setTimeout(() => setVisible(true), 800);
    }
    const stored = localStorage.getItem("hc-lang") as "en" | "am" | null;
    if (stored) setLang(stored);
    const handler = (e: Event) => setLang((e as CustomEvent<"en" | "am">).detail);
    window.addEventListener("hc-lang-change", handler);
    return () => window.removeEventListener("hc-lang-change", handler);
  }, []);

  useEffect(() => {
    if (!visible) return;
    measure();
    // Re-measure when layout shifts (fonts, images load)
    const id = setTimeout(measure, 300);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [visible, stepIndex, measure]);

  const dismiss = () => {
    localStorage.setItem("nova-onboarding-done", "true");
    setVisible(false);
  };

  if (!visible || !step) return null;

  const isEn = lang === "en";
  const isLast = stepIndex === pageSteps.length - 1;

  // ── Compute fixed-position coordinates ──
  const vw = typeof window !== "undefined" ? window.innerWidth : 375;
  const vh = typeof window !== "undefined" ? window.innerHeight : 667;

  let boxTop = 0, boxLeft = 0;
  let arrowTop = 0, arrowLeft = 0;
  let showArrow = false;
  const BOX_H_ESTIMATE = 180; // approximate tooltip height

  if (targetRect) {
    showArrow = true;
    const cx = targetRect.left + targetRect.width / 2; // horizontal center of target
    const safeLeft = Math.min(Math.max(cx - BOX_W / 2, 8), vw - BOX_W - 8);

    if (step.arrowDir === "up") {
      // Tooltip goes BELOW the target
      boxTop = targetRect.top + targetRect.height + GAP + 24; // 24 = arrow height
      boxLeft = safeLeft;
      arrowTop = targetRect.top + targetRect.height + GAP;
      arrowLeft = cx - 12;
    } else {
      // arrowDir === "down": Tooltip goes ABOVE the target
      boxTop = targetRect.top - BOX_H_ESTIMATE - GAP - 24;
      boxLeft = safeLeft;
      arrowTop = targetRect.top - GAP - 24;
      arrowLeft = cx - 12;
      // Clamp to stay on screen
      if (boxTop < 8) boxTop = 8;
    }

    // If box would go off screen bottom, flip it above
    if (boxTop + BOX_H_ESTIMATE > vh - 8) {
      boxTop = targetRect.top - BOX_H_ESTIMATE - GAP - 24;
      if (boxTop < 8) boxTop = 60; // absolute fallback
    }
  } else {
    // Fallback: bottom-right corner
    boxTop = vh - BOX_H_ESTIMATE - 80;
    boxLeft = vw - BOX_W - 16;
  }

  return (
    // Fixed overlay — everything uses fixed positioning so scrollY is irrelevant
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, pointerEvents: "none" }}>

      {/* Highlight ring around target element */}
      {targetRect && (
        <div
          style={{
            position: "fixed",
            top: targetRect.top - 5,
            left: targetRect.left - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
            borderRadius: 10,
            boxShadow: `0 0 0 3px ${step.colorHex}, 0 0 0 6px ${step.colorHex}22`,
            pointerEvents: "none",
            zIndex: 9999,
            transition: "all 0.25s ease",
          }}
        />
      )}

      {/* Arrow bubble */}
      {showArrow && targetRect && (
        <div
          style={{
            position: "fixed",
            top: arrowTop,
            left: arrowLeft,
            zIndex: 10000,
            pointerEvents: "none",
            transition: "all 0.25s ease",
          }}
        >
          <div
            className={`${step.color} rounded-full flex items-center justify-center shadow-lg`}
            style={{ width: 26, height: 26 }}
          >
            {step.arrowDir === "up"
              ? <ArrowUp className="w-3.5 h-3.5 text-white" />
              : <ArrowDown className="w-3.5 h-3.5 text-white" />
            }
          </div>
        </div>
      )}

      {/* Tooltip card */}
      <div
        style={{
          position: "fixed",
          top: boxTop,
          left: boxLeft,
          width: BOX_W,
          zIndex: 10001,
          pointerEvents: "auto",
          transition: "top 0.25s ease, left 0.25s ease",
        }}
        className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-slate-100 overflow-hidden"
      >
        {/* Color top bar */}
        <div className={`h-1.5 w-full ${step.color}`} />

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {isEn ? "Getting Started" : "እንዴት መጀመር"} · {stepIndex + 1}/{pageSteps.length}
          </span>
          <button
            onClick={dismiss}
            className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 pt-2 pb-3">
          <h3 className="font-bold text-slate-800 text-sm mb-1">
            {isEn ? step.title : step.titleAm}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isEn ? step.description : step.descriptionAm}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 px-4 pb-2">
          {pageSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStepIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${i === stepIndex ? `${step.color} w-5` : i < stepIndex ? "bg-slate-300 w-1.5" : "bg-slate-200 w-1.5"
                }`}
            />
          ))}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50">
          <button
            onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
            disabled={stepIndex === 0}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 disabled:opacity-0 disabled:pointer-events-none transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {isEn ? "Back" : "ተመለስ"}
          </button>

          {isLast ? (
            <button
              onClick={dismiss}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white ${step.color} hover:opacity-90 transition-all shadow-sm`}
            >
              <Check className="w-3.5 h-3.5" />
              {isEn ? "Got it!" : "ገባኝ!"}
            </button>
          ) : (
            <button
              onClick={() => setStepIndex(stepIndex + 1)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white ${step.color} hover:opacity-90 transition-all shadow-sm`}
            >
              {isEn ? "Next" : "ቀጣይ"} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
