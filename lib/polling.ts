/**
 * Run `fn` every `intervalMs` — but ONLY while the browser tab is visible.
 * When the tab is hidden (user switched away) polling pauses; when they come
 * back it refreshes once immediately and resumes. Returns a stop() function,
 * so it drops straight into a useEffect cleanup:
 *
 *   useEffect(() => { load(); return startPolling(load, 10000); }, []);
 */
export function startPolling(fn: () => unknown, intervalMs: number): () => void {
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = () => {
        try {
            Promise.resolve(fn()).catch(() => { /* a failed refresh is retried next tick */ });
        } catch { /* same */ }
    };
    const start = () => { if (!timer) timer = setInterval(run, intervalMs); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    const onVisibility = () => {
        if (document.visibilityState === "visible") { run(); start(); }
        else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
        stop();
        document.removeEventListener("visibilitychange", onVisibility);
    };
}