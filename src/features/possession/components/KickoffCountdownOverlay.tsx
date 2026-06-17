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
        'relative flex min-h-[420px] items-center justify-center overflow-hidden px-4 py-8 sm:min-h-[500px] sm:px-8',
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
        className="relative grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_116px_minmax(0,1fr)] items-center gap-2 bg-transparent p-3 sm:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)] sm:gap-8 sm:p-5 md:gap-12"
      >
        <KickoffPlayerCard
          align="left"
          name={playerName}
          label="Home"
          avatarCustomization={playerCustomization}
          rankPoints={playerRankPoints}
          ready={playerReady}
          showReadyStatus={waiting}
        />

        <MatchCountdownPuck
          label={headerLabel}
          seconds={countdownDisplay}
          waiting={waiting}
          detailLabel={waitingDetailLabel}
          durationMs={waiting ? undefined : durationMs}
          runKey={runKey}
          size="lg"
        />

        <KickoffPlayerCard
          align="right"
          name={opponentName}
          label="Away"
          avatarCustomization={opponentCustomization}
          rankPoints={opponentRankPoints}
          ready={opponentReady}
          showReadyStatus={waiting}
        />
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
  label,
  avatarCustomization,
  rankPoints,
  ready,
  showReadyStatus = false,
}: {
  align: 'left' | 'right';
  name: string;
  label: string;
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
      className="flex min-w-0 flex-col items-center bg-transparent px-1 py-2 sm:px-3"
    >
      <div className="font-fun text-[8px] font-black uppercase tracking-[0.25em] text-white/45 sm:text-[10px]">
        {label}
      </div>
      <motion.div
        initial={{ scale: 0.82 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.12, type: 'spring', stiffness: 200 }}
        className="relative mt-2"
      >
        {showReadyStatus && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 18 }}
            className={cn(
              'absolute top-1 z-20 flex size-9 items-center justify-center rounded-full border-2 border-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.3)] sm:size-11',
              isOpponent ? 'right-0 sm:right-1' : 'left-0 sm:left-1',
              ready ? 'bg-brand-green text-white' : 'bg-white/12 text-white backdrop-blur-md',
            )}
            aria-label={ready ? t('friend.ready') : t('friend.waiting')}
            title={ready ? t('friend.ready') : t('friend.waiting')}
          >
            {ready ? (
              <Check className="size-5 stroke-[4] sm:size-6" />
            ) : (
              <LoaderCircle className="size-5 animate-spin sm:size-6" />
            )}
          </motion.div>
        )}
        <RankFrameCard
          tier={tier}
          tierLabel={tierLabelOf(tier)}
          rpLabel={`${rankPoints ?? 0}RP`}
          customization={avatarCustomization}
          mirrored={isOpponent}
          sizes="(min-width: 768px) 240px, (min-width: 640px) 200px, 112px"
          className="w-[112px] sm:w-[200px] md:w-[240px]"
        />
      </motion.div>
      <div className="mt-2 max-w-[130px] truncate text-center font-poppins text-base font-black uppercase tracking-wide text-white sm:mt-4 sm:max-w-[260px] sm:text-2xl md:text-3xl">
        {name}
      </div>
    </motion.div>
  );
}
