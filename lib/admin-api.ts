export async function adminFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (res.status === 401 && typeof window !== "undefined") {
        window.location.href = "/admin-login";
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
    return json as T;
}

export async function downloadCsv(url: string, filename: string) {
    const res = await fetch(url);
    if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || `Export failed (${res.status})`);
    }
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
}