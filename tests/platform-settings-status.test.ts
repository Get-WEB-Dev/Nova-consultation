import { describe, it, expect, vi, beforeEach } from "vitest";

let selectResult: any;
let upsertResult: any;
let readBack: any;

vi.mock("@/lib/supabase/client", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: (cols?: string) =>
        cols === "value"
          ? { eq: () => ({ maybeSingle: async () => readBack }) }
          : Promise.resolve(selectResult),
      upsert: async () => upsertResult,
    }),
  }),
}));

import { getSettingsStatus, setSetting, classifySettingsError } from "@/lib/server/platform-settings";

beforeEach(() => {
  selectResult = { data: [], error: null };
  upsertResult = { error: null };
  readBack = { data: { value: false }, error: null };
});

describe("why the registration switch might not work", () => {
  it("explains a missing table", () => {
    expect(classifySettingsError('relation "public.platform_settings" does not exist').code).toBe("table_missing");
    expect(classifySettingsError("Could not find the table 'public.platform_settings' in the schema cache").code).toBe("schema_cache");
    expect(classifySettingsError("Could not find the table 'public.platform_settings' in the schema cache").message).toContain("reload schema");
  });
  it("reports a problem instead of silently showing 'open'", async () => {
    selectResult = { data: null, error: { message: 'relation "platform_settings" does not exist' } };
    const r = await getSettingsStatus();
    expect(r.problem?.code).toBe("table_missing");
    expect(r.settings.registrations_open).toBe(true); // still fails open for sign-up
  });
  it("reads the saved value when everything is fine", async () => {
    selectResult = { data: [{ key: "registrations_open", value: false }], error: null };
    const r = await getSettingsStatus();
    expect(r.problem).toBeNull();
    expect(r.settings.registrations_open).toBe(false);
  });
});

describe("setSetting reads the value back", () => {
  it("succeeds when the saved value matches", async () => {
    await expect(setSetting("registrations_open", false, "u1")).resolves.toBeUndefined();
  });
  it("throws if the value did not actually change (no silent failure)", async () => {
    readBack = { data: { value: true }, error: null };
    await expect(setSetting("registrations_open", false, "u1")).rejects.toThrow(/not saved/i);
  });
  it("surfaces database errors", async () => {
    upsertResult = { error: { message: "permission denied" } };
    await expect(setSetting("registrations_open", false, "u1")).rejects.toThrow(/permission denied/);
  });
});