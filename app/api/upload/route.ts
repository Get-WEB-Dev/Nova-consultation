import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const bucket = formData.get('bucket') as string || 'chat-attachments';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
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
