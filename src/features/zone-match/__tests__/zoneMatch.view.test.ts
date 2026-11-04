import { describe, expect, it } from 'vitest';
import { SAMPLE_NUMERIC_QUESTIONS } from '@/features/numeric-question/sampleNumericQuestions';
import type { GameQuestion } from '@/lib/domain';
import { randomDeck } from '../zoneMatch.cards';
import { IDLE, reducer, type Category, type Content, type MatchState } from '../zoneMatch.machine';
import { withRandom } from '../zoneMatch.random';
import { HIDDEN_ANSWER, flipState, seatView } from '../zoneMatch.view';

const categories: Category[] = Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, name: `Category ${i}`, imageUrl: null, icon: null }));
const questions: GameQuestion[] = Array.from({ length: 40 }, (_, i) => ({ id: `q${i}`, prompt: `Question ${i}`, options: ['a', 'b', 'c', 'd'], correctIndex: i % 4 }));
const content: Content = { mcqByCategory: {}, fallbackMcqs: questions, numerics: SAMPLE_NUMERIC_QUESTIONS };

/** Plays a seeded match forward, every step through `withRandom`, until `until` holds. */
function play(seed: number, until: (s: MatchState) => boolean): MatchState {
  let s = withRandom(seed, () => reducer(IDLE, { type: 'RESTART', categoryPool: categories, decks: { player: randomDeck(), opponent: randomDeck() }, windowMode: 'round', now: 0 }));
  for (let i = 0; i < 400 && !until(s); i += 1) {
    const now = s.advanceAt ?? 0;
    if (s.stage === 'play' && s.battleStep === 'mcq' && s.mcq && s.mcq.answers.player === null) {
      s = reducer(s, { type: 'ANSWER', side: 'player', index: 0, now: s.mcq.startedAt + 500 });
      s = reducer(s, { type: 'ANSWER', side: 'opponent', index: 1, now: s.mcq!.startedAt + 700 });
      continue;
    }
    s = withRandom(seed + i, () => reducer(s, { type: 'ADVANCE', content, now }));
  }
  return s;
}

describe('seat views', () => {
  it('turns round a per-side record with a side missing (a pick JSON dropped)', () => {
    const picked = JSON.parse(JSON.stringify({ choice: { player: 'fog', opponent: undefined } }));
    expect(flipState(picked)).toEqual({ choice: { opponent: 'fog' } });
  });

  it('replays a seeded match exactly', () => {
    const a = play(42, (s) => s.stage === 'fulltime' || s.stage === 'shootout');
    const b = play(42, (s) => s.stage === 'fulltime' || s.stage === 'shootout');
    expect(b).toEqual(a);
  });

  it('turning the sides round twice gives the same state', () => {
    const s = play(7, (x) => x.stage === 'play' && x.battleStep === 'mcq');
    expect(flipState(flipState(s))).toEqual(s);
    const flipped = flipState(s);
    expect(flipped.score).toEqual({ player: s.score.opponent, opponent: s.score.player });
    expect(flipped.possession.attacker).toBe(s.possession.attacker === 'player' ? 'opponent' : 'player');
    expect(flipped.deck.player).toEqual(s.deck.opponent);
  });

  it('hides the right answer and their answer until the reveal', () => {
    let s = play(9, (x) => x.stage === 'play' && x.battleStep === 'mcq');
    s = reducer(s, { type: 'ANSWER', side: 'opponent', index: 2, now: s.mcq!.startedAt + 300 });
    for (const seat of ['player', 'opponent'] as const) {
      const view = seatView(s, seat);
      expect(view.state.mcq!.question.correctIndex).toBe(HIDDEN_ANSWER);
      expect(view.state.mcq!.answers.opponent).toBeNull();
      expect(view.state.feed).toEqual([]);
    }
    // The opponent seat sees its own answer as "player"; the player seat only that they answered.
    expect(seatView(s, 'opponent').state.mcq!.answers.player).toBe(2);
    expect(seatView(s, 'player').opponentAnswered).toBe(true);
  });

  it('shows the answer once the question is over', () => {
    const s = play(11, (x) => x.stage === 'play' && x.battleStep === 'mcqReveal');
    expect(seatView(s, 'opponent').state.mcq!.question.correctIndex).toBe(s.mcq!.question.correctIndex);
  });
});
