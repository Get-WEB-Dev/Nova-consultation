"use client";
import { useState } from "react";
import Link from "next/link";
import {
  GitFork, Clock, Calendar, ChevronRight, FileText,
  MessageSquare, Video, Activity, AlertCircle, X, ChevronLeft
} from "lucide-react";

interface FU {
  id:string; name:string; email:string; scheduledAt:string;
  symptoms:string; notes:string|null; summary:string|null;
  duration:number|null; createdAt:string;
  chat:{from:string;text:string;time:string}[];
}

const DATA:FU[]=[
  {
    id:"fu1",name:"Hana Tadesse",email:"hana@example.com",
    scheduledAt:new Date(Date.now()+2*3600000).toISOString(),
    symptoms:"Fever follow-up — checking antibiotic response",
    notes:"Started amoxicillin 500mg. Check if fever has subsided.",
    summary:"Initial consultation for fever. Prescribed antibiotics. Follow-up in 3 days.",
    duration:8,createdAt:new Date(Date.now()-3*86400000).toISOString(),
    chat:[
      {from:"patient",text:"Doctor, my fever is at 38.5°C",time:"3 days ago"},
      {from:"doctor", text:"Please start the antibiotic course and rest well. Come back in 3 days.",time:"3 days ago"},
    ],
  },
  {
    id:"fu2",name:"Amir Bekele",email:"amir@example.com",
    scheduledAt:new Date(Date.now()+86400000).toISOString(),
    symptoms:"Blood pressure check — hypertension management",
    notes:"BP was 148/95. Started Amlodipine 5mg.",
    summary:"Hypertension diagnosed. Lifestyle changes + medication started.",
    duration:12,createdAt:new Date(Date.now()-7*86400000).toISOString(),
    chat:[
      {from:"patient",text:"Is it normal to feel dizzy after starting the medication?",time:"5 days ago"},
      {from:"doctor", text:"Mild dizziness is common initially. If it persists, contact me.",time:"5 days ago"},
    ],
  },
  {
    id:"fu3",name:"Sara Muleta",email:"sara@example.com",
    scheduledAt:new Date(Date.now()+3*86400000).toISOString(),
    symptoms:"Skin rash — allergy follow-up",
    notes:"Prescribed hydrocortisone cream. Check improvement.",
    summary:"Allergic dermatitis. Topical treatment prescribed.",
    duration:6,createdAt:new Date(Date.now()-5*86400000).toISOString(),
    chat:[],
  },
];

function timeUntil(iso:string){
  const ms=new Date(iso).getTime()-Date.now();
  if(ms<0)return"Overdue";
  const h=Math.floor(ms/3600000);
  if(h<1)return`In ${Math.floor(ms/60000)}m`;
  if(h<24)return`In ${h}h`;
  return`In ${Math.floor(h/24)}d`;
}

function Card({f,onClick}:{f:FU;onClick:()=>void}){
  const past=new Date(f.scheduledAt)<new Date();
  const urgent=!past&&new Date(f.scheduledAt).getTime()-Date.now()<6*3600000;
  return(
    <button onClick={onClick} className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-card p-4 text-left hover:shadow-card-hover hover:border-primary-200/60 dark:hover:border-primary-700/60 transition-all active:scale-[0.99] group">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold">{f.name[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-800 dark:text-white text-sm">{f.name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${past?"bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400":urgent?"bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400":"bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"}`}>
              {past?"Overdue":urgent?"⚡ Soon":"Scheduled"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{f.symptoms}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-slate-400 text-xs"><Calendar className="w-3 h-3"/>{new Date(f.scheduledAt).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
            <span className={`flex items-center gap-1 text-xs font-bold ${past?"text-rose-500":urgent?"text-amber-500":"text-primary-500"}`}><Clock className="w-3 h-3"/>{timeUntil(f.scheduledAt)}</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary-400 transition-colors flex-shrink-0 mt-1"/>
      </div>
    </button>
  );
}

function Modal({f,onClose}:{f:FU;onClose:()=>void}){
  return(
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose}/>
      <div className="fixed inset-x-4 top-16 bottom-16 z-50 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-w-lg mx-auto flex flex-col animate-scale-in">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">{f.name[0]}</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-800 dark:text-white">{f.name}</p>
            <p className="text-xs text-slate-400">{f.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Scheduled */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-500 flex-shrink-0"/>
            <div>
              <p className="font-semibold text-purple-800 dark:text-purple-300 text-sm">Follow-up Scheduled</p>
              <p className="text-purple-600 dark:text-purple-400 text-xs mt-0.5">{new Date(f.scheduledAt).toLocaleDateString("en-US",{weekday:"short",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}</p>
            </div>
            <span className="ml-auto text-xs font-bold text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-full shadow-sm">{timeUntil(f.scheduledAt)}</span>
          </div>
          {/* Symptoms */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Symptoms</p>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/><p className="text-sm text-red-700 dark:text-red-300">{f.symptoms}</p>
            </div>
          </div>
          {/* Summary */}
          {f.summary&&<div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Previous Consultation Summary</p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3"><p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{f.summary}</p></div>
          </div>}
          {/* Notes */}
          {f.notes&&<div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Doctor Notes</p>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 flex items-start gap-2">
              <FileText className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"/><p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{f.notes}</p>
            </div>
          </div>}
          {/* Chat history */}
          {f.chat.length>0&&<div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chat History</p>
            <div className="space-y-2">
              {f.chat.map((m,i)=>(
                <div key={i} className={`flex ${m.from==="doctor"?"justify-end":"justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.from==="doctor"?"bg-primary-600 text-white rounded-br-sm":"bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-sm"}`}>
                    <p>{m.text}</p><p className={`text-[10px] mt-0.5 ${m.from==="doctor"?"text-primary-200":"text-slate-400"}`}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>}
          {f.duration&&<p className="flex items-center gap-2 text-slate-400 text-sm"><Clock className="w-4 h-4"/>Previous consultation: {f.duration} minutes</p>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-2 flex-shrink-0">
          <Link href="/doctor-dashboard/consult" className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white text-sm font-bold py-3 rounded-xl hover:bg-primary-700 transition-colors shadow-sm shadow-primary-600/20">
            <Video className="w-4 h-4"/>Start Follow-up Call
          </Link>
          <button onClick={onClose} className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Close</button>
        </div>
      </div>
    </>
  );
}

export default function FollowUpsPage(){
  const [sel,setSel]=useState<FU|null>(null);
  const upcoming=DATA.filter(f=>new Date(f.scheduledAt)>new Date());
  const overdue =DATA.filter(f=>new Date(f.scheduledAt)<=new Date());
  return(
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="font-bold text-xl text-slate-800 dark:text-white">Follow Ups</h1>
        <p className="text-xs text-slate-400 mt-0.5">{DATA.length} scheduled · {overdue.length} overdue</p>
      </div>
      {overdue.length>0&&(
        <div>
          <div className="flex items-center gap-2 mb-2.5"><AlertCircle className="w-4 h-4 text-rose-500"/><h2 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Overdue ({overdue.length})</h2></div>
          <div className="space-y-2.5">{overdue.map(f=><Card key={f.id} f={f} onClick={()=>setSel(f)}/>)}</div>
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-2.5"><Calendar className="w-4 h-4 text-primary-500"/><h2 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Upcoming ({upcoming.length})</h2></div>
        {upcoming.length===0
          ?<div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800"><GitFork className="w-10 h-10 text-slate-200 mx-auto mb-2"/><p className="text-slate-400 text-sm">No upcoming follow-ups</p></div>
          :<div className="space-y-2.5">{upcoming.map(f=><Card key={f.id} f={f} onClick={()=>setSel(f)}/>)}</div>
        }
      </div>
      {sel&&<Modal f={sel} onClose={()=>setSel(null)}/>}
    </div>
  );
}
