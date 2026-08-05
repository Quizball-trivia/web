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
  /** Resolved, ready-to-use crest URL (built from the active Supabase env). */
  logo: string;
  primaryColor: string;
  /** Hidden from the public picker (special/event clubs). Still resolvable. */
  hidden?: boolean;
  /** When set, only this user may see/choose this club in the picker. */
  restrictedToUserId?: string;
}

/** Raw club rows store the crest as a bare filename (e.g. "arsenal.webp"). */
type ClubRow = Omit<Club, 'logo'> & { logo: string };

const LOGO_BUCKET_PATH = 'storage/v1/object/public/imgs/club-logos';

/**
 * Build a crest URL from the active Supabase project so the SAME data works on
 * staging and prod without editing URLs — the logos are uploaded to both
 * buckets, and NEXT_PUBLIC_SUPABASE_URL selects the environment at runtime.
 * Falls back to the bare value if it already looks like an absolute URL (legacy)
 * or if the env is unset (so SSR/build never crashes).
 */
export function clubLogoUrl(file: string): string {
  if (/^https?:\/\//i.test(file)) return file; // already absolute (legacy/back-compat)
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  return base ? `${base}/${LOGO_BUCKET_PATH}/${file}` : `/${file}`;
}

export const clubs: Club[] = (clubsData as ClubRow[]).map((c) => ({
  ...c,
  logo: clubLogoUrl(c.logo),
}));

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

/**
 * Best-effort crest lookup by club NAME (career-path payloads carry names, not
 * ids): exact match on id/value/label first, then a normalized comparison that
 * ignores case, punctuation and the usual FC/CF/AC/SC prefixes and suffixes.
 * Returns null when nothing matches — callers fall back to a text chip.
 */
export function findClubByName(name: string | null | undefined): Club | null {
  if (!name) return null;
  const direct = getClub(name);
  if (direct) return direct;
  const norm = expandAliases(normalizeClubName(name));
  if (norm === '') return null;
  const exact = clubs.find((c) => normalizeClubName(c.value) === norm)
    ?? clubs.find((c) => normalizeClubName(c.label) === norm)
    ?? clubs.find((c) => normalizeClubName(c.id) === norm);
  if (exact) return exact;
  // Last resort: a registry name that starts with the query (or vice versa),
  // which catches "Inter" vs "Inter Milan" style shorthand. Requires a
  // reasonably specific query so short words can't match half the league.
  if (norm.length < 5) return null;
  return clubs.find((c) => {
    const v = normalizeClubName(c.value);
    return v.startsWith(`${norm} `) || norm.startsWith(`${v} `);
  }) ?? null;
}

/** Shorthand that appears in question content but not in the registry. */
const CLUB_ALIASES: Record<string, string> = {
  'man united': 'manchester united',
  'man utd': 'manchester united',
  'man city': 'manchester city',
  'spurs': 'tottenham hotspur',
  'inter': 'inter milan',
  'psg': 'paris saint germain',
  'atleti': 'atletico madrid',
  'barca': 'barcelona',
  'bayern': 'bayern munich',
  'gladbach': 'borussia monchengladbach',
  'dortmund': 'borussia dortmund',
};

function expandAliases(norm: string): string {
  return CLUB_ALIASES[norm] ?? norm;
}

function normalizeClubName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(fc|cf|ac|sc|sv|as|ss|ssc|afc|bsc|rc|us|ud|cd|club|de|futbol|football)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
