/**
 * Shared helpers for admin list endpoints: paging, safe search text, CSV export.
 */

export const today = () => new Date().toISOString().slice(0, 10);

/** Remove characters that have a meaning inside PostgREST filter strings. */
export function cleanSearch(raw: string | null): string {
    return (raw ?? '').replace(/[%_,()\\*"'`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function parseListParams(req: Request) {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') ?? '25', 10) || 25));
    return {
        sp,
        page,
        pageSize,
        from: (page - 1) * pageSize,   // first row index (0-based)
        to: page * pageSize - 1,       // last row index
        q: cleanSearch(sp.get('q')),
        wantsCsv: sp.get('export') === 'csv',
    };
}

/**
 * Supabase returns at most 1000 rows per request, so exports loop in chunks.
 * `makePage` must build a FRESH query each call. Capped at 10,000 rows.
 */
export async function fetchAllRows(
    makePage: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>,
    cap = 10000,
) {
    const out: any[] = [];
    for (let from = 0; from < cap; from += 1000) {
        const { data, error } = await makePage(from, from + 999);
        if (error) throw error;
        out.push(...(data ?? []));
        if (!data || data.length < 1000) break;
    }
    return out;
}

export function toCsv(
    rows: any[],
    columns: { header: string; value: (row: any) => unknown }[],
): string {
    const esc = (v: unknown) => {
        let s = v == null ? '' : String(v);
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formulas
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
        columns.map((c) => esc(c.header)).join(','),
        ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')),
    ];
    return '\uFEFF' + lines.join('\r\n'); // BOM so Excel reads UTF-8 (Amharic etc.)
}

export function csvResponse(csv: string, filename: string) {
    return new Response(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store',
        },
    });
}