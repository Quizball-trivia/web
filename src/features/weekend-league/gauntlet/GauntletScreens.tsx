'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Play, Trophy, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins } from '../constants';
import { LeagueCountdown } from '../components/LeagueCountdown';
import {
  answerDistribution,
  BREAK_SECONDS,
  eliminationSteps,
  ROUND_LABEL_KEYS,
  ROUNDS,
} from './gauntlet.data';
import type { GameDef, RoundDef, RoundQuestion, RoundResult } from './gauntlet.types';

const card = 'rounded-[24px] border-2 border-white/10 bg-surface-card-deep';

function Cta({
  children,
  onClick,
  secondary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  secondary?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-poppins text-base font-black uppercase tracking-wide transition-colors ${
        secondary
          ? 'border-2 border-white/15 text-white/80 hover:bg-white/5'
          : 'bg-brand-green text-white hover:bg-brand-green/90'
      }`}
    >
      {children}
    </motion.button>
  );
}

/**
 * Every round now holds several questions, so a round reveal summarises the set
 * rather than naming one answer. Kept as a hook for the spectator view, which
 * shows per-question distributions.
 */
export function useCorrectAnswerText(_q: RoundQuestion): string | null {
  void _q;
  return null;
}

// ── Lobby ───────────────────────────────────────────────────────────────────
export function GauntletLobby({
  games,
  registered,
  kickoffMs,
  onEnter,
  onWatch,
  canPlay,
}: {
  games: GameDef[];
  registered: number;
  kickoffMs: number | null;
  onEnter: () => void;
  onWatch: () => void;
  canPlay: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center px-4 py-14 text-center">
      <div className="font-poppins text-[11px] font-black uppercase tracking-[0.28em] text-brand-gold">
        {t('weekendLeague.gLobbyKicker')}
      </div>
      <h1 className="mt-2 font-poppins text-4xl font-black uppercase leading-none text-white" style={poppins}>
        {t('weekendLeague.title')}
      </h1>
      <div className="mt-3 flex items-center justify-center gap-1.5 font-poppins text-[13px] font-semibold text-white/60">
        <Users className="size-4" /> {t('weekendLeague.gPlayersCount', { count: registered })}
      </div>

      <div className={`mt-6 w-full ${card} p-5`}>
        <div className="font-poppins text-[13px] font-black uppercase tracking-wide text-white">
          {t('weekendLeague.gFormatDynamic', { finalists: games[2].advance })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {games.map((g) => (
            <div key={g.index} className="rounded-xl bg-black/30 px-2 py-2.5">
              <div className="font-poppins text-[10px] font-black uppercase text-white/50">{t('weekendLeague.gGameN', { n: g.index + 1 })}</div>
              <div className="mt-0.5 font-poppins text-sm font-black tabular-nums text-white" style={poppins}>
                {g.players} → {g.advance}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 font-poppins text-[12px] font-semibold text-brand-gold">
          🏆 {t('weekendLeague.championWinsLabel')} {t('weekendLeague.prize1Reward')}
        </div>
      </div>

      {kickoffMs != null && (
        <div className="mt-5">
          <div className="mb-2 font-poppins text-[11px] font-black uppercase tracking-widest text-white/45">
            {t('weekendLeague.gGameStartsIn', { n: 1 })}
          </div>
          <LeagueCountdown targetMs={kickoffMs} size="sm" accent="text-brand-yellow" />
        </div>
      )}

      <div className="mt-6 flex w-full flex-col gap-2.5">
        {canPlay ? (
          <Cta onClick={onEnter}>
            <Play className="size-5 fill-current" /> {t('weekendLeague.joinGame')}
          </Cta>
        ) : (
          <Cta onClick={onWatch}>
            <Eye className="size-5" /> {t('weekendLeague.watchLive')}
          </Cta>
        )}
      </div>
    </div>
  );
}

// ── Game intro ──────────────────────────────────────────────────────────────
export function GameIntro({
  game,
  isLastGame,
  onDone,
}: {
  game: GameDef;
  isLastGame: boolean;
  onDone: () => void;
}) {
  const { t } = useLocale();
  useEffect(() => {
    const id = setTimeout(onDone, 2600);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      >
        <div className="font-poppins text-6xl font-black uppercase italic text-white" style={poppins}>
          {t('weekendLeague.gGameN', { n: game.index + 1 })}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-4 space-y-1.5 font-poppins text-lg font-black uppercase tracking-wide"
        >
          <div className="text-white">{t('weekendLeague.gPlayersCount', { count: game.players })}</div>
          <div className="text-brand-green-light">
            {isLastGame
              ? t('weekendLeague.gReachFinal', { n: game.advance })
              : t('weekendLeague.gTopAdvance', { n: game.advance })}
          </div>
          <div className="text-white/50">{t('weekendLeague.gRounds5')}</div>
        </motion.div>
      </motion.div>
      <button
        type="button"
        onClick={onDone}
        className="mt-10 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
      >
        {t('weekendLeague.gSkip')}
      </button>
    </div>
  );
}

// ── Answer reveal ───────────────────────────────────────────────────────────
export function AnswerReveal({
  question,
  result,
  score,
  gameIndex,
  round,
  onContinue,
}: {
  question: RoundQuestion;
  result: RoundResult;
  score: number;
  gameIndex: number;
  round: RoundDef;
  onContinue: () => void;
}) {
  const { t } = useLocale();
  const answerText = useCorrectAnswerText(question);
  const dist = useMemo(
    () => answerDistribution(gameIndex, round.index, 4, 0),
    [gameIndex, round.index],
  );

  useEffect(() => {
    const id = setTimeout(onContinue, 3000);
    return () => clearTimeout(id);
  }, [onContinue]);

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        className={`flex size-16 items-center justify-center rounded-full ${
          result.correct ? 'bg-brand-green text-white' : 'bg-brand-red-soft text-white'
        }`}
      >
        {result.correct ? <Check className="size-9" strokeWidth={3} /> : <span className="font-poppins text-3xl font-black">✕</span>}
      </motion.div>

      <div
        className={`mt-4 font-poppins text-4xl font-black uppercase ${result.correct ? 'text-brand-green-light' : 'text-brand-red-soft'}`}
        style={poppins}
      >
        {result.correct ? t('weekendLeague.gCorrect') : t('weekendLeague.gWrong')}
      </div>
      <div className="mt-2 font-poppins text-2xl font-black tabular-nums text-brand-yellow" style={poppins}>
        {t('weekendLeague.gPlusPoints', { n: result.points })}
      </div>

      {!result.correct && answerText && (
        <div className="mt-3 font-poppins text-[14px] font-semibold text-white/70">
          {t('weekendLeague.gCorrectAnswer')} <span className="text-brand-green-light">{answerText}</span>
        </div>
      )}

      <div className="mt-4 space-y-1 font-poppins text-[13px] font-semibold text-white/55">
        <div>{t('weekendLeague.gAnsweredCorrectly', { pct: dist.correctPct })}</div>
        <div>
          {t('weekendLeague.gTotalScore')} <span className="tabular-nums text-white">{score}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-8 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
      >
        {t('weekendLeague.gContinue')}
      </button>
    </div>
  );
}

// ── End-of-game elimination reveal ──────────────────────────────────────────
export function EliminationReveal({
  game,
  isLastGame,
  onDone,
}: {
  game: GameDef;
  isLastGame: boolean;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const steps = useMemo(() => eliminationSteps(game.players, game.advance), [game.players, game.advance]);
  const [phase, setPhase] = useState<'calc' | 'count'>('calc');
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const calc = setTimeout(() => setPhase('count'), 1800);
    return () => clearTimeout(calc);
  }, []);

  useEffect(() => {
    if (phase !== 'count') return;
    if (stepIndex >= steps.length - 1) {
      const done = setTimeout(onDone, 1200);
      return () => clearTimeout(done);
    }
    const id = setTimeout(() => setStepIndex((i) => i + 1), 550);
    return () => clearTimeout(id);
  }, [phase, stepIndex, steps.length, onDone]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      {phase === 'calc' ? (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.1, repeat: Infinity }}
          className="font-poppins text-2xl font-black uppercase tracking-[0.2em] text-white"
          style={poppins}
        >
          {t('weekendLeague.gCalculating')}
        </motion.div>
      ) : (
        <>
          <div className="font-poppins text-[12px] font-black uppercase tracking-widest text-white/45">
            {t('weekendLeague.gGameComplete', { n: game.index + 1 })}
          </div>
          <motion.div
            key={steps[stepIndex]}
            initial={{ scale: 1.15, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-3 font-poppins text-7xl font-black tabular-nums text-white"
            style={poppins}
          >
            {steps[stepIndex]}
          </motion.div>
          <div className="mt-2 font-poppins text-[13px] font-black uppercase tracking-wide text-white/55">
            {t('weekendLeague.gPlayersWord')}
          </div>
          {stepIndex === steps.length - 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 font-poppins text-xl font-black uppercase text-brand-green-light"
            >
              {isLastGame
                ? t('weekendLeague.gReachFinal', { n: game.advance })
                : t('weekendLeague.gAdvanceCount', { n: game.advance })}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

// ── Survived / eliminated / finalist ────────────────────────────────────────
export function GameResult({
  game,
  isLastGame,
  survived,
  finalRank,
  score,
  bestRound,
  onContinue,
  onKeepWatching,
  onExit,
}: {
  game: GameDef;
  isLastGame: boolean;
  survived: boolean;
  finalRank: number;
  score: number;
  bestRound: { round: number; points: number };
  onContinue: () => void;
  onKeepWatching: () => void;
  onExit: () => void;
}) {
  const { t } = useLocale();
  if (survived && isLastGame) {
    return (
      <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="flex size-20 items-center justify-center rounded-full bg-brand-gold text-black"
        >
          <Trophy className="size-10" />
        </motion.div>
        <div className="mt-4 font-poppins text-4xl font-black uppercase text-brand-gold" style={poppins}>
          {t('weekendLeague.gInFinal')}
        </div>
        <div className="mt-2 font-poppins text-xl font-black tabular-nums text-white" style={poppins}>
          {t('weekendLeague.gOfCount', { r: finalRank, n: game.players })}
        </div>
        <div className="mt-4 space-y-1 font-poppins text-[13px] font-black uppercase tracking-wide text-white/60">
          <div>{t('weekendLeague.gSunday')}</div>
          <div>{t('weekendLeague.gFinalists', { n: game.advance })}</div>
          <div className="text-brand-gold">🏆 {t('weekendLeague.prize1Reward')}</div>
        </div>
        <div className="mt-7 w-full space-y-2.5">
          <Cta onClick={onContinue}>{t('weekendLeague.gViewFinal')}</Cta>
          <Cta onClick={onExit} secondary>
            {t('weekendLeague.returnHome')}
          </Cta>
        </div>
      </div>
    );
  }

  if (survived) {
    return (
      <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 14 }}
          className="flex size-18 items-center justify-center rounded-full bg-brand-green text-white"
        >
          <Check className="size-10" strokeWidth={3} />
        </motion.div>
        <div className="mt-4 font-poppins text-4xl font-black uppercase text-brand-green-light" style={poppins}>
          {t('weekendLeague.gSurvived')}
        </div>
        <div className="mt-2 font-poppins text-xl font-black tabular-nums text-white" style={poppins}>
          {t('weekendLeague.gOfCount', { r: finalRank, n: game.players })}
        </div>
        <div className="mt-3 font-poppins text-[13px] font-black uppercase tracking-wide text-white/55">
          {t('weekendLeague.gSurvivedNext', { advance: game.advance, next: game.index + 2 })}
        </div>
        <div className="mt-7 w-full space-y-2.5">
          <Cta onClick={onContinue}>{t('weekendLeague.gViewContinue')}</Cta>
        </div>
      </div>
    );
  }

  const missedBy = isLastGame
    ? t('weekendLeague.gReachFinal', { n: game.advance })
    : t('weekendLeague.gTopAdvanced', { n: game.advance });
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="font-poppins text-4xl font-black uppercase text-white" style={poppins}>
        {isLastGame ? t('weekendLeague.gSoClose') : t('weekendLeague.gEliminated')}
      </div>
      <div className="mt-2 font-poppins text-xl font-black tabular-nums text-white/85" style={poppins}>
        {t('weekendLeague.gYouFinished', { r: finalRank })}
      </div>
      <div className="mt-2 font-poppins text-[13px] font-black uppercase tracking-wide text-white/55">{missedBy}</div>
      <div className="mt-4 space-y-1 font-poppins text-[13px] font-semibold text-white/55">
        <div className="tabular-nums">{t('weekendLeague.gFinalScore', { score })}</div>
        <div>{t('weekendLeague.gBestRound', { label: t(ROUND_LABEL_KEYS[ROUNDS[bestRound.round].type]), points: bestRound.points })}</div>
      </div>
      <div className="mt-7 w-full space-y-2.5">
        <Cta onClick={onKeepWatching}>
          <Eye className="size-5" /> {t('weekendLeague.gKeepWatching')}
        </Cta>
        <Cta onClick={onExit} secondary>
          {t('weekendLeague.returnHome')}
        </Cta>
      </div>
    </div>
  );
}

// ── 2-minute break ──────────────────────────────────────────────────────────
export function BreakScreen({
  games,
  game,
  finalRank,
  score,
  bestRound,
  fast,
  onDone,
}: {
  games: GameDef[];
  game: GameDef;
  finalRank: number;
  score: number;
  bestRound: { round: number; points: number };
  fast: boolean;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const total = fast ? 8 : BREAK_SECONDS;
  const [left, setLeft] = useState(total);
  useEffect(() => {
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(id);
          onDone();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onDone]);

  const next = games[game.index + 1];
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="font-poppins text-[12px] font-black uppercase tracking-widest text-white/45">
        {t('weekendLeague.gGameComplete', { n: game.index + 1 })}
      </div>
      <div className="mt-1 font-poppins text-3xl font-black uppercase text-white" style={poppins}>
        {t('weekendLeague.gYouFinished', { r: finalRank })}
      </div>
      <div className="mx-auto mt-2 max-w-md font-poppins text-[15px] font-semibold leading-snug text-white/70">
        {t('weekendLeague.gFinalScore', { score })} ·{' '}
        {t('weekendLeague.gBestRound', {
          label: t(ROUND_LABEL_KEYS[ROUNDS[bestRound.round].type]),
          points: bestRound.points,
        })}
      </div>

      <div className="mt-5 w-full rounded-[24px] border-2 border-white/10 p-5">
        <div className="mx-auto max-w-md font-poppins text-[15px] font-black uppercase leading-snug tracking-wide text-white/70">
          {t('weekendLeague.gPlayersRemain', {
            count: next.players,
            advance: next.advance,
            finalWord: t(next.index === games.length - 1 ? 'weekendLeague.gReachFinalWord' : 'weekendLeague.gAdvanceWord'),
          })}
        </div>
        <div className="mt-4 font-poppins text-[13px] font-black uppercase tracking-widest text-white/55">
          {t('weekendLeague.gGameStartsIn', { n: next.index + 1 })}
        </div>
        <div className="mt-1 font-poppins text-5xl font-black tabular-nums text-brand-yellow" style={poppins}>
          {mm}:{ss}
        </div>
      </div>

      {/* Weekend progress */}
      <div className="mt-4 flex w-full flex-col gap-1.5">
        {games.map((g) => {
          const done = g.index <= game.index;
          const isNext = g.index === game.index + 1;
          return (
            <div
              key={g.index}
              className={`flex items-center justify-between rounded-xl px-4 py-2 font-poppins text-[12px] font-black uppercase ${
                done ? 'bg-brand-green/12 text-brand-green-light' : isNext ? 'bg-brand-yellow/10 text-brand-yellow' : 'bg-white/5 text-white/35'
              }`}
            >
              <span>{t('weekendLeague.gGameN', { n: g.index + 1 })}</span>
              <span>{done ? '✓' : isNext ? t('weekendLeague.gNextLabel') : t('weekendLeague.gLocked')}</span>
            </div>
          );
        })}
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2 font-poppins text-[12px] font-black uppercase text-white/35">
          <span>{t('weekendLeague.gFinalWord')}</span>
          <span>{t('weekendLeague.gLocked')}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-6 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
      >
        {t('weekendLeague.gSkipBreak')}
      </button>
    </div>
  );
}
