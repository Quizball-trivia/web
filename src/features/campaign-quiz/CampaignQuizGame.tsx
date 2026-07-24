'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, RotateCcw, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '@/stores/auth.store';
import { answerCampaignQuizQuestion } from './campaignQuiz.api';
import {
  trackCampaignQuizComplete,
  trackCampaignQuizStart,
  trackCampaignSignupClick,
} from './campaignQuiz.analytics';
import type { CampaignQuizQuestion } from './campaignQuiz.types';

type AnswerResult = {
  selectedOptionId: string;
  correctOptionId: string;
  correct: boolean;
  explanation: string | null;
};

interface CampaignQuizGameProps {
  slug: string;
  questions: CampaignQuizQuestion[];
  scoreTemplate?: string;
}

function answerClasses(input: {
  optionId: string;
  selectedOptionId?: string;
  correctOptionId?: string;
}) {
  const isSelected = input.optionId === input.selectedOptionId;
  const isCorrect = input.optionId === input.correctOptionId;

  if (isCorrect) {
    return 'border-transparent bg-brand-green text-white shadow-[0_1.76px_6.334px_1.32px_rgba(56,182,14,0.25)]';
  }
  if (isSelected && input.correctOptionId === undefined) {
    return 'border-brand-yellow bg-transparent text-white shadow-[0_0_6.334px_1.32px_rgba(255,229,0,0.25)]';
  }
  if (isSelected) {
    return 'border-brand-red bg-transparent text-brand-red-light shadow-[0_1.76px_6.334px_1.32px_rgba(251,49,1,0.25)]';
  }
  return 'border-brand-yellow bg-transparent text-white shadow-[0_0_6.334px_1.32px_rgba(255,229,0,0.25)] hover:bg-white/[0.025]';
}

export function CampaignQuizGame({
  slug,
  questions,
  scoreTemplate = 'You scored {score}/{total} — sign up free to save your score and defend it in a ranked duel.',
}: CampaignQuizGameProps) {
  const authStatus = useAuthStore((state) => state.status);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerResult>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const startedRef = useRef(false);

  const currentQuestion = questions[currentIndex];
  const currentResult = currentQuestion ? answers[currentQuestion.id] : undefined;
  const score = useMemo(
    () => Object.values(answers).filter((answer) => answer.correct).length,
    [answers],
  );

  const submitAnswer = async (question: CampaignQuizQuestion, optionId: string) => {
    if (submitting || answers[question.id]) return;
    if (!startedRef.current) {
      startedRef.current = true;
      trackCampaignQuizStart(slug, questions.length);
    }

    setSelectedOptionId(optionId);
    setSubmitting(true);
    setError(null);

    try {
      const result = await answerCampaignQuizQuestion({
        slug,
        questionId: question.id,
        selectedOptionId: optionId,
      });
      setAnswers((current) => ({
        ...current,
        [question.id]: {
          selectedOptionId: optionId,
          correctOptionId: result.correct_option_id,
          correct: result.correct,
          explanation: result.explanation,
        },
      }));
    } catch {
      setSelectedOptionId(null);
      setError('We could not check that answer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const goNext = () => {
    if (!currentResult) return;
    if (currentIndex === questions.length - 1) {
      setComplete(true);
      trackCampaignQuizComplete(slug, score, questions.length);
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedOptionId(null);
    setError(null);
  };

  const restart = () => {
    setCurrentIndex(0);
    setAnswers({});
    setSelectedOptionId(null);
    setError(null);
    setComplete(false);
    startedRef.current = false;
  };

  if (complete) {
    const isAuthenticated = authStatus === 'authenticated';
    const ctaHref = isAuthenticated
      ? '/play'
      : `/en?signup=1&source=${slug}-quiz`;
    const guestScoreCopy = scoreTemplate
      .replace('{score}', String(score))
      .replace('{total}', String(questions.length));

    return (
      <div
        className="overflow-hidden rounded-xl bg-surface-card-deeper font-poppins"
        data-testid="campaign-quiz-score"
      >
        <div className="px-5 py-6 text-center sm:px-8">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-brand-yellow text-brand-yellow">
            <Sparkles className="size-7" aria-hidden />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-white/70">
            Full time
          </p>
          <h2 className="mt-1 text-3xl font-black text-white sm:text-4xl">
            You scored <span className="text-brand-yellow">{score}/{questions.length}</span>
          </h2>
        </div>

        <div className="px-5 py-7 text-center sm:px-10 sm:py-9">
          <p className="mx-auto max-w-xl text-base font-semibold leading-relaxed text-white/75 sm:text-lg">
            {isAuthenticated
              ? 'Ready for a tougher test? Take your football knowledge into a ranked duel.'
              : guestScoreCopy}
          </p>
          <Link
            href={ctaHref}
            onClick={() => {
              if (!isAuthenticated) trackCampaignSignupClick(slug, 'score');
            }}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow px-6 text-base font-bold text-black transition-colors hover:bg-brand-yellow/90 sm:w-auto"
          >
            {isAuthenticated ? 'Play ranked' : 'Sign up free'}
            <ArrowRight className="size-5" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={restart}
            className="mx-auto mt-5 flex items-center gap-2 text-sm font-bold text-white/55 transition-colors hover:text-white"
          >
            <RotateCcw className="size-4" aria-hidden />
            Play the quiz again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full font-poppins"
      data-testid="campaign-quiz-game"
    >
      <noscript>
        <style>{`.campaign-question-panel[hidden]{display:block!important;margin-top:1rem}.campaign-question-panel button{pointer-events:none}`}</style>
      </noscript>

      <div className="flex items-stretch gap-2.5">
        <div className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl bg-brand-blue px-4 font-semibold text-white sm:h-14 sm:text-lg">
          Question {currentIndex + 1} of {questions.length}
        </div>
        <div className="flex h-12 min-w-28 shrink-0 items-center justify-center rounded-2xl bg-brand-blue px-4 font-semibold text-white sm:h-14 sm:text-lg">
          {score} correct
        </div>
      </div>

      <div>
        {questions.map((question, questionIndex) => {
          const result = answers[question.id];
          const isCurrent = questionIndex === currentIndex;
          const pendingSelection = isCurrent ? selectedOptionId : null;
          return (
            <section
              key={question.id}
              hidden={!isCurrent}
              className="campaign-question-panel"
              aria-labelledby={`campaign-question-${question.id}`}
            >
              <div className="mt-3 rounded-3xl bg-surface-page px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex min-h-20 flex-col justify-center sm:min-h-24">
                  <h3
                    id={`campaign-question-${question.id}`}
                    className="text-balance text-xl font-bold leading-snug text-white sm:text-2xl"
                  >
                    {question.prompt}
                  </h3>
                  {question.details.length > 0 ? (
                    <ul className="mt-4 grid gap-2 text-sm font-medium leading-relaxed text-white/65 sm:text-base">
                      {question.details.map((detail) => (
                        <li key={detail} className="flex gap-2">
                          <span className="text-brand-cyan" aria-hidden>•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {question.image_url ? (
                  <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-white/5">
                    <Image
                      src={question.image_url}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 768px, 100vw"
                      className="object-contain"
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-2.5 grid grid-cols-2 items-stretch gap-2.5">
                {question.options.map((option) => {
                  const effectiveSelected = result?.selectedOptionId ?? pendingSelection ?? undefined;
                  const stateClasses = result
                    ? answerClasses({
                        optionId: option.id,
                        selectedOptionId: result.selectedOptionId,
                        correctOptionId: result.correctOptionId,
                      })
                    : answerClasses({
                        optionId: option.id,
                        selectedOptionId: effectiveSelected,
                      });

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={submitting || Boolean(result)}
                      aria-pressed={effectiveSelected === option.id}
                      onClick={() => void submitAnswer(question, option.id)}
                      className={`relative flex min-h-[68px] items-center justify-center overflow-hidden rounded-2xl border-2 px-4 py-3 text-center font-semibold uppercase transition-colors disabled:cursor-default sm:min-h-[86px] sm:px-5 ${stateClasses}`}
                    >
                      <span className="leading-[1.15] [overflow-wrap:anywhere]">{option.text}</span>
                      {result && option.id === result.correctOptionId ? (
                        <Check className="ml-auto size-5 shrink-0" aria-label="Correct answer" />
                      ) : null}
                      {result && option.id === result.selectedOptionId && !result.correct ? (
                        <X className="ml-auto size-5 shrink-0" aria-label="Your answer was incorrect" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {submitting ? (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-white/55">
                  <span className="size-2 animate-pulse rounded-full bg-brand-yellow" />
                  Checking your answer…
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-2xl border border-brand-red/40 bg-brand-red/10 px-4 py-3 text-sm font-semibold text-brand-red-light">
                  {error}
                </div>
              ) : null}

              {result ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                className={`mt-4 rounded-lg border px-4 py-4 ${
                    result.correct
                      ? 'border-brand-green/60'
                      : 'border-brand-red/60'
                  }`}
                >
                  <p className={`font-black ${result.correct ? 'text-brand-green-light' : 'text-brand-red-light'}`}>
                    {result.correct ? 'Correct — well played!' : 'Not quite — the correct answer is highlighted.'}
                  </p>
                  {result.explanation ? (
                    <p className="mt-1 text-sm font-medium leading-relaxed text-white/65">
                      {result.explanation}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={goNext}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 font-bold text-white transition-colors hover:bg-brand-blue/90 sm:w-auto"
                  >
                    {currentIndex === questions.length - 1 ? 'See my score' : 'Next question'}
                    <ArrowRight className="size-4" aria-hidden />
                  </button>
                </motion.div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
