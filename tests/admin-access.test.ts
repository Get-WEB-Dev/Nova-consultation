import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createAdminClient: () => ({}) }));

import { setAdminAccess, countSuperAdmins, AccessError } from "@/lib/server/admin-access";
import { PRESETS } from "@/lib/admin-permissions";

// A tiny in-memory stand-in for the database
function fakeDb(state: { admins: any[]; users: any[] }) {
  return {
    from(table: "admins" | "users") {
      const filters: [string, unknown][] = [];
      let op = "select", payload: any, head = false;
      const rows = () => state[table].filter((r) => filters.every(([c, v]) => r[c] === v));
      const chain: any = {
        select: (_c?: string, o?: any) => { head = !!o?.head; return chain; },
        eq: (c: string, v: unknown) => { filters.push([c, v]); return chain; },
        maybeSingle: async () => ({ data: rows()[0] ?? null }),
        insert: async (row: any) => { state[table].push({ ...row }); return { error: null }; },
        update: (u: any) => { op = "update"; payload = u; return chain; },
        then: (resolve: any) => {
          if (op === "update") { rows().forEach((r) => Object.assign(r, payload)); return resolve({ error: null }); }
          return resolve({ count: head ? rows().length : undefined, error: null });
        },
      };
      return chain;
    },
  };
}

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let state: { admins: any[]; users: any[] };
beforeEach(() => {
  state = {
    admins: [
      { user_id: A, is_super_admin: true, permissions: ["all"] },
      { user_id: B, is_super_admin: false, permissions: ["all"] },
    ],
    users: [{ id: A, role: "admin" }, { id: B, role: "admin" }, { id: "c", role: "admin" }, { id: "p", role: "patient" }],
  };
});

describe("setAdminAccess", () => {
  it("applies a preset", async () => {
    await setAdminAccess(B, { preset: "analyst" }, fakeDb(state));
    expect(state.admins.find((a) => a.user_id === B)!.permissions).toEqual(PRESETS.analyst.permissions);
  });
  it("making someone a super admin gives them everything", async () => {
    await setAdminAccess(B, { superAdmin: true }, fakeDb(state));
    const b = state.admins.find((a) => a.user_id === B)!;
    expect(b.is_super_admin).toBe(true);
    expect(b.permissions).toEqual(["all"]);
  });
  it("can demote a super admin while another one remains", async () => {
    await setAdminAccess(B, { superAdmin: true }, fakeDb(state));
    await setAdminAccess(A, { superAdmin: false }, fakeDb(state));
    expect(state.admins.find((a) => a.user_id === A)!.is_super_admin).toBe(false);
  });
  it("NEVER removes the last super admin", async () => {
    await expect(setAdminAccess(A, { superAdmin: false }, fakeDb(state))).rejects.toMatchObject({ status: 409 });
    expect(state.admins.find((a) => a.user_id === A)!.is_super_admin).toBe(true);
  });
  it("creates the admins row for an older admin account that has none", async () => {
    await setAdminAccess("c", { preset: "support" }, fakeDb(state));
    expect(state.admins.find((a) => a.user_id === "c")!.permissions).toEqual(PRESETS.support.permissions);
  });
  it("refuses people who are not admins and unknown levels", async () => {
    await expect(setAdminAccess("p", { preset: "full" }, fakeDb(state))).rejects.toBeInstanceOf(AccessError);
    await expect(setAdminAccess(B, { preset: "wizard" }, fakeDb(state))).rejects.toMatchObject({ status: 400 });
  });
  it("counts super admins", async () => {
    expect(await countSuperAdmins(fakeDb(state))).toBe(1);
  });
});