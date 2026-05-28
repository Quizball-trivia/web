'use client';

/**
 * Question column for the realtime party quiz screen.
 *
 * Contains the `PossessionQuestionPanel`, the optional mobile-inline
 * standings list (when `showMobileStandingsBelowOptions` is true), and
 * the stacked transition / first-question / finalizing-results
 * overlays. The wrapper preserves the `data-party-live-score-source`
 * marker used by the score-flight hook to locate the spawn rect.
 */

import { AnimatePresence, motion } from 'motion/react';
import { Crown } from 'lucide-react';

import { AvatarDisplay } from '@/components/AvatarDisplay';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { PossessionQuestionPanel } from '@/components/game/PossessionQuestionPanel';
import { RoundTransitionOverlay } from '@/components/game/RoundTransitionOverlay';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

import type { GameQuestion } from '@/lib/domain/gameQuestion';
import type { AnswerStateArray, Phase } from '@/lib/types/game.types';

import type { PartyStandingViewModel } from './partyQuizScreen.types';
import { getRankStyle, getStandingDotStatus } from './partyQuizScreen.helpers';

interface PartyPick {
  userId: string;
  username: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  accentColor: string | undefined;
}

interface PartyQuizQuestionPanelProps {
  uiPhase: Phase;
  question: GameQuestion | null;
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number;
  showOptions: boolean;
  selectedAnswer: number | null;
  answerStates: AnswerStateArray;
  partyPicks: PartyPick[] | undefined;
  onAnswer: (index: number) => void;
  transitionVisible: boolean;
  firstQuestionIntroVisible: boolean;
  showMobileStandingsBelowOptions: boolean;
  standings: PartyStandingViewModel[];
  roundResolved: boolean;
  showFinalizingResults: boolean;
  transitionQuestionNumber: number;
  transitionCategoryName: string;
}

export function PartyQuizQuestionPanel({
  uiPhase,
  question,
  questionNumber,
  totalQuestions,
  timeRemaining,
  showOptions,
  selectedAnswer,
  answerStates,
  partyPicks,
  onAnswer,
  transitionVisible,
  firstQuestionIntroVisible,
  showMobileStandingsBelowOptions,
  standings,
  roundResolved,
  showFinalizingResults,
  transitionQuestionNumber,
  transitionCategoryName,
}: PartyQuizQuestionPanelProps) {
  const { t } = useLocale();
  const overlayActive = transitionVisible || firstQuestionIntroVisible;

  return (
    <div
      className="relative min-h-[30rem] md:min-h-[34rem] lg:min-h-[38rem]"
      data-party-live-score-source
    >
      <motion.div
        animate={{ opacity: overlayActive ? 0 : 1 }}
        transition={{ duration: overlayActive ? 0 : 0.6 }}
        initial={false}
        aria-hidden={overlayActive}
        className={overlayActive ? 'pointer-events-none' : ''}
      >
        <PossessionQuestionPanel
          phase={uiPhase}
          isPenaltyPhase={false}
          isShotPhase={false}
          isLastAttackPhase={false}
          question={question}
          qIndex={Math.max(0, questionNumber - 1)}
          totalQuestions={totalQuestions}
          timeRemaining={timeRemaining}
          showOptions={showOptions}
          selectedAnswer={selectedAnswer}
          answerStates={answerStates}
          opponentAnswer={null}
          partyPicks={partyPicks}
          onAnswer={onAnswer}
        />

        {showMobileStandingsBelowOptions && (
          <div className="mt-3 space-y-2 px-4 lg:hidden">
            <div className="flex items-center justify-between px-1">
              <div className="font-fun text-[10px] font-black uppercase tracking-[0.26em] text-white/45">
                {t('partyResults.standings')}
              </div>
              <div className="font-poppins text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                {t('partyResults.liveScores')}
              </div>
            </div>
            <div className="grid gap-2">
              {standings.map((player) => {
                const dotStatus = getStandingDotStatus({
                  roundResolved,
                  answered: player.answered,
                  showOptions,
                });
                const hasAnswered = dotStatus === 'correct';
                const rankStyle = getRankStyle(player.rank);
                return (
                  <motion.div
                    key={player.userId}
                    layout
                    layoutId={`mobile-inline-standing-${player.userId}`}
                    className={cn(
                      'flex min-h-12 items-center gap-2 rounded-[18px] border-2 bg-surface-page/40 px-2.5 py-1.5 backdrop-blur-sm',
                      rankStyle.border,
                      player.isSelf && rankStyle.tint,
                    )}
                    style={player.isSelf ? { boxShadow: rankStyle.selfGlow } : undefined}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] text-sm font-black tabular-nums text-white',
                        rankStyle.pillBg,
                      )}
                      style={{ boxShadow: rankStyle.glow }}
                    >
                      {player.rank}
                    </span>
                    <div
                      className="relative shrink-0"
                      data-party-score-anchor={player.userId}
                      data-party-score-anchor-placement="mobile-inline"
                    >
                      <AvatarDisplay
                        customization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
                        size="xs"
                        className="size-8"
                      />
                      {hasAnswered && !player.isSelf && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-brand-green-light ring-2 ring-surface-page-alt"
                        >
                          <svg viewBox="0 0 12 12" className="size-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 6l3 3 5-5" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-poppins text-sm font-black text-white">
                          {player.username}
                        </span>
                        {player.isSelf && (
                          <span className="rounded-full bg-brand-orange px-1.5 py-0.5 font-poppins text-[8px] font-black uppercase tracking-[0.08em] text-white">
                            You
                          </span>
                        )}
                        {player.isLeader && <Crown className="size-3.5 shrink-0 text-brand-yellow-deep" />}
                      </div>
                    </div>
                    <span className="shrink-0 font-poppins text-sm font-black tabular-nums text-white">
                      {player.totalPoints}
                    </span>
                    <AnimatePresence mode="wait">
                      {player.roundDelta != null && player.roundDelta > 0 && (
                        <motion.span
                          key={`mobile-inline-delta-${player.userId}-${player.totalPoints}`}
                          initial={{ opacity: 0, scale: 0.75, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: -4 }}
                          transition={{ duration: 0.22 }}
                          className="shrink-0 font-poppins text-xs font-black text-brand-green-light"
                        >
                          +{player.roundDelta}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span
                      className={cn(
                        'size-2.5 rounded-full shrink-0',
                        dotStatus === 'correct' && 'bg-brand-green-light',
                        dotStatus === 'answering' && 'bg-brand-cyan animate-pulse',
                        dotStatus === 'resolved' && 'bg-brand-purple animate-pulse',
                        dotStatus === 'idle' && 'bg-white/20',
                      )}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showFinalizingResults ? (
          <motion.div
            key="party-finalizing-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] bg-surface-page-alt/85 px-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: -12, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-7 text-center shadow-2xl"
            >
              <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-yellow">
                {t('partyResults.matchComplete')}
              </div>
              <LoadingScreen
                fullScreen={false}
                text=""
                className="h-auto min-h-0 bg-transparent py-2"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-2 font-poppins text-sm font-semibold uppercase tracking-wide text-white"
              >
                {t('partyResults.calculatingFinalScores')}
              </motion.p>
            </motion.div>
          </motion.div>
        ) : transitionVisible ? (
          <RoundTransitionOverlay
            title={`Question ${transitionQuestionNumber}`}
            categoryName={transitionCategoryName}
          />
        ) : firstQuestionIntroVisible ? (
          <RoundTransitionOverlay
            title="Question 1"
            categoryName={transitionCategoryName}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
