import { describe, it, expect } from "vitest";
import { cleanSearch, toCsv, parseListParams } from "@/lib/server/admin-list";

describe("cleanSearch", () => {
    it("removes characters that could change a PostgREST filter", () => {
        expect(cleanSearch("john,role.eq.admin)")).not.toMatch(/[,()]/);
        expect(cleanSearch("a%b_c*d")).toBe("a b c d");
    });
    it("handles null and caps the length", () => {
        expect(cleanSearch(null)).toBe("");
        expect(cleanSearch("x".repeat(500)).length).toBe(80);
    });
});

describe("toCsv", () => {
    const cols = [{ header: "Name", value: (r: any) => r.name }];

    it("neutralises spreadsheet formulas", () => {
        for (const bad of ["=1+1", "+1", "-1", "@SUM(A1)"]) {
            const csv = toCsv([{ name: bad }], cols);
            expect(csv).toContain(`'${bad}`);
        }
    });
    it("quotes commas, quotes and newlines", () => {
        const csv = toCsv([{ name: 'a,"b"\nc' }], cols);
        expect(csv).toContain('"a,""b""\nc"');
    });
    it("starts with a BOM so Excel reads UTF-8", () => {
        expect(toCsv([], cols).charCodeAt(0)).toBe(0xfeff);
    });
});

describe("parseListParams", () => {
    const p = (qs: string) => parseListParams(new Request(`http://x/api?${qs}`));

    it("clamps page size to 100 and page to at least 1", () => {
        const r = p("page=-5&pageSize=99999");
        expect(r.page).toBe(1);
        expect(r.pageSize).toBe(100);
    });
    it("computes the row range", () => {
        const r = p("page=3&pageSize=25");
        expect([r.from, r.to]).toEqual([50, 74]);
    });
    it("ignores garbage", () => {
        expect(p("page=abc&pageSize=xyz").pageSize).toBe(25);
    });
});