#!/usr/bin/env node
/**
 * Audit inline hex colors used inside Tailwind class strings.
 *
 * Detects patterns like:
 *   bg-[#1645FF], text-[#FFE500], border-[#1CB0F6]/20, ring-[#FF4B4B]
 *
 * For each match it reports the file, line, prefix (bg/text/border/...),
 * the hex value, and (if present) the opacity modifier.
 *
 * Outputs a per-color summary, a per-file count, and exits with non-zero
 * if any non-allowlisted file contains hex class strings. The allowlist
 * lives at scripts/brand-colors-allowlist.json — files are removed from
 * it as they are migrated to brand tokens, until the list is empty.
 *
 * Modes:
 *   node scripts/audit-brand-colors.mjs           # report + enforce allowlist
 *   node scripts/audit-brand-colors.mjs --report  # report only (always exit 0)
 *   node scripts/audit-brand-colors.mjs --update  # rewrite allowlist from current state
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');
export const SRC = path.join(ROOT, 'src');
export const ALLOWLIST_PATH = path.join(__dirname, 'brand-colors-allowlist.json');

export const HEX_CLASS_REGEX =
  /(\bbg|\btext|\bborder|\bring|\bdivide|\boutline|\bfill|\bstroke|\bfrom|\bto|\bvia|\bshadow|\bdrop-shadow|\bdecoration|\bplaceholder|\baccent|\bcaret)-\[#([0-9a-fA-F]{3,8})\](?:\/(\d+))?/g;

// Hex (lowercase) → token name. Used to suggest the right Tailwind class.
export const KNOWN_TOKENS = new Map([
  // Brand core
  ['1645ff', 'brand-blue'],
  ['ffe500', 'brand-yellow'],
  ['38b60e', 'brand-green'],
  ['fb3101', 'brand-red'],
  ['ff4b4b', 'brand-red-soft'],
  ['1cb0f6', 'brand-cyan'],
  // Brand variants
  ['2d950b', 'brand-green-deep'],
  ['58cc02', 'brand-green-light'],
  ['fcd200', 'brand-yellow-deep'],
  ['f8d34a', 'brand-yellow-soft'],
  ['ff6b6b', 'brand-red-light'],
  ['e04242', 'brand-red-deep'],
  ['1899d6', 'brand-cyan-deep'],
  // Brand accents (was: duo-*)
  ['ff9600', 'brand-orange'],
  ['ce82ff', 'brand-purple'],
  ['ffd700', 'brand-gold'],
  ['56707a', 'brand-slate'],
  // Brand accent variants
  ['46a302', 'brand-green'],         // alias: maps darker-lime to brand-green
  ['ff8a3d', 'brand-orange-light'],
  ['b8860b', 'brand-gold-deep'],
  ['3a4f56', 'brand-slate-deep'],
  // Surfaces core
  ['071013', 'surface-page'],
  ['0f1420', 'surface-page-alt'],
  ['0d1b21', 'surface-card-deep'],
  ['1b2f36', 'surface-card'],
  ['243b44', 'surface-card-tint'],
  ['131f24', 'surface-deep'],
  // Surface variants
  ['101820', 'surface-page-deep'],
  ['0f1f26', 'surface-card-deeper'],
  ['2a4a55', 'surface-card-light'],
  ['0d1117', 'surface-darkest'],
  ['17222a', 'surface-input'],

  // ── CONSOLIDATED ALIASES ──────────────────────────────────────────
  // Near-duplicates that visually match an existing token (within ~5%
  // lightness/saturation). Migrating these to the canonical token
  // removes meaningless palette drift without losing visible fidelity.

  // Greens that are essentially `brand-green` (#38B60E)
  ['43c417', 'brand-green'],   // PLAY AGAIN hover variant
  ['43c116', 'brand-green'],   // daily-challenge accent
  ['4cb801', 'brand-green'],   // ranked-mode CTA
  ['42c814', 'brand-green'],   // welcome screen
  ['369f19', 'brand-green'],   // mode-selection shadow stop

  // Greens that are essentially `brand-green-deep` (#2D950B)
  ['2ea00b', 'brand-green-deep'],   // welcome shadow
  ['2c8a0a', 'brand-green-deep'],   // welcome border
  ['2e8c16', 'brand-green-deep'],   // mode-selection
  ['348a1a', 'brand-green-deep'],   // recent-matches win pill
  ['3a8502', 'brand-green-deep'],   // money-drop border

  // Limes that are essentially `brand-green-light` (#58CC02)
  ['61d806', 'brand-green-light'],
  ['61d802', 'brand-green-light'],
  ['4caf00', 'brand-green-light'],

  // Soft reds / peach-reds → `brand-red-light` (#FF6B6B)
  ['ff8e8e', 'brand-red-light'],
  ['ff8d8d', 'brand-red-light'],
  ['ff7b7b', 'brand-red-light'],
  ['ff8a8a', 'brand-red-light'],
  ['ff9999', 'brand-red-light'],
  ['ff8b7d', 'brand-red-light'],

  // Reds → `brand-red-soft` (#FF4B4B)
  ['ff5f5f', 'brand-red-soft'],

  // Reds → `brand-red-deep` (#E04242)
  ['e04b3a', 'brand-red-deep'],

  // Reds → `brand-red` (#FB3101)
  ['e02b00', 'brand-red'],

  // Oranges → `brand-orange` (#FF9600)
  ['ffa500', 'brand-orange'],
  ['ffa620', 'brand-orange'],

  // Cyans → `brand-cyan` (#1CB0F6)
  ['18a0e0', 'brand-cyan'],
  ['1a9fe0', 'brand-cyan'],

  // Darker cyans → `brand-cyan-deep` (#1899D6)
  ['127fb3', 'brand-cyan-deep'],
  ['0a8bc5', 'brand-cyan-deep'],
  ['0f8ac4', 'brand-cyan-deep'],

  // Light slate-blue muted text → `brand-slate-light` (#9CB6C2)
  ['8fb7c5', 'brand-slate-light'],
  ['8cb7c7', 'brand-slate-light'],
  ['9cb8c4', 'brand-slate-light'],
  ['9eb3bc', 'brand-slate-light'],
  ['9fb1c3', 'brand-slate-light'],
  ['b9c7cd', 'brand-slate-light'],
  ['8fa3b8', 'brand-slate-light'],

  // Surface tokens added for the #13 cleanup
  ['041217', 'surface-row-deep'],
  ['1c2733', 'surface-map-panel'],
  ['131c27', 'surface-map-panel-deep'],
  ['1a3a1a', 'surface-mode-card'],
  ['224422', 'surface-mode-card-hover'],
  ['07200c', 'surface-mode-trough'],
  ['0f260f', 'surface-mode-trough-deep'],
  ['1a1510', 'surface-tournament-trough'],
  ['2a1f0f', 'surface-tournament-panel-from'],
  ['1f1a12', 'surface-tournament-panel-via'],

  // Brand variant tokens added for the #13 cleanup
  ['db8200', 'brand-orange-deep'],
  ['cc8800', 'brand-gold-press'],
  ['9a7900', 'brand-gold-ink'],
  ['a18f00', 'brand-gold-fill-deep'],
  ['b8401d', 'brand-red-rust'],
  ['4d1c1b', 'brand-red-rust-deep'],
  ['cc3e3e', 'brand-red-soft-deep'],
]);

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.git', 'public', '.turbo']);
const ACCEPTED_EXTENSIONS = new Set(['.tsx', '.ts']);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (ACCEPTED_EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

export function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return new Set();
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  return new Set(raw.files ?? []);
}

function saveAllowlist(files) {
  const sorted = [...files].sort();
  const body = {
    description:
      'Files that still contain inline hex Tailwind class strings (bg-[#hex], text-[#hex] etc). ' +
      'Remove a file from this list when you migrate it to brand tokens. ' +
      'New code MUST NOT introduce hex classes — files outside this list are blocked by the audit test.',
    files: sorted,
  };
  fs.writeFileSync(ALLOWLIST_PATH, `${JSON.stringify(body, null, 2)}\n`);
}

export function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const matches = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const re = new RegExp(HEX_CLASS_REGEX.source, 'g');
    let m;
    while ((m = re.exec(line)) !== null) {
      matches.push({
        line: i + 1,
        prefix: m[1],
        hex: m[2].toLowerCase(),
        opacity: m[3] ?? null,
        column: m.index + 1,
      });
    }
  }
  return matches;
}

/**
 * Returns the audit result for the current state of `src/`.
 * Test code can call this directly to assert no new offenders.
 */
export function audit(srcDir = SRC) {
  const perFile = [];
  for (const file of walk(srcDir)) {
    const hits = scanFile(file);
    if (hits.length > 0) {
      perFile.push({ file: path.relative(ROOT, file), hits });
    }
  }
  const filesWithHits = new Set(perFile.map((m) => m.file));
  const allowlist = loadAllowlist();
  const newOffenders = [...filesWithHits].filter((f) => !allowlist.has(f));
  const cleanedUp = [...allowlist].filter((f) => !filesWithHits.has(f));

  const byColor = new Map();
  for (const { hits } of perFile) {
    for (const h of hits) byColor.set(h.hex, (byColor.get(h.hex) ?? 0) + 1);
  }

  return { perFile, filesWithHits, allowlist, newOffenders, cleanedUp, byColor };
}

function printReport(result) {
  const { perFile, filesWithHits, allowlist, newOffenders, cleanedUp, byColor } = result;
  const totalHits = perFile.reduce((sum, f) => sum + f.hits.length, 0);

  console.log(`\nBrand color audit — ${SRC}\n${'─'.repeat(56)}`);
  console.log(`Total inline hex Tailwind class usages: ${totalHits}`);
  console.log(`Files containing them:                  ${filesWithHits.size}`);
  console.log(`Allowlist entries:                      ${allowlist.size}`);
  console.log(`Files cleaned up since last update:     ${cleanedUp.length}`);
  console.log(`New offenders (NOT on allowlist):       ${newOffenders.length}`);

  if (byColor.size > 0) {
    console.log('\nBy color:');
    const rows = [...byColor.entries()].sort((a, b) => b[1] - a[1]);
    for (const [hex, count] of rows) {
      const token = KNOWN_TOKENS.get(hex);
      const suffix = token ? `→ ${token}` : '(unmapped — add a token?)';
      console.log(`  #${hex.padEnd(7)} × ${String(count).padStart(4)}   ${suffix}`);
    }
  }

  if (newOffenders.length > 0) {
    console.log('\nNEW OFFENDERS (use brand tokens or add to allowlist):');
    for (const file of newOffenders) {
      const hits = perFile.find((m) => m.file === file)?.hits ?? [];
      console.log(`  ${file}  (${hits.length} hit${hits.length === 1 ? '' : 's'})`);
      for (const h of hits.slice(0, 3)) {
        console.log(`    L${h.line}: ${h.prefix}-[#${h.hex}]${h.opacity ? `/${h.opacity}` : ''}`);
      }
      if (hits.length > 3) console.log(`    … +${hits.length - 3} more`);
    }
  }

  if (cleanedUp.length > 0) {
    console.log('\nFiles cleaned up (remove from allowlist):');
    for (const file of cleanedUp) console.log(`  ${file}`);
  }
}

function printUnmappedDetail(result) {
  const { perFile } = result;
  // Group hits by hex so the user sees "this color appears in these files".
  const byHex = new Map();
  for (const { file, hits } of perFile) {
    for (const h of hits) {
      if (KNOWN_TOKENS.has(h.hex)) continue;
      if (!byHex.has(h.hex)) byHex.set(h.hex, []);
      byHex.get(h.hex).push({ file, ...h });
    }
  }
  if (byHex.size === 0) {
    console.log('\nNo unmapped hex colors. Everything maps to a token!');
    return;
  }
  console.log(`\nUnmapped hex colors (${byHex.size} unique values across ${[...byHex.values()].reduce((s, a) => s + a.length, 0)} usages):`);
  console.log('─'.repeat(56));
  // Sort hexes by usage count (desc) so highest-impact ones appear first.
  const sorted = [...byHex.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [hex, hits] of sorted) {
    console.log(`\n#${hex}  (×${hits.length})`);
    // Group hits by file for readability.
    const byFile = new Map();
    for (const h of hits) {
      if (!byFile.has(h.file)) byFile.set(h.file, []);
      byFile.get(h.file).push(h);
    }
    for (const [file, fileHits] of byFile) {
      const samples = fileHits.slice(0, 3).map((h) => `${h.prefix}-[#${h.hex}]${h.opacity ? `/${h.opacity}` : ''}`);
      console.log(`  ${file}  (×${fileHits.length})   ${samples.join(', ')}${fileHits.length > 3 ? ', …' : ''}`);
    }
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has('--update')
    ? 'update'
    : args.has('--report')
      ? 'report'
      : args.has('--unmapped')
        ? 'unmapped'
        : 'enforce';

  const result = audit();

  if (mode === 'unmapped') {
    printUnmappedDetail(result);
    process.exit(0);
  }

  printReport(result);

  if (mode === 'update') {
    saveAllowlist(result.filesWithHits);
    console.log(`\n→ Allowlist rewritten from current state (${result.filesWithHits.size} files).`);
    process.exit(0);
  }
  if (mode === 'report') process.exit(0);

  const failed = result.newOffenders.length > 0 || result.cleanedUp.length > 0;
  if (failed) {
    console.log(
      `\n✗ FAIL — ${result.newOffenders.length} new offender(s), ` +
      `${result.cleanedUp.length} stale allowlist entr${result.cleanedUp.length === 1 ? 'y' : 'ies'}.`
    );
    console.log('  Fix:  use brand tokens (bg-brand-blue / text-brand-yellow / …)');
    console.log('  Or:   if intentional, run "npm run colors:update" to rewrite the allowlist.');
    process.exit(1);
  }
  console.log('\n✓ OK — no new hex offenders, allowlist is clean.');
  process.exit(0);
}

// Only run main() when invoked directly, not when imported as a module.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}
