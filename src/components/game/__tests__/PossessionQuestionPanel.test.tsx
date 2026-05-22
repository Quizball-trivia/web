import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PossessionQuestionPanel } from '../PossessionQuestionPanel';

describe('PossessionQuestionPanel', () => {
  it('keeps the opponent pick marker visible on the revealed correct answer', () => {
    render(
      <PossessionQuestionPanel
        phase="reveal"
        isPenaltyPhase={false}
        isShotPhase={false}
        isLastAttackPhase={false}
        question={{
          id: 'q-1',
          prompt: 'Who is correct?',
          options: ['Wrong', 'Andrea Pirlo', 'Other', 'Another'],
          correctIndex: 1,
        }}
        qIndex={0}
        totalQuestions={12}
        timeRemaining={0}
        showOptions={false}
        selectedAnswer={0}
        answerStates={['wrong', 'correct', 'default', 'default']}
        opponentAnswer={1}
        onAnswer={vi.fn()}
      />,
    );

    const marker = screen.getByLabelText('Opponent selected this answer');
    expect(marker).toHaveClass('bg-white');
    expect(marker.querySelector('span')).toHaveStyle({ backgroundColor: '#38B60E' });
  });

  it('keeps the opponent wrong pick marker visible when the player answer is correct', () => {
    render(
      <PossessionQuestionPanel
        phase="reveal"
        isPenaltyPhase={false}
        isShotPhase={false}
        isLastAttackPhase={false}
        question={{
          id: 'q-2',
          prompt: 'Who is correct?',
          options: ['Wrong Opp Pick', 'Andrea Pirlo', 'Other', 'Another'],
          correctIndex: 1,
        }}
        qIndex={0}
        totalQuestions={12}
        timeRemaining={0}
        showOptions={false}
        selectedAnswer={1}
        answerStates={['default', 'correct', 'default', 'default']}
        opponentAnswer={0}
        onAnswer={vi.fn()}
      />,
    );

    const marker = screen.getByLabelText('Opponent selected this answer');
    expect(marker).toHaveClass('bg-white');
    expect(marker.querySelector('span')).toHaveStyle({ backgroundColor: '#FB3101' });
  });
});
