import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Run when Next loads its config, so changing artwork always changes its URL. */
export function buildAvatarAssetCache(root: string) {
  const versions: Record<string, string> = {};
  function visit(relative: string) {
    for (const entry of readdirSync(join(root, "public", relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) visit(path);
      else if (/\.(?:webp|png|jpe?g|avif|svg)$/.test(entry.name)) {
        versions[`/${path}`] = createHash("sha256").update(readFileSync(join(root, "public", path))).digest("hex").slice(0, 16);
      }
    }
  }
  visit("assets/store");
  const manifestPath = join(root, "src/lib/avatars/asset-versions.json");
  const manifest = `${JSON.stringify(versions, null, 2)}\n`;
  let existing = "";
  try { existing = readFileSync(manifestPath, "utf8"); } catch { /* First build. */ }
  if (existing !== manifest) {
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, manifest);
  }
  // Only the current content hash gets a long browser TTL. Legacy paths and
  // obsolete versions retain revalidation, including old app/CDN consumers.
  return Object.entries(versions).map(([source, version]) => ({
    source,
    has: [{ type: "query" as const, key: "v", value: version }],
    headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
  }));
}
