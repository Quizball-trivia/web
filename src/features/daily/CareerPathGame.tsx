"use client";

import { useCallback, useEffect, useState } from "react";

import { DailyAnswerInput } from "./components/DailyAnswerInput";
import type { CareerPathSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { fuzzyMatchesAnswer } from "@/lib/answerMatching";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { CareerChip } from "@/features/weekend-league/gauntlet/RoundViews";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyGameStage } from "./components/DailyGameStage";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { ResultSplash } from "./components/ResultSplash";
import { useResultSplash } from "./components/useResultSplash";
import { DailyChallengeCompleteModal } from "./components/DailyChallengeCompleteModal";

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

/** One resolved career, kept for the results review. */
export interface CareerPathReviewItem {
  id: string;
  clubs: string[];
  displayAnswer: string;
  correct: boolean;
  /** What the player typed ("" on a timeout). */
  given: string;
}

interface CareerPathGameProps {
  session: CareerPathSession;
  onBack: () => void;
  onComplete: (score: number, nextPath?: string) => void;
  /** Sample / training round: the completion modal shows no member prompts and runs no member queries. */
  practice?: boolean;
}

export function CareerPathGame({
  session,
  onBack,
  onComplete, practice = false, }: CareerPathGameProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(session.secondsPerQuestion);
  const [answer, setAnswer] = useState("");
  const [resolved, setResolved] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [finished, setFinished] = useState(false);
  const [review, setReview] = useState<CareerPathReviewItem[]>([]);
  const { splashProps, fire } = useResultSplash();
  const { t } = useLocale();

  const currentQuestion = session.questions[currentQuestionIndex];
  // English names for crest lookup (the generated API type lags the backend field;
  // regen is not possible in this repo, so widen locally).
  const clubMatchNames = (currentQuestion as { clubMatchNames?: string[] } | undefined)?.clubMatchNames;

  const advance = useCallback(() => {
    if (currentQuestionIndex >= session.questions.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
    setTimeLeft(session.secondsPerQuestion);
    setAnswer("");
    setResolved(false);
  }, [currentQuestionIndex, session.questions.length, session.secondsPerQuestion]);

  const submitAnswer = useCallback(() => {
    if (resolved || !currentQuestion) {
      return;
    }

    const isCorrect = fuzzyMatchesAnswer(answer, currentQuestion.acceptedAnswers);

    if (isCorrect) {
      setCorrectCount((previous) => previous + 1);
    }
    setReview((previous) => [
      ...previous,
      { id: currentQuestion.id, clubs: currentQuestion.clubs, displayAnswer: currentQuestion.displayAnswer, correct: isCorrect, given: answer.trim() },
    ]);

    // Submit button sits on the right → splash flies in from the right.
    fire(isCorrect ? "correct" : "wrong", "right");
    setResolved(true);
  }, [answer, currentQuestion, resolved, fire]);

  useEffect(() => {
    if (resolved || !currentQuestion) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => submitAnswer(), 0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentQuestion, resolved, submitAnswer]);

  // No auto-advance: the revealed player stays on screen until the player taps Next.

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white">
      {/* Header + gameplay as one centred composition (shared daily stage). */}
      <DailyGameStage
        header={
          <DailyChallengeHeader
            onQuit={() => setShowQuitDialog(true)}
            currentIndex={currentQuestionIndex}
            total={session.questionCount}
            timeLeft={timeLeft}
            className="px-0 pt-0"
          />
        }
      >
        <CareerPathBoard
          clubs={currentQuestion.clubs}
          clubMatchNames={clubMatchNames}
          answer={answer}
          onAnswerChange={setAnswer}
          onSubmit={submitAnswer}
          disabled={resolved}
          revealedAnswer={resolved ? currentQuestion.displayAnswer : null}
          score={correctCount}
        />
        {resolved && (
          <button
            type="button"
            autoFocus
            onClick={advance}
            className="font-poppins mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-brand-blue uppercase text-white outline-none transition-colors hover:bg-brand-blue/90 focus-visible:ring-2 focus-visible:ring-white/70"
            style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }}
          >
            {currentQuestionIndex >= session.questions.length - 1 ? t("dailyGames.viewResults") : t("careerPath.next")}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        )}
      </DailyGameStage>

      <QuitGameDialog
        open={showQuitDialog}
        onOpenChange={setShowQuitDialog}
        onQuit={onBack}
      />

      <ResultSplash {...splashProps} />

      <DailyChallengeCompleteModal
        practice={practice}
        open={finished}
        title={session.title}
        correct={correctCount}
        total={session.questionCount}
        details={review.length > 0 ? <CareerPathReview items={review} /> : undefined}
        onDone={(nextPath) => onComplete(correctCount, nextPath)}
      />
    </div>
  );
}

/** Results review: every career of the day with its clubs and the player, so a miss can be absorbed. */
export function CareerPathReview({ items }: { items: CareerPathReviewItem[] }) {
  const { t } = useLocale();
  return (
    <div>
      <p className="font-poppins text-xs font-semibold uppercase tracking-wide text-white/60">{t("careerPath.reviewTitle")}</p>
      <ol className="mt-2 max-h-[40vh] space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 rounded-[14px] bg-black/18 px-3 py-2.5">
            {item.correct
              ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-green-light" aria-label={t("dailyChallenge.correct")} />
              : <XCircle className="mt-0.5 size-4 shrink-0 text-brand-red-soft" aria-hidden />}
            <div className="min-w-0">
              <p className="font-poppins text-sm font-bold text-white">{item.displayAnswer}</p>
              <p className="font-poppins text-[11px] font-medium leading-snug text-white/60">{item.clubs.join(" → ")}</p>
              {!item.correct && (
                <p className="mt-0.5 font-poppins text-[11px] font-medium text-brand-red-soft/90">
                  {t("careerPath.youAnswered", { answer: item.given || t("careerPath.noAnswer") })}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export interface CareerPathBoardProps {
  clubs: string[];
  clubMatchNames?: string[];
  answer: string;
  onAnswerChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  /** Shown once the question is resolved. */
  revealedAnswer: string | null;
  score: number;
}

/** Club path, answer input and reveal, shared by the daily game and its Freecroco partner version. */
export function CareerPathBoard({
  clubs,
  clubMatchNames,
  answer,
  onAnswerChange,
  onSubmit,
  disabled,
  revealedAnswer,
  score,
}: CareerPathBoardProps) {
  const copy = getDailyChallengeCopy();
  return (
    <div className="w-full">
    {/* Club path chips — the question itself (no separate prompt card). */}
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {clubs.map((club, index) => (
        <div key={`${club}-${index}`} className="flex items-center gap-2.5">
          <CareerChip item={{ label: club, matchName: clubMatchNames?.[index] ?? club }} />
          {index < clubs.length - 1 && (
            <ArrowRight className="size-4 shrink-0 text-brand-yellow" />
          )}
        </div>
      ))}
    </div>

    <DailyAnswerInput
      value={answer}
      onChange={onAnswerChange}
      onSubmit={onSubmit}
      placeholder={copy.typePlayerName}
      submitLabel={copy.submit}
      disabled={disabled}
    />

    {/* Reveal the answer on a wrong/timeout result (correct uses the splash). */}
    {revealedAnswer !== null && (
      <p className="mt-3 text-center text-white/55" style={{ ...poppins, fontSize: 'clamp(12px, 1.4vw, 16px)' }}>
        {`${copy.answerPrefix}: ${revealedAnswer}`}
      </p>
    )}

    {/* Score */}
    <div className="mt-4 flex items-center justify-between text-sm" style={poppins}>
      <span className="text-white/55">{copy.score}</span>
      <span className="text-white">{score}</span>
    </div>
    </div>
  );
}
