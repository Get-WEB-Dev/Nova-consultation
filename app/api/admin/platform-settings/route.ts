import { NextResponse } from 'next/server';
import { requireUser, requireSuperAdmin } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin-queries';
import { SETTING_KEYS, getSettings, setSetting, type SettingKey } from '@/lib/server/platform-settings';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    return NextResponse.json({ data: await getSettings(), canEdit: !!auth.user.isSuperAdmin });
}

// Changing platform behaviour is a super-admin decision
export async function PUT(req: Request) {
    const auth = await requireSuperAdmin(req);
    if (auth.error) return auth.error;
    try {
        const { key, value } = await req.json();
        if (!(SETTING_KEYS as readonly string[]).includes(key)) return fail('Unknown setting');
        if (typeof value !== 'boolean') return fail('This setting must be on or off');
        await setSetting(key as SettingKey, value, auth.user.id);
        await logAdminAction(auth.user, 'settings.changed', 'settings', auth.user.id, `${key} → ${value ? 'on' : 'off'}`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        const missing = /platform_settings|does not exist/i.test(err.message);
        return fail(missing ? 'Run the Phase 2 SQL (platform_settings table is missing).' : err.message, 500);
    }
}