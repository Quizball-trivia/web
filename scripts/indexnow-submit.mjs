#!/usr/bin/env node
// Tells IndexNow (Yandex, Bing, Seznam, Naver…) which quizball.io sitemap URLs are new or changed since the last run.
// Usage: node scripts/indexnow-submit.mjs [--state .indexnow/state.json] [--all] [--dry-run]
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { submitChanges } from "./lib/indexnow.mjs";

const { values: args } = parseArgs({
  options: {
    state: { type: "string", default: ".indexnow/state.json" },
    all: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

// A corrupt state would otherwise fail every run (a failed run never saves a new one): start a new baseline instead.
function readState(file) {
  let state;
  try {
    state = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`ignoring unreadable ${file}: ${error.message}`);
    return null;
  }
  if (state && typeof state === "object" && !Array.isArray(state) && Object.values(state).every((v) => typeof v === "string")) return state;
  console.warn(`ignoring malformed ${file}`);
  return null;
}

const { state } = await submitChanges({ previous: readState(args.state), all: args.all, dryRun: args["dry-run"] });
if (state) {
  fs.mkdirSync(path.dirname(args.state), { recursive: true });
  fs.writeFileSync(args.state, JSON.stringify(state, null, 1));
}
