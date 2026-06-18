'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { CountryFlag } from '@/components/CountryFlag';
import { getTierFrameSrc } from '@/utils/tierVisuals';
import { getClub } from '@/lib/clubs';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import type { AuctionPlayer } from '../types';

// Placeholder country + club per seat until the backend supplies real user
// profile data (favorite club + country). Picked deterministically by index so
// each player card looks distinct.
const PLACEHOLDER_COUNTRY_CODES = ['GE', 'BR', 'AR', 'ES'];
const PLACEHOLDER_CLUB_IDS = ['liverpool', 'chelsea', 'arsenal', 'everton'];
import { formatMoney, STARTING_BUDGET } from '../data';
import { poppins } from '../constants/auction.constants';

function FramedAvatar({
  avatarSeed,
  width,
  mirror,
  className,
  countryCode,
  clubId,
}: {
  avatarSeed: string;
  width: number;
  mirror?: boolean;
  className?: string;
  countryCode?: string | null;
  clubId?: string | null;
}) {
  const frameW = width;
  const frameH = Math.round(frameW * 1.58);
  const frameSrc = getTierFrameSrc('Academy');
  const chipW = Math.round(frameW * 0.22);
  const club = getClub(clubId ?? null);

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

      {/* Flag — top-left, plain rectangular chip */}
      {countryCode && (
        <div
          className="absolute left-[11%] top-[12%] z-20 overflow-hidden rounded-[3px] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
          style={{ width: chipW, height: Math.round(chipW * 0.67) }}
        >
          <CountryFlag
            code={countryCode}
            className="!h-full !w-full"
            style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
        </div>
      )}

      {/* Club badge — top-right, plain logo (no background), larger than the flag */}
      {club && (
        <div
          className="absolute right-[10%] top-[8%] z-20 flex items-center justify-center"
          style={{ width: Math.round(chipW * 1.25), height: Math.round(chipW * 1.25) }}
        >
          <Image
            src={club.logo}
            alt={club.label}
            width={80}
            height={80}
            unoptimized
            className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
          />
        </div>
      )}
    </div>
  );
}

function PlayerSide({
  player,
  isHuman,
  index,
}: {
  player: AuctionPlayer;
  isHuman: boolean;
  index: number;
}) {
  const { t } = useLocale();
  const mirror = index > 0;
  // Placeholder flag + club per seat (real values come from the backend later).
  const countryCode = PLACEHOLDER_COUNTRY_CODES[index % PLACEHOLDER_COUNTRY_CODES.length];
  const clubId = PLACEHOLDER_CLUB_IDS[index % PLACEHOLDER_CLUB_IDS.length];

  const enterFrom = { x: index === 0 ? -180 : index === 2 ? 180 : 0, y: index === 1 ? 80 : 0, opacity: 0 };

  return (
    <motion.div
      initial={enterFrom}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ delay: 0.3 + index * 0.12, type: 'spring', stiffness: 120, damping: 18 }}
      className="flex flex-col items-center"
    >
      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 + index * 0.12, type: 'spring', stiffness: 200 }}
        className="relative flex w-[88px] sm:w-[180px] md:w-[220px] items-center justify-center"
      >
        <FramedAvatar
          avatarSeed={player.avatarSeed}
          width={88}
          mirror={mirror}
          className="sm:hidden"
          countryCode={countryCode}
          clubId={clubId}
        />
        <FramedAvatar
          avatarSeed={player.avatarSeed}
          width={180}
          mirror={mirror}
          className="hidden sm:block md:hidden"
          countryCode={countryCode}
          clubId={clubId}
        />
        <FramedAvatar
          avatarSeed={player.avatarSeed}
          width={220}
          mirror={mirror}
          className="hidden md:block"
          countryCode={countryCode}
          clubId={clubId}
        />
      </motion.div>

      {/* Budget pill — same style as RP pill in ranked showdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 + index * 0.12 }}
        className="mt-2 sm:mt-3 flex h-6 w-[80px] items-center justify-center rounded-[8px] bg-brand-yellow text-[10px] uppercase text-surface-page sm:h-10 sm:w-[160px] sm:rounded-[12px] sm:text-[17px] md:w-[180px]"
        style={poppins}
      >
        {formatMoney(STARTING_BUDGET)}
      </motion.div>

      {/* Username */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 + index * 0.12 }}
        className="mt-1.5 sm:mt-3 max-w-[84px] truncate text-center text-[11px] uppercase text-white sm:max-w-[200px] sm:text-2xl"
        style={poppins}
      >
        {player.username}
      </motion.div>

      {/* Label — only the human gets a "You" tag. AI opponents are intentionally
          indistinguishable from real players (no "Bot" disclosure). */}
      {isHuman && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95 + index * 0.12 }}
          className="mt-0.5 text-[10px] uppercase sm:mt-1 sm:text-sm"
          style={{ ...poppins, color: '#FFE500' }}
        >
          {t('auctionGame.youLabel')}
        </motion.div>
      )}
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
  const { t } = useLocale();
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 4500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Always horizontal — 3 players in a row with VS dividers (like the draft
  // banning banner). Cards scale down on mobile so all three fit side by side.
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-surface-page px-2 sm:px-4">
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
                  {t('auctionGame.vs')}
                </span>
              </motion.div>
            )}
            <div className="flex justify-center">
              <PlayerSide
                player={player}
                isHuman={player.id === humanPlayerId}
                index={i}
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
        <span className="text-brand-green">{t('auctionGame.auctionPlayerCount', { count: players.length })}</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.45, 1, 0.45] }}
        transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
        className="relative z-10 mt-1 text-[9px] uppercase tracking-[0.12em] text-white/55 sm:mt-2 sm:text-xs sm:tracking-[0.16em]"
        style={poppins}
      >
        <span className="sm:hidden">{t('auctionGame.getReady')}</span>
        <span className="hidden sm:inline">{t('auctionGame.getReadyToBid')}</span>
      </motion.div>
    </div>
  );
}
