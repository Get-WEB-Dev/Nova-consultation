"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-api";

interface ListResponse<T> { data: T[]; total?: number; counts?: Record<string, number> }

export function useServerList<T>(endpoint: string, extra: Record<string, string> = {}, pageSize = 25) {
    const [rows, setRows] = useState<T[]>([]);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [page, setPage] = useState(1);
    const [q, setQ] = useState("");
    const [debouncedQ, setDebouncedQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const latest = useRef(0);

    // `extra` is a new object every render, so compare it by content
    const extraKey = JSON.stringify(extra);

    // Wait 350 ms after typing stops before asking the server
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
        return () => clearTimeout(t);
    }, [q]);

    // A new search or filter always starts again at page 1
    useEffect(() => { setPage(1); }, [debouncedQ, extraKey]);

    const buildParams = useCallback((p: number) => {
        const sp = new URLSearchParams(JSON.parse(extraKey));
        sp.set("page", String(p));
        sp.set("pageSize", String(pageSize));
        if (debouncedQ) sp.set("q", debouncedQ);
        return sp;
    }, [extraKey, debouncedQ, pageSize]);

    const reload = useCallback(async () => {
        const id = ++latest.current;
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<ListResponse<T>>(`${endpoint}?${buildParams(page)}`);
            if (id !== latest.current) return; // a newer request started; ignore this stale answer
            setRows(json.data ?? []);
            setTotal(json.total ?? 0);
            if (json.counts) setCounts(json.counts);
            // Deleted the last row on the last page? Step back one page.
            if ((json.data ?? []).length === 0 && page > 1 && (json.total ?? 0) > 0) setPage(page - 1);
        } catch (e: any) {
            if (id === latest.current) setError(e.message);
        } finally {
            if (id === latest.current) setLoading(false);
        }
    }, [endpoint, buildParams, page]);

    useEffect(() => { reload(); }, [reload]);

    // Same filters, but as a CSV download (page 1 is ignored by the export)
    const exportUrl = useCallback(() => `${endpoint}?${buildParams(1)}&export=csv`, [endpoint, buildParams]);

    return { rows, total, counts, page, setPage, pageSize, q, setQ, loading, error, reload, exportUrl };
}