/**
 * GET /api/notifications/preferences   → { data: { mutedTypes: string[] } }
 * PUT /api/notifications/preferences   body: { mutedTypes: string[] }
 * Only some categories can be muted. Consultation requests and system alerts are always on.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const MUTABLE_TYPES = ['chat', 'comment', 'follow_up', 'consultation_complete', 'saved_doctor_online', 'doctor_available'];

export async function GET(req: Request) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;
    try {
        const admin: any = createAdminClient();
        const { data, error } = await admin.from('notification_preferences').select('muted_types').eq('user_id', auth.user.id).maybeSingle();
        if (error) throw error;
        return NextResponse.json({ data: { mutedTypes: data?.muted_types ?? [] } });
    } catch (err: any) {
        const missing = /notification_preferences|relation|does not exist/i.test(err.message);
        if (!missing) console.error('[notification prefs GET]', err.message);
        return NextResponse.json({ data: { mutedTypes: [] }, needsMigration: missing });
    }
}

export async function PUT(req: Request) {
    const auth = await requireUser(req);
    if (auth.error) return auth.error;

    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
    if (!Array.isArray(body?.mutedTypes)) return NextResponse.json({ error: 'mutedTypes must be a list' }, { status: 400 });

    // Keep only categories that are allowed to be muted
    const mutedTypes = Array.from(new Set(body.mutedTypes.filter((t: unknown) => typeof t === 'string' && MUTABLE_TYPES.includes(t as string))));

    try {
        const admin: any = createAdminClient();
        const { error } = await admin.from('notification_preferences')
            .upsert({ user_id: auth.user.id, muted_types: mutedTypes, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) throw error;
        return NextResponse.json({ data: { mutedTypes } });
    } catch (err: any) {
        console.error('[notification prefs PUT]', err.message);
        const missing = /notification_preferences|relation|does not exist/i.test(err.message);
        return NextResponse.json({ error: missing ? 'Run the notifications SQL in Supabase first.' : 'Could not save your preferences' }, { status: 500 });
    }
}