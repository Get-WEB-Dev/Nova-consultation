// One-time script: moves the doctor portal from the old bright blue to the Nova Health
// brand palette (navy + teal).  Run from the project root:   node scripts/apply-brand-palette.mjs
// Safe to run twice (the second run changes nothing).  Undo with: git checkout -- app components
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const TARGETS = ["app/doctor-dashboard", "components/doctor", "app/error.tsx", "app/not-found.tsx"];

// old hex → brand hex
const HEX = [
    ["#003580", "#1a3558"],         // navy
    ["#00224f", "#10243f"],         // deep navy
    ["#0071c2", "#0d7b74"],         // blue accent → teal
    ["#eff6ff", "#effefb"],         // light blue tint → light teal tint
    ["rgba(0,53,128", "rgba(26,53,88"],
];
// Tailwind blue-* classes → brand teal / navy
const CLASSES = [
    [/-blue-(50|100|200|300|400|500)\b/g, "-teal-$1"],
    [/-blue-(600|700|800|900)\b/g, "-primary-$1"],
];

function walk(path) {
    if (!existsSync(path)) return [];
    if (statSync(path).isFile()) return /\.(tsx?|css)$/.test(path) ? [path] : [];
    return readdirSync(path).flatMap((name) => walk(join(path, name)));
}

let changed = 0;
for (const target of TARGETS) {
    for (const file of walk(target)) {
        const original = readFileSync(file, "utf8");
        let text = original;
        for (const [from, to] of HEX) text = text.split(from).join(to);
        for (const [pattern, replacement] of CLASSES) text = text.replace(pattern, replacement);
        if (text !== original) {
            writeFileSync(file, text);
            changed++;
            console.log("updated", file);
        }
    }
}
console.log(`\nDone — ${changed} file(s) updated.`);