import clubsData from '@/data/clubs.json';

export interface Club {
  id: string;
  label: string;
  value: string;
  /** Country bucket (English) used for grouping in the picker. */
  country: string;
  /** Country name (Georgian) for the grouped picker headings. */
  countryKa?: string;
  /** Flag emoji for the country group. */
  flag?: string;
  logo: string;
  primaryColor: string;
  /** Hidden from the public picker (special/event clubs). Still resolvable. */
  hidden?: boolean;
  /** When set, only this user may see/choose this club in the picker. */
  restrictedToUserId?: string;
}

export const clubs: Club[] = clubsData as Club[];

const byId = new Map<string, Club>(clubs.map((c) => [c.id, c]));
const byValue = new Map<string, Club>(clubs.map((c) => [c.value.toLowerCase(), c]));

/**
 * Clubs selectable by a given user in the picker. Public clubs are always
 * included; a hidden club is included only when it is restricted to exactly this
 * user (e.g. the owms-only "Zlatan F.C."). Pass null for an anonymous/other user.
 */
export function selectableClubs(userId: string | null | undefined): Club[] {
  return clubs.filter((c) => {
    if (!c.hidden) return true;
    return Boolean(c.restrictedToUserId && c.restrictedToUserId === userId);
  });
}

/**
 * Resolve a club by its stored `value` (the display name persisted on the
 * user profile, e.g. "Manchester United") or by id (slug). Falls back to a
 * fuzzy match on label so legacy values that don't exactly match a current
 * entry still resolve when possible. Hidden clubs ARE resolvable here (so a
 * restricted club still renders for its owner everywhere it's displayed).
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
