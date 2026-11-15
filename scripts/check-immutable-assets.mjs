#!/usr/bin/env node
// Images under public/assets (except store art, which has its own content-hash
// versioning) are served with a one-year immutable Cache-Control (next.config.ts).
// Overwriting one keeps returning players on the old bytes, so a pull request
// may add or rename these files but never modify one in place.
import { execFileSync } from "node:child_process";

const base = process.env.BASE_SHA;
if (!base) {
  console.error("BASE_SHA is required (the pull request's base commit).");
  process.exit(2);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });

git("fetch", "--no-tags", "--depth=1", "origin", base);
const changed = git("diff", "--name-only", "--diff-filter=M", base, "HEAD", "--", "public/assets")
  .split("\n")
  .filter((path) => /\.(?:png|webp|avif|jpe?g|svg|gif)$/i.test(path))
  .filter((path) => !path.startsWith("public/assets/store/"));

if (changed.length > 0) {
  console.error("These images are cached by browsers for a year and must not be edited in place:");
  for (const path of changed) console.error(`  ${path}`);
  console.error("Save the new art under a new file name and update its references.");
  process.exit(1);
}
console.log("No long-cached /assets image was modified in place.");
