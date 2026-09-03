// Shared helpers for the game-mode-lab prototypes. Everything in this feature
// is client-only prototype code with hardcoded data — safe to delete wholesale.

/** Lowercase, strip diacritics/punctuation so "Özil" matches "ozil". */
export function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the typed input matches a canonical name or any alias. */
export function matchesName(input: string, name: string, aliases: string[] = []): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  return [name, ...aliases].some((candidate) => normalizeAnswer(candidate) === normalized);
}

/** Random "opponent is thinking" delay in ms. */
export function thinkDelay(min = 900, max = 1800): number {
  return Math.round(min + Math.random() * (max - min));
}
