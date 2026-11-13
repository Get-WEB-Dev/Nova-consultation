import { NextResponse } from 'next/server';
import { requireUser, requireSuperAdmin } from '@/lib/server/auth';
import { logAdminAction } from '@/lib/server/admin-queries';
import { countSuperAdmins } from '@/lib/server/admin-access';
import { SETTING_KEYS, getSettingsStatus, setSetting, classifySettingsError, type SettingKey } from '@/lib/server/platform-settings';

export const dynamic = 'force-dynamic';
const fail = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

// Everything the Settings card needs, including WHY it might not be changeable
export async function GET(req: Request) {
    const auth = await requireUser(req, ['admin']);
    if (auth.error) return auth.error;
    const [{ settings, problem }, superAdminCount] = await Promise.all([getSettingsStatus(), countSuperAdmins().catch(() => 0)]);
    return NextResponse.json({ data: settings, canEdit: !!auth.user.isSuperAdmin, problem, superAdminCount });
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
        const problem = classifySettingsError(err.message ?? '');
        const text = problem.code === 'read_failed' ? err.message : problem.message;
        return fail(text, 500);
    }
}