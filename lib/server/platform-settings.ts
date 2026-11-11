import { createAdminClient } from '@/lib/supabase/client';

/** Only settings the app really enforces belong here. */
export const SETTING_KEYS = ['registrations_open'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

const DEFAULTS: Record<SettingKey, boolean> = { registrations_open: true };

export async function getSettings(): Promise<Record<SettingKey, boolean>> {
    const settings = { ...DEFAULTS };
    try {
        const { data } = await (createAdminClient() as any).from('platform_settings').select('key, value');
        for (const row of data ?? []) {
            if ((SETTING_KEYS as readonly string[]).includes(row.key) && typeof row.value === 'boolean') {
                settings[row.key as SettingKey] = row.value;
            }
        }
    } catch {
        // If settings cannot be read, keep the safe defaults
    }
    return settings;
}

/**
 * Fails OPEN: if the settings table is missing or unreachable, sign-up keeps working.
 * A database hiccup must never lock every new patient out.
 */
export async function registrationsOpen(): Promise<boolean> {
    return (await getSettings()).registrations_open;
}

export async function setSetting(key: SettingKey, value: boolean, adminId: string) {
    const { error } = await (createAdminClient() as any).from('platform_settings')
        .upsert({ key, value, updated_by: adminId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
}