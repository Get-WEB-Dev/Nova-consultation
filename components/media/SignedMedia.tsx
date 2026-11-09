"use client";

import { useEffect, useState } from "react";
import type { AnchorHTMLAttributes, ImgHTMLAttributes, MouseEvent } from "react";
import { parseAttachmentRef } from "@/lib/attachment-ref";

/**
 * Private chat files cannot be opened by their stored address. These helpers
 * ask the server for a short-lived link first. Anything that is not a private
 * chat file (blob: previews, avatars, other images) is shown untouched.
 */

const cache = new Map<string, { url: string; expires: number }>();
const inflight = new Map<string, Promise<string>>();

export function resolveAttachmentUrl(src: string): Promise<string> {
    const ref = parseAttachmentRef(src);
    if (!ref) return Promise.resolve(src);

    const hit = cache.get(ref.path);
    if (hit && hit.expires > Date.now()) return Promise.resolve(hit.url);

    let pending = inflight.get(ref.path);
    if (!pending) {
        pending = fetch(`/api/attachments/sign?ref=${encodeURIComponent(src)}`)
            .then(async (res) => {
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json.url) throw new Error(json.error || "Could not open this file");
                // The link lives 5 minutes on the server; reuse it for 4
                cache.set(ref.path, { url: json.url, expires: Date.now() + 4 * 60_000 });
                return json.url as string;
            })
            .finally(() => inflight.delete(ref.path));
        inflight.set(ref.path, pending);
    }
    return pending;
}

/** Drop-in replacement for <img> */
export function SignedImg({ src, alt = "", ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
    const isPrivate = !!parseAttachmentRef(src);
    const [url, setUrl] = useState<string | null>(isPrivate ? null : src);

    useEffect(() => {
        let alive = true;
        if (!parseAttachmentRef(src)) {
            setUrl(src);
            return;
        }
        setUrl(null);
        resolveAttachmentUrl(src)
            .then((u) => { if (alive) setUrl(u); })
            .catch(() => { if (alive) setUrl(null); });
        return () => { alive = false; };
    }, [src]);

    if (!url) {
        return <span className={rest.className} aria-busy="true" style={{ display: "inline-block", minWidth: 48, minHeight: 48 }} />;
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} {...rest} />;
}

/** Drop-in replacement for <a> that opens a file */
export function SignedLink({ href, children, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
    const handleClick = async (e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (!href || !parseAttachmentRef(href)) return; // ordinary link: let the browser handle it
        e.preventDefault();
        const win = window.open("", "_blank"); // open now so pop-up blockers allow it
        if (win) win.opener = null;
        try {
            const url = await resolveAttachmentUrl(href);
            if (win) win.location.href = url;
            else window.location.href = url;
        } catch {
            win?.close();
            alert("Could not open this file. Please try again.");
        }
    };
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...rest} onClick={handleClick}>
            {children}
        </a>
    );
}