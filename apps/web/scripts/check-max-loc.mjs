import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = [join(ROOT, "src", "shared", "lib")];

const DEFAULT_MAX = 500;
const MAX_LOC = Number(process.env.MAX_LOC ?? DEFAULT_MAX);

const EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function isCodeFile(p) {
  for (const ext of EXTS) if (p.endsWith(ext)) return true;
  return false;
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (st.isFile() && isCodeFile(p)) out.push(p);
  }
  return out;
}

function countLoc(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .length;
}

const offenders = [];

for (const d of TARGET_DIRS) {
  for (const f of walk(d)) {
    const txt = readFileSync(f, "utf8");
    const loc = countLoc(txt);
    if (loc > MAX_LOC) offenders.push({ file: f.replace(ROOT + "/", ""), loc });
  }
}

if (offenders.length) {
  offenders.sort((a, b) => b.loc - a.loc);
  console.error(`\nLOC guardrail failed (MAX_LOC=${MAX_LOC})\n`);
  for (const o of offenders) console.error(`- ${o.loc}\t${o.file}`);
  console.error("\nRefactor/split these files (or raise MAX_LOC intentionally).\n");
  process.exit(1);
}

console.log(`LOC guardrail ok (MAX_LOC=${MAX_LOC})`);