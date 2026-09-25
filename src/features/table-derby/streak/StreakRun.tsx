'use client';

/** One streak run, laid out like Betsson's "Quiz" Figma screens: timer
 *  pill, counter and close in the header, 7px progress bar, optional image,
 *  question, four answer rows with correct/wrong states, big button. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock3, Flame, X } from 'lucide-react';
import { TD } from '../lib/copy';
import { TurnTimerBar } from '../components/chrome';
import { BsButton } from '../shell/ui';
import { buildStreakDeck, type StreakQuestion } from './deck';

export const STREAK_QUESTION_MS = 20_000;

type Outcome = { picked: number | null; timedOut: boolean } | null;

/** Event-time check (kept outside the component: reading the clock is not render work). */
function isPast(deadline: number): boolean {
  return Date.now() > deadline;
}

function Countdown({ endsAt, running }: { endsAt: number; running: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  return (
    <span
      className="inline-flex h-6 items-center gap-1 rounded-[12px] py-1 pl-[5px] pr-2 font-[Poppins] text-[12px] font-bold tabular-nums tracking-[0.01em] text-white"
      style={{ background: 'var(--bs-frame)' }}
    >
      <Clock3 size={14} strokeWidth={2} />
      00:{String(left).padStart(2, '0')}
    </span>
  );
}

function StatusDot({ state }: { state: 'idle' | 'correct' | 'wrong' }) {
  if (state === 'idle') {
    return <span className="size-6 shrink-0 rounded-full" style={{ border: '1px solid var(--bs-disable)' }} aria-hidden />;
  }
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-white"
      style={{ background: state === 'correct' ? 'var(--bs-green)' : 'var(--bs-red)' }}
      aria-hidden
    >
      {state === 'correct' ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
    </span>
  );
}

function AnswerRow({
  text,
  state,
  onPick,
  disabled,
  explanation,
}: {
  text: string;
  state: 'idle' | 'correct' | 'wrong';
  onPick: () => void;
  disabled: boolean;
  explanation?: string;
}) {
  const tint = state === 'correct' ? 'rgba(54,157,52,0.1)' : state === 'wrong' ? 'rgba(255,59,59,0.1)' : 'transparent';
  const border = state === 'correct' ? 'var(--bs-green)' : state === 'wrong' ? 'var(--bs-red)' : 'var(--bs-frame)';
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={state !== 'idle'}
      className="flex w-full flex-col rounded-[12px] py-2.5 pl-4 pr-2.5 text-left transition-colors enabled:hover:brightness-110"
      style={{ background: `linear-gradient(0deg, ${tint}, ${tint}), var(--bs-surface)`, border: `1px solid ${border}` }}
    >
      <span className="flex min-h-8 w-full items-center gap-2.5">
        <span className="bs-body-medium flex-1 text-white" style={{ opacity: 0.8, lineHeight: '18px' }}>
          {text}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center">
          <StatusDot state={state} />
        </span>
      </span>
      {explanation && (
        <span className="bs-text mt-2 pb-1 pr-8 text-[13px] leading-[18px] text-white/75">{explanation}</span>
      )}
    </button>
  );
}

export function StreakRun({ onFinish }: { onFinish: (score: number) => void }) {
  const deck = useMemo(() => buildStreakDeck(), []);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [endsAt, setEndsAt] = useState(() => Date.now() + STREAK_QUESTION_MS);
  const scoreRef = useRef(score);
  useEffect(() => {
    scoreRef.current = score;
  });
  // each question settles exactly once: by a pick before the deadline, or by the timeout
  const settled = useRef(false);

  const q: StreakQuestion = deck[idx];
  const answered = outcome !== null;
  const correct = answered && outcome.picked === q.answer;

  // per-question clock: running out counts as a miss
  useEffect(() => {
    if (answered) return;
    const t = setTimeout(() => {
      if (settled.current) return;
      settled.current = true;
      setOutcome({ picked: null, timedOut: true });
    }, Math.max(0, endsAt - Date.now()));
    return () => clearTimeout(t);
  }, [answered, endsAt]);

  const pick = (i: number) => {
    if (settled.current) return;
    settled.current = true;
    if (isPast(endsAt)) {
      setOutcome({ picked: null, timedOut: true });
      return;
    }
    setOutcome({ picked: i, timedOut: false });
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    // a miss ends the run; so does answering every question in the pack
    if (!correct || idx + 1 >= deck.length) {
      onFinish(scoreRef.current);
      return;
    }
    settled.current = false;
    setIdx((n) => n + 1);
    setOutcome(null);
    setEndsAt(Date.now() + STREAK_QUESTION_MS);
    window.scrollTo({ top: 0 });
  };

  const rowState = (i: number): 'idle' | 'correct' | 'wrong' => {
    if (!answered) return 'idle';
    if (i === q.answer) return 'correct';
    return outcome.picked === i ? 'wrong' : 'idle';
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4" style={{ background: 'var(--bs-page)' }}>
      {/* header — Figma: timer tag · counter · close */}
      <div className="sticky top-0 z-10 flex flex-col gap-3 pb-3 pt-4" style={{ background: 'var(--bs-page)' }}>
        <div className="relative flex h-6 items-center justify-between">
          <Countdown key={idx} endsAt={endsAt} running={!answered} />
          <span className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-white">
            <Flame size={15} color="var(--bs-primary)" strokeWidth={2.4} />
            <span className="bs-text text-[14px] font-black leading-[18px]">
              {TD.streakCounter} {score}
            </span>
          </span>
          <button type="button" onClick={() => onFinish(scoreRef.current)} aria-label={TD.streakExit} className="text-white">
            <X size={20} />
          </button>
        </div>
        <TurnTimerBar turnKey={`streak-${idx}`} ms={STREAK_QUESTION_MS} running={!answered} />
      </div>

      <div className="flex flex-1 flex-col gap-4 pb-28 pt-2">
        {q.image && (
          <figure className="m-0">
            <div className="overflow-hidden rounded-[12px]" style={{ aspectRatio: '351 / 251', background: '#d9d9d9' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- question image from the content bank */}
              <img src={q.image.url} alt="" className="size-full object-cover" />
            </div>
            {(q.image.author || q.image.license) && (
              <figcaption className="bs-text mt-1 truncate text-[10px] text-[var(--bs-text-3)]">
                {TD.streakPhotoCredit}: {[q.image.author, q.image.license].filter(Boolean).join(' · ')}
              </figcaption>
            )}
          </figure>
        )}
        <h2 className="bs-text text-[16px] font-bold leading-[21px] text-white">{q.prompt}</h2>
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => (
            <AnswerRow
              key={`${q.id}-${i}`}
              text={opt}
              state={rowState(i)}
              onPick={() => pick(i)}
              disabled={answered}
              explanation={answered && i === q.answer ? q.explanation : undefined}
            />
          ))}
        </div>
        {outcome?.timedOut && (
          <p className="bs-text text-center text-[13px]" style={{ color: 'var(--bs-red)' }}>
            {TD.streakTimeUp}
          </p>
        )}
      </div>

      {/* Figma "Big Buttons": 343×48, radius 12, disabled until answered */}
      <div className="fixed inset-x-0 bottom-0 z-20" style={{ background: 'var(--bs-page)' }}>
        <div className="mx-auto w-full max-w-md px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
          <BsButton onClick={next} disabled={!answered} className="rounded-[12px]">
            {answered && (!correct || idx + 1 >= deck.length) ? TD.streakSeeResult : TD.streakNext}
          </BsButton>
        </div>
      </div>
    </div>
  );
}
