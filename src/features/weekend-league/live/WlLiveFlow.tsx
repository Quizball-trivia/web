'use client';

// Weekend League LIVE flow — the real synchronized game, driven entirely by
// the wl:* socket stream (see useWlLive). Replaces the mock GauntletFlow for
// in-app play; the prototype stays on /dev/wl.

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Eye, LogOut } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';
import type {
  WlBoardRow,
  WlDispatchEventPayload,
  WlI18nText,
  WlRevealEventPayload,
} from '@/lib/realtime/socket.types';
import type { Locale } from '@/lib/i18n/messages';
import { poppins } from '../constants';
import { LiveBadge } from '../components/LiveBadge';
// ONE visual source with /dev/wl-gauntlet: the live flow renders the same
// designed chrome the prototype uses — change it there, it changes here.
import { AnswerBtn, QuestionCard, type AnswerState } from '../gauntlet/RoundChrome';
import { ResultSplash } from '@/features/daily/components/ResultSplash';
import { useResultSplash } from '@/features/daily/components/useResultSplash';
import { useWlLive, type WlLiveScreen } from './useWlLive';

const WHO_AM_I_CLUES = 5;
const WHO_AM_I_POINTS = [300, 240, 180, 120, 60];

function pick(text: unknown, locale: Locale): string {
  if (typeof text === 'string') return text;
  if (text && typeof text === 'object') {
    const t = text as WlI18nText;
    return t[locale] ?? t.en ?? Object.values(t).find((v) => typeof v === 'string') ?? '';
  }
  return '';
}

/** Seconds left on a server-clock deadline, ticking 4×/s. */
function useServerCountdown(deadlineAt: number | null, serverNow: () => number): number {
  const [left, setLeft] = useState(() =>
    deadlineAt == null ? 0 : Math.max(0, deadlineAt - serverNow()),
  );
  useEffect(() => {
    if (deadlineAt == null) return;
    const tick = () => setLeft(Math.max(0, deadlineAt - serverNow()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadlineAt, serverNow]);
  return Math.ceil(left / 1000);
}

export function WlLiveFlow({
  tournamentId,
  role,
  status,
  checkedIn,
  checkinPending,
  onCheckin,
  onExit,
}: {
  tournamentId: string;
  role: 'player' | 'spectator';
  /** Backend tournament status (drives the pre-game check-in screen). */
  status: string | null;
  /** Role-appropriate check-in state (Saturday or final). */
  checkedIn: boolean;
  checkinPending: boolean;
  onCheckin: () => void;
  onExit: () => void;
}) {
  const { t, locale } = useLocale();
  const live = useWlLive(tournamentId, role);
  const selfUserId = useAuthStore((s) => s.user?.id ?? null);

  const yourRow = useMemo(
    () => live.board.find((row) => row.user_id === selfUserId) ?? null,
    [live.board, selfUserId],
  );

  if (live.denied === 'not_entered') {
    return (
      <Shell onExit={onExit}>
        <div className="font-poppins text-lg font-black uppercase text-white">
          {t('weekendLeague.gNotEntered')}
        </div>
      </Shell>
    );
  }

  const inCheckinWindow = status === 'checkin' || status === 'final_checkin';
  if (role === 'player' && inCheckinWindow && live.screen.kind === 'waiting') {
    return (
      <Shell onExit={onExit}>
        <div className="mb-2 flex justify-center"><LiveBadge /></div>
        <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>
          {checkedIn ? t('weekendLeague.gCheckedIn') : t('weekendLeague.gCheckinTitle')}
        </div>
        <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
          {checkedIn ? t('weekendLeague.gWaitingKickoff') : t('weekendLeague.gCheckinBody')}
        </p>
        {checkedIn ? (
          <div className="mx-auto mt-5 flex size-14 items-center justify-center rounded-full bg-brand-green text-white">
            <Check className="size-8" strokeWidth={3} />
          </div>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={checkinPending}
            onClick={onCheckin}
            className="mx-auto mt-5 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90 disabled:opacity-60"
          >
            {t('weekendLeague.gCheckin')}
          </motion.button>
        )}
      </Shell>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 font-fun">
      <TopBar
        role={role}
        score={live.score}
        rank={yourRow?.rank ?? null}
        gameIndex={live.gameIndex}
        onExit={onExit}
        connected={live.connected && live.subscribed}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screenKey(live.screen)}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <ScreenBody
            screen={live.screen}
            role={role}
            locale={locale}
            serverNow={live.serverNow}
            submitAnswer={live.submitAnswer}
            retryNonce={live.retryNonce}
            board={live.board}
            selfUserId={selfUserId}
            onExit={onExit}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function screenKey(screen: WlLiveScreen): string {
  switch (screen.kind) {
    case 'question': return `q-${screen.attempt.attempt_id}`;
    case 'reveal': return `r-${screen.reveal.attempt_id}`;
    case 'game_result': return `g-${screen.result.game_index}`;
    case 'final_result': return 'final';
    default: return screen.kind;
  }
}

function Shell({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  const { t } = useLocale();
  const SHELL_EXIT_LABEL = t('weekendLeague.gQuit');
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-5 text-center font-fun">
      <div className="w-full rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-6">
        {children}
        <button
          type="button"
          onClick={onExit}
          className="mx-auto mt-6 flex items-center gap-1.5 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
        >
          <LogOut className="size-4" /> {SHELL_EXIT_LABEL}
        </button>
      </div>
    </div>
  );
}

function TopBar({
  role, score, rank, gameIndex, onExit, connected,
}: {
  role: 'player' | 'spectator';
  score: number;
  rank: number | null;
  gameIndex: number;
  onExit: () => void;
  connected: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="mb-4 flex items-center justify-between font-poppins text-[12px] font-bold uppercase tracking-wide text-white/60">
      <button type="button" onClick={onExit} className="hover:text-white">← {t('weekendLeague.gQuit')}</button>
      <span className="flex items-center gap-2">
        {role === 'spectator' ? (
          <span className="flex items-center gap-1.5 text-brand-cyan"><Eye className="size-3.5" /> {t('weekendLeague.gSpectator')}</span>
        ) : (
          <>
            <span>{t('weekendLeague.gGameN', { n: gameIndex + 1 })}</span>
            <span className="tabular-nums text-brand-yellow">{score} {t('weekendLeague.gPts')}</span>
            {rank != null && <span className="tabular-nums text-white">#{rank}</span>}
          </>
        )}
        <span className={`size-2 rounded-full ${connected ? 'bg-brand-green' : 'bg-brand-red-soft animate-pulse'}`} />
      </span>
    </div>
  );
}

function ScreenBody({
  screen, role, locale, serverNow, submitAnswer, retryNonce, board, selfUserId, onExit,
}: {
  screen: WlLiveScreen;
  role: 'player' | 'spectator';
  locale: Locale;
  serverNow: () => number;
  submitAnswer: (answer: unknown) => void;
  retryNonce: number;
  board: WlBoardRow[];
  selfUserId: string | null;
  onExit: () => void;
}) {
  const { t } = useLocale();

  switch (screen.kind) {
    case 'waiting':
      return (
        <div className="rounded-[24px] bg-brand-cyan/[0.08] p-8 text-center">
          <div className="mb-3 flex justify-center"><LiveBadge /></div>
          <div className="font-poppins text-xl font-black uppercase text-white" style={poppins}>
            {t('weekendLeague.gWaitingNext')}
          </div>
          <BoardStrip board={board} selfUserId={selfUserId} />
        </div>
      );

    case 'question':
      return (
        <QuestionScreen
          attempt={screen.attempt}
          answered={screen.answer}
          locale={locale}
          serverNow={serverNow}
          submitAnswer={submitAnswer}
          retryNonce={retryNonce}
          spectator={role === 'spectator'}
        />
      );

    case 'reveal':
      return (
        <RevealScreen
          reveal={screen.reveal}
          answer={screen.answer}
          locale={locale}
          board={board}
          selfUserId={selfUserId}
          spectator={role === 'spectator'}
        />
      );

    case 'game_result': {
      const { result, eliminated } = screen;
      return (
        <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-6 text-center">
          <div
            className={`font-poppins text-3xl font-black uppercase ${eliminated ? 'text-brand-red-soft' : 'text-brand-green-light'}`}
            style={poppins}
          >
            {role === 'spectator'
              ? t('weekendLeague.gGameComplete')
              : eliminated ? t('weekendLeague.gEliminatedTitle') : t('weekendLeague.gThroughTitle')}
          </div>
          {result.advanced != null && (
            <p className="mt-2 font-poppins text-[13px] font-semibold text-white/60">
              {t('weekendLeague.gAdvanceCount', { n: result.advanced })}
            </p>
          )}
          <BoardStrip board={board} selfUserId={selfUserId} rows={8} />
          {eliminated && (
            <button
              type="button"
              onClick={onExit}
              className="mx-auto mt-5 flex h-11 items-center justify-center rounded-xl bg-white/10 px-6 font-poppins text-sm font-black uppercase text-white hover:bg-white/15"
            >
              {t('weekendLeague.gContinue')}
            </button>
          )}
        </div>
      );
    }

    case 'final_result': {
      const { champion } = screen;
      return (
        <div className="rounded-[24px] border-2 border-brand-gold/40 bg-brand-gold/10 p-6 text-center">
          <div className="text-4xl">🏆</div>
          <div className="mt-2 font-poppins text-3xl font-black uppercase text-brand-gold" style={poppins}>
            {champion ? t('weekendLeague.gChampionTitle') : t('weekendLeague.gFinalDoneTitle')}
          </div>
          <BoardStrip board={board} selfUserId={selfUserId} rows={10} />
          <button
            type="button"
            onClick={onExit}
            className="mx-auto mt-5 flex h-11 items-center justify-center rounded-xl bg-white/10 px-6 font-poppins text-sm font-black uppercase text-white hover:bg-white/15"
          >
            {t('weekendLeague.gContinue')}
          </button>
        </div>
      );
    }

    case 'cancelled':
      return (
        <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-6 text-center">
          <div className="font-poppins text-xl font-black uppercase text-white">{t('weekendLeague.gCancelledTitle')}</div>
          <p className="mt-2 font-poppins text-[13px] font-semibold text-white/60">{t('weekendLeague.gCancelledBody')}</p>
        </div>
      );
  }
}

// ── Question rendering per kind ─────────────────────────────────────────────

function QuestionScreen({
  attempt, answered, locale, serverNow, submitAnswer, retryNonce, spectator,
}: {
  attempt: WlDispatchEventPayload;
  answered: { accepted: boolean } | null;
  locale: Locale;
  serverNow: () => number;
  submitAnswer: (answer: unknown) => void;
  retryNonce: number;
  spectator: boolean;
}) {
  const { t } = useLocale();
  const secondsLeft = useServerCountdown(attempt.deadlineAt, serverNow);
  const leadLeft = useServerCountdown(attempt.playableAt, serverNow);
  const ready = leadLeft <= 0;
  const locked = spectator || answered != null || secondsLeft <= 0 || !ready;
  const q = attempt.question;

  // Same verdict splash the prototype fires — one shared visual language.
  const { splashProps, fire } = useResultSplash();
  const [splashedFor, setSplashedFor] = useState<string | null>(null);
  const verdict = answered != null && 'correct' in answered
    ? (answered as { accepted: boolean; correct?: boolean })
    : null;
  if (verdict?.accepted && typeof verdict.correct === 'boolean' && splashedFor !== attempt.attempt_id) {
    setSplashedFor(attempt.attempt_id);
    fire(verdict.correct ? 'correct' : 'wrong', 'left');
  }

  return (
    <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-5">
      <div className="mb-4 flex items-center justify-between font-poppins text-[12px] font-bold uppercase tracking-wide text-white/50">
        <span>
          {t('weekendLeague.gRoundOf', { g: attempt.game_index + 1, r: attempt.round_index + 1 })}
        </span>
        <span
          className={`tabular-nums text-lg font-black ${
            !ready ? 'text-white/50' : secondsLeft <= 3 ? 'text-brand-red-soft' : 'text-brand-yellow'
          }`}
          style={poppins}
        >
          {!ready ? '…' : `${secondsLeft}s`}
        </span>
      </div>

      {attempt.kind === 'true_false' && (
        <TrueFalseQuestion prompt={pick(q['prompt'], locale)} locked={locked} onAnswer={submitAnswer} feedback={answered} evaluation={attempt.evaluation} retryNonce={retryNonce} />
      )}
      {attempt.kind === 'mcq' && (
        <McqQuestion q={q} locale={locale} locked={locked} onAnswer={submitAnswer} feedback={answered} evaluation={attempt.evaluation} retryNonce={retryNonce} />
      )}
      {attempt.kind === 'higher_lower' && (
        <HigherLowerQuestion q={q} locale={locale} locked={locked} onAnswer={submitAnswer} feedback={answered} evaluation={attempt.evaluation} retryNonce={retryNonce} />
      )}
      {attempt.kind === 'career_path' && (
        <TypedQuestion
          heading={t('weekendLeague.gCareerPrompt')}
          lines={(Array.isArray(q['clubs']) ? (q['clubs'] as unknown[]) : []).map((c) => pick(c, locale))}
          locked={locked}
          onSubmit={(guess) => submitAnswer(guess)}
          feedback={answered}
          evaluation={attempt.evaluation}
          locale={locale}
        />
      )}
      {attempt.kind === 'who_am_i' && (
        <WhoAmIQuestion attempt={attempt} locale={locale} serverNow={serverNow} locked={locked} onSubmit={(guess) => submitAnswer({ guess })} feedback={answered} />
      )}

      {answered != null && (
        <AnswerFeedback ack={answered as never} />
      )}
      <ResultSplash {...splashProps} />
    </div>
  );
}

function AnswerFeedback({ ack }: { ack: { accepted: boolean; correct?: boolean; points?: number } }) {
  const { t } = useLocale();
  if (!ack.accepted) {
    return (
      <div className="mt-4 text-center font-poppins text-[13px] font-bold uppercase text-white/50">
        {t('weekendLeague.gLocked')}
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mt-4 text-center font-poppins text-xl font-black uppercase ${ack.correct ? 'text-brand-green-light' : 'text-brand-red-soft'}`}
      style={poppins}
    >
      {ack.correct ? t('weekendLeague.gCorrect') : t('weekendLeague.gWrong')}
      {ack.correct && <span className="ml-2 text-brand-yellow">{t('weekendLeague.gPlusPoints', { n: ack.points ?? 0 })}</span>}
    </motion.div>
  );
}


function useChoice(locked: boolean, onAnswer: (a: unknown) => void, retryNonce: number) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [seenNonce, setSeenNonce] = useState(retryNonce);
  // A rejected (non-terminal) ack bumps the nonce — clear the pick so the
  // player can answer again inside the window (render-time adjustment, no
  // effect round-trip).
  if (retryNonce !== seenNonce) {
    setSeenNonce(retryNonce);
    setChosen(null);
  }
  const choose = (id: string) => {
    if (locked || chosen != null) return;
    setChosen(id);
    onAnswer(id);
  };
  return { chosen, choose };
}

function stateFor(
  id: string,
  chosen: string | null,
  correctId: string | null,
  revealed: boolean,
): AnswerState {
  if (!revealed || chosen == null) return chosen == null ? 'idle' : id === chosen ? 'faded' : 'idle';
  if (correctId != null && id === correctId) return 'correct';
  if (id === chosen) return 'wrong';
  return 'faded';
}

function TrueFalseQuestion({
  prompt, locked, onAnswer, feedback, evaluation, retryNonce,
}: {
  prompt: string;
  locked: boolean;
  onAnswer: (a: unknown) => void;
  feedback: { accepted: boolean } | null;
  evaluation: Record<string, unknown>;
  retryNonce: number;
}) {
  const { t } = useLocale();
  const { chosen, choose } = useChoice(locked, onAnswer, retryNonce);
  const correctId = typeof evaluation['correct_id'] === 'string' ? evaluation['correct_id'] : null;
  const revealed = feedback != null;
  return (
    <div>
      <QuestionCard>{prompt}</QuestionCard>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {(['true', 'false'] as const).map((id) => (
          <AnswerBtn
            key={id}
            tall
            label={t(id === 'true' ? 'weekendLeague.gTrue' : 'weekendLeague.gFalse')}
            state={stateFor(id, chosen, correctId, revealed)}
            disabled={locked && chosen == null}
            onClick={() => choose(id)}
          />
        ))}
      </div>
    </div>
  );
}

function McqQuestion({
  q, locale, locked, onAnswer, feedback, evaluation, retryNonce,
}: {
  q: Record<string, unknown>;
  locale: Locale;
  locked: boolean;
  onAnswer: (a: unknown) => void;
  feedback: { accepted: boolean } | null;
  evaluation: Record<string, unknown>;
  retryNonce: number;
}) {
  const { chosen, choose } = useChoice(locked, onAnswer, retryNonce);
  const correctId = typeof evaluation['correct_id'] === 'string' ? evaluation['correct_id'] : null;
  const revealed = feedback != null;
  const options = Array.isArray(q['options']) ? (q['options'] as Array<Record<string, unknown>>) : [];
  const image = q['image'] as { url?: string } | null | undefined;
  return (
    <div>
      <QuestionCard>{pick(q['prompt'], locale)}</QuestionCard>
      {image?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt=""
          className="mx-auto mt-4 max-h-56 w-auto max-w-full rounded-xl object-contain"
        />
      )}
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {options.map((o, i) => {
          const id = String(o['id']);
          return (
            <AnswerBtn
              key={id}
              label={pick(o['text'], locale)}
              prefix={<span className="font-poppins text-[11px] font-black text-white/40">{OPTION_LETTERS[i] ?? ''}</span>}
              state={stateFor(id, chosen, correctId, revealed)}
              disabled={locked && chosen == null}
              onClick={() => choose(id)}
            />
          );
        })}
      </div>
    </div>
  );
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function HigherLowerQuestion({
  q, locale, locked, onAnswer, feedback, evaluation, retryNonce,
}: {
  q: Record<string, unknown>;
  locale: Locale;
  locked: boolean;
  onAnswer: (a: unknown) => void;
  feedback: { accepted: boolean } | null;
  evaluation: Record<string, unknown>;
  retryNonce: number;
}) {
  const { t } = useLocale();
  const { chosen, choose } = useChoice(locked, onAnswer, retryNonce);
  const revealed = feedback != null;
  const left = Number(evaluation['left_value']);
  const right = Number(evaluation['right_value']);
  const correctSide = Number.isFinite(left) && Number.isFinite(right) ? (left > right ? 'left' : 'right') : null;
  return (
    <div>
      <div className="text-center font-poppins text-[12px] font-bold uppercase tracking-wide text-brand-cyan">
        {pick(q['stat_label'], locale)}
      </div>
      <div className="mt-2">
        <QuestionCard>{t('weekendLeague.gHigherLowerPrompt', { name: pick(q['left_name'], locale) })}</QuestionCard>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {(['left', 'right'] as const).map((side) => (
          <AnswerBtn
            key={side}
            tall
            label={
              <span>
                {pick(q[side === 'left' ? 'left_name' : 'right_name'], locale)}
                {revealed && Number.isFinite(side === 'left' ? left : right) && (
                  <span className="mt-1 block font-poppins text-[13px] font-bold tabular-nums opacity-70">
                    {side === 'left' ? left : right}
                  </span>
                )}
              </span>
            }
            state={stateFor(side, chosen, correctSide, revealed)}
            disabled={locked && chosen == null}
            onClick={() => choose(side)}
          />
        ))}
      </div>
    </div>
  );
}

function TypedQuestion({
  heading, lines, locked, onSubmit, feedback, evaluation, locale,
}: {
  heading: string;
  lines: string[];
  locked: boolean;
  onSubmit: (guess: string) => void;
  feedback: { accepted: boolean; correct?: boolean } | null;
  evaluation: Record<string, unknown>;
  locale: Locale;
}) {
  const { t } = useLocale();
  const [guess, setGuess] = useState('');
  const revealedAnswer = feedback != null && feedback.accepted && feedback.correct === false
    ? pick(evaluation['display_answer'], locale)
    : null;
  return (
    <div>
      {heading !== '' && (
        <div className="text-center font-poppins text-[13px] font-bold uppercase tracking-wide text-brand-cyan">{heading}</div>
      )}
      {lines.length > 0 && (
        <div className="mt-3">
          <QuestionCard>
            <div className="space-y-1.5 text-center">
              {lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </QuestionCard>
        </div>
      )}
      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (locked || guess.trim() === '') return;
          onSubmit(guess.trim());
        }}
      >
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={locked}
          placeholder={t('weekendLeague.gTypeAnswer')}
          className="h-14 flex-1 rounded-[16px] border-2 border-brand-yellow/70 bg-transparent px-4 font-poppins text-[16px] font-bold uppercase text-white shadow-[0_0_6px_1px_rgba(255,229,0,0.25)] outline-none placeholder:normal-case placeholder:text-white/30 focus:border-brand-yellow"
        />
        <button
          type="submit"
          disabled={locked || guess.trim() === ''}
          className="h-14 rounded-[16px] bg-brand-green px-6 font-poppins text-sm font-black uppercase text-white shadow-[0_1.76px_6.334px_1.32px_rgba(56,182,14,0.25)] transition-opacity disabled:opacity-40"
        >
          {t('weekendLeague.gSubmit')}
        </button>
      </form>
      {revealedAnswer && (
        <div className="mt-3 text-center font-poppins text-[13px] font-semibold text-white/70">
          {t('weekendLeague.gCorrectAnswer')} <span className="text-brand-green-light">{revealedAnswer}</span>
        </div>
      )}
    </div>
  );
}

function WhoAmIQuestion({
  attempt, locale, serverNow, locked, onSubmit, feedback,
}: {
  attempt: WlDispatchEventPayload;
  locale: Locale;
  serverNow: () => number;
  locked: boolean;
  onSubmit: (guess: string) => void;
  feedback: { accepted: boolean; correct?: boolean } | null;
}) {
  const { t } = useLocale();
  const clues = Array.isArray(attempt.question['clues'])
    ? (attempt.question['clues'] as Array<Record<string, unknown>>)
    : [];
  const clueWindow = Math.max(1, (attempt.deadlineAt - attempt.playableAt) / WHO_AM_I_CLUES);
  // Ticks with the countdown renders; clue index derives from the same clock
  // the server uses to score, so the shown ladder matches the earned points.
  const secondsLeft = useServerCountdown(attempt.deadlineAt, serverNow);
  void secondsLeft;
  const clueIndex = Math.min(
    WHO_AM_I_CLUES - 1,
    Math.max(0, Math.floor((serverNow() - attempt.playableAt) / clueWindow)),
  );
  return (
    <div>
      <div className="flex items-center justify-between font-poppins text-[12px] font-bold uppercase tracking-wide">
        <span className="text-brand-cyan">{t('weekendLeague.gWhoAmI')}</span>
        <span className="tabular-nums text-brand-yellow">{WHO_AM_I_POINTS[clueIndex]} {t('weekendLeague.gPts')}</span>
      </div>
      <div className="mt-3 space-y-2">
        {clues.slice(0, clueIndex + 1).map((clue, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left font-poppins text-[14px] font-semibold text-white"
          >
            {pick((clue as { content?: unknown })['content'] ?? clue, locale)}
          </motion.div>
        ))}
      </div>
      <TypedQuestion
        heading=""
        lines={[]}
        locked={locked}
        onSubmit={onSubmit}
        feedback={feedback}
        evaluation={attempt.evaluation}
        locale={locale}
      />
    </div>
  );
}

// ── Reveal + standings ──────────────────────────────────────────────────────

function RevealScreen({
  reveal, answer, locale, board, selfUserId, spectator,
}: {
  reveal: WlRevealEventPayload;
  answer: { accepted: boolean; correct?: boolean; points?: number } | null;
  locale: Locale;
  board: WlBoardRow[];
  selfUserId: string | null;
  spectator: boolean;
}) {
  const { t } = useLocale();
  const evaluation = reveal.evaluation ?? {};
  const answerText =
    pick(evaluation['display_answer'], locale)
    || (typeof evaluation['correct_id'] === 'string' ? String(evaluation['correct_id']) : '');
  // Spectators (and anyone without an own accepted answer) get a neutral
  // reveal — a personal "Wrong" verdict only exists for a submitted answer.
  const verdict: 'correct' | 'wrong' | 'neutral' =
    spectator || answer == null || !answer.accepted
      ? 'neutral'
      : answer.correct === true ? 'correct' : 'wrong';
  return (
    <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-6 text-center">
      {verdict !== 'neutral' && (
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-full ${verdict === 'correct' ? 'bg-brand-green' : 'bg-brand-red-soft'} text-white`}
        >
          {verdict === 'correct' ? <Check className="size-8" strokeWidth={3} /> : <span className="font-poppins text-2xl font-black">✕</span>}
        </div>
      )}
      <div
        className={`mt-3 font-poppins text-3xl font-black uppercase ${
          verdict === 'correct' ? 'text-brand-green-light' : verdict === 'wrong' ? 'text-brand-red-soft' : 'text-white'
        }`}
        style={poppins}
      >
        {verdict === 'correct' ? t('weekendLeague.gCorrect') : verdict === 'wrong' ? t('weekendLeague.gWrong') : t('weekendLeague.gTimeUp')}
      </div>
      {verdict === 'correct' && (
        <div className="mt-1 font-poppins text-xl font-black tabular-nums text-brand-yellow" style={poppins}>
          {t('weekendLeague.gPlusPoints', { n: answer?.accepted ? answer.points ?? 0 : 0 })}
        </div>
      )}
      {verdict !== 'correct' && answerText && (
        <div className="mt-2 font-poppins text-[14px] font-semibold text-white/70">
          {t('weekendLeague.gCorrectAnswer')} <span className="text-brand-green-light">{answerText}</span>
        </div>
      )}
      <div className="mt-2 font-poppins text-[12px] font-semibold text-white/45">
        {t('weekendLeague.gAnsweredCount', { n: reveal.answered })}
      </div>
      <BoardStrip board={board} selfUserId={selfUserId} />
    </div>
  );
}

function BoardStrip({
  board, selfUserId, rows = 5,
}: {
  board: WlBoardRow[];
  selfUserId: string | null;
  rows?: number;
}) {
  const { t } = useLocale();
  if (board.length === 0) return null;
  const top = board.slice(0, rows);
  const you = selfUserId ? board.find((r) => r.user_id === selfUserId) ?? null : null;
  const showYouRow = you != null && !top.some((r) => r.user_id === you.user_id);
  return (
    <div className="mx-auto mt-5 w-full max-w-sm text-left">
      {top.map((row) => (
        <BoardRowView key={row.user_id} row={row} isYou={row.user_id === selfUserId} />
      ))}
      {showYouRow && (
        <>
          <div className="py-0.5 text-center font-poppins text-[11px] font-bold text-white/30">⋯</div>
          <BoardRowView row={you} isYou />
        </>
      )}
      {you == null && selfUserId != null && (
        <div className="mt-1.5 text-center font-poppins text-[11px] font-bold uppercase text-white/40">
          {t('weekendLeague.gYourRank')}: 24+
        </div>
      )}
    </div>
  );
}

function BoardRowView({ row, isYou }: { row: WlBoardRow; isYou: boolean }) {
  const { t } = useLocale();
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-1.5 font-poppins text-[13px] font-bold ${
        isYou ? 'bg-brand-cyan/15 text-brand-cyan' : 'text-white/75'
      }`}
    >
      <span className="tabular-nums">#{row.rank}</span>
      <span className="mx-2 flex-1 truncate">
        {isYou ? t('weekendLeague.gYou') : t('weekendLeague.gPlayerN', { n: row.rank })}
      </span>
      <span className="tabular-nums">{row.points}</span>
    </div>
  );
}
