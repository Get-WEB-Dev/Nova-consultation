"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getUser, type AuthUser } from "@/lib/supabase/auth";
import Image from "next/image";
import Link from "next/link";
import {
  Users, CheckCircle2, Star, ChevronLeft, ChevronRight,
  Video, Clock, Zap, Play, Stethoscope, Calendar, AlertCircle, Activity
} from "lucide-react";

/* ── types ─────────────────────────────────────────────── */
interface Profile {
  specialty: string; status: string; fee: number;
  patients_served: number; rating: number; review_count: number;
  experience_years: number; hospital: string | null;
}
interface QueuePatient {
  id: string; patientName: string; patientAvatar?: string;
  symptoms?: string; duration?: string; severity?: string; notes?: string;
  joinedAt: string; queuePosition: number;
}
interface ConsultSummary { patientName: string; issue: string; durationMinutes: number; }

/* ── mock data ──────────────────────────────────────────── */
const MOCK_REVIEWS = [
  { id:"1", name:"Sarah K.",    rating:5, text:"Very helpful and caring doctor. Explained everything clearly.",     avatar:"S", time:"2 days ago" },
  { id:"2", name:"Mohammed A.", rating:5, text:"Quick and professional consultation. Highly recommend!",            avatar:"M", time:"3 days ago" },
  { id:"3", name:"Hana T.",     rating:4, text:"Great advice. I felt heard and understood throughout.",             avatar:"H", time:"5 days ago" },
  { id:"4", name:"James L.",    rating:5, text:"Best online doctor experience I've ever had.",                      avatar:"J", time:"1 week ago" },
];

/* ── countdown hook ─────────────────────────────────────── */
function useCountdown(initialMs: number) {
  const [rem, setRem] = useState(initialMs);
  useEffect(() => {
    const t = setInterval(() => setRem(r => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(rem / 3600000);
  const m = Math.floor((rem % 3600000) / 60000);
  const s = Math.floor((rem % 60000) / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/* ── Reviews Slider ─────────────────────────────────────── */
function ReviewsSlider() {
  const [idx, setIdx] = useState(0);
  const next = useCallback(() => setIdx(i => (i + 1) % MOCK_REVIEWS.length), []);
  useEffect(() => { const t = setInterval(next, 4500); return () => clearInterval(t); }, [next]);
  const r = MOCK_REVIEWS[idx];
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-800 dark:text-white">Patient Reviews</h2>
        <div className="flex gap-1">
          {MOCK_REVIEWS.map((_,i) => (
            <button key={i} onClick={()=>setIdx(i)} className={`rounded-full transition-all duration-300 ${i===idx?"w-5 h-2 bg-primary-500":"w-2 h-2 bg-slate-200 hover:bg-slate-300"}`} />
          ))}
        </div>
      </div>
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-card border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary-50 dark:bg-primary-900/20 opacity-60" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-900/20 opacity-60" />
        <div className="relative">
          <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(i=><Star key={i} className={`w-4 h-4 ${i<=r.rating?"fill-gold-400 text-gold-400":"text-slate-200"}`}/>)}</div>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic mb-4">"{r.text}"</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{r.avatar}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{r.name}</p>
              <p className="text-xs text-slate-400">{r.time}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Schedule Slider ────────────────────────────────────── */
function ScheduleSlider({ lastConsult }: { lastConsult: ConsultSummary | null }) {
  const [slide, setSlide] = useState(0);
  const countdown = useCountdown(24 * 60000 + 18000);
  const startX = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) setSlide(diff > 0 ? 1 : 0);
  };
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-slate-800 dark:text-white">Schedule</h2>
        <div className="flex gap-1">
          {[0,1].map(i=><button key={i} onClick={()=>setSlide(i)} className={`rounded-full transition-all duration-300 ${i===slide?"w-5 h-2 bg-primary-500":"w-2 h-2 bg-slate-200"}`}/>)}
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="flex transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{transform:`translateX(-${slide*100}%)`}}>
          {/* Slide 1 */}
          <div className="min-w-full bg-gradient-to-br from-primary-700 to-primary-500 rounded-2xl p-5 relative overflow-hidden" style={{boxShadow:"0 6px 28px rgba(27,58,92,0.28)"}}>
            <div className="absolute inset-0 opacity-10" style={{backgroundImage:"radial-gradient(circle at 80% 20%, white 0%, transparent 50%)"}}/>
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-primary-200 text-xs font-semibold uppercase tracking-wider mb-1">Next Schedule</p>
                <p className="text-white font-bold text-lg leading-tight">Morning Session</p>
                <p className="text-primary-200 text-sm mt-0.5">10:30 AM – 1:00 PM</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary-300"/><span className="text-primary-200 text-xs">8 slots</span></div>
                  <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary-300"/><span className="text-primary-200 text-xs">15 min avg</span></div>
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2.5 text-center flex-shrink-0">
                <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold mb-1">Starts in</p>
                <p className="text-white font-bold text-xl font-mono leading-none">{countdown}</p>
              </div>
            </div>
            <button onClick={()=>setSlide(1)} className="mt-3 flex items-center gap-1 text-primary-200 text-xs hover:text-white transition-colors">
              Last consultation <ChevronRight className="w-3.5 h-3.5"/>
            </button>
          </div>
          {/* Slide 2 */}
          <div className="min-w-full bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Consultation</p>
              <button onClick={()=>setSlide(0)} className="flex items-center gap-1 text-primary-500 text-xs font-medium hover:text-primary-600">
                <ChevronLeft className="w-3.5 h-3.5"/>Today's schedule
              </button>
            </div>
            {lastConsult ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{lastConsult.patientName[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-white">{lastConsult.patientName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{lastConsult.issue}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-slate-500"><Clock className="w-3.5 h-3.5"/><span className="text-sm font-semibold">{lastConsult.durationMinutes} min</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-accent-50 dark:bg-accent-900/20 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-500 flex-shrink-0"/>
                  <span className="text-xs font-semibold text-accent-700 dark:text-accent-300">Consultation completed successfully</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center"><span className="text-white font-bold">H</span></div>
                  <div><p className="font-bold text-slate-800 dark:text-white">Hana</p><p className="text-sm text-slate-500">Fever</p></div>
                  <div className="ml-auto flex items-center gap-1 text-slate-500"><Clock className="w-3.5 h-3.5"/><span className="text-sm font-semibold">7 min</span></div>
                </div>
                <div className="flex items-center gap-2 bg-accent-50 dark:bg-accent-900/20 rounded-xl px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-500 flex-shrink-0"/>
                  <span className="text-xs font-semibold text-accent-700 dark:text-accent-300">Consultation completed successfully</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Toggle ──────────────────────────────────────────────── */
function StatusToggle({ online, onChange, busy }: { online:boolean; onChange:(v:boolean)=>void; busy:boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`text-sm font-semibold transition-colors ${online?"text-emerald-600":"text-slate-400"}`}>{online?"Online":"Offline"}</span>
      <button onClick={()=>!busy&&onChange(!online)} disabled={busy}
        className={`relative w-12 h-6 rounded-full transition-all duration-300 disabled:opacity-60 ${online?"bg-emerald-500 shadow-md shadow-emerald-500/30":"bg-slate-200 dark:bg-slate-600"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${online?"left-[calc(100%-1.375rem)]":"left-0.5"}`}/>
      </button>
    </div>
  );
}

/* ── Queue Card ──────────────────────────────────────────── */
function QueueCard({ p, pos }: { p:QueuePatient; pos:number }) {
  const mins = Math.max(0, Math.floor((Date.now()-new Date(p.joinedAt).getTime())/60000));
  return (
    <div className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card">
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-700 flex items-center justify-center overflow-hidden">
          {p.patientAvatar
            ? <Image src={p.patientAvatar} alt={p.patientName} width={44} height={44} className="object-cover"/>
            : <span className="font-bold text-primary-600 dark:text-primary-200">{p.patientName[0]}</span>
          }
        </div>
        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center shadow-sm">
          <span className="text-white text-[9px] font-bold">{pos}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 dark:text-white text-sm">{p.patientName}</p>
        {p.symptoms && <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{p.symptoms}</p>}
        {p.severity && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-1 inline-block ${p.severity==="Severe"?"bg-rose-50 text-rose-600":p.severity==="Moderate"?"bg-amber-50 text-amber-600":"bg-emerald-50 text-emerald-600"}`}>
            {p.severity}
          </span>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`flex items-center gap-1 justify-end ${mins>=5?"text-amber-500":"text-slate-400"}`}>
          <Clock className="w-3 h-3"/><span className="text-xs font-semibold">{mins}m</span>
        </div>
        <p className="text-[10px] text-slate-400">waiting</p>
      </div>
    </div>
  );
}

/* ── Waiting animation ───────────────────────────────────── */
function WaitingAnim() {
  return (
    <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card">
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
          <Stethoscope className="w-9 h-9 text-primary-300"/>
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary-200 animate-ping opacity-25"/>
        <div className="absolute inset-[-8px] rounded-full border border-primary-100 animate-ping opacity-15" style={{animationDelay:"0.6s"}}/>
      </div>
      <p className="font-semibold text-slate-700 dark:text-slate-300 text-base">Waiting for patients to join</p>
      <p className="text-sm text-slate-400 mt-1">Your queue will appear here</p>
      <div className="flex gap-1.5 mt-4">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full bg-primary-300 animate-bounce" style={{animationDelay:`${i*0.2}s`}}/>)}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function DoctorHomePage() {
  const [user, setUser] = useState<AuthUser|null>(null);
  const [profile, setProfile] = useState<Profile|null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [lastConsult, setLastConsult] = useState<ConsultSummary|null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const u = getUser(); if (!u) return; setUser(u);
    Promise.all([
      fetch(`/api/doctor/profile?doctorId=${u.id}`).then(r=>r.json()),
      fetch(`/api/queue?doctorId=${u.id}`).then(r=>r.json()).catch(()=>({data:[]})),
      fetch(`/api/doctor/consultations?doctorId=${u.id}`).then(r=>r.json()).catch(()=>({data:[]})),
    ]).then(([p,q,c]) => {
      if (p.data) { setProfile(p.data); setIsOnline(["available","in_consultation"].includes(p.data.status)); }
      const qData: QueuePatient[] = (q.data||[]).map((e:any,i:number)=>({
        id:e.id, patientName:e.patientName||e.patient_name||"Patient",
        patientAvatar:e.patientAvatar, symptoms:e.symptoms, duration:e.duration,
        severity:e.severity, notes:e.notes,
        joinedAt:e.joinedAt||e.joined_at||new Date().toISOString(), queuePosition:i+1,
      }));
      setQueue(qData);
      const today = new Date().toDateString();
      const done = (c.data||[]).filter((x:any)=>x.status==="completed"&&new Date(x.created_at).toDateString()===today);
      setCompletedToday(done.length);
      const allDone = (c.data||[]).filter((x:any)=>x.status==="completed");
      if (allDone.length) {
        const last = allDone.sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())[0];
        setLastConsult({patientName:last.patientName||"Patient",issue:last.notes||"General consultation",durationMinutes:last.durationMinutes||0});
      }
    }).finally(()=>setLoading(false));
  }, []);

  const toggleStatus = async (val:boolean) => {
    if (!user||toggling) return;
    setToggling(true); setIsOnline(val);
    try {
      await fetch("/api/doctor/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({doctorId:user.id,status:val?"available":"offline"})});
    } catch {}
    setToggling(false);
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-2xl"/>
      <div className="h-36 bg-slate-200 dark:bg-slate-700 rounded-2xl"/>
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"/>
    </div>
  );

  const hour = new Date().getHours();
  const greet = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Greeting + Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
          <h1 className="font-bold text-xl text-slate-800 dark:text-white mt-0.5">{greet}, Dr. {user?.name?.split(" ").pop()} 👋</h1>
          {profile?.specialty && <p className="text-xs text-slate-400 mt-0.5">{profile.specialty}</p>}
        </div>
        <div className="flex-shrink-0 pt-1">
          <StatusToggle online={isOnline} onChange={toggleStatus} busy={toggling}/>
        </div>
      </div>

      {/* ── OFFLINE ── */}
      {!isOnline && (
        <>
          <ReviewsSlider/>
          <ScheduleSlider lastConsult={lastConsult}/>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:"Rating",value:profile?.rating?.toFixed(1)||"4.9",icon:Star,color:"text-gold-400",bg:"bg-gold-50 dark:bg-gold-900/20"},
              {label:"Patients",value:(profile?.patients_served||0).toString(),icon:Users,color:"text-primary-500",bg:"bg-primary-50 dark:bg-primary-900/20"},
              {label:"Experience",value:`${profile?.experience_years||0}y`,icon:Activity,color:"text-accent-500",bg:"bg-accent-50 dark:bg-accent-900/20"},
            ].map(({label,value,icon:Icon,color,bg})=>(
              <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-card border border-slate-100 dark:border-slate-700 text-center">
                <div className={`w-8 h-8 ${bg} rounded-xl flex items-center justify-center mx-auto mb-1.5`}><Icon className={`w-4 h-4 ${color}`}/></div>
                <p className="font-bold text-slate-800 dark:text-white">{value}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {/* Go online CTA */}
          <div className="relative bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl p-5 overflow-hidden" style={{boxShadow:"0 8px 28px rgba(27,58,92,0.22)"}}>
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5"/>
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0"><Zap className="w-6 h-6 text-white"/></div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Ready to start consulting?</p>
                <p className="text-primary-200 text-xs mt-0.5">Switch online to receive patients</p>
              </div>
              <button onClick={()=>toggleStatus(true)} className="flex-shrink-0 bg-white text-primary-700 text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors active:scale-95">
                Go Online
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── ONLINE ── */}
      {isOnline && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              {label:"Patients Waiting",value:queue.length,icon:Users,color:"text-amber-500",bg:"bg-amber-50 dark:bg-amber-900/20"},
              {label:"Completed Today",value:completedToday,icon:CheckCircle2,color:"text-accent-500",bg:"bg-accent-50 dark:bg-accent-900/20"},
            ].map(({label,value,icon:Icon,color,bg})=>(
              <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-card border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}><Icon className={`w-[18px] h-[18px] ${color}`}/></div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-tight">{label}</span>
                </div>
                <p className="font-bold text-3xl text-slate-800 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">You're online</p>
            <p className="text-xs text-emerald-500 ml-auto">Accepting patients</p>
          </div>
          {/* Queue */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-800 dark:text-white">Consultation Queue</h2>
              {queue.length>0 && <span className="text-xs font-bold bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 px-2.5 py-1 rounded-full">{queue.length} {queue.length===1?"patient":"patients"}</span>}
            </div>
            {queue.length===0 ? <WaitingAnim/> : <div className="space-y-2.5">{queue.map((p,i)=><QueueCard key={p.id} p={p} pos={i+1}/>)}</div>}
          </div>
          {queue.length>0 && (
            <div className="sticky bottom-24 lg:bottom-6 z-20">
              <Link href="/doctor-dashboard/consult"
                className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-primary-700 to-primary-500 text-white font-bold text-base py-4 rounded-2xl active:scale-[0.98] transition-transform"
                style={{boxShadow:"0 8px 32px rgba(27,58,92,0.30)"}}>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center"><Video className="w-4 h-4"/></div>
                Start Consultation
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><Play className="w-3.5 h-3.5 fill-white"/></div>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
