"use client";

import { useEffect } from "react";
import Link from "next/link";

// Shown instead of a blank page when something crashes while rendering.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error("[app error]", error);
    }, [error]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <div className="text-4xl mb-3">⚠️</div>
                <h1 className="text-xl font-bold text-slate-800">Something went wrong</h1>
                <p className="text-sm text-slate-500 mt-2">
                    We hit an unexpected problem. You can try again, and if it keeps happening please contact support.
                </p>
                {error.digest && <p className="text-[11px] text-slate-300 mt-3">Reference: {error.digest}</p>}
                <div className="flex gap-2 justify-center mt-6">
                    <button onClick={reset} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Try again</button>
                    <Link href="/" className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Go home</Link>
                </div>
            </div>
        </div>
    );
}