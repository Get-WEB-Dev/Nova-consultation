"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** A copyable snippet, used wherever the admin has to run something themselves. */
export default function CodeBlock({ code }: { code: string }) {
    const [done, setDone] = useState(false);
    return (
        <div className="relative rounded-xl bg-slate-900 text-slate-100">
            <button type="button" aria-label="Copy"
                onClick={() => { navigator.clipboard?.writeText(code); setDone(true); setTimeout(() => setDone(false), 1500); }}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px]">
                {done ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {done ? "Copied" : "Copy"}
            </button>
            <pre className="p-3 pr-20 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-words font-mono">{code}</pre>
        </div>
    );
}