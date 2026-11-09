import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/client';
import { getAuthUser } from '@/lib/server/auth';
import { sniffFileType, type DetectedFile } from '@/lib/server/file-types';
import { toPrivateRef } from '@/lib/attachment-ref';

const MB = 1024 * 1024;

interface BucketRule {
    /** Private buckets are never reachable by URL; files are opened through signed links */
    isPrivate: boolean;
    maxBytes: number;
    kinds: DetectedFile['kind'][];
}

// Only these buckets can be written to through this endpoint, with strict rules.
const BUCKETS: Record<string, BucketRule> = {
    'chat-attachments': { isPrivate: true, maxBytes: 20 * MB, kinds: ['image', 'pdf', 'document'] },
    'profile-pictures': { isPrivate: false, maxBytes: 5 * MB, kinds: ['image'] },
    'doctor-assets': { isPrivate: false, maxBytes: 10 * MB, kinds: ['image', 'pdf'] },
    'blog-media': { isPrivate: false, maxBytes: 50 * MB, kinds: ['image', 'video'] },
};
// Doctor sign-up uploads a profile picture BEFORE the account exists.
const ANONYMOUS_BUCKET = 'profile-pictures';

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req).catch(() => null);

        let formData: FormData;
        try {
            formData = await req.formData();
        } catch {
            return fail('Expected multipart form data');
        }
        const file = formData.get('file');
        const bucket = (formData.get('bucket') as string) || 'chat-attachments';
        const rule = BUCKETS[bucket];

        if (!(file instanceof File)) return fail('No file provided');
        if (!rule) return fail('Invalid bucket');
        if (!user && bucket !== ANONYMOUS_BUCKET) return fail('Authentication required', 401);
        if (file.size === 0) return fail('The file is empty');
        if (file.size > rule.maxBytes) {
            return fail(`File too large (max ${Math.round(rule.maxBytes / MB)} MB)`, 413);
        }

        // Decide the type from the file's real bytes, never from its name or declared type
        const bytes = new Uint8Array(await file.arrayBuffer());
        const detected = sniffFileType(bytes);
        if (!detected || !rule.kinds.includes(detected.kind)) {
            return fail('This file type is not allowed. Use a photo, a PDF or a Word document.', 415);
        }

        const admin = createAdminClient();
        try {
            await admin.storage.createBucket(bucket, { public: !rule.isPrivate });
        } catch {
            // Bucket already exists (normal)
        }

        // Random, unguessable name inside a per-user folder; the original name is never used as a path
        const path = `${user?.id ?? 'anon'}/${randomUUID()}.${detected.ext}`;
        const { error } = await admin.storage.from(bucket).upload(path, bytes, {
            contentType: detected.mime,
            cacheControl: '3600',
            upsert: false,
        });
        if (error) {
            console.error('[upload POST] storage error:', error.message);
            return fail('Upload failed. Please try again.', 500);
        }

        const url = rule.isPrivate
            ? toPrivateRef(path)
            : admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;

        return NextResponse.json({
            url,
            name: file.name.slice(0, 200),
            type: detected.mime,
            size: file.size,
        });
    } catch (err: any) {
        console.error('[upload POST] unexpected:', err.message);
        return fail('Internal server error', 500);
    }
}