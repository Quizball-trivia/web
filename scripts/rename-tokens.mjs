#!/usr/bin/env node
/**
 * Rename Tailwind token utilities across the codebase.
 *
 * Replaces e.g. `bg-duo-lime/20` → `bg-brand-green-light/20` for every
 * Tailwind prefix (bg/text/border/ring/divide/from/to/via/…). Used when
 * we rename a token in globals.css and need to update all call sites.
 *
 * Usage:
 *   node scripts/rename-tokens.mjs            # dry run
 *   node scripts/rename-tokens.mjs --write    # actually write
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// Order matters — longest source token first so prefix-substring tokens
// (e.g. `duo-orange-light` vs `duo-orange`) don't get clobbered by the
// shorter rule. The script applies them in order.
const RENAMES = [
  // Duolingo accents → brand-prefixed
  ['duo-orange-light', 'brand-orange-light'],
  ['duo-orange', 'brand-orange'],
  ['duo-purple', 'brand-purple'],
  ['duo-gold-deep', 'brand-gold-deep'],
  ['duo-gold', 'brand-gold'],
  ['duo-slate-deep', 'brand-slate-deep'],
  ['duo-slate-light', 'brand-slate-light'],
  ['duo-slate', 'brand-slate'],
  // Lime family — `duo-lime` becomes a new `brand-green-light` token
  // (it's a brighter, more saturated green than `brand-green`). The
  // `-deep` variant collapses into the existing `brand-green` since
  // they're visually within ~5% of each other.
  ['duo-lime-deep', 'brand-green'],
  ['duo-lime', 'brand-green-light'],
];

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.git', 'public', '.turbo']);
const ACCEPTED = new Set(['.tsx', '.ts']);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (ACCEPTED.has(path.extname(entry.name))) yield full;
  }
}

// Match any Tailwind utility prefix followed by `-<token>` and an optional
// `/<opacity>` suffix. Uses lookbehind for safe boundaries.
const PREFIXES =
  '(bg|text|border|ring|divide|outline|fill|stroke|from|to|via|shadow|drop-shadow|decoration|placeholder|accent|caret)';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function rewrite(text, from, to) {
  // (?<![\w-]) ensures we don't match e.g. `bg-mduo-orange` (unlikely but safe).
  // Allow optional opacity modifier `/N` to pass through.
  const re = new RegExp(`(?<![\\w-])${PREFIXES}-${escapeRegex(from)}(?=$|[\\s/'"\`}\\]>])`, 'g');
  return text.replace(re, (_match, prefix) => `${prefix}-${to}`);
}

function main() {
  const write = process.argv.includes('--write');
  const results = [];

  for (const file of walk(SRC)) {
    const original = fs.readFileSync(file, 'utf8');
    let next = original;
    let totalReplacements = 0;

    for (const [from, to] of RENAMES) {
      const before = next;
      next = rewrite(next, from, to);
      if (next !== before) {
        const matches = before.match(new RegExp(`(?<![\\w-])${PREFIXES}-${escapeRegex(from)}(?=$|[\\s/'"\`}\\]>])`, 'g')) ?? [];
        totalReplacements += matches.length;
      }
    }

    if (next !== original) {
      results.push({ file: path.relative(ROOT, file), replacements: totalReplacements });
      if (write) fs.writeFileSync(file, next);
    }
  }

  results.sort((a, b) => b.replacements - a.replacements);
  const total = results.reduce((s, r) => s + r.replacements, 0);

  console.log(`\nToken rename ${write ? '(WRITE)' : '(DRY RUN)'}`);
  console.log('─'.repeat(56));
  console.log(`Files touched:        ${results.length}`);
  console.log(`Class renames:        ${total}`);
  console.log('\nMappings applied:');
  for (const [from, to] of RENAMES) console.log(`  ${from.padEnd(20)} → ${to}`);

  if (results.length > 0) {
    console.log('\nTop files by replacements:');
    for (const r of results.slice(0, 15)) {
      console.log(`  ${r.file.padEnd(60)}  +${String(r.replacements).padStart(3)}`);
    }
    if (results.length > 15) console.log(`  … +${results.length - 15} more files`);
  }

  if (!write) console.log('\nDRY RUN — no files written. Re-run with --write to apply.');
}

main();
