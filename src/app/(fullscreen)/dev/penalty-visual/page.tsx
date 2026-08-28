'use client';

// DEV-ONLY visual verification page for the penalty bug-cluster fixes.
// Renders each reported state with the REAL components so headless-chromium
// screenshots can confirm what players actually see. Not linked from anywhere.
//
// /dev/penalty-visual?state=<name>
//   regulation      mid-shootout pips (David's screenshot 1: 5 miss vs 4 miss)
//   sd-hold         sudden death just flipped — 10th kick pip must STAY visible
//   sd-goal         after the hold, an SD kick landed — green pip in fresh row
//   final           decided shootout: 4 miss + 1 goal vs 5 miss
//   panel-penalty   question panel, regulation kick label ("Penalty 3/5")
//   panel-sd        question panel, sudden death — label must NOT be "Question 1/1"
//   panel-hidden    question up, options still locked (pre-reveal read window)
//   panel-revealed  options open (David's Serie A question, Totti selected)
// Append &lang=ka for Georgian.

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PenaltyHUD } from '@/features/possession/components/PenaltyHUD';
import { PossessionQuestionPanel } from '@/components/game/PossessionQuestionPanel';
import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray } from '@/lib/types/game.types';

const SERIE_A_QUESTION: GameQuestion = {
  id: 'demo-serie-a-penalties',
  prompt: 'რომელ მოთამაშეს აქვს გატანილი ყველაზე მეტი პენალტი სერია A-ს ისტორიაში?',
  options: ['რობერტო ბაჯო', 'ფრანჩესკო ტოტი', 'ალესანდრო დელ პიერო', 'ანდრეა პირლო'],
  correctIndex: 1,
  categoryName: 'პენალტები',
};

const DEFAULT_ANSWER_STATES: AnswerStateArray = ['default', 'default', 'default', 'default'];

const MISSES = (n: number): Array<'goal' | 'miss'> => Array.from({ length: n }, () => 'miss');

function hudProps(state: string) {
  const base = {
    playerName: 'David',
    opponentName: 'Nika',
    playerAvatarUrl: '',
    opponentAvatarUrl: '',
    playerPoints: 925,
    opponentPoints: 930,
    timeRemaining: 10,
    phase: 'penalty-question' as const,
  };
  switch (state) {
    case 'sd-hold':
    case 'sd-goal':
      return {
        ...base,
        penaltyPlayerScore: state === 'sd-goal' ? 1 : 0,
        penaltyOpponentScore: 0,
        penaltyPlayerAttempts: state === 'sd-goal' ? [...MISSES(5), 'goal' as const] : MISSES(5),
        penaltyOpponentAttempts: MISSES(5),
        penaltyRound: 11,
        isPenaltySuddenDeath: true,
        isPlayerShooter: true,
      };
    case 'final':
      return {
        ...base,
        penaltyPlayerScore: 0,
        penaltyOpponentScore: 1,
        penaltyPlayerAttempts: MISSES(5),
        penaltyOpponentAttempts: [...MISSES(4), 'goal' as const],
        penaltyRound: 10,
        isPenaltySuddenDeath: false,
        isPlayerShooter: false,
      };
    case 'regulation':
    default:
      return {
        ...base,
        penaltyPlayerScore: 0,
        penaltyOpponentScore: 0,
        penaltyPlayerAttempts: MISSES(5),
        penaltyOpponentAttempts: MISSES(4),
        penaltyRound: 5,
        isPenaltySuddenDeath: false,
        isPlayerShooter: false,
      };
  }
}

function panelProps(state: string) {
  const base = {
    phase: 'penalty-playing' as const,
    isPenaltyPhase: true,
    isShotPhase: false,
    isLastAttackPhase: false,
    question: SERIE_A_QUESTION,
    qIndex: 20,
    totalQuestions: 12,
    timeRemaining: state === 'panel-hidden' ? 10 : 4,
    selectedAnswer: state === 'panel-revealed' ? 1 : null,
    answerStates: DEFAULT_ANSWER_STATES,
    opponentAnswer: null,
    onAnswer: () => {},
  };
  switch (state) {
    case 'panel-sd':
      return {
        ...base,
        showOptions: true,
        isPenaltySuddenDeath: true,
        penaltyDisplayRound: 1,
        penaltyDisplayTotal: 1,
      };
    case 'panel-hidden':
      return {
        ...base,
        showOptions: false,
        isPenaltySuddenDeath: false,
        penaltyDisplayRound: 3,
        penaltyDisplayTotal: 5,
      };
    case 'panel-revealed':
    case 'panel-penalty':
    default:
      return {
        ...base,
        showOptions: true,
        isPenaltySuddenDeath: false,
        penaltyDisplayRound: 3,
        penaltyDisplayTotal: 5,
      };
  }
}

function PenaltyVisualInner() {
  const params = useSearchParams();
  const state = params.get('state') ?? 'regulation';
  const isPanel = state.startsWith('panel-');
  const hud = useMemo(() => hudProps(state), [state]);
  const panel = useMemo(() => panelProps(state), [state]);

  return (
    <div className="min-h-screen bg-surface-page px-3 py-6" data-visual-state={state}>
      <div className="mx-auto max-w-md">
        <div className="mb-4 rounded bg-white/10 px-3 py-1 text-center text-xs font-bold uppercase tracking-widest text-white/70">
          {state}
        </div>
        {isPanel ? (
          <PossessionQuestionPanel {...panel} />
        ) : (
          <PenaltyHUD {...hud} />
        )}
      </div>
    </div>
  );
}

export default function PenaltyVisualPage() {
  return (
    <Suspense fallback={null}>
      <PenaltyVisualInner />
    </Suspense>
  );
}
