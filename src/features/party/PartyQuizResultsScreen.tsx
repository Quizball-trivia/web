'use client';

import { useMemo, useState } from 'react';

import { AnimatePresence, motion } from 'motion/react';

import { AvatarDisplay } from '@/components/AvatarDisplay';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import type { AchievementUnlockPayload, MatchFinalResultsPayload, MatchParticipant, MatchStandingPayload } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { AchievementUnlockStrip } from '@/features/game/components/AchievementUnlockStrip';
import { useLocale } from '@/contexts/LocaleContext';
import type { AvatarCustomization } from '@/types/game';
import { applyXpReward, getMatchXpReward } from '@/lib/domain/matchXp';
import type { UserProgression } from '@/lib/domain/progression';

interface PartyQuizResultsScreenProps {
  finalResults: MatchFinalResultsPayload;
  participants: MatchParticipant[];
  selfUserId: string;
  unlockedAchievements?: AchievementUnlockPayload[];
  preMatchProgression?: UserProgression | null;
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
  1: '#38B60E', // green podium
  2: '#FFE500', // yellow podium
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

const PODIUM_HEIGHT_CLASS: Record<1 | 2 | 3, string> = {
  1: 'h-40 sm:h-52',
  2: 'h-32 sm:h-40',
  3: 'h-24 sm:h-32',
};

// Visual column order on the podium: 2nd on left, 1st in middle, 3rd on right.
// Using CSS `order` keeps 1st centered even when the array is iterated in rank
// order — important so the grid columns stay rank-correct on every breakpoint.
const PODIUM_COLUMN_ORDER: Record<1 | 2 | 3, string> = {
  1: 'order-2',
  2: 'order-1',
  3: 'order-3',
};

function PodiumBlock({ standing, displayIndex }: { standing: StandingRow; displayIndex: number }) {
  const rank = standing.rank as 1 | 2 | 3;
  const colorHex = getRankHex(rank);
  const heightClass = PODIUM_HEIGHT_CLASS[rank] ?? PODIUM_HEIGHT_CLASS[3];
  const orderClass = PODIUM_COLUMN_ORDER[rank] ?? PODIUM_COLUMN_ORDER[3];
  const nameTextOnBlock = rank === 2 ? 'text-black' : 'text-white';
  const scoreTextOnBlock = rank === 2 ? 'text-black' : 'text-brand-yellow';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + displayIndex * 0.12, type: 'spring', stiffness: 300, damping: 24 }}
      className={cn('flex min-w-0 flex-col items-center justify-end', orderClass)}
    >
      {/* Real responsive avatar size, not transform scale, so mobile columns keep honest dimensions. */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + displayIndex * 0.12, type: 'spring', stiffness: 260, damping: 18 }}
        className="relative z-10 mb-1 flex h-16 items-end justify-center sm:mb-2 sm:h-24"
      >
        <AvatarDisplay
          customization={standing.avatarCustomization ?? { base: standing.avatarUrl ?? undefined }}
          size="lg"
          className="size-16 sm:size-24"
        />
      </motion.div>

      <div
        data-testid={`party-podium-block-${rank}`}
        className={cn(
          'relative flex w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl',
          'gap-1 px-2 py-2 sm:gap-1.5 sm:px-3 sm:py-3',
          heightClass,
        )}
        style={{
          backgroundColor: colorHex,
          boxShadow: `0 8px 30px ${colorHex}33`,
        }}
      >
        <span
          className={cn(
            'flex h-10 min-w-12 shrink-0 items-center justify-center rounded-[12px] bg-surface-page px-3 font-poppins text-lg font-extrabold tabular-nums text-white sm:h-11 sm:min-w-14 sm:rounded-[14px] sm:text-xl',
            'ring-2',
          )}
          style={{
            color: colorHex,
            boxShadow: `0 1.76px 6.334px 1.32px ${colorHex}55`,
            ['--tw-ring-color' as string]: colorHex,
          }}
        >
          {standing.rank}
        </span>

        <div
          className={cn('w-full max-w-full truncate px-1 text-center font-poppins text-base font-semibold uppercase leading-tight tracking-wider sm:text-xl', nameTextOnBlock)}
        >
          {standing.username}
        </div>
        <div className={cn('font-poppins text-3xl font-extrabold tabular-nums leading-none sm:text-4xl', scoreTextOnBlock)}>
          {standing.totalPoints}
        </div>
        {standing.isSelf && (
          <span className="rounded-full bg-brand-orange px-3 py-[3px] font-poppins text-[11px] font-semibold uppercase leading-none tracking-wider text-white sm:text-xs">
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
  preMatchProgression = null,
  onPlayAgain,
  onMainMenu,
}: PartyQuizResultsScreenProps) {
  const { t } = useLocale();
  const [isReturningToLobby, setIsReturningToLobby] = useState(false);
  const handlePlayAgain = () => {
    if (isReturningToLobby) return;
    setIsReturningToLobby(true);
    onPlayAgain();
  };
  const standings = useMemo<StandingRow[]>(() => {
    const participantMap = new Map(participants.map((participant) => [participant.userId, participant]));
    const payloadStandingMap = new Map((finalResults.standings ?? []).map((standing) => [standing.userId, standing]));
    const userIds = Array.from(
      new Set([
        ...Object.keys(finalResults.players),
        ...(finalResults.standings ?? []).map((standing) => standing.userId),
        ...participants.map((participant) => participant.userId),
      ]),
    );

    return userIds
      .map((userId) => {
        const stats = finalResults.players[userId];
        const payloadStanding = payloadStandingMap.get(userId);
        const participant = participantMap.get(userId);

        return {
          userId,
          rank: 0,
          totalPoints: stats?.totalPoints ?? payloadStanding?.totalPoints ?? 0,
          correctAnswers: stats?.correctAnswers ?? payloadStanding?.correctAnswers ?? 0,
          avgTimeMs: stats?.avgTimeMs ?? payloadStanding?.avgTimeMs ?? null,
          username: participant?.username ?? 'Player',
          avatarUrl: participant?.avatarUrl ?? null,
          avatarCustomization: participant?.avatarCustomization ?? null,
          isSelf: userId === selfUserId,
          isWinner: finalResults.winnerId === userId,
        };
      })
      .sort((left, right) => {
        if (left.totalPoints !== right.totalPoints) return right.totalPoints - left.totalPoints;
        if (left.correctAnswers !== right.correctAnswers) return right.correctAnswers - left.correctAnswers;
        const avgTimeDiff = (left.avgTimeMs ?? Number.MAX_SAFE_INTEGER) - (right.avgTimeMs ?? Number.MAX_SAFE_INTEGER);
        if (avgTimeDiff !== 0) return avgTimeDiff;
        const usernameDiff = left.username.localeCompare(right.username);
        if (usernameDiff !== 0) return usernameDiff;
        return left.userId.localeCompare(right.userId);
      })
      .map((standing, index) => ({ ...standing, rank: index + 1 }));
  }, [finalResults.players, finalResults.standings, finalResults.winnerId, participants, selfUserId]);

  const podium = standings.filter((standing) => standing.rank <= 3);
  const rest = standings.filter((standing) => standing.rank > 3);
  const selfWon = finalResults.winnerId === selfUserId;
  const selfStanding = standings.find((standing) => standing.userId === selfUserId) ?? null;
  const isDraw = finalResults.winnerId === null;
  const matchResult: 'win' | 'loss' | 'draw' = isDraw ? 'draw' : selfWon ? 'win' : 'loss';
  const xpEarned = getMatchXpReward({ mode: 'friendly', result: matchResult });
  const projectedProgression = preMatchProgression
    ? applyXpReward(preMatchProgression, xpEarned)
    : null;
  const leveledUp = Boolean(
    preMatchProgression && projectedProgression && projectedProgression.level > preMatchProgression.level
  );
  const xpToNextLevelAfterMatch = projectedProgression
    ? Math.max(0, projectedProgression.xpForNextLevel - projectedProgression.currentLevelXp)
    : 0;

  const resultLabel = selfWon
    ? t('partyResults.youWonPartyQuiz')
    : finalResults.winnerId
      ? t('partyResults.takesFirst', { winner: standings.find((s) => s.userId === finalResults.winnerId)?.username ?? t('partyResults.winnerFallback') })
      : t('partyResults.tied');

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
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={cn(
              'font-poppins text-2xl sm:text-3xl font-extrabold tracking-tight',
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
              'mt-10 grid items-end gap-2 sm:mt-12 sm:gap-3',
              podium.length === 1 ? 'grid-cols-1 place-items-center max-w-xs mx-auto' : '',
              podium.length === 2 ? 'grid-cols-2' : '',
              podium.length === 3 ? 'grid-cols-3' : '',
            )}
          >
            {podium.map((standing, index) => (
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

        {/* ─── Personal stats + XP footer ─── */}
        {(selfStanding || xpEarned > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-surface-card/70"
          >
            {selfStanding && (
              <div className="grid grid-cols-3 divide-x divide-white/10">
                <PartyStatCell
                  label={t('partyResults.statRank')}
                  value={`#${selfStanding.rank}`}
                />
                <PartyStatCell
                  label={t('partyResults.statCorrect')}
                  value={String(selfStanding.correctAnswers ?? 0)}
                />
                <PartyStatCell
                  label={t('partyResults.statPoints')}
                  value={String(selfStanding.totalPoints ?? 0)}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-white/10 px-5 py-3.5 text-center">
              {xpEarned > 0 ? (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                    {t('results.xp')}
                  </span>
                  <span className="text-[18px] font-semibold tabular-nums text-brand-green">
                    +{xpEarned}
                  </span>
                  {projectedProgression && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-cyan">
                      {leveledUp
                        ? t('results.levelUp', { level: projectedProgression.level })
                        : t('results.levelAndXpToNext', {
                            level: projectedProgression.level,
                            xp: xpToNextLevelAfterMatch,
                          })}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  {t('results.noXpEarned')}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── Action buttons (flat, Poppins) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="mt-8 flex gap-3 pb-4"
        >
          <button
            type="button"
            onClick={handlePlayAgain}
            disabled={isReturningToLobby}
            className="flex-1 rounded-2xl bg-brand-green px-5 py-3.5 font-poppins text-base font-semibold uppercase tracking-wider text-white transition-colors hover:bg-brand-green-deep disabled:opacity-60"
          >
            {t('partyResults.playAgain')}
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            disabled={isReturningToLobby}
            className="flex-1 rounded-2xl border-2 border-white/15 bg-transparent px-5 py-3.5 font-poppins text-base font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/5 disabled:opacity-60"
          >
            {t('partyResults.mainMenu')}
          </button>
        </motion.div>
      </div>
      <AnimatePresence>
        {isReturningToLobby && (
          <motion.div
            key="party-returning-to-lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-surface-page-alt/90 backdrop-blur-sm"
          >
            <LoadingScreen text={t('partyResults.returningToLobby')} fullScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PartyStatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 py-3">
      <div className="font-poppins text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
        {label}
      </div>
      <div className="mt-1 font-poppins text-2xl font-extrabold tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}
