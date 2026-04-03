'use client';

import type { RankedQuestionData } from '../../types/matchQuestion.types';
import { RankedMCPanel } from './RankedMCPanel';
import { RankedCountdownPanel } from './RankedCountdownPanel';
import { RankedPutInOrderPanel } from './RankedPutInOrderPanel';
import { RankedCluesPanel } from './RankedCluesPanel';

interface MatchQuestionRouterProps {
  question: RankedQuestionData;
  /** Seconds available for timed question types (countdown, clues timer-per-clue). */
  secondsTotal: number;
  onComplete: (isCorrect: boolean) => void;
}

/**
 * Routes to the correct question panel based on `question.kind`.
 *
 * Phase 1: used in the mock-match dev page.
 * Phase 2: will replace the inline question rendering in RealtimePossessionMatchScreen
 *          once the backend sends `questionKind` in the match:question socket event.
 */
export function MatchQuestionRouter({ question, secondsTotal, onComplete }: MatchQuestionRouterProps) {
  switch (question.kind) {
    case 'multipleChoice':
      return (
        <RankedMCPanel
          question={question}
          onComplete={onComplete}
        />
      );

    case 'countdown':
      return (
        <RankedCountdownPanel
          question={question}
          secondsTotal={secondsTotal}
          onComplete={(foundAnswers) => {
            // Scoring heuristic for mock: correct if at least 3 answers found
            onComplete(foundAnswers.length >= 3);
          }}
        />
      );

    case 'putInOrder':
      return (
        <RankedPutInOrderPanel
          question={question}
          onComplete={onComplete}
        />
      );

    case 'clues':
      return (
        <RankedCluesPanel
          question={question}
          secondsPerClue={Math.floor(secondsTotal / question.clues.length)}
          onComplete={(isCorrect) => onComplete(isCorrect)}
        />
      );
  }
}
