'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Crown, X } from 'lucide-react';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MatchCountdownPuck } from '@/components/shared/MatchCountdownPuck';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { PossessionQuestionPanel } from '@/components/game/PossessionQuestionPanel';
import { RoundTransitionOverlay } from '@/components/game/RoundTransitionOverlay';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

import type { RealtimePartyQuizScreenProps } from './realtime/partyQuizScreen.types';
import {
  PARTY_FAILED_FLIGHT_MS,
  PARTY_SUCCESS_FLIGHT_MS,
  getRankStyle,
  getStandingDotStatus,
} from './realtime/partyQuizScreen.helpers';
import { useRealtimePartyQuizViewModel } from './realtime/useRealtimePartyQuizViewModel';
import { PartyQuizOverlays } from './realtime/PartyQuizOverlays';
import { PartyQuizQuitModal } from './realtime/PartyQuizQuitModal';

export function RealtimePartyQuizScreen({
  onQuit,
  onForfeit,
  mobileStandingsPlacement = 'bottom-bar',
  disableBgm = false,
}: RealtimePartyQuizScreenProps) {
  const { t } = useLocale();
  const {
    partyState,
    forfeitPending,
    state,
    actions,
    showQuitModal,
    setShowQuitModal,
    firstQuestionIntroVisible,
    showMobileStandingsBelowOptions,
    pauseSeconds,
    forfeitPendingTitle,
    question,
    answerStates,
    uiPhase,
    questionNumber,
    totalQuestions,
    standings,
    transitionVisible,
    transitionQuestionNumber,
    transitionCategoryName,
    showFinalizingResults,
    partyPicks,
    scoreFlights,
  } = useRealtimePartyQuizViewModel({ mobileStandingsPlacement, disableBgm });

  // ---------------------------------------------------------------------------
  // Pre-match / loading
  // ---------------------------------------------------------------------------

  if (!partyState) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-surface-page-alt">
        {state.startCountdownActive ? (
          <MatchCountdownPuck
            label="Quiz starts in"
            seconds={Math.max(1, state.countdownSeconds)}
            size="md"
          />
        ) : (
          <LoadingScreen fullScreen={false} className="h-auto min-h-0" />
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="relative min-h-dvh overflow-hidden bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat text-white">
      <PartyQuizOverlays
        startCountdownActive={state.startCountdownActive}
        countdownSeconds={state.countdownSeconds}
        countdownReason={state.countdownReason}
        forfeitPending={forfeitPending}
        forfeitPendingTitle={forfeitPendingTitle}
        matchPaused={state.matchPaused}
        pauseSeconds={pauseSeconds}
      />

      {/* Floating leave button */}
      <button
        onClick={() => setShowQuitModal(true)}
        className="absolute right-3 top-3 z-40 rounded-full p-2 text-white/45 transition-colors hover:bg-white/5 hover:text-white/80 sm:right-4 sm:top-4"
        title="Leave match"
      >
        <X className="size-5" />
      </button>

      {/* ================================================================= */}
      {/* Main content */}
      {/* ================================================================= */}
      <div className={cn(
        'relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 pt-4 sm:px-5 lg:px-8 lg:pb-6',
        showMobileStandingsBelowOptions ? 'pb-6' : 'pb-20',
      )}>

        {/* ─── 2-column layout: question + standings ─── */}
        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Question panel — same UI as ranked possession match (without pitch) */}
          <div
            className="relative min-h-[30rem] md:min-h-[34rem] lg:min-h-[38rem]"
            data-party-live-score-source
          >
            <motion.div
              animate={{ opacity: (transitionVisible || firstQuestionIntroVisible) ? 0 : 1 }}
              transition={{ duration: (transitionVisible || firstQuestionIntroVisible) ? 0 : 0.6 }}
              initial={false}
              aria-hidden={transitionVisible || firstQuestionIntroVisible}
              className={(transitionVisible || firstQuestionIntroVisible) ? 'pointer-events-none' : ''}
            >
              <PossessionQuestionPanel
                phase={uiPhase}
                isPenaltyPhase={false}
                isShotPhase={false}
                isLastAttackPhase={false}
                question={question}
                qIndex={Math.max(0, questionNumber - 1)}
                totalQuestions={totalQuestions}
                timeRemaining={state.timeRemaining}
                showOptions={state.showOptions}
                selectedAnswer={state.selectedAnswer}
                answerStates={answerStates}
                opponentAnswer={null}
                partyPicks={partyPicks}
                onAnswer={actions.submitAnswer}
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
                        roundResolved: state.roundResolved,
                        answered: player.answered,
                        showOptions: state.showOptions,
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

          {/* ─── Desktop standings sidebar ─── */}
          <div className="hidden lg:block">
            <div className="text-[10px] font-fun font-black uppercase tracking-[0.26em] text-white/45 px-1 mb-2">
              {t('partyResults.standings')}
            </div>
            <div className="space-y-1.5">
              {standings.map((player) => {
                const dotStatus = getStandingDotStatus({
                  roundResolved: state.roundResolved,
                  answered: player.answered,
                  showOptions: state.showOptions,
                });
                const rankStyle = getRankStyle(player.rank);
                return (
                  <motion.div
                    key={player.userId}
                    layout
                    layoutId={`standing-${player.userId}`}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="flex items-center gap-2"
                  >
                  <div
                    className={cn(
                      'flex flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors border-2',
                      rankStyle.border,
                      player.isSelf ? rankStyle.tint : 'bg-transparent',
                    )}
                    style={player.isSelf ? { boxShadow: rankStyle.selfGlow } : undefined}
                  >
                    {/* Rank pill */}
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-base font-black tabular-nums text-white',
                        rankStyle.pillBg,
                      )}
                      style={{ boxShadow: rankStyle.glow }}
                    >
                      {player.rank}
                    </span>

                    {/* Avatar */}
                    <div
                      className="shrink-0"
                      data-party-score-anchor={player.userId}
                      data-party-score-anchor-placement="desktop"
                    >
                      <AvatarDisplay
                        customization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
                        size="sm"
                        shape="circle"
                        className="bg-transparent"
                      />
                    </div>

                    {/* Name + leader crown */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-base font-bold text-white">{player.username}</span>
                        {player.isLeader && <Crown className="size-4 shrink-0 text-brand-yellow-deep" />}
                      </div>
                    </div>

                    {/* Points */}
                    <span className="text-base font-black tabular-nums text-white shrink-0">
                      {player.totalPoints}
                    </span>

                    {/* Delta flash */}
                    <AnimatePresence mode="wait">
                      {player.roundDelta != null && player.roundDelta > 0 && (
                        <motion.span
                          key={`delta-${player.userId}-${player.totalPoints}`}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 4 }}
                          transition={{ duration: 0.25 }}
                          className="text-sm font-black text-brand-green-light shrink-0"
                        >
                          +{player.roundDelta}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Status dot */}
                    <span
                      className={cn(
                        'size-3 rounded-full shrink-0',
                        dotStatus === 'correct' && 'bg-brand-green-light',
                        dotStatus === 'answering' && 'bg-brand-cyan animate-pulse',
                        dotStatus === 'resolved' && 'bg-brand-purple animate-pulse',
                        dotStatus === 'idle' && 'bg-white/20',
                      )}
                    />
                  </div>
                  {/* YOU pill — sits OUTSIDE the bordered card, stretches to
                      match its height so the right edge reads as a paired
                      action chip rather than a floating badge. */}
                  {player.isSelf && (
                    <span
                      className="flex shrink-0 self-stretch items-center justify-center rounded-[16px] bg-brand-orange px-4 text-sm font-black uppercase tracking-wider text-white"
                      style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(255,150,0,0.3)' }}
                    >
                      You
                    </span>
                  )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Mobile bottom standings bar ─── */}
      {!showMobileStandingsBelowOptions && (
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-10 bg-gradient-to-t from-surface-page-alt via-surface-page-alt/95 to-transparent pt-6 pb-3 px-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {standings.map((player) => {
            const dotStatus = getStandingDotStatus({
              roundResolved: state.roundResolved,
              answered: player.answered,
              showOptions: state.showOptions,
            });
            const hasAnswered = dotStatus === 'correct';
            const rankStyle = getRankStyle(player.rank);
            return (
              <motion.div
                key={player.userId}
                layout
                layoutId={`mobile-standing-${player.userId}`}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 border-2 bg-transparent transition-colors',
                  rankStyle.border,
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black tabular-nums text-white',
                    rankStyle.pillBg,
                  )}
                  style={{ boxShadow: rankStyle.glow }}
                >
                  {player.rank}
                </span>
                <div
                  className="relative"
                  data-party-score-anchor={player.userId}
                  data-party-score-anchor-placement="mobile-bottom"
                >
                  <AvatarDisplay
                    customization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
                    size="xs"
                    className="size-7 shrink-0"
                  />
                  {player.isSelf && (
                    <span
                      className="absolute -top-1 -right-1 rounded-full bg-brand-orange px-1 py-[1px] text-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] font-poppins font-semibold uppercase"
                      style={{ fontSize: 7, letterSpacing: '0.06em', lineHeight: 1 }}
                    >
                      You
                    </span>
                  )}
                  {/* Answered check overlay on avatar */}
                  {hasAnswered && !player.isSelf && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-brand-green-light ring-2 ring-surface-page-alt"
                    >
                      <svg viewBox="0 0 12 12" className="size-2 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    </motion.div>
                  )}
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[80px]">
                  {player.username}
                </span>
                <span className="text-xs font-black tabular-nums text-white/70">
                  {player.totalPoints}
                </span>
                <AnimatePresence mode="wait">
                  {player.roundDelta != null && player.roundDelta > 0 && (
                    <motion.span
                      key={`mobile-bottom-delta-${player.userId}-${player.totalPoints}`}
                      initial={{ opacity: 0, scale: 0.75, y: 4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="text-[10px] font-black text-brand-green-light"
                    >
                      +{player.roundDelta}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
      )}

      <AnimatePresence>
        {scoreFlights.map((flight) => {
          const failed = flight.failed === true || flight.points <= 0;
          const dx = flight.to.x - flight.from.x;
          const dy = flight.to.y - flight.from.y;
          const fallY = (typeof window !== 'undefined' ? window.innerHeight : 900) - flight.from.y + 180;
          return (
            <div
              key={flight.id}
              className="pointer-events-none fixed z-50 select-none"
              style={{
                left: flight.from.x,
                top: flight.from.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: -7 }}
                animate={failed
                  ? {
                    opacity: [0, 1, 1, 1, 0.75, 0],
                    scale: [0.5, 1.18, 1, 1, 0.9, 0.55],
                    x: [0, 0, 0, dx, dx + 6, dx - 24],
                    y: [0, 0, 0, dy, dy + 14, fallY],
                    rotate: [0, -6, 0, 4, 14, 42],
                  }
                  : {
                    opacity: [0, 1, 1, 1, 0],
                    scale: [0.55, 1.15, 1, 0.72, 0.55],
                    x: [0, 0, dx, dx, dx],
                    y: [0, 0, dy, dy, dy],
                    rotate: [0, -5, -2, 1, 2],
                  }}
                exit={{ opacity: 0 }}
                transition={failed
                  ? {
                    duration: PARTY_FAILED_FLIGHT_MS / 1000,
                    times: [0, 0.12, 0.28, 0.52, 0.6, 1],
                    ease: [0.36, 0, 0.66, 1],
                  }
                  : {
                    duration: PARTY_SUCCESS_FLIGHT_MS / 1000,
                    times: [0, 0.12, 0.82, 0.94, 1],
                    ease: [0.24, 0.72, 0.24, 1],
                  }}
                className="font-poppins text-4xl font-black text-brand-yellow"
                style={{
                  WebkitTextStroke: '2px #000000',
                  paintOrder: 'stroke fill',
                  color: failed ? 'rgba(255, 229, 0, 0.85)' : '#FFE500',
                  textShadow: failed
                    ? '0 4px 0 rgba(0,0,0,0.6), 0 8px 14px rgba(0,0,0,0.3)'
                    : '0 6px 0 rgba(0,0,0,0.35), 0 0 16px rgba(255,229,0,0.35)',
                }}
              >
                +{flight.points}
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>

      <PartyQuizQuitModal
        open={showQuitModal}
        onOpenChange={setShowQuitModal}
        onQuit={onQuit}
        onForfeit={onForfeit}
      />
    </div>
  );
}
