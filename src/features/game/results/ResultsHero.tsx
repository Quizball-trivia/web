'use client';

/**
 * Top of the post-match results screen: the VICTORY/DEFEAT/DRAW heading,
 * the player + score-pill + opponent row, and the head-to-head tally
 * line underneath the score.
 *
 * Pure presentation — every dynamic value is passed in from the parent
 * (heading colour comes from `playerWon` / `isDraw`, H2H label from the
 * view-model). The score pill uses two `AnimatedCounter` instances that
 * count up from 0 in parallel; keep `delay` aligned on both so they
 * land at the same tick.
 */

import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import type { AvatarCustomization } from '@/types/game';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { RankFrameCard } from '@/features/profile/components/RankFrameCard';
import { useTierLabel } from '@/hooks/useTierLabel';
import { AnimatedCounter } from './AnimatedCounter';

export function ResultsHero({
  playerWon,
  isDraw,
  resultHeading,
  playerUsername,
  playerAvatar,
  playerAvatarCustomization,
  opponentUsername,
  opponentAvatar,
  opponentAvatarCustomization,
  playerScore,
  opponentScore,
  totalGamesLabel,
  preMatchRankedProfile,
  playerTier,
  playerDisplayRp,
  opponentTier,
  opponentDisplayRp,
}: {
  playerWon: boolean;
  isDraw: boolean;
  resultHeading: string;
  playerUsername: string;
  playerAvatar: string;
  playerAvatarCustomization: AvatarCustomization | null;
  opponentUsername: string;
  opponentAvatar: string;
  opponentAvatarCustomization: AvatarCustomization | null;
  playerScore: number;
  opponentScore: number;
  totalGamesLabel: string;
  preMatchRankedProfile: RankedProfileResponse | null | undefined;
  playerTier: string | null;
  /** Pre-match RP shown on the hero card (settlement oldRp). */
  playerDisplayRp: number | null;
  opponentTier: string | null;
  opponentDisplayRp: number | null;
}) {
  const tierLabelOf = useTierLabel();
  return (
    <>
      <div className="pb-2 text-center">
        <h1
          className="font-poppins text-[3rem] font-black uppercase tracking-[0] md:text-[3.75rem]"
          style={{
            lineHeight: '1.3',
            color: playerWon ? '#22C55E' : isDraw ? '#FACC15' : '#FB3101',
          }}
        >
          {resultHeading}
        </h1>
      </div>

      <div className="mx-auto w-full max-w-[1100px]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          {/* Player (Left) — tier shield frame when ranked, plain avatar otherwise */}
          <div className="flex items-center gap-3 justify-self-start sm:gap-4">
            {playerTier ? (
              <RankFrameCard
                tier={playerTier}
                tierLabel={tierLabelOf(playerTier)}
                rpLabel={
                  (playerDisplayRp ?? preMatchRankedProfile?.rp) != null
                    ? `${playerDisplayRp ?? preMatchRankedProfile?.rp}RP`
                    : undefined
                }
                customization={playerAvatarCustomization ?? { base: playerAvatar }}
                sizes="(min-width: 640px) 150px, 100px"
                className="w-[100px] shrink-0 sm:w-[150px]"
              />
            ) : (
              <div className="flex size-24 shrink-0 items-center justify-center">
                <AvatarDisplay
                  customization={playerAvatarCustomization ?? { base: playerAvatar }}
                  size="lg"
                  shape="square"
                />
              </div>
            )}
            <div className="hidden min-w-0 sm:block">
              <div
                className="truncate font-poppins font-semibold uppercase text-white text-base sm:text-lg md:text-xl"
              >
                {playerUsername}
              </div>
              {!playerTier && preMatchRankedProfile?.rp != null && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="inline-flex h-[22px] items-center rounded-[20px] px-3 font-poppins font-semibold uppercase tabular-nums text-[12px] sm:text-[13px] md:text-[15px]"
                    style={{ backgroundColor: '#FFE500', color: '#071013' }}
                  >
                    {preMatchRankedProfile.rp} RP
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Center score pill */}
          <div className="flex flex-col items-center">
            <div
              className="flex h-[44px] min-w-[110px] items-center justify-center rounded-[20px] bg-brand-blue px-5 font-poppins font-semibold tabular-nums text-white text-2xl sm:h-[51px] sm:min-w-[133px] sm:px-6 sm:text-[36px]"
            >
              <AnimatedCounter from={0} to={playerScore} delay={0.25} />
              <span className="mx-1 sm:mx-1.5">:</span>
              <AnimatedCounter from={0} to={opponentScore} delay={0.25} />
            </div>
            <div
              className="mt-2 whitespace-nowrap font-poppins font-semibold uppercase text-white text-xs sm:text-sm md:text-[20px]"
              style={{ opacity: 0.5 }}
            >
              {totalGamesLabel}
            </div>
          </div>

          {/* Opponent (Right) — tier shield frame when ranked, plain avatar otherwise */}
          <div className="flex flex-row-reverse items-center gap-3 justify-self-end sm:gap-4">
            {opponentTier ? (
              <RankFrameCard
                tier={opponentTier}
                tierLabel={tierLabelOf(opponentTier)}
                rpLabel={opponentDisplayRp != null ? `${opponentDisplayRp}RP` : undefined}
                customization={opponentAvatarCustomization ?? { base: opponentAvatar }}
                mirrored
                sizes="(min-width: 640px) 150px, 100px"
                className="w-[100px] shrink-0 sm:w-[150px]"
              />
            ) : (
              <div className="flex size-24 shrink-0 items-center justify-center">
                <AvatarDisplay
                  customization={opponentAvatarCustomization ?? { base: opponentAvatar }}
                  size="lg"
                  className="-scale-x-100"
                  shape="square"
                />
              </div>
            )}
            <div className="hidden min-w-0 text-right sm:block">
              <div
                className="truncate font-poppins font-semibold uppercase text-white text-base sm:text-lg md:text-xl"
              >
                {opponentUsername}
              </div>
              {!opponentTier && opponentDisplayRp != null && (
                <div className="mt-2 flex flex-row-reverse items-center gap-2">
                  <span
                    className="inline-flex h-[22px] items-center rounded-[20px] px-3 font-poppins font-semibold uppercase tabular-nums text-[12px] sm:text-[13px] md:text-[15px]"
                    style={{ backgroundColor: '#FFE500', color: '#071013' }}
                  >
                    {opponentDisplayRp} RP
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
