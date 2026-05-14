import clubsData from '@/data/top5leagues-clubs.json';

export interface Club {
  id: string;
  label: string;
  value: string;
  league: string;
  logo: string;
  primaryColor: string;
}

export const clubs: Club[] = clubsData as Club[];

const byId = new Map<string, Club>(clubs.map((c) => [c.id, c]));
const byValue = new Map<string, Club>(clubs.map((c) => [c.value.toLowerCase(), c]));

/**
 * Resolve a club by its stored `value` (the display name persisted on the
 * user profile, e.g. "Manchester United") or by id (slug). Falls back to a
 * fuzzy match on label so legacy values that don't exactly match a current
 * entry still resolve when possible.
 */
export function getClub(idOrValue: string | null | undefined): Club | null {
  if (!idOrValue) return null;
  const direct = byId.get(idOrValue) ?? byValue.get(idOrValue.toLowerCase());
  if (direct) return direct;

  // Loose match — strip common suffixes ("FC", "AFC") and re-compare.
  const norm = idOrValue.toLowerCase().replace(/\b(fc|afc|cf|sc|ac|ss|us)\b/g, '').trim().replace(/\s+/g, ' ');
  for (const club of clubs) {
    const clubNorm = club.value.toLowerCase().replace(/\b(fc|afc|cf|sc|ac|ss|us)\b/g, '').trim().replace(/\s+/g, ' ');
    if (clubNorm === norm) return club;
  }
  return null;
}
