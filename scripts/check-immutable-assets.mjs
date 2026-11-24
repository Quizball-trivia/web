#!/usr/bin/env node
// Numbered Buscaminas portraits and images under public/assets (except store art with content-hash
// versioning) are served with a one-year immutable Cache-Control (next.config.ts).
// A browser that saw a URL keeps its bytes for a year, so a pull request may add
// images under new names but never change what an existing or retired name serves:
// no in-place edits, and no reuse of a path that existed earlier in history.
import { execFileSync } from "node:child_process";

const base = process.env.BASE_SHA;
if (!base) {
  console.error("BASE_SHA is required (the pull request's base commit).");
  process.exit(2);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
const isLongCachedImage = (path) => {
  if (/^public\/buscaminas\/v1\/p\/\d+\.webp$/.test(path)) return true;
  return path.startsWith("public/assets/")
  && !path.startsWith("public/assets/store/")
  && /\.(?:png|webp|avif|jpe?g|svg|gif)$/i.test(path);
};

// Commits and trees only (no file contents): enough to see every path the base ever had.
const shallow = git("rev-parse", "--is-shallow-repository").trim() === "true";
let haveBase = true;
try { git("cat-file", "-e", `${base}^{commit}`); } catch { haveBase = false; }
if (shallow || !haveBase) {
  git("fetch", "--no-tags", "--filter=blob:none", ...(shallow ? ["--unshallow"] : []), "origin", base);
}

const modified = [];
const reused = [];
for (const line of git("diff", "--name-status", "-M", base, "HEAD", "--", "public/assets", "public/buscaminas/v1/p").split("\n")) {
  if (!line) continue;
  const [status, ...paths] = line.split("\t");
  const target = paths.at(-1);
  if (!isLongCachedImage(target)) continue;
  if (status === "M") modified.push(target);
  else if ((status === "A" || status.startsWith("R") || status.startsWith("C"))
    && git("log", "-1", "--format=%H", base, "--", target).trim()) {
    reused.push(target);
  }
}

if (modified.length + reused.length > 0) {
  console.error("These images are cached by browsers for a year, so their URLs must never serve different bytes:");
  for (const path of modified) console.error(`  edited in place: ${path}`);
  for (const path of reused) console.error(`  reuses a name that existed before: ${path}`);
  console.error("Save the new art under a new file name and update its references.");
  process.exit(1);
}
console.log("No long-cached image URL changes what it serves.");
