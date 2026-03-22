"use client";
import ModernNavbar from "@/components/ui/ModernNavbar";
import ModernFooter from "@/components/ui/ModernFooter";
import { MapPin, Phone, Mail, Send } from "lucide-react";

export default function ContactPage() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
            <ModernNavbar />

            <main className="flex-1 pt-32 pb-24 max-w-[90rem] mx-auto px-6 md:px-12 w-full">
                <div className="grid lg:grid-cols-2 gap-16 items-start">
                    <div>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-600 font-bold text-sm mb-6 border border-primary-100">
                            Contact Support
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tight mb-6">
                            Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-teal-500">Touch</span>
                        </h1>
                        <p className="text-lg text-slate-500 font-medium mb-12 max-w-lg">
                            We're here to help. Reach out to us for any inquiries about our services, support, or partnerships.
                        </p>

                        <div className="space-y-6">
                            <div className="flex items-center gap-5 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-default">
                                <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-500 shadow-sm"><MapPin className="w-7 h-7" /></div>
                                <div><p className="font-bold text-slate-800 text-lg">Address</p><p className="text-slate-500 font-medium">123 Nova Health Blvd, Silicon Valley, CA</p></div>
                            </div>
                            <div className="flex items-center gap-5 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-default">
                                <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-sm"><Phone className="w-7 h-7" /></div>
                                <div><p className="font-bold text-slate-800 text-lg">Phone</p><p className="text-slate-500 font-medium">+1 (800) 123-4567</p></div>
                            </div>
                            <div className="flex items-center gap-5 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-default">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm"><Mail className="w-7 h-7" /></div>
                                <div><p className="font-bold text-slate-800 text-lg">Email</p><p className="text-slate-500 font-medium">support@nova.health</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 lg:mt-6">
                        <h3 className="text-2xl font-bold text-slate-800 mb-8">Send a Message</h3>
                        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                                <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all font-medium placeholder-slate-400" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                                <input type="email" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all font-medium placeholder-slate-400" placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Your Message</label>
                                <textarea rows={5} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all font-medium placeholder-slate-400 resize-none" placeholder="How can we help you today?" />
                            </div>
                            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20 text-lg mt-2">
                                <Send className="w-5 h-5" /> Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            <ModernFooter />
        </div>
    );
}
