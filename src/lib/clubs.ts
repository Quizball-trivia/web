import clubsData from '@/data/clubs.json';
import crestFileList from '@/data/club-crest-files.json';

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
 *
 * `strictPrefix` governs the last-resort prefix match. Career-path callers
 * keep the permissive legacy behavior ("Zrinjski Mostar" → wl-zrinjski,
 * "Newcastle" → Newcastle United). The auction crest resolver passes true so
 * the non-shared remainder must be generic filler — without that, "Paris FC"
 * matched Paris Saint-Germain and "Los Angeles Galaxy" matched Los Angeles FC
 * (a DIFFERENT club's crest on the card).
 */
export function findClubByName(
  name: string | null | undefined,
  { strictPrefix = false }: { strictPrefix?: boolean } = {},
): Club | null {
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
  // which catches "Inter" vs "Inter Milan" style shorthand.
  if (norm.length < 5) return null;
  return clubs.find((c) => {
    const v = normalizeClubName(c.value);
    if (v.startsWith(`${norm} `)) return !strictPrefix || isGenericRemainder(v.slice(norm.length));
    if (norm.startsWith(`${v} `)) return !strictPrefix || isGenericRemainder(norm.slice(v.length));
    return false;
  }) ?? null;
}

const GENERIC_CLUB_TOKENS = new Set([
  'fc', 'cf', 'ac', 'sc', 'afc', 'cfc', 'bsc', 'club', 'calcio',
]);

function isGenericRemainder(remainder: string): boolean {
  const tokens = remainder.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => GENERIC_CLUB_TOKENS.has(token) || /^\d+$/.test(token));
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

// ── Crest resolution for Transfermarkt-named content (auction) ───────────────


const CREST_FILES = new Set<string>(crestFileList as string[]);

/** TM formal names whose local crest file lives under a different slug. */
const CREST_SLUG_ALIASES: Record<string, string> = {
  'associazione-sportiva-roma': 'as-roma',
  'bournemouth': 'afc-bournemouth',
  'societa-sportiva-lazio-s-p-a': 'ss-lazio',
  '1-fussballclub-heidenheim-1846': '1-fc-heidenheim-1846',
  'bologna-football-club-1909': 'bologna-fc-1909',
  'olympique-marseille': 'olympique-marseille',
  'wolverhampton-wanderers': 'wolverhampton-wanderers',
};

/**
 * Registry entries whose uploaded logo is CORRUPT — a Wikimedia Commons
 * placeholder was scraped instead of the club's crest (28 wl-* entries,
 * verified by content hash 2026-08-18). Resolving these as crests painted the
 * placeholder blob on player chips; they must render as no-crest instead.
 */
const CORRUPT_LOGO_CLUB_IDS = new Set([
  'wl-anzhi-makhachkala', 'wl-barnet', 'wl-beveren', 'wl-bournemouth',
  'wl-coventry-city', 'wl-crystal-palace', 'wl-cska-moscow', 'wl-d-c-united',
  'wl-den-bosch', 'wl-dijon', 'wl-envigado', 'wl-espanyol',
  'wl-heerenveen', 'wl-lille', 'wl-malaga', 'wl-mallorca',
  'wl-metalurh-donetsk', 'wl-new-york-red-bulls', 'wl-nice', 'wl-nimes',
  'wl-paok', 'wl-perth-glory', 'wl-qingdao-huanghai', 'wl-sagan-tosu',
  'wl-sporting-gijon', 'wl-stoke-city', 'wl-willem-ii', 'wl-zaragoza',
]);

/**
 * TM formal names (slugified) → registry ids, for clubs the fuzzy matcher
 * can't safely reach ("Clube de Regatas do Flamengo" → Flamengo). Every pair
 * was hand-verified against the uploaded crest art — do not add entries
 * without eyeballing the bucket image first.
 */
const CREST_REGISTRY_ALIASES: Record<string, string> = {
  'ajax-amsterdam': 'afc-ajax',
  'al-ahli-saudi-football-club': 'wl-al-ahli',
  'al-qadsiah-saudi-football-club': 'wl-al-qadsiah',
  'besiktas-jimnastik-kulubu': 'wl-besiktas',
  'chicago-fire-soccer-club': 'wl-chicago-fire',
  'club-atletico-river-plate': 'river-plate',
  'club-atletico-rosario-central': 'wl-rosario-central',
  'club-de-regatas-vasco-da-gama': 'wl-vasco-da-gama',
  'club-internacional-de-futbol-miami': 'wl-inter-miami',
  'clube-atletico-mineiro': 'wl-atletico-mineiro',
  'clube-de-regatas-do-flamengo': 'flamengo',
  'cruzeiro-esporte-clube': 'wl-cruzeiro',
  'feyenoord-rotterdam': 'feyenoord',
  'fk-dinamo-moskva': 'wl-dynamo-moscow',
  'fk-spartak-moskva': 'wl-spartak-moscow',
  'gnk-dinamo-zagreb': 'wl-dinamo-zagreb',
  'krc-genk': 'wl-genk',
  'los-angeles-galaxy': 'wl-la-galaxy',
  'olympiakos-syndesmos-filathlon-peiraios': 'wl-olympiacos',
  'racing-club-asociacion-civil-de-avellaneda': 'racing-club',
  'rsc-anderlecht': 'wl-anderlecht',
  's-a-f-botafogo': 'wl-botafogo',
  'santos-futebol-clube': 'santos-fc',
  'sociedade-esportiva-palmeiras': 'wl-palmeiras',
  'sport-club-corinthians-paulista': 'corinthians',
  'sport-club-internacional': 'wl-internacional',
};

/** Transfermarkt-style slug: lowercase ASCII, non-alphanumerics collapsed. */
export function slugifyClubName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ResolvedClubCrest {
  label: string;
  logo: string;
}

/**
 * Crest lookup for TM club names (auction cards/pitch chips/chemistry rows).
 * Order matters:
 *  1. The local career-path crest set (`public/clubs`, TM-slug filenames) —
 *     exact, high-quality art keyed by the same naming the auction data uses.
 *  2. The club registry via findClubByName — broader coverage (Saudi, MLS,
 *     Turkish, Brazilian leagues via the wl set), EXCLUDING entries whose
 *     uploaded logo is the corrupt Wikimedia placeholder.
 * Returns null when neither yields a trustworthy crest — callers render
 * text/flag-only, which beats a wrong or corrupt crest.
 */
export function resolveClubCrestByName(name: string | null | undefined): ResolvedClubCrest | null {
  if (!name) return null;
  const slug = slugifyClubName(name);
  const fileSlug = CREST_SLUG_ALIASES[slug] ?? slug;
  if (CREST_FILES.has(`${fileSlug}.webp`)) {
    return { label: name, logo: `/clubs/${fileSlug}.webp` };
  }
  const aliasId = CREST_REGISTRY_ALIASES[slug];
  if (aliasId) {
    const aliased = clubs.find((c) => c.id === aliasId);
    if (aliased && !CORRUPT_LOGO_CLUB_IDS.has(aliased.id)) {
      return { label: aliased.label, logo: aliased.logo };
    }
  }
  const club = findClubByName(name, { strictPrefix: true });
  if (!club || CORRUPT_LOGO_CLUB_IDS.has(club.id)) return null;
  return { label: club.label, logo: club.logo };
}
