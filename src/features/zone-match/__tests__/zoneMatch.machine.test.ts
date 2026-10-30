import { describe, expect, it } from 'vitest';
import type { GameQuestion } from '@/lib/domain';
import type { DuelSide } from '@/features/numeric-question/numericDuel';
import { LOADOUT_BUDGET, deckCost, randomDeck, type CardId } from '../zoneMatch.cards';
import { MATCH_ROUNDS, otherZoneSide, type BattleOutcome } from '../zoneMatch.rules';
import {
  IDLE,
  activeCards,
  attacksLeft,
  cardBlocker,
  duelStakes,
  GLOVES_SAVE_NOTE,
  opponentPublicView,
  reactionBlocker,
  reducer,
  unusedCategories,
  type Action,
  type CardWindowMode,
  type Category,
  type Content,
  type MatchState,
} from '../zoneMatch.machine';

const categories: Category[] = Array.from({ length: 24 }, (_, i) => ({ id: `c${i}`, name: `Category ${i}`, imageUrl: null, icon: null }));
const questions: GameQuestion[] = Array.from({ length: 60 }, (_, i) => ({
  id: `q${i}`,
  prompt: `Question ${i}`,
  options: ['A', 'B', 'C', 'D'],
  correctIndex: i % 4,
}));
const content: Content = { mcqByCategory: {}, fallbackMcqs: questions };
const sides: DuelSide[] = ['player', 'opponent'];
const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

/** Plays one side's legal move for the current state, or returns null when it has nothing to do. */
function move(s: MatchState, side: DuelSide, now: number): Action | null {
  if (s.stage === 'play' && s.battleStep === 'category' && s.possession.attacker === side && Math.random() < 0.7) {
    const open = unusedCategories(s, side);
    if (open.length > 0) return { type: 'PICK_CATEGORY', side, categoryId: pick(open).id, content, now };
  }
  if (s.numeric && !s.numeric.result && s.numeric.guesses[side].value === null && Math.random() < 0.9) {
    return { type: 'GUESS', side, value: Math.round(s.numeric.question.value * (0.5 + Math.random())), now };
  }
  if (s.stage !== 'play') return null;
  if (s.battleStep === 'cards' && s.choice[side] === undefined) {
    const usable = s.deck[side].filter((id) => cardBlocker(s, side, id, 'blind') === null);
    return { type: 'CHOOSE_CARD', side, card: usable.length && Math.random() < 0.6 ? pick(usable) : null, now };
  }
  if (s.battleStep === 'reveal' && Math.random() < 0.5) {
    const reaction = (['shin-pads', 'var-review'] as const).find((id) => reactionBlocker(s, side, id) === null);
    if (reaction) return { type: 'PLAY_REACTION', side, card: reaction, now };
  }
  if (s.battleStep === 'mcq' && s.mcq && s.mcq.answers[side] === null) {
    const live = s.deck[side].filter((id) => cardBlocker(s, side, id, 'live') === null);
    if (live.length && Math.random() < 0.3) return { type: 'PLAY_LIVE', side, card: pick(live), content, now };
    const options = [0, 1, 2, 3].filter((i) => !s.mcq!.hidden[side].includes(i) && s.mcq!.firstMiss[side] !== i);
    return { type: 'ANSWER', side, index: pick(options), now };
  }
  return null;
}

interface MatchTrace {
  /** The attacker of each round that was played. */
  attackers: Partial<Record<number, DuelSide>>;
  /** The category each round was played in. */
  roundCategories: Partial<Record<number, string>>;
}

function playMatch(windowMode: CardWindowMode, trace?: MatchTrace) {
  let now = 1_000;
  let s = reducer(IDLE, { type: 'RESTART', categoryPool: categories, decks: { player: randomDeck(), opponent: randomDeck() }, windowMode, now });
  // Noted after every action: a duel can settle inside one (a Goalkeeper Gloves save right after the category pick).
  const note = () => {
    if (!trace || s.stage !== 'play') return;
    if (s.battleStep !== 'outcome') trace.attackers[s.round] ??= s.possession.attacker;
    if (s.battleStep !== 'category' && s.roundCategory) trace.roundCategories[s.round] ??= s.roundCategory.id;
  };
  for (let step = 0; step < 4000 && s.stage !== 'fulltime'; step += 1) {
    note();
    for (const side of sides) {
      const action = move(s, side, now);
      if (action) s = reducer(s, action);
      note();
    }
    for (const side of sides) {
      expect(new Set(s.used[side]).size).toBe(s.used[side].length);
      expect(s.used[side].every((id) => s.deck[side].includes(id))).toBe(true);
      expect(s.played[side].length).toBeLessThanOrEqual(1);
      // The energy was spent on the loadout: in the match a playstyle only has to be in it and unused.
      expect(deckCost(s.deck[side])).toBeLessThanOrEqual(LOADOUT_BUDGET);
    }
    if (s.advanceAt !== null) {
      // The stakes row must predict exactly what settlement then does with the real answers.
      let predicted: BattleOutcome | null = null;
      if (s.battleStep === 'mcqReveal' && s.mcq) {
        const right = (side: DuelSide) => s.mcq!.answers[side] === s.mcq!.question.correctIndex;
        const stakes = duelStakes(s);
        if (right('player') && !right('opponent')) predicted = stakes.win;
        else if (!right('player') && right('opponent')) predicted = stakes.lose;
        else if (!right('player') && !right('opponent')) predicted = stakes.bothWrong;
      } else if (s.battleStep === 'numericReveal' && s.numeric?.result) {
        const stakes = duelStakes(s);
        predicted = s.numeric.result.winner === 'player' ? stakes.win : stakes.lose;
      }
      now = Math.max(now, s.advanceAt);
      s = reducer(s, { type: 'ADVANCE', content, now });
      note();
      if (predicted) expect(s.outcome).toEqual(predicted);
    }
  }
  return s;
}

describe('zone match machine', () => {
  it.each(['round', 'question'] as const)('plays whole matches to full time with cards played %s by round', (mode) => {
    for (let i = 0; i < 25; i += 1) {
      const end = playMatch(mode);
      expect(end.stage).toBe('fulltime');
      expect(end.round).toBe(MATCH_ROUNDS);
      expect(end.feed.filter((line) => line.includes('GOAL')).length).toBeLessThanOrEqual(end.score.player + end.score.opponent);
    }
  });
});

describe('one continuous match of ten rounds', () => {
  it('alternates possession every round and uses each category once', () => {
    for (let i = 0; i < 20; i += 1) {
      const trace: MatchTrace = { attackers: {}, roundCategories: {} };
      const end = playMatch('round', trace);
      const played = Object.keys(trace.attackers).map(Number);
      expect(played.length).toBeGreaterThan(0);
      // Possession alternates: the kick-off side attacks the even rounds, the other side the odd ones.
      for (const round of played) expect(trace.attackers[round]).toBe(round % 2 === 0 ? end.kickoff : otherZoneSide(end.kickoff));
      // Five attacks each, each in a different one of the attacker's own categories.
      for (const side of sides) {
        const mine = played.filter((round) => trace.attackers[round] === side).map((round) => trace.roundCategories[round]!);
        expect(mine).toHaveLength(MATCH_ROUNDS / 2);
        expect(new Set(mine).size).toBe(mine.length);
        expect(mine.every((id) => end.categories[side].some((c) => c.id === id))).toBe(true);
        expect(end.usedCategories[side]).toHaveLength(mine.length);
      }
      // Every round is played, steal-and-scores included.
      expect(played).toHaveLength(MATCH_ROUNDS);
    }
  });

  it('deals five categories each, all different, before kick-off', () => {
    let now = 0;
    let s = reducer(IDLE, { type: 'RESTART', categoryPool: categories, decks: { player: randomDeck(), opponent: randomDeck() }, windowMode: 'round', now });
    while (s.stage !== 'categories') s = reducer(s, { type: 'ADVANCE', content, now: (now += 20_000) });
    expect(s.categories.player).toHaveLength(5);
    expect(s.categories.opponent).toHaveLength(5);
    expect(new Set([...s.categories.player, ...s.categories.opponent].map((c) => c.id)).size).toBe(10);
    s = reducer(s, { type: 'ADVANCE', content, now: (now += 20_000) });
    expect(s.stage).toBe('lineup');
    s = reducer(s, { type: 'ADVANCE', content, now: (now += 20_000) });
    expect(s.battleStep).toBe('category');
    expect(s.possession).toEqual({ attacker: s.kickoff, zone: 'centre' });
    // Only the attacker picks, only from their own unused categories.
    const defender = otherZoneSide(s.kickoff);
    expect(reducer(s, { type: 'PICK_CATEGORY', side: defender, categoryId: s.categories[defender][0].id, content, now })).toBe(s);
    const chosen = s.categories[s.kickoff][2];
    const picked = reducer(s, { type: 'PICK_CATEGORY', side: s.kickoff, categoryId: chosen.id, content, now });
    expect(picked.roundCategory).toEqual(chosen);
    expect(picked.usedCategories[s.kickoff]).toEqual([chosen.id]);
    expect(picked.battleStep).not.toBe('category');
  });
});

const mcqFor = (answers: Record<DuelSide, number | null>) => ({
  key: 1,
  question: questions[0],
  categoryName: 'Category 0',
  offCategory: false,
  answers,
  firstMiss: { player: null, opponent: null },
  startedAt: 0,
  deadline: 10_000,
  hidden: { player: [], opponent: [] },
  hiddenAt: { player: null, opponent: null },
});

const inPlay = (patch: Partial<MatchState>): MatchState => ({
  ...IDLE,
  stage: 'play',
  categories: { player: categories.slice(0, 5), opponent: categories.slice(5, 10) },
  roundCategory: categories[0],
  usedCategories: { player: ['c0'], opponent: [] },
  deck: { player: ['shin-pads', 'home-advantage', 'tiki-taka', 'fog', 'dummy-run'], opponent: ['yellow-card', 'offside-trap', 'var-review', 'dummy-run', 'fifty-fifty'] },
  duelNo: 3,
  cardWindow: true,
  ...patch,
});

describe('attacks over one continuous match', () => {
  it('counts the attacks each side has left, the one in progress until its round is over', () => {
    const turnover: BattleOutcome = { kind: 'turnover', next: { attacker: 'opponent', zone: 'centre' }, roundOver: true };
    const advance: BattleOutcome = { kind: 'advance', next: { attacker: 'player', zone: 'opponent' }, roundOver: false };
    // Round 1, the player's attack: five each, the player's first under way.
    const first = inPlay({ round: 0, possession: { attacker: 'player', zone: 'centre' }, battleStep: 'mcq' });
    expect([attacksLeft(first, 'player'), attacksLeft(first, 'opponent')]).toEqual([5, 5]);
    // A duel won mid-attack: still the same attack.
    const moved = { ...first, battleStep: 'outcome' as const, outcome: advance, outcomeFrom: first.possession, possession: advance.next };
    expect(attacksLeft(moved, 'player')).toBe(5);
    // The ball lost: that attack is spent, and the next round is theirs.
    const lost = { ...first, battleStep: 'outcome' as const, outcome: turnover, outcomeFrom: first.possession, possession: turnover.next };
    expect([attacksLeft(lost, 'player'), attacksLeft(lost, 'opponent')]).toEqual([4, 5]);
    // The last round: the opponent's last attack; the player has none left.
    const last = inPlay({ round: 9, possession: { attacker: 'opponent', zone: 'own' }, battleStep: 'category' });
    expect([attacksLeft(last, 'player'), attacksLeft(last, 'opponent')]).toEqual([0, 1]);
    expect(attacksLeft({ ...last, stage: 'fulltime' }, 'opponent')).toBe(0);
  });
});

describe('reactions', () => {
  const revealing = (opponentCard: CardId, patch: Partial<MatchState> = {}) =>
    inPlay({
      battleStep: 'reveal',
      possession: { attacker: 'opponent', zone: 'centre' },
      choice: { player: null, opponent: opponentCard },
      played: { player: [], opponent: [opponentCard] },
      ...patch,
    });

  it('lets Shin Pads cancel a revealed sabotage card, rule-level ones included', () => {
    for (const card of ['yellow-card', 'offside-trap'] as const) {
      const after = reducer(revealing(card), { type: 'PLAY_REACTION', side: 'player', card: 'shin-pads', now: 0 });
      expect(after.cancelled.opponent).toBe(true);
      expect(activeCards(after).opponent).toEqual([]);
      expect(after.used.player).toContain('shin-pads');
    }
  });

  it('keeps Shin Pads off anything but sabotage', () => {
    const s = revealing('tiki-taka', { deck: { player: ['shin-pads', 'home-advantage', 'fog', 'dummy-run', 'fifty-fifty'], opponent: ['tiki-taka', 'yellow-card', 'var-review', 'dummy-run', 'fifty-fifty'] } });
    expect(reactionBlocker(s, 'player', 'shin-pads')).toMatch(/only stop sabotage/);
    expect(reducer(s, { type: 'PLAY_REACTION', side: 'player', card: 'shin-pads', now: 0 })).toBe(s);
  });

  it('lets a Dummy Run bait Shin Pads with its fake sabotage', () => {
    const s = revealing('dummy-run', { dummyShownAs: { player: null, opponent: 'yellow-card' } });
    const after = reducer(s, { type: 'PLAY_REACTION', side: 'player', card: 'shin-pads', now: 0 });
    expect(after.cancelled.opponent).toBe(true);
    expect(after.feed[0]).toMatch(/only a Dummy Run/);
  });
});

describe('card fixes', () => {
  it('drops the Home Advantage category when VAR cancels the card', () => {
    const s = inPlay({
      battleStep: 'reveal',
      choice: { player: 'home-advantage', opponent: null },
      played: { player: ['home-advantage'], opponent: [] },
      homeCategoryId: 'c3',
    });
    const after = reducer(s, { type: 'PLAY_REACTION', side: 'opponent', card: 'var-review', now: 0 });
    expect(after.cancelled.player).toBe(true);
    expect(after.homeCategoryId).toBeNull();
  });

  it("ends the owner's Tiki-Taka when they lose a duel while defending", () => {
    const s = inPlay({
      battleStep: 'mcqReveal',
      possession: { attacker: 'opponent', zone: 'centre' },
      tiki: { player: 2, opponent: 0 },
      mcq: mcqFor({ player: 1, opponent: 0 }),
    });
    const after = reducer(s, { type: 'ADVANCE', content, now: 0 });
    expect(after.tiki.player).toBe(0);
  });

  it("keeps an opponent's Dummy Run hidden in the log until the reveal window closes", () => {
    const s = inPlay({ battleStep: 'cards', choice: { player: null, opponent: 'dummy-run' } });
    const revealed = reducer(s, { type: 'ADVANCE', content, now: 0 });
    expect(revealed.battleStep).toBe('reveal');
    expect(revealed.feed[0]).not.toMatch(/Dummy Run/);
    const played = reducer(revealed, { type: 'ADVANCE', content, now: 1 });
    expect(played.feed.join('\n')).toMatch(/was a Dummy Run/);
  });
});

describe('leaving a match', () => {
  it('disarms every timer on RESET', () => {
    const started = reducer(IDLE, {
      type: 'RESTART',
      categoryPool: categories,
      decks: { player: randomDeck(), opponent: randomDeck() },
      windowMode: 'round',
      now: 0,
    });
    expect(started.advanceAt).not.toBeNull();
    const left = reducer(started, { type: 'RESET' });
    expect(left.stage).toBe('idle');
    expect(left.advanceAt).toBeNull();
  });
});

const RESTART_BASE = { type: 'RESTART', categoryPool: categories, windowMode: 'round', now: 0 } as const;

describe('decks at the showdown', () => {
  it('reveals both decks after the VS screen, then deals the categories', () => {
    const mine: CardId[] = ['fifty-fifty', 'fog', 'tiki-taka'];
    let s = reducer(IDLE, { type: 'RESTART', categoryPool: categories, decks: { player: mine, opponent: randomDeck() }, windowMode: 'round', now: 0 });
    expect(s.stage).toBe('showdown');
    s = reducer(s, { type: 'ADVANCE', content, now: s.advanceAt! });
    expect(s.stage).toBe('deckReveal');
    expect(s.deck.player).toEqual(mine);
    expect(deckCost(s.deck.opponent)).toBeLessThanOrEqual(LOADOUT_BUDGET);
    s = reducer(s, { type: 'ADVANCE', content, now: s.advanceAt! });
    expect(s.stage).toBe('categories');
  });

  it('never starts a match with an illegal deck', () => {
    const s = reducer(IDLE, {
      type: 'RESTART',
      categoryPool: categories,
      decks: { player: ['fog', 'muddy-pitch', 'yellow-card'], opponent: randomDeck() },
      windowMode: 'round',
      now: 0,
    });
    // The extra sabotage is dropped, not swapped for something else: a loadout may be smaller than 3.
    expect(s.deck.player).toEqual(['fog']);
    const overBudget = reducer(IDLE, { ...RESTART_BASE, decks: { player: ['goalkeeper-gloves', 'tiki-taka', 'fifty-fifty'], opponent: randomDeck() } });
    expect(overBudget.deck.player).toEqual(['goalkeeper-gloves', 'fifty-fifty']);
    // No picks at all: a random loadout.
    const empty = reducer(IDLE, { ...RESTART_BASE, decks: { player: [], opponent: randomDeck() } });
    expect(empty.deck.player.length).toBeGreaterThan(0);
    expect(deckCost(empty.deck.player)).toBeLessThanOrEqual(LOADOUT_BUDGET);
  });
});

describe("the opponent's Dummy Run bluff", () => {
  it('shows a sabotage card from their own deck as spent until the VAR window closes', () => {
    const s = inPlay({
      battleStep: 'cards',
      deck: { player: ['shin-pads', 'home-advantage', 'tiki-taka', 'fifty-fifty', 'var-review'], opponent: ['dummy-run', 'muddy-pitch', 'shin-pads', 'tiki-taka', 'var-review'] },
      choice: { player: null, opponent: 'dummy-run' },
    });
    const revealed = reducer(s, { type: 'ADVANCE', content, now: 0 });
    expect(revealed.dummyShownAs.opponent).toBe('muddy-pitch');
    expect(opponentPublicView(revealed)).toEqual({ used: ['muddy-pitch'] });
    const played = reducer(revealed, { type: 'ADVANCE', content, now: 1 });
    expect(opponentPublicView(played)).toEqual({ used: ['dummy-run'] });
  });
});

describe('duel stakes', () => {
  it('spells out the win, the loss and the both-wrong outcome for a shot', () => {
    const s = inPlay({ battleStep: 'mcq', possession: { attacker: 'player', zone: 'opponent' } });
    const stakes = duelStakes(s);
    expect(stakes.win).toMatchObject({ kind: 'goal', scorer: 'player' });
    expect(stakes.lose).toMatchObject({ kind: 'turnover', next: { attacker: 'opponent', zone: 'centre' } });
    expect(stakes.bothWrong).toMatchObject({ kind: 'bothWrong', next: { attacker: 'opponent', zone: 'own' } });
    expect(stakes.glovesWillSave).toBe(false);
  });

  it('previews a clean steal at the centre as their attack from your side', () => {
    const s = inPlay({ battleStep: 'mcq', possession: { attacker: 'player', zone: 'centre' } });
    expect(duelStakes(s).lose).toMatchObject({ kind: 'turnover', next: { attacker: 'opponent', zone: 'opponent' } });
  });

  it('counts the cards in play — a Counter-Attack turns a clean steal at the centre into a goal', () => {
    const s = inPlay({ battleStep: 'mcq', possession: { attacker: 'player', zone: 'centre' }, played: { player: [], opponent: ['counter-attack'] } });
    expect(duelStakes(s).lose).toMatchObject({ kind: 'goal', scorer: 'opponent', stolen: true });
  });

  it('previews a tiebreak loss as a turn change on the spot (no steal)', () => {
    const s = inPlay({ battleStep: 'numeric', possession: { attacker: 'player', zone: 'centre' } });
    expect(duelStakes(s).lose).toMatchObject({ kind: 'turnover', next: { attacker: 'opponent', zone: 'centre' } });
  });

  it('previews Offside Trap exactly as it settles: a both-wrong duel gives the defender the ball on the spot', () => {
    const s = inPlay({ battleStep: 'mcq', possession: { attacker: 'player', zone: 'centre' }, played: { player: [], opponent: ['offside-trap'] } });
    expect(duelStakes(s).bothWrong).toMatchObject({ kind: 'turnover', next: { attacker: 'opponent', zone: 'centre' } });
  });

  it('drops Offside Trap from a tiebreak, where both were right', () => {
    const s = inPlay({ battleStep: 'numeric', possession: { attacker: 'player', zone: 'centre' }, played: { player: [], opponent: ['offside-trap'] } });
    const stakes = duelStakes(s);
    expect(stakes.mode).toBe('numeric');
    expect(stakes.bothWrong).toBeNull();
    expect(stakes.lose).toMatchObject({ next: { attacker: 'opponent', zone: 'centre' } });
  });

  it('warns that standing Goalkeeper Gloves will stop the shot', () => {
    const s = inPlay({ battleStep: 'cards', possession: { attacker: 'player', zone: 'opponent' }, gloves: { player: false, opponent: true } });
    expect(duelStakes(s).glovesWillSave).toBe(true);
  });
});

describe('robustness', () => {
  it('labels a stand-in question when the round category has none left', () => {
    // No cards in hand, so the duel goes straight to its question.
    const noCards = { player: [], opponent: [] };
    const s = reducer(inPlay({ stage: 'lineup', kickoff: 'player', usedCategories: { player: [], opponent: [] }, deck: noCards }), { type: 'ADVANCE', content, now: 0 });
    const picked = reducer(s, { type: 'PICK_CATEGORY', side: 'player', categoryId: 'c0', content, now: 0 });
    expect(picked.mcq?.offCategory).toBe(true);
    const real: Content = { mcqByCategory: { c0: questions.slice(0, 5) }, fallbackMcqs: questions };
    const kicked = reducer(inPlay({ stage: 'lineup', kickoff: 'player', usedCategories: { player: [], opponent: [] }, deck: noCards }), { type: 'ADVANCE', content: real, now: 0 });
    const withPool = reducer(kicked, { type: 'PICK_CATEGORY', side: 'player', categoryId: 'c0', content: real, now: 0 });
    expect(withPool.mcq?.offCategory).toBe(false);
  });

  it('ignores an action it does not know instead of dropping the state', () => {
    const s = inPlay({});
    expect(reducer(s, { type: 'SET_DECK' } as unknown as Action)).toBe(s);
  });
});

describe('card edge cases', () => {
  it('cancels two Home Advantages instead of overwriting the player\'s category', () => {
    const s = inPlay({
      battleStep: 'reveal',
      deck: { player: ['home-advantage'], opponent: ['home-advantage'] },
      choice: { player: 'home-advantage', opponent: 'home-advantage' },
      played: { player: ['home-advantage'], opponent: ['home-advantage'] },
      homeCategoryId: 'c3',
    });
    const next = reducer(s, { type: 'ADVANCE', content, now: 0 });
    expect(next.homeCategoryId).toBeNull();
    expect(next.feed.join('\n')).toMatch(/cancel out/);
  });

  it('blocks Home Advantage once every category has been used', () => {
    const spent = inPlay({ usedCategories: { player: ['c0', 'c1', 'c2', 'c3', 'c4'], opponent: [] } });
    expect(cardBlocker(spent, 'player', 'home-advantage', 'blind')).toBe('No categories left to pick');
    expect(cardBlocker({ ...spent, usedCategories: { player: ['c0'], opponent: [] } }, 'player', 'home-advantage', 'blind')).toBeNull();
  });

  it('keeps turns alternating after a steal-and-score, the final round included', () => {
    const stolen: BattleOutcome = { kind: 'goal', scorer: 'player', stolen: true, next: { attacker: 'player', zone: 'centre' }, roundOver: true };
    const after = (round: number) =>
      reducer(inPlay({ battleStep: 'outcome', round, outcome: stolen, outcomeFrom: { attacker: 'opponent', zone: 'own' }, possession: stolen.next }), { type: 'ADVANCE', content, now: 0 });
    // Round 9 of 10: the scorer attacks the last round from the centre; nothing is skipped.
    expect(after(MATCH_ROUNDS - 2)).toMatchObject({ round: MATCH_ROUNDS - 1, possession: { attacker: 'player', zone: 'centre' } });
    // Round 10: the match ends there, no extra possession for anyone.
    expect(after(MATCH_ROUNDS - 1)).toMatchObject({ stage: 'fulltime', round: MATCH_ROUNDS });
  });

  it('logs an expired Second Ball retry as a wrong answer', () => {
    const mcq = { ...mcqFor({ player: null, opponent: 0 }), firstMiss: { player: 2, opponent: null } };
    const s = inPlay({ battleStep: 'mcqReveal', possession: { attacker: 'player', zone: 'centre' }, mcq });
    const next = reducer(s, { type: 'ADVANCE', content, now: 0 });
    expect(next.answerLog.player.at(-1)).toBe('wrong');
  });
});

describe('cards firing', () => {
  const settle = (patch: Partial<MatchState>) => reducer(inPlay({ battleStep: 'mcqReveal', ...patch }), { type: 'ADVANCE', content, now: 0 });
  const fired = (s: MatchState) => s.cardEvents.filter((event) => event.duelNo === s.duelNo).map((event) => `${event.side}:${event.card}:${event.phase}`);

  it('names the movement cards that settled a duel', () => {
    const armband = settle({
      possession: { attacker: 'player', zone: 'own' },
      played: { player: ['captains-armband'], opponent: [] },
      mcq: mcqFor({ player: 0, opponent: 1 }),
    });
    expect(armband.outcome).toMatchObject({ kind: 'advance', next: { zone: 'opponent' } });
    expect(fired(armband)).toEqual(['player:captains-armband:result']);

    const counter = settle({
      possession: { attacker: 'opponent', zone: 'centre' },
      played: { player: ['counter-attack'], opponent: [] },
      mcq: mcqFor({ player: 0, opponent: 1 }),
    });
    expect(fired(counter)).toEqual(['player:counter-attack:result']);

    const bus = settle({
      possession: { attacker: 'opponent', zone: 'opponent' },
      played: { player: ['park-the-bus'], opponent: [] },
      mcq: mcqFor({ player: 1, opponent: 0 }),
    });
    expect(bus.outcome?.kind).toBe('held');
    expect(fired(bus)).toEqual(['player:park-the-bus:result']);

    const stopped = settle({
      possession: { attacker: 'opponent', zone: 'centre' },
      played: { player: ['park-the-bus'], opponent: ['captains-armband'] },
      mcq: mcqFor({ player: 1, opponent: 0 }),
    });
    expect(stopped.cardEvents.at(-1)).toMatchObject({
      side: 'player',
      card: 'park-the-bus',
      effect: "stopped {their} Captain's Armband",
      against: { side: 'opponent', card: 'captains-armband' },
    });
  });

  it('names the Counter-Attack that carries a Gloves save forward', () => {
    const saved = reducer(
      inPlay({
        battleStep: 'reveal',
        possession: { attacker: 'opponent', zone: 'opponent' },
        gloves: { player: true, opponent: false },
        choice: { player: 'counter-attack', opponent: null },
        played: { player: ['counter-attack'], opponent: [] },
      }),
      { type: 'ADVANCE', content, now: 0 },
    );
    expect(saved.outcomeNote).toBe(GLOVES_SAVE_NOTE);
    expect(saved.outcome).toMatchObject({ kind: 'turnover', next: { attacker: 'player', zone: 'centre' } });
    expect(fired(saved)).toEqual(['player:goalkeeper-gloves:result', 'player:counter-attack:result']);
  });

  it('fires nothing for a card that did not change the duel', () => {
    const missed = settle({
      possession: { attacker: 'player', zone: 'centre' },
      played: { player: ['captains-armband'], opponent: [] },
      mcq: mcqFor({ player: 1, opponent: 0 }),
    });
    expect(fired(missed)).toEqual([]);
  });

  it('fires the gloves save, standing effects and the Dummy Run bluff as the question opens', () => {
    const saved = reducer(
      inPlay({
        battleStep: 'reveal',
        possession: { attacker: 'opponent', zone: 'opponent' },
        gloves: { player: true, opponent: false },
        choice: { player: null, opponent: null },
      }),
      { type: 'ADVANCE', content, now: 0 },
    );
    expect(saved.outcomeNote).toBe(GLOVES_SAVE_NOTE);
    expect(fired(saved)).toEqual(['player:goalkeeper-gloves:result']);

    const opened = reducer(
      inPlay({
        battleStep: 'reveal',
        choice: { player: 'fog', opponent: 'dummy-run' },
        played: { player: ['fog'], opponent: ['dummy-run'] },
        dummyShownAs: { player: null, opponent: 'yellow-card' },
      }),
      { type: 'ADVANCE', content, now: 0 },
    );
    expect(fired(opened)).toEqual(['player:fog:reveal', 'opponent:dummy-run:reveal']);
  });

  it('fires reactions and live cards when they are played', () => {
    const s = inPlay({
      battleStep: 'reveal',
      possession: { attacker: 'opponent', zone: 'centre' },
      choice: { player: null, opponent: 'yellow-card' },
      played: { player: [], opponent: ['yellow-card'] },
    });
    const blocked = reducer(s, { type: 'PLAY_REACTION', side: 'player', card: 'shin-pads', now: 0 });
    expect(blocked.cardEvents.at(-1)).toMatchObject({
      side: 'player',
      card: 'shin-pads',
      effect: 'blocked Yellow Card',
      against: { side: 'opponent', card: 'yellow-card' },
    });

    const live = inPlay({ battleStep: 'mcq', mcq: mcqFor({ player: null, opponent: null }) });
    const cut = reducer(live, { type: 'PLAY_LIVE', side: 'opponent', card: 'fifty-fifty', content, now: 1234 });
    expect(cut.cardEvents.at(-1)).toMatchObject({ side: 'opponent', card: 'fifty-fifty', phase: 'question' });
    expect(cut.mcq?.hidden.opponent).toHaveLength(2);
    expect(cut.mcq?.hiddenAt.opponent).toBe(1234);
  });
});

describe('Card Lab', () => {
  it('stages one duel from the chosen spot', () => {
    const s = reducer(IDLE, {
      type: 'LAB_DUEL',
      categoryPool: categories,
      decks: { player: ['captains-armband'], opponent: ['var-review'] },
      possession: { attacker: 'player', zone: 'centre' },
      content,
      now: 0,
    });
    expect(s.stage).toBe('play');
    expect(s.battleStep).toBe('cards');
    expect(s.possession).toEqual({ attacker: 'player', zone: 'centre' });
    expect(s.roundCategory).toEqual(s.categories.player[0]);
  });
});

describe('Substitution', () => {
  it('drops a tap on the question it replaced', () => {
    const s = inPlay({ battleStep: 'mcq', mcq: mcqFor({ player: null, opponent: null }) });
    expect(reducer(s, { type: 'ANSWER', side: 'player', index: 0, questionId: 'an-old-question', now: 0 })).toBe(s);
    expect(reducer(s, { type: 'ANSWER', side: 'player', index: 0, questionId: questions[0].id, now: 0 }).mcq?.answers.player).toBe(0);
  });
});

describe('stakes during the reveal', () => {
  it('counts a just-revealed Gloves or Tiki-Taka before it switches on', () => {
    const gloves = inPlay({
      battleStep: 'reveal',
      possession: { attacker: 'opponent', zone: 'opponent' },
      choice: { player: 'goalkeeper-gloves', opponent: null },
      played: { player: ['goalkeeper-gloves'], opponent: [] },
    });
    expect(duelStakes(gloves).glovesWillSave).toBe(true);
    const tiki = inPlay({
      battleStep: 'reveal',
      possession: { attacker: 'player', zone: 'centre' },
      choice: { player: 'tiki-taka', opponent: null },
      played: { player: ['tiki-taka'], opponent: [] },
    });
    expect(duelStakes(tiki).win.kind).toBe('goal');
  });
});
