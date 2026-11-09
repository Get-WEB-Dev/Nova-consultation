import { describe, it, expect, vi, beforeEach } from "vitest";

const ADMIN = "11111111-1111-4111-8111-111111111111";
const TARGET = "22222222-2222-4222-8222-222222222222";
const SUPER = "33333333-3333-4333-8333-333333333333";

// What the "database" says about each user
let targets: Record<string, { id: string; email: string; role: string }> = {};
let superAdmins: string[] = [];
let caller: any;

vi.mock("@/lib/server/auth", () => ({
    isUuid: (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v),
    requireUser: vi.fn(async () => ({ user: caller })),
}));
vi.mock("@/lib/supabase/client", () => ({
    createAdminClient: () => ({
        from: () => ({
            select: () => ({
                eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: targets[id] ?? null }) }),
            }),
        }),
    }),
}));
vi.mock("@/lib/server/admin-queries", () => ({
    listUsers: vi.fn(), exportUsers: vi.fn(),
    updateUserRole: vi.fn(async () => { }),
    deleteUser: vi.fn(async () => { }),
    setUserSuspended: vi.fn(async () => { }),
    isSuperAdminUser: vi.fn(async (id: string) => superAdmins.includes(id)),
    logAdminAction: vi.fn(async () => { }),
}));

import { PATCH, DELETE } from "@/app/api/admin/users/route";
import * as queries from "@/lib/server/admin-queries";

const call = (fn: typeof PATCH, body: unknown) =>
    fn(new Request("http://x/api/admin/users", { method: "PATCH", body: JSON.stringify(body) }));

beforeEach(() => {
    vi.clearAllMocks();
    caller = { id: ADMIN, isAdmin: true, isSuperAdmin: false, role: "admin" };
    targets = { [TARGET]: { id: TARGET, email: "t@x.com", role: "patient" } };
    superAdmins = [];
});

describe("PATCH /api/admin/users — roles", () => {
    it("a normal admin cannot promote someone to admin", async () => {
        const res = await call(PATCH, { userId: TARGET, role: "admin" });
        expect(res.status).toBe(403);
        expect(queries.updateUserRole).not.toHaveBeenCalled();
    });

    it("a super admin can promote someone to admin", async () => {
        caller.isSuperAdmin = true;
        const res = await call(PATCH, { userId: TARGET, role: "admin" });
        expect(res.status).toBe(200);
        expect(queries.updateUserRole).toHaveBeenCalledWith(TARGET, "admin");
    });

    it("a normal admin cannot demote another admin", async () => {
        targets[TARGET].role = "admin";
        const res = await call(PATCH, { userId: TARGET, role: "patient" });
        expect(res.status).toBe(403);
        expect(queries.updateUserRole).not.toHaveBeenCalled();
    });

    it("nobody can modify a super admin, not even another super admin", async () => {
        caller.isSuperAdmin = true;
        superAdmins = [TARGET];
        const res = await call(PATCH, { userId: TARGET, role: "patient" });
        expect(res.status).toBe(403);
    });

    it("you cannot change your own account", async () => {
        const res = await call(PATCH, { userId: ADMIN, role: "patient" });
        expect(res.status).toBe(400);
    });

    it("rejects ids that are not UUIDs and unknown roles", async () => {
        expect((await call(PATCH, { userId: "nope", role: "patient" })).status).toBe(400);
        expect((await call(PATCH, { userId: TARGET, role: "superuser" })).status).toBe(400);
    });

    it("a normal admin can change a patient to doctor", async () => {
        const res = await call(PATCH, { userId: TARGET, role: "doctor" });
        expect(res.status).toBe(200);
        expect(queries.updateUserRole).toHaveBeenCalledWith(TARGET, "doctor");
    });
});

describe("PATCH /api/admin/users — suspension", () => {
    it("suspends and logs it", async () => {
        const res = await call(PATCH, { userId: TARGET, suspended: true, reason: "spam" });
        expect(res.status).toBe(200);
        expect(queries.setUserSuspended).toHaveBeenCalledWith(TARGET, true, "spam");
        expect(queries.logAdminAction).toHaveBeenCalled();
    });
    it("a normal admin cannot suspend an admin", async () => {
        targets[TARGET].role = "admin";
        expect((await call(PATCH, { userId: TARGET, suspended: true })).status).toBe(403);
    });
});

describe("DELETE /api/admin/users", () => {
    it("cannot delete yourself or a super admin", async () => {
        expect((await call(DELETE, { userId: ADMIN })).status).toBe(400);
        superAdmins = [TARGET];
        expect((await call(DELETE, { userId: TARGET })).status).toBe(403);
        expect(queries.deleteUser).not.toHaveBeenCalled();
    });
    it("a normal admin cannot delete an admin", async () => {
        targets[TARGET].role = "admin";
        expect((await call(DELETE, { userId: TARGET })).status).toBe(403);
    });
    it("returns 404 for an unknown user", async () => {
        expect((await call(DELETE, { userId: SUPER })).status).toBe(404);
    });
});