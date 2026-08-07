'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Crown, Eye, Play, Trophy, Users } from 'lucide-react';
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

// Fully transparent lobby card — content sits directly on the backdrop.
const card = 'rounded-[24px]';

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
      {registered > 0 && (
        <div className="mt-3 flex items-center justify-center gap-1.5 font-poppins text-[13px] font-semibold text-white/60">
          <Users className="size-4" /> {t('weekendLeague.gPlayersCount', { count: registered })}
        </div>
      )}

      <div className={`mt-6 w-full ${card} p-5`}>
        <div className="font-poppins text-[13px] font-black uppercase tracking-wide text-white">
          {t('weekendLeague.gFormatDynamic', { finalists: games[2].advance })}
        </div>
        {/* Cut wording is field-size independent (÷3, ÷2, top-N final — see
            backend wl-rules ladder): real fields vary, so no absolute counts. */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {games.map((g) => (
            <div key={g.index} className="rounded-xl bg-white/5 px-2 py-2.5">
              <div className="font-poppins text-[10px] font-black uppercase text-white/50">{t('weekendLeague.gGameN', { n: g.index + 1 })}</div>
              <div className="mt-0.5 font-poppins text-[13px] font-black text-white" style={poppins}>
                {g.index === 0 && t('weekendLeague.gCutGame1')}
                {g.index === 1 && t('weekendLeague.gCutGame2')}
                {g.index === 2 && t('weekendLeague.gCutGame3', { n: g.advance })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 font-poppins text-[12px] font-semibold text-brand-gold">
          <Trophy className="mr-1 inline size-4 align-[-2px]" strokeWidth={2.5} />
          {t('weekendLeague.championWinsLabel')} {t('weekendLeague.prize1Reward')}
        </div>
      </div>

      {kickoffMs != null && (
        <div className="mt-5">
          <div className="mb-2 font-poppins text-[13px] font-black uppercase tracking-widest text-white">
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
        initial={{ opacity: 0, scale: 0.86, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        // Solid card: the intro sits over the live question screen, so it needs
        // its own surface to stay readable.
        className="w-full max-w-sm overflow-hidden rounded-[28px] bg-brand-blue shadow-[0_18px_60px_rgba(22,69,255,0.35)]"
      >
        <div className="px-6 pb-4 pt-6 text-center">
          <div className="font-poppins text-[11px] font-black uppercase tracking-[0.3em] text-white/60">
            {t('weekendLeague.gLobbyKicker')}
          </div>
          <div className="mt-1 font-poppins text-5xl font-black uppercase italic leading-none text-white" style={poppins}>
            {t('weekendLeague.gGameN', { n: game.index + 1 })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-6 pb-6"
        >
          {game.players > 0 && (
            <Stat label={t('weekendLeague.gFieldLabel')} value={String(game.players)} />
          )}
          {game.advance > 0 && (
            <Stat
              label={isLastGame ? t('weekendLeague.gReachFinalWord') : t('weekendLeague.gAdvanceWord')}
              value={String(game.advance)}
              accent
            />
          )}
          <Stat label={t('weekendLeague.gRoundsLabel')} value="5" />
        </motion.div>
      </motion.div>

      <button
        type="button"
        onClick={onDone}
        className="mt-8 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
      >
        {t('weekendLeague.gSkip')}
      </button>
    </div>
  );
}

/** One row of the game-intro card: label left, big number right. */
function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="font-poppins text-[12px] font-black uppercase tracking-wide text-white/70">
        {label}
      </span>
      <span
        className={`font-poppins text-2xl font-black tabular-nums ${accent ? 'text-brand-yellow' : 'text-white'}`}
        style={poppins}
      >
        {value}
      </span>
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
  answerTextOverride,
  correctPct,
}: {
  question: RoundQuestion | null;
  result: RoundResult;
  score: number;
  gameIndex: number;
  round: RoundDef;
  onContinue: () => void;
  /** Live flow: the server-provided correct answer (prototype derives it). */
  answerTextOverride?: string | null;
  /** Live flow: real % correct from the reveal distribution; null hides the line. */
  correctPct?: number | null;
}) {
  const { t } = useLocale();
  void score; // running total lives in the header; the reveal stays single-message
  const derivedText = useCorrectAnswerText(question ?? ({ type: 'trueFalse', items: [] } as RoundQuestion));
  const answerText = answerTextOverride !== undefined ? answerTextOverride : derivedText;
  const mockDist = useMemo(
    () => answerDistribution(gameIndex, round.index, 4, 0),
    [gameIndex, round.index],
  );
  const dist = { correctPct: correctPct !== undefined ? correctPct : mockDist.correctPct };

  useEffect(() => {
    const id = setTimeout(onContinue, 3000);
    return () => clearTimeout(id);
  }, [onContinue]);

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      {/* This screen lives for ~2-3s before the next question dispatches, so it
          carries ONE message: right or wrong, and what it was worth. Details
          (correct answer, crowd %, running total) only when they add something. */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        className={`flex size-20 items-center justify-center rounded-full ${
          result.correct ? 'bg-brand-green text-white' : 'bg-brand-red-soft text-white'
        }`}
      >
        {result.correct ? <Check className="size-11" strokeWidth={3} /> : <span className="font-poppins text-4xl font-black">✕</span>}
      </motion.div>

      {result.correct ? (
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
          className="mt-5 font-poppins text-6xl font-black tabular-nums text-brand-yellow"
          style={poppins}
        >
          +{result.points}
        </motion.div>
      ) : (
        <>
          <div className="mt-5 font-poppins text-3xl font-black uppercase text-brand-red-soft" style={poppins}>
            {t('weekendLeague.gWrong')}
          </div>
          {answerText && (
            <div className="mt-2 font-poppins text-xl font-black uppercase text-brand-green-light" style={poppins}>
              {answerText}
            </div>
          )}
        </>
      )}

      {dist.correctPct != null && (
        <div className="mt-4 font-poppins text-[12px] font-bold uppercase tracking-wide text-white/40">
          {t('weekendLeague.gAnsweredCorrectly', { pct: dist.correctPct })}
        </div>
      )}
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

  // Nobody is cut while the field is already at/under the finalist count —
  // say so instead of counting down to the same number.
  const noCut = game.advance >= game.players;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        className="w-full max-w-sm rounded-[28px] bg-brand-yellow px-6 py-8 text-black shadow-[0_18px_60px_rgba(255,229,0,0.28)]"
      >
        {phase === 'calc' ? (
          <motion.div
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.1, repeat: Infinity }}
            className="font-poppins text-2xl font-black uppercase tracking-[0.2em]"
            style={poppins}
          >
            {t('weekendLeague.gCalculating')}
          </motion.div>
        ) : (
          <>
            <div className="font-poppins text-[12px] font-black uppercase tracking-widest text-black/55">
              {t('weekendLeague.gGameComplete', { n: game.index + 1 })}
            </div>
            <motion.div
              key={steps[stepIndex]}
              initial={{ scale: 1.15, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-2 font-poppins text-7xl font-black leading-none tabular-nums"
              style={poppins}
            >
              {steps[stepIndex]}
            </motion.div>
            <div className="mt-2 font-poppins text-[13px] font-black uppercase tracking-wide text-black/60">
              {t('weekendLeague.gPlayersWord')}
            </div>
            {stepIndex === steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 font-poppins text-lg font-black uppercase leading-snug"
              >
                {noCut
                  ? t('weekendLeague.gNoEliminations')
                  : isLastGame
                    ? t('weekendLeague.gReachFinal', { n: game.advance })
                    : t('weekendLeague.gAdvanceCount', { n: game.advance })}
              </motion.div>
            )}
          </>
        )}
      </motion.div>
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
  /** null = beyond the visible board (live shows a 24+ style placeholder). */
  finalRank: number | null;
  score: number;
  /** Prototype-only stat; the live flow omits it. */
  bestRound?: { round: number; points: number };
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
        {finalRank != null && (
          <div className="mt-2 font-poppins text-xl font-black tabular-nums text-white" style={poppins}>
            {t('weekendLeague.gOfCount', { r: finalRank, n: game.players })}
          </div>
        )}
        <div className="mt-4 space-y-1 font-poppins text-[13px] font-black uppercase tracking-wide text-white/60">
          <div>{t('weekendLeague.gSunday')}</div>
          <div>{t('weekendLeague.gFinalists', { n: game.advance })}</div>
          <div className="flex items-center justify-center gap-1.5 text-brand-gold">
            <Trophy className="size-4" strokeWidth={2.5} /> {t('weekendLeague.prize1Reward')}
          </div>
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
        {finalRank != null && (
          <div className="mt-2 font-poppins text-xl font-black tabular-nums text-white" style={poppins}>
            {t('weekendLeague.gOfCount', { r: finalRank, n: game.players })}
          </div>
        )}
        {game.advance > 0 && (
          <div className="mt-3 font-poppins text-[13px] font-black uppercase tracking-wide text-white/55">
            {t('weekendLeague.gAdvanceCount', { n: game.advance })}
          </div>
        )}
        {/* No CTA: the break countdown starts by itself and the next game
            dispatches on the server's clock — a button here would imply the
            player must act to stay in, which is never true. */}
      </div>
    );
  }

  const missedBy = game.advance <= 0
    ? null
    : isLastGame
      ? t('weekendLeague.gReachFinal', { n: game.advance })
      : t('weekendLeague.gTopAdvanced', { n: game.advance });
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="font-poppins text-4xl font-black uppercase text-white" style={poppins}>
        {isLastGame ? t('weekendLeague.gSoClose') : t('weekendLeague.gEliminated')}
      </div>

      {/* Your run, grouped as one summary card instead of four loose lines. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 }}
        className="mt-5 w-full max-w-sm rounded-[24px] bg-brand-blue px-5 py-4 shadow-[0_18px_60px_rgba(22,69,255,0.3)]"
      >
        {finalRank != null && (
          <div className="flex items-baseline justify-between">
            <span className="font-poppins text-[12px] font-black uppercase tracking-wide text-white/60">
              {t('weekendLeague.gPlaceLabel')}
            </span>
            <span className="font-poppins text-3xl font-black tabular-nums text-white" style={poppins}>
              #{finalRank}
            </span>
          </div>
        )}
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-poppins text-[12px] font-black uppercase tracking-wide text-white/60">
            {t('weekendLeague.gTotalScore')}
          </span>
          <span className="font-poppins text-xl font-black tabular-nums text-brand-yellow" style={poppins}>
            {score}
          </span>
        </div>
        {bestRound && (
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <span className="font-poppins text-[12px] font-black uppercase tracking-wide text-white/60">
              {t('weekendLeague.gBestRoundLabel')}
            </span>
            <span className="truncate font-poppins text-[13px] font-black uppercase text-white">
              {t(ROUND_LABEL_KEYS[ROUNDS[bestRound.round].type])}
              <span className="ml-1.5 text-brand-yellow">+{bestRound.points}</span>
            </span>
          </div>
        )}
        {missedBy && (
          <div className="mt-3 border-t border-white/20 pt-3 font-poppins text-[12px] font-bold uppercase tracking-wide text-white/60">
            {missedBy}
          </div>
        )}
      </motion.div>
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
/** Tournament end: champion celebration or your final placement — the same
 *  designed screen for live play and the playground simulator. */
export function ChampionScreen({
  champion,
  finalRank,
  score,
  onExit,
  children,
}: {
  champion: boolean;
  finalRank: number | null;
  score: number;
  onExit: () => void;
  /** Board strip slot — the caller owns the standings data shape. */
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 12 }}
        className={champion ? 'text-brand-gold' : 'text-white/35'}
      >
        <Crown className="size-16" strokeWidth={2} fill="currentColor" />
      </motion.div>
      <div className="mt-4 font-poppins text-4xl font-black uppercase text-brand-gold" style={poppins}>
        {champion ? t('weekendLeague.gChampionTitle') : t('weekendLeague.gFinalDoneTitle')}
      </div>
      {!champion && finalRank != null && (
        <div className="mt-2 font-poppins text-xl font-black tabular-nums text-white" style={poppins}>
          {t('weekendLeague.gYouFinished', { r: finalRank })}
        </div>
      )}
      <div className="mt-2 font-poppins text-[13px] font-black uppercase tracking-wide text-white/55">
        {t('weekendLeague.gTotalScore')} <span className="tabular-nums text-white">{score}</span>
      </div>
      {children}
      <button
        type="button"
        onClick={onExit}
        className="mx-auto mt-6 flex h-12 items-center justify-center rounded-2xl bg-white/10 px-8 font-poppins text-sm font-black uppercase text-white hover:bg-white/15"
      >
        {t('weekendLeague.gContinue')}
      </button>
    </div>
  );
}

export function BreakScreen({
  games,
  game,
  finalRank = null,
  score,
  bestRound = null,
  fast = false,
  onDone,
  deadlineMs = null,
}: {
  games: GameDef[];
  game: GameDef;
  finalRank?: number | null;
  score: number;
  bestRound?: { round: number; points: number } | null;
  fast?: boolean;
  /** Prototype driver: local countdown, auto-advance + skip. */
  onDone?: () => void;
  /** Live driver: count down to the server break deadline; server advances. */
  deadlineMs?: number | null;
}) {
  const { t } = useLocale();
  const total = fast ? 8 : BREAK_SECONDS;
  // The local `total` fallback exists ONLY for the /dev/wl prototype driver
  // (onDone set): in the live flow a missing server deadline must never
  // fabricate a countdown — a phantom "02:00" with no server clock behind it
  // reached a real playtest.
  const synthetic = deadlineMs == null && onDone != null;
  const [left, setLeft] = useState(() =>
    deadlineMs != null ? Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)) : synthetic ? total : 0,
  );

  // Tick down only — advancing the parent from inside the updater would be a
  // setState during render. Server-paced breaks re-derive from the deadline.
  useEffect(() => {
    const id = setInterval(() => {
      if (deadlineMs != null) setLeft(Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
      else setLeft((l) => Math.max(0, l - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);

  useEffect(() => {
    if (left > 0 || onDone == null || deadlineMs != null) return;
    onDone();
  }, [left, onDone, deadlineMs]);

  const next = games[game.index + 1];
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className="font-poppins text-[12px] font-black uppercase tracking-widest text-white/70">
        {t('weekendLeague.gGameComplete', { n: game.index + 1 })}
      </div>
      {/* Rank as a number to spot, then the two stats as separate chips — the
          old single run-on sentence was the hardest line on the screen. */}
      {finalRank != null && (
        // Stacked, not inline: a small Georgian label never sits cleanly on the
        // baseline of a 5xl numeral.
        <div className="mt-2 flex flex-col items-center">
          <span className="font-poppins text-[12px] font-black uppercase tracking-widest text-white/70">
            {t('weekendLeague.gPlaceLabel')}
          </span>
          <span className="mt-0.5 font-poppins text-6xl font-black leading-none tabular-nums text-brand-yellow" style={poppins}>
            #{finalRank}
          </span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span className="rounded-xl bg-white/[0.07] px-3 py-1.5 font-poppins text-[13px] font-black uppercase tracking-wide text-white">
          {t('weekendLeague.gTotalScore')}{' '}
          <span className="tabular-nums text-brand-yellow">{score}</span>
        </span>
        {bestRound != null && (
          <span className="rounded-xl bg-white/[0.07] px-3 py-1.5 font-poppins text-[13px] font-black uppercase tracking-wide text-white">
            {t(ROUND_LABEL_KEYS[ROUNDS[bestRound.round].type])}{' '}
            <span className="text-brand-green-light">+{bestRound.points}</span>
          </span>
        )}
      </div>

      <div className="mt-5 w-full rounded-[24px] border-2 border-white/10 p-5">
        {next != null && next.players > 0 && (
          <div className="mx-auto max-w-md font-poppins text-[15px] font-black uppercase leading-snug tracking-wide text-white/70">
            {t('weekendLeague.gPlayersRemain', {
              count: next.players,
              advance: next.advance,
              finalWord: t(next.index === games.length - 1 ? 'weekendLeague.gReachFinalWord' : 'weekendLeague.gAdvanceWord'),
            })}
          </div>
        )}
        <div className="mt-4 font-poppins text-[13px] font-black uppercase tracking-widest text-white">
          {game.index + 1 < games.length
            ? t('weekendLeague.gGameStartsIn', { n: game.index + 2 })
            : t('weekendLeague.gFinalWord')}
        </div>
        {deadlineMs != null || synthetic ? (
          <div className="mt-1 font-poppins text-5xl font-black tabular-nums text-brand-yellow" style={poppins}>
            {mm}:{ss}
          </div>
        ) : (
          <div className="mt-1 animate-pulse font-poppins text-xl font-black uppercase tracking-widest text-brand-yellow" style={poppins}>
            {t('weekendLeague.startingNow')}
          </div>
        )}
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

      {onDone != null && (
        <button
          type="button"
          onClick={onDone}
          className="mt-6 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
        >
          {t('weekendLeague.gSkipBreak')}
        </button>
      )}
    </div>
  );
}
