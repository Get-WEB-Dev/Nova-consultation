import { describe, it, expect } from "vitest";
import { sniffFileType } from "@/lib/server/file-types";
import { parseAttachmentRef, toPrivateRef } from "@/lib/attachment-ref";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(Math.max(0, 16 - b.length)).fill(0)]);
const text = (s: string) => new TextEncoder().encode(s.padEnd(16, " "));

describe("sniffFileType (trusts the bytes, not the name)", () => {
    it("recognises real images and PDFs", () => {
        expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0))?.mime).toBe("image/jpeg");
        expect(sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47))?.mime).toBe("image/png");
        expect(sniffFileType(text("GIF89a"))?.mime).toBe("image/gif");
        expect(sniffFileType(text("%PDF-1.7"))?.kind).toBe("pdf");
        expect(sniffFileType(text("RIFF\0\0\0\0WEBPVP8 "))?.mime).toBe("image/webp");
    });
    it("tells HEIC photos from MP4 videos by brand", () => {
        expect(sniffFileType(text("\0\0\0\x18ftypheic"))?.mime).toBe("image/heic");
        expect(sniffFileType(text("\0\0\0\x18ftypisom"))?.mime).toBe("video/mp4");
    });
    it("recognises Word files", () => {
        expect(sniffFileType(bytes(0x50, 0x4b, 0x03, 0x04))?.ext).toBe("docx");
        expect(sniffFileType(bytes(0xd0, 0xcf, 0x11, 0xe0))?.ext).toBe("doc");
    });
    it("rejects HTML, SVG, scripts and tiny files, even if named .jpg", () => {
        expect(sniffFileType(text("<html><script>alert(1)</script>"))).toBeNull();
        expect(sniffFileType(text("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
        expect(sniffFileType(text("#!/bin/sh\nrm -rf /"))).toBeNull();
        expect(sniffFileType(new Uint8Array([1, 2, 3]))).toBeNull();
    });
});

describe("parseAttachmentRef", () => {
    const id = "11111111-1111-4111-8111-111111111111";

    it("parses the private form and round-trips", () => {
        expect(parseAttachmentRef(toPrivateRef(`${id}/abc.png`))).toEqual({ path: `${id}/abc.png` });
    });
    it("parses legacy public URLs so old messages keep working", () => {
        const url = "https://proj.supabase.co/storage/v1/object/public/chat-attachments/1700000000000-scan_1.pdf";
        expect(parseAttachmentRef(url)).toEqual({ path: "1700000000000-scan_1.pdf" });
        expect(parseAttachmentRef(url + "?t=1")).toEqual({ path: "1700000000000-scan_1.pdf" });
    });
    it("ignores everything that is not a chat attachment", () => {
        expect(parseAttachmentRef("blob:http://localhost/abc")).toBeNull();
        expect(parseAttachmentRef("https://ui-avatars.com/api/?name=A")).toBeNull();
        expect(parseAttachmentRef("https://proj.supabase.co/storage/v1/object/public/profile-pictures/a.png")).toBeNull();
        expect(parseAttachmentRef(undefined)).toBeNull();
    });
    it("refuses path tricks", () => {
        expect(parseAttachmentRef(toPrivateRef("../secret.png"))).toBeNull();
        expect(parseAttachmentRef(toPrivateRef("a/../../b.png"))).toBeNull();
        expect(parseAttachmentRef(toPrivateRef("/etc/passwd"))).toBeNull();
        expect(parseAttachmentRef(toPrivateRef("a b,c).png"))).toBeNull();
    });
});