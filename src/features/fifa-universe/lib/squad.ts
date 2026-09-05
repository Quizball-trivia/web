// Shared squad model for Build the Best XI and Draft Battle: a 4-3-3 of ten
// outfield slots (the dataset has no goalkeepers — the keeper is a fixed generic).
import { CARDS_BY_EDITION, PLAYABLE_EDITIONS, positionGroup, rand, shuffle, type FifaCard, type FifaEdition, type PositionGroup } from './data';

export interface Slot {
  id: string;
  label: string;
  group: PositionGroup;
  /** Pitch coordinates in % (x left→right, y top = attack). */
  x: number;
  y: number;
}

export const SLOTS: Slot[] = [
  { id: 'lw', label: 'LW', group: 'ATT', x: 20, y: 16 },
  { id: 'st', label: 'ST', group: 'ATT', x: 50, y: 12 },
  { id: 'rw', label: 'RW', group: 'ATT', x: 80, y: 16 },
  { id: 'lcm', label: 'CM', group: 'MID', x: 26, y: 42 },
  { id: 'cm', label: 'CM', group: 'MID', x: 50, y: 48 },
  { id: 'rcm', label: 'CM', group: 'MID', x: 74, y: 42 },
  { id: 'lb', label: 'LB', group: 'DEF', x: 14, y: 72 },
  { id: 'lcb', label: 'CB', group: 'DEF', x: 38, y: 78 },
  { id: 'rcb', label: 'CB', group: 'DEF', x: 62, y: 78 },
  { id: 'rb', label: 'RB', group: 'DEF', x: 86, y: 72 },
];

export type Squad = Record<string, FifaCard | undefined>;

/** Coin price of a card, by overall. */
export function price(card: FifaCard): number {
  const o = card.overall;
  return o >= 94 ? 22 : o >= 92 ? 20 : o >= 90 ? 17 : o >= 88 ? 14 : o >= 86 ? 11 : o >= 84 ? 8 : 6;
}

/** Editions with enough cards in every position group to build a full XI. */
export const XI_EDITIONS: FifaEdition[] = PLAYABLE_EDITIONS.filter((e) => {
  const pool = CARDS_BY_EDITION[e] ?? [];
  const count = (g: PositionGroup) => pool.filter((c) => positionGroup(c.position) === g).length;
  return count('ATT') >= 9 && count('MID') >= 9 && count('DEF') >= 12;
});

/** Cheapest card available for a position group (what one more slot must cost at minimum). */
export function minPrice(edition: FifaEdition, group: PositionGroup, exclude: Set<string>): number {
  const pool = groupPool(edition, group, exclude);
  return pool.length ? Math.min(...pool.map(price)) : 0;
}

/** Coins that must stay unspent so every later slot can still be filled. */
export function reserveFor(edition: FifaEdition, fromSlot: number, exclude: Set<string>): number {
  return SLOTS.slice(fromSlot).reduce((sum, s) => sum + minPrice(edition, s.group, exclude), 0);
}

export const groupPool = (edition: FifaEdition, group: PositionGroup, exclude: Set<string>): FifaCard[] =>
  (CARDS_BY_EDITION[edition] ?? []).filter((c) => positionGroup(c.position) === group && !exclude.has(c.name));

/** Three options across the price range: one top card, one mid, one cheap (always affordable if possible). */
export function budgetOptions(edition: FifaEdition, group: PositionGroup, exclude: Set<string>, budget: number): FifaCard[] {
  const pool = groupPool(edition, group, exclude).sort((a, b) => b.overall - a.overall);
  if (pool.length === 0) return [];
  const third = Math.max(1, Math.floor(pool.length / 3));
  const top = rand(pool.slice(0, third));
  const mid = rand(pool.slice(third, third * 2).filter((c) => c.name !== top.name).concat(pool.slice(third, third * 2).length ? [] : [top]));
  const cheap = pool.filter((c) => price(c) <= budget && c.name !== top.name && c.name !== mid?.name).sort((a, b) => price(a) - price(b) || b.overall - a.overall);
  const low = cheap.length ? rand(cheap.slice(0, Math.min(4, cheap.length))) : pool[pool.length - 1];
  const out: FifaCard[] = [];
  for (const c of [top, mid, low]) if (c && !out.some((x) => x.name === c.name)) out.push(c);
  return shuffle(out);
}

/** Tiered options for Draft Battle: premium = top third by OVR, good = middle, bad = bottom. */
export function tierOptions(edition: FifaEdition, group: PositionGroup, exclude: Set<string>, tier: 'premium' | 'good' | 'bad'): FifaCard[] {
  const pool = groupPool(edition, group, exclude).sort((a, b) => b.overall - a.overall);
  const third = Math.max(1, Math.floor(pool.length / 3));
  const band = tier === 'premium' ? pool.slice(0, third) : tier === 'good' ? pool.slice(third, third * 2) : pool.slice(third * 2);
  const out: FifaCard[] = [];
  for (const c of shuffle(band.length ? band : pool)) {
    if (out.some((x) => x.name === c.name)) continue;
    out.push(c);
    if (out.length === 3) break;
  }
  return out;
}

export const squadCards = (squad: Squad): FifaCard[] => SLOTS.map((s) => squad[s.id]).filter((c): c is FifaCard => !!c);
export const avg = (cards: FifaCard[]): number => (cards.length ? cards.reduce((s, c) => s + c.overall, 0) / cards.length : 0);
export function ratings(squad: Squad) {
  const by = (g: PositionGroup) => avg(SLOTS.filter((s) => s.group === g).map((s) => squad[s.id]).filter((c): c is FifaCard => !!c));
  return { overall: avg(squadCards(squad)), att: by('ATT'), mid: by('MID'), def: by('DEF') };
}

export type Tactic = 'attack' | 'balanced' | 'defensive';
export const TACTICS: Tactic[] = ['attack', 'balanced', 'defensive'];
/** Rock-paper-scissors edge: attack > balanced > defensive > attack. */
export function tacticEdge(mine: Tactic, theirs: Tactic): number {
  if (mine === theirs) return 0;
  const beats: Record<Tactic, Tactic> = { attack: 'balanced', balanced: 'defensive', defensive: 'attack' };
  return beats[mine] === theirs ? 2.5 : -2.5;
}

/** Simulate a match from squad strengths; returns goals. Deterministic-ish with light randomness. */
export function simulate(you: Squad, rival: Squad, yourTactic: Tactic, rivalTactic: Tactic): { you: number; rival: number; edge: number } {
  const edge = tacticEdge(yourTactic, rivalTactic);
  const diff = ratings(you).overall - ratings(rival).overall + edge;
  const noise = () => (Math.random() - 0.5) * 1.6;
  const g = (bias: number) => Math.max(0, Math.round(1.4 + bias / 2.2 + noise()));
  return { you: g(diff), rival: g(-diff), edge };
}
