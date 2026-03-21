"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function ZoomVideoCall({ roomName, userName, onReady, onLeave }) {
    const clientRef = useRef(null);
    const videoContainerRef = useRef(null);
    const [joined, setJoined] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Cleanup helper
    const cleanup = useCallback(async () => {
        if (clientRef.current) {
            try {
                const stream = clientRef.current.getMediaStream();
                try { await stream.stopVideo(); } catch (_) { }
                try { await stream.stopAudio(); } catch (_) { }
                await clientRef.current.leave();
            } catch (_) { }
            try {
                clientRef.current.destroy();
            } catch (_) { }
            clientRef.current = null;
        }
        setJoined(false);
    }, []);

    // Join session
    const joinSession = useCallback(async () => {
        if (!roomName || joined || loading) return;
        setLoading(true);
        setError(null);

        try {
            // Dynamically import Zoom Video SDK (client-side only)
            const ZoomVideo = (await import("@zoom/videosdk")).default;

            // Fetch token
            const res = await fetch(
                `/api/zoom-token?roomName=${encodeURIComponent(roomName)}&role=1`
            );
            if (!res.ok) throw new Error("Failed to fetch Zoom token");
            const { token } = await res.json();

            // Init client
            const client = ZoomVideo.createClient();
            await client.init("en-US", "Global", { patchJsMedia: true });

            // Join
            await client.join(roomName, token, userName || "User");
            clientRef.current = client;
            setJoined(true);

            // Start audio + video after a short delay for stability
            const stream = client.getMediaStream();

            try {
                await stream.startAudio();
            } catch (e) {
                console.warn("[Zoom] Audio start failed:", e);
            }

            try {
                if (videoContainerRef.current) {
                    await stream.startVideo({
                        videoElement: videoContainerRef.current,
                    });
                }
            } catch (e) {
                console.warn("[Zoom] Video start failed:", e);
            }

            if (onReady) onReady();
        } catch (err) {
            console.error("[Zoom] Join error:", err);
            setError(err.message || "Failed to join session");
        } finally {
            setLoading(false);
        }
    }, [roomName, userName, joined, loading, onReady]);

    // Leave session
    const leaveSession = useCallback(async () => {
        await cleanup();
        if (onLeave) onLeave();
    }, [cleanup, onLeave]);

    // Auto-join on mount
    useEffect(() => {
        if (roomName && !joined && !loading) {
            joinSession();
        }
        return () => {
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomName]);

    return (
        <div className="relative w-full h-full min-h-[300px] bg-black flex flex-col">
            {/* Loading overlay */}
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 gap-3">
                    <div className="w-10 h-10 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-white text-lg">Connecting to video session…</p>
                    <p className="text-slate-400 text-sm">
                        Please allow camera and microphone access
                    </p>
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 gap-3">
                    <p className="text-red-400 text-lg">Connection Error</p>
                    <p className="text-slate-400 text-sm max-w-xs text-center">{error}</p>
                    <button
                        onClick={joinSession}
                        className="mt-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all text-sm font-semibold"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Video container */}
            <div className="flex-1 relative">
                <video
                    ref={videoContainerRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                />
            </div>

            {/* Controls */}
            {joined && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
                    <button
                        onClick={leaveSession}
                        className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-rose-500/20"
                    >
                        Leave
                    </button>
                </div>
            )}
        </div>
    );
}
