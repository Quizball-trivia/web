import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveSpecialQuestionPanel } from '../LiveSpecialQuestionPanel';
import type { ResolvedCountdownQuestion, ResolvedPutInOrderQuestion } from '@/lib/realtime/socket.types';

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

const countdownQuestion: ResolvedCountdownQuestion = {
  kind: 'countdown',
  id: 'countdown-1',
  prompt: 'Name clubs',
  answerSlotCount: 3,
  categoryName: 'Clubs',
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
