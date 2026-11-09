/**
 * Detect what a file REALLY is by reading its first bytes.
 * The browser-supplied `file.type` and the file name are chosen by the user,
 * so an attacker can call an .html file "photo.jpg". The first bytes cannot lie.
 */

export interface DetectedFile {
    mime: string;
    ext: string;
    kind: 'image' | 'pdf' | 'document' | 'video';
}

const ascii = (b: Uint8Array, from: number, to: number) =>
    String.fromCharCode(...Array.from(b.slice(from, to)));

export function sniffFileType(bytes: Uint8Array): DetectedFile | null {
    if (bytes.length < 12) return null;

    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg', kind: 'image' };
    if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === 'PNG') return { mime: 'image/png', ext: 'png', kind: 'image' };
    if (ascii(bytes, 0, 4) === 'GIF8') return { mime: 'image/gif', ext: 'gif', kind: 'image' };
    if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp', kind: 'image' };
    if (ascii(bytes, 0, 4) === '%PDF') return { mime: 'application/pdf', ext: 'pdf', kind: 'pdf' };

    // MP4 / HEIC share the "ftyp" box; the brand tells them apart
    if (ascii(bytes, 4, 8) === 'ftyp') {
        const brand = ascii(bytes, 8, 12);
        if (['heic', 'heix', 'hevc', 'mif1', 'heif', 'msf1'].includes(brand)) {
            return { mime: 'image/heic', ext: 'heic', kind: 'image' };
        }
        return { mime: 'video/mp4', ext: 'mp4', kind: 'video' };
    }
    if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
        return { mime: 'video/webm', ext: 'webm', kind: 'video' };
    }
    // Old Word files (OLE container)
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
        return { mime: 'application/msword', ext: 'doc', kind: 'document' };
    }
    // .docx is a zip file ("PK")
    if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
        return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx', kind: 'document' };
    }
    return null; // SVG, HTML, scripts, executables... all land here and get rejected
}