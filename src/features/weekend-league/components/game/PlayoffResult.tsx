'use client';

import { motion } from 'motion/react';
import { TierFrameAvatar } from '@/components/TierFrameAvatar';
import { poppins } from '../../constants';
import type { LeaguePlayer } from '../../types';
import type { PlayoffRoundDef } from '../../mock-data';

/** Post-playoff-match result: head-to-head score and what it means for your run. */
export function PlayoffResult({
  round,
  opponent,
  youPoints,
  oppPoints,
  won,
  onContinue,
}: {
  round: PlayoffRoundDef;
  opponent: LeaguePlayer;
  youPoints: number;
  oppPoints: number;
  won: boolean;
  onContinue: () => void;
}) {
  const isFinal = round.nextName === null;
  const champion = won && isFinal;

  const headline = champion ? '🏆 Champion!' : won ? 'You won!' : 'Knocked out';
  const headlineColor = won ? 'text-brand-gold' : 'text-brand-red-soft';
  const verdict = champion
    ? 'You won the Weekend League. Prizes are on the way.'
    : won
      ? `Through to the ${round.nextName}.`
      : `You finish ${round.eliminationPlacement}. So close.`;

  const continueLabel = won && !isFinal ? `Play the ${round.nextName}` : 'Continue';

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col justify-center px-4 py-6 font-fun">
      <div className="text-center">
        <div className="font-poppins text-[11px] font-black uppercase tracking-[0.28em] text-brand-cyan">{round.name}</div>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 15 }}
          className={`mt-2 font-poppins text-4xl font-black uppercase ${headlineColor}`}
          style={poppins}
        >
          {headline}
        </motion.div>
      </div>

      {/* Head-to-head */}
      <div className="mt-6 flex items-stretch gap-3">
        <Side name="You" avatar="avatar-1" tier="Captain" country="GE" points={youPoints} win={won} />
        <div className="flex items-center font-poppins text-lg font-black text-white/40">vs</div>
        <Side
          name={opponent.username}
          avatar={opponent.avatar}
          tier={opponent.tier}
          country={opponent.country}
          points={oppPoints}
          win={!won}
        />
      </div>

      <div
        className={`mt-6 rounded-[24px] border-2 p-5 text-center ${
          won ? 'border-brand-gold/40 bg-brand-gold/10' : 'border-white/10 bg-surface-card-deep'
        }`}
      >
        <p className="font-poppins text-[15px] font-bold text-white/85">{verdict}</p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className={`mt-6 h-14 w-full rounded-2xl font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors ${
          won ? 'bg-brand-green hover:bg-brand-green/90' : 'bg-white/10 hover:bg-white/15'
        }`}
      >
        {continueLabel}
      </button>
    </div>
  );
}

function Side({
  name,
  avatar,
  tier,
  country,
  points,
  win,
}: {
  name: string;
  avatar: string;
  tier: string;
  country: string;
  points: number;
  win: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 p-4 ${
        win ? 'border-brand-green/50 bg-brand-green/10' : 'border-white/10 bg-surface-card-deep'
      }`}
    >
      <TierFrameAvatar tier={tier} avatarCustomization={{ base: avatar }} avatarFallback={avatar} countryCode={country} size="md" />
      <span className="w-full truncate text-center font-poppins text-sm font-black uppercase text-white">{name}</span>
      <span className={`font-poppins text-3xl font-black tabular-nums ${win ? 'text-brand-yellow' : 'text-white/50'}`} style={poppins}>
        {points}
      </span>
    </div>
  );
}
