'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { MOCK_HALF_1, MOCK_HALF_2 } from '@/features/game/mock/mockMatchQuestions';
import { MatchQuestionRouter } from '@/features/game/components/questions/MatchQuestionRouter';
import type { RankedQuestionData } from '@/features/game/types/matchQuestion.types';

if (process.env.NODE_ENV !== 'development') {
  // Handled below — kept here as a guard comment
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HALVES = [MOCK_HALF_1, MOCK_HALF_2] as const;
const QUESTIONS_PER_HALF = 6;
const COUNTDOWN_SECONDS = 45;
const QUESTION_LABELS = ['MC 1', 'MC 2', 'MC 3', 'Countdown', 'Put In Order', 'Who Am I'];

type Screen = 'intro' | 'playing' | 'halftime' | 'fulltime';

// Fake opponent: gets it right 60 % of the time
function opponentIsCorrect() { return Math.random() < 0.6; }

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreBar({
  half,
  qIndex,
  myScore,
  oppScore,
}: {
  half: 1 | 2;
  qIndex: number;
  myScore: number;
  oppScore: number;
}) {
  return (
    <div className="border-b-2 border-[#1B2F36] bg-[#131F24]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-lg px-4 py-3">
        {/* Scores */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-xs font-bold text-[#56707A]">YOU</p>
            <p className="text-2xl font-black text-white">{myScore}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#56707A]">
              Half {half} · Q{qIndex + 1}/{QUESTIONS_PER_HALF}
            </p>
            <p className="text-xs font-bold text-[#1CB0F6]">{QUESTION_LABELS[qIndex]}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-[#56707A]">OPP</p>
            <p className="text-2xl font-black text-white">{oppScore}</p>
          </div>
        </div>
        {/* Progress dots */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {Array.from({ length: QUESTIONS_PER_HALF }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < qIndex
                  ? 'w-4 bg-[#58CC02]'
                  : i === qIndex
                  ? 'w-6 bg-[#1CB0F6]'
                  : 'w-4 bg-[#1B2F36]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionKindBadge({ kind }: { kind: RankedQuestionData['kind'] }) {
  const config: Record<RankedQuestionData['kind'], { label: string; color: string }> = {
    multipleChoice: { label: 'Multiple Choice', color: 'bg-[#1CB0F6]/15 text-[#1CB0F6]' },
    countdown:      { label: 'Countdown',       color: 'bg-[#FF9600]/15 text-[#FF9600]' },
    putInOrder:     { label: 'Put In Order',     color: 'bg-[#CE82FF]/15 text-[#CE82FF]' },
    clues:          { label: 'Who Am I?',        color: 'bg-[#58CC02]/15 text-[#58CC02]' },
  };
  const { label, color } = config[kind];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${color}`}>
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MockMatchPage() {
  const router = useRouter();

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#131F24] font-fun text-white">
        Dev only
      </div>
    );
  }

  return <MockMatchContent onExit={() => router.push('/play')} />;
}

function MockMatchContent({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>('intro');
  const [half, setHalf] = useState<1 | 2>(1);
  const [qIndex, setQIndex] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [lastResult, setLastResult] = useState<{ correct: boolean; label: string } | null>(null);
  const [questionKey, setQuestionKey] = useState(0); // forces remount on new question

  const currentQuestions = HALVES[half - 1] ?? MOCK_HALF_1;
  const currentQuestion = currentQuestions[qIndex];

  // Auto-dismiss the result flash after 1.4s then advance
  const [advancing, setAdvancing] = useState(false);

  const advance = useCallback(() => {
    setAdvancing(false);
    const isLastQ = qIndex >= QUESTIONS_PER_HALF - 1;
    if (isLastQ) {
      if (half === 1) {
        setScreen('halftime');
      } else {
        setScreen('fulltime');
      }
    } else {
      setQIndex((q) => q + 1);
      setQuestionKey((k) => k + 1);
      setLastResult(null);
    }
  }, [qIndex, half]);

  const handleComplete = useCallback((isCorrect: boolean) => {
    const label = QUESTION_LABELS[qIndex] ?? '';
    setLastResult({ correct: isCorrect, label });
    if (isCorrect) setMyScore((s) => s + 1);
    if (opponentIsCorrect()) setOppScore((s) => s + 1);
    setAdvancing(true);
  }, [qIndex]);

  // After the result flash (1.8s), advance automatically
  useEffect(() => {
    if (!advancing) return;
    const id = setTimeout(advance, 1800);
    return () => clearTimeout(id);
  }, [advancing, advance]);

  // ── Screens ──────────────────────────────────────────────────────────────

  if (screen === 'intro') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#131F24] px-4 font-fun">
        <div className="text-center">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-[#1CB0F6]">Dev Mode</p>
          <h1 className="text-4xl font-black uppercase text-white">Mock Match</h1>
          <p className="mt-3 text-sm text-[#56707A]">
            Full ranked match sequence with all 4 question types.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-2 rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-5 py-4">
          <p className="text-xs font-black uppercase tracking-wide text-[#56707A]">Per half</p>
          {QUESTION_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-5 text-xs font-black text-[#56707A]">{i + 1}.</span>
              <span className="text-sm font-bold text-white">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setScreen('playing')}
            className="rounded-2xl border-b-4 border-[#46A302] bg-[#58CC02] px-10 py-3.5 font-black uppercase tracking-wide text-white transition-all active:translate-y-[2px] active:border-b-2 hover:bg-[#4DB800]"
          >
            Kick Off
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-6 py-3.5 font-black uppercase tracking-wide text-white transition-all active:translate-y-[2px] active:border-b-2 hover:bg-[#243B44]"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'halftime') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#131F24] px-4 font-fun">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-widest text-[#FF9600]">Half Time</p>
          <h1 className="mt-2 text-4xl font-black uppercase text-white">Break!</h1>
        </div>
        <div className="w-full max-w-xs rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-xs font-bold text-[#56707A]">You</p>
              <p className="text-4xl font-black text-white">{myScore}</p>
            </div>
            <p className="text-xl font-black text-[#56707A]">:</p>
            <div className="text-center">
              <p className="text-xs font-bold text-[#56707A]">Opponent</p>
              <p className="text-4xl font-black text-white">{oppScore}</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setHalf(2);
            setQIndex(0);
            setQuestionKey((k) => k + 1);
            setLastResult(null);
            setScreen('playing');
          }}
          className="rounded-2xl border-b-4 border-[#14627F] bg-[#1CB0F6] px-10 py-3.5 font-black uppercase tracking-wide text-white transition-all active:translate-y-[2px] active:border-b-2 hover:bg-[#1A9FE0]"
        >
          Start Half 2 →
        </button>
      </div>
    );
  }

  if (screen === 'fulltime') {
    const won = myScore > oppScore;
    const draw = myScore === oppScore;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#131F24] px-4 font-fun">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-widest text-[#56707A]">Full Time</p>
          <h1
            className={`mt-2 text-5xl font-black uppercase ${
              draw ? 'text-[#FF9600]' : won ? 'text-[#58CC02]' : 'text-[#FF4B4B]'
            }`}
          >
            {draw ? 'Draw!' : won ? 'Victory!' : 'Defeat'}
          </h1>
        </div>
        <div className="w-full max-w-xs rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-xs font-bold text-[#56707A]">You</p>
              <p className="text-5xl font-black text-white">{myScore}</p>
            </div>
            <p className="text-2xl font-black text-[#56707A]">:</p>
            <div className="text-center">
              <p className="text-xs font-bold text-[#56707A]">Opponent</p>
              <p className="text-5xl font-black text-white">{oppScore}</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-[#56707A]">
            correct answers out of {QUESTIONS_PER_HALF * 2}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setScreen('intro');
              setHalf(1);
              setQIndex(0);
              setMyScore(0);
              setOppScore(0);
              setQuestionKey((k) => k + 1);
              setLastResult(null);
            }}
            className="rounded-2xl border-b-4 border-[#46A302] bg-[#58CC02] px-8 py-3.5 font-black uppercase tracking-wide text-white transition-all active:translate-y-[2px] active:border-b-2"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-2xl border-b-4 border-[#0D1B21] bg-[#1B2F36] px-6 py-3.5 font-black uppercase tracking-wide text-white transition-all active:translate-y-[2px] active:border-b-2"
          >
            Exit
          </button>
        </div>
      </div>
    );
  }

  // ── Playing screen ────────────────────────────────────────────────────────

  if (!currentQuestion) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-[#131F24] font-fun">
      <ScoreBar half={half} qIndex={qIndex} myScore={myScore} oppScore={oppScore} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg space-y-3 px-4 py-4">
          {/* Question type badge */}
          <div className="flex items-center justify-between">
            <QuestionKindBadge kind={currentQuestion.kind} />
            <span className="text-xs font-bold text-[#56707A]">Half {half}</span>
          </div>

          {/* Question panel — key forces full remount on new question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={questionKey}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.22 }}
            >
              <MatchQuestionRouter
                question={currentQuestion}
                secondsTotal={COUNTDOWN_SECONDS}
                onComplete={handleComplete}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Result flash overlay */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              className={`flex items-center gap-4 rounded-3xl border-b-4 px-8 py-5 shadow-2xl ${
                lastResult.correct
                  ? 'border-[#46A302] bg-[#1B2F36]'
                  : 'border-[#CC3C3C] bg-[#1B2F36]'
              }`}
            >
              {lastResult.correct ? (
                <CheckCircle2 className="size-10 text-[#58CC02]" />
              ) : (
                <XCircle className="size-10 text-[#FF4B4B]" />
              )}
              <div>
                <p className={`text-xl font-black ${lastResult.correct ? 'text-[#58CC02]' : 'text-[#FF4B4B]'}`}>
                  {lastResult.correct ? 'Correct!' : 'Wrong'}
                </p>
                <p className="text-sm text-[#56707A]">{lastResult.label}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
