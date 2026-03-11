"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/supabase/auth";
import { Clock, Save, Loader2, CheckCircle2, AlertCircle, Calendar, Info } from "lucide-react";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const ABBR: Record<string, string> = { Monday:"Mon",Tuesday:"Tue",Wednesday:"Wed",Thursday:"Thu",Friday:"Fri",Saturday:"Sat",Sunday:"Sun" };
const HOURS = Array.from({ length: 24 }, (_, i) => ({
    value: `${i.toString().padStart(2,"0")}:00`,
    label: i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i-12}:00 PM`,
}));

interface DaySchedule { enabled: boolean; start: string; end: string; }

const DEFAULT: Record<string, DaySchedule> = {
    Monday: { enabled:true,start:"09:00",end:"17:00" },
    Tuesday: { enabled:true,start:"09:00",end:"17:00" },
    Wednesday: { enabled:true,start:"09:00",end:"17:00" },
    Thursday: { enabled:true,start:"09:00",end:"17:00" },
    Friday: { enabled:true,start:"09:00",end:"17:00" },
    Saturday: { enabled:false,start:"10:00",end:"14:00" },
    Sunday: { enabled:false,start:"10:00",end:"14:00" },
};

export default function SchedulePage() {
    const [schedule, setSchedule] = useState(DEFAULT);
    const [duration, setDuration] = useState(15);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    useEffect(() => {
        const u = getUser();
        if (!u) return;
        fetch(`/api/doctor/profile?doctorId=${u.id}`).then(r => r.json()).then(j => {
            if (j.data?.consultation_duration_mins) setDuration(j.data.consultation_duration_mins);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const save = async () => {
        const u = getUser();
        if (!u) return;
        setSaving(true); setMsg(null);
        try {
            await fetch("/api/doctor/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doctorId: u.id, consultation_duration_mins: duration }) });
            setMsg({ ok: true, text: "Schedule saved!" });
        } catch { setMsg({ ok: false, text: "Failed to save." }); }
        finally { setSaving(false); setTimeout(() => setMsg(null), 3000); }
    };

    const enabledDays = Object.values(schedule).filter(d => d.enabled).length;
    const totalHours = Object.entries(schedule).filter(([,d]) => d.enabled).reduce((sum,[,d]) => sum + Math.max(0, parseInt(d.end) - parseInt(d.start)), 0);

    if (loading) return <div className="space-y-4 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-200 rounded-2xl" />)}</div>;

    return (
        <div className="space-y-5 animate-fade-up max-w-2xl">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-display font-bold text-xl text-slate-800">My Schedule</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Set your weekly availability</p>
                </div>
                <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 text-sm flex-shrink-0">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
            </div>

            {msg && (
                <div className={`flex items-center gap-2 p-3.5 rounded-2xl text-sm font-medium ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {msg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    {msg.text}
                </div>
            )}

            {/* Summary chips */}
            <div className="flex flex-wrap gap-2">
                {[
                    { label: `${enabledDays} days/week`, icon: Calendar, color: "text-primary-600 bg-primary-50" },
                    { label: `${duration}min sessions`, icon: Clock, color: "text-amber-600 bg-amber-50" },
                    { label: `${totalHours}h/week`, icon: Clock, color: "text-emerald-600 bg-emerald-50" },
                ].map(({ label, icon: Icon, color }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${color}`}>
                        <Icon className="w-3.5 h-3.5" />{label}
                    </div>
                ))}
            </div>

            {/* Session duration */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-primary-500" />Session Duration</h2>
                <div className="flex flex-wrap gap-2">
                    {[10,15,20,30,45,60].map(m => (
                        <button key={m} onClick={() => setDuration(m)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${duration === m ? "bg-primary-600 text-white shadow-sm shadow-primary-600/25" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                            {m} min
                        </button>
                    ))}
                </div>
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1"><Info className="w-3 h-3" />Patients see this when booking consultations.</p>
            </div>

            {/* Week schedule */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-500" />
                    <h2 className="text-sm font-semibold text-slate-700">Weekly Availability</h2>
                </div>
                <div className="divide-y divide-slate-50">
                    {DAYS.map(day => {
                        const d = schedule[day];
                        return (
                            <div key={day} className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${d.enabled ? "" : "opacity-60"}`}>
                                <button onClick={() => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))}
                                    className={`relative w-10 h-5.5 rounded-full transition-all flex-shrink-0 focus:outline-none ${d.enabled ? "bg-primary-600" : "bg-slate-300"}`}
                                    style={{ height: "22px", minWidth: "40px" }}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${d.enabled ? "left-5" : "left-0.5"}`} />
                                </button>
                                <div className="w-24 flex-shrink-0">
                                    <p className={`text-sm font-semibold ${d.enabled ? "text-slate-800" : "text-slate-400"}`}>{day}</p>
                                </div>
                                {d.enabled ? (
                                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-[110px]">
                                            <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                            <select value={d.start} onChange={e => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], start: e.target.value } }))}
                                                className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer">
                                                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                                            </select>
                                        </div>
                                        <span className="text-slate-400 text-xs">→</span>
                                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 min-w-[110px]">
                                            <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                            <select value={d.end} onChange={e => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], end: e.target.value } }))}
                                                className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer">
                                                {HOURS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                                            </select>
                                        </div>
                                        <span className="text-xs text-slate-400 hidden sm:block">{Math.max(0, parseInt(d.end) - parseInt(d.start))}h</span>
                                    </div>
                                ) : <p className="text-xs text-slate-400 italic flex-1">Day off</p>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Visual week bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary-500" />Week Overview</h2>
                <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map(day => {
                        const d = schedule[day];
                        const h = d.enabled ? Math.max(0, parseInt(d.end) - parseInt(d.start)) : 0;
                        return (
                            <div key={day} className="text-center">
                                <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase">{ABBR[day]}</p>
                                <div className={`h-16 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all
                                    ${d.enabled ? "bg-primary-600 text-white shadow-sm" : "bg-slate-100 text-slate-400"}`}>
                                    {d.enabled ? <><span>{h}h</span><span className="text-[9px] opacity-70 mt-0.5">{d.start.split(":")[0]}-{d.end.split(":")[0]}</span></> : <span className="text-[9px]">Off</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
