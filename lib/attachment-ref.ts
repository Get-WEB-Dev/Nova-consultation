/**
 * Private chat attachments are stored in the database as
 *   private://chat-attachments/<userId>/<random>.<ext>
 * Old messages still hold the former public URL. Both forms resolve to the
 * same storage path, so one parser handles old and new data.
 */

export const PRIVATE_PREFIX = 'private://chat-attachments/';
const LEGACY_RE = /\/storage\/v1\/object\/public\/chat-attachments\/([^?#]+)/;
const SAFE_PATH = /^[A-Za-z0-9._\-/]+$/;

export function parseAttachmentRef(value: unknown): { path: string } | null {
    if (typeof value !== 'string') return null;

    let path: string | null = null;
    if (value.startsWith(PRIVATE_PREFIX)) {
        path = value.slice(PRIVATE_PREFIX.length);
    } else {
        const m = LEGACY_RE.exec(value);
        if (m) {
            try { path = decodeURIComponent(m[1]); } catch { return null; }
        }
    }
    if (!path || path.length > 300 || path.includes('..') || path.startsWith('/') || !SAFE_PATH.test(path)) {
        return null;
    }
    return { path };
}

export const toPrivateRef = (path: string) => `${PRIVATE_PREFIX}${path}`;