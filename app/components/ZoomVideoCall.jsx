"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * ZoomVideoCall — renders self + remote videos using Zoom Video SDK.
 *
 * Uses stream.attachVideo() / detachVideo() which return <video-player>
 * custom elements that work on both desktop and mobile.
 */
export default function ZoomVideoCall({ roomName, userName, onReady, onLeave }) {
    const clientRef = useRef(null);
    const selfVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

    const [joined, setJoined] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [videoStarted, setVideoStarted] = useState(false);
    const [audioStarted, setAudioStarted] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState([]);

    // ── Cleanup ──────────────────────────────────────────────
    const cleanup = useCallback(async () => {
        const client = clientRef.current;
        if (!client) return;

        try {
            const stream = client.getMediaStream();
            try { await stream.stopVideo(); } catch (_) { }
            try { await stream.stopAudio(); } catch (_) { }

            // Detach all rendered videos
            try {
                const selfContainer = selfVideoRef.current;
                if (selfContainer) {
                    const players = selfContainer.querySelectorAll("video-player");
                    for (const p of players) { try { await stream.detachVideo(p); } catch (_) { } }
                    selfContainer.innerHTML = "";
                }
                const remoteContainer = remoteVideoRef.current;
                if (remoteContainer) {
                    const players = remoteContainer.querySelectorAll("video-player");
                    for (const p of players) { try { await stream.detachVideo(p); } catch (_) { } }
                    remoteContainer.innerHTML = "";
                }
            } catch (_) { }

            await client.leave();
        } catch (_) { }

        try { client.destroy(); } catch (_) { }
        clientRef.current = null;
        setJoined(false);
        setVideoStarted(false);
        setAudioStarted(false);
        setRemoteUsers([]);
    }, []);

    // ── Render a user's video into a container ───────────────
    const renderVideo = useCallback(async (userId, container) => {
        const client = clientRef.current;
        if (!client || !container) return;
        try {
            const stream = client.getMediaStream();
            const videoPlayer = await stream.attachVideo(userId, 3); // 3 = 720p quality
            container.innerHTML = "";
            container.appendChild(videoPlayer);
        } catch (e) {
            console.warn("[Zoom] renderVideo failed for user", userId, e);
        }
    }, []);

    // ── Stop rendering a user's video ────────────────────────
    const stopRenderVideo = useCallback(async (userId, container) => {
        const client = clientRef.current;
        if (!client || !container) return;
        try {
            const stream = client.getMediaStream();
            const players = container.querySelectorAll("video-player");
            for (const p of players) {
                try { await stream.detachVideo(p); } catch (_) { }
            }
            container.innerHTML = "";
        } catch (_) { }
    }, []);

    // ── Join session ─────────────────────────────────────────
    const joinSession = useCallback(async () => {
        if (!roomName || joined || loading) return;
        setLoading(true);
        setError(null);

        try {
            const ZoomVideo = (await import("@zoom/videosdk")).default;

            // Fetch token
            const res = await fetch(
                `/api/zoom-token?roomName=${encodeURIComponent(roomName)}&role=1`
            );
            if (!res.ok) throw new Error("Failed to fetch Zoom token");
            const { token } = await res.json();

            // Create + init
            const client = ZoomVideo.createClient();
            await client.init("en-US", "Global", { patchJsMedia: true });
            await client.join(roomName, token, userName || "User");
            clientRef.current = client;
            setJoined(true);

            const stream = client.getMediaStream();

            // ── Start audio ──
            try {
                await stream.startAudio();
                setAudioStarted(true);
            } catch (e) {
                console.warn("[Zoom] Audio start failed:", e);
            }

            // ── Start self video ──
            try {
                await stream.startVideo();
                setVideoStarted(true);
                const myUserId = client.getCurrentUserInfo().userId;
                if (selfVideoRef.current) {
                    await renderVideo(myUserId, selfVideoRef.current);
                }
            } catch (e) {
                console.warn("[Zoom] Self video start failed:", e);
            }

            // ── Render any already-present remote participants ──
            const currentUsers = client.getAllUser();
            const myId = client.getCurrentUserInfo().userId;
            const others = currentUsers.filter((u) => u.userId !== myId && u.bVideoOn);
            setRemoteUsers(currentUsers.filter((u) => u.userId !== myId));
            for (const u of others) {
                if (remoteVideoRef.current) {
                    await renderVideo(u.userId, remoteVideoRef.current);
                }
            }

            // ── Listen for remote video state changes ──
            client.on("peer-video-state-changed", async (payload) => {
                if (!clientRef.current) return;
                const { action, userId } = payload;
                if (action === "Start") {
                    if (remoteVideoRef.current) {
                        await renderVideo(userId, remoteVideoRef.current);
                    }
                } else if (action === "Stop") {
                    if (remoteVideoRef.current) {
                        await stopRenderVideo(userId, remoteVideoRef.current);
                    }
                }
            });

            // ── Listen for users joining / leaving ──
            client.on("user-added", (payload) => {
                if (!clientRef.current) return;
                const myId = clientRef.current.getCurrentUserInfo()?.userId;
                setRemoteUsers(
                    clientRef.current.getAllUser().filter((u) => u.userId !== myId)
                );
            });

            client.on("user-removed", async (payload) => {
                if (!clientRef.current) return;
                const myId = clientRef.current.getCurrentUserInfo()?.userId;
                setRemoteUsers(
                    clientRef.current.getAllUser().filter((u) => u.userId !== myId)
                );
                // Clean up removed user's video
                for (const u of payload) {
                    if (remoteVideoRef.current) {
                        await stopRenderVideo(u.userId, remoteVideoRef.current);
                    }
                }
            });

            if (onReady) onReady();
        } catch (err) {
            console.error("[Zoom] Join error:", err);
            setError(err.message || "Failed to join session");
        } finally {
            setLoading(false);
        }
    }, [roomName, userName, joined, loading, onReady, renderVideo, stopRenderVideo]);

    // ── Leave session ────────────────────────────────────────
    const leaveSession = useCallback(async () => {
        await cleanup();
        if (onLeave) onLeave();
    }, [cleanup, onLeave]);

    // ── Toggle video ─────────────────────────────────────────
    const toggleVideo = useCallback(async () => {
        const client = clientRef.current;
        if (!client) return;
        const stream = client.getMediaStream();
        if (videoStarted) {
            await stream.stopVideo();
            if (selfVideoRef.current) {
                await stopRenderVideo(client.getCurrentUserInfo().userId, selfVideoRef.current);
            }
            setVideoStarted(false);
        } else {
            await stream.startVideo();
            const myUserId = client.getCurrentUserInfo().userId;
            if (selfVideoRef.current) {
                await renderVideo(myUserId, selfVideoRef.current);
            }
            setVideoStarted(true);
        }
    }, [videoStarted, renderVideo, stopRenderVideo]);

    // ── Toggle audio ─────────────────────────────────────────
    const toggleAudio = useCallback(async () => {
        const client = clientRef.current;
        if (!client) return;
        const stream = client.getMediaStream();
        if (audioStarted) {
            await stream.muteAudio();
            setAudioStarted(false);
        } else {
            await stream.unmuteAudio();
            setAudioStarted(true);
        }
    }, [audioStarted]);

    // ── Auto-join on mount ───────────────────────────────────
    useEffect(() => {
        if (roomName && !joined && !loading) {
            joinSession();
        }
        return () => { cleanup(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomName]);

    return (
        <div className="zoom-video-root">
            {/* Loading overlay */}
            {loading && (
                <div className="zoom-overlay">
                    <div className="zoom-spinner" />
                    <p className="zoom-overlay-title">Connecting to video session…</p>
                    <p className="zoom-overlay-subtitle">
                        Please allow camera and microphone access
                    </p>
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="zoom-overlay">
                    <p className="zoom-error-title">Connection Error</p>
                    <p className="zoom-overlay-subtitle">{error}</p>
                    <button onClick={joinSession} className="zoom-retry-btn">
                        Retry
                    </button>
                </div>
            )}

            {/* ── Video grid ── */}
            <div className="zoom-video-grid">
                {/* Remote video (large / main) */}
                <div className="zoom-remote-video">
                    <div ref={remoteVideoRef} className="zoom-video-player-container" />
                    {remoteUsers.length === 0 && joined && (
                        <div className="zoom-waiting">
                            <p>Waiting for other participant…</p>
                        </div>
                    )}
                </div>

                {/* Self video (picture-in-picture) */}
                {joined && (
                    <div className="zoom-self-video">
                        <div ref={selfVideoRef} className="zoom-video-player-container" />
                        {!videoStarted && (
                            <div className="zoom-cam-off">
                                <span>Camera Off</span>
                            </div>
                        )}
                        <span className="zoom-self-label">{userName || "You"}</span>
                    </div>
                )}
            </div>

            {/* ── Controls bar ── */}
            {joined && (
                <div className="zoom-controls">
                    <button
                        onClick={toggleAudio}
                        className={`zoom-ctrl-btn ${!audioStarted ? "zoom-ctrl-off" : ""}`}
                        title={audioStarted ? "Mute" : "Unmute"}
                    >
                        {audioStarted ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22" /><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" /><path d="M5 10v2a7 7 0 0 0 12 5.12" /><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                        )}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`zoom-ctrl-btn ${!videoStarted ? "zoom-ctrl-off" : ""}`}
                        title={videoStarted ? "Stop Video" : "Start Video"}
                    >
                        {videoStarted ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" /><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10Z" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                        )}
                    </button>

                    <button onClick={leaveSession} className="zoom-leave-btn" title="Leave">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l-3.41-2.6Z" /><line x1="23" x2="1" y1="1" y2="23" /></svg>
                    </button>
                </div>
            )}

            {/* ── Scoped styles ── */}
            <style jsx>{`
        .zoom-video-root {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 300px;
          background: #0f172a;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .zoom-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          z-index: 30;
          gap: 0.75rem;
        }
        .zoom-spinner {
          width: 2.5rem;
          height: 2.5rem;
          border: 4px solid rgba(99,102,241,0.3);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .zoom-overlay-title { color: #fff; font-size: 1.125rem; }
        .zoom-overlay-subtitle { color: #94a3b8; font-size: 0.875rem; max-width: 280px; text-align: center; }
        .zoom-error-title { color: #f87171; font-size: 1.125rem; }
        .zoom-retry-btn {
          margin-top: 0.5rem;
          padding: 0.5rem 1.5rem;
          background: #4f46e5;
          color: #fff;
          border: none;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }
        .zoom-retry-btn:hover { background: #4338ca; }

        /* ── Video grid ── */
        .zoom-video-grid {
          flex: 1;
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
        }

        /* Remote = full area */
        .zoom-remote-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .zoom-video-player-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Make Zoom's <video-player> elements fill their container */
        .zoom-video-player-container :global(video-player) {
          width: 100% !important;
          height: 100% !important;
        }
        .zoom-video-player-container :global(video-player video),
        .zoom-video-player-container :global(video-player canvas) {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .zoom-waiting {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 0.875rem;
        }

        /* Self = PIP in bottom-right */
        .zoom-self-video {
          position: absolute;
          bottom: 80px;
          right: 16px;
          width: 180px;
          height: 135px;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.15);
          background: #1e293b;
          z-index: 20;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        @media (min-width: 768px) {
          .zoom-self-video {
            width: 240px;
            height: 180px;
          }
        }

        .zoom-cam-off {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1e293b;
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .zoom-self-label {
          position: absolute;
          bottom: 4px;
          left: 8px;
          color: #fff;
          font-size: 0.625rem;
          background: rgba(0,0,0,0.5);
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* ── Controls bar ── */
        .zoom-controls {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 25;
          background: rgba(15,23,42,0.8);
          backdrop-filter: blur(12px);
          padding: 8px 16px;
          border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .zoom-ctrl-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.1);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .zoom-ctrl-btn:hover { background: rgba(255,255,255,0.2); }
        .zoom-ctrl-off { background: rgba(239,68,68,0.3); color: #fca5a5; }
        .zoom-ctrl-off:hover { background: rgba(239,68,68,0.5); }

        .zoom-leave-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: #ef4444;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .zoom-leave-btn:hover { background: #dc2626; }
      `}</style>
        </div>
    );
}
