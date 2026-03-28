"use client";
import { useState, useEffect } from "react";
import {
  Lock, Bell, Shield, Eye, EyeOff, Loader2, CheckCircle2,
  AlertCircle, Mail, Smartphone, Globe, Users, LogOut,
  Trash2, ChevronRight, Key, Moon, Sun, Monitor,
} from "lucide-react";
import { getUser } from "@/lib/supabase/auth";

const NAV_BG = "#003580";
const ACCENT = "#0071c2";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h3 className="font-extrabold text-[14px] text-slate-800">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800">{label}</p>
        {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-10 h-5.5 rounded-full flex items-center transition-all duration-200 ${value ? "bg-blue-500" : "bg-slate-200"}`}
      style={{ width: 40, height: 22 }}>
      <span className={`w-4 h-4 rounded-full bg-white shadow-sm ml-0.5 transition-transform duration-200 ${value ? "translate-x-[18px]" : "translate-x-0"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Password change
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notifications
  const [notifs, setNotifs] = useState({
    newMessage: true,
    followUpReminder: true,
    queueUpdates: true,
    patientJoined: true,
    emailDigest: false,
    smsAlerts: false,
    pushNotifications: true,
    marketingEmails: false,
  });

  // Privacy
  const [privacy, setPrivacy] = useState({
    profileVisibility: "colleagues" as "public" | "colleagues" | "private",
    showOnlineStatus: true,
    showReviews: true,
    allowPatientSearch: true,
    dataCollection: true,
  });

  // Theme
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("Africa/Addis_Ababa");

  useEffect(() => {
    const u = getUser();
    if (u) setUser(u);
  }, []);

  const handlePasswordChange = async () => {
    if (!newPw || !oldPw || !confirmPw) { setPwMsg({ type: "error", text: "All fields are required" }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: "error", text: "Passwords do not match" }); return; }
    if (newPw.length < 8) { setPwMsg({ type: "error", text: "Password must be at least 8 characters" }); return; }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      if (res.ok) {
        setPwMsg({ type: "success", text: "Password changed successfully" });
        setOldPw(""); setNewPw(""); setConfirmPw("");
      } else {
        const j = await res.json();
        setPwMsg({ type: "error", text: j.error || "Failed to change password" });
      }
    } catch {
      setPwMsg({ type: "error", text: "Network error. Please try again." });
    }
    setPwSaving(false);
  };

  const setNotif = (key: keyof typeof notifs) => (val: boolean) =>
    setNotifs(prev => ({ ...prev, [key]: val }));

  const setPrivacySetting = (key: keyof typeof privacy) => (val: any) =>
    setPrivacy(prev => ({ ...prev, [key]: val }));

  return (
    <div className="space-y-5 max-w-2xl pb-10">
      {/* Header */}
      <div>
        <h1 className="font-extrabold text-slate-900 text-[20px]">Settings</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">Manage your account, security, and preferences</p>
      </div>

      {/* Account Info */}
      <Section title="Account">
        <SettingRow label="Email address" description={user?.email || "Loading…"}>
          <button className="text-[12px] font-bold" style={{ color: ACCENT }}>Change</button>
        </SettingRow>
        <SettingRow label="Account type" description="Verified Doctor">
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </span>
        </SettingRow>
      </Section>

      {/* Security */}
      <Section title="Security">
        <div className="px-5 py-4">
          <p className="text-[12px] font-extrabold text-slate-600 mb-3">Change Password</p>
          <div className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type={showOld ? "text" : "password"} placeholder="Current password" value={oldPw} onChange={e => setOldPw(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 transition-colors" />
              <button onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type={showNew ? "text" : "password"} placeholder="New password (min 8 chars)" value={newPw} onChange={e => setNewPw(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 transition-colors" />
              <button onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-blue-400 transition-colors" />

            {/* Password strength */}
            {newPw && (
              <div className="space-y-1">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: newPw.length >= 12 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) && /[!@#$%]/.test(newPw) ? "100%"
                        : newPw.length >= 10 && (/[A-Z]/.test(newPw) || /[0-9]/.test(newPw)) ? "66%"
                          : newPw.length >= 8 ? "33%" : "15%",
                      background: newPw.length >= 12 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? "#16a34a"
                        : newPw.length >= 8 ? "#f59e0b" : "#ef4444",
                    }} />
                </div>
                <p className="text-[10px] text-slate-400">
                  {newPw.length >= 12 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? "Strong password" :
                    newPw.length >= 8 ? "Medium — add numbers and symbols" : "Too short"}
                </p>
              </div>
            )}

            {pwMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-xl ${pwMsg.type === "success" ? "bg-emerald-50 border border-emerald-100" : "bg-rose-50 border border-rose-100"}`}>
                {pwMsg.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                <p className={`text-[12px] font-semibold ${pwMsg.type === "success" ? "text-emerald-700" : "text-rose-600"}`}>{pwMsg.text}</p>
              </div>
            )}

            <button onClick={handlePasswordChange} disabled={pwSaving || !oldPw || !newPw || !confirmPw}
              className="w-full py-2.5 rounded-xl font-bold text-[13px] text-white disabled:opacity-50 transition-all"
              style={{ background: NAV_BG }}>
              {pwSaving ? "Changing…" : "Change Password"}
            </button>
          </div>
        </div>

        <SettingRow label="Two-factor authentication" description="Add an extra layer of security">
          <button className="text-[12px] font-bold" style={{ color: ACCENT }}>Enable</button>
        </SettingRow>
        <SettingRow label="Active sessions" description="Manage devices with access">
          <button className="flex items-center gap-1 text-[12px] font-bold text-slate-600 hover:text-rose-500 transition-colors">
            View <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </SettingRow>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <SettingRow label="New message" description="When a patient or colleague sends a message">
          <Toggle value={notifs.newMessage} onChange={setNotif("newMessage")} />
        </SettingRow>
        <SettingRow label="Follow-up reminders" description="Before scheduled patient follow-ups">
          <Toggle value={notifs.followUpReminder} onChange={setNotif("followUpReminder")} />
        </SettingRow>
        <SettingRow label="Queue updates" description="When patients join or leave your queue">
          <Toggle value={notifs.queueUpdates} onChange={setNotif("queueUpdates")} />
        </SettingRow>
        <SettingRow label="Patient joined" description="When a patient enters your waiting room">
          <Toggle value={notifs.patientJoined} onChange={setNotif("patientJoined")} />
        </SettingRow>
        <SettingRow label="Push notifications" description="Browser and mobile push alerts">
          <Toggle value={notifs.pushNotifications} onChange={setNotif("pushNotifications")} />
        </SettingRow>
        <SettingRow label="Email digest" description="Weekly summary of activity">
          <Toggle value={notifs.emailDigest} onChange={setNotif("emailDigest")} />
        </SettingRow>
        <SettingRow label="SMS alerts" description="Critical alerts via SMS">
          <Toggle value={notifs.smsAlerts} onChange={setNotif("smsAlerts")} />
        </SettingRow>
        <SettingRow label="Marketing emails" description="Product updates and medical tips">
          <Toggle value={notifs.marketingEmails} onChange={setNotif("marketingEmails")} />
        </SettingRow>
      </Section>

      {/* Privacy */}
      <Section title="Privacy">
        <div className="px-5 py-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Profile Visibility</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "public", label: "Public", icon: Globe },
              { value: "colleagues", label: "Colleagues", icon: Users },
              { value: "private", label: "Private", icon: Lock },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setPrivacy(p => ({ ...p, profileVisibility: value }))}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border text-center transition-all"
                style={privacy.profileVisibility === value
                  ? { background: "#eff6ff", borderColor: ACCENT, color: ACCENT }
                  : { borderColor: "#e2e8f0", color: "#94a3b8" }}>
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <SettingRow label="Show online status" description="Let patients see when you're available">
          <Toggle value={privacy.showOnlineStatus} onChange={v => setPrivacySetting("showOnlineStatus")(v)} />
        </SettingRow>
        <SettingRow label="Show reviews publicly" description="Display patient reviews on your profile">
          <Toggle value={privacy.showReviews} onChange={v => setPrivacySetting("showReviews")(v)} />
        </SettingRow>
        <SettingRow label="Allow patient search" description="Patients can find you by name or specialty">
          <Toggle value={privacy.allowPatientSearch} onChange={v => setPrivacySetting("allowPatientSearch")(v)} />
        </SettingRow>
        <SettingRow label="Usage data collection" description="Help improve the platform with anonymous data">
          <Toggle value={privacy.dataCollection} onChange={v => setPrivacySetting("dataCollection")(v)} />
        </SettingRow>
      </Section>

      {/* Preferences */}
      <Section title="Preferences">
        <div className="px-5 py-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setTheme(value)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border text-center transition-all"
                style={theme === value
                  ? { background: "#eff6ff", borderColor: ACCENT, color: ACCENT }
                  : { borderColor: "#e2e8f0", color: "#94a3b8" }}>
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>
        <SettingRow label="Language">
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="text-[12px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none">
            <option>English</option>
            <option>Amharic</option>
            <option>Oromo</option>
            <option>French</option>
          </select>
        </SettingRow>
        <SettingRow label="Timezone">
          <select value={timezone} onChange={e => setTimezone(e.target.value)}
            className="text-[12px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none">
            <option>Africa/Addis_Ababa</option>
            <option>UTC</option>
            <option>Europe/London</option>
            <option>America/New_York</option>
          </select>
        </SettingRow>
      </Section>

      {/* Danger zone */}
      <div className="bg-rose-50 rounded-2xl border border-rose-100 p-5">
        <h3 className="font-extrabold text-[14px] text-rose-700 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Danger Zone
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-rose-100">
            <div>
              <p className="text-[13px] font-semibold text-slate-800">Deactivate Account</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Temporarily disable your account</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors">
              Deactivate
            </button>
          </div>
          <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-rose-100">
            <div>
              <p className="text-[13px] font-semibold text-rose-700">Delete Account</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Permanently delete all your data</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}