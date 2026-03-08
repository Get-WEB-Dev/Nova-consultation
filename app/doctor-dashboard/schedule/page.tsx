"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/supabase/auth";
import { Clock, Save, Loader2, CheckCircle2, AlertCircle, Calendar, Toggle, Info } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR: Record<string, string> = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
    Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};
const HOURS = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, "0");
    const period = i < 12 ? "AM" : "PM";
    const display = i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`;
    return { value: `${h}:00`, label: display };
});

interface DaySchedule {
    enabled: boolean;
    start: string;
    end: string;
}

type WeekSchedule = Record<string, DaySchedule>;

const defaultSchedule: WeekSchedule = {
    Monday: { enabled: true, start: "09:00", end: "17:00" },
    Tuesday: { enabled: true, start: "09:00", end: "17:00" },
    Wednesday: { enabled: true, start: "09:00", end: "17:00" },
    Thursday: { enabled: true, start: "09:00", end: "17:00" },
    Friday: { enabled: true, start: "09:00", end: "17:00" },
    Saturday: { enabled: false, start: "10:00", end: "14:00" },
    Sunday: { enabled: false, start: "10:00", end: "14:00" },
};

export default function DoctorSchedulePage() {
    const [schedule, setSchedule] = useState<WeekSchedule>(defaultSchedule);
    const [slotDuration, setSlotDuration] = useState(15);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const u = getUser();
        if (!u) return;

        // Try to load existing availability
        fetch(`/api/doctor/profile?doctorId=${u.id}`)
            .then(r => r.json())
            .then(json => {
                if (json.data?.consultation_duration_mins) {
                    setSlotDuration(json.data.consultation_duration_mins);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const toggleDay = (day: string) => {
        setSchedule(prev => ({
            ...prev,
            [day]: { ...prev[day], enabled: !prev[day].enabled },
        }));
    };

    const updateTime = (day: string, field: "start" | "end", value: string) => {
        setSchedule(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value },
        }));
    };

    const handleSave = async () => {
        const u = getUser();
        if (!u) return;
        setSaving(true);
        setMessage(null);

        try {
            // Update slot duration via profile endpoint
            await fetch("/api/doctor/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doctorId: u.id,
                    consultation_duration_mins: slotDuration,
                }),
            });

            setMessage({ type: "success", text: "Schedule saved successfully!" });
        } catch (err) {
            setMessage({ type: "error", text: "Failed to save schedule. Please try again." });
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const enabledDays = Object.values(schedule).filter(d => d.enabled).length;

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-slate-200 rounded-xl w-48 animate-pulse" />
                <div className="h-96 bg-slate-200 rounded-2xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-up max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-display font-bold text-2xl text-slate-800">My Schedule</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure your weekly availability for patient consultations</p>
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="btn-primary flex items-center gap-2 flex-shrink-0">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            {/* Status message */}
            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium
                    ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                    {message.type === "success"
                        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                    {message.text}
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-slate-800">{enabledDays}</p>
                        <p className="text-xs text-slate-500">Days per week</p>
                    </div>
                </div>
                <div className="card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-accent-500" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-slate-800">{slotDuration}m</p>
                        <p className="text-xs text-slate-500">Per session</p>
                    </div>
                </div>
                <div className="card flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gold-50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-gold-500" />
                    </div>
                    <div>
                        <p className="font-display font-bold text-xl text-slate-800">
                            {Object.entries(schedule).filter(([, d]) => d.enabled).reduce((total, [, d]) => {
                                const start = parseInt(d.start.split(":")[0]);
                                const end = parseInt(d.end.split(":")[0]);
                                return total + Math.max(0, end - start);
                            }, 0)}h
                        </p>
                        <p className="text-xs text-slate-500">Total hours/wk</p>
                    </div>
                </div>
            </div>

            {/* Session duration setting */}
            <div className="card">
                <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-500" />
                    Session Configuration
                </h2>
                <div className="flex items-center gap-4">
                    <div className="flex-1 max-w-xs">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                            Consultation Duration
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {[10, 15, 20, 30, 45, 60].map(mins => (
                                <button key={mins} onClick={() => setSlotDuration(mins)}
                                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all
                                        ${slotDuration === mins
                                            ? "bg-primary-600 text-white shadow-md shadow-primary-600/25"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                    {mins} min
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 max-w-xs">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p>Patients will see this as your session length when booking consultations.</p>
                    </div>
                </div>
            </div>

            {/* Weekly schedule */}
            <div className="card">
                <h2 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-500" />
                    Weekly Availability
                </h2>

                <div className="space-y-3">
                    {DAYS.map(day => {
                        const d = schedule[day];
                        return (
                            <div key={day} className={`flex items-center gap-4 p-4 rounded-xl border transition-all
                                ${d.enabled ? "border-primary-200 bg-primary-50/30" : "border-slate-100 bg-slate-50/50"}`}>
                                {/* Toggle */}
                                <button onClick={() => toggleDay(day)}
                                    className={`relative w-10 h-5.5 rounded-full transition-all flex-shrink-0 focus:outline-none
                                        ${d.enabled ? "bg-primary-600" : "bg-slate-300"}`}
                                    style={{ height: "22px", width: "40px" }}>
                                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all
                                        ${d.enabled ? "left-5" : "left-0.5"}`} />
                                </button>

                                {/* Day label */}
                                <div className="w-24 flex-shrink-0">
                                    <p className={`text-sm font-semibold ${d.enabled ? "text-slate-800" : "text-slate-400"}`}>{day}</p>
                                    <p className="text-[10px] text-slate-400">{DAY_ABBR[day]}</p>
                                </div>

                                {/* Time pickers */}
                                {d.enabled ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-[150px]">
                                            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <select
                                                value={d.start}
                                                onChange={e => updateTime(day, "start", e.target.value)}
                                                className="bg-transparent text-sm text-slate-700 outline-none flex-1 min-w-0 cursor-pointer"
                                            >
                                                {HOURS.map(h => (
                                                    <option key={h.value} value={h.value}>{h.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <span className="text-slate-400 text-sm font-medium flex-shrink-0">to</span>
                                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-[150px]">
                                            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <select
                                                value={d.end}
                                                onChange={e => updateTime(day, "end", e.target.value)}
                                                className="bg-transparent text-sm text-slate-700 outline-none flex-1 min-w-0 cursor-pointer"
                                            >
                                                {HOURS.map(h => (
                                                    <option key={h.value} value={h.value}>{h.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Hours display */}
                                        <span className="text-xs text-slate-500 hidden sm:block flex-shrink-0">
                                            {Math.max(0, parseInt(d.end) - parseInt(d.start))}h available
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex-1">
                                        <span className="text-xs text-slate-400 italic">Unavailable this day</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Visual preview */}
            <div className="card">
                <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-500" />
                    Weekly Preview
                </h2>
                <div className="grid grid-cols-7 gap-1.5">
                    {DAYS.map(day => {
                        const d = schedule[day];
                        const hours = d.enabled ? Math.max(0, parseInt(d.end) - parseInt(d.start)) : 0;
                        return (
                            <div key={day} className="text-center">
                                <p className="text-[10px] font-semibold text-slate-500 mb-2 uppercase">{DAY_ABBR[day]}</p>
                                <div className={`h-20 rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all
                                    ${d.enabled
                                        ? "bg-primary-600 text-white shadow-sm shadow-primary-600/25"
                                        : "bg-slate-100 text-slate-400"}`}>
                                    {d.enabled ? (
                                        <>
                                            <span className="font-bold">{hours}h</span>
                                            <span className="text-[10px] opacity-80 mt-0.5">{d.start.replace(":00","")}-{d.end.replace(":00","")}</span>
                                        </>
                                    ) : (
                                        <span className="text-[10px]">Off</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Save button (bottom) */}
            <div className="flex justify-end pb-4">
                <button onClick={handleSave} disabled={saving}
                    className="btn-primary flex items-center gap-2 px-8">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Schedule
                </button>
            </div>
        </div>
    );
}
