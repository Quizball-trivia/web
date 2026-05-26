#!/usr/bin/env node
/**
 * Rewrite inline hex Tailwind class strings to brand tokens.
 *
 * Walks src/ and replaces:
 *   bg-[#1645FF]      → bg-brand-blue
 *   text-[#FFE500]    → text-brand-yellow
 *   border-[#1CB0F6]/20 → border-brand-cyan/20   (opacity preserved)
 *
 * Only rewrites colors that have a mapping in KNOWN_TOKENS (imported from
 * the audit script). Unmapped colors are left alone.
 *
 * Usage:
 *   node scripts/migrate-brand-colors.mjs           # dry-run (default)
 *   node scripts/migrate-brand-colors.mjs --write   # actually write changes
 */

import fs from 'node:fs';
import path from 'node:path';
import { HEX_CLASS_REGEX, KNOWN_TOKENS, ROOT, SRC } from './audit-brand-colors.mjs';

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.git', 'public', '.turbo']);
const ACCEPTED_EXTENSIONS = new Set(['.tsx', '.ts']);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (ACCEPTED_EXTENSIONS.has(path.extname(entry.name))) yield full;
  }
}

function migrateFile(filePath, write) {
  const original = fs.readFileSync(filePath, 'utf8');
  let mapped = 0;
  let skipped = 0;

  const next = original.replace(new RegExp(HEX_CLASS_REGEX.source, 'g'), (match, prefix, hex, opacity) => {
    const lower = hex.toLowerCase();
    const token = KNOWN_TOKENS.get(lower);
    if (!token) {
      skipped++;
      return match;
    }
    mapped++;
    return `${prefix}-${token}${opacity ? `/${opacity}` : ''}`;
  });

  const changed = next !== original;
  if (changed && write) {
    fs.writeFileSync(filePath, next);
  }
  return { changed, mapped, skipped };
}

function main() {
  const write = process.argv.includes('--write');

  const results = [];
  for (const file of walk(SRC)) {
    const { changed, mapped, skipped } = migrateFile(file, write);
    if (changed || mapped > 0) {
      results.push({ file: path.relative(ROOT, file), mapped, skipped });
    }
  }

  results.sort((a, b) => b.mapped - a.mapped);

  const totalMapped = results.reduce((s, r) => s + r.mapped, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);

  console.log(`\nBrand color migration ${write ? '(WRITE)' : '(DRY RUN)'}`);
  console.log('─'.repeat(56));
  console.log(`Files touched:           ${results.length}`);
  console.log(`Hex usages → tokens:     ${totalMapped}`);
  console.log(`Hex usages left as-is:   ${totalSkipped} (unmapped colors)`);

  if (results.length > 0) {
    console.log('\nTop 15 files by replacements:');
    for (const r of results.slice(0, 15)) {
      console.log(
        `  ${r.file.padEnd(60)}  +${String(r.mapped).padStart(3)} mapped${r.skipped > 0 ? `, ${r.skipped} skipped` : ''}`
      );
    }
    if (results.length > 15) console.log(`  … +${results.length - 15} more files`);
  }

  if (!write) {
    console.log('\nDRY RUN — no files written. Re-run with --write to apply.');
  } else {
    console.log('\nDone. Next:');
    console.log('  1. npm run colors:update    # refresh allowlist');
    console.log('  2. npm run typecheck        # ts errors');
    console.log('  3. npm run build            # catches invalid utility class names');
    console.log('  4. npm test                 # regressions');
  }
}

main();
