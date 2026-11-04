'use client';

/**
 * A drawn match's penalty shootout (zoneMatch.shootout), all at one goal picked at random: the 3D stadium plays every
 * kick — the shooter's strike, the keeper's dive, the net — under Ranked 1.0's penalty HUD. Each kick plays like a
 * Ranked 1.0 penalty: both answer the same question, the answers are revealed, each side's +points fly from the
 * question onto their player, the bars spawn behind the players and fight it out, then the kick.
 */

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PenaltyHUD } from '@/features/possession/components/PenaltyHUD';
import { PenaltyMatchEndOverlay } from '@/features/possession/components/PenaltyMatchEndOverlay';
import { cn } from '@/lib/utils';
import { ZoneMatch3D } from './ZoneMatch3D';
import { McqPanel, type ZoneMatchSeat } from './ZoneMatchStage';
import { MCQ_MS, SHOOTOUT_BATTLE_MS, type MatchState } from './zoneMatch.machine';
import { answerPoints, isSuddenDeath, shootoutGoals } from './zoneMatch.shootout';
import { otherZoneSide, type BattleOutcome, type Possession, type ZoneSide as DuelSide } from './zoneMatch.rules';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 800 } as const;
/** Within the battle step: the answers show, then each side's time. */
const TIMES_AT = 600;

/** The scene's side that attacks the shootout's goal: whoever shoots stands there. */
const slotFor = (goal: 'left' | 'right'): DuelSide => (goal === 'right' ? 'player' : 'opponent');
const swapSide = (side: DuelSide) => otherZoneSide(side);

/** The match state as the 3D scene must see it: the shooter in the slot that attacks the shootout's goal. */
function sceneState(state: MatchState, swap: boolean): MatchState {
  if (!swap) return state;
  const pos = (p: Possession): Possession => ({ ...p, attacker: swapSide(p.attacker) });
  const out = (o: BattleOutcome | null): BattleOutcome | null =>
    !o ? null : o.kind === 'goal' ? { ...o, scorer: swapSide(o.scorer), next: pos(o.next) } : { ...o, next: pos(o.next) } as BattleOutcome;
  return { ...state, possession: pos(state.possession), outcomeFrom: state.outcomeFrom ? pos(state.outcomeFrom) : null, outcome: out(state.outcome) };
}


export function ZoneMatchShootout({
  state,
  now,
  player,
  opponent,
  onAnswer,
  onQuit,
}: {
  state: MatchState;
  now: number;
  player: ZoneMatchSeat;
  opponent: ZoneMatchSeat;
  onAnswer: (index: number, questionId: string) => void;
  onQuit: () => void;
}) {
  const so = state.shootout!;
  const mcq = state.mcq;
  const shooter = state.possession.attacker;
  const goals = shootoutGoals(so.kicks);
  const attempts = (side: DuelSide) => so.kicks.filter((k) => k.shooter === side).map((k) => (k.result === 'goal' ? ('goal' as const) : ('miss' as const)));
  const timeLeft = state.advanceAt ? Math.max(0, Math.ceil((state.advanceAt - now) / 1000)) : 0;
  const swap = shooter !== slotFor(so.goal);
  const scene = useMemo(() => sceneState(state, swap), [state, swap]);

  // The points the kick's answers earned, once the question is over.
  const points = useMemo(() => {
    if (!mcq || (so.step !== 'battle' && so.step !== 'kick')) return null;
    const of = (side: DuelSide) => answerPoints(mcq.answers[side] === mcq.question.correctIndex, mcq.answeredAt[side] === null ? null : mcq.answeredAt[side]! - mcq.startedAt, MCQ_MS);
    return { player: of('player'), opponent: of('opponent') };
  }, [mcq, so.step]);
  const battleAt = so.step === 'battle' && state.advanceAt !== null ? state.advanceAt - SHOOTOUT_BATTLE_MS : null;
  const t = battleAt === null ? -1 : now - battleAt;

  const kickKey = mcq?.key ?? 0;
  // Each side's answer time (null: no answer).
  const times = useMemo(() => {
    if (!mcq) return null;
    const of = (side: DuelSide) => (mcq.answeredAt[side] === null ? null : mcq.answeredAt[side]! - mcq.startedAt);
    return { player: of('player'), opponent: of('opponent') };
  }, [mcq]);

  const lastKick = so.step === 'kick' || so.step === 'done' ? so.kicks[so.kicks.length - 1] : null;
  const showQuestion = so.step === 'mcq' && mcq;
  const insets = useMemo(() => ({ top: 96, bottom: showQuestion ? 300 : 0, left: 0, right: 0 }), [showQuestion]);
  const youShoot = shooter === 'player';

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-surface-page text-white" data-zm-shootout={so.step}>
      <div className="absolute inset-0">
        <ZoneMatch3D
          state={scene}
          player={player}
          opponent={opponent}
          insets={insets}
          moment={null}
          swapSides={swap}
          fallback={<div className="absolute inset-0 bg-surface-page-alt" />}
        />
      </div>

      <div className="absolute inset-x-0 top-0 z-20">
        <PenaltyHUD
          penaltyPlayerScore={goals.player}
          penaltyOpponentScore={goals.opponent}
          penaltyPlayerAttempts={attempts('player')}
          penaltyOpponentAttempts={attempts('opponent')}
          playerPoints={points?.player}
          opponentPoints={points?.opponent}
          penaltyRound={Math.floor(so.kicks.length / 2) + 1}
          isPenaltySuddenDeath={isSuddenDeath(so.kicks)}
          isPlayerShooter={youShoot}
          playerName={player.name}
          opponentName={opponent.name}
          playerAvatarUrl=""
          opponentAvatarUrl=""
          playerAvatarCustomization={player.avatarCustomization}
          opponentAvatarCustomization={opponent.avatarCustomization}
          playerRankPoints={player.rankPoints}
          opponentRankPoints={opponent.rankPoints}
          timeRemaining={timeLeft}
          phase={so.step === 'mcq' ? 'penalty-playing' : 'penalty-result'}
          onQuit={onQuit}
        />
      </div>

      {/* Who's shooting this kick. */}
      <AnimatePresence>
        {so.step === 'mcq' && (
          <motion.div key={`role-${kickKey}`} className="absolute inset-x-0 top-[104px] z-20 flex justify-center" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className={cn('rounded-full px-4 py-1.5 text-xs uppercase tracking-wider shadow-lg', youShoot ? 'bg-brand-blue' : 'bg-brand-red-soft')} style={poppins}>
              {youShoot ? 'You shoot — beat the keeper to it' : `${opponent.name} shoots — answer faster to save it`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The question, then its answers revealed while the points fly. */}
      {showQuestion && (
        <div className="absolute inset-x-0 bottom-0 z-20 mx-auto w-full max-w-xl px-3 pb-4">
          <McqPanel state={state} mcq={mcq} now={now} revealed={so.step !== 'mcq'} timeLeft={timeLeft} onAnswer={onAnswer} />
        </div>
      )}

      {/* Who was faster: the answers, each side's time, the gap. */}
      <AnimatePresence>
        {so.step === 'battle' && mcq && times && points && t >= 0 && (
          <SpeedVerdict key={`speed-${kickKey}`} mcq={mcq} times={times} points={points} shooter={shooter} opponent={opponent} reveal={t >= TIMES_AT} />
        )}
      </AnimatePresence>

      {/* The kick's result, over the 3D shot. */}
      <AnimatePresence>
        {lastKick && so.step === 'kick' && (
          <motion.div
            key={`kick-${so.kicks.length}`}
            className="pointer-events-none absolute inset-x-0 top-[22%] z-20 flex justify-center"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0, 1, 1], scale: [0.6, 0.6, 1.15, 1] }}
            transition={{ duration: 1.6, times: [0, 0.55, 0.75, 1] }}
            exit={{ opacity: 0 }}
          >
            <span className={cn('text-5xl uppercase italic drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] sm:text-7xl', lastKick.result === 'goal' ? 'text-brand-yellow' : 'text-white')} style={poppins}>
              {lastKick.result === 'goal' ? 'Goal!' : lastKick.result === 'saved' ? 'Saved!' : 'Missed!'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {so.step === 'intro' && <ShootoutIntro key="intro" opponent={opponent} score={state.score.player} opener={so.opener} count={Math.max(1, timeLeft)} />}
      </AnimatePresence>
      <PenaltyMatchEndOverlay
        visible={so.step === 'done'}
        playerWon={so.winner === 'player'}
        myPenaltyGoals={goals.player}
        oppPenaltyGoals={goals.opponent}
        playerName={player.name}
        opponentName={opponent.name}
        playerAvatarCustomization={player.avatarCustomization}
        opponentAvatarCustomization={opponent.avatarCustomization}
        playerRankPoints={player.rankPoints}
        opponentRankPoints={opponent.rankPoints}
      />
    </div>
  );
}

const fmt = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`);

/**
 * The kick's verdict, before the shot: both answers (right / wrong) with each side's time on a 0–12 s track, the
 * faster right answer marked, and what it means for the kick.
 */
function SpeedVerdict({
  mcq,
  times,
  points,
  shooter,
  opponent,
  reveal,
}: {
  mcq: NonNullable<MatchState['mcq']>;
  times: Record<DuelSide, number | null>;
  points: Record<DuelSide, number>;
  shooter: DuelSide;
  opponent: ZoneMatchSeat;
  reveal: boolean;
}) {
  const right = (side: DuelSide) => mcq.answers[side] === mcq.question.correctIndex;
  const keeper = otherZoneSide(shooter);
  const faster: DuelSide | null = right('player') && right('opponent') ? (points.player === points.opponent ? null : points.player > points.opponent ? 'player' : 'opponent') : null;
  const verdict =
    right(shooter) && !right(keeper)
      ? 'Keeper got it wrong — the shot is on'
      : right(shooter) && right(keeper)
        ? faster === shooter
          ? 'Shooter was faster — the shot is on'
          : faster === keeper
            ? 'Keeper was faster — it will be saved'
            : 'Dead level — the keeper holds'
        : !right(shooter) && !right(keeper)
          ? 'Both wrong — it goes wide'
          : 'Shooter got it wrong — keeper saves';
  const rows: { side: DuelSide; name: string }[] = [
    { side: 'player', name: 'You' },
    { side: 'opponent', name: opponent.name },
  ];
  return (
    <motion.div
      className="absolute inset-x-0 top-[120px] z-20 mx-auto w-[min(92vw,460px)] rounded-[20px] bg-surface-page/90 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <div className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Who was faster?</div>
      <div className="space-y-2.5">
        {rows.map(({ side, name }) => {
          const ok = right(side);
          const ms = times[side];
          const pct = ms === null ? 100 : Math.min(100, (ms / MCQ_MS) * 100);
          const wins = faster === side;
          return (
            <div key={side} className="grid grid-cols-[72px_1fr_56px] items-center gap-2">
              <div className={cn('truncate text-xs uppercase', side === 'player' ? 'text-brand-blue' : 'text-brand-red-soft')} style={poppins}>
                {name}
              </div>
              <div className="relative h-3 rounded-full bg-white/10">
                <motion.div
                  className={cn('absolute inset-y-0 left-0 rounded-full', ok ? (wins ? 'bg-brand-yellow' : 'bg-brand-green') : 'bg-white/25')}
                  initial={{ width: 0 }}
                  animate={{ width: reveal ? `${pct}%` : 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className={cn('text-right text-sm tabular-nums', ok ? 'text-white' : 'text-white/40 line-through')} style={poppins}>
                {reveal ? fmt(ms) : ''}
              </div>
            </div>
          );
        })}
      </div>
      <motion.div
        className="mt-3 text-center text-sm text-brand-yellow"
        style={poppins}
        initial={{ opacity: 0 }}
        animate={{ opacity: reveal ? 1 : 0 }}
        transition={{ delay: 0.5 }}
      >
        {faster && times.player !== null && times.opponent !== null ? `⚡ ${faster === 'player' ? 'You' : opponent.name} by ${(Math.abs(times.player - times.opponent) / 1000).toFixed(1)}s · ` : ''}
        {verdict}
      </motion.div>
    </motion.div>
  );
}

/** Penalties begin: over the stadium, the title, how it works, who shoots first, a short countdown. */
function ShootoutIntro({ opponent, score, opener, count }: { opponent: ZoneMatchSeat; score: number; opener: DuelSide; count: number }) {
  const pips = (
    <div className="flex gap-1.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="size-2.5 rounded-full bg-white/25" />
      ))}
    </div>
  );
  return (
    <motion.div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-page/55 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-md text-center" initial={{ y: 16, scale: 0.96 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
        <div className="text-[11px] font-black uppercase tracking-[0.25em] text-white/60">{score}–{score} after full time</div>
        <h1 className="mt-1 text-5xl uppercase italic text-white sm:text-6xl" style={poppins}>
          Penalties
        </h1>
        <div className="mx-auto mt-2 h-1 w-20 rounded-full bg-brand-yellow" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {(['player', 'opponent'] as const).map((side) => (
            <div key={side} className={cn('flex flex-col items-center gap-2 rounded-2xl bg-white/[0.06] px-3 py-3 ring-1', side === 'player' ? 'ring-brand-blue/50' : 'ring-brand-red-soft/50')}>
              <span className={cn('truncate text-sm uppercase', side === 'player' ? 'text-brand-blue' : 'text-brand-red-soft')} style={poppins}>
                {side === 'player' ? 'You' : opponent.name}
              </span>
              {pips}
              {opener === side && <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[10px] font-black uppercase text-surface-page">Shoots first</span>}
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-white/70">
          Same question for both. Right and <span className="text-brand-yellow">faster</span> than the keeper = goal. 5 each, then sudden death.
        </p>
        <motion.div key={count} className="mt-5 text-4xl text-brand-yellow" style={poppins} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          {count}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
