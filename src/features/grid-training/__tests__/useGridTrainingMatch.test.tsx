import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGridTrainingMatch } from '../hooks/useGridTrainingMatch';
import {
  GRID_TRAINING_BOT_ID,
  GRID_TRAINING_BOT_THINK_MS,
  GRID_TRAINING_COUNTDOWN_MS,
  GRID_TRAINING_FEEDBACK_MS,
  GRID_TRAINING_HUMAN_ID,
  GRID_TRAINING_MATCHED_MS,
  GRID_TRAINING_RESULTS_BEAT_MS,
  GRID_TRAINING_SEARCH_MS,
  GRID_TRAINING_TURN_MS,
  GRID_TRAINING_WIN_HOLD_MS,
} from '../data/gridTrainingScript';

describe('useGridTrainingMatch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function mount() {
    const onBeat = vi.fn();
    const rendered = renderHook(({ paused }: { paused: boolean }) => useGridTrainingMatch({ isPaused: paused, onBeat }), { initialProps: { paused: false } });
    const cur = () => rendered.result.current;
    const tick = async (ms: number) => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    };
    const setPaused = (paused: boolean) => rendered.rerender({ paused });
    const toFirstTurn = async () => {
      act(() => cur().actions.startSearch());
      await tick(GRID_TRAINING_SEARCH_MS + GRID_TRAINING_MATCHED_MS);
      expect(cur().stage).toBe('match');
      act(() => cur().actions.startCountdown());
      expect(cur().state.phase).toBe('countdown');
      await tick(GRID_TRAINING_COUNTDOWN_MS);
      expect(cur().state.phase).toBe('turn');
    };
    const botTurn = async () => tick(GRID_TRAINING_BOT_THINK_MS + GRID_TRAINING_FEEDBACK_MS);
    const submit = (cell: number, text: string) => {
      let ok = false;
      act(() => { ok = cur().actions.submitAnswer(cell, text); });
      return ok;
    };
    return { cur, tick, setPaused, toFirstTurn, botTurn, submit, onBeat };
  }

  it('plays the seven-turn script: mistake costs the turn, block, then 1-4-7 wins', async () => {
    const { cur, tick, toFirstTurn, botTurn, submit, onBeat } = mount();
    await toFirstTurn();
    expect(cur().guidedCell).toBe(4);
    expect(submit(0, 'Pogba')).toBe(false); // not the guided cell
    expect(submit(4, 'Pogba')).toBe(true);
    expect(cur().feedback).toBe('correct');
    expect(cur().state.claims.map((c) => c.cellIndex)).toEqual([4]);
    expect(cur().state.currentPlayerUserId).toBe(GRID_TRAINING_HUMAN_ID); // verdict stays on screen
    expect(submit(4, 'Cantona')).toBe(false); // turn already resolved
    await tick(GRID_TRAINING_FEEDBACK_MS);
    expect(cur().state.currentPlayerUserId).toBe(GRID_TRAINING_BOT_ID);
    await botTurn();
    expect(cur().state.claims.map((c) => c.cellIndex)).toEqual([4, 0]);
    // The mistake turn: the wrong name loses the turn.
    expect(cur().guidedCell).toBe(8);
    expect(submit(8, 'Cristiano Ronaldo')).toBe(true);
    expect(cur().feedback).toBe('wrong');
    expect(cur().state.claims).toHaveLength(2);
    await tick(GRID_TRAINING_FEEDBACK_MS);
    await botTurn();
    expect(cur().state.claims.map((c) => c.cellIndex)).toEqual([4, 0, 2]);
    // The block: a reused name is refused but the tutorial keeps the turn.
    expect(cur().guidedCell).toBe(1);
    expect(submit(1, 'Roberto Carlos')).toBe(true); // not French anyway → wrong
    expect(cur().feedback).toBe('wrong');
    expect(cur().guidedCell).toBe(1);
    expect(submit(1, 'Benzema')).toBe(true);
    expect(cur().feedback).toBe('correct');
    await tick(GRID_TRAINING_FEEDBACK_MS);
    await botTurn();
    expect(cur().state.claims.map((c) => c.cellIndex)).toEqual([4, 0, 2, 1, 6]);
    // The win: Pogba is spent (the hint skips him), Trezeguet completes 1-4-7.
    expect(cur().guidedCell).toBe(7);
    expect(cur().hintFor(7)).toBe('Zinedine Zidane');
    expect(submit(7, 'Pogba')).toBe(true);
    expect(cur().feedback).toBe('already_used');
    expect(submit(7, 'trezeguet')).toBe(true);
    expect(cur().state.phase).toBe('terminal');
    expect(cur().state.winnerUserId).toBe(GRID_TRAINING_HUMAN_ID);
    expect(cur().state.completionReason).toBe('line');
    expect(cur().winningLine).toEqual([1, 4, 7]);
    expect(cur().resultsVisible).toBe(false);
    await tick(GRID_TRAINING_WIN_HOLD_MS);
    expect(cur().resultsVisible).toBe(true);
    await tick(GRID_TRAINING_RESULTS_BEAT_MS);
    expect(onBeat.mock.calls.map((c) => c[0])).toEqual([
      // 'retry' repeats per refused attempt; the tooltip hook shows it once.
      'board', 'your-turn', 'claimed', 'opponent-turn', 'mistake', 'wrong', 'threat', 'block', 'retry', 'blocked', 'skip-draw', 'win-chance', 'retry', 'win', 'results',
    ]);
  });

  it('accepts a valid answer on the mistake turn and still ends on 1-4-7', async () => {
    const { cur, tick, toFirstTurn, botTurn, submit } = mount();
    await toFirstTurn();
    submit(4, 'Cantona');
    await tick(GRID_TRAINING_FEEDBACK_MS);
    await botTurn();
    expect(submit(8, 'Dybala')).toBe(true);
    expect(cur().feedback).toBe('correct');
    await tick(GRID_TRAINING_FEEDBACK_MS);
    await botTurn();
    submit(1, 'Zidane');
    await tick(GRID_TRAINING_FEEDBACK_MS);
    await botTurn();
    submit(7, 'Pogba');
    expect(cur().state.winnerUserId).toBe(GRID_TRAINING_HUMAN_ID);
    expect(cur().state.claims.map((c) => c.cellIndex)).toEqual([4, 0, 8, 2, 1, 6, 7]);
  });

  it('never expires the guided turn and freezes under a tooltip', async () => {
    const { cur, tick, setPaused, toFirstTurn, submit } = mount();
    await toFirstTurn();
    const first = cur().state.turnDeadlineAt!;
    await tick(GRID_TRAINING_TURN_MS + 50);
    expect(cur().state.currentPlayerUserId).toBe(GRID_TRAINING_HUMAN_ID);
    expect(Date.parse(cur().state.turnDeadlineAt!)).toBeGreaterThan(Date.parse(first));
    const deadline = cur().state.turnDeadlineAt!;
    act(() => setPaused(true));
    expect(cur().clockPausedAt).not.toBeNull();
    expect(submit(4, 'Pogba')).toBe(false); // a tooltip owns the screen
    await tick(7_000);
    expect(cur().state.turnDeadlineAt).toBe(deadline);
    act(() => setPaused(false));
    expect(Date.parse(cur().state.turnDeadlineAt!)).toBe(Date.parse(deadline) + 7_000);
    submit(4, 'Pogba');
    await tick(GRID_TRAINING_FEEDBACK_MS);
    // A bot think held under a tooltip resumes afterwards.
    act(() => setPaused(true));
    await tick(GRID_TRAINING_BOT_THINK_MS * 3);
    expect(cur().state.claims).toHaveLength(1);
    act(() => setPaused(false));
    await tick(GRID_TRAINING_BOT_THINK_MS);
    expect(cur().state.claims).toHaveLength(2);
  });

  it('restarts cleanly for a replay', async () => {
    const { cur, tick, toFirstTurn, submit } = mount();
    await toFirstTurn();
    submit(4, 'Pogba');
    act(() => cur().actions.startSearch());
    expect(cur().stage).toBe('searching');
    expect(cur().state.claims).toEqual([]);
    expect(cur().state.phase).toBe('handoff');
    expect(cur().feedback).toBeUndefined();
    await tick(GRID_TRAINING_SEARCH_MS + GRID_TRAINING_MATCHED_MS);
    expect(cur().stage).toBe('match');
    act(() => cur().actions.startCountdown());
    await tick(GRID_TRAINING_COUNTDOWN_MS);
    expect(cur().hintFor(4)).toBe('Paul Pogba'); // the used set was cleared
  });
});
