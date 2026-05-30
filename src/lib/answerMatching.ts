const MIN_PREFIX_LENGTH = 3;

type AcceptedAnswerMatchKind = "exact" | "wholeWord" | "typo";

interface AcceptedAnswerMatch {
  kind: AcceptedAnswerMatchKind;
  distance: number;
}

export interface CountdownAnswerGroupMatchable {
  display: string;
  acceptedAnswers: string[];
}

export interface RankedCountdownMatch {
  display: string;
  score: number;
}

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function levenshtein(left: string, right: string): number {
  const matrix: number[][] = [];

  for (let row = 0; row <= right.length; row += 1) {
    matrix[row] = [row];
  }
  for (let column = 0; column <= left.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= right.length; row += 1) {
    for (let column = 1; column <= left.length; column += 1) {
      matrix[row][column] = right[row - 1] === left[column - 1]
        ? matrix[row - 1][column - 1]
        : Math.min(
            matrix[row - 1][column - 1] + 1,
            matrix[row][column - 1] + 1,
            matrix[row - 1][column] + 1
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

function answerTokens(value: string): string[] {
  return value.split(" ").filter(Boolean);
}

function maxTypoDistance(target: string): number {
  if (target.length < 5) return 0;
  return target.length > 6 ? 2 : 1;
}

function matchRank(kind: AcceptedAnswerMatchKind): number {
  if (kind === "exact") return 3;
  if (kind === "wholeWord") return 2;
  return 1;
}

function betterAcceptedMatch(
  current: AcceptedAnswerMatch | null,
  next: AcceptedAnswerMatch
): AcceptedAnswerMatch {
  if (!current) return next;
  const currentRank = matchRank(current.kind);
  const nextRank = matchRank(next.kind);
  if (currentRank !== nextRank) return nextRank > currentRank ? next : current;
  return next.distance < current.distance ? next : current;
}

function matchNormalizedAcceptedAnswer(
  normalizedInput: string,
  normalizedAccepted: string
): AcceptedAnswerMatch | null {
  if (!normalizedAccepted) return null;
  if (normalizedInput === normalizedAccepted) return { kind: "exact", distance: 0 };
  if (normalizedInput.length >= 4 && containsWholeWord(normalizedAccepted, normalizedInput)) {
    return { kind: "wholeWord", distance: 0 };
  }

  if (normalizedInput.length < 4) return null;

  const typoTargets = [normalizedAccepted, ...answerTokens(normalizedAccepted)];
  let bestTypo: AcceptedAnswerMatch | null = null;

  for (const target of typoTargets) {
    const allowedDistance = maxTypoDistance(target);
    if (allowedDistance <= 0) continue;

    const distance = levenshtein(normalizedInput, target);
    if (distance <= allowedDistance) {
      bestTypo = betterAcceptedMatch(bestTypo, { kind: "typo", distance });
    }
  }

  return bestTypo;
}

function matchAcceptedAnswers(input: string, acceptedAnswers: string[]): AcceptedAnswerMatch | null {
  const normalizedInput = normalizeAnswer(input);
  if (!normalizedInput) return null;

  return acceptedAnswers.reduce<AcceptedAnswerMatch | null>((best, acceptedAnswer) => {
    const match = matchNormalizedAcceptedAnswer(normalizedInput, normalizeAnswer(acceptedAnswer));
    return match ? betterAcceptedMatch(best, match) : best;
  }, null);
}

export function fuzzyMatchesAnswer(input: string, acceptedAnswers: string[]): boolean {
  return matchAcceptedAnswers(input, acceptedAnswers) !== null;
}

function hasPrefixMatch(acceptedAnswers: string[], normalizedInput: string): boolean {
  return acceptedAnswers.some((acceptedAnswer) => {
    const normalizedAccepted = normalizeAnswer(acceptedAnswer);
    if (!normalizedAccepted) return false;
    return normalizedAccepted.startsWith(normalizedInput)
      || answerTokens(normalizedAccepted).some((token) => token.startsWith(normalizedInput));
  });
}

export function countdownMatch(
  input: string,
  answerGroups: CountdownAnswerGroupMatchable[],
  foundAnswers: string[]
): string | null {
  const normalizedInput = normalizeAnswer(input);
  if (!normalizedInput) return null;

  const foundSet = new Set(foundAnswers);
  const candidates = answerGroups
    .map((group) => ({
      group,
      match: matchAcceptedAnswers(input, group.acceptedAnswers),
    }))
    .filter((entry): entry is { group: CountdownAnswerGroupMatchable; match: AcceptedAnswerMatch } => entry.match !== null);

  for (const kind of ["exact", "wholeWord", "typo"] satisfies AcceptedAnswerMatchKind[]) {
    const matchesForKind = candidates.filter((candidate) => candidate.match.kind === kind);
    if (matchesForKind.length === 0) continue;

    const uniqueDisplays = new Set(matchesForKind.map((candidate) => candidate.group.display));
    if (uniqueDisplays.size !== 1) return null;

    const matchedDisplay = matchesForKind[0].group.display;
    if (!foundSet.has(matchedDisplay)) return matchedDisplay;
  }

  if (normalizedInput.length < MIN_PREFIX_LENGTH) return null;

  const prefixCandidates = answerGroups.filter((group) => hasPrefixMatch(group.acceptedAnswers, normalizedInput));
  if (prefixCandidates.length !== 1) return null;

  const matchedDisplay = prefixCandidates[0].display;
  return foundSet.has(matchedDisplay) ? null : matchedDisplay;
}

export function rankCountdownMatches(
  input: string,
  answerGroups: CountdownAnswerGroupMatchable[],
  foundAnswers: string[]
): RankedCountdownMatch[] {
  const normalizedInput = normalizeAnswer(input);
  if (!normalizedInput) return [];

  const foundSet = new Set(foundAnswers);

  return answerGroups
    .filter((group) => !foundSet.has(group.display))
    .map((group) => {
      const answerMatch = matchAcceptedAnswers(input, group.acceptedAnswers);
      const prefixMatch = hasPrefixMatch(group.acceptedAnswers, normalizedInput);
      const score = answerMatch
        ? matchRank(answerMatch.kind) * 100 - answerMatch.distance
        : prefixMatch
          ? 90
          : 0;

      return {
        display: group.display,
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.display.localeCompare(b.display))
    .slice(0, 3);
}
