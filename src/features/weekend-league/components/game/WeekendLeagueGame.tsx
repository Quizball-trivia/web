'use client';

import { useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  getQuizQuestions,
  playoffOpponent,
  PLAYOFF_ROUNDS,
  rankForQuiz,
} from '../../mock-data';
import type { PlayoffOutcome, QuizOutcome } from '../../types';
import { KickoffCountdown } from './KickoffCountdown';
import { QuizPlay } from './QuizPlay';
import { QualifierResult } from './QualifierResult';
import { PlayoffResult } from './PlayoffResult';

type Stage = 'kickoff' | 'play' | 'result';

/**
 * Full-screen play flow. For the qualifier: kickoff → quiz → result. For the
 * playoffs: the same, looped across Quarter-final → Semi-final → Final until you
 * win it all or get knocked out.
 */
export function WeekendLeagueGame({
  kind,
  onExitQualifier,
  onExitPlayoff,
  onCancel,
}: {
  kind: 'qualifier' | 'playoff';
  onExitQualifier: (rank: number, outcome: QuizOutcome) => void;
  onExitPlayoff: (result: PlayoffOutcome) => void;
  onCancel: () => void;
}) {
  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Leave"
        className="fixed left-3 top-3 z-50 flex size-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:bg-black/60 hover:text-white"
      >
        <X className="size-5" />
      </button>
      {kind === 'qualifier' ? (
        <QualifierFlow onExit={onExitQualifier} />
      ) : (
        <PlayoffFlow onExit={onExitPlayoff} />
      )}
    </div>
  );
}

function QualifierFlow({ onExit }: { onExit: (rank: number, outcome: QuizOutcome) => void }) {
  const [stage, setStage] = useState<Stage>('kickoff');
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  const questions = useMemo(() => getQuizQuestions(0), []);

  const start = useCallback(() => setStage('play'), []);
  const complete = useCallback((o: QuizOutcome) => {
    setOutcome(o);
    setStage('result');
  }, []);

  if (stage === 'kickoff') {
    return <KickoffCountdown title="Qualifier" subtitle="Everyone plays the same questions. Answer fast for bonus points." onStart={start} />;
  }
  if (stage === 'play') {
    return <QuizPlay questions={questions} onComplete={complete} />;
  }
  const rank = rankForQuiz(outcome!.correct, outcome!.remaining);
  return <QualifierResult outcome={outcome!} rank={rank} onContinue={() => onExit(rank, outcome!)} />;
}

function PlayoffFlow({ onExit }: { onExit: (result: PlayoffOutcome) => void }) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('kickoff');
  const [match, setMatch] = useState<{ you: number; opp: number; won: boolean } | null>(null);

  const round = PLAYOFF_ROUNDS[roundIndex];
  const opponent = useMemo(() => playoffOpponent(round.opponentSeed), [round.opponentSeed]);
  const questions = useMemo(() => getQuizQuestions(3 * (roundIndex + 1)), [roundIndex]);

  const start = useCallback(() => setStage('play'), []);
  const complete = useCallback(
    (o: QuizOutcome) => {
      const opp = round.opponentTargetPoints;
      setMatch({ you: o.score, opp, won: o.score > opp });
      setStage('result');
    },
    [round.opponentTargetPoints],
  );

  const onContinue = useCallback(() => {
    if (!match) return;
    if (!match.won) {
      onExit({ status: 'out', roundName: round.name });
      return;
    }
    if (round.nextName === null) {
      onExit({ status: 'champion' });
      return;
    }
    setRoundIndex((i) => i + 1);
    setMatch(null);
    setStage('kickoff');
  }, [match, onExit, round.name, round.nextName]);

  if (stage === 'kickoff') {
    return <KickoffCountdown title={round.name} subtitle={`Knockout — you vs ${opponent.username}. Winner advances.`} onStart={start} />;
  }
  if (stage === 'play') {
    return <QuizPlay key={roundIndex} questions={questions} onComplete={complete} />;
  }
  return (
    <PlayoffResult
      round={round}
      opponent={opponent}
      youPoints={match!.you}
      oppPoints={match!.opp}
      won={match!.won}
      onContinue={onContinue}
    />
  );
}
