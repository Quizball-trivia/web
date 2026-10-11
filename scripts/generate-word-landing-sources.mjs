import fs from "node:fs";
import path from "node:path";
import { resolveWordStyleClosure, renderWordStyleSources } from "./lib/word-landing-style-closure.mjs";

const mode = process.argv[2];
if (!["--write", "--check"].includes(mode)) throw new Error("Use --write to regenerate or --check for a read-only freshness check.");
const closure = resolveWordStyleClosure();
const expected = renderWordStyleSources(closure.files);
const file = path.join(process.cwd(), "src/styles/word-landing-sources.css");
if (mode === "--write") fs.writeFileSync(file, expected);
else if (fs.readFileSync(file, "utf8") !== expected) throw new Error("Word landing sources are stale; run node scripts/generate-word-landing-sources.mjs --write.");
console.log(JSON.stringify({ modules: closure.files.length, dynamicBoundaries: closure.boundaries.length, fresh: true }));
