"use client";
import Link from "next/link";
import Image from "next/image";
import { HeartPulse, MapPin, Phone, Mail, ArrowRight } from "lucide-react";

export default function ModernFooter() {
    return (
        <footer id="contact" className="bg-slate-950 pt-24 pb-12 text-slate-400 relative overflow-hidden mt-auto">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-900/20 rounded-full blur-[100px] -z-10" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-900/20 rounded-full blur-[100px] -z-10" />

            <div className="max-w-[90rem] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-20 relative z-10">
                <div className="col-span-1 md:col-span-1">
                    <Link href="/" className="flex items-center gap-2 mb-8">
                        <div className="w-10 h-10 relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-teal-400 p-2 shadow-lg">
                            <Image src="/favicon.png" alt="Nova Logo" fill className="object-cover relative z-10" />
                        </div>
                        <span className="text-3xl font-bold text-white tracking-tight">Nova</span>
                    </Link>
                    <p className="mb-8 leading-relaxed font-medium">
                        Pioneering the future of telemedicine. Bringing expert healthcare closer to you, safely and securely.
                    </p>
                    <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-primary-600 hover:border-primary-500 hover:text-white transition-all cursor-pointer shadow-sm"><span className="font-bold text-sm">in</span></div>
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-primary-600 hover:border-primary-500 hover:text-white transition-all cursor-pointer shadow-sm"><span className="font-bold text-sm">tw</span></div>
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-primary-600 hover:border-primary-500 hover:text-white transition-all cursor-pointer shadow-sm"><span className="font-bold text-sm">fb</span></div>
                    </div>
                </div>

                <div>
                    <h4 className="text-white font-bold text-lg mb-8">Quick Links</h4>
                    <ul className="space-y-4 font-medium">
                        <li><Link href="/" className="hover:text-primary-400 transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Home</Link></li>
                        <li><Link href="/doctors" className="hover:text-primary-400 transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Find a Doctor</Link></li>
                        <li><Link href="/blogs" className="hover:text-primary-400 transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> Health Blog</Link></li>
                        <li><Link href="/about" className="hover:text-primary-400 transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3" /> About Us</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-white font-bold text-lg mb-8">Legal</h4>
                    <ul className="space-y-4 font-medium">
                        <li><Link href="#" className="hover:text-primary-400 transition-colors">Privacy Policy</Link></li>
                        <li><Link href="#" className="hover:text-primary-400 transition-colors">Terms of Service</Link></li>
                        <li><Link href="#" className="hover:text-primary-400 transition-colors">Cookie Policy</Link></li>
                        <li><Link href="#" className="hover:text-primary-400 transition-colors">Medical Disclaimer</Link></li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-white font-bold text-lg mb-8">Contact Us</h4>
                    <ul className="space-y-5 font-medium">
                        <li className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0"><MapPin className="w-4 h-4 text-primary-500" /></div>
                            <span className="mt-1 leading-relaxed">123 Nova Health Blvd<br />Silicon Valley, CA 94000</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0"><Phone className="w-4 h-4 text-primary-500" /></div>
                            <span className="mt-1">+1 (800) 123-4567</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0"><Mail className="w-4 h-4 text-primary-500" /></div>
                            <span className="mt-1">support@nova.health</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="max-w-[90rem] mx-auto px-6 md:px-12 border-t border-slate-800/50 pt-8 flex flex-col md:flex-row items-center justify-between font-medium">
                <p>&copy; {new Date().getFullYear()} Nova Healthcare. All rights reserved.</p>
                <p className="mt-4 md:mt-0 flex items-center gap-1.5 opacity-80">Crafted with <HeartPulse className="w-4 h-4 text-rose-500 fill-rose-500/20" /> for global health</p>
            </div>
        </footer>
    );
}
