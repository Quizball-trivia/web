import { describe, expect, it } from 'vitest';
import { CARDS, LOADOUT_BUDGET, STARTER_DECKS, completeDeck, decideDuel, deckBlocker, deckCost, deckFull, legalDeck, movementMods, randomDeck, roleAllows, type ActiveCards, type CardId } from '../zoneMatch.cards';
import { resolveBattle, type Possession } from '../zoneMatch.rules';

const none: ActiveCards = { player: [], opponent: [] };
const playerAt = (zone: Possession['zone']): Possession => ({ attacker: 'player', zone });
const right = { player: true, opponent: true };

describe('card list', () => {
  it('has the 20 artifact cards with their energy costs (five changed after playtesting and the balance sims)', () => {
    expect(CARDS).toHaveLength(20);
    expect(Object.fromEntries(CARDS.map((c) => [c.id, c.energy]))).toMatchObject({
      'first-touch': 2, 'fifty-fifty': 1, 'golden-boot': 2, 'captains-armband': 2, 'second-ball': 1,
      'floodlight-failure': 2, 'muddy-pitch': 2, fog: 1, 'yellow-card': 2, 'offside-trap': 2,
      'var-review': 2, 'goalkeeper-gloves': 3, 'park-the-bus': 2, 'shin-pads': 1,
      'long-ball': 3, 'counter-attack': 2, substitution: 1, 'home-advantage': 2, 'dummy-run': 1, 'tiki-taka': 3,
    });
    const changed = CARDS.filter((c) => c.originalEnergy !== undefined).map((c) => c.id);
    expect(changed.sort()).toEqual(['counter-attack', 'first-touch', 'floodlight-failure', 'fog', 'second-ball']);
  });

  it('gives every card a short headline that fits on the card', () => {
    for (const card of CARDS) expect(card.short.length).toBeLessThanOrEqual(18);
  });
});

describe('deck building', () => {
  it('caps a loadout at 3 playstyles, 1 sabotage and the 5⚡ budget', () => {
    const sabotage: CardId[] = ['fog'];
    expect(deckBlocker(sabotage, 'yellow-card')).toMatch(/sabotage/);
    expect(deckBlocker(['fifty-fifty', 'fog', 'shin-pads'], 'dummy-run')).toMatch(/full/);
    expect(deckBlocker(sabotage, 'tiki-taka')).toBeNull();
    // 3⚡ + 2⚡ fills the budget: two playstyles and done.
    expect(deckBlocker(['goalkeeper-gloves'], 'park-the-bus')).toBeNull();
    expect(deckBlocker(['goalkeeper-gloves', 'park-the-bus'], 'fifty-fifty')).toMatch(/only 0⚡ left/);
    expect(deckFull(['goalkeeper-gloves', 'park-the-bus'])).toBe(true);
    // 1⚡ + 2⚡ + 2⚡ is three within the budget.
    expect(deckBlocker(['fifty-fifty', 'park-the-bus'], 'counter-attack')).toBeNull();
    expect(deckBlocker(['fifty-fifty', 'park-the-bus'], 'tiki-taka')).toMatch(/Costs 3⚡ — only 2⚡ left/);
    expect(deckFull(['fifty-fifty'])).toBe(false);
  });

  it('keeps the legal picks of a loadout in order', () => {
    expect(legalDeck(['goalkeeper-gloves', 'tiki-taka', 'park-the-bus'])).toEqual(['goalkeeper-gloves', 'park-the-bus']);
    expect(legalDeck(['fog', 'fog', 'yellow-card', 'fifty-fifty'])).toEqual(['fog', 'fifty-fifty']);
  });

  it('ships only legal starter decks', () => {
    for (const deck of STARTER_DECKS) {
      expect(legalDeck(deck.cards)).toEqual(deck.cards);
      expect(deckCost(deck.cards)).toBeLessThanOrEqual(LOADOUT_BUDGET);
    }
  });

  it('deals legal random decks that use the budget up', () => {
    for (let i = 0; i < 50; i += 1) {
      const deck = randomDeck();
      expect(deck.length).toBeGreaterThanOrEqual(2);
      expect(deck.length).toBeLessThanOrEqual(3);
      expect(new Set(deck).size).toBe(deck.length);
      expect(deckCost(deck)).toBeLessThanOrEqual(LOADOUT_BUDGET);
      expect(deckFull(deck)).toBe(true);
      expect(deck.filter((id) => CARDS.find((c) => c.id === id)?.type === 'sabotage').length).toBeLessThanOrEqual(1);
    }
    // Auto-pick keeps what you chose and tops it up.
    expect(completeDeck(['goalkeeper-gloves']).slice(0, 1)).toEqual(['goalkeeper-gloves']);
  });
});

describe('roleAllows', () => {
  const armband = CARDS.find((c) => c.id === 'captains-armband')!;
  const gloves = CARDS.find((c) => c.id === 'goalkeeper-gloves')!;
  const boot = CARDS.find((c) => c.id === 'golden-boot')!;
  it('limits attack, defend and shot cards to the right possession', () => {
    expect(roleAllows(armband, 'player', playerAt('centre'))).toBe(true);
    expect(roleAllows(armband, 'opponent', playerAt('centre'))).toBe(false);
    expect(roleAllows(gloves, 'opponent', playerAt('centre'))).toBe(true);
    expect(roleAllows(boot, 'player', playerAt('centre'))).toBe(false);
    expect(roleAllows(boot, 'player', playerAt('opponent'))).toBe(true);
  });
});

describe('decideDuel', () => {
  it('sends a plain both-right duel to the number question', () => {
    expect(decideDuel(playerAt('centre'), right, none)).toEqual({ kind: 'numeric' });
  });

  it('lets First Touch win a both-right duel, unless both sides played it', () => {
    expect(decideDuel(playerAt('centre'), right, { player: [], opponent: ['first-touch'] })).toMatchObject({ winner: 'opponent' });
    expect(decideDuel(playerAt('centre'), right, { player: ['first-touch'], opponent: ['first-touch'] })).toEqual({ kind: 'numeric' });
  });

  it('only lets Golden Boot settle a shot', () => {
    expect(decideDuel(playerAt('opponent'), right, { player: ['golden-boot'], opponent: [] })).toMatchObject({ winner: 'player' });
    expect(decideDuel(playerAt('centre'), right, { player: ['golden-boot'], opponent: [] })).toEqual({ kind: 'numeric' });
  });

  it('decides a Long Ball on the attacker alone', () => {
    const longBall: ActiveCards = { player: ['long-ball'], opponent: [] };
    expect(decideDuel(playerAt('own'), { player: true, opponent: true }, longBall)).toMatchObject({ winner: 'player' });
    expect(decideDuel(playerAt('own'), { player: false, opponent: false }, longBall)).toMatchObject({ winner: 'opponent' });
  });

  it('springs the offside trap on any wrong attacker answer', () => {
    const trap: ActiveCards = { player: [], opponent: ['offside-trap'] };
    expect(decideDuel(playerAt('centre'), { player: false, opponent: false }, trap)).toMatchObject({ winner: 'opponent' });
  });
});

describe('movementMods with resolveBattle', () => {
  /** `correct`: the answers, defaulting to the winner right and the loser wrong (a clean steal when the defender wins). */
  const move = (
    possession: Possession,
    winner: 'player' | 'opponent' | null,
    active: ActiveCards,
    tiki = false,
    correct: Record<'player' | 'opponent', boolean> | null = { player: winner === 'player', opponent: winner === 'opponent' },
  ) => resolveBattle(possession, winner, movementMods(possession, winner, active, { player: tiki && possession.attacker === 'player', opponent: tiki && possession.attacker === 'opponent' }, correct));

  it("scores straight from the centre with the Captain's Armband", () => {
    expect(move(playerAt('centre'), 'player', { player: ['captains-armband'], opponent: [] })).toMatchObject({ kind: 'goal', scorer: 'player' });
  });

  it('adds a zone during a Tiki-Taka run', () => {
    expect(move(playerAt('own'), 'player', none, true)).toMatchObject({ kind: 'advance', next: playerAt('opponent') });
  });

  it("adds Tiki-Taka's extra zone to a ball its owner wins back while defending", () => {
    const owned = (zone: Possession['zone']) =>
      resolveBattle(playerAt(zone), 'opponent', movementMods(playerAt(zone), 'opponent', none, { player: false, opponent: true }, { player: false, opponent: true }));
    // A clean steal in the owner's own half: centre (+1), plus Tiki-Taka's zone.
    expect(owned('opponent')).toMatchObject({ next: { attacker: 'opponent', zone: 'opponent' } });
    // At the centre: +1 and +1 → straight in.
    expect(owned('centre')).toMatchObject({ kind: 'goal', scorer: 'opponent', stolen: true });
  });

  it('keeps the ball in place when the defender parked the bus', () => {
    expect(move(playerAt('opponent'), 'player', { player: [], opponent: ['park-the-bus'] })).toMatchObject({ kind: 'held', next: playerAt('opponent') });
  });

  it("lets Golden Boot's shot through a parked bus", () => {
    expect(move(playerAt('opponent'), 'player', { player: ['golden-boot'], opponent: ['park-the-bus'] })).toMatchObject({ kind: 'goal', scorer: 'player' });
  });

  it('adds a Counter-Attack zone to however the ball was won', () => {
    const counter: ActiveCards = { player: [], opponent: ['counter-attack'] };
    // Clean steal at the centre: +1 +1 → a goal.
    expect(move(playerAt('centre'), 'opponent', counter)).toMatchObject({ kind: 'goal', scorer: 'opponent', stolen: true });
    // Won on the number tiebreak at the centre: same spot, +1.
    expect(move(playerAt('centre'), 'opponent', counter, false, { player: true, opponent: true })).toMatchObject({
      kind: 'turnover',
      next: { attacker: 'opponent', zone: 'opponent' },
    });
  });

  it('gives the offside trapper the ball on the spot after a double miss, and +1 only when they were right', () => {
    const trap: ActiveCards = { player: [], opponent: ['offside-trap'] };
    expect(move(playerAt('centre'), 'opponent', trap, false, { player: false, opponent: false })).toMatchObject({ next: { attacker: 'opponent', zone: 'centre' } });
    expect(move(playerAt('centre'), 'opponent', trap, false, { player: false, opponent: true })).toMatchObject({ next: { attacker: 'opponent', zone: 'opponent' } });
  });

  it('changes the turn on the spot on a Gloves save (no question played), even against a Long Ball', () => {
    expect(move(playerAt('opponent'), 'opponent', { player: ['long-ball'], opponent: [] }, false, null)).toMatchObject({
      next: { attacker: 'opponent', zone: 'own' },
    });
  });

  it('jumps a landed Long Ball from the own side to the opponent side; a lost one is won on that side at least', () => {
    const longBall: ActiveCards = { player: ['long-ball'], opponent: [] };
    expect(move(playerAt('own'), 'player', longBall)).toMatchObject({ kind: 'advance', next: playerAt('opponent') });
    // Both wrong: won on the spot (their attacking side).
    expect(move(playerAt('centre'), 'opponent', longBall, false, { player: false, opponent: false })).toMatchObject({ next: { attacker: 'opponent', zone: 'opponent' } });
    // A clean steal off a lost Long Ball: +1 from the spot (at the centre → your side; from your own side → in).
    expect(move(playerAt('centre'), 'opponent', longBall)).toMatchObject({ next: { attacker: 'opponent', zone: 'opponent' } });
    expect(move(playerAt('own'), 'opponent', longBall)).toMatchObject({ kind: 'goal', stolen: true });
  });
});
