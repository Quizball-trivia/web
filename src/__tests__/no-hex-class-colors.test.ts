import { describe, expect, it } from 'vitest';
import { audit } from '../../scripts/audit-brand-colors.mjs';

interface AuditMatch {
  line: number;
  prefix: string;
  hex: string;
  opacity: string | null;
  column: number;
}

interface AuditResult {
  perFile: Array<{ file: string; hits: AuditMatch[] }>;
  filesWithHits: Set<string>;
  allowlist: Set<string>;
  newOffenders: string[];
  cleanedUp: string[];
  byColor: Map<string, number>;
}

describe('inline hex Tailwind classes (brand-color regression guard)', () => {
  // The audit walks `src/` for class strings like `bg-brand-blue`,
  // `text-brand-yellow/20` etc. New code must use brand tokens
  // (bg-brand-blue, text-brand-yellow, …). Files migrated off raw hex
  // should be removed from scripts/brand-colors-allowlist.json so the
  // ratchet keeps tightening.
  it('does not introduce new files with inline hex Tailwind classes', () => {
    const result = audit() as AuditResult;
    expect(result.newOffenders, formatOffenders(result)).toEqual([]);
  });

  it('keeps the allowlist in sync with reality (no stale entries)', () => {
    const result = audit() as AuditResult;
    expect(
      result.cleanedUp,
      `These files no longer contain hex classes — remove them from scripts/brand-colors-allowlist.json:\n${result.cleanedUp.map((f) => `  - ${f}`).join('\n')}\n\nOr run: npm run colors:update`
    ).toEqual([]);
  });
});

function formatOffenders(result: AuditResult): string {
  if (result.newOffenders.length === 0) return '';
  const lines: string[] = [
    '',
    `${result.newOffenders.length} file(s) introduce hex classes outside the allowlist.`,
    'Use brand tokens instead (bg-brand-blue, text-brand-yellow, border-brand-cyan/20, …).',
    '',
  ];
  for (const file of result.newOffenders) {
    const fileEntry = result.perFile.find((p) => p.file === file);
    const hits = fileEntry?.hits ?? [];
    lines.push(`  ${file}  (${hits.length} hit${hits.length === 1 ? '' : 's'})`);
    for (const h of hits.slice(0, 3)) {
      lines.push(`    L${h.line}: ${h.prefix}-[#${h.hex}]${h.opacity ? `/${h.opacity}` : ''}`);
    }
    if (hits.length > 3) lines.push(`    … +${hits.length - 3} more`);
  }
  lines.push('');
  lines.push('If you are intentionally adding to the allowlist, run: npm run colors:update');
  return lines.join('\n');
}
