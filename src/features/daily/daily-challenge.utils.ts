"use client";

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function levenshteinDistance(left: string, right: string): number {
  const matrix: number[][] = [];

  for (let rowIndex = 0; rowIndex <= right.length; rowIndex += 1) {
    matrix[rowIndex] = [rowIndex];
  }

  for (let columnIndex = 0; columnIndex <= left.length; columnIndex += 1) {
    matrix[0]![columnIndex] = columnIndex;
  }

  for (let rowIndex = 1; rowIndex <= right.length; rowIndex += 1) {
    for (let columnIndex = 1; columnIndex <= left.length; columnIndex += 1) {
      if (right.charAt(rowIndex - 1) === left.charAt(columnIndex - 1)) {
        matrix[rowIndex]![columnIndex] = matrix[rowIndex - 1]![columnIndex - 1]!;
      } else {
        matrix[rowIndex]![columnIndex] = Math.min(
          matrix[rowIndex - 1]![columnIndex - 1]! + 1,
          matrix[rowIndex]![columnIndex - 1]! + 1,
          matrix[rowIndex - 1]![columnIndex]! + 1
        );
      }
    }
  }

  return matrix[right.length]![left.length]!;
}

export function fuzzyMatch(input: string, target: string): boolean {
  const normalizedInput = normalizeAnswer(input);
  const normalizedTarget = normalizeAnswer(target);

  if (!normalizedInput || !normalizedTarget) {
    return false;
  }

  if (normalizedInput === normalizedTarget) {
    return true;
  }

  const maxDistance = normalizedTarget.length > 6 ? 2 : 1;
  return levenshteinDistance(normalizedInput, normalizedTarget) <= maxDistance;
}

export function findAcceptedAnswer(
  input: string,
  acceptedAnswers: string[]
): string | null {
  const normalizedInput = normalizeAnswer(input);
  if (!normalizedInput) {
    return null;
  }

  for (const acceptedAnswer of acceptedAnswers) {
    if (fuzzyMatch(normalizedInput, acceptedAnswer)) {
      return acceptedAnswer;
    }
  }

  return null;
}
