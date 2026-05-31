'use client';

import { X } from 'lucide-react';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MatchCountdownPuck } from '@/components/shared/MatchCountdownPuck';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

import type { RealtimePartyQuizScreenProps } from './realtime/partyQuizScreen.types';
import { useRealtimePartyQuizViewModel } from './realtime/useRealtimePartyQuizViewModel';
import { PartyQuizOverlays } from './realtime/PartyQuizOverlays';
import { PartyQuizQuestionPanel } from './realtime/PartyQuizQuestionPanel';
import { PartyQuizStandingsSidebar } from './realtime/PartyQuizStandingsSidebar';
import { PartyQuizMobileStandingsBar } from './realtime/PartyQuizMobileStandingsBar';
import { PartyQuizScoreFlights } from './realtime/PartyQuizScoreFlights';
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
  const { t } = useLocale();

  // ---------------------------------------------------------------------------
  // Pre-match / loading
  // ---------------------------------------------------------------------------

  if (!partyState) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-surface-page-alt">
        {state.startCountdownActive ? (
          <MatchCountdownPuck
            label={t('partyResults.quizStartsIn')}
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

      {/* Leave button — circular, matching the ranked match HUD button, aligned
          with the question/timer header row at the top-right. */}
      <button
        onClick={() => setShowQuitModal(true)}
        className="absolute right-4 top-[14px] z-40 flex size-10 items-center justify-center rounded-full border border-brand-blue/55 bg-brand-blue/25 text-white shadow-[0_8px_26px_rgba(31,81,255,0.28)] backdrop-blur-md transition-colors hover:border-brand-blue/80 hover:bg-brand-blue/35 sm:right-5 sm:top-5 sm:size-11"
        title={t('partyResults.leaveMatch')}
        aria-label={t('partyResults.leaveMatch')}
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

      <PartyQuizScoreFlights scoreFlights={scoreFlights} />

      <PartyQuizQuitModal
        open={showQuitModal}
        onOpenChange={setShowQuitModal}
        onQuit={onQuit}
        onForfeit={onForfeit}
      />
    </div>
  );
}
