/**
 * Local mirror of the backend's clue answer matcher
 * (`possession-answer-matching.ts`), so the prototype accepts the same guesses
 * ranked would: diacritic-insensitive, punctuation-insensitive, whole-word
 * (surname alone counts) and typo-tolerant.
 */

export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function levenshtein(left: string, right: string): number {
  const matrix: number[][] = [];
  for (let row = 0; row <= right.length; row += 1) matrix[row] = [row];
  for (let column = 0; column <= left.length; column += 1) matrix[0][column] = column;
  for (let row = 1; row <= right.length; row += 1) {
    for (let column = 1; column <= left.length; column += 1) {
      matrix[row][column] =
        right[row - 1] === left[column - 1]
          ? matrix[row - 1][column - 1]
          : Math.min(
              matrix[row - 1][column - 1] + 1,
              matrix[row][column - 1] + 1,
              matrix[row - 1][column] + 1,
            );
    }
  }
  return matrix[right.length][left.length];
}

function containsWholeWord(haystack: string, needle: string): boolean {
  if (haystack === needle) return true;
  if (haystack.startsWith(`${needle} `)) return true;
  if (haystack.endsWith(` ${needle}`)) return true;
  return haystack.includes(` ${needle} `);
}

function maxTypoDistance(target: string): number {
  if (target.length < 5) return 0;
  return target.length > 6 ? 2 : 1;
}

/** True when `guess` should be accepted for `accepted`. */
export function matchesAnswer(guess: string, accepted: string): boolean {
  const g = normalizeAnswer(guess);
  const a = normalizeAnswer(accepted);
  if (!g || !a) return false;
  if (g === a) return true;

  // Surname (or any complete token) on its own is accepted, as in ranked.
  const tokens = a.split(' ').filter((tok) => tok.length >= 3);
  if (containsWholeWord(a, g)) return true;

  for (const target of [a, ...tokens]) {
    const allowed = maxTypoDistance(target);
    if (allowed <= 0) continue;
    if (Math.abs(target.length - g.length) > allowed) continue;
    if (levenshtein(g, target) <= allowed) return true;
  }
  return false;
}
