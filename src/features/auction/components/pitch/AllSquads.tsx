'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Crown } from 'lucide-react';
import type { AuctionGameState, AuctionPlayer, PositionGroup } from '../../types';
import { formatMoney, getTotalTeamValue, getFilledCount, needsPosition } from '../../data';
import { poppins } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { SquadPitch } from './SquadPitch';

/** One squad: name + crown, budget/value, pitch, progress dots. */
function SquadColumn({
  player,
  state,
  humanPlayerId,
  highlightId,
  pitchSize,
  activePosition,
}: {
  player: AuctionPlayer;
  state: AuctionGameState;
  humanPlayerId: string;
  highlightId?: string;
  pitchSize: 'sm' | 'md' | 'lg';
  activePosition?: PositionGroup;
}) {
  const { t } = useLocale();
  const isHuman = player.id === humanPlayerId;
  const value = getTotalTeamValue(player.team);
  const filled = getFilledCount(player.team);
  const isHighBidder = state.currentRound?.highestBidderId === player.id;
  const needsActivePos = activePosition ? needsPosition(player, activePosition) : false;
  // Squads still chasing the player being auctioned glow — yellow for YOU,
  // neutral white for opponents — so you can see who you're up against.
  const showNeedGlow = !!activePosition && needsActivePos && !player.isEliminated;

  return (
    <div className={`w-full max-w-[320px] p-1 transition-all ${player.isEliminated ? 'opacity-40' : ''}`}>
      {/* Header — centered name + (high-bidder crown) */}
      <div className="flex items-center justify-center gap-1.5 mb-1.5 px-0.5">
        <span className="max-w-full truncate text-center text-sm sm:text-base font-black text-white uppercase" style={poppins}>
          {player.username}
        </span>
        {isHighBidder && (
          <motion.span
            key="crown"
            initial={{ scale: 0, rotate: -30, y: -6 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14 }}
            className="shrink-0"
            title="Leading bid"
          >
            <Crown className="size-4 text-brand-yellow" fill="currentColor" />
          </motion.span>
        )}
      </div>

      {/* Budget + value — centered above the pitch */}
      <div className="mb-2 flex items-center justify-center gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] sm:text-[11px] text-white/55 font-semibold uppercase" style={poppins}>
            {t('auctionGame.budgetLabel')}
          </span>
          <span
            className="text-sm sm:text-base text-brand-yellow tabular-nums font-black"
            style={{ ...poppins, textShadow: '0 1px 6px rgba(255,229,0,0.2)' }}
          >
            {formatMoney(player.budget)}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] sm:text-[11px] text-white/55 font-semibold uppercase" style={poppins}>
            {t('auctionGame.valueLabel')}
          </span>
          <span className="text-sm sm:text-base text-white tabular-nums font-black" style={poppins}>
            {formatMoney(value)}
          </span>
        </div>
      </div>

      {/* Pitch */}
      <div className="mx-auto w-full max-w-[320px]">
        <SquadPitch
          player={player}
          formation={state.formation}
          highlightId={highlightId}
          size={pitchSize}
          activePosition={activePosition}
          showYouBadge={isHuman}
          needGlow={showNeedGlow}
          isHuman={isHuman}
        />
      </div>

      {/* Progress dots */}
      <div className="flex gap-[3px] mt-1.5 justify-center">
        {Array.from({ length: 11 }).map((_, i) => (
          <div
            key={i}
            className={`h-[5px] w-[5px] sm:h-1.5 sm:w-1.5 rounded-full transition-colors ${
              i < filled ? 'bg-brand-green' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/** Desktop: 3-up grid (YOU centered). Mobile: a segmented switcher that swaps
 *  which single squad's pitch is shown. */
export function AllSquads({
  state,
  humanPlayerId,
  highlightId,
  pitchSize = 'md',
  activePosition,
}: {
  state: AuctionGameState;
  humanPlayerId: string;
  highlightId?: string;
  pitchSize?: 'sm' | 'md' | 'lg';
  activePosition?: PositionGroup;
}) {
  const { t } = useLocale();
  // Keep YOU in the center column on desktop: split the others around the human.
  const human = state.players.filter((p) => p.id === humanPlayerId);
  const others = state.players.filter((p) => p.id !== humanPlayerId);
  const leftCount = Math.floor(others.length / 2);
  const sorted = [...others.slice(0, leftCount), ...human, ...others.slice(leftCount)];

  // Mobile switcher: YOU first, then opponents.
  const tabOrder = [...human, ...others];
  const [activeId, setActiveId] = useState(humanPlayerId);
  const activePlayer = tabOrder.find((p) => p.id === activeId) ?? tabOrder[0];

  const colProps = { state, humanPlayerId, highlightId, pitchSize, activePosition };

  return (
    <>
      {/* ── Mobile: segmented switcher + single pitch ── */}
      <div className="lg:hidden">
        {tabOrder.length > 1 && (
          <div className="mx-auto mb-3 flex max-w-[320px] rounded-full bg-white/[0.06] p-1">
            {tabOrder.map((p) => {
              const sel = p.id === activeId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={`min-w-0 flex-1 truncate rounded-full px-2 py-1.5 text-[11px] font-black uppercase transition-colors ${
                    sel ? 'bg-brand-yellow text-black' : 'text-white/60'
                  }`}
                  style={poppins}
                >
                  {p.id === humanPlayerId ? t('auctionGame.you') : p.username}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex justify-center">
          <SquadColumn player={activePlayer} {...colProps} />
        </div>
      </div>

      {/* ── Desktop: full 3-up grid ── */}
      <div className="hidden lg:grid grid-cols-3 gap-3 w-full justify-items-center">
        {sorted.map((player) => (
          <SquadColumn key={player.id} player={player} {...colProps} />
        ))}
      </div>
    </>
  );
}
