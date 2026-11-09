"use client";

import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { API_ERROR_EVENT } from "@/lib/auth-fetch";

interface Item { id: number; message: string }

/** Shows a red toast whenever a save/update request fails (see lib/auth-fetch.ts). */
export default function ApiErrorToasts() {
    const [items, setItems] = useState<Item[]>([]);

    useEffect(() => {
        const onError = (e: Event) => {
            const message = (e as CustomEvent).detail?.message as string | undefined;
            if (!message) return;
            const id = Date.now() + Math.random();
            // Same message twice in a row → show once. Keep at most 3 on screen.
            setItems((list) => (list.some((t) => t.message === message) ? list : [...list.slice(-2), { id, message }]));
            setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 5000);
        };
        window.addEventListener(API_ERROR_EVENT, onError);
        return () => window.removeEventListener(API_ERROR_EVENT, onError);
    }, []);

    if (items.length === 0) return null;
    return (
        <div className="fixed bottom-4 left-4 z-[110] space-y-2 max-w-xs" role="alert">
            {items.map((t) => (
                <div key={t.id} className="flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg bg-white border border-rose-200 text-rose-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="flex-1">{t.message}</span>
                    <button onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} className="text-slate-300 hover:text-slate-500" aria-label="Dismiss">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}