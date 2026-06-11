'use client';

/**
 * Bottom of the post-match results screen: achievements unlock strip,
 * the collapsible match-stats dropdown, and the stacked Play Again /
 * Main Menu buttons.
 *
 * The dropdown opens above the buttons so click targets stay reachable
 * after the panel expands. Both buttons are plain `<button>` elements
 * (not a routed link) — the parent screen owns the actual transition.
 */

import { useLocale } from '@/contexts/LocaleContext';
import { AchievementUnlockStrip } from '@/components/match/AchievementUnlockStrip';
import type { AchievementUnlockPayload } from '@/lib/realtime/socket.types';
import { MatchStatsDropdown } from './ResultsStatsPanel';

type LocaleT = ReturnType<typeof useLocale>['t'];

export function ResultsActions({
  t,
  unlockedAchievements,
  accuracy,
  playerCorrect,
  opponentCorrect,
  totalQuestions,
  playerScore,
  opponentScore,
  xpEarned,
  level,
  xpToNextLevel,
  playerQuestionResults,
  opponentQuestionResults,
  playAgainDisabled = false,
  onPlayAgain,
  onMainMenu,
}: {
  t: LocaleT;
  unlockedAchievements: AchievementUnlockPayload[];
  accuracy: number;
  playerCorrect: number;
  opponentCorrect: number;
  totalQuestions: number;
  playerScore: number;
  opponentScore: number;
  xpEarned: number;
  level: number | null;
  xpToNextLevel: number | null;
  playerQuestionResults?: Array<'correct' | 'wrong' | null>;
  opponentQuestionResults?: Array<'correct' | 'wrong' | null>;
  /** Grays out the Play Again CTA (e.g. ranked replay with 0 tickets). */
  playAgainDisabled?: boolean;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}) {
  return (
    <>
      <AchievementUnlockStrip achievements={unlockedAchievements} />

      <div className="mx-auto flex w-full max-w-[498px] flex-col items-stretch gap-3 pt-2 md:gap-4">
        <MatchStatsDropdown
          accuracy={accuracy}
          playerCorrect={playerCorrect}
          opponentCorrect={opponentCorrect}
          totalQuestions={totalQuestions}
          playerScore={playerScore}
          opponentScore={opponentScore}
          xpEarned={xpEarned}
          level={level}
          xpToNextLevel={xpToNextLevel}
          playerQuestionResults={playerQuestionResults}
          opponentQuestionResults={opponentQuestionResults}
          t={t}
        />

        <button
          onClick={onPlayAgain}
          disabled={playAgainDisabled}
          className="flex h-[64px] w-full items-center justify-center rounded-[20px] bg-brand-green font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors hover:bg-brand-green disabled:cursor-not-allowed disabled:bg-black/60 disabled:text-white/50 disabled:hover:bg-black/60 md:h-[80px] md:text-[28px]"
        >
          {t('results.playAgain')}
        </button>
        {playAgainDisabled && (
          <p className="-mt-1 text-center font-poppins text-sm text-white/60 md:-mt-2 md:text-base">
            {t('modeConfirm.notEnoughTickets')}
          </p>
        )}
        <button
          onClick={onMainMenu}
          className="flex h-[64px] w-full items-center justify-center rounded-[20px] border-[3px] border-brand-green bg-transparent font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors hover:bg-brand-green/10 md:h-[80px] md:text-[28px]"
        >
          {t('results.mainMenu')}
        </button>
      </div>
    </>
  );
}
