'use client';

import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MatchCountdownPuck } from '@/components/shared/MatchCountdownPuck';
import { cn } from '@/lib/utils';

import type { RealtimePartyQuizScreenProps } from './realtime/partyQuizScreen.types';
import {
  PARTY_FAILED_FLIGHT_MS,
  PARTY_SUCCESS_FLIGHT_MS,
} from './realtime/partyQuizScreen.helpers';
import { useRealtimePartyQuizViewModel } from './realtime/useRealtimePartyQuizViewModel';
import { PartyQuizOverlays } from './realtime/PartyQuizOverlays';
import { PartyQuizQuestionPanel } from './realtime/PartyQuizQuestionPanel';
import { PartyQuizStandingsSidebar } from './realtime/PartyQuizStandingsSidebar';
import { PartyQuizMobileStandingsBar } from './realtime/PartyQuizMobileStandingsBar';
import { PartyQuizQuitModal } from './realtime/PartyQuizQuitModal';

export function RealtimePartyQuizScreen({
  onQuit,
  onForfeit,
  mobileStandingsPlacement = 'bottom-bar',
  disableBgm = false,
}: RealtimePartyQuizScreenProps) {
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
          <PartyQuizQuestionPanel
            uiPhase={uiPhase}
            question={question}
            questionNumber={questionNumber}
            totalQuestions={totalQuestions}
            timeRemaining={state.timeRemaining}
            showOptions={state.showOptions}
            selectedAnswer={state.selectedAnswer}
            answerStates={answerStates}
            partyPicks={partyPicks}
            onAnswer={actions.submitAnswer}
            transitionVisible={transitionVisible}
            firstQuestionIntroVisible={firstQuestionIntroVisible}
            showMobileStandingsBelowOptions={showMobileStandingsBelowOptions}
            standings={standings}
            roundResolved={state.roundResolved}
            showFinalizingResults={showFinalizingResults}
            transitionQuestionNumber={transitionQuestionNumber}
            transitionCategoryName={transitionCategoryName}
          />

          <PartyQuizStandingsSidebar
            standings={standings}
            roundResolved={state.roundResolved}
            showOptions={state.showOptions}
          />
        </div>
      </div>

      {!showMobileStandingsBelowOptions && (
        <PartyQuizMobileStandingsBar
          standings={standings}
          roundResolved={state.roundResolved}
          showOptions={state.showOptions}
        />
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
