import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';
import { getAuthUser } from '@/lib/server/auth';

// Only these buckets can be written to through this endpoint.
const ALLOWED_BUCKETS = ['chat-attachments', 'profile-pictures', 'blog-media', 'doctor-assets'];
// Doctor sign-up uploads a profile picture BEFORE the account exists, so this
// one bucket also accepts anonymous image uploads (small images only).
const ANONYMOUS_BUCKET = 'profile-pictures';
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_ANON_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req).catch(() => null);

        let formData: FormData;
        try {
            formData = await req.formData();
        } catch {
            return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
        }
        const file = formData.get('file');
        const bucket = (formData.get('bucket') as string) || 'chat-attachments';

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        if (!ALLOWED_BUCKETS.includes(bucket)) {
            return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
        }
        if (!user) {
            if (bucket !== ANONYMOUS_BUCKET) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }
            if (!file.type.startsWith('image/') || file.size > MAX_ANON_BYTES) {
                return NextResponse.json({ error: 'Only images up to 5 MB are allowed' }, { status: 400 });
            }
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'File too large' }, { status: 413 });
        }

        const admin = createAdminClient();

        // Ensure bucket exists (best effort)
        try {
            await admin.storage.createBucket(bucket, { public: true });
        } catch (err) {
            // Bucket probably already exists
        }

        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const { data, error } = await admin.storage
            .from(bucket)
            .upload(filename, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('[upload POST] storage error:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { data: urlData } = admin.storage
            .from(bucket)
            .getPublicUrl(filename);

        return NextResponse.json({
            url: urlData.publicUrl,
            name: file.name,
            type: file.type,
            size: file.size
        });
    } catch (err: any) {
        console.error('[upload POST] unexpected:', err.message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
