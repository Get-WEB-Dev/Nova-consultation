import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requiredPermission, isAllowed, normalizePermissions, presetOf, PRESETS, PERMISSIONS,
} from "@/lib/admin-permissions";

// What the database says about the signed-in admin (used by the real requireUser below)
let adminsRow: any = null;
const jwt = `h.${Buffer.from(JSON.stringify({ aal: "aal2" })).toString("base64url")}.s`;

vi.mock("@/lib/supabase/client", () => ({
  createAdminClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1", email: "a@x.com" } }, error: null }) },
    from: (t: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: t === "users" ? { role: "admin", is_suspended: false } : t === "admins" ? adminsRow : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));
import { requireUser } from "@/lib/server/auth";

const call = (method: string, path: string) =>
  requireUser(new Request(`http://x${path}`, { method, headers: { authorization: `Bearer ${jwt}` } }), ["admin"]);

describe("which permission an endpoint needs", () => {
  const need = (m: string, p: string) => requiredPermission(m, `http://x${p}`);

  it("maps the sensitive writes", () => {
    expect(need("POST", "/api/admin/reveal")).toBe("pii.reveal");
    expect(need("PATCH", "/api/admin/doctors")).toBe("doctors.verify");
    expect(need("GET", "/api/admin/doctors/credentials")).toBe("doctors.verify");
    expect(need("DELETE", "/api/admin/users")).toBe("users.manage");
    expect(need("POST", "/api/admin/users/11111111-1111-4111-8111-111111111111")).toBe("users.manage");
    expect(need("PATCH", "/api/admin/messages/abc")).toBe("support.manage");
    expect(need("GET", "/api/admin/reports")).toBe("reports.view");
    expect(need("GET", "/api/admin/activity")).toBe("audit.view");
    expect(need("GET", "/api/admin/data-requests")).toBe("privacy.manage");
  });
  it("treats any CSV export as a data export", () => {
    expect(need("GET", "/api/admin/users?export=csv")).toBe("data.export");
    expect(need("GET", "/api/admin/consultations?q=x&export=csv")).toBe("data.export");
  });
  it("leaves ordinary reads open to every admin", () => {
    expect(need("GET", "/api/admin/users")).toBeNull();
    expect(need("GET", "/api/admin/system")).toBeNull();
    expect(need("POST", "/api/admin/notes")).toBeNull();
  });
  it("DENIES BY DEFAULT: an unlisted write is super-admin only", () => {
    expect(need("POST", "/api/admin/brand-new-feature")).toBe("super");
    expect(need("DELETE", "/api/admin/something-else")).toBe("super");
  });
  it("keeps the super-admin actions super-admin only", () => {
    expect(need("POST", "/api/admin/announcements")).toBe("super");
    expect(need("PUT", "/api/admin/platform-settings")).toBe("super");
    expect(need("PATCH", "/api/admin/admins")).toBe("super");
  });
  it("ignores non-admin endpoints and refuses unreadable requests", () => {
    expect(need("POST", "/api/messages")).toBeNull();
    expect(requiredPermission("POST", "not a url")).toBe("super");
  });
});

describe("isAllowed", () => {
  const u = (isSuperAdmin: boolean, permissions: string[]) => ({ isSuperAdmin, permissions });
  it("super admins can do everything", () => {
    expect(isAllowed(u(true, []), "super")).toBe(true);
    expect(isAllowed(u(true, []), "users.manage")).toBe(true);
  });
  it("'all' covers every permission but NOT super-admin actions", () => {
    expect(isAllowed(u(false, ["all"]), "users.manage")).toBe(true);
    expect(isAllowed(u(false, ["all"]), "super")).toBe(false);
  });
  it("a limited admin only gets what they were given", () => {
    const analyst = u(false, PRESETS.analyst.permissions);
    expect(isAllowed(analyst, "reports.view")).toBe(true);
    expect(isAllowed(analyst, "users.manage")).toBe(false);
    expect(isAllowed(analyst, "pii.reveal")).toBe(false);
    expect(isAllowed(analyst, null)).toBe(true);
  });
});

describe("stored permissions", () => {
  it("never lock anyone out: empty, missing or junk means full access", () => {
    expect(normalizePermissions(undefined)).toEqual(["all"]);
    expect(normalizePermissions([])).toEqual(["all"]);
    expect(normalizePermissions(["nonsense"])).toEqual(["all"]);
    expect(normalizePermissions(["reports.view", "bogus"])).toEqual(["reports.view"]);
  });
  it("recognises presets regardless of order", () => {
    expect(presetOf(["all"])).toBe("full");
    expect(presetOf([...PRESETS.support.permissions].reverse())).toBe("support");
    expect(presetOf(["reports.view"])).toBe("custom");
  });
  it("every preset only uses real permissions", () => {
    for (const p of Object.values(PRESETS)) {
      for (const perm of p.permissions) expect(perm === "all" || (PERMISSIONS as readonly string[]).includes(perm)).toBe(true);
    }
  });
});

describe("requireUser enforces permissions for real", () => {
  beforeEach(() => { adminsRow = null; });

  it("an admin with no admins row keeps full access (nobody is locked out on deploy)", async () => {
    adminsRow = null;
    expect((await call("DELETE", "/api/admin/users")).error).toBeUndefined();
  });
  it("an analyst can read reports but cannot delete users or reveal medical data", async () => {
    adminsRow = { is_super_admin: false, permissions: PRESETS.analyst.permissions };
    expect((await call("GET", "/api/admin/reports")).error).toBeUndefined();
    const del = await call("DELETE", "/api/admin/users");
    expect(del.error?.status).toBe(403);
    expect((await del.error!.json()).code).toBe("permission_denied");
    expect((await call("POST", "/api/admin/reveal")).error?.status).toBe(403);
  });
  it("support can reveal with a reason but cannot change roles", async () => {
    adminsRow = { is_super_admin: false, permissions: PRESETS.support.permissions };
    expect((await call("POST", "/api/admin/reveal")).error).toBeUndefined();
    expect((await call("PATCH", "/api/admin/users")).error?.status).toBe(403);
  });
  it("a full-access admin still cannot send announcements; a super admin can", async () => {
    adminsRow = { is_super_admin: false, permissions: ["all"] };
    expect((await call("POST", "/api/admin/announcements")).error?.status).toBe(403);
    adminsRow = { is_super_admin: true, permissions: ["all"] };
    expect((await call("POST", "/api/admin/announcements")).error).toBeUndefined();
  });
  it("blocks exports for admins without data.export", async () => {
    adminsRow = { is_super_admin: false, permissions: PRESETS.support.permissions };
    expect((await call("GET", "/api/admin/users?export=csv")).error?.status).toBe(403);
  });
});