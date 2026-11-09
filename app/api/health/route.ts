import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

/**
 * Public uptime check for monitors (UptimeRobot, BetterStack...).
 * Reveals nothing except "up" or "down".
 */
export async function GET() {
    try {
        const admin: any = createAdminClient();
        const { error } = await admin.from('users').select('id', { head: true, count: 'exact' }).limit(1);
        if (error) throw error;
        return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}