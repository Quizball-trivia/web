// Derived views over the bundled FIFA card dataset (FIFA 15 -> FC 26). Pure
// helpers shared by every FIFA Universe prototype — no React, no side effects.
import {
  FIFA_CARDS,
  PLAYABLE_EDITIONS,
  type FifaCard,
  type FifaCardDifficulty,
  type FifaCardStats,
  type FifaEdition,
} from '@/features/mini-games/data/guessFifaCard';
import { EDITION_LABEL, editionNum, rand, shuffle } from '@/features/mini-games/lib/guessCard';

export type { FifaCard, FifaEdition, FifaCardDifficulty };
export { FIFA_CARDS, PLAYABLE_EDITIONS, EDITION_LABEL, editionNum, rand, shuffle };

export type StatKey = keyof FifaCardStats;
export const STAT_KEYS: StatKey[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
export type BattleStat = StatKey | 'overall';
export const BATTLE_STATS: BattleStat[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'overall'];

export const STAT_LABEL: Record<BattleStat, string> = {
  pac: 'PACE',
  sho: 'SHOOTING',
  pas: 'PASSING',
  dri: 'DRIBBLING',
  def: 'DEFENDING',
  phy: 'PHYSICAL',
  overall: 'OVERALL',
};
export const STAT_SHORT: Record<BattleStat, string> = {
  pac: 'PAC', sho: 'SHO', pas: 'PAS', dri: 'DRI', def: 'DEF', phy: 'PHY', overall: 'OVR',
};

export const statValue = (card: FifaCard, stat: BattleStat): number =>
  stat === 'overall' ? card.overall : card.stats[stat];

/** Release year of an edition: FIFA 15 shipped in autumn 2014. */
export const editionYear = (edition: FifaEdition): number => 2000 + editionNum(edition) - 1;
export const editionLabel = (edition: FifaEdition): string => EDITION_LABEL[edition] ?? edition;

export type PositionGroup = 'ATT' | 'MID' | 'DEF';
export function positionGroup(position: string): PositionGroup {
  const p = position.toUpperCase();
  if (['ST', 'CF', 'LW', 'RW', 'LF', 'RF'].includes(p)) return 'ATT';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p)) return 'DEF';
  return 'MID';
}

/** One player's cards across the editions they appear in, oldest first. */
export interface PlayerJourney {
  name: string;
  accepted: string[];
  nation: string;
  nationCode: string;
  cards: FifaCard[];
  peak: FifaCard;
  difficulty: FifaCardDifficulty;
}

const DIFF_RANK: Record<FifaCardDifficulty, number> = { easy: 0, medium: 1, hard: 2, veryHard: 3 };

export const JOURNEYS: PlayerJourney[] = (() => {
  const byName = new Map<string, FifaCard[]>();
  for (const c of FIFA_CARDS) {
    const list = byName.get(c.name) ?? [];
    list.push(c);
    byName.set(c.name, list);
  }
  const out: PlayerJourney[] = [];
  for (const [name, cards] of byName) {
    cards.sort((a, b) => editionNum(a.edition) - editionNum(b.edition));
    const peak = cards.reduce((best, c) => (c.overall > best.overall ? c : best), cards[0]);
    const accepted = Array.from(new Set(cards.flatMap((c) => c.accepted)));
    // A player's guessability is their most famous card, not their obscure early one.
    const difficulty = cards.reduce<FifaCardDifficulty>(
      (d, c) => (DIFF_RANK[c.difficulty] < DIFF_RANK[d] ? c.difficulty : d),
      cards[0].difficulty,
    );
    out.push({ name, accepted, nation: peak.nation, nationCode: peak.nationCode, cards, peak, difficulty });
  }
  return out;
})();

export const JOURNEY_BY_NAME = new Map(JOURNEYS.map((j) => [j.name, j]));
/** Players with enough editions to show a rating curve. */
export const LONG_JOURNEYS = JOURNEYS.filter((j) => j.cards.length >= 5);
export const ALL_NAMES: string[] = JOURNEYS.map((j) => j.name).sort((a, b) => a.localeCompare(b));

export const CARDS_BY_EDITION: Record<string, FifaCard[]> = (() => {
  const m: Record<string, FifaCard[]> = {};
  for (const c of FIFA_CARDS) (m[c.edition] ??= []).push(c);
  return m;
})();

/** Club squads big enough to show as a lineup, keyed "edition|club". */
export const SQUADS: Array<{ edition: FifaEdition; club: string; cards: FifaCard[] }> = (() => {
  const m = new Map<string, FifaCard[]>();
  for (const c of FIFA_CARDS) {
    const k = `${c.edition}|${c.club}`;
    const list = m.get(k) ?? [];
    list.push(c);
    m.set(k, list);
  }
  return Array.from(m.entries())
    .filter(([, cards]) => cards.length >= 7)
    .map(([k, cards]) => ({ edition: k.split('|')[0] as FifaEdition, club: k.split('|')[1], cards: cards.sort((a, b) => b.overall - a.overall) }));
})();

/** Rank tiers used to ramp difficulty: level 0 = easy+medium … level 3 = hard+veryHard. */
export const TIER_ORDER: FifaCardDifficulty[] = ['easy', 'medium', 'hard', 'veryHard'];
export function tierAtLeast(level: number): FifaCardDifficulty[] {
  const idx = Math.min(TIER_ORDER.length - 2, Math.max(0, level));
  return TIER_ORDER.slice(idx, idx + 2);
}

/** Random card, optionally restricted to difficulty tiers / editions / a predicate. */
export function drawCard(opts: {
  tiers?: FifaCardDifficulty[];
  editions?: FifaEdition[];
  exclude?: Set<string>;
  where?: (c: FifaCard) => boolean;
} = {}): FifaCard {
  const pool = FIFA_CARDS.filter(
    (c) =>
      (!opts.tiers || opts.tiers.includes(c.difficulty)) &&
      (!opts.editions || opts.editions.includes(c.edition)) &&
      (!opts.exclude || !opts.exclude.has(c.name)) &&
      (!opts.where || opts.where(c)),
  );
  return rand(pool.length ? pool : FIFA_CARDS);
}

export function drawJourney(opts: { tiers?: FifaCardDifficulty[]; minCards?: number; exclude?: Set<string> } = {}): PlayerJourney {
  const min = opts.minCards ?? 5;
  const pool = JOURNEYS.filter(
    (j) => j.cards.length >= min && (!opts.tiers || opts.tiers.includes(j.difficulty)) && (!opts.exclude || !opts.exclude.has(j.name)),
  );
  return rand(pool.length ? pool : LONG_JOURNEYS);
}

/**
 * Plausible wrong answers for a card: same edition, similar rating, same
 * position group where possible. Returns distinct players, never the target.
 */
export function decoysFor(card: FifaCard, n = 3): FifaCard[] {
  const group = positionGroup(card.position);
  const seen = new Set<string>([card.name]);
  const take = (list: FifaCard[], out: FifaCard[]) => {
    for (const c of shuffle(list)) {
      if (out.length >= n) break;
      if (seen.has(c.name)) continue;
      seen.add(c.name);
      out.push(c);
    }
    return out;
  };
  const same = CARDS_BY_EDITION[card.edition] ?? [];
  let out = take(same.filter((c) => positionGroup(c.position) === group && Math.abs(c.overall - card.overall) <= 4), []);
  if (out.length < n) out = take(same.filter((c) => positionGroup(c.position) === group), out);
  if (out.length < n) out = take(same, out);
  if (out.length < n) out = take(FIFA_CARDS, out);
  return out;
}

/** Name options (target + decoys) shuffled, as {name, card}. */
export function nameChoices(card: FifaCard, n = 4): Array<{ name: string; card: FifaCard }> {
  return shuffle([card, ...decoysFor(card, n - 1)]).map((c) => ({ name: c.name, card: c }));
}

/** Rival (bot) behaviour — a probability of being right that scales with the round's difficulty. */
export function rivalRoll(difficulty: FifaCardDifficulty, skill = 0.75): { correct: boolean; delayMs: number } {
  const base = { easy: 0.9, medium: 0.75, hard: 0.55, veryHard: 0.4 }[difficulty] * (skill / 0.75);
  return {
    correct: Math.random() < Math.min(0.95, base),
    delayMs: 1200 + Math.round(Math.random() * 2600),
  };
}

export function fmtPoints(n: number): string {
  return n.toLocaleString('en-US');
}
