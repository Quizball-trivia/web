import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveSpecialQuestionPanel } from '../LiveSpecialQuestionPanel';
import type {
  ResolvedCluesQuestion,
  ResolvedCountdownQuestion,
  ResolvedPutInOrderQuestion,
} from '@/lib/realtime/socket.types';

const emitMock = vi.fn();

vi.mock('@/lib/realtime/socket-client', () => ({
  getSocket: () => ({
    emit: emitMock,
  }),
}));

const putInOrderQuestion: ResolvedPutInOrderQuestion = {
  kind: 'putInOrder',
  id: 'put-order-1',
  prompt: 'Order these players from oldest to newest',
  instruction: 'oldest to newest',
  direction: 'asc',
  categoryName: 'Timeline',
  items: [
    { id: 'pele', label: 'Pele debut', details: '1956', emoji: '🇧🇷' },
    { id: 'maradona', label: 'Maradona debut', details: '1976', emoji: '🇦🇷' },
    { id: 'ronaldo', label: 'Ronaldo debut', details: '1993', emoji: '🇧🇷' },
  ],
};

const fourItemPutInOrderQuestion: ResolvedPutInOrderQuestion = {
  ...putInOrderQuestion,
  items: [
    ...putInOrderQuestion.items,
    { id: 'messi', label: 'Messi debut', details: '2004', emoji: '🇦🇷' },
  ],
};

const countdownQuestion: ResolvedCountdownQuestion = {
  kind: 'countdown',
  id: 'countdown-1',
  prompt: 'Name clubs',
  answerSlotCount: 3,
  categoryName: 'Clubs',
};

const cluesQuestion: ResolvedCluesQuestion = {
  kind: 'clues',
  id: 'clues-1',
  prompt: 'Who Am I?',
  categoryName: 'Dortmund',
  resolvedLocale: 'en',
  clues: [
    { type: 'text', content: 'Swiss goalkeeper' },
    { type: 'text', content: 'Played for Dortmund' },
    { type: 'text', content: 'Wore number 1' },
    { type: 'text', content: 'Joined in 2015' },
    { type: 'text', content: 'Left in 2022' },
  ],
};

function renderPutInOrder(overrides: Partial<Parameters<typeof LiveSpecialQuestionPanel>[0]> = {}) {
  return render(
    <LiveSpecialQuestionPanel
      matchId="match-1"
      qIndex={2}
      question={putInOrderQuestion}
      showOptions
      timeRemaining={10}
      questionDurationSeconds={30}
      roundResolved={false}
      answerAck={null}
      roundResult={null}
      myRound={null}
      opponentRound={null}
      countdownGuessAck={null}
      cluesGuessAck={null}
      {...overrides}
    />
  );
}

describe('LiveSpecialQuestionPanel put-in-order submission', () => {
  beforeEach(() => {
    emitMock.mockClear();
  });

  it('does not auto-submit from an initial zero timer before the round has been playable', async () => {
    renderPutInOrder({ timeRemaining: 0 });

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

    expect(emitMock).not.toHaveBeenCalled();
  });

  it('auto-submits the current order after a playable timer reaches zero', async () => {
    const { rerender } = renderPutInOrder({ timeRemaining: 5 });

    rerender(
      <LiveSpecialQuestionPanel
        matchId="match-1"
        qIndex={2}
        question={putInOrderQuestion}
        showOptions
        timeRemaining={0}
        questionDurationSeconds={30}
        roundResolved={false}
        answerAck={null}
        roundResult={null}
        myRound={null}
        opponentRound={null}
        countdownGuessAck={null}
        cluesGuessAck={null}
      />
    );

    await waitFor(() => {
      expect(emitMock).toHaveBeenCalledWith('match:put_in_order_answer', {
        matchId: 'match-1',
        qIndex: 2,
        orderedItemIds: ['pele', 'maradona', 'ronaldo'],
        timeMs: 30000,
      });
    });
  });

  it('still submits immediately when the player presses submit', async () => {
    renderPutInOrder({ timeRemaining: 8 });

    fireEvent.click(screen.getByRole('button', { name: /submit order/i }));

    await waitFor(() => {
      expect(emitMock).toHaveBeenCalledWith('match:put_in_order_answer', {
        matchId: 'match-1',
        qIndex: 2,
        orderedItemIds: ['pele', 'maradona', 'ronaldo'],
        timeMs: 22000,
      });
    });
  });

  it('restores submitted state from a replayed answer ack', async () => {
    renderPutInOrder({
      answerAck: {
        matchId: 'match-1',
        qIndex: 2,
        questionKind: 'putInOrder',
        selectedIndex: null,
        isCorrect: false,
        myTotalPoints: 40,
        oppAnswered: false,
        pointsEarned: 40,
        foundCount: 2,
        submittedOrderIds: ['ronaldo', 'pele', 'maradona'],
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submitted/i })).toBeDisabled();
    });
  });

  it('keeps fallback opponent order count consistent with opponent points', async () => {
    renderPutInOrder({
      question: fourItemPutInOrderQuestion,
      roundResolved: true,
      roundResult: {
        matchId: 'match-1',
        qIndex: 2,
        questionKind: 'putInOrder',
        reveal: {
          kind: 'putInOrder',
          correctOrder: fourItemPutInOrderQuestion.items.map((item, index) => ({
            id: item.id,
            label: { en: item.label },
            details: item.details ? { en: item.details } : null,
            emoji: item.emoji ?? null,
            sortValue: index + 1,
          })),
        },
        players: {},
        phaseKind: 'normal',
        phaseRound: 1,
        deltas: { possessionDelta: 0, goalScoredBySeat: null, penaltyOutcome: null },
      },
      myRound: {
        totalPoints: 20,
        pointsEarned: 20,
        isCorrect: false,
        timeMs: 1000,
        selectedIndex: null,
        foundCount: 1,
        submittedOrderIds: ['pele', 'ronaldo', 'messi', 'maradona'],
      },
      opponentRound: {
        totalPoints: 20,
        pointsEarned: 20,
        isCorrect: false,
        timeMs: 1000,
        selectedIndex: null,
        foundCount: 1,
      } as never,
    });

    await waitFor(() => {
      expect(screen.getAllByText('1/4')).toHaveLength(2);
      expect(screen.queryByText('2/4')).not.toBeInTheDocument();
    });
  });

  it('renders a no-submit opponent as 0/N with all rows wrong', async () => {
    renderPutInOrder({
      question: fourItemPutInOrderQuestion,
      roundResolved: true,
      roundResult: {
        matchId: 'match-1',
        qIndex: 2,
        questionKind: 'putInOrder',
        reveal: {
          kind: 'putInOrder',
          correctOrder: fourItemPutInOrderQuestion.items.map((item, index) => ({
            id: item.id,
            label: { en: item.label },
            details: item.details ? { en: item.details } : null,
            emoji: item.emoji ?? null,
            sortValue: index + 1,
          })),
        },
        players: {},
        phaseKind: 'normal',
        phaseRound: 1,
        deltas: { possessionDelta: 100, goalScoredBySeat: null, penaltyOutcome: null },
      },
      myRound: {
        totalPoints: 100,
        pointsEarned: 100,
        isCorrect: true,
        timeMs: 1000,
        selectedIndex: null,
        foundCount: 4,
        submittedOrderIds: ['pele', 'maradona', 'ronaldo', 'messi'],
      },
      opponentRound: {
        totalPoints: 0,
        pointsEarned: 0,
        isCorrect: false,
        timeMs: 30000,
        selectedIndex: null,
        foundCount: 0,
        submittedOrderIds: [],
      },
    });

    await waitFor(() => {
      expect(screen.getByText('0/4')).toBeInTheDocument();
      expect(screen.queryByText('Opponent order unavailable')).not.toBeInTheDocument();
      expect(screen.getAllByText(/Should be/i)).toHaveLength(4);
    });
  });
});

describe('LiveSpecialQuestionPanel clues scoring display', () => {
  beforeEach(() => {
    emitMock.mockClear();
  });

  function renderClues(overrides: Partial<Parameters<typeof LiveSpecialQuestionPanel>[0]> = {}) {
    return render(
      <LiveSpecialQuestionPanel
        matchId="match-1"
        qIndex={4}
        question={cluesQuestion}
        showOptions
        timeRemaining={50}
        questionDurationSeconds={50}
        roundResolved={false}
        answerAck={null}
        roundResult={null}
        myRound={null}
        opponentRound={null}
        countdownGuessAck={null}
        cluesGuessAck={null}
        {...overrides}
      />
    );
  }

  it('starts clue answers at 100 points', () => {
    renderClues();

    expect(screen.getByText('100 pts')).toBeInTheDocument();
    expect(screen.queryByText('200 pts')).not.toBeInTheDocument();
  });

  it('drops clue answers by 20 points for each revealed clue', () => {
    renderClues({ timeRemaining: 30 });

    expect(screen.getByText('60 pts')).toBeInTheDocument();
  });
});

describe('LiveSpecialQuestionPanel countdown replay', () => {
  beforeEach(() => {
    emitMock.mockClear();
  });

  it('hydrates all restored found answers from a replay ack', async () => {
    render(
      <LiveSpecialQuestionPanel
        matchId="match-1"
        qIndex={3}
        question={countdownQuestion}
        showOptions
        timeRemaining={10}
        questionDurationSeconds={30}
        roundResolved={false}
        answerAck={null}
        roundResult={null}
        myRound={null}
        opponentRound={null}
        countdownGuessAck={{
          matchId: 'match-1',
          qIndex: 3,
          accepted: true,
          duplicate: false,
          foundCount: 2,
          acceptedDisplays: [{ en: 'Arsenal' }, { en: 'Chelsea' }],
        }}
        cluesGuessAck={null}
      />
    );

    expect(await screen.findByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
  });
});
