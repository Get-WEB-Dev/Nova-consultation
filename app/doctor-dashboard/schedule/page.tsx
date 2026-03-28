"use client";
import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Clock,
  Plus,
  X,
  Save,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bell,
  Zap,
  AlertCircle,
  Edit3,
  Trash2,
  Moon,
  Sun,
  Coffee,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { getUser } from "@/lib/supabase/auth";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i;
  const ampm = h < 12 ? "AM" : "PM";
  const display =
    h === 0
      ? "12:00 AM"
      : h < 12
        ? `${h}:00 AM`
        : h === 12
          ? "12:00 PM"
          : `${h - 12}:00 PM`;
  return { value: `${String(h).padStart(2, "0")}:00`, label: display };
});

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

type WeekSchedule = Record<string, DaySchedule>;

const DEFAULT_SCHEDULE: WeekSchedule = {
  Monday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  Tuesday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  Wednesday: { enabled: true, slots: [{ start: "09:00", end: "13:00" }] },
  Thursday: { enabled: true, slots: [{ start: "09:00", end: "17:00" }] },
  Friday: { enabled: true, slots: [{ start: "09:00", end: "15:00" }] },
  Saturday: { enabled: false, slots: [] },
  Sunday: { enabled: false, slots: [] },
};

function SlotRow({
  slot,
  onUpdate,
  onDelete,
}: {
  slot: TimeSlot;
  onUpdate: (slot: TimeSlot) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={slot.start}
        onChange={(e) => onUpdate({ ...slot, start: e.target.value })}
        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-pointer"
      >
        {HOURS.map((h) => (
          <option key={h.value} value={h.value}>
            {h.label}
          </option>
        ))}
      </select>
      <span className="text-slate-400 text-[12px] font-semibold flex-shrink-0">
        to
      </span>
      <select
        value={slot.end}
        onChange={(e) => onUpdate({ ...slot, end: e.target.value })}
        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 bg-white outline-none focus:border-blue-400 cursor-pointer"
      >
        {HOURS.map((h) => (
          <option key={h.value} value={h.value}>
            {h.label}
          </option>
        ))}
      </select>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DayCard({
  day,
  schedule,
  onUpdate,
}: {
  day: string;
  schedule: DaySchedule;
  onUpdate: (s: DaySchedule) => void;
}) {
  const totalHours = schedule.slots.reduce((sum, s) => {
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    return sum + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
  }, 0);

  const addSlot = () => {
    const lastEnd = schedule.slots[schedule.slots.length - 1]?.end || "09:00";
    const [h] = lastEnd.split(":").map(Number);
    const newStart = `${String(Math.min(h + 1, 22)).padStart(2, "0")}:00`;
    const newEnd = `${String(Math.min(h + 3, 23)).padStart(2, "0")}:00`;
    onUpdate({
      ...schedule,
      slots: [...schedule.slots, { start: newStart, end: newEnd }],
    });
  };

  const updateSlot = (i: number, slot: TimeSlot) =>
    onUpdate({
      ...schedule,
      slots: schedule.slots.map((s, idx) => (idx === i ? slot : s)),
    });

  const deleteSlot = (i: number) =>
    onUpdate({
      ...schedule,
      slots: schedule.slots.filter((_, idx) => idx !== i),
    });

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${schedule.enabled ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100"}`}
      style={{
        boxShadow: schedule.enabled ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() =>
              onUpdate({ ...schedule, enabled: !schedule.enabled })
            }
            className={`w-10 h-5.5 rounded-full flex items-center transition-all duration-300 ${schedule.enabled ? "bg-blue-500" : "bg-slate-200"}`}
            style={{ width: 40, height: 22 }}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white shadow-sm ml-0.5 transition-transform duration-300 ${schedule.enabled ? "translate-x-[18px]" : "translate-x-0"}`}
            />
          </button>
          <p
            className={`font-extrabold text-[14px] ${schedule.enabled ? "text-slate-900" : "text-slate-400"}`}
          >
            {day}
          </p>
        </div>
        {schedule.enabled && (
          <div className="flex items-center gap-2">
            {totalHours > 0 && (
              <span className="text-[11px] font-semibold text-slate-400">
                {totalHours.toFixed(1)}h
              </span>
            )}
            <button
              onClick={addSlot}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border border-blue-200 transition-colors"
              style={{ color: ACCENT, background: "#eff6ff" }}
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        )}
      </div>

      {schedule.enabled ? (
        schedule.slots.length === 0 ? (
          <button
            onClick={addSlot}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-[12px] font-semibold text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add time slot
          </button>
        ) : (
          <div className="space-y-2">
            {schedule.slots.map((slot, i) => (
              <SlotRow
                key={i}
                slot={slot}
                onUpdate={(s) => updateSlot(i, s)}
                onDelete={() => deleteSlot(i)}
              />
            ))}
          </div>
        )
      ) : (
        <p className="text-[12px] text-slate-400 text-center py-2">
          Not available
        </p>
      )}
    </div>
  );
}

function WeekCalendarPreview({ schedule }: { schedule: WeekSchedule }) {
  const now = new Date();
  const currentDay = DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 p-4"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <h3 className="font-extrabold text-[14px] text-slate-900 mb-3">
        Weekly Overview
      </h3>
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day, i) => {
          const sched = schedule[day];
          const isToday = day === currentDay;
          const totalHours = sched.enabled
            ? sched.slots.reduce((sum, s) => {
                const [sh] = s.start.split(":").map(Number);
                const [eh] = s.end.split(":").map(Number);
                return sum + Math.max(0, eh - sh);
              }, 0)
            : 0;

          return (
            <div
              key={day}
              className={`rounded-xl p-2 text-center transition-all ${isToday ? "ring-2" : ""}`}
              style={{
                background: sched.enabled ? "#eff6ff" : "#f8fafc",
                borderColor: isToday ? ACCENT : "transparent",
              }}
            >
              <p className="text-[10px] font-bold text-slate-400 mb-1">
                {SHORT[i]}
              </p>
              {sched.enabled ? (
                <>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center mx-auto mb-1"
                    style={{ background: ACCENT }}
                  >
                    <Activity className="w-2.5 h-2.5 text-white" />
                  </div>
                  <p className="text-[9px] font-bold" style={{ color: ACCENT }}>
                    {totalHours}h
                  </p>
                </>
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-1">
                  <Moon className="w-2.5 h-2.5 text-slate-400" />
                </div>
              )}
              {isToday && (
                <div
                  className="w-1 h-1 rounded-full mx-auto mt-0.5"
                  style={{ background: ACCENT }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [breakDuration, setBreakDuration] = useState(15);
  const [maxPerDay, setMaxPerDay] = useState(10);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    inApp: true,
    reminderBefore: 30,
  });

  useEffect(() => {
    const load = async () => {
      const u = getUser();
      if (!u) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/doctor/schedule?doctorId=${u.id}`);
        if (res.ok) {
          const j = await res.json();
          if (j.data?.schedule) setSchedule(j.data.schedule);
          if (j.data?.maxPerDay) setMaxPerDay(j.data.maxPerDay);
          if (j.data?.breakDuration) setBreakDuration(j.data.breakDuration);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    const u = getUser();
    if (!u || saving) return;
    setSaving(true);
    try {
      await fetch("/api/doctor/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: u.id,
          schedule,
          maxPerDay,
          breakDuration,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const updateDay = (day: string, sched: DaySchedule) =>
    setSchedule((prev) => ({ ...prev, [day]: sched }));

  const activeDays = Object.values(schedule).filter((s) => s.enabled).length;
  const totalWeeklyHours = Object.values(schedule).reduce((total, sched) => {
    if (!sched.enabled) return total;
    return (
      total +
      sched.slots.reduce((sum, s) => {
        const [sh, sm] = s.start.split(":").map(Number);
        const [eh, em] = s.end.split(":").map(Number);
        return sum + Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
      }, 0)
    );
  }, 0);

  if (loading)
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 bg-white rounded-2xl" />
        <div className="h-48 bg-white rounded-2xl" />
        <div className="h-96 bg-white rounded-2xl" />
      </div>
    );

  return (
    <div className="space-y-5 max-w-2xl pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-extrabold text-slate-900 text-[20px]">
            Availability Schedule
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {activeDays} active days · {totalWeeklyHours.toFixed(1)} hrs/week
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-[13px] text-white transition-all active:scale-95 disabled:opacity-70"
          style={{ background: saved ? "#16a34a" : NAV_BG }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Schedule"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Active Days",
            value: activeDays,
            icon: CalendarDays,
            color: ACCENT,
          },
          {
            label: "Weekly Hours",
            value: `${totalWeeklyHours.toFixed(0)}h`,
            icon: Clock,
            color: "#7c3aed",
          },
          {
            label: "Max/Day",
            value: maxPerDay,
            icon: Activity,
            color: "#16a34a",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl p-3.5 border border-slate-200 text-center"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
            <p className="font-extrabold text-[18px] text-slate-900">{value}</p>
            <p className="text-[10px] text-slate-400 font-semibold">{label}</p>
          </div>
        ))}
      </div>

      {/* Weekly preview */}
      <WeekCalendarPreview schedule={schedule} />

      {/* Session settings */}
      <div
        className="bg-white rounded-2xl border border-slate-200 p-5"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <h3 className="font-extrabold text-[14px] text-slate-900 mb-4">
          Session Settings
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1.5">
              Max patients per day
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMaxPerDay((p) => Math.max(1, p - 1))}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                −
              </button>
              <span className="flex-1 text-center font-extrabold text-[17px] text-slate-900">
                {maxPerDay}
              </span>
              <button
                onClick={() => setMaxPerDay((p) => p + 1)}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1.5">
              Break between patients (min)
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBreakDuration((p) => Math.max(0, p - 5))}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                −
              </button>
              <span className="flex-1 text-center font-extrabold text-[17px] text-slate-900">
                {breakDuration}
              </span>
              <button
                onClick={() => setBreakDuration((p) => p + 5)}
                className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 font-bold text-lg flex items-center justify-center hover:bg-slate-50 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Day schedule editor */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-[14px] text-slate-900">
          Daily Availability
        </h3>
        {DAYS.map((day) => (
          <DayCard
            key={day}
            day={day}
            schedule={schedule[day]}
            onUpdate={(s) => updateDay(day, s)}
          />
        ))}
      </div>

      {/* Notifications */}
      <div
        className="bg-white rounded-2xl border border-slate-200 p-5"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <h3 className="font-extrabold text-[14px] text-slate-900 mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: ACCENT }} />
          Notification Preferences
        </h3>
        <div className="space-y-3">
          {[
            { key: "email", label: "Email notifications" },
            { key: "sms", label: "SMS notifications" },
            { key: "inApp", label: "In-app notifications" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[13px] text-slate-700">{label}</span>
              <button
                onClick={() =>
                  setNotifications((n) => ({
                    ...n,
                    [key]: !n[key as keyof typeof n],
                  }))
                }
                className={`w-10 h-5.5 rounded-full flex items-center transition-all duration-300 ${notifications[key as keyof typeof notifications] ? "bg-blue-500" : "bg-slate-200"}`}
                style={{ width: 40, height: 22 }}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white shadow-sm ml-0.5 transition-transform duration-300 ${notifications[key as keyof typeof notifications] ? "translate-x-[18px]" : "translate-x-0"}`}
                />
              </button>
            </div>
          ))}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1.5">
              Reminder before appointment (min)
            </label>
            <div className="flex gap-2">
              {[15, 30, 60, 120].map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    setNotifications((n) => ({ ...n, reminderBefore: m }))
                  }
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                  style={
                    notifications.reminderBefore === m
                      ? {
                          background: ACCENT,
                          color: "white",
                          borderColor: ACCENT,
                        }
                      : { borderColor: "#e2e8f0", color: "#64748b" }
                  }
                >
                  {m < 60 ? `${m}m` : `${m / 60}h`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save bottom */}
      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl font-extrabold text-[14px] text-white transition-all active:scale-[0.99]"
          style={{ background: saved ? "#16a34a" : NAV_BG }}
        >
          {saving
            ? "Saving…"
            : saved
              ? "✓ Schedule Saved!"
              : "Save Availability"}
        </button>
      </div>
    </div>
  );
}
