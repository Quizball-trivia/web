import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { usePossessionBarBattleFlights } from '../usePossessionBarBattleFlights';

const MATCH_ID = 'match-1';

function rect(left: number, top: number, width = 40, height = 40): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

function appendAnchor(selectorAttr: string, value: string, bounds: DOMRect) {
  const element = document.createElement('div');
  element.setAttribute(selectorAttr, value);
  element.getBoundingClientRect = () => bounds;
  document.body.appendChild(element);
}

describe('usePossessionBarBattleFlights', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    useRealtimeMatchStore.getState().reset();

    appendAnchor('data-splash-anchor', 'player', rect(40, 420));
    appendAnchor('data-splash-anchor', 'opponent', rect(400, 420));
    appendAnchor('data-pitch-avatar', 'player', rect(120, 120));
    appendAnchor('data-pitch-avatar', 'opponent', rect(340, 120));
    appendAnchor('data-pitch-field', 'possession', rect(20, 40, 460, 260));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    useRealtimeMatchStore.getState().reset();
    vi.useRealTimers();
  });

  it('fires score flights for last-attack extra questions', async () => {
    useRealtimeMatchStore.setState({
      match: {
        variant: 'ranked_sim',
        matchId: MATCH_ID,
        mySeat: 1,
        currentQuestionPhase: 'playing',
        currentQuestion: {
          matchId: MATCH_ID,
          qIndex: 12,
          total: 13,
          phaseKind: 'last_attack',
          phaseRound: 1,
          question: {
            kind: 'multipleChoice',
            id: 'extra-q',
            prompt: 'Extra question',
            options: ['A', 'B', 'C', 'D'],
            categoryName: 'General',
          },
          deadlineAt: new Date(Date.now() + 10_000).toISOString(),
        },
        answerAck: {
          matchId: MATCH_ID,
          qIndex: 12,
          questionKind: 'multipleChoice',
          selectedIndex: 0,
          isCorrect: true,
          correctIndex: 0,
          myTotalPoints: 100,
          oppAnswered: false,
          pointsEarned: 90,
          phaseKind: 'last_attack',
          phaseRound: 1,
        },
        possessionState: {
          phaseKind: 'last_attack',
        },
      } as never,
    });

    const { result } = renderHook(() => usePossessionBarBattleFlights());

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current.flights).toHaveLength(1);
    expect(result.current.flights[0]).toMatchObject({
      side: 'player',
      points: 90,
      failed: false,
    });
  });
});
