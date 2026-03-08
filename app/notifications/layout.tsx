import Navbar from "@/components/layout/Navbar";

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">{children}</main>
        </div>
    );
}
