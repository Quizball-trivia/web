'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins } from '../constants';
import {
  answerDistribution,
  applyLiveDrift,
  buildStandings,
  GAMES,
  QUESTIONS,
  ROUND_LABEL_KEYS,
  ROUNDS,
} from './gauntlet.data';
import type { RoundQuestion, StandingsRow } from './gauntlet.types';
import {
  CareerPathRound,
  HigherLowerRound,
  MultipleChoiceRound,
  TrueFalseRound,
  WhoAmIRound,
} from './RoundScreens';
import { EliminationReveal, useCorrectAnswerText } from './GauntletScreens';

type SpectatorScreen = 'lobby' | 'question' | 'reveal' | 'roundDone' | 'elimination' | 'break' | 'finished';

const SPECTATOR_BREAK_SECONDS = 20;

/**
 * Watch-only view of the Saturday gauntlet. Same rounds and pacing as the
 * player flow, but answers are read-only and there is no personal score or
 * rank. In production the broadcast runs ~30s behind to stop answer feeding;
 * the prototype simulates both modes (the badge changes, the sim is local).
 */
export function SpectatorFlow({ onExit }: { onExit: () => void }) {
  const { t } = useLocale();
  const [screen, setScreen] = useState<SpectatorScreen>('lobby');
  const [gameIndex, setGameIndex] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);

  const game = GAMES[gameIndex];
  const round = ROUNDS[roundIndex];
  const question = QUESTIONS[gameIndex][roundIndex];
  const isLastGame = gameIndex === GAMES.length - 1;

  // The broadcast keeps moving while a round is in play: every few seconds a
  // slice of the field posts its answer and the board re-sorts, so a spectator
  // sees the standings shift live rather than jumping once per round.
  // Drift counter for the current round. The interval is re-created per round,
  // and the counter carries the round key so it restarts cleanly at zero.
  const [drift, setDrift] = useState({ key: '0-0', tick: 0 });
  const roundKey = `${gameIndex}-${roundIndex}`;
  const roundTick = drift.key === roundKey ? drift.tick : 0;

  useEffect(() => {
    if (screen !== 'question' && screen !== 'reveal') return;
    const key = `${gameIndex}-${roundIndex}`;
    const id = setInterval(() => {
      setDrift((d) => (d.key === key ? { key, tick: d.tick + 1 } : { key, tick: 1 }));
    }, 2500);
    return () => clearInterval(id);
  }, [screen, roundIndex, gameIndex]);

  // Field-only standings (no "you") — a spectator watches the bots.
  const standings = useMemo(() => {
    const roundsDone = roundIndex + (screen === 'question' ? 0 : 1);
    const base = buildStandings(gameIndex, roundsDone, -1, undefined).filter((r) => !r.isYou);
    return roundTick === 0 ? base : applyLiveDrift(base, gameIndex, roundIndex, roundTick);
  }, [gameIndex, roundIndex, screen, roundTick]);

  // Rank movement vs the previous tick — both boards are derived, so this needs
  // no stored state.
  const rankDeltas = useMemo(() => {
    if (roundTick === 0) return {};
    const roundsDone = roundIndex + (screen === 'question' ? 0 : 1);
    const prevBase = buildStandings(gameIndex, roundsDone, -1, undefined).filter((r) => !r.isYou);
    const prev =
      roundTick === 1 ? prevBase : applyLiveDrift(prevBase, gameIndex, roundIndex, roundTick - 1);
    const prevRank: Record<string, number> = {};
    for (const r of prev) prevRank[r.name] = r.rank;
    const out: Record<string, number> = {};
    for (const r of standings) {
      const before = prevRank[r.name];
      out[r.name] = before == null ? 0 : before - r.rank;
    }
    return out;
  }, [standings, gameIndex, roundIndex, screen, roundTick]);

  const questionDone = useCallback(() => setScreen('reveal'), []);
  const revealDone = useCallback(() => {
    setScreen(roundIndex < ROUNDS.length - 1 ? 'roundDone' : 'elimination');
  }, [roundIndex]);
  const roundDoneNext = useCallback(() => {
    setRoundIndex((r) => r + 1);
    setScreen('question');
  }, []);
  const eliminationDone = useCallback(() => {
    setScreen(isLastGame ? 'finished' : 'break');
  }, [isLastGame]);
  const breakDone = useCallback(() => {
    setGameIndex((g) => g + 1);
    setRoundIndex(0);
    setScreen('question');
  }, []);

  // Auto-advance the passive screens.
  useEffect(() => {
    if (screen === 'reveal') {
      const id = setTimeout(revealDone, 3500);
      return () => clearTimeout(id);
    }
    if (screen === 'roundDone') {
      const id = setTimeout(roundDoneNext, 2800);
      return () => clearTimeout(id);
    }
  }, [screen, revealDone, roundDoneNext]);

  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-fun">
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit spectator mode"
        className="fixed left-3 top-3 z-50 flex size-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:bg-black/60 hover:text-white"
      >
        <X className="size-5" />
      </button>

      {screen === 'lobby' && (
        <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
          <h1 className="mt-3 font-poppins text-3xl font-black uppercase text-white" style={poppins}>
            {t('weekendLeague.sWatching')}
          </h1>
          <div className="mt-2 font-poppins text-[13px] font-black uppercase tracking-wide text-white/60">
            {t('weekendLeague.gRoundOf', { g: gameIndex + 1, r: roundIndex + 1 })} · {t('weekendLeague.gPlayersCount', { count: game.players })}
          </div>
          <p className="mt-4 font-poppins text-[13px] font-semibold leading-snug text-white/55">
            {t('weekendLeague.sAsSpectator')}
          </p>

          <div className="mt-6 flex w-full flex-col gap-2.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setScreen('question')}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-brand-yellow py-3.5 font-poppins text-base font-black uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow/90"
              style={poppins}
            >
              <Eye className="size-5" /> {t('weekendLeague.sStartWatching')}
            </motion.button>
            <button
              type="button"
              onClick={onExit}
              className="font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
            >
              {t('weekendLeague.returnHome')}
            </button>
          </div>
        </div>
      )}

      {screen !== 'lobby' && (
        <div className="mx-auto w-full max-w-5xl lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:px-4">
          <div>
            {screen === 'question' && (
              <div key={`${gameIndex}-${roundIndex}`} className="relative">
                {question.type === 'trueFalse' && (
                  <TrueFalseRound {...roundShared(game, gameIndex, round)} question={question} onResolved={questionDone} />
                )}
                {question.type === 'higherLower' && (
                  <HigherLowerRound {...roundShared(game, gameIndex, round)} question={question} onResolved={questionDone} />
                )}
                {question.type === 'mcq' && (
                  <MultipleChoiceRound {...roundShared(game, gameIndex, round)} question={question} onResolved={questionDone} />
                )}
                {question.type === 'careerPath' && (
                  <CareerPathRound {...roundShared(game, gameIndex, round)} question={question} onResolved={questionDone} />
                )}
                {question.type === 'whoAmI' && (
                  <WhoAmIRound {...roundShared(game, gameIndex, round)} question={question} onResolved={questionDone} />
                )}
              </div>
            )}

            {screen === 'reveal' && (
              <SpectatorReveal question={question} gameIndex={gameIndex} roundIndex={roundIndex} />
            )}

            {screen === 'roundDone' && (
              <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
                <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>
                  {t('weekendLeague.sRoundComplete', { n: roundIndex + 1 })}
                </div>
                <div className="mt-3 space-y-1 font-poppins text-[13px] font-black uppercase tracking-wide text-white/55">
                  <div className="text-brand-green-light">{t('weekendLeague.sStandingsUpdated')}</div>
                  <div>{t('weekendLeague.sTopCurrently', { n: game.advance })}</div>
                </div>
                <div className="mt-4 font-poppins text-[12px] font-black uppercase tracking-widest text-white/45">
                  {t('weekendLeague.gNextRound', { n: roundIndex + 2, label: t(ROUND_LABEL_KEYS[ROUNDS[roundIndex + 1].type]) })}
                </div>
              </div>
            )}

            {screen === 'elimination' && (
              <EliminationReveal game={game} isLastGame={isLastGame} onDone={eliminationDone} />
            )}

            {screen === 'break' && <SpectatorBreak gameIndex={gameIndex} onDone={breakDone} />}

            {screen === 'finished' && (
              <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 text-center">
                <div className="font-poppins text-3xl font-black uppercase text-brand-gold" style={poppins}>
                  {t('weekendLeague.sQualifierComplete')}
                </div>
                <div className="mx-auto mt-2 max-w-sm font-poppins text-[15px] font-black uppercase leading-snug tracking-wide text-white/70">
                  {t('weekendLeague.sTop25Final')}
                </div>
                <button
                  type="button"
                  onClick={onExit}
                  className="mt-7 flex h-13 items-center justify-center rounded-2xl bg-brand-green px-8 py-3.5 font-poppins text-base font-black uppercase tracking-wide text-white hover:bg-brand-green/90"
                >
                  {t('weekendLeague.returnHome')}
                </button>
              </div>
            )}
          </div>

          {/* Live leaderboard rail */}
          {(screen === 'question' || screen === 'reveal' || screen === 'roundDone') && (
            <aside className="px-4 pb-10 lg:px-0 lg:pt-16">
              <LiveBoard rows={standings} cutoff={game.advance} deltas={rankDeltas} />
              <div className="mt-3 text-center font-poppins text-[10px] font-bold uppercase tracking-wide text-white/40">
                {t('weekendLeague.sStatusLine', { players: game.players, advance: game.advance, max: round.maxPoints })}
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function roundShared(game: (typeof GAMES)[number], gameIndex: number, round: (typeof ROUNDS)[number]) {
  return {
    game,
    gameIndex,
    round,
    score: 0,
    rank: 0,
    fastTimers: true,
    readOnly: true,
    spectator: true,
  };
}

function SpectatorReveal({
  question,
  gameIndex,
  roundIndex,
}: {
  question: RoundQuestion;
  gameIndex: number;
  roundIndex: number;
}) {
  const { t } = useLocale();
  const answerText = useCorrectAnswerText(question);
  // Rounds hold several questions; the spectator reveal summarises the round's
  // first question as a representative split.
  const first = 'items' in question ? question.items[0] : null;
  const options = first && 'options' in first ? first.options : null;
  const correctIndex = first && 'correctIndex' in first ? first.correctIndex : 0;
  const dist = answerDistribution(gameIndex, roundIndex, options ? options.length : 2, correctIndex);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      {answerText && (
        <>
          <div className="font-poppins text-[12px] font-black uppercase tracking-widest text-white/45">
            {t('weekendLeague.gCorrectAnswer')}
          </div>
          <div className="mt-1 font-poppins text-3xl font-black uppercase text-brand-green-light" style={poppins}>
            {answerText}
          </div>
        </>
      )}

      {options ? (
        <div className="mt-5 w-full space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-40 truncate text-left font-poppins text-[12px] font-bold text-white/70">{opt}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dist.perOption[i]}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className={`h-full rounded-full ${i === correctIndex ? 'bg-brand-green-light' : 'bg-white/30'}`}
                />
              </div>
              <span className="w-10 text-right font-poppins text-[12px] font-black tabular-nums text-white">
                {dist.perOption[i]}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-1 font-poppins text-[13px] font-semibold text-white/60">
          <div className="text-brand-green-light">{t('weekendLeague.sCorrectPct', { pct: dist.correctPct })}</div>
          <div>{t('weekendLeague.sWrongPct', { pct: dist.wrongPct })}</div>
          <div>{t('weekendLeague.sNoAnswerPct', { pct: dist.noAnswerPct })}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact live standings rail. Same rows as before, but wearing the leaderboard's
 * branding: the green-bordered frame, its column headings and medal ranks.
 */
function LiveBoard({
  rows,
  cutoff,
  deltas,
}: {
  rows: StandingsRow[];
  cutoff: number;
  /** Rank change since the previous tick, keyed by player name. */
  deltas: Record<string, number>;
}) {
  const { t } = useLocale();
  const top = rows.slice(0, 10);
  const around = rows.slice(Math.max(0, cutoff - 2), cutoff + 2);


  return (
    <div>
      <div className="mb-2 text-center font-poppins text-[13px] font-black uppercase tracking-widest text-white">
        {t('weekendLeague.sLiveLeaderboard')}
      </div>

      {/* Column headings, as on /leaderboard */}
      <div className="grid grid-cols-[3.4rem_1fr_auto] gap-2 px-3 pb-1.5 font-fun text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
        <span>{t('leaderboard.colRank')}</span>
        <span>{t('leaderboard.colPlayer')}</span>
        <span>{t('weekendLeague.colPoints')}</span>
      </div>

      <div className="overflow-hidden rounded-[10px] border-2" style={{ borderColor: '#38B60E' }}>
        <div className="divide-y divide-brand-green/25">
          {top.map((r) => (
            <SpectatorRow key={r.name} row={r} delta={deltas[r.name] ?? 0} />
          ))}
          <div className="flex items-center gap-2 bg-brand-gold/10 px-3 py-1">
            <span className="h-px flex-1 bg-brand-gold/40" />
            <span className="font-poppins text-[9px] font-black uppercase tracking-widest text-brand-gold">
              {t('weekendLeague.gTopAdvance', { n: cutoff })}
            </span>
            <span className="h-px flex-1 bg-brand-gold/40" />
          </div>
          {around.map((r) => (
            <SpectatorRow key={r.name} row={r} delta={deltas[r.name] ?? 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

function SpectatorRow({ row, delta = 0 }: { row: StandingsRow; delta?: number }) {
  return (
    <div className="grid grid-cols-[3.4rem_1fr_auto] items-center gap-2 px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
      <span className="flex items-center gap-1 font-poppins text-[13px] font-black tabular-nums text-white">
        {row.rank <= 3 ? MEDALS[row.rank - 1] : `#${row.rank}`}
        {delta > 0 && <ChevronUp className="size-3.5 shrink-0 text-brand-green-light" />}
        {delta < 0 && <ChevronDown className="size-3.5 shrink-0 text-brand-red-soft" />}
      </span>
      <span className="truncate font-fun text-[13px] font-black uppercase text-white">{row.name}</span>
      <span className="font-poppins text-[13px] font-black tabular-nums text-white">
        {row.score.toLocaleString()}
      </span>
    </div>
  );
}

function SpectatorBreak({ gameIndex, onDone }: { gameIndex: number; onDone: () => void }) {
  const { t } = useLocale();
  const [left, setLeft] = useState(SPECTATOR_BREAK_SECONDS);

  // Tick down only — the state updater must stay pure. Advancing the parent
  // from inside it would be a setState during render.
  useEffect(() => {
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left > 0) return;
    onDone();
  }, [left, onDone]);

  const next = GAMES[gameIndex + 1];
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>
        {t('weekendLeague.gGameComplete', { n: gameIndex + 1 })}
      </div>
      <div className="mx-auto mt-2 max-w-md font-poppins text-[15px] font-black uppercase leading-snug tracking-wide text-white/70">
        {t('weekendLeague.gPlayersRemain', {
          count: next.players,
          advance: next.advance,
          finalWord: t(next.index === 2 ? 'weekendLeague.gReachFinalWord' : 'weekendLeague.gAdvanceWord'),
        })}
      </div>
      <div className="mt-4 font-poppins text-5xl font-black tabular-nums text-brand-yellow" style={poppins}>
        0:{String(left).padStart(2, '0')}
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
