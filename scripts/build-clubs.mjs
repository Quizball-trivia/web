#!/usr/bin/env node
/**
 * Build the new favorite-teams dataset from the curated, country-grouped list.
 *
 * - English club names drop "FC" (Arsenal, Chelsea, ...).
 * - Each country carries a flag emoji + i18n (en + ka) name for grouping.
 * - ids are stable kebab-case; where a logo already exists in public/clubs we
 *   reuse it, otherwise the logo is marked NEEDS_LOGO for sourcing.
 * - emits:
 *     src/data/clubs.json           (the new dataset)
 *     scripts/clubs-needs-logo.json (clubs whose crest we must source)
 *     scripts/clubs-value-migration.json (old saved value -> new id, best-effort)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LOGO_DIR = join(ROOT, 'public', 'clubs');
const existingLogos = new Set(
  readdirSync(LOGO_DIR).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, ''))
);

// Old dataset, to (a) reuse logos/colors and (b) build the value-migration map.
const oldClubs = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'top5leagues-clubs.json'), 'utf8'));
const oldByLowerValue = new Map(oldClubs.map((c) => [c.value.toLowerCase(), c]));

const slug = (s) =>
  s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Country → {flag, en, ka, clubs:[{name, id?, logoId?}]}. `name` is the display
// label (cleaned). Optional explicit `logoId` maps to an existing logo file when
// the natural slug differs.
const COUNTRIES = [
  { code: 'england', flag: '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', en: 'England', ka: 'ინგლისი', clubs: [
    { name: 'Arsenal', logoId: 'arsenal-fc' },
    { name: 'Aston Villa', logoId: 'aston-villa' },
    { name: 'Blackburn Rovers' },
    { name: 'Chelsea', logoId: 'chelsea-fc' },
    { name: 'Everton', logoId: 'everton-fc' },
    { name: 'Leeds United', logoId: 'leeds-united' },
    { name: 'Leicester City' },
    { name: 'Liverpool', logoId: 'liverpool-fc' },
    { name: 'Manchester City', logoId: 'manchester-city' },
    { name: 'Manchester United', logoId: 'manchester-united' },
    { name: 'Newcastle United', logoId: 'newcastle-united' },
    { name: 'Nottingham Forest', logoId: 'nottingham-forest' },
    { name: 'Sunderland', logoId: 'sunderland-afc' },
    { name: 'Tottenham Hotspur', logoId: 'tottenham-hotspur' },
    { name: 'West Ham United', logoId: 'west-ham-united' },
  ]},
  { code: 'spain', flag: '🇪🇸', en: 'Spain', ka: 'ესპანეთი', clubs: [
    { name: 'Athletic Club', logoId: 'athletic-bilbao' },
    { name: 'Atlético de Madrid', logoId: 'atletico-de-madrid' },
    { name: 'CA Osasuna', logoId: 'ca-osasuna' },
    { name: 'Celta de Vigo', logoId: 'celta-de-vigo' },
    { name: 'FC Barcelona', logoId: 'fc-barcelona' },
    { name: 'RC Deportivo de La Coruña' },
    { name: 'RCD Espanyol', logoId: 'rcd-espanyol-barcelona' },
    { name: 'Real Betis', logoId: 'real-betis-balompie' },
    { name: 'Real Madrid CF', logoId: 'real-madrid' },
    { name: 'Real Sociedad', logoId: 'real-sociedad' },
    { name: 'Real Zaragoza' },
    { name: 'Sevilla FC', logoId: 'sevilla-fc' },
    { name: 'Valencia CF', logoId: 'valencia-cf' },
    { name: 'Villarreal CF', logoId: 'villarreal-cf' },
  ]},
  { code: 'italy', flag: '🇮🇹', en: 'Italy', ka: 'იტალია', clubs: [
    { name: 'AC Milan', logoId: 'ac-milan' },
    { name: 'ACF Fiorentina', logoId: 'acf-fiorentina' },
    { name: 'AS Roma', logoId: 'as-roma' },
    { name: 'Atalanta BC', logoId: 'atalanta-bc' },
    { name: 'Bologna FC 1909', logoId: 'bologna-fc-1909' },
    { name: 'Genoa CFC', logoId: 'genoa-cfc' },
    { name: 'Inter Milan', logoId: 'inter-milan' },
    { name: 'Juventus', logoId: 'juventus-fc' },
    { name: 'Palermo FC' },
    { name: 'Parma Calcio 1913', logoId: 'parma-calcio-1913' },
    { name: 'Sampdoria' },
    { name: 'SS Lazio', logoId: 'ss-lazio' },
    { name: 'SSC Napoli', logoId: 'ssc-napoli' },
    { name: 'Torino FC', logoId: 'torino-fc' },
  ]},
  { code: 'germany', flag: '🇩🇪', en: 'Germany', ka: 'გერმანია', clubs: [
    { name: '1. FC Kaiserslautern' },
    { name: '1. FC Köln', logoId: '1-fc-koln' },
    { name: 'Bayer 04 Leverkusen', logoId: 'bayer-04-leverkusen' },
    { name: 'Borussia Dortmund', logoId: 'borussia-dortmund' },
    { name: 'Borussia Mönchengladbach', logoId: 'borussia-monchengladbach' },
    { name: 'Eintracht Frankfurt', logoId: 'eintracht-frankfurt' },
    { name: 'FC Bayern Munich', logoId: 'bayern-munich' },
    { name: 'FC Schalke 04' },
    { name: 'FC St. Pauli', logoId: 'fc-st-pauli' },
    { name: 'Hamburger SV', logoId: 'hamburger-sv' },
    { name: 'Hertha BSC' },
    { name: 'SC Freiburg', logoId: 'sc-freiburg' },
    { name: 'TSV 1860 Munich' },
    { name: 'VfB Stuttgart', logoId: 'vfb-stuttgart' },
    { name: 'Werder Bremen', logoId: 'sv-werder-bremen' },
  ]},
  { code: 'france', flag: '🇫🇷', en: 'France', ka: 'საფრანგეთი', clubs: [
    { name: 'AS Monaco', logoId: 'as-monaco' },
    { name: 'AS Saint-Étienne' },
    { name: 'FC Girondins de Bordeaux' },
    { name: 'LOSC Lille', logoId: 'losc-lille' },
    { name: 'Montpellier HSC' },
    { name: 'OGC Nice', logoId: 'ogc-nice' },
    { name: 'Olympique de Marseille', logoId: 'olympique-marseille' },
    { name: 'Olympique Lyonnais', logoId: 'olympique-lyon' },
    { name: 'Paris Saint-Germain', logoId: 'paris-saint-germain' },
    { name: 'RC Lens', logoId: 'rc-lens' },
    { name: 'RC Strasbourg Alsace', logoId: 'rc-strasbourg-alsace' },
    { name: 'Stade de Reims' },
    { name: 'Stade Rennais FC', logoId: 'stade-rennais-fc' },
  ]},
  { code: 'netherlands', flag: '🇳🇱', en: 'Netherlands', ka: 'ჰოლანდია', clubs: [
    { name: 'AFC Ajax' },
    { name: 'Feyenoord' },
    { name: 'PSV Eindhoven' },
  ]},
  { code: 'portugal', flag: '🇵🇹', en: 'Portugal', ka: 'პორტუგალია', clubs: [
    { name: 'FC Porto' },
    { name: 'SC Braga' },
    { name: 'SL Benfica' },
    { name: 'Sporting CP' },
  ]},
  { code: 'scotland', flag: '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}', en: 'Scotland', ka: 'შოტლანდია', clubs: [
    { name: 'Celtic' },
    { name: 'Rangers' },
  ]},
  { code: 'argentina', flag: '🇦🇷', en: 'Argentina', ka: 'არგენტინა', clubs: [
    { name: 'Boca Juniors' },
    { name: 'Independiente' },
    { name: 'Racing Club' },
    { name: 'River Plate' },
    { name: 'San Lorenzo de Almagro' },
  ]},
  { code: 'brazil', flag: '🇧🇷', en: 'Brazil', ka: 'ბრაზილია', clubs: [
    { name: 'Corinthians' },
    { name: 'Flamengo' },
    { name: 'Santos FC' },
    { name: 'São Paulo FC' },
  ]},
  { code: 'georgia', flag: '🇬🇪', en: 'Georgia', ka: 'საქართველო', clubs: [
    { name: 'FC Dinamo Tbilisi' },
    { name: 'FC Dinamo Batumi' },
    { name: 'FC Torpedo Kutaisi' },
    { name: 'FC Dila Gori' },
    { name: 'FC Samtredia' },
    { name: 'FC Kolkheti-1913 Poti' },
    { name: 'FC Iberia 1999' },
  ]},
];

// ── Special hidden clubs ──
// Visible/choosable ONLY by a specific user (restrictedToUserId). Filtered out of
// the public picker; getClub() still resolves it so it renders everywhere for the
// owner. owms (e015028e-…) gets the one-off "Zlatan F.C.".
const OWMS_USER_ID = 'e015028e-6ae8-45f5-9701-5831fd8d8df1';
const HIDDEN_CLUBS = [
  {
    id: 'zlatan-fc',
    label: 'Zlatan F.C.',
    value: 'Zlatan F.C.',
    country: 'Special',
    countryKa: 'სპეციალური',
    flag: '🦁',
    // Facebook "Zlatan Football Club" page profile picture (square 720×720).
    // Persistent graph endpoint; we mirror it to our bucket during upload.
    logo: 'NEEDS_LOGO:zlatan-fc',
    primaryColor: '#0b1f3a',
    hidden: true,
    restrictedToUserId: OWMS_USER_ID,
  },
];

const out = [];
const needsLogo = [];
const valueMigration = {}; // old saved value (lowercased) -> new id

for (const country of COUNTRIES) {
  for (const club of country.clubs) {
    const id = club.id ?? slug(club.name);
    const logoId = club.logoId ?? id;
    const hasLogo = existingLogos.has(logoId);
    const old = oldByLowerValue.get(club.name.toLowerCase());
    // reuse the old primaryColor when we can match the club, else a neutral default
    const primaryColor = old?.primaryColor ?? '#1f2937';

    out.push({
      id,
      label: club.name,
      value: club.name,
      country: country.en,
      countryKa: country.ka,
      flag: country.flag,
      // CDN target: imgs/club-logos/<logoId>.webp (filled after upload). For now
      // reuse the local path when the logo already exists, else placeholder.
      logo: hasLogo ? `/clubs/${logoId}.webp` : `NEEDS_LOGO:${logoId}`,
      primaryColor,
    });

    if (!hasLogo) needsLogo.push({ id, logoId, name: club.name, country: country.en });
  }
}

// Append hidden/restricted clubs (always need their own logo upload).
for (const hc of HIDDEN_CLUBS) {
  out.push(hc);
  needsLogo.push({ id: hc.id, logoId: hc.id, name: hc.label, country: hc.country });
}

// Build the value-migration map: every OLD club value whose club is NOT present
// by the same value in the new list, mapped to the closest new id when names align.
const newByLowerValue = new Map(out.map((c) => [c.value.toLowerCase(), c]));
for (const oc of oldClubs) {
  const v = oc.value.toLowerCase();
  if (newByLowerValue.has(v)) continue; // exact value still valid
  // try to map by stripping FC/F.C. and matching slug to a new id
  const target = out.find((c) => slug(c.value) === slug(oc.value) || c.id === oc.id);
  if (target) valueMigration[oc.value] = target.id;
}

writeFileSync(join(ROOT, 'src', 'data', 'clubs.json'), JSON.stringify(out, null, 2) + '\n');
writeFileSync(join(__dirname, 'clubs-needs-logo.json'), JSON.stringify(needsLogo, null, 2) + '\n');
writeFileSync(join(__dirname, 'clubs-value-migration.json'), JSON.stringify(valueMigration, null, 2) + '\n');

console.log(`clubs.json: ${out.length} clubs across ${COUNTRIES.length} countries`);
console.log(`reused existing logos: ${out.length - needsLogo.length}`);
console.log(`NEED new logos: ${needsLogo.length}`);
console.log(`value migrations: ${Object.keys(valueMigration).length}`);
console.log('\nClubs needing logos:');
for (const n of needsLogo) console.log(`  [${n.country}] ${n.name}  -> ${n.logoId}.webp`);
