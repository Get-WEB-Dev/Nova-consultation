import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const jwt = (payload: object) =>
    `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

let tables: Record<string, any> = {};
vi.mock("@/lib/supabase/client", () => ({
    createAdminClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: "u1", email: "a@x.com" } }, error: null }) },
        from: (t: string) => ({
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: tables[t] ?? null, error: null }) }) }),
        }),
    }),
}));

import { requireUser } from "@/lib/server/auth";

const req = (aal: string) =>
    new Request("http://x", { headers: { authorization: `Bearer ${jwt({ aal })}` } });

beforeEach(() => {
    tables = { users: { role: "admin", is_suspended: false }, admins: { is_super_admin: false } };
});
afterEach(() => { delete process.env.ADMIN_REQUIRE_MFA; });

describe("admin two-factor enforcement", () => {
    it("is off by default, so you cannot lock yourself out while enrolling", async () => {
        const r = await requireUser(req("aal1"), ["admin"]);
        expect(r.error).toBeUndefined();
    });

    it("blocks admin APIs for a password-only session once switched on", async () => {
        process.env.ADMIN_REQUIRE_MFA = "true";
        const r = await requireUser(req("aal1"), ["admin"]);
        expect(r.error?.status).toBe(403);
        expect((await r.error!.json()).code).toBe("mfa_required");
    });

    it("lets an aal2 (second factor) session through", async () => {
        process.env.ADMIN_REQUIRE_MFA = "true";
        const r = await requireUser(req("aal2"), ["admin"]);
        expect(r.user?.aal).toBe("aal2");
    });

    it("does not affect non-admin routes or non-admin users", async () => {
        process.env.ADMIN_REQUIRE_MFA = "true";
        expect((await requireUser(req("aal1"))).error).toBeUndefined();
        tables = { users: { role: "patient", is_suspended: false }, admins: null };
        expect((await requireUser(req("aal1"), ["patient"])).error).toBeUndefined();
    });

    it("treats a garbage token payload as aal1", async () => {
        process.env.ADMIN_REQUIRE_MFA = "true";
        const bad = new Request("http://x", { headers: { authorization: "Bearer not-a-jwt" } });
        expect((await requireUser(bad, ["admin"])).error?.status).toBe(403);
    });
});