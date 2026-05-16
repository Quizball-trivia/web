import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveSpecialQuestionPanel } from '../LiveSpecialQuestionPanel';
import type { ResolvedPutInOrderQuestion } from '@/lib/realtime/socket.types';

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
});
