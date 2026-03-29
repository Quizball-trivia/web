'use client';

import { useMemo } from 'react';

import { Crown, Medal, Target, Timer, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { AchievementUnlockPayload, MatchFinalResultsPayload, MatchParticipant, MatchStandingPayload } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { AchievementUnlockStrip } from '@/features/game/components/AchievementUnlockStrip';

interface PartyQuizResultsScreenProps {
  finalResults: MatchFinalResultsPayload;
  participants: MatchParticipant[];
  selfUserId: string;
  unlockedAchievements?: AchievementUnlockPayload[];
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

interface StandingRow extends MatchStandingPayload {
  username: string;
  avatarUrl: string | null;
  isSelf: boolean;
  isWinner: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avatarFallback(name: string): string {
  const trimmed = name.trim();
  return trimmed.slice(0, 2).toUpperCase() || 'QB';
}

function formatAverageMs(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `${(value / 1000).toFixed(2)}s`;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const CONFETTI_COLORS = ['#FCD200', '#58CC02', '#1CB0F6', '#CE82FF', '#FF9600', '#FFE98A'];

// ---------------------------------------------------------------------------
// Confetti burst particles (appears for winner)
// ---------------------------------------------------------------------------

function CelebrationBurst() {
  const particles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: seededRandom(i * 13 + 7) * 320 - 160,
      y: seededRandom(i * 29 + 3) * -280 - 40,
      rotation: seededRandom(i * 47 + 11) * 720 - 360,
      scale: seededRandom(i * 61 + 5) * 0.6 + 0.4,
      color: CONFETTI_COLORS[Math.floor(seededRandom(i * 79 + 2) * CONFETTI_COLORS.length)],
      delay: seededRandom(i * 97 + 19) * 0.4,
      width: seededRandom(i * 41 + 13) > 0.5 ? 10 : 6,
      height: seededRandom(i * 53 + 17) > 0.5 ? 6 : 10,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/3"
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [0, 1, 1, 0],
            rotate: p.rotation,
            scale: [0, p.scale, p.scale, 0],
          }}
          transition={{
            duration: 1.4,
            delay: 0.3 + p.delay,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          <div
            className="rounded-sm"
            style={{
              width: p.width,
              height: p.height,
              background: p.color,
              boxShadow: `0 0 8px ${p.color}66`,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Podium card config
// ---------------------------------------------------------------------------

const PODIUM_CONFIG = {
  1: {
    label: 'Champion',
    borderColor: 'border-[#FCD200]/50',
    borderBottom: 'border-b-[#C9A600]',
    bg: 'bg-gradient-to-b from-[#FCD200]/16 to-[#FCD200]/4',
    glow: 'shadow-[0_0_60px_rgba(252,208,0,0.15)]',
    accentColor: 'text-[#FCD200]',
    iconBg: 'bg-[#FCD200]/15',
    avatarRing: 'ring-4 ring-[#FCD200]/30 border-[#FCD200]/50',
    Icon: Crown,
  },
  2: {
    label: 'Second',
    borderColor: 'border-white/12',
    borderBottom: 'border-b-white/18',
    bg: 'bg-white/[0.04]',
    glow: '',
    accentColor: 'text-white/70',
    iconBg: 'bg-white/8',
    avatarRing: 'ring-2 ring-white/15 border-white/20',
    Icon: Medal,
  },
  3: {
    label: 'Third',
    borderColor: 'border-[#FF9600]/30',
    borderBottom: 'border-b-[#CC7800]',
    bg: 'bg-[#FF9600]/[0.06]',
    glow: '',
    accentColor: 'text-[#FF9600]',
    iconBg: 'bg-[#FF9600]/12',
    avatarRing: 'ring-2 ring-[#FF9600]/20 border-[#FF9600]/30',
    Icon: Medal,
  },
} as const;

// ---------------------------------------------------------------------------
// Podium card
// ---------------------------------------------------------------------------

function PodiumCard({ standing, index, className }: { standing: StandingRow; index: number; className?: string }) {
  const config = PODIUM_CONFIG[standing.rank as 1 | 2 | 3] ?? PODIUM_CONFIG[3];
  const { Icon } = config;
  const isChampion = standing.rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.15 + index * 0.12,
        type: 'spring',
        stiffness: 300,
        damping: 24,
      }}
      className={cn(
        'relative overflow-hidden rounded-3xl border-2 border-b-4 font-fun',
        className,
        config.borderColor,
        config.borderBottom,
        config.bg,
        config.glow,
      )}
    >
      {/* Inner glow for champion */}
      {isChampion && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(252,208,0,0.12),_transparent_60%)]" />
      )}

      <div className="relative p-4 sm:p-5">
        {/* Header: label + icon */}
        <div className="flex items-center justify-between">
          <span className={cn('text-[10px] font-black uppercase tracking-[0.26em]', config.accentColor)}>
            {config.label}
          </span>
          <div className={cn('flex size-7 items-center justify-center rounded-lg', config.iconBg)}>
            <Icon className={cn('size-3.5', config.accentColor)} />
          </div>
        </div>

        {/* Avatar + name + points */}
        <div className="mt-3 flex flex-col items-center text-center">
          <motion.div
            initial={isChampion ? { scale: 0.5, rotate: -10 } : { scale: 0.8 }}
            animate={isChampion ? { scale: 1, rotate: 0 } : { scale: 1 }}
            transition={{
              delay: isChampion ? 0.35 : 0.3 + index * 0.12,
              type: 'spring',
              stiffness: 260,
              damping: 18,
            }}
          >
            <Avatar className={cn('size-16 border-2 shadow-xl', config.avatarRing)}>
              <AvatarImage
                src={resolveAvatarUrl(standing.avatarUrl, `podium-${standing.userId}`, 128)}
                alt={standing.username}
              />
              <AvatarFallback className="bg-[#243B44] text-base font-black text-white">
                {avatarFallback(standing.username)}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          <div className="mt-2.5 max-w-full truncate text-base font-black text-white">
            {standing.username}
          </div>

          {standing.isSelf && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 400, damping: 20 }}
              className="mt-1 rounded-full bg-[#1CB0F6]/18 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-[#A9E6FF]"
            >
              You
            </motion.div>
          )}

          {/* Points */}
          <div className="mt-2 text-xl font-black tabular-nums text-white">
            {standing.totalPoints}
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-white/40">pts</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] font-bold text-white/50">
          <span className="flex items-center gap-1">
            <Target className="size-3 text-white/35" />
            {standing.correctAnswers} correct
          </span>
          <span className="size-0.5 rounded-full bg-white/20" />
          <span className="flex items-center gap-1">
            <Timer className="size-3 text-white/35" />
            {formatAverageMs(standing.avgTimeMs)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Podium grid class — adapts columns to player count
// ---------------------------------------------------------------------------

function podiumGridClass(count: number): string {
  if (count === 1) return 'grid grid-cols-1 place-items-center gap-3';
  if (count <= 2) return 'grid grid-cols-2 gap-3';
  return 'grid grid-cols-2 gap-3 sm:grid-cols-3';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PartyQuizResultsScreen({
  finalResults,
  participants,
  selfUserId,
  unlockedAchievements = [],
  onPlayAgain,
  onMainMenu,
}: PartyQuizResultsScreenProps) {
  const standings = useMemo<StandingRow[]>(() => {
    const participantMap = new Map(participants.map((participant) => [participant.userId, participant]));
    const fallbackStandings = Object.entries(finalResults.players)
      .map(([userId, stats], index) => ({
        userId,
        rank: index + 1,
        totalPoints: stats.totalPoints,
        correctAnswers: stats.correctAnswers,
        avgTimeMs: stats.avgTimeMs,
      }))
      .sort((left, right) => {
        if (left.totalPoints !== right.totalPoints) return right.totalPoints - left.totalPoints;
        if (left.correctAnswers !== right.correctAnswers) return right.correctAnswers - left.correctAnswers;
        return (left.avgTimeMs ?? Number.MAX_SAFE_INTEGER) - (right.avgTimeMs ?? Number.MAX_SAFE_INTEGER);
      })
      .map((standing, index) => ({ ...standing, rank: index + 1 }));

    const authoritativeStandings = finalResults.standings?.length ? finalResults.standings : fallbackStandings;

    return authoritativeStandings.map((standing) => {
      const participant = participantMap.get(standing.userId);
      return {
        ...standing,
        username: participant?.username ?? 'Player',
        avatarUrl: participant?.avatarUrl ?? null,
        isSelf: standing.userId === selfUserId,
        isWinner: finalResults.winnerId === standing.userId,
      };
    });
  }, [finalResults.players, finalResults.standings, finalResults.winnerId, participants, selfUserId]);

  const podium = standings.slice(0, 3);
  const rest = standings.slice(3);
  const localStanding = standings.find((standing) => standing.isSelf) ?? null;
  const selfWon = finalResults.winnerId === selfUserId;
  const selfOnPodium = localStanding != null && localStanding.rank <= podium.length;

  const resultLabel = selfWon
    ? 'You won the party quiz!'
    : finalResults.winnerId
      ? `${standings.find((s) => s.userId === finalResults.winnerId)?.username ?? 'Winner'} takes first!`
      : 'Party quiz finished in a tie!';

  return (
    <div className="min-h-dvh bg-[#0f1420] text-white relative overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(252,208,0,0.14),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(28,176,246,0.12),_transparent_36%)]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
      />

      {/* Confetti for winner */}
      <AnimatePresence>
        {selfWon && <CelebrationBurst />}
      </AnimatePresence>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6 sm:px-6 sm:py-8">
        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center font-fun"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 22 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#FCD200]/25 bg-[#FCD200]/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.26em] text-[#FFE98A]"
          >
            <Trophy className="size-3.5" />
            Party Quiz
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={cn(
              'mt-3 text-xl font-black tracking-tight sm:text-2xl',
              selfWon ? 'text-[#FCD200]' : 'text-white',
            )}
            style={selfWon ? { textShadow: '0 0 30px rgba(252,208,0,0.25)' } : undefined}
          >
            {resultLabel}
          </motion.h1>
        </motion.div>

        {/* ─── Podium ─── */}
        <div className={cn('mt-5', podiumGridClass(podium.length))}>
          {podium.map((standing, index) => (
            <PodiumCard
              key={standing.userId}
              standing={standing}
              index={index}
              className={podium.length === 1 ? 'mx-auto w-full max-w-[200px]' : undefined}
            />
          ))}
        </div>

        {/* ─── Your Finish — only when player is NOT visible on podium ─── */}
        {localStanding && !selfOnPodium && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 rounded-2xl border-2 border-b-4 border-[#1CB0F6]/30 border-b-[#0E8AC7] bg-[#1CB0F6]/8 px-4 py-3.5 font-fun"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#A9E6FF]">Your Finish</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-black text-white">#{localStanding.rank}</span>
                  <span className="text-sm font-bold text-white/60">
                    {localStanding.totalPoints} pts
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5 text-[11px] font-bold text-white/70">
                <span className="rounded-lg bg-white/8 px-2.5 py-1">{localStanding.correctAnswers} correct</span>
                <span className="rounded-lg bg-white/8 px-2.5 py-1">{formatAverageMs(localStanding.avgTimeMs)} avg</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Full standings (remaining players beyond podium) ─── */}
        {rest.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-4 rounded-2xl border-2 border-b-4 border-white/8 border-b-white/12 bg-[#131F24]/80 p-3.5 backdrop-blur sm:p-4"
          >
            <div className="flex items-center justify-between px-1 pb-3">
              <span className="text-[10px] font-fun font-black uppercase tracking-[0.24em] text-white/40">
                Full Standings
              </span>
              <span className="rounded-lg bg-white/6 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                {standings.length} players
              </span>
            </div>

            <div className="space-y-2">
              {rest.map((standing, i) => (
                <motion.div
                  key={standing.userId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.06 }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border border-b-2 px-3 py-3 font-fun',
                    standing.isSelf
                      ? 'border-[#1CB0F6]/25 border-b-[#0E8AC7]/30 bg-[#1CB0F6]/8'
                      : 'border-white/6 border-b-white/10 bg-white/[0.02]',
                  )}
                >
                  <span className="w-8 text-center text-sm font-black tabular-nums text-white/45">
                    #{standing.rank}
                  </span>

                  <Avatar className="size-9 border border-white/12 shrink-0">
                    <AvatarImage src={resolveAvatarUrl(standing.avatarUrl, `results-${standing.userId}`, 72)} alt={standing.username} />
                    <AvatarFallback className="bg-[#243B44] text-[10px] font-black text-white">
                      {avatarFallback(standing.username)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-white">{standing.username}</span>
                      {standing.isSelf && (
                        <span className="rounded bg-[#1CB0F6]/18 px-1.5 py-0.5 text-[8px] font-black uppercase text-[#A9E6FF]">
                          You
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex gap-2 text-[11px] font-bold text-white/45">
                      <span>{standing.totalPoints} pts</span>
                      <span>{standing.correctAnswers} correct</span>
                      <span>{formatAverageMs(standing.avgTimeMs)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <AchievementUnlockStrip
          achievements={unlockedAchievements}
          className="mt-4"
        />

        {/* ─── Action buttons (3D Duolingo style) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="mt-5 flex gap-2.5 pb-2"
        >
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 rounded-2xl bg-[#58CC02] border-b-4 border-b-[#46A302] px-5 py-3.5 text-sm font-black font-fun text-white transition-all hover:bg-[#61D802] active:border-b-2 active:translate-y-[2px]"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="flex-1 rounded-2xl bg-white/[0.04] border-2 border-white/10 border-b-4 border-b-white/15 px-5 py-3.5 text-sm font-black font-fun text-white/80 transition-all hover:bg-white/[0.07] active:border-b-2 active:translate-y-[2px]"
          >
            Main Menu
          </button>
        </motion.div>
      </div>
    </div>
  );
}
