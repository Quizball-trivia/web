'use client';

import { motion } from 'motion/react';
import { Crown } from 'lucide-react';
import type { AuctionGameState, AuctionPlayer, PositionGroup } from '../../types';
import {
  formatMoney,
  getFilledCount,
  needsPosition,
  computeSquadChemistry,
  chemistryMultiplier,
  orderPlayersHumanCentered,
  AUCTION_SQUAD_SIZE,
} from '../../data';
import { useLocale } from '@/contexts/LocaleContext';
import { SquadPitch } from '../pitch/SquadPitch';
import { ProgressDots } from '../pitch/ProgressDots';
import { ChemistryBadge } from '../shared/ChemistryPanel';

/** One stadium column: compact header + a pitch showing the full formation. */
function StadiumColumn({
  player,
  state,
  humanPlayerId,
  activePosition,
}: {
  player: AuctionPlayer;
  state: AuctionGameState;
  humanPlayerId: string;
  activePosition?: PositionGroup;
}) {
  const { t } = useLocale();
  const isHuman = player.id === humanPlayerId;
  const filled = getFilledCount(player.team);
  const chem = computeSquadChemistry(player.team).total;
  const mult = chemistryMultiplier(chem);
  const isHighBidder = state.currentRound?.highestBidderId === player.id;
  const needsActivePos = activePosition ? needsPosition(player, activePosition) : false;
  const showNeedGlow = !!activePosition && needsActivePos && !player.isEliminated;

  return (
    <div className={`flex h-full min-w-0 flex-1 flex-col items-center ${player.isEliminated ? 'opacity-40' : ''}`}>
      {/* Header — name, budget, chemistry (sized to be readable at a glance) */}
      <div className="mb-1.5 flex w-full shrink-0 flex-col items-center gap-0.5 px-0.5 text-center">
        <div className="flex max-w-full items-center gap-1.5">
          <span
            className={`min-w-0 truncate font-poppins text-sm font-black uppercase md:text-lg ${isHuman ? 'text-brand-yellow' : 'text-white'}`}
          >
            {isHuman ? t('auctionGame.you') : player.username}
          </span>
          {isHighBidder && (
            <motion.span
              key="crown"
              initial={{ scale: 0, rotate: -30, y: -4 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              className="shrink-0"
            >
              <Crown className="size-4 text-brand-yellow md:size-5" fill="currentColor" />
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2 font-poppins text-xs font-black tabular-nums md:text-sm">
          <span className="text-brand-yellow">{formatMoney(player.budget)}</span>
          <ChemistryBadge total={chem} multiplier={mult} className="text-[11px] md:text-xs" />
        </div>
      </div>

      {/* Pitch — fills the available height; width capped so stadiums read as
          proper cards on desktop instead of stretching edge-to-edge. The full
          formation (FWD → GK) is always visible because nothing overlaps it. */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <div className="relative h-full w-full max-w-[460px]">
          <SquadPitch
            player={player}
            formation={state.formation}
            highlightId={state.currentRound?.winnerId ?? undefined}
            size="lg"
            activePosition={activePosition}
            needGlow={showNeedGlow}
            isHuman={isHuman}
            fill
            showChemistry
          />
        </div>
      </div>

      {/* Progress dots */}
      <div className="mt-1 shrink-0">
        <ProgressDots filled={filled} total={AUCTION_SQUAD_SIZE} size="xs" />
      </div>
    </div>
  );
}

/**
 * The three squads' stadiums side by side, YOU centered. Centered and width-
 * capped so it reads as a row of cards (not a full-bleed backdrop). The clue
 * card and bid controls sit below this (see StadiumBiddingScreen).
 */
export function StadiumBoard({
  state,
  humanPlayerId,
  activePosition,
}: {
  state: AuctionGameState;
  humanPlayerId: string;
  activePosition?: PositionGroup;
}) {
  // Keep YOU in the centre column; split the others around the human.
  const ordered = orderPlayersHumanCentered(state.players, humanPlayerId);

  return (
    <div className="mx-auto flex h-full max-w-7xl items-stretch justify-center gap-2 px-2 md:gap-6 md:px-6">
      {ordered.map((player) => (
        <StadiumColumn
          key={player.id}
          player={player}
          state={state}
          humanPlayerId={humanPlayerId}
          activePosition={activePosition}
        />
      ))}
    </div>
  );
}
