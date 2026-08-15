/**
 * Hi-Lo Ride mock data — player-stat matchups for the staked higher/lower
 * chain. `crowdPct` is the share of players who historically called the
 * matchup right (mirrors the real per-question crowd-accuracy stats the
 * backend keeps): a hard matchup (low crowdPct) pays bigger step odds.
 * Stats are real-world career figures, rounded; this is a prototype bank.
 */

import type { MiniLocale } from '../lib/i18n';

interface BilingualText {
  en: string;
  ka: string;
}

export interface HiLoMatchup {
  id: string;
  stat: string;
  left: { name: string; value: number };
  right: { name: string; value: number };
  /** % of the crowd that answered this matchup correctly. */
  crowdPct: number;
}

interface BilingualMatchup extends Omit<HiLoMatchup, 'stat'> {
  stat: BilingualText;
}

const BANK: BilingualMatchup[] = [
  {
    id: 'hl1',
    stat: { en: 'Career club goals', ka: 'საკლუბო გოლები კარიერაში' },
    left: { name: 'Cristiano Ronaldo', value: 758 },
    right: { name: 'Lionel Messi', value: 721 },
    crowdPct: 52,
  },
  {
    id: 'hl2',
    stat: { en: "Men's World Cup titles", ka: 'მსოფლიო თასის ტიტულები' },
    left: { name: 'Brazil', value: 5 },
    right: { name: 'Germany', value: 4 },
    crowdPct: 84,
  },
  {
    id: 'hl3',
    stat: { en: 'Champions League titles', ka: 'ჩემპიონთა ლიგის ტიტულები' },
    left: { name: 'AC Milan', value: 7 },
    right: { name: 'Liverpool', value: 6 },
    crowdPct: 61,
  },
  {
    id: 'hl4',
    stat: { en: 'Premier League goals', ka: 'პრემიერ ლიგის გოლები' },
    left: { name: 'Alan Shearer', value: 260 },
    right: { name: 'Harry Kane', value: 213 },
    crowdPct: 57,
  },
  {
    id: 'hl5',
    stat: { en: 'Ballon d’Or wins', ka: 'ოქროს ბურთები' },
    left: { name: 'Lionel Messi', value: 8 },
    right: { name: 'Cristiano Ronaldo', value: 5 },
    crowdPct: 88,
  },
  {
    id: 'hl6',
    stat: { en: 'International caps', ka: 'ნაკრების მატჩები' },
    left: { name: 'Cristiano Ronaldo', value: 217 },
    right: { name: 'Bader Al-Mutawa', value: 196 },
    crowdPct: 44,
  },
  {
    id: 'hl7',
    stat: { en: 'La Liga titles', ka: 'ლა ლიგის ტიტულები' },
    left: { name: 'Real Madrid', value: 36 },
    right: { name: 'FC Barcelona', value: 28 },
    crowdPct: 72,
  },
  {
    id: 'hl8',
    stat: { en: 'World Cup goals (men)', ka: 'გოლები მსოფლიო თასზე' },
    left: { name: 'Miroslav Klose', value: 16 },
    right: { name: 'Ronaldo Nazário', value: 15 },
    crowdPct: 49,
  },
  {
    id: 'hl9',
    stat: { en: 'Premier League titles', ka: 'პრემიერ ლიგის ტიტულები' },
    left: { name: 'Manchester United', value: 13 },
    right: { name: 'Manchester City', value: 10 },
    crowdPct: 66,
  },
  {
    id: 'hl10',
    stat: { en: 'Serie A appearances', ka: 'სერია A-ს მატჩები' },
    left: { name: 'Gianluigi Buffon', value: 657 },
    right: { name: 'Paolo Maldini', value: 647 },
    crowdPct: 38,
  },
  {
    id: 'hl11',
    stat: { en: 'Champions League goals', ka: 'ჩემპიონთა ლიგის გოლები' },
    left: { name: 'Cristiano Ronaldo', value: 140 },
    right: { name: 'Lionel Messi', value: 129 },
    crowdPct: 63,
  },
  {
    id: 'hl12',
    stat: { en: 'European Golden Shoes', ka: 'ევროპის ოქროს ბუცები' },
    left: { name: 'Lionel Messi', value: 6 },
    right: { name: 'Cristiano Ronaldo', value: 4 },
    crowdPct: 58,
  },
  {
    id: 'hl13',
    stat: { en: 'Career assists (club)', ka: 'საკლუბო ასისტები კარიერაში' },
    left: { name: 'Lionel Messi', value: 303 },
    right: { name: 'Thomas Müller', value: 250 },
    crowdPct: 55,
  },
  {
    id: 'hl14',
    stat: { en: 'Copa América titles', ka: 'კოპა ამერიკის ტიტულები' },
    left: { name: 'Argentina', value: 16 },
    right: { name: 'Brazil', value: 9 },
    crowdPct: 47,
  },
];

export function getHiLoMatchups(locale: MiniLocale): HiLoMatchup[] {
  return BANK.map((m) => ({ ...m, stat: m.stat[locale] ?? m.stat.en }));
}

/** Crowd accuracy → decimal step odds, with a small house margin. Harder
 *  matchups (fewer people get them right) pay more. */
export function stepOdds(crowdPct: number): number {
  const fair = 1 / Math.min(0.95, Math.max(0.3, crowdPct / 100));
  return Math.round(Math.min(3.2, Math.max(1.12, fair * 0.95)) * 100) / 100;
}
