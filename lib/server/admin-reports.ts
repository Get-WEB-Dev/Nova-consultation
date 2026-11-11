import { createAdminClient } from '@/lib/supabase/client';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

/** Validates ?from=&to= (YYYY-MM-DD). Defaults to the last 30 days. */
export function parseReportRange(sp: URLSearchParams, now = new Date()): { from: string; to: string } | { error: string } {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const to = sp.get('to') ?? iso(now);
    const from = sp.get('from') ?? iso(new Date(now.getTime() - 29 * DAY));

    if (!DATE_RE.test(from) || !DATE_RE.test(to)) return { error: 'Dates must look like 2026-06-30' };
    const a = Date.parse(`${from}T00:00:00Z`);
    const b = Date.parse(`${to}T00:00:00Z`);
    // Date.parse quietly accepts 2026-02-31, so also check that the date round-trips
    if (Number.isNaN(a) || Number.isNaN(b) || iso(new Date(a)) !== from || iso(new Date(b)) !== to) {
        return { error: 'That date does not exist' };
    }
    if (b < a) return { error: 'The start date must be before the end date' };
    if ((b - a) / DAY + 1 > 800) return { error: 'Choose a range of at most 800 days' };
    if (b > now.getTime() + DAY) return { error: 'The end date cannot be in the future' };
    return { from, to };
}

export async function fetchReport(from: string, to: string) {
    const admin: any = createAdminClient();
    const { data, error } = await admin.rpc('admin_report', { p_from: from, p_to: to });
    if (error) throw error;
    return data;
}