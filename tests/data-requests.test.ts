import { describe, it, expect, vi, beforeEach } from "vitest";

let caller: any;
const ID = "22222222-2222-4222-8222-222222222222";

vi.mock("@/lib/supabase/client", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/server/auth", () => ({
  isUuid: (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v),
  requireUser: vi.fn(async () => ({ user: caller })),
}));
vi.mock("@/lib/server/admin-queries", () => ({ logAdminAction: vi.fn(async () => {}) }));
vi.mock("@/lib/server/data-requests", async () => {
  const actual: any = await vi.importActual("@/lib/server/data-requests");
  return {
    ...actual,
    listDataRequests: vi.fn(async () => ({ data: [], total: 0, counts: {} })),
    createDataRequest: vi.fn(async (o: any) => ({ id: ID, requester_email: o.email.toLowerCase() })),
    updateDataRequestStatus: vi.fn(async () => ({ id: ID, status: "completed" })),
  };
});
import { POST, PATCH } from "@/app/api/admin/data-requests/route";
import * as lib from "@/lib/server/data-requests";
import { logAdminAction } from "@/lib/server/admin-queries";

const send = (fn: any, body: unknown) => fn(new Request("http://x/api/admin/data-requests", { method: "POST", body: JSON.stringify(body) }));
beforeEach(() => { vi.clearAllMocks(); caller = { id: "a1", email: "a@x.com" }; });

describe("data requests", () => {
  it("rejects bad emails, unknown types and oversized details", async () => {
    expect((await send(POST, { email: "nope", type: "export" })).status).toBe(400);
    expect((await send(POST, { email: "a@b.co", type: "sell-my-data" })).status).toBe(400);
    expect((await send(POST, { email: "a@b.co", type: "export", details: "x".repeat(1001) })).status).toBe(400);
    expect(lib.createDataRequest).not.toHaveBeenCalled();
  });
  it("logs a valid request and records it in the activity log", async () => {
    const res = await send(POST, { email: "Patient@Example.com", type: "deletion", details: "Wants account removed" });
    expect(res.status).toBe(200);
    expect(lib.createDataRequest).toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalledWith(caller, "data_request.created", "data_request", ID, expect.stringContaining("deletion"));
  });
  it("only accepts real statuses and ids when updating", async () => {
    expect((await send(PATCH, { id: "x", status: "completed" })).status).toBe(400);
    expect((await send(PATCH, { id: ID, status: "vanished" })).status).toBe(400);
    expect((await send(PATCH, { id: ID, status: "completed" })).status).toBe(200);
    expect(lib.updateDataRequestStatus).toHaveBeenCalledWith(ID, "completed", "a@x.com");
  });
});