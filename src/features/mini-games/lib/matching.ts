import { levenshtein, normalizeAnswer } from '@/lib/answerMatching';

/**
 * Fuzzy player-name matching for the mini-games. Builds on the app's shared
 * `normalizeAnswer` (NFKD + diacritic strip, so accents fold away) and
 * `levenshtein`, and adds:
 *   - Georgian → Latin transliteration (so "მესი" matches "Messi")
 *   - Turkish dotless-i folding (ı → i)
 * Accepted-answer lists in the mock data also carry common transliterations, so
 * between the two a typo-tolerant, script-tolerant match is easy to hit.
 */

const GEORGIAN_TO_LATIN: Record<string, string> = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i',
  კ: 'k', ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's',
  ტ: 't', უ: 'u', ფ: 'p', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch', ც: 'ts',
  ძ: 'dz', წ: 'ts', ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
};

function transliterate(value: string): string {
  let out = '';
  for (const ch of value) out += GEORGIAN_TO_LATIN[ch] ?? ch;
  // Turkish dotless / dotted i that NFKD won't fold to a plain "i".
  return out.replace(/ı/g, 'i').replace(/İ/g, 'i');
}

export function normalizeName(value: string): string {
  return normalizeAnswer(transliterate(value));
}

export interface NameMatch {
  ok: boolean;
  /** Edit distance of the best match (0 = exact); Infinity when no match. */
  distance: number;
}

/** Match `input` against a player's accepted answers, tolerant of typos, accents,
 *  and Georgian / Turkish transliteration. */
export function matchesName(input: string, accepted: string[]): NameMatch {
  const ni = normalizeName(input);
  if (!ni) return { ok: false, distance: Infinity };

  let best = Infinity;
  for (const answer of accepted) {
    const na = normalizeName(answer);
    if (!na) continue;

    if (ni === na) return { ok: true, distance: 0 };

    // Surname / whole-word hit (e.g. typing just "ronaldo").
    const tokens = na.split(' ');
    if (ni.length >= 4 && (tokens.includes(ni) || na.includes(ni))) {
      best = Math.min(best, 1);
      continue;
    }

    // Typo tolerance scales with length; compare to the full string and each token.
    const allowed = ni.length < 5 ? 1 : ni.length > 8 ? 3 : 2;
    for (const target of [na, ...tokens]) {
      if (Math.abs(target.length - ni.length) > allowed) continue;
      const d = levenshtein(ni, target);
      if (d <= allowed) best = Math.min(best, d);
    }
  }

  return { ok: best !== Infinity, distance: best === Infinity ? Infinity : best };
}
