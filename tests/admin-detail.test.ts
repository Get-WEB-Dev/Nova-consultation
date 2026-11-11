import { describe, it, expect, vi, beforeEach } from "vitest";

const ID = "22222222-2222-4222-8222-222222222222";
const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
let caller: any;

vi.mock("@/lib/server/auth", () => ({
    isUuid: (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v),
    requireUser: vi.fn(async () => ({ user: caller })),
}));
vi.mock("@/lib/server/admin-queries", () => ({ logAdminAction: vi.fn(async () => { }) }));
vi.mock("@/lib/server/admin-detail", () => ({
    NOTE_ENTITIES: ["user", "doctor", "consultation", "message"],
    getUserMedical: vi.fn(async () => ({ allergies: "penicillin" })),
    getUserExport: vi.fn(async () => ({ user: { name: "A" } })),
    getConsultationClinical: vi.fn(async () => ({ diagnosis: "flu" })),
    logSensitiveAccess: vi.fn(async () => { }),
    getNote: vi.fn(),
    deleteNote: vi.fn(async () => { }),
    addNote: vi.fn(async () => ({ id: "n1", note: "hi" })),
    listNotes: vi.fn(async () => []),
}));

import { POST as reveal } from "@/app/api/admin/reveal/route";
import { POST as addNoteRoute, DELETE as deleteNoteRoute } from "@/app/api/admin/notes/route";
import * as detail from "@/lib/server/admin-detail";

const post = (fn: any, body: unknown, method = "POST") =>
    fn(new Request("http://x", { method, body: JSON.stringify(body) }));

beforeEach(() => {
    vi.clearAllMocks();
    caller = { id: ME, email: "me@x.com", isAdmin: true, isSuperAdmin: false };
});

describe("reveal: sensitive data needs a recorded reason", () => {
    it("refuses without a reason and shows nothing", async () => {
        for (const reason of [undefined, "", "   ", "short"]) {
            const res = await post(reveal, { type: "user_medical", id: ID, reason });
            expect(res.status).toBe(400);
        }
        expect(detail.getUserMedical).not.toHaveBeenCalled();
    });

    it("records the reason, then returns the data", async () => {
        const res = await post(reveal, { type: "user_medical", id: ID, reason: "Patient requested a record correction" });
        expect(res.status).toBe(200);
        expect((await res.json()).data.allergies).toBe("penicillin");
        expect(detail.logSensitiveAccess).toHaveBeenCalledWith(
            caller, "user.medical_viewed", "user", ID, "Patient requested a record correction",
        );
    });

    it("uses the right audit action for clinical notes", async () => {
        await post(reveal, { type: "consultation_clinical", id: ID, reason: "Complaint about this session" });
        expect(detail.logSensitiveAccess).toHaveBeenCalledWith(
            caller, "consultation.clinical_viewed", "consultation", ID, "Complaint about this session",
        );
    });

    it("shows NOTHING if the audit record cannot be written", async () => {
        (detail.logSensitiveAccess as any).mockRejectedValueOnce(new Error("Could not record this access, so nothing was shown."));
        const res = await post(reveal, { type: "user_medical", id: ID, reason: "Legitimate support request" });
        expect(res.status).toBe(500);
        expect(JSON.stringify(await res.json())).not.toContain("penicillin");
    });

    it("rejects unknown types and bad ids", async () => {
        expect((await post(reveal, { type: "everything", id: ID, reason: "long enough reason" })).status).toBe(400);
        expect((await post(reveal, { type: "user_medical", id: "x", reason: "long enough reason" })).status).toBe(400);
    });
});

describe("notes", () => {
    it("only the author or a super admin can delete a note", async () => {
        (detail.getNote as any).mockResolvedValue({ id: "n1", admin_id: OTHER, entity_type: "user", entity_id: ID });
        expect((await post(deleteNoteRoute, { noteId: ID }, "DELETE")).status).toBe(403);
        expect(detail.deleteNote).not.toHaveBeenCalled();

        caller.isSuperAdmin = true;
        expect((await post(deleteNoteRoute, { noteId: ID }, "DELETE")).status).toBe(200);
    });

    it("the author can delete their own note", async () => {
        (detail.getNote as any).mockResolvedValue({ id: "n1", admin_id: ME, entity_type: "user", entity_id: ID });
        expect((await post(deleteNoteRoute, { noteId: ID }, "DELETE")).status).toBe(200);
    });

    it("validates entity type and length", async () => {
        expect((await post(addNoteRoute, { entityType: "payment", entityId: ID, note: "x" })).status).toBe(400);
        expect((await post(addNoteRoute, { entityType: "user", entityId: ID, note: "" })).status).toBe(400);
        expect((await post(addNoteRoute, { entityType: "user", entityId: ID, note: "x".repeat(2001) })).status).toBe(400);
        expect((await post(addNoteRoute, { entityType: "user", entityId: ID, note: "Called patient back" })).status).toBe(200);
    });
});