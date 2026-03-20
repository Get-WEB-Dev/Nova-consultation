"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface JitsiWrapperProps {
    roomName: string;
    displayName: string;
    onReady?: () => void;
    onReadyToClose?: () => void;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

export default function JitsiWrapper({
    roomName,
    displayName,
    onReady,
    onReadyToClose,
}: JitsiWrapperProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // We do not want to re-initialize if it's already there and we are in the same room.
        // In React 18 strict mode + fast refresh, this effect can be called twice rapidly.
        if (apiRef.current) return;

        const initJitsi = () => {
            if (!mounted) return;
            if (apiRef.current) return;
            if (!containerRef.current) return;

            console.log("[JITSI] Initializing for room:", roomName);
            try {
                const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
                    roomName,
                    parentNode: containerRef.current,
                    width: "100%",
                    height: "100%",
                    configOverrides: {
                        startWithAudioMuted: true, // Start muted to avoid gum.timeout on same device testing
                        startWithVideoMuted: true,
                        disableDeepLinking: true,
                        prejoinPageEnabled: false,
                        enableClosePage: false,
                        disableInviteFunctions: true,
                        p2p: { enabled: true },
                        toolbarButtons: [
                            "microphone",
                            "camera",
                            "desktop",
                            "fullscreen",
                            "tileview",
                            "settings",
                            "filmstrip",
                        ],
                    },
                    interfaceConfigOverrides: {
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_WATERMARK_FOR_GUESTS: false,
                        SHOW_BRAND_WATERMARK: false,
                        TOOLBAR_ALWAYS_VISIBLE: true,
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                        FILM_STRIP_MAX_HEIGHT: 120,
                        TOOLBAR_TIMEOUT: 10000,
                    },
                    userInfo: {
                        displayName,
                    },
                });

                // Event listeners for debugging and state updates
                api.addEventListener("videoConferenceJoined", () => {
                    console.log("[JITSI] videoConferenceJoined (Role:", displayName, ")");
                    if (mounted) {
                        setLoading(false);
                        if (onReady) onReady();
                    }
                });

                api.addEventListener("participantJoined", (p: any) => {
                    console.log("[JITSI] participantJoined:", p);
                });

                api.addEventListener("connectionFailed", (e: any) => {
                    console.error("[JITSI] connectionFailed:", e);
                });

                if (onReadyToClose) {
                    api.addListener("readyToClose", onReadyToClose);
                }

                apiRef.current = api;
            } catch (e) {
                console.error("[JITSI] Init error:", e);
                if (mounted) setLoading(false);
            }
        };

        if (window.JitsiMeetExternalAPI) {
            initJitsi();
        } else {
            console.log("[JITSI] Loading external API script...");
            const script = document.createElement("script");
            script.src = "https://meet.jit.si/external_api.js";
            script.async = true;
            script.onload = () => {
                if (mounted) initJitsi();
            };
            script.onerror = () => {
                console.error("[JITSI] Failed to load Jitsi script");
                if (mounted) setLoading(false);
            };
            document.head.appendChild(script);
        }

        return () => {
            mounted = false;
            if (apiRef.current) {
                console.log("[JITSI] Disposing API for room:", roomName);
                try {
                    apiRef.current.dispose();
                } catch (e) {
                    console.error("[JITSI] Error disposing:", e);
                }
                apiRef.current = null;
            }
        };
        // React 18 strict mode + hooks best practices: we bind to roomName and displayName.
        // As long as those don't change, we init once and dispose on true unmount.
    }, [roomName, displayName, onReady, onReadyToClose]);

    return (
        <div className="relative w-full h-full min-h-[300px] bg-black">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-10 gap-3">
                    <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
                    <p className="text-white text-lg">Loading video session…</p>
                    <p className="text-slate-400 text-sm">
                        Please allow camera and microphone access
                    </p>
                </div>
            )}
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
}
