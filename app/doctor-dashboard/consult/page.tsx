"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff,
  MessageSquare, Paperclip, FileText, ChevronLeft,
  Send, X, Clock, AlertCircle, CheckCircle2, SkipForward,
  Users, Stethoscope, Activity, Plus, Download
} from "lucide-react";

interface Patient { id:string;name:string;symptoms?:string;duration?:string;severity?:string;notes?:string;joinedAt:string;status:"active"|"waiting"|"follow_up"; }
interface ChatMsg { id:string;from:"doctor"|"patient";text:string;time:string; }

const INIT_QUEUE: Patient[] = [
  {id:"1",name:"Samuel Osei",symptoms:"Headache and fever",duration:"2 days",severity:"Moderate",notes:"Persistent headache. Tried paracetamol without relief.",joinedAt:new Date(Date.now()-2*60000).toISOString(),status:"active"},
  {id:"2",name:"Aisha Mohammed",symptoms:"Sore throat, difficulty swallowing",duration:"3 days",severity:"Mild",notes:"No fever. Mild morning cough.",joinedAt:new Date(Date.now()-60000).toISOString(),status:"waiting"},
  {id:"3",name:"John Tekle",symptoms:"Lower back pain",duration:"1 week",severity:"Severe",notes:"Pain worsens while sitting.",joinedAt:new Date().toISOString(),status:"waiting"},
];

function Timer({start}:{start:Date}) {
  const [s,setS]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setS(Math.floor((Date.now()-start.getTime())/1000)),1000);return()=>clearInterval(t);},[start]);
  return <span className="font-mono">{String(Math.floor(s/60)).padStart(2,"0")}:{String(s%60).padStart(2,"0")}</span>;
}

function PatientAvatar({name,size="md"}:{name:string;size?:"sm"|"md"|"lg"}) {
  const sz={sm:"w-8 h-8 text-xs",md:"w-10 h-10 text-sm",lg:"w-14 h-14 text-xl"}[size];
  return <div className={`${sz} rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0`}><span className="text-white font-bold">{name[0]}</span></div>;
}

export default function ConsultPortal() {
  const router=useRouter();
  const [queue,setQueue]=useState<Patient[]>(INIT_QUEUE);
  const [activeIdx,setActiveIdx]=useState(0);
  const [startTime]=useState(new Date());
  const [muted,setMuted]=useState(false);
  const [camOff,setCamOff]=useState(false);
  const [sharing,setSharing]=useState(false);
  const [rightTab,setRightTab]=useState<"info"|"chat"|"notes"|"files">("info");
  const [chats,setChats]=useState<ChatMsg[]>([{id:"1",from:"patient",text:"Hello doctor, thank you for seeing me today.",time:"Now"}]);
  const [input,setInput]=useState("");
  const [notes,setNotes]=useState("");
  const [ending,setEnding]=useState(false);
  const [notesSaved,setNotesSaved]=useState(false);
  const videoRef=useRef<HTMLVideoElement>(null);
  const chatEndRef=useRef<HTMLDivElement>(null);
  const active=queue[activeIdx];

  useEffect(()=>{
    navigator.mediaDevices?.getUserMedia({video:true,audio:true})
      .then(s=>{if(videoRef.current)videoRef.current.srcObject=s;}).catch(()=>{});
  },[]);
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[chats]);

  const sendChat=useCallback(()=>{
    if(!input.trim())return;
    setChats(p=>[...p,{id:Date.now().toString(),from:"doctor",text:input.trim(),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]);
    setInput("");
  },[input]);

  const endConsult=useCallback(()=>{
    setEnding(true);
    setTimeout(()=>{
      const next=queue.filter((_,i)=>i!==activeIdx);
      if(!next.length){router.push("/doctor-dashboard");return;}
      setQueue(next);setActiveIdx(0);setEnding(false);setNotes("");setChats([]);setNotesSaved(false);
    },700);
  },[queue,activeIdx,router]);

  const TABS=[
    {key:"info"as const,icon:FileText,label:"Patient Info"},
    {key:"chat"as const,icon:MessageSquare,label:"Chat"},
    {key:"notes"as const,icon:Activity,label:"Notes"},
    {key:"files"as const,icon:Paperclip,label:"Files"},
  ];

  return (
    <div className="h-screen bg-[#0A0E14] flex flex-col overflow-hidden select-none">
      {/* TOP BAR */}
      <div className="h-12 bg-[#111827] border-b border-white/[0.06] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={()=>router.push("/doctor-dashboard")} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm">
            <ChevronLeft className="w-4 h-4"/><span className="hidden sm:block">Exit</span>
          </button>
          <div className="w-px h-4 bg-white/10"/>
          <div className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-primary-400"/><span className="text-white text-sm font-semibold hidden sm:block">Consultation Portal</span></div>
        </div>
        <div className="flex items-center gap-2">
          {active && (
            <div className="flex items-center gap-2 bg-white/[0.06] rounded-xl px-3 py-1.5 text-sm text-slate-300">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
              <Timer start={startTime}/>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white/[0.06] rounded-xl px-3 py-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400"/>
            <span className="text-slate-300 text-xs font-medium">{queue.length} in queue</span>
          </div>
        </div>
        <div className="w-20"/>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Queue */}
        <div className="hidden lg:flex w-56 xl:w-64 bg-[#111827] border-r border-white/[0.06] flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-white/[0.06]"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Queue</p></div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {queue.map((p,i)=>(
              <button key={p.id} onClick={()=>setActiveIdx(i)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${i===activeIdx?"bg-primary-600/20 border-primary-500/40":"bg-white/[0.03] border-white/[0.04] hover:bg-white/[0.06]"}`}>
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <PatientAvatar name={p.name} size="sm"/>
                    {i===activeIdx&&<div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#111827]"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${i===activeIdx?"text-white":"text-slate-300"}`}>{p.name}</p>
                    {p.symptoms&&<p className="text-xs text-slate-500 truncate">{p.symptoms}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${i===activeIdx?"bg-emerald-500/20 text-emerald-400":p.status==="follow_up"?"bg-purple-500/20 text-purple-400":"bg-amber-500/20 text-amber-400"}`}>
                    {i===activeIdx?"Active":p.status==="follow_up"?"Follow-up":"Waiting"}
                  </span>
                  <span className="text-[10px] text-slate-600 ml-auto">{Math.floor((Date.now()-new Date(p.joinedAt).getTime())/60000)}m</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Video */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative overflow-hidden bg-[#0A0E14]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 opacity-5" style={{backgroundImage:"radial-gradient(circle at 35% 45%, #1B3A5C 0%, transparent 60%), radial-gradient(circle at 65% 65%, #2E8B3D 0%, transparent 40%)"}}/>
              {active ? (
                <div className="flex flex-col items-center gap-4 text-center relative">
                  <PatientAvatar name={active.name} size="lg"/>
                  <div>
                    <p className="text-white font-bold text-xl">{active.name}</p>
                    <p className="text-slate-400 text-sm mt-0.5">{active.symptoms}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                    <span className="text-slate-300 text-xs">Connecting to patient…</span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-slate-500">No active consultation</p>
                  <button onClick={()=>router.push("/doctor-dashboard")} className="text-primary-400 text-sm mt-2 hover:text-primary-300">Return to dashboard</button>
                </div>
              )}
            </div>
            {/* Doctor PiP */}
            <div className="absolute top-3 right-3 w-28 h-20 lg:w-36 lg:h-24 rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shadow-2xl">
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${camOff?"hidden":""}`}/>
              {camOff&&<div className="w-full h-full flex items-center justify-center bg-slate-800"><VideoOff className="w-5 h-5 text-slate-500"/></div>}
              <div className="absolute bottom-1 left-1.5 flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-0.5">
                {muted?<MicOff className="w-2.5 h-2.5 text-red-400"/>:<Mic className="w-2.5 h-2.5 text-emerald-400"/>}
                <span className="text-[9px] text-white">You</span>
              </div>
            </div>
          </div>
          {/* Controls */}
          <div className="flex items-center justify-center gap-2.5 py-4 px-4 bg-[#111827] border-t border-white/[0.06] flex-shrink-0">
            {[
              {icon:muted?MicOff:Mic,active:muted,action:()=>setMuted(!muted),danger:muted},
              {icon:camOff?VideoOff:Video,active:camOff,action:()=>setCamOff(!camOff),danger:camOff},
              {icon:MonitorUp,active:sharing,action:()=>setSharing(!sharing),danger:false},
            ].map((btn,i)=>(
              <button key={i} onClick={btn.action}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${btn.danger?"bg-red-500/20 text-red-400":btn.active?"bg-primary-500/20 text-primary-400":"bg-white/[0.08] text-slate-300 hover:bg-white/[0.14]"}`}>
                <btn.icon className="w-5 h-5"/>
              </button>
            ))}
            <button onClick={endConsult} disabled={ending}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all disabled:opacity-50 mx-1">
              <PhoneOff className="w-4 h-4"/><span className="text-sm">End</span>
            </button>
            {queue.length>1&&(
              <button onClick={endConsult} className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.14] text-slate-300 text-sm px-4 py-2.5 rounded-xl transition-all">
                <SkipForward className="w-4 h-4"/><span className="hidden sm:block">Next</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: Tools */}
        <div className="hidden lg:flex w-72 xl:w-80 bg-[#111827] border-l border-white/[0.06] flex-col flex-shrink-0">
          <div className="flex border-b border-white/[0.06] flex-shrink-0">
            {TABS.map(({key,icon:Icon,label})=>(
              <button key={key} onClick={()=>setRightTab(key)}
                className={`flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${rightTab===key?"text-white border-b-2 border-primary-400":"text-slate-600 hover:text-slate-400"}`}>
                <Icon className="w-4 h-4"/>
                <span className="hidden xl:block">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {rightTab==="info"&&active&&(
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-center gap-3 mb-1">
                  <PatientAvatar name={active.name} size="md"/>
                  <div><p className="text-white font-bold text-sm">{active.name}</p><p className="text-slate-500 text-xs">Intake Summary</p></div>
                </div>
                {[
                  {label:"Symptoms",value:active.symptoms,icon:AlertCircle,color:"text-red-400"},
                  {label:"Duration",value:active.duration,icon:Clock,color:"text-amber-400"},
                  {label:"Severity",value:active.severity,icon:Activity,color:"text-orange-400"},
                ].map(({label,value,icon:Icon,color})=>(
                  <div key={label} className="bg-white/[0.04] rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1"><Icon className={`w-3.5 h-3.5 ${color}`}/><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span></div>
                    <p className="text-slate-200 text-sm">{value||"—"}</p>
                  </div>
                ))}
                {active.notes&&(
                  <div className="bg-white/[0.04] rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1"><FileText className="w-3.5 h-3.5 text-slate-500"/><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Patient Notes</span></div>
                    <p className="text-slate-300 text-sm leading-relaxed">{active.notes}</p>
                  </div>
                )}
              </div>
            )}
            {rightTab==="chat"&&(
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chats.map(msg=>(
                    <div key={msg.id} className={`flex ${msg.from==="doctor"?"justify-end":"justify-start"}`}>
                      <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm ${msg.from==="doctor"?"bg-primary-600 text-white rounded-br-sm":"bg-white/[0.08] text-slate-200 rounded-bl-sm"}`}>
                        <p className="leading-relaxed">{msg.text}</p>
                        <p className={`text-[10px] mt-0.5 ${msg.from==="doctor"?"text-primary-200":"text-slate-500"}`}>{msg.time}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef}/>
                </div>
                <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
                  <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2">
                    <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()} placeholder="Type a message…"
                      className="flex-1 bg-transparent text-slate-200 text-sm placeholder-slate-600 focus:outline-none"/>
                    <button onClick={sendChat} disabled={!input.trim()} className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0">
                      <Send className="w-3.5 h-3.5 text-white"/>
                    </button>
                  </div>
                </div>
              </>
            )}
            {rightTab==="notes"&&(
              <div className="flex-1 flex flex-col p-3 gap-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Consultation Notes</p>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                  placeholder={`Notes for ${active?.name||"patient"}…\n\n• Diagnosis\n• Prescription\n• Follow-up plan`}
                  className="flex-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-xl text-slate-200 text-sm p-3 focus:outline-none focus:border-primary-500/40 placeholder-slate-700 resize-none"/>
                <button onClick={()=>{setNotesSaved(true);setTimeout(()=>setNotesSaved(false),2000);}}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${notesSaved?"bg-emerald-600 text-white":"bg-accent-500 hover:bg-accent-600 text-white"}`}>
                  {notesSaved?<><CheckCircle2 className="w-4 h-4"/>Saved!</>:<><CheckCircle2 className="w-4 h-4"/>Save Notes</>}
                </button>
              </div>
            )}
            {rightTab==="files"&&(
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shared Files</p>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/[0.08] rounded-xl p-5 cursor-pointer hover:border-primary-500/40 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.05] group-hover:bg-primary-500/10 flex items-center justify-center transition-colors"><Plus className="w-5 h-5 text-slate-500 group-hover:text-primary-400"/></div>
                  <p className="text-xs text-slate-500 text-center">Click to share a file</p>
                  <input type="file" className="hidden"/>
                </label>
                <div className="space-y-2">
                  {[{name:"Lab Results.pdf",type:"PDF",from:"Patient",color:"bg-red-500/20 text-red-400"}].map(f=>(
                    <div key={f.name} className="flex items-center gap-2.5 p-2.5 bg-white/[0.04] rounded-xl">
                      <div className={`w-8 h-8 rounded-lg ${f.color} flex items-center justify-center flex-shrink-0 text-[10px] font-bold`}>{f.type}</div>
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-300 truncate">{f.name}</p><p className="text-[10px] text-slate-600">From {f.from}</p></div>
                      <button className="text-slate-600 hover:text-slate-400 transition-colors"><Download className="w-4 h-4"/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
