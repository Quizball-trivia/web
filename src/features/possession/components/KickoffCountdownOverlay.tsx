'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, LoaderCircle } from 'lucide-react';

import { MatchCountdownPuck } from '@/components/shared/MatchCountdownPuck';
import { RankFrameCard } from '@/features/profile/components/RankFrameCard';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { useTierLabel } from '@/hooks/useTierLabel';
import { playBgm } from '@/lib/sounds/gameSounds';
import { tierFromRp } from '@/utils/rankedTier';
import type { AvatarCustomization } from '@/types/game';

type CountdownPhase = 'kickoff' | 'resume';

interface KickoffCountdownOverlayProps {
  countdownDisplay: number;
  phase?: CountdownPhase;
  finished?: boolean;
  waiting?: boolean;
  waitingLabel?: string;
  waitingDetailLabel?: string;
  playerReady?: boolean;
  opponentReady?: boolean;
  durationMs?: number;
  runKey?: string | number;
  playerName: string;
  opponentName: string;
  playerAvatarBase?: string;
  opponentAvatarBase?: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  /** Ranked points — when provided, the player is shown inside their tier's
   *  shield frame instead of the plain blue card. */
  playerRankPoints?: number | null;
  opponentRankPoints?: number | null;
  className?: string;
}

export function KickoffCountdownOverlay({
  countdownDisplay,
  phase = 'kickoff',
  finished = false,
  waiting = false,
  waitingLabel,
  waitingDetailLabel,
  playerReady,
  opponentReady,
  durationMs = 5_000,
  runKey = 'kickoff',
  playerName,
  opponentName,
  playerAvatarBase = 'avatar-1',
  opponentAvatarBase = 'avatar-2',
  playerAvatarCustomization,
  opponentAvatarCustomization,
  playerRankPoints,
  opponentRankPoints,
  className,
}: KickoffCountdownOverlayProps) {
  const { t } = useLocale();
  const playerCustomization = playerAvatarCustomization ?? { base: playerAvatarBase };
  const opponentCustomization = opponentAvatarCustomization ?? { base: opponentAvatarBase };
  const isKickoff = phase === 'kickoff';
  const headerLabel = waiting
    ? (waitingLabel ?? t('possession.startingSoon'))
    : isKickoff
      ? t('possession.kickoffIn')
      : t('possession.resumingIn');
  const resolvedLabel = isKickoff ? t('possession.kickoff') : t('possession.resuming');

  useEffect(() => {
    if (!isKickoff) return;
    playBgm('kickoff');
  }, [isKickoff]);

  return (
    <div
      className={cn(
        '@container relative flex min-h-[420px] items-center justify-center overflow-hidden px-[clamp(0.75rem,4cqw,2rem)] py-[clamp(1.5rem,5cqw,2.5rem)]',
        className,
      )}
    >
      <motion.div
        key={`bg-${runKey}`}
        initial={{ scale: 1, opacity: 0.65 }}
        animate={{ scale: 1.04, opacity: 1 }}
        transition={{ duration: durationMs / 1000, ease: 'linear' }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(28,176,246,0.16),transparent_30%),radial-gradient(circle_at_20%_52%,rgba(22,69,255,0.22),transparent_26%),radial-gradient(circle_at_80%_52%,rgba(255,229,0,0.12),transparent_28%)]"
      />

      <motion.div
        animate={finished ? { y: -110, opacity: 0, scale: 0.96 } : { y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className="relative flex w-full max-w-5xl flex-col items-center bg-transparent p-[clamp(0.375rem,1.5cqw,1rem)]"
      >
        {!waiting ? (
          <div className="relative z-10 mb-[clamp(0.6rem,2.4cqw,1rem)] max-w-[min(86cqw,28rem)] rounded-2xl bg-black/28 px-[clamp(0.75rem,3cqw,1.25rem)] py-[clamp(0.35rem,1.4cqw,0.55rem)] text-balance text-center font-poppins text-[clamp(0.72rem,3.2cqw,0.95rem)] font-black uppercase leading-tight tracking-[0.12em] text-brand-yellow shadow-[0_0_28px_rgba(28,176,246,0.14)] backdrop-blur-sm">
            {headerLabel}
          </div>
        ) : null}

        <div className="grid w-full grid-cols-[minmax(0,1fr)_clamp(5rem,21cqw,6.5rem)_minmax(0,1fr)] items-center gap-[clamp(0.4rem,1.8cqw,1rem)]">
          <KickoffPlayerCard
            align="left"
            name={playerName}
            avatarCustomization={playerCustomization}
            rankPoints={playerRankPoints}
            ready={playerReady}
            showReadyStatus={waiting || playerReady !== undefined}
          />

          <MatchCountdownPuck
            label=""
            seconds={countdownDisplay}
            waiting={waiting}
            detailLabel={waitingDetailLabel}
            durationMs={waiting ? undefined : durationMs}
            runKey={runKey}
            size={waiting ? 'sm' : 'kickoff'}
          />

          <KickoffPlayerCard
            align="right"
            name={opponentName}
            avatarCustomization={opponentCustomization}
            rankPoints={opponentRankPoints}
            ready={opponentReady}
            showReadyStatus={waiting || opponentReady !== undefined}
          />
        </div>
      </motion.div>

      <motion.div
        initial={false}
        animate={finished ? { y: 0, scale: 1, opacity: 1 } : { y: 42, scale: 0.82, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="font-fun text-5xl font-black uppercase italic tracking-wide text-brand-yellow drop-shadow-[0_10px_0_rgba(0,0,0,0.35)] sm:text-7xl">
          {resolvedLabel}
        </div>
      </motion.div>
    </div>
  );
}

function KickoffPlayerCard({
  align,
  name,
  avatarCustomization,
  rankPoints,
  ready,
  showReadyStatus = false,
}: {
  align: 'left' | 'right';
  name: string;
  avatarCustomization: AvatarCustomization;
  rankPoints?: number | null;
  ready?: boolean;
  showReadyStatus?: boolean;
}) {
  const isOpponent = align === 'right';
  const { t } = useLocale();
  const tierLabelOf = useTierLabel();
  const tier = tierFromRp(rankPoints ?? 0);

  return (
    <motion.div
      initial={{ x: align === 'left' ? -28 : 28, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 250, damping: 22 }}
      className="flex min-w-0 flex-col items-center bg-transparent px-[clamp(0.125rem,1cqw,0.75rem)] py-2"
    >
      <motion.div
        initial={{ scale: 0.82 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.12, type: 'spring', stiffness: 200 }}
        className="relative"
      >
        {showReadyStatus && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 18 }}
            className={cn(
              'absolute -top-[clamp(0.95rem,3.6cqw,1.35rem)] left-1/2 z-20 flex size-[clamp(1.85rem,6.7cqw,2.35rem)] -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface-card shadow-[0_8px_24px_rgba(0,0,0,0.36)]',
              ready
                ? 'bg-brand-green text-white shadow-[0_6px_18px_rgba(88,204,2,0.45)]'
                : 'bg-black/62 text-brand-cyan backdrop-blur-md',
            )}
            aria-label={ready ? t('friend.ready') : t('friend.waiting')}
            title={ready ? t('friend.ready') : t('friend.waiting')}
          >
            {ready ? (
              <Check className="size-[clamp(0.95rem,3.6cqw,1.25rem)] stroke-[4]" />
            ) : (
              <LoaderCircle className="size-[clamp(0.95rem,3.6cqw,1.25rem)] animate-spin" />
            )}
          </motion.div>
        )}
        <RankFrameCard
          tier={tier}
          tierLabel={tierLabelOf(tier)}
          rpLabel={`${rankPoints ?? 0}RP`}
          customization={avatarCustomization}
          mirrored={isOpponent}
          sizes="(min-width: 1024px) 224px, (min-width: 640px) 168px, 136px"
          className="w-[clamp(6.8rem,34cqw,14rem)]"
        />
      </motion.div>
      <div className="mt-[clamp(0.5rem,1.8cqw,1rem)] max-w-[min(35cqw,15rem)] truncate text-center font-poppins text-[clamp(1rem,4.6cqw,1.75rem)] font-black uppercase tracking-wide text-white">
        {name}
      </div>
    </motion.div>
  );
}
