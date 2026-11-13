import { createAdminClient } from '@/lib/supabase/client';

/** Only settings the app really enforces belong here. */
export const SETTING_KEYS = ['registrations_open'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

const DEFAULTS: Record<SettingKey, boolean> = { registrations_open: true };

export interface SettingsProblem {
    code: 'table_missing' | 'schema_cache' | 'read_failed';
    message: string;
}

/** Turns a raw database error into something an admin can act on. */
export function classifySettingsError(raw: string): SettingsProblem {
    if (/schema cache/i.test(raw)) {
        return {
            code: 'schema_cache',
            message: "The table exists but the API has not noticed it yet. Run  notify pgrst, 'reload schema';  in the Supabase SQL editor, then reload this page.",
        };
    }
    if (/does not exist|relation|not find the table/i.test(raw)) {
        return { code: 'table_missing', message: 'The platform_settings table has not been created yet.' };
    }
    return { code: 'read_failed', message: raw };
}

/** Current settings, plus a problem description when they could not be read. */
export async function getSettingsStatus(): Promise<{ settings: Record<SettingKey, boolean>; problem: SettingsProblem | null }> {
    const settings = { ...DEFAULTS };
    try {
        const { data, error } = await (createAdminClient() as any).from('platform_settings').select('key, value');
        if (error) return { settings, problem: classifySettingsError(error.message ?? String(error)) };
        for (const row of data ?? []) {
            if ((SETTING_KEYS as readonly string[]).includes(row.key) && typeof row.value === 'boolean') {
                settings[row.key as SettingKey] = row.value;
            }
        }
        return { settings, problem: null };
    } catch (e: any) {
        return { settings, problem: { code: 'read_failed', message: e?.message ?? 'Could not read settings' } };
    }
}

export async function getSettings(): Promise<Record<SettingKey, boolean>> {
    return (await getSettingsStatus()).settings;
}

/**
 * Fails OPEN: if the settings table is missing or unreachable, sign-up keeps working.
 * A database hiccup must never lock every new patient out.
 */
export async function registrationsOpen(): Promise<boolean> {
    return (await getSettings()).registrations_open;
}

/** Saves a setting and then READS IT BACK, so a silent failure can never look like success. */
export async function setSetting(key: SettingKey, value: boolean, adminId: string) {
    const db: any = createAdminClient();
    const { error } = await db.from('platform_settings')
        .upsert({ key, value, updated_by: adminId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw new Error(error.message);

    const { data, error: readErr } = await db.from('platform_settings').select('value').eq('key', key).maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (data?.value !== value) throw new Error('The change was not saved. Please try again.');
}