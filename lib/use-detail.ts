"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-api";

/** Loads { data } from an admin detail endpoint and exposes loading / error / reload. */
export function useDetail<T>(url: string | null) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!url) return;
        setLoading(true);
        setError(null);
        try {
            const json = await adminFetch<{ data: T }>(url);
            setData(json.data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [url]);

    useEffect(() => { reload(); }, [reload]);
    return { data, loading, error, reload };
}