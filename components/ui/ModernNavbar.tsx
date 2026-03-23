"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Stethoscope } from "lucide-react";

// ── Palette ───────────────────────────────────────────────────────────────────
const NAV_BG = "#003580";
const NAV_DARK = "#00224f";
const ACCENT = "#0071c2";
const SKY = "#38bdf8";

const NAV_LINKS = [
  { label: "Consultation", href: "/doctors" },
  { label: "Doctors", href: "/doctors" },
  { label: "Health Plans", href: "/plans" },
  { label: "Blogs", href: "/blogs" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function MediBookNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-200"
      style={{
        background: NAV_BG,
        boxShadow: scrolled
          ? "0 2px 16px rgba(0,0,0,0.28)"
          : "0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Desktop bar ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity group-hover:opacity-80"
            style={{ background: SKY }}
          >
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-white text-[17px] tracking-tight">
            MediBook
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.label + n.href}
                href={n.href}
                className="relative text-[13px] font-semibold px-3 py-2 rounded-lg transition-all"
                style={{
                  color: active ? "white" : "rgba(255,255,255,0.72)",
                  background: active ? "rgba(255,255,255,0.12)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = "white";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    e.currentTarget.style.color = "rgba(255,255,255,0.72)";
                }}
              >
                {n.label}
                {/* active underline */}
                {active && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                    style={{ background: SKY }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop auth */}
        <div className="hidden lg:flex items-center gap-2">
          <Link
            href="/login"
            className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-all hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-[13px] font-extrabold px-4 py-2 rounded-lg transition-all hover:opacity-88 active:scale-95"
            style={{ background: SKY, color: NAV_DARK }}
          >
            Sign Up Free
          </Link>
          <div
            className="w-px h-5 mx-1"
            style={{ background: "rgba(255,255,255,0.15)" }}
          />
          <Link
            href="/doctor-login"
            className="text-[12px] font-semibold px-3 py-2 rounded-lg border transition-all hover:bg-white/10"
            style={{
              borderColor: "rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.58)",
            }}
          >
            Doctor Login
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all"
          style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* ── Mobile dropdown ──────────────────────────────────────────────── */}
      <div
        className="lg:hidden overflow-hidden transition-all duration-300"
        style={{
          maxHeight: mobileMenuOpen ? 480 : 0,
          borderTop: mobileMenuOpen
            ? "1px solid rgba(255,255,255,0.08)"
            : "none",
          background: NAV_DARK,
        }}
      >
        <div className="px-4 pt-3 pb-5 space-y-0.5">
          {NAV_LINKS.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.label + n.href}
                href={n.href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-all"
                style={{
                  color: active ? "white" : "rgba(255,255,255,0.72)",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                }}
              >
                {active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: SKY }}
                  />
                )}
                {n.label}
              </Link>
            );
          })}

          {/* Auth buttons */}
          <div
            className="grid grid-cols-2 gap-2 pt-4 mt-2 border-t"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <Link
              href="/login"
              className="flex items-center justify-center py-2.5 rounded-xl text-[13px] font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.1)", color: "white" }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex items-center justify-center py-2.5 rounded-xl text-[13px] font-extrabold transition-all active:scale-95"
              style={{ background: SKY, color: NAV_DARK }}
            >
              Sign Up Free
            </Link>
            <Link
              href="/doctor-login"
              className="col-span-2 flex items-center justify-center py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Doctor Login
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
