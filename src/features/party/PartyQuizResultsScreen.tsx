'use client';

import { useMemo } from 'react';

import { Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AchievementUnlockPayload, MatchFinalResultsPayload, MatchParticipant, MatchStandingPayload } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { AchievementUnlockStrip } from '@/features/game/components/AchievementUnlockStrip';
import type { AvatarCustomization } from '@/types/game';

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
  avatarCustomization?: AvatarCustomization | null;
  isSelf: boolean;
  isWinner: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const CONFETTI_COLORS = ['#FFE500', '#38B60E', '#1645FF', '#CE82FF', '#FF9600', '#FF4B4B'];

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
          transition={{ duration: 1.4, delay: 0.3 + p.delay, ease: [0.34, 1.56, 0.64, 1] }}
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

// ─── Per-rank style — shared with the in-match standings sidebar ───────────

const RANK_HEX: Record<number, string> = {
  1: '#FFE500', // yellow podium
  2: '#38B60E', // green podium
  3: '#1645FF', // blue podium
  4: '#FF9600',
  5: '#FF4B4B',
  6: '#CE82FF',
};

function getRankHex(rank: number): string {
  return RANK_HEX[rank] ?? RANK_HEX[6]!;
}

function getRankClasses(rank: number): { border: string; pillBg: string; pillText: string; tint: string } {
  switch (rank) {
    case 1:
      return { border: 'border-brand-yellow', pillBg: 'bg-brand-yellow', pillText: 'text-surface-page', tint: 'bg-brand-yellow/[0.08]' };
    case 2:
      return { border: 'border-brand-green', pillBg: 'bg-brand-green', pillText: 'text-white', tint: 'bg-brand-green/[0.08]' };
    case 3:
      return { border: 'border-brand-blue', pillBg: 'bg-brand-blue', pillText: 'text-white', tint: 'bg-brand-blue/[0.08]' };
    case 4:
      return { border: 'border-brand-orange', pillBg: 'bg-brand-orange', pillText: 'text-white', tint: 'bg-brand-orange/[0.08]' };
    case 5:
      return { border: 'border-brand-red-soft', pillBg: 'bg-brand-red-soft', pillText: 'text-white', tint: 'bg-brand-red-soft/[0.08]' };
    default:
      return { border: 'border-brand-purple', pillBg: 'bg-brand-purple', pillText: 'text-white', tint: 'bg-brand-purple/[0.08]' };
  }
}

// ─── Podium block (top 3) ──────────────────────────────────────────────────

const PODIUM_HEIGHT: Record<1 | 2 | 3, string> = {
  1: 'h-44 sm:h-52',
  2: 'h-36 sm:h-44',
  3: 'h-28 sm:h-36',
};

function PodiumBlock({ standing, displayIndex }: { standing: StandingRow; displayIndex: number }) {
  const rank = standing.rank as 1 | 2 | 3;
  const colorHex = getRankHex(rank);
  const heightClass = PODIUM_HEIGHT[rank] ?? PODIUM_HEIGHT[3];
  const textOnBlock = rank === 1 ? 'text-surface-page' : 'text-white';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + displayIndex * 0.12, type: 'spring', stiffness: 300, damping: 24 }}
      className="flex flex-col items-center"
    >
      {/* Avatar hovering above the block — only the feet kiss the top edge so
          the character reads as floating on top of the podium (matches the
          leaderboard podium layout). */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + displayIndex * 0.12, type: 'spring', stiffness: 260, damping: 18 }}
        className="relative z-10 mb-[-6px]"
      >
        <AvatarDisplay
          customization={standing.avatarCustomization ?? { base: standing.avatarUrl ?? undefined }}
          size="lg"
        />
      </motion.div>

      <div
        className={cn(
          'relative w-full rounded-2xl px-3 pt-4 pb-3 flex flex-col items-center justify-end gap-1',
          heightClass,
        )}
        style={{
          backgroundColor: colorHex,
          boxShadow: `0 8px 30px ${colorHex}33`,
        }}
      >
        <div
          className={cn('font-poppins text-center text-[13px] sm:text-sm font-semibold uppercase tracking-wider truncate max-w-full', textOnBlock)}
        >
          {standing.username}
        </div>
        <div className={cn('font-poppins text-2xl font-extrabold tabular-nums', textOnBlock)}>
          {standing.totalPoints}
        </div>
        {standing.isSelf && (
          <span className="mt-1 rounded-full bg-brand-orange px-2 py-[2px] font-poppins text-[9px] font-semibold uppercase tracking-wider text-white">
            You
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Standings row (rank 4+) — mirrors the in-match standings sidebar ──────

function RankRow({ standing, displayIndex }: { standing: StandingRow; displayIndex: number }) {
  const rs = getRankClasses(standing.rank);
  const colorHex = getRankHex(standing.rank);
  const selfGlow = standing.isSelf
    ? `0 0 18px ${colorHex}88, 0 0 36px ${colorHex}44`
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + displayIndex * 0.06 }}
      className="flex items-center gap-2"
    >
      <div
        className={cn(
          'flex flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 border-2',
          rs.border,
          standing.isSelf ? rs.tint : 'bg-transparent',
        )}
        style={{ boxShadow: selfGlow }}
      >
        {/* Rank pill */}
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] font-poppins text-base font-extrabold tabular-nums',
            rs.pillBg,
            rs.pillText,
          )}
          style={{ boxShadow: `0 1.76px 6.334px 1.32px ${colorHex}40` }}
        >
          {standing.rank}
        </span>

        <AvatarDisplay
          customization={standing.avatarCustomization ?? { base: standing.avatarUrl ?? undefined }}
          size="sm"
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <span className="block truncate font-poppins text-base font-semibold text-white">
            {standing.username}
          </span>
        </div>

        <span className="font-poppins text-base font-extrabold tabular-nums text-white shrink-0">
          {standing.totalPoints}
        </span>
      </div>

      {standing.isSelf && (
        <span
          className="flex shrink-0 self-stretch items-center justify-center rounded-[16px] bg-brand-orange px-4 font-poppins text-sm font-extrabold uppercase tracking-wider text-white"
          style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(255,150,0,0.3)' }}
        >
          You
        </span>
      )}
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

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
        avatarCustomization: participant?.avatarCustomization ?? null,
        isSelf: standing.userId === selfUserId,
        isWinner: finalResults.winnerId === standing.userId,
      };
    });
  }, [finalResults.players, finalResults.standings, finalResults.winnerId, participants, selfUserId]);

  const podium = standings.slice(0, 3);
  const rest = standings.slice(3);
  const selfWon = finalResults.winnerId === selfUserId;

  const resultLabel = selfWon
    ? 'You won the party quiz!'
    : finalResults.winnerId
      ? `${standings.find((s) => s.userId === finalResults.winnerId)?.username ?? 'Winner'} takes first!`
      : 'Party quiz finished in a tie!';

  // Display order on the podium: 2nd-place block on left, 1st in middle, 3rd on right
  // (matches the leaderboard podium layout). Falls back gracefully for <3 players.
  const podiumDisplayOrder = useMemo(() => {
    if (podium.length < 3) return podium;
    const [first, second, third] = podium;
    return [second!, first!, third!];
  }, [podium]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface-page-alt text-white">
      <AnimatePresence>{selfWon && <CelebrationBurst />}</AnimatePresence>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 22 }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-brand-yellow bg-transparent px-4 py-1.5 font-poppins text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-yellow"
          >
            <Trophy className="size-3.5" />
            Party Quiz
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={cn(
              'mt-4 font-poppins text-2xl sm:text-3xl font-extrabold tracking-tight',
              selfWon ? 'text-brand-yellow' : 'text-white',
            )}
            style={selfWon ? { textShadow: '0 0 30px rgba(255,229,0,0.3)' } : undefined}
          >
            {resultLabel}
          </motion.h1>
        </motion.div>

        {/* ─── Podium ─── */}
        {podium.length > 0 && (
          <div
            className={cn(
              'mt-12 grid gap-3 items-end',
              podium.length === 1 ? 'grid-cols-1 place-items-center max-w-xs mx-auto' : '',
              podium.length === 2 ? 'grid-cols-2' : '',
              podium.length === 3 ? 'grid-cols-3' : '',
            )}
          >
            {podiumDisplayOrder.map((standing, index) => (
              <PodiumBlock key={standing.userId} standing={standing} displayIndex={index} />
            ))}
          </div>
        )}

        {/* ─── Below-podium rankings (rank 4+) ─── */}
        {rest.length > 0 && (
          <div className="mt-8 space-y-2">
            {rest.map((standing, index) => (
              <RankRow key={standing.userId} standing={standing} displayIndex={index} />
            ))}
          </div>
        )}

        <AchievementUnlockStrip achievements={unlockedAchievements} className="mt-6" />

        {/* ─── Action buttons (flat, Poppins) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="mt-8 flex gap-3 pb-4"
        >
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 rounded-2xl bg-brand-green px-5 py-3.5 font-poppins text-base font-semibold uppercase tracking-wider text-white transition-colors hover:bg-brand-green-deep"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="flex-1 rounded-2xl border-2 border-white/15 bg-transparent px-5 py-3.5 font-poppins text-base font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/5"
          >
            Main Menu
          </button>
        </motion.div>
      </div>
    </div>
  );
}
