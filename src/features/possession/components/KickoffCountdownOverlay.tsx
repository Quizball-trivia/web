'use client';

import { motion } from 'motion/react';

import { AvatarPreview } from '@/components/AvatarPreview';
import { cn } from '@/lib/utils';
import type { AvatarCustomization } from '@/types/game';

interface KickoffCountdownOverlayProps {
  countdownDisplay: number;
  label?: string;
  finished?: boolean;
  durationMs?: number;
  runKey?: string | number;
  playerName: string;
  opponentName: string;
  playerAvatarBase?: string;
  opponentAvatarBase?: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  className?: string;
}

export function KickoffCountdownOverlay({
  countdownDisplay,
  label = 'Kickoff',
  finished = false,
  durationMs = 5_000,
  runKey = 'kickoff',
  playerName,
  opponentName,
  playerAvatarBase = 'avatar-1',
  opponentAvatarBase = 'avatar-2',
  playerAvatarCustomization,
  opponentAvatarCustomization,
  className,
}: KickoffCountdownOverlayProps) {
  const playerCustomization = playerAvatarCustomization ?? { base: playerAvatarBase };
  const opponentCustomization = opponentAvatarCustomization ?? { base: opponentAvatarBase };

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
        />

        <div className="flex flex-col items-center justify-center">
          <div className="font-fun text-[9px] font-black uppercase tracking-[0.28em] text-brand-yellow sm:text-[11px]">
            {label}
          </div>
          <motion.div
            key={countdownDisplay}
            initial={{ y: -22, scale: 1.55, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 460, damping: 17 }}
            className="mt-2 flex size-24 items-center justify-center rounded-full border-4 border-brand-cyan bg-brand-blue shadow-[0_0_60px_rgba(28,176,246,0.45)] sm:size-36"
          >
            <span className="font-fun text-5xl font-black leading-none tabular-nums text-white sm:text-7xl">
              {countdownDisplay}
            </span>
          </motion.div>
          <div className="mt-3 h-1 w-20 overflow-hidden rounded-full bg-white/15 sm:w-28">
            <motion.div
              key={`bar-${runKey}`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: durationMs / 1000, ease: 'linear' }}
              className="h-full rounded-full bg-brand-yellow"
            />
          </div>
        </div>

        <KickoffPlayerCard
          align="right"
          name={opponentName}
          label="Away"
          avatarCustomization={opponentCustomization}
        />
      </motion.div>

      <motion.div
        initial={false}
        animate={finished ? { y: 0, scale: 1, opacity: 1 } : { y: 42, scale: 0.82, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="font-fun text-5xl font-black uppercase italic tracking-wide text-brand-yellow drop-shadow-[0_10px_0_rgba(0,0,0,0.35)] sm:text-7xl">
          Kickoff
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
}: {
  align: 'left' | 'right';
  name: string;
  label: string;
  avatarCustomization: AvatarCustomization;
}) {
  const isOpponent = align === 'right';

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
        className="relative mt-2 flex aspect-[5/6] w-[112px] items-end justify-center overflow-hidden rounded-[16px] bg-brand-blue sm:w-[200px] sm:rounded-[20px] md:w-[240px]"
      >
        <AvatarPreview
          customization={avatarCustomization}
          width={96}
          className={cn('translate-y-3 sm:hidden', isOpponent && '-scale-x-100')}
        />
        <AvatarPreview
          customization={avatarCustomization}
          width={170}
          className={cn('hidden translate-y-5 sm:block md:hidden', isOpponent && '-scale-x-100')}
        />
        <AvatarPreview
          customization={avatarCustomization}
          width={210}
          className={cn('hidden translate-y-7 md:block', isOpponent && '-scale-x-100')}
        />
      </motion.div>
      <div className="mt-2 max-w-[130px] truncate text-center font-poppins text-base font-black uppercase tracking-wide text-white sm:mt-4 sm:max-w-[260px] sm:text-2xl md:text-3xl">
        {name}
      </div>
    </motion.div>
  );
}
