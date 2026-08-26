'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Crown } from 'lucide-react';
import type { AuctionGameState, AuctionPlayer, PositionGroup } from '../../types';
import {
  formatMoney,
  getTotalTeamValue,
  getFilledCount,
  needsPosition,
  computeSquadChemistry,
  chemistryMultiplier,
  orderPlayersHumanCentered,
  AUCTION_SQUAD_SIZE,
} from '../../data';
import { poppins } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { SquadPitch } from './SquadPitch';
import { ProgressDots } from './ProgressDots';
import { ChemistryBadge } from '../shared/ChemistryPanel';
import { DisconnectedPitchOverlay } from './DisconnectedPitchOverlay';

/** One squad: name + crown, budget/value, pitch, progress dots. */
function SquadColumn({
  player,
  state,
  humanPlayerId,
  highlightId,
  pitchSize,
  activePosition,
  disconnected,
}: {
  player: AuctionPlayer;
  state: AuctionGameState;
  humanPlayerId: string;
  highlightId?: string;
  pitchSize: 'sm' | 'md' | 'lg';
  activePosition?: PositionGroup;
  disconnected?: boolean;
}) {
  const { t } = useLocale();
  const isHuman = player.id === humanPlayerId;
  const value = getTotalTeamValue(player.team);
  const filled = getFilledCount(player.team);
  const chem = computeSquadChemistry(player.team).total;
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
            title={t('auctionGame.rivalLeading')}
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

      {/* Squad chemistry — total + value multiplier */}
      <div className="mb-2 flex justify-center">
        <ChemistryBadge total={chem} multiplier={chemistryMultiplier(chem)} />
      </div>

      {/* Pitch */}
      <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-[18px]">
        <div className={disconnected ? 'brightness-[0.28] saturate-50 blur-[1px]' : undefined}>
          <SquadPitch
            player={player}
            formation={state.formation}
            highlightId={highlightId}
            size={pitchSize}
            activePosition={activePosition}
            showYouBadge={isHuman}
            needGlow={showNeedGlow}
            isHuman={isHuman}
            showChemistry
          />
        </div>
        {disconnected && <DisconnectedPitchOverlay playerName={player.username} />}
      </div>

      {/* Progress dots */}
      <div className="mt-1.5">
        <ProgressDots filled={filled} total={AUCTION_SQUAD_SIZE} />
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
  disconnectedSeatIds = [],
}: {
  state: AuctionGameState;
  humanPlayerId: string;
  highlightId?: string;
  pitchSize?: 'sm' | 'md' | 'lg';
  activePosition?: PositionGroup;
  disconnectedSeatIds?: readonly string[];
}) {
  const { t } = useLocale();
  // Keep YOU in the center column on desktop: split the others around the human.
  const sorted = orderPlayersHumanCentered(state.players, humanPlayerId);

  // Mobile switcher: YOU first, then opponents.
  const tabOrder = [
    ...state.players.filter((p) => p.id === humanPlayerId),
    ...state.players.filter((p) => p.id !== humanPlayerId),
  ];
  const [activeId, setActiveId] = useState(humanPlayerId);
  const activePlayer = tabOrder.find((p) => p.id === activeId) ?? tabOrder[0];

  const disconnectedSeats = new Set(disconnectedSeatIds);
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
                  aria-pressed={sel}
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
          <SquadColumn player={activePlayer} disconnected={disconnectedSeats.has(activePlayer.id)} {...colProps} />
        </div>
      </div>

      {/* ── Desktop: full 3-up grid ── */}
      <div className="hidden lg:grid grid-cols-3 gap-3 w-full justify-items-center">
        {sorted.map((player) => (
          <SquadColumn
            key={player.id}
            player={player}
            disconnected={disconnectedSeats.has(player.id)}
            {...colProps}
          />
        ))}
      </div>
    </>
  );
}
