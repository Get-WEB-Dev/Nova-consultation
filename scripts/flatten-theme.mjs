// Removes every gradient from the doctor portal and replaces it with a solid colour.
//   node scripts/flatten-theme.mjs        (run from the project root, safe to run twice)
// Undo with: git checkout -- app components
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const TARGETS = ["app/doctor-dashboard", "components/doctor", "app/error.tsx", "app/not-found.tsx"];
const SHADOW = "0 1px 3px rgba(16,36,63,0.12)"; // one calm, neutral shadow instead of coloured glows

// Find the matching ")" for the "(" at index `open`
function closingParen(text, open) {
    let depth = 0;
    for (let i = open; i < text.length; i++) {
        if (text[i] === "(") depth++;
        else if (text[i] === ")" && --depth === 0) return i;
    }
    return -1;
}
// Split "a, rgba(1,2,3,.4) 10%, b" on top-level commas only
function splitArgs(body) {
    const parts = []; let depth = 0, start = 0;
    for (let i = 0; i < body.length; i++) {
        if (body[i] === "(") depth++;
        else if (body[i] === ")") depth--;
        else if (body[i] === "," && depth === 0) { parts.push(body.slice(start, i)); start = i + 1; }
    }
    parts.push(body.slice(start));
    return parts.map((p) => p.trim());
}
// linear-gradient(135deg, A, B)  →  A      radial-gradient(...)  →  transparent
function flattenGradients(text) {
    let out = "", i = 0;
    const re = /(linear|radial)-gradient\(/g;
    let m;
    while ((m = re.exec(text))) {
        const open = m.index + m[0].length - 1;
        const close = closingParen(text, open);
        if (close < 0) break;
        out += text.slice(i, m.index);
        if (m[1] === "radial") out += "transparent";
        else {
            const args = splitArgs(text.slice(open + 1, close));
            const first = /^(\d|to\s|-?\.?\d)/.test(args[0]) ? args[1] : args[0]; // skip the angle
            out += first.replace(/\s+\d+%$/, ""); // drop a trailing "40%" stop
        }
        i = close + 1;
        re.lastIndex = i;
    }
    return out + text.slice(i);
}

const walk = (p) => !existsSync(p) ? [] : statSync(p).isFile()
    ? (/\.(tsx?|css)$/.test(p) ? [p] : [])
    : readdirSync(p).flatMap((n) => walk(join(p, n)));

let changed = 0;
for (const target of TARGETS) for (const file of walk(target)) {
    const before = readFileSync(file, "utf8");
    let t = flattenGradients(before);
    // Tailwind gradient classes:  bg-gradient-to-r from-X [via-Y] to-Z  →  bg-X
    const C = "(?:\\[[^\\]]+\\]|[\\w-]+(?:\\/\\d+)?)"; // a colour: teal-500, teal-500/40 or [#0071c2]
    t = t.replace(new RegExp(`bg-gradient-to-\\w+\\s+from-(${C})(?:\\s+via-${C})?\\s+to-${C}`, "g"), "bg-$1");
    // Coloured glow shadows → one neutral shadow
    t = t.replace(/boxShadow:\s*"[^"]*rgba\((?:12,\s*188,\s*173|26,\s*53,\s*88|16,\s*36,\s*63|0,\s*113,\s*194|0,\s*53,\s*128)[^"]*"/g, `boxShadow: "${SHADOW}"`);
    if (t !== before) { writeFileSync(file, t); changed++; console.log("flattened", file); }
}
console.log(`\nDone — ${changed} file(s) updated.`);