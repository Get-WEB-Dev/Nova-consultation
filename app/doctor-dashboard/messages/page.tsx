"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Send, Paperclip, ChevronLeft, MessageSquare, Image as Img, MoreVertical, Check, CheckCheck, Phone, Video } from "lucide-react";

type Folder="patients"|"doctors"|"reviews";
interface Convo { id:string;name:string;role:Folder;lastMsg:string;lastTime:string;unread:number;online?:boolean;specialty?:string; }
interface Msg { id:string;from:"me"|"other";text:string;time:string;status?:"sent"|"read"; }

const CONVOS: Record<Folder,Convo[]> = {
  patients:[
    {id:"1",name:"Samuel Osei",role:"patients",lastMsg:"Thank you doctor!",lastTime:"2m",unread:2,online:true},
    {id:"2",name:"Aisha Mohammed",role:"patients",lastMsg:"When should I take the medication?",lastTime:"15m",unread:1,online:false},
    {id:"3",name:"John Tekle",role:"patients",lastMsg:"Feeling much better, thank you.",lastTime:"1h",unread:0,online:true},
    {id:"4",name:"Hana Tadesse",role:"patients",lastMsg:"I have a question about my follow-up.",lastTime:"3h",unread:0,online:false},
    {id:"5",name:"Sara Muleta",role:"patients",lastMsg:"The rash is improving!",lastTime:"1d",unread:0,online:false},
  ],
  doctors:[
    {id:"d1",name:"Dr. Abebe Girma",role:"doctors",specialty:"Cardiologist",lastMsg:"Can you take a look at this case?",lastTime:"30m",unread:1,online:true},
    {id:"d2",name:"Dr. Meron Bekele",role:"doctors",specialty:"Pediatrician",lastMsg:"Referred a patient to your queue.",lastTime:"2h",unread:0,online:false},
    {id:"d3",name:"Dr. Yohannes T.",role:"doctors",specialty:"Dermatologist",lastMsg:"Thanks for the referral!",lastTime:"1d",unread:0,online:true},
  ],
  reviews:[
    {id:"r1",name:"Samuel Osei",role:"reviews",lastMsg:"⭐⭐⭐⭐⭐ Excellent doctor, very caring!",lastTime:"1d",unread:0},
    {id:"r2",name:"Aisha Mohammed",role:"reviews",lastMsg:"⭐⭐⭐⭐ Very helpful consultation.",lastTime:"3d",unread:0},
    {id:"r3",name:"Hana Tadesse",role:"reviews",lastMsg:"⭐⭐⭐⭐⭐ Will definitely consult again.",lastTime:"5d",unread:0},
  ],
};

const MOCK_MSGS: Msg[] = [
  {id:"1",from:"other",text:"Hello doctor, I had a question about my prescription.",time:"10:00 AM",status:"read"},
  {id:"2",from:"me",text:"Of course! What would you like to know?",time:"10:02 AM",status:"read"},
  {id:"3",from:"other",text:"Should I take the tablets before or after meals?",time:"10:03 AM",status:"read"},
  {id:"4",from:"me",text:"Please take them after meals to avoid any stomach discomfort.",time:"10:05 AM",status:"read"},
  {id:"5",from:"other",text:"Thank you doctor!",time:"10:06 AM"},
];

export default function MessagesPage() {
  const [folder,setFolder]=useState<Folder>("patients");
  const [selected,setSelected]=useState<Convo|null>(null);
  const [msgs,setMsgs]=useState<Msg[]>([]);
  const [input,setInput]=useState("");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef<HTMLDivElement>(null);

  const list=CONVOS[folder].filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));
  const open=(c:Convo)=>{setSelected(c);setLoading(true);setTimeout(()=>{setMsgs(MOCK_MSGS);setLoading(false);},350);};
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const send=useCallback(()=>{
    if(!input.trim())return;
    setMsgs(p=>[...p,{id:Date.now().toString(),from:"me",text:input.trim(),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),status:"sent"}]);
    setInput("");
  },[input]);

  const FOLDERS:[Folder,string][]=[["patients","Patients"],["doctors","Doctors"],["reviews","Reviews"]];

  return (
    <div className="animate-fade-up">
      <h1 className="font-bold text-xl text-slate-800 dark:text-white mb-4 lg:hidden">Messages</h1>
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-card overflow-hidden" style={{height:"calc(100vh - 9.5rem)",minHeight:"400px"}}>
        <div className="flex h-full">
          {/* Sidebar */}
          <div className={`${selected?"hidden lg:flex":"flex"} flex-col w-full lg:w-72 xl:w-80 border-r border-slate-100 dark:border-slate-700 flex-shrink-0`}>
            <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              {FOLDERS.map(([key,label])=>{
                const cnt=CONVOS[key].reduce((s,c)=>s+c.unread,0);
                return <button key={key} onClick={()=>{setFolder(key);setSelected(null);}}
                  className={`relative flex-1 py-3 text-xs font-bold transition-all ${folder===key?"text-primary-600 bg-white dark:bg-slate-700 border-b-2 border-primary-500":"text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
                  {label}{cnt>0&&<span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{cnt}</span>}
                </button>;
              })}
            </div>
            <div className="px-3 py-2.5 border-b border-slate-50 dark:border-slate-700">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 rounded-xl px-3 py-2">
                <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none"/>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
              {list.length===0
                ? <div className="flex flex-col items-center justify-center h-full p-6"><MessageSquare className="w-10 h-10 text-slate-200 mb-2"/><p className="text-sm text-slate-400">No conversations</p></div>
                : list.map(c=>(
                  <button key={c.id} onClick={()=>open(c)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors ${selected?.id===c.id?"bg-primary-50 dark:bg-primary-900/20 border-l-[3px] border-primary-500":""}`}>
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center"><span className="text-white font-bold text-sm">{c.name[0]}</span></div>
                      {c.online!==undefined&&<div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${c.online?"bg-emerald-400":"bg-slate-300"}`}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${c.unread?"font-bold text-slate-800 dark:text-white":"font-medium text-slate-700 dark:text-slate-300"}`}>{c.name}</p>
                        <span className="text-[11px] text-slate-400 ml-2 flex-shrink-0">{c.lastTime}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className={`text-xs truncate ${c.unread?"text-slate-600 dark:text-slate-300 font-medium":"text-slate-400 dark:text-slate-500"}`}>
                          {c.specialty&&<span className="text-primary-500 text-[10px] font-semibold">{c.specialty} · </span>}{c.lastMsg}
                        </p>
                        {c.unread>0&&<span className="w-5 h-5 bg-primary-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center ml-2 flex-shrink-0">{c.unread}</span>}
                      </div>
                    </div>
                  </button>
                ))
              }
            </div>
          </div>
          {/* Chat area */}
          {selected ? (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
                <button onClick={()=>setSelected(null)} className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5 text-slate-500"/></button>
                <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{selected.name[0]}</span>
                  {selected.online!==undefined&&<div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-800 ${selected.online?"bg-emerald-400":"bg-slate-300"}`}/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-white text-sm">{selected.name}</p>
                  <p className="text-xs text-slate-400">{selected.online?"Online now":"Offline"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-primary-500"><Phone className="w-4 h-4"/></button>
                  <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-primary-500"><Video className="w-4 h-4"/></button>
                  <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400"><MoreVertical className="w-4 h-4"/></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                {loading
                  ? <div className="flex justify-center pt-8"><div className="flex gap-1.5">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full bg-primary-300 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div></div>
                  : msgs.map(msg=>(
                    <div key={msg.id} className={`flex ${msg.from==="me"?"justify-end":"justify-start"}`}>
                      {msg.from==="other"&&<div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mr-2 mt-1 flex-shrink-0"><span className="text-white text-xs font-bold">{selected.name[0]}</span></div>}
                      <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm ${msg.from==="me"?"bg-primary-600 text-white rounded-br-sm shadow-sm shadow-primary-600/15":"bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-sm shadow-sm shadow-slate-200/60 border border-slate-100 dark:border-slate-600"}`}>
                        <p className="leading-relaxed">{msg.text}</p>
                        <div className={`flex items-center justify-end gap-1 mt-0.5 ${msg.from==="me"?"text-primary-200":"text-slate-400"}`}>
                          <span className="text-[10px]">{msg.time}</span>
                          {msg.from==="me"&&(msg.status==="read"?<CheckCheck className="w-3 h-3"/>:<Check className="w-3 h-3"/>)}
                        </div>
                      </div>
                    </div>
                  ))
                }
                <div ref={bottomRef}/>
              </div>
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <div className="flex-1 flex items-end gap-2 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600 px-3.5 py-2.5">
                    <button className="text-slate-400 hover:text-primary-500 transition-colors pb-0.5 flex-shrink-0"><Paperclip className="w-4 h-4"/></button>
                    <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Type a message…"
                      className="flex-1 bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none min-w-0"/>
                    <button className="text-slate-400 hover:text-primary-500 transition-colors pb-0.5 flex-shrink-0"><Img className="w-4 h-4"/></button>
                  </div>
                  <button onClick={send} disabled={!input.trim()} className="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center disabled:opacity-40 transition-all active:scale-95 flex-shrink-0 shadow-sm shadow-primary-600/25"><Send className="w-4 h-4 text-white"/></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center bg-slate-50/40 dark:bg-slate-800/40">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-700 shadow-card flex items-center justify-center mx-auto mb-3 border border-slate-100 dark:border-slate-600"><MessageSquare className="w-7 h-7 text-slate-300"/></div>
                <p className="font-medium text-slate-500 text-sm">Select a conversation</p>
                <p className="text-xs text-slate-400 mt-0.5">Choose from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
