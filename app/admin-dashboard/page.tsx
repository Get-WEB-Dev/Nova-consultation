"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Users, Stethoscope, Calendar, Newspaper,
    ArrowRight, TrendingUp,
} from "lucide-react";

interface Stats {
    totalUsers: number;
    totalDoctors: number;
    totalConsultations: number;
    totalPosts: number;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/stats")
            .then(r => r.json())
            .then(json => setStats(json.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-shimmer h-8 w-48 rounded-xl" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="animate-shimmer h-28 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    const statCards = [
        { icon: Users, label: "Total Users", value: stats?.totalUsers ?? 0, color: "from-primary-600 to-primary-500", href: "/admin-dashboard/users" },
        { icon: Stethoscope, label: "Doctors", value: stats?.totalDoctors ?? 0, color: "from-accent-500 to-accent-400", href: "/admin-dashboard/doctors" },
        { icon: Calendar, label: "Consultations", value: stats?.totalConsultations ?? 0, color: "from-gold-400 to-gold-500", href: "#" },
        { icon: Newspaper, label: "Blog Posts", value: stats?.totalPosts ?? 0, color: "from-primary-500 to-accent-500", href: "#" },
    ];

    return (
        <div className="space-y-6 animate-fade-up">
            {/* Header */}
            <div>
                <h1 className="font-display font-bold text-2xl text-slate-800">Admin Dashboard</h1>
                <p className="text-slate-500 text-sm mt-1">System overview and management</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statCards.map(({ icon: Icon, label, value, color, href }) => (
                    <Link key={label} href={href} className="card text-center group hover:-translate-y-0.5 transition-all">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-2 shadow-sm`}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-display font-bold text-2xl text-slate-800">{value}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                    </Link>
                ))}
            </div>

            {/* Quick Links */}
            <section>
                <h2 className="font-display font-semibold text-slate-800 mb-3">Quick Actions</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                    <Link href="/admin-dashboard/users" className="card flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-700">Manage Users</p>
                            <p className="text-xs text-slate-400">View, edit roles, or remove users</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
                    </Link>
                    <Link href="/admin-dashboard/doctors" className="card flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-accent-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-700">Manage Doctors</p>
                            <p className="text-xs text-slate-400">Verify, publish, or manage doctors</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-accent-500 transition-colors" />
                    </Link>
                </div>
            </section>

            {/* System Info */}
            <section>
                <h2 className="font-display font-semibold text-slate-800 mb-3">System Info</h2>
                <div className="card">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Platform</p>
                            <p className="font-medium text-slate-700">Nova Health Consultancy</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Version</p>
                            <p className="font-medium text-slate-700">0.1.0 (Testing)</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Backend</p>
                            <p className="font-medium text-slate-700">Supabase</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wide">Environment</p>
                            <p className="font-medium text-slate-700">Development</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
