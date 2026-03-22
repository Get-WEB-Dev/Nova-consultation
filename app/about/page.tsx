import ModernNavbar from "@/components/ui/ModernNavbar";
import ModernFooter from "@/components/ui/ModernFooter";
import Image from "next/image";
import { ShieldCheck, HeartPulse, Globe2 } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-800">
            <ModernNavbar />

            <main className="flex-1 pt-32 pb-24 max-w-[90rem] mx-auto px-6 md:px-12 w-full">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-600 font-bold text-sm mb-6 border border-primary-100">
                        Our Mission
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-800 tracking-tight mb-6">
                        Transforming Healthcare, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-teal-500">Together.</span>
                    </h1>
                    <p className="text-xl text-slate-500 font-medium leading-relaxed">
                        We are dedicated to breaking down geographical barriers, ensuring every patient has access to world-class medical specialists from the comfort of their home.
                    </p>
                </div>

                <div className="relative w-full h-[500px] rounded-[3rem] overflow-hidden shadow-2xl mb-24">
                    <Image src="https://images.unsplash.com/photo-1551076805-e18690c5e531?auto=format&fit=crop&q=80&w=2000" alt="Nova Medical Team" fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    <div className="absolute bottom-10 left-10 right-10 flex items-center justify-between text-white">
                        <div>
                            <p className="text-4xl font-black">500+</p>
                            <p className="font-medium text-slate-200 mt-1">Global Specialists</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black">1M+</p>
                            <p className="font-medium text-slate-200 mt-1">Lives Touched</p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center hover:shadow-xl transition-shadow">
                        <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-6">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Verified Excellence</h3>
                        <p className="text-slate-500 font-medium">Every doctor on our platform is rigorously vetted to ensure the highest standards of care.</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center hover:shadow-xl transition-shadow">
                        <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-6">
                            <Globe2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Global Access</h3>
                        <p className="text-slate-500 font-medium">Distance is no longer a barrier. Connect with top-tier specialists from around the world.</p>
                    </div>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center hover:shadow-xl transition-shadow">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-6">
                            <HeartPulse className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Patient First</h3>
                        <p className="text-slate-500 font-medium">Your health and well-being are at the core of everything we build and deliver.</p>
                    </div>
                </div>
            </main>

            <ModernFooter />
        </div>
    );
}
