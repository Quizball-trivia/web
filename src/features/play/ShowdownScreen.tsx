import { useEffect } from 'react';
import { motion } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AvatarCustomization } from '@/types/game';
import { getTierAccent } from '@/utils/tierVisuals';

interface PlayerShowdownInfo {
  avatar: string;
  avatarCustomization?: AvatarCustomization | null;
  username: string;
  rankPoints?: number;
  level?: number;
  tier?: string;
  country?: string;
  countryCode?: string;
  flag?: string;
}

interface ShowdownScreenProps {
  player: PlayerShowdownInfo;
  opponent: PlayerShowdownInfo;
  onContinue: () => void;
  matchType?: 'ranked' | 'friendly';
}

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

function PlayerSide({
  info,
  side,
  frameColor,
}: {
  info: PlayerShowdownInfo;
  side: 'left' | 'right';
  frameColor: string;
}) {
  const countryCode = info.countryCode ?? (info.country?.length === 2 ? info.country : null);

  const tierAccent = info.tier ? getTierAccent(info.tier) : undefined;
  const xpBlue = '#48C7FF';

  return (
    <motion.div
      initial={{ x: side === 'left' ? -180 : 180, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 18 }}
      className="flex flex-col items-center"
    >
      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        className="relative flex aspect-square w-[180px] items-end justify-center overflow-hidden rounded-2xl sm:w-[220px] md:w-[260px]"
        style={{ backgroundColor: frameColor }}
      >
        <AvatarDisplay
          customization={info.avatarCustomization ?? { base: info.avatar || 'avatar-1' }}
          size="xxl"
          shape="square"
          className="!size-full !rounded-none bg-transparent"
          countryCode={countryCode}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-5 max-w-[220px] truncate text-center text-2xl uppercase text-white sm:max-w-[260px] sm:text-3xl"
        style={poppins}
      >
        {info.username}
      </motion.div>

      {(info.level !== undefined || info.rankPoints !== undefined || info.tier) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85 }}
          className="mt-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] sm:text-xs"
          style={poppins}
        >
          {info.level !== undefined && (
            <span style={{ color: xpBlue }}>LVL {info.level}</span>
          )}
          {info.level !== undefined && info.rankPoints !== undefined && (
            <span className="text-white/40">/</span>
          )}
          {info.rankPoints !== undefined && (
            <span className="text-white">{info.rankPoints} RP</span>
          )}
          {(info.level !== undefined || info.rankPoints !== undefined) && info.tier && (
            <span className="text-white/40">/</span>
          )}
          {info.tier && <span style={{ color: tierAccent }}>{info.tier}</span>}
        </motion.div>
      )}
    </motion.div>
  );
}

export function ShowdownScreen({ player, opponent, onContinue, matchType = 'ranked' }: ShowdownScreenProps) {
  const playerCountryCode = player.countryCode || player.flag || undefined;
  const opponentCountryCode = opponent.countryCode || opponent.flag || undefined;

  useEffect(() => {
    const timer = setTimeout(() => onContinue(), 4500);
    return () => clearTimeout(timer);
  }, [onContinue]);

  const isRanked = matchType === 'ranked';
  const accentMatch = '#BA02E8';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#071013] px-4">
      <div className="relative z-10 grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-start gap-4 sm:gap-8 md:gap-12">
        <div className="flex justify-center">
          <PlayerSide
            info={{ ...player, countryCode: playerCountryCode }}
            side="left"
            frameColor="#3B5BFF"
          />
        </div>

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center self-center text-center"
        >
          <span
            className="text-6xl uppercase text-white sm:text-7xl md:text-8xl"
            style={poppins}
          >
            VS
          </span>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="mt-5 text-lg uppercase text-white sm:text-xl md:text-2xl"
            style={poppins}
          >
            {isRanked ? 'Ranked Match' : 'Friendly Match'}{' '}
            <span style={{ color: accentMatch }}>1v1</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
            className="mt-2 text-[11px] uppercase tracking-[0.16em] text-white/55 sm:text-xs"
            style={poppins}
          >
            Get ready for kickoff
          </motion.div>
        </motion.div>

        <div className="flex justify-center">
          <PlayerSide
            info={{ ...opponent, countryCode: opponentCountryCode }}
            side="right"
            frameColor="#3B5BFF"
          />
        </div>
      </div>
    </div>
  );
}
