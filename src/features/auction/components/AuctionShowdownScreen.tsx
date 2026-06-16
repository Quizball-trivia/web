'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { getTierFrameSrc } from '@/utils/tierVisuals';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import type { AuctionPlayer } from '../types';
import { formatMoney, STARTING_BUDGET } from '../data';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

function FramedAvatar({
  avatarSeed,
  width,
  mirror,
  className,
}: {
  avatarSeed: string;
  width: number;
  mirror?: boolean;
  className?: string;
}) {
  const frameW = width;
  const frameH = Math.round(frameW * 1.58);
  const frameSrc = getTierFrameSrc('Academy');

  return (
    <div className={cn('relative', className)} style={{ width: frameW, height: frameH }}>
      <Image
        src={frameSrc}
        alt=""
        width={frameW}
        height={frameH}
        className="absolute inset-0 z-0 h-full w-full object-contain pointer-events-none"
      />
      <div className="absolute inset-x-0 bottom-[8%] top-[22%] z-10 flex items-center justify-center overflow-hidden">
        <AvatarPreview
          customization={{ base: avatarSeed || 'avatar-1' }}
          width={Math.round(frameW * 0.64)}
          className={cn(mirror && '-scale-x-100')}
        />
      </div>
    </div>
  );
}

function PlayerSide({
  player,
  isHuman,
  index,
  variant = 'horizontal',
}: {
  player: AuctionPlayer;
  isHuman: boolean;
  index: number;
  variant?: 'horizontal' | 'vertical';
}) {
  const isVertical = variant === 'vertical';
  const mirror = index > 0;

  const enterFrom = isVertical
    ? { y: index === 0 ? -120 : 120, opacity: 0 }
    : { x: index === 0 ? -180 : index === 2 ? 180 : 0, y: index === 1 ? 80 : 0, opacity: 0 };
  const enterTo = isVertical ? { y: 0, opacity: 1 } : { x: 0, y: 0, opacity: 1 };

  return (
    <motion.div
      initial={enterFrom}
      animate={enterTo}
      transition={{ delay: 0.3 + index * 0.12, type: 'spring', stiffness: 120, damping: 18 }}
      className="flex flex-col items-center"
    >
      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 + index * 0.12, type: 'spring', stiffness: 200 }}
        className={
          isVertical
            ? 'relative flex w-[160px] sm:w-[190px] items-center justify-center'
            : 'relative flex w-[120px] sm:w-[180px] md:w-[220px] items-center justify-center'
        }
      >
        {isVertical ? (
          <FramedAvatar avatarSeed={player.avatarSeed} width={160} mirror={mirror} />
        ) : (
          <>
            <FramedAvatar
              avatarSeed={player.avatarSeed}
              width={120}
              mirror={mirror}
              className="sm:hidden"
            />
            <FramedAvatar
              avatarSeed={player.avatarSeed}
              width={180}
              mirror={mirror}
              className="hidden sm:block md:hidden"
            />
            <FramedAvatar
              avatarSeed={player.avatarSeed}
              width={220}
              mirror={mirror}
              className="hidden md:block"
            />
          </>
        )}
      </motion.div>

      {/* Budget pill — same style as RP pill in ranked showdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 + index * 0.12 }}
        className={
          isVertical
            ? 'mt-3 flex h-9 w-[140px] items-center justify-center rounded-[12px] bg-brand-yellow text-[15px] uppercase text-surface-page'
            : 'mt-2 sm:mt-3 flex h-6 w-[90px] items-center justify-center rounded-[10px] bg-brand-yellow text-[10px] uppercase text-surface-page sm:h-10 sm:w-[160px] sm:rounded-[12px] sm:text-[17px] md:w-[180px]'
        }
        style={poppins}
      >
        {formatMoney(STARTING_BUDGET)}
      </motion.div>

      {/* Username */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 + index * 0.12 }}
        className={
          isVertical
            ? 'mt-2 max-w-[160px] truncate text-center text-[17px] uppercase text-white'
            : 'mt-1.5 sm:mt-3 max-w-[100px] truncate text-center text-xs uppercase text-white sm:max-w-[200px] sm:text-2xl'
        }
        style={poppins}
      >
        {player.username}
      </motion.div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.95 + index * 0.12 }}
        className={
          isVertical
            ? 'mt-1 text-[12px] uppercase'
            : 'mt-0.5 text-[10px] uppercase sm:mt-1 sm:text-sm'
        }
        style={{ ...poppins, color: isHuman ? '#FFE500' : '#56707A' }}
      >
        {isHuman ? 'You' : 'Bot'}
      </motion.div>
    </motion.div>
  );
}

export function AuctionShowdownScreen({
  players,
  humanPlayerId,
  onComplete,
}: {
  players: AuctionPlayer[];
  humanPlayerId: string;
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const isMobile = useIsMobile();
  const isVertical = isMobile;
  const accentMatch = '#1645FF';

  if (isVertical) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page px-4">
        <div className="relative z-10 flex flex-col items-center justify-center gap-4 py-6">
          {players.map((player, i) => (
            <div key={player.id} className="flex flex-col items-center">
              {i > 0 && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center text-center mb-4"
                >
                  <span className="text-3xl uppercase text-white" style={poppins}>
                    VS
                  </span>
                </motion.div>
              )}
              <PlayerSide
                player={player}
                isHuman={player.id === humanPlayerId}
                index={i}
                variant="vertical"
              />
            </div>
          ))}

          {/* Bottom labels */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mt-3 text-[13px] uppercase text-white"
            style={poppins}
          >
            Auction{' '}
            <span style={{ color: accentMatch }}>{players.length}-Player</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
            className="text-[10px] uppercase tracking-[0.18em] text-white/55"
            style={poppins}
          >
            Get ready to bid
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Horizontal: 3 players with VS dividers between ────────────────
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page px-2 sm:px-4">
      <div className="relative z-10 grid w-full max-w-6xl grid-cols-[1fr_auto_1fr_auto_1fr] items-start gap-1.5 sm:gap-4 md:gap-6">
        {players.map((player, i) => (
          <div key={player.id} className="contents">
            {i > 0 && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                className="flex flex-col items-center self-center text-center"
              >
                <span
                  className="text-2xl uppercase text-white sm:text-5xl md:text-6xl"
                  style={poppins}
                >
                  VS
                </span>
              </motion.div>
            )}
            <div className="flex justify-center">
              <PlayerSide
                player={player}
                isHuman={player.id === humanPlayerId}
                index={i}
                variant="horizontal"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom labels */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="relative z-10 mt-6 text-[10px] uppercase text-white sm:mt-8 sm:text-xl md:text-2xl"
        style={poppins}
      >
        Auction{' '}
        <span style={{ color: accentMatch }}>{players.length}-Player</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
        className="relative z-10 mt-1 text-[9px] uppercase tracking-[0.12em] text-white/55 sm:mt-2 sm:text-xs sm:tracking-[0.16em]"
        style={poppins}
      >
        <span className="sm:hidden">Get ready</span>
        <span className="hidden sm:inline">Get ready to bid</span>
      </motion.div>
    </div>
  );
}
