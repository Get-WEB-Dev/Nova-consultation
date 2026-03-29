"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * ZoomVideoCall — renders self + remote videos using Zoom Video SDK v2.
 *
 * Key fixes (v2 upgrade):
 * - Per-user container model: each remote user gets their own <video-player-container>
 *   so multiple participants can render simultaneously and re-attach doesn't clear others
 * - Proper peer-video-state-changed handling with retry/backoff
 * - Reconnect logic on connection drop
 * - Camera permission detection
 * - Exposes state via onStateChange callback for parent components
 */
export default function ZoomVideoCall({
    roomName,
    userName,
    onReady,
    onLeave,
    onStateChange = (_state) => { }, // optional: ({ videoOn, audioOn, connectionQuality, remoteCount }) => void
}) {
    const clientRef = useRef(null);
    const selfContainerRef = useRef(null);
    const remoteGridRef = useRef(null);
    const mountedRef = useRef(true);
    const joinedRef = useRef(false);
    const remoteVideoMapRef = useRef(new Map()); // userId -> DOM container

    const [joined, setJoined] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [videoStarted, setVideoStarted] = useState(false);
    const [audioStarted, setAudioStarted] = useState(false);
    const [remoteUsers, setRemoteUsers] = useState([]);
    const [connectionQuality, setConnectionQuality] = useState("good");
    const [reconnecting, setReconnecting] = useState(false);
    const [cameraBlocked, setCameraBlocked] = useState(false);

    // Notify parent of state changes
    const emitState = useCallback((overrides = {}) => {
        if (!onStateChange) return;
        onStateChange({
            videoOn: videoStarted,
            audioOn: audioStarted,
            connectionQuality,
            remoteCount: remoteUsers.length,
            joined,
            reconnecting,
            cameraBlocked,
            ...overrides,
        });
    }, [onStateChange, videoStarted, audioStarted, connectionQuality, remoteUsers.length, joined, reconnecting, cameraBlocked]);

    useEffect(() => { emitState(); }, [videoStarted, audioStarted, connectionQuality, remoteUsers.length, joined, reconnecting, cameraBlocked]);


    // ── Cleanup ──────────────────────────────────────────────
    const cleanup = useCallback(async () => {
        mountedRef.current = false;
        const client = clientRef.current;
        if (!client) return;

        try {
            const stream = client.getMediaStream();
            try { await stream.stopVideo(); } catch (_) { }
            try { await stream.stopAudio(); } catch (_) { }
            await client.leave();
        } catch (_) { }

        try { client.destroy(); } catch (_) { }
        clientRef.current = null;
        joinedRef.current = false;
        remoteVideoMapRef.current.clear();
    }, []);

    // ── Attach a user's video to a specific container ────────
    const attachUserVideo = useCallback(async (userId, container, quality = 2, retries = 3) => {
        const client = clientRef.current;
        if (!client || !container) return false;

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const stream = client.getMediaStream();

                // Clear existing content in this container
                while (container.firstChild) {
                    try { await stream.detachVideo(container.firstChild); } catch (_) { }
                    container.removeChild(container.firstChild);
                }

                const playerElement = await stream.attachVideo(userId, quality);
                if (playerElement && container && mountedRef.current) {
                    container.appendChild(playerElement);
                    return true;
                }
            } catch (e) {
                console.warn(`[Zoom] attachUserVideo attempt ${attempt + 1} failed for user ${userId}:`, e);
                if (attempt < retries - 1) {
                    await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                }
            }
            console.log("[Zoom] Attaching video for:", userId);
        }
        return false;

    }, []);



    // ── Create or get a per-user remote video container ──────
    const getOrCreateRemoteContainer = useCallback((userId) => {
        if (remoteVideoMapRef.current.has(userId)) {
            return remoteVideoMapRef.current.get(userId);
        }
        const grid = remoteGridRef.current;
        if (!grid) return null;

        // Create a wrapper div for this user
        const wrapper = document.createElement("div");
        wrapper.className = "zoom-remote-user";
        wrapper.dataset.userId = String(userId);

        // Create the video-player-container inside
        const vpc = document.createElement("video-player-container");
        vpc.className = "zoom-vpc";
        wrapper.appendChild(vpc);

        // Add a name label
        const label = document.createElement("span");
        label.className = "zoom-remote-label";
        label.textContent = "Doctor";
        wrapper.appendChild(label);

        grid.appendChild(wrapper);
        remoteVideoMapRef.current.set(userId, vpc);
        return vpc;
    }, []);

    // ── Remove a remote user's container ─────────────────────
    const removeRemoteContainer = useCallback(async (userId) => {
        const container = remoteVideoMapRef.current.get(userId);
        if (!container) return;
        const client = clientRef.current;
        if (client) {
            try {
                const stream = client.getMediaStream();
                while (container.firstChild) {
                    try { await stream.detachVideo(container.firstChild); } catch (_) { }
                    container.removeChild(container.firstChild);
                }
            } catch (_) { }
        }
        // Remove the wrapper div
        const wrapper = container.parentElement;
        if (wrapper && wrapper.parentElement) {
            wrapper.parentElement.removeChild(wrapper);
        }
        remoteVideoMapRef.current.delete(userId);
    }, []);

    // ── Join session ─────────────────────────────────────────
    const joinSession = useCallback(async () => {
        if (!roomName || joinedRef.current || loading) return;
        setLoading(true);
        setError(null);
        setReconnecting(false);
        mountedRef.current = true;

        try {
            const ZoomVideo = (await import("@zoom/videosdk")).default;

            // Fetch token
            const res = await fetch(
                `/api/zoom-token?roomName=${encodeURIComponent(roomName)}&role=1`
            );
            if (!res.ok) throw new Error("Failed to fetch Zoom token");
            const { token } = await res.json();

            // Create + init with desktop rendering support
            const client = ZoomVideo.createClient();
            await client.init("en-US", "Global", {
                patchJsMedia: true,
                enforceMultipleVideos: true,
                enforceVirtualBackground: false,
            });

            await client.join(roomName, token, userName || "User");
            clientRef.current = client;
            joinedRef.current = true;
            if (mountedRef.current) setJoined(true);

            const stream = client.getMediaStream();

            // ── Start audio ──
            try {
                await stream.startAudio();
                if (mountedRef.current) setAudioStarted(true);
            } catch (e) {
                console.warn("[Zoom] Audio start:", e);
            }

            // ── Start self video (slight delay for stability) ──
            await new Promise((r) => setTimeout(r, 300));
            try {
                await stream.startVideo();
                if (mountedRef.current) {
                    setVideoStarted(true);
                    setCameraBlocked(false);
                }
                const myUserId = client.getCurrentUserInfo().userId;
                if (selfContainerRef.current) {
                    await attachUserVideo(myUserId, selfContainerRef.current, 2);
                }
            } catch (e) {
                console.warn("[Zoom] Self video start:", e);
                // Detect camera permission block
                const msg = String(e?.message || e || "").toLowerCase();
                if (msg.includes("permission") || msg.includes("notallowed") || msg.includes("denied")) {
                    if (mountedRef.current) setCameraBlocked(true);
                }
            }

            // ── Render already-present remote participants ──
            const allUsers = client.getAllUser();
            const myId = client.getCurrentUserInfo().userId;
            const others = allUsers.filter((u) => u.userId !== myId);
            // 🔥 FORCE SYNC (fix missing remote video)
            setTimeout(async () => {
                const users = client.getAllUser();
                const myId = client.getCurrentUserInfo().userId;

                for (const u of users) {
                    if (u.userId !== myId) {
                        const container = getOrCreateRemoteContainer(u.userId);
                        if (container) {
                            await attachUserVideo(u.userId, container, 2);
                        }
                    }
                }
            }, 1000);
            if (mountedRef.current) setRemoteUsers(others);
            for (const u of others) {
                if (u.bVideoOn) {
                    const container = getOrCreateRemoteContainer(u.userId);
                    if (container) {
                        await attachUserVideo(u.userId, container, 2);
                    }
                }
            }

            // ── Event: remote video state changed ──
            client.on("peer-video-state-changed", async (payload) => {
                if (!clientRef.current || !mountedRef.current) return;
                const { action, userId } = payload;
                if (action === "Start") {
                    const container = getOrCreateRemoteContainer(userId);
                    if (container) {
                        setTimeout(() => {
                            attachUserVideo(userId, container, 2);
                        }, 300);
                    }
                }
                else if (action === "Stop") {
                    // Don't remove the container, just detach video (camera off overlay will show)
                    const container = remoteVideoMapRef.current.get(userId);
                    if (container && clientRef.current) {
                        try {
                            const stream = clientRef.current.getMediaStream();
                            while (container.firstChild) {
                                try { await stream.detachVideo(container.firstChild); } catch (_) { }
                                container.removeChild(container.firstChild);
                            }
                        } catch (_) { }
                    }
                }
            });

            // ── Event: user joined ──
            client.on("user-added", async (payload) => {
                if (!clientRef.current || !mountedRef.current) return;

                const myId = clientRef.current.getCurrentUserInfo()?.userId;

                for (const u of payload) {
                    if (u.userId !== myId) {
                        const container = getOrCreateRemoteContainer(u.userId);

                        if (container) {
                            setTimeout(() => {
                                attachUserVideo(u.userId, container, 2);
                            }, 300);
                        }
                    }
                }

                const others = clientRef.current.getAllUser().filter((u) => u.userId !== myId);
                setRemoteUsers([...others]);
            });

            // ── Event: user left ──
            client.on("user-removed", async (payload) => {
                if (!clientRef.current || !mountedRef.current) return;
                // Remove containers for departed users
                for (const u of payload) {
                    await removeRemoteContainer(u.userId);
                }
                const myId = clientRef.current.getCurrentUserInfo()?.userId;
                setRemoteUsers(
                    clientRef.current.getAllUser().filter((u) => u.userId !== myId)
                );
            });

            // ── Event: connection quality change ──
            client.on("connection-change", (payload) => {
                if (!mountedRef.current) return;
                const { state } = payload;
                if (state === "Fail" || state === "Closed") {
                    setConnectionQuality("poor");
                    setReconnecting(false);
                } else if (state === "Reconnecting") {
                    setConnectionQuality("reconnecting");
                    setReconnecting(true);
                } else if (state === "Connected") {
                    setConnectionQuality("good");
                    setReconnecting(false);
                } else {
                    setConnectionQuality("good");
                    setReconnecting(false);
                }
            });

            if (onReady) onReady();
        } catch (err) {
            console.error("[Zoom] Join error:", err);
            if (mountedRef.current) {
                setError(err.message || "Failed to join session");
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    }, [roomName, userName, loading, onReady, attachUserVideo, getOrCreateRemoteContainer, removeRemoteContainer]);

    // ── Leave session ────────────────────────────────────────
    const leaveSession = useCallback(async () => {
        await cleanup();
        if (onLeave) onLeave();
    }, [cleanup, onLeave]);

    // ── Toggle video ─────────────────────────────────────────
    const toggleVideo = useCallback(async () => {
        const client = clientRef.current;
        if (!client) return;
        try {
            const stream = client.getMediaStream();
            if (videoStarted) {
                await stream.stopVideo();
                if (selfContainerRef.current) {
                    while (selfContainerRef.current.firstChild) {
                        try { await stream.detachVideo(selfContainerRef.current.firstChild); } catch (_) { }
                        selfContainerRef.current.removeChild(selfContainerRef.current.firstChild);
                    }
                }
                setVideoStarted(false);
            } else {
                await stream.startVideo();
                const myUserId = client.getCurrentUserInfo().userId;
                if (selfContainerRef.current) {
                    await attachUserVideo(myUserId, selfContainerRef.current, 2);
                }
                setVideoStarted(true);
                setCameraBlocked(false);
            }
        } catch (e) {
            console.warn("[Zoom] toggleVideo:", e);
            const msg = String(e?.message || e || "").toLowerCase();
            if (msg.includes("permission") || msg.includes("notallowed") || msg.includes("denied")) {
                setCameraBlocked(true);
            }
        }
    }, [videoStarted, attachUserVideo]);

    // ── Toggle audio ─────────────────────────────────────────
    const toggleAudio = useCallback(async () => {
        const client = clientRef.current;
        if (!client) return;
        try {
            const stream = client.getMediaStream();
            if (audioStarted) {
                await stream.muteAudio();
                setAudioStarted(false);
            } else {
                await stream.unmuteAudio();
                setAudioStarted(true);
            }
        } catch (e) {
            console.warn("[Zoom] toggleAudio:", e);
        }
    }, [audioStarted]);

    // ── Auto-join on mount ───────────────────────────────────
    useEffect(() => {
        mountedRef.current = true;
        if (roomName && !joinedRef.current) {
            joinSession();
        }
        return () => {
            mountedRef.current = false;
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomName]);

    // 🔥 CONTINUOUS VIDEO SYNC (CRITICAL FIX)
    useEffect(() => {
        const interval = setInterval(() => {
            const client = clientRef.current;
            if (!client) return;

            try {
                const users = client.getAllUser();
                const myId = client.getCurrentUserInfo()?.userId;

                users.forEach(async (u) => {
                    if (u.userId !== myId) {
                        const container = getOrCreateRemoteContainer(u.userId);

                        // If container exists but no video attached → fix it
                        if (container && container.childElementCount === 0) {
                            await attachUserVideo(u.userId, container, 2);
                        }
                    }
                });
            } catch (e) {
                console.warn("[Zoom] sync loop error:", e);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [attachUserVideo, getOrCreateRemoteContainer]);

    // ── Connection quality dot color ─────────────────────────
    const qualityColor = connectionQuality === "good"
        ? "#10b981"
        : connectionQuality === "reconnecting"
            ? "#f59e0b"
            : "#ef4444";

    return (
        <div className="zoom-root">
            {/* Loading */}
            {loading && (
                <div className="zoom-overlay">
                    <div className="zoom-spinner" />
                    <p className="zoom-title">Connecting to video session…</p>
                    <p className="zoom-sub">Please allow camera and microphone access</p>
                </div>
            )}

            {/* Error */}
            {error && !loading && (
                <div className="zoom-overlay">
                    <p className="zoom-err">Connection Error</p>
                    <p className="zoom-sub">{error}</p>
                    <button onClick={() => { joinedRef.current = false; joinSession(); }} className="zoom-retry">
                        Retry
                    </button>
                </div>
            )}

            {/* Reconnecting overlay */}
            {reconnecting && !loading && (
                <div className="zoom-reconnecting">
                    <div className="zoom-spinner-sm" />
                    <span>Reconnecting…</span>
                </div>
            )}

            {/* Video grid */}
            <div className="zoom-grid">
                {/* Remote video area — per-user containers are appended here dynamically */}
                <div className="zoom-remote" ref={remoteGridRef}>
                    {/* Connection quality indicator */}
                    {joined && (
                        <div className="zoom-quality">
                            <span className="zoom-quality-dot" style={{ background: qualityColor }} />
                            <span className="zoom-quality-text">
                                {connectionQuality === "good" ? "Connected" : connectionQuality === "reconnecting" ? "Reconnecting…" : "Poor connection"}
                            </span>
                        </div>
                    )}

                    {/* "Waiting for doctor" state */}
                    {remoteUsers.length === 0 && joined && !loading && (
                        <div className="zoom-waiting">
                            <div className="zoom-waiting-pulse">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <p className="zoom-waiting-title">Doctor is connecting…</p>
                            <p className="zoom-waiting-sub">Please wait while the doctor joins the session</p>
                            <div className="zoom-waiting-dots">
                                <span style={{ animationDelay: "0ms" }} />
                                <span style={{ animationDelay: "200ms" }} />
                                <span style={{ animationDelay: "400ms" }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Camera blocked warning */}
                {cameraBlocked && joined && (
                    <div className="zoom-cam-blocked">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
                            <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10Z" />
                            <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                        <span>Camera access denied. Check browser permissions.</span>
                    </div>
                )}

                {/* Self video (PIP) */}
                {joined && (
                    <div className="zoom-self">
                        <video-player-container ref={selfContainerRef} class="zoom-vpc" />
                        {!videoStarted && (
                            <div className="zoom-cam-off">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
                                    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10Z" />
                                    <line x1="2" x2="22" y1="2" y2="22" />
                                </svg>
                                <span>Camera Off</span>
                            </div>
                        )}
                        <span className="zoom-self-label">{userName || "You"}</span>
                    </div>
                )}
            </div>

            {/* Controls */}
            {joined && (
                <div className="zoom-controls">
                    <button
                        onClick={toggleAudio}
                        className={`zoom-btn ${!audioStarted ? "zoom-btn-off" : ""}`}
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
                        className={`zoom-btn ${!videoStarted ? "zoom-btn-off" : ""}`}
                        title={videoStarted ? "Stop Video" : "Start Video"}
                    >
                        {videoStarted ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" /><path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10Z" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                        )}
                    </button>

                    <button onClick={leaveSession} className="zoom-btn-leave" title="Leave">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l-3.41-2.6Z" /><line x1="23" x2="1" y1="1" y2="23" /></svg>
                    </button>
                </div>
            )}

            <style jsx global>{`
        /* Force Zoom SDK custom elements to fill containers */
        video-player-container {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }
        video-player-container video-player {
          width: 100% !important;
          height: 100% !important;
        }
        video-player-container video-player video,
        video-player-container video-player canvas {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>

            <style jsx>{`
        .zoom-root {
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
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: #0f172a; z-index: 30; gap: 0.75rem;
        }
        .zoom-spinner {
          width: 2.5rem; height: 2.5rem;
          border: 4px solid rgba(99,102,241,0.3); border-top-color: #6366f1;
          border-radius: 50%; animation: zspin 0.8s linear infinite;
        }
        .zoom-spinner-sm {
          width: 1.25rem; height: 1.25rem;
          border: 3px solid rgba(245,158,11,0.3); border-top-color: #f59e0b;
          border-radius: 50%; animation: zspin 0.8s linear infinite;
        }
        @keyframes zspin { to { transform: rotate(360deg); } }
        .zoom-title { color: #fff; font-size: 1.125rem; }
        .zoom-sub { color: #94a3b8; font-size: 0.875rem; max-width: 280px; text-align: center; }
        .zoom-err { color: #f87171; font-size: 1.125rem; }
        .zoom-retry {
          margin-top: 0.5rem; padding: 0.5rem 1.5rem;
          background: #4f46e5; color: #fff; border: none; border-radius: 0.75rem;
          font-size: 0.875rem; font-weight: 600; cursor: pointer;
        }
        .zoom-retry:hover { background: #4338ca; }

        .zoom-reconnecting {
          position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
          display: flex; align-items: center; gap: 8px; z-index: 35;
          background: rgba(245,158,11,0.15); backdrop-filter: blur(12px);
          border: 1px solid rgba(245,158,11,0.3);
          padding: 6px 16px; border-radius: 20px;
          color: #fbbf24; font-size: 0.75rem; font-weight: 500;
        }

        .zoom-grid {
          flex: 1; position: relative; width: 100%; height: 100%; min-height: 0;
        }
        .zoom-remote {
          position: absolute; inset: 0; width: 100%; height: 100%;
          display: flex; flex-wrap: wrap;
        }
          .zoom-remote-user {
  width: 100%;
  height: 100%;
  min-height: 300px;
  display: flex;
}

.zoom-vpc {
  width: 100%;
  height: 100%;
  background: black;
}
        :global(.zoom-remote-user) {
          flex: 1 1 100%;
          position: relative;
          min-width: 0; min-height: 0;
        }
        .zoom-vpc {
          display: block; width: 100%; height: 100%;
        }
        :global(.zoom-remote-label) {
          position: absolute; bottom: 8px; left: 12px;
          color: #fff; font-size: 0.7rem; font-weight: 500;
          background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 6px;
          z-index: 10;
        }
        .zoom-waiting {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: #64748b; gap: 12px; z-index: 5;
        }
        .zoom-waiting-pulse {
          animation: zpulse 2s ease-in-out infinite;
          opacity: 0.5;
        }
        @keyframes zpulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        .zoom-waiting-title {
          color: #cbd5e1; font-size: 1rem; font-weight: 600;
        }
        .zoom-waiting-sub {
          color: #64748b; font-size: 0.8rem; max-width: 240px; text-align: center;
        }
        .zoom-waiting-dots {
          display: flex; gap: 6px;
        }
        .zoom-waiting-dots span {
          width: 6px; height: 6px; border-radius: 50%;
          background: #6366f1; animation: zdot 1.2s ease-in-out infinite;
        }
        @keyframes zdot { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        .zoom-quality {
          position: absolute; top: 12px; left: 12px;
          display: flex; align-items: center; gap: 6px;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
          padding: 4px 10px; border-radius: 20px; z-index: 15;
        }
        .zoom-quality-dot {
          width: 8px; height: 8px; border-radius: 50%;
          display: inline-block; flex-shrink: 0;
        }
        .zoom-quality-text {
          color: #e2e8f0; font-size: 0.625rem; font-weight: 500;
        }

        .zoom-cam-blocked {
          position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
          display: flex; align-items: center; gap: 8px;
          background: rgba(239,68,68,0.15); backdrop-filter: blur(12px);
          border: 1px solid rgba(239,68,68,0.3);
          padding: 8px 16px; border-radius: 12px; z-index: 25;
          color: #fca5a5; font-size: 0.75rem;
        }

        .zoom-self {
          position: absolute; bottom: 80px; right: 16px;
          width: 160px; height: 120px;
          border-radius: 12px; overflow: hidden;
          border: 2px solid rgba(255,255,255,0.15);
          background: #1e293b; z-index: 20;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          transition: all 0.3s ease;
        }
        .zoom-self:hover {
          border-color: rgba(255,255,255,0.3);
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        }
        @media (min-width: 768px) {
          .zoom-self { width: 220px; height: 165px; }
        }
        @media (min-width: 1280px) {
          .zoom-self { width: 280px; height: 210px; }
        }
        .zoom-cam-off {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
          background: #1e293b; color: #94a3b8; font-size: 0.7rem;
        }
        .zoom-self-label {
          position: absolute; bottom: 4px; left: 8px;
          color: #fff; font-size: 0.6rem;
          background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px;
        }

        .zoom-controls {
          position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
          display: flex; align-items: center; gap: 12px; z-index: 25;
          background: rgba(15,23,42,0.85); backdrop-filter: blur(16px);
          padding: 8px 20px; border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .zoom-btn {
          width: 44px; height: 44px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.1); color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .zoom-btn:hover { background: rgba(255,255,255,0.2); }
        .zoom-btn-off { background: rgba(239,68,68,0.3); color: #fca5a5; }
        .zoom-btn-off:hover { background: rgba(239,68,68,0.5); }
        .zoom-btn-leave {
          width: 44px; height: 44px; border-radius: 50%; border: none;
          background: #ef4444; color: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .zoom-btn-leave:hover { background: #dc2626; }
      `}</style>
        </div>
    );
}
