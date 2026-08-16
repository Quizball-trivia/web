import { describe, expect, it } from 'vitest';
import type { AuctionTeam, Footballer, PositionGroup } from '../types';
import {
  FORMATIONS,
  computeSquadChemistry,
  getSquadChemistryBreakdown,
  chemistryDeltaForAdding,
} from '../data';

let seq = 0;
function fb(partial: Partial<Footballer> & { positionGroup?: PositionGroup }): Footballer {
  seq += 1;
  return {
    id: `f${seq}`,
    name: `Player ${seq}`,
    positionGroup: partial.positionGroup ?? 'MID',
    value: 10_000_000,
    startingPrice: 1_000_000,
    clues: [],
    nationality: partial.nationality ?? `Nation${seq}`, // unique by default → no accidental links
    club: partial.club ?? null,
    league: partial.league ?? null,
    ...partial,
  };
}

/** Build a team by dumping footballers into slots (position is irrelevant to chem). */
function team(players: Footballer[]): AuctionTeam {
  const slots: Record<PositionGroup, Footballer[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of players) slots[p.positionGroup].push(p);
  return { formation: FORMATIONS[0], slots };
}

describe('computeSquadChemistry', () => {
  it('is 0 for an empty squad', () => {
    expect(computeSquadChemistry(team([])).total).toBe(0);
  });

  it('gives a club link at 2 sharing players (club threshold 2/3/4)', () => {
    const t = team([fb({ club: 'Real Madrid CF' }), fb({ club: 'Real Madrid CF' })]);
    const chem = computeSquadChemistry(t);
    // Each earns 1 club point; nations are unique so no nation link.
    expect(chem.total).toBe(2);
    expect(Object.values(chem.perPlayer)).toEqual([1, 1]);
  });

  it('gives a league link at 2 sharing players (league threshold 2/4/6, rescaled for 7-a-side)', () => {
    const two = team([fb({ league: 'La Liga' }), fb({ league: 'La Liga' })]);
    expect(computeSquadChemistry(two).total).toBe(2); // each earns 1

    const three = team([
      fb({ league: 'La Liga' }),
      fb({ league: 'La Liga' }),
      fb({ league: 'La Liga' }),
    ]);
    expect(computeSquadChemistry(three).total).toBe(3); // still tier 1, each earns 1
  });

  it('gives a nation link at 2 sharing players (nation threshold 2/4/6)', () => {
    const t = team([fb({ nationality: 'Brazil' }), fb({ nationality: 'Brazil' })]);
    expect(computeSquadChemistry(t).total).toBe(2);
  });

  it('caps a single player at 3 even when club+league+nation all stack', () => {
    // 4 players all sharing club (count 4 → tiers 2,3,4 → 3), league (4 → tiers
    // 2,4 → 2) and nation (4 → tiers 2,4 → 2) = 7 points, capped to 3 per player.
    const shared = { club: 'FC Bayern Munich', league: 'Bundesliga', nationality: 'Germany' };
    const t = team([fb(shared), fb(shared), fb(shared), fb(shared)]);
    const chem = computeSquadChemistry(t);
    expect(Object.values(chem.perPlayer)).toEqual([3, 3, 3, 3]);
    expect(chem.total).toBe(12);
  });
});

describe('getSquadChemistryBreakdown', () => {
  it('lists active links before building ones and tags dimension/count/tier', () => {
    const t = team([
      // Real Madrid club link (2 → tier 1)
      fb({ club: 'Real Madrid CF', league: 'La Liga', nationality: 'Spain' }),
      fb({ club: 'Real Madrid CF', league: 'La Liga', nationality: 'Spain' }),
      // A third La Liga player from a different club → league link reaches 3 (tier 1)
      fb({ club: 'FC Barcelona', league: 'La Liga', nationality: 'Argentina' }),
    ]);
    const { links } = getSquadChemistryBreakdown(t);

    const club = links.find((l) => l.dimension === 'club' && l.key === 'Real Madrid CF');
    expect(club).toMatchObject({ count: 2, tier: 1 });

    const league = links.find((l) => l.dimension === 'league' && l.key === 'La Liga');
    expect(league).toMatchObject({ count: 3, tier: 1 });

    // Spain appears twice → an active nation link; Argentina appears once → no link.
    const spain = links.find((l) => l.dimension === 'nation' && l.key === 'Spain');
    expect(spain).toMatchObject({ count: 2, tier: 1 });
    expect(links.find((l) => l.key === 'Argentina')).toBeUndefined();

    // Every listed link is active here → all tier ≥ 1.
    expect(links.every((l) => l.tier >= 1)).toBe(true);
  });
});

describe('chemistryDeltaForAdding', () => {
  it('reports the total chemistry a signing would add, including knock-on', () => {
    const base = team([fb({ club: 'AC Milan' })]); // lone player, 0 chem
    const incoming = fb({ club: 'AC Milan', positionGroup: 'DEF' });
    // Adding a second AC Milan player forms a club link: both reach tier 1 → +2 total.
    expect(chemistryDeltaForAdding(base, incoming)).toBe(2);
  });
});
