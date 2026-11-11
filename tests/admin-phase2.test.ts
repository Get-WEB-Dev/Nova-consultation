import { describe, it, expect, vi, beforeEach } from "vitest";

let caller: any;
let dbState: { data?: any; error?: any } | "throw" = { data: [] };

vi.mock("@/lib/supabase/client", () => ({
    createAdminClient: () => ({
        from: () => ({
            select: async () => {
                if (dbState === "throw") throw new Error("database is down");
                return dbState;
            },
        }),
    }),
}));
vi.mock("@/lib/server/auth", () => ({
    isUuid: (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v),
    requireUser: vi.fn(async () => ({ user: caller })),
    requireSuperAdmin: vi.fn(async () =>
        caller.isSuperAdmin
            ? { user: caller }
            : { error: new Response(JSON.stringify({ error: "Only a super admin can do this" }), { status: 403 }) },
    ),
}));
vi.mock("@/lib/server/admin-queries", () => ({ logAdminAction: vi.fn(async () => { }) }));
vi.mock("@/lib/server/platform-settings", async () => {
    const actual: any = await vi.importActual("@/lib/server/platform-settings");
    return { ...actual, setSetting: vi.fn(async () => { }) };
});

import { parseReportRange } from "@/lib/server/admin-reports";
import { registrationsOpen, setSetting } from "@/lib/server/platform-settings";
import { PUT } from "@/app/api/admin/platform-settings/route";
import { logAdminAction } from "@/lib/server/admin-queries";

const NOW = new Date("2026-06-30T12:00:00Z");
const range = (qs: string) => parseReportRange(new URLSearchParams(qs), NOW);

describe("report date range", () => {
    it("defaults to the last 30 days ending today", () => {
        expect(range("")).toEqual({ from: "2026-06-01", to: "2026-06-30" });
    });
    it("accepts a valid custom range", () => {
        expect(range("from=2026-01-01&to=2026-03-31")).toEqual({ from: "2026-01-01", to: "2026-03-31" });
    });
    it("rejects bad formats, impossible dates and reversed ranges", () => {
        expect(range("from=June 1&to=2026-06-30")).toHaveProperty("error");
        expect(range("from=2026-02-31&to=2026-03-05")).toHaveProperty("error");
        expect(range("from=2026-06-30&to=2026-06-01")).toHaveProperty("error");
    });
    it("rejects ranges over 800 days and dates in the future", () => {
        expect(range("from=2020-01-01&to=2026-06-30")).toHaveProperty("error");
        expect(range("from=2026-06-01&to=2026-09-01")).toHaveProperty("error");
    });
});

describe("registrationsOpen fails OPEN", () => {
    it("is open by default and when the table is empty", async () => {
        dbState = { data: [] };
        expect(await registrationsOpen()).toBe(true);
    });
    it("is closed only when explicitly switched off", async () => {
        dbState = { data: [{ key: "registrations_open", value: false }] };
        expect(await registrationsOpen()).toBe(false);
    });
    it("stays open if the settings table is missing or the database is down", async () => {
        dbState = { data: null, error: { message: 'relation "platform_settings" does not exist' } };
        expect(await registrationsOpen()).toBe(true);
        dbState = "throw";
        expect(await registrationsOpen()).toBe(true);
    });
    it("ignores junk values", async () => {
        dbState = { data: [{ key: "registrations_open", value: "no" }, { key: "evil", value: false }] };
        expect(await registrationsOpen()).toBe(true);
    });
});

describe("PUT /api/admin/platform-settings", () => {
    const put = (body: unknown) => PUT(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }));
    beforeEach(() => { vi.clearAllMocks(); caller = { id: "u1", email: "a@x.com", isAdmin: true, isSuperAdmin: true }; });

    it("only a super admin can change settings", async () => {
        caller.isSuperAdmin = false;
        expect((await put({ key: "registrations_open", value: false })).status).toBe(403);
        expect(setSetting).not.toHaveBeenCalled();
    });
    it("rejects unknown keys and non-boolean values", async () => {
        expect((await put({ key: "drop_tables", value: true })).status).toBe(400);
        expect((await put({ key: "registrations_open", value: "false" })).status).toBe(400);
    });
    it("saves and records the change", async () => {
        expect((await put({ key: "registrations_open", value: false })).status).toBe(200);
        expect(setSetting).toHaveBeenCalledWith("registrations_open", false, "u1");
        expect(logAdminAction).toHaveBeenCalled();
    });
});