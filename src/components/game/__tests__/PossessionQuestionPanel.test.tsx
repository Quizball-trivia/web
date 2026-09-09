import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PossessionQuestionPanel } from '../PossessionQuestionPanel';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PossessionQuestionPanel', () => {
  it('only enables the guided tutorial answer', () => {
    const onAnswer = vi.fn();
    render(
      <PossessionQuestionPanel
        phase="playing"
        isPenaltyPhase={false}
        isShotPhase={false}
        isLastAttackPhase={false}
        question={{
          id: 'guided-q',
          prompt: 'Choose Brazil',
          options: ['Germany', 'Brazil', 'Argentina', 'Italy'],
          correctIndex: 1,
        }}
        qIndex={0}
        totalQuestions={12}
        timeRemaining={null}
        showOptions
        selectedAnswer={null}
        answerStates={['disabled', 'default', 'disabled', 'disabled']}
        opponentAnswer={null}
        guidedAnswerIndex={1}
        onAnswer={onAnswer}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
    expect(buttons[2]).toBeDisabled();
    expect(buttons[3]).toBeDisabled();

    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith(1);
  });

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

  it('scrolls the answer grid into view on short mobile screens when options appear', () => {
    const originalOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      configurable: true,
      get() {
        return document.body;
      },
    });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 667 });

    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(this: HTMLElement) {
      return {
        x: 0,
        y: 0,
        top: 520,
        left: 0,
        right: 375,
        bottom: this.getAttribute('data-mcq-options-grid') === 'true' ? 760 : 0,
        width: 375,
        height: 240,
        toJSON: () => ({}),
      } as DOMRect;
    });

    try {
      render(
        <PossessionQuestionPanel
          phase="playing"
          isPenaltyPhase={false}
          isShotPhase={false}
          isLastAttackPhase={false}
          question={{
            id: 'q-scroll',
            prompt: 'Who won?',
            options: ['Croatia', 'France', 'England', 'Belgium'],
            correctIndex: 1,
          }}
          qIndex={0}
          totalQuestions={12}
          timeRemaining={10}
          showOptions
          selectedAnswer={null}
          answerStates={['default', 'default', 'default', 'default']}
          opponentAnswer={null}
          onAnswer={vi.fn()}
        />,
      );

      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest',
      });
    } finally {
      if (originalOffsetParent) {
        Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent);
      }
    }
  });
});
