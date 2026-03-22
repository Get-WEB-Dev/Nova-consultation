"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export default function ModernNavbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <>
            <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-white/50 backdrop-blur-sm shadow-sm py-4"}`}>
                <div className="max-w-[90rem] mx-auto px-6 md:px-12 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative w-10 h-10 overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-teal-400 p-2 shadow-lg shadow-primary-500/20 group-hover:scale-105 transition-transform">
                            <Image src="/favicon.png" alt="Nova Logo" fill className="object-cover" />
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-teal-600 tracking-tight">Nova</span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex items-center gap-8">
                        <Link href="/doctors" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">Doctors</Link>
                        <Link href="/blogs" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">Blogs</Link>
                        <Link href="/about" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">About</Link>
                        <Link href="/contact" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">Contact Us</Link>
                    </nav>

                    <div className="hidden lg:flex items-center gap-4">
                        {/* Patient Auth */}
                        <div className="flex items-center gap-3 border-r border-slate-200 pr-5">
                            <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-primary-600 transition-colors">Sign In</Link>
                            <Link href="/signup" className="text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 px-5 py-2 rounded-full shadow-md shadow-primary-600/20 transition-all hover:-translate-y-0.5">Sign Up</Link>
                        </div>
                        {/* Doctor Auth */}
                        <div className="flex items-center gap-3 pl-1">
                            <Link href="/doctor-login" className="text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors">Doctor Sign In</Link>
                            <Link href="/doctor/signup" className="text-sm font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-5 py-2 rounded-full shadow-sm transition-all hover:-translate-y-0.5">Doctor Sign Up</Link>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="lg:hidden text-slate-600 p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <div className="lg:hidden absolute top-full left-0 w-full bg-white shadow-xl border-t border-slate-100 flex flex-col p-6 gap-4 animate-fade-in-up origin-top">
                        <Link href="/doctors" onClick={() => setMobileMenuOpen(false)} className="font-bold text-slate-700 py-2 border-b border-slate-50">Doctors</Link>
                        <Link href="/blogs" onClick={() => setMobileMenuOpen(false)} className="font-bold text-slate-700 py-2 border-b border-slate-50">Blogs</Link>
                        <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="font-bold text-slate-700 py-2 border-b border-slate-50">About</Link>
                        <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="font-bold text-slate-700 py-2 border-b border-slate-50">Contact Us</Link>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="font-bold text-center text-primary-600 py-3 bg-primary-50 rounded-xl">Sign In</Link>
                            <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="font-bold text-center text-white bg-primary-600 py-3 rounded-xl shadow-md">Sign Up</Link>
                            <Link href="/doctor-login" onClick={() => setMobileMenuOpen(false)} className="font-bold text-center text-teal-700 py-3 bg-teal-50 rounded-xl col-span-1">Dr. Sign In</Link>
                            <Link href="/doctor/signup" onClick={() => setMobileMenuOpen(false)} className="font-bold text-center text-teal-800 py-3 border border-teal-200 rounded-xl col-span-1">Dr. Sign Up</Link>
                        </div>
                    </div>
                )}
            </header>
        </>
    );
}
