'use client';

import { Volume2, VolumeX, X } from 'lucide-react';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MatchHudIconButton } from '@/features/possession/components/MatchHudPrimitives';
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
    muted,
    toggleMuted,
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
    <div className="relative min-h-dvh overflow-hidden bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white">
      <PartyQuizOverlays
        startCountdownActive={state.startCountdownActive}
        countdownSeconds={state.countdownSeconds}
        countdownReason={state.countdownReason}
        forfeitPending={forfeitPending}
        forfeitPendingTitle={forfeitPendingTitle}
        matchPaused={state.matchPaused}
        pauseSeconds={pauseSeconds}
      />

      {/* Desktop: corner mute / quit (mobile uses inline header row in question panel) */}
      <MatchHudIconButton
        onClick={toggleMuted}
        className="absolute left-[calc(env(safe-area-inset-left)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[70] hidden sm:left-[calc(env(safe-area-inset-left)+0.5rem)] sm:top-[calc(env(safe-area-inset-top)+0.5rem)] lg:flex"
        aria-label={muted ? t('possession.unmuteAudio') : t('possession.muteAudio')}
        aria-pressed={muted}
        title={muted ? t('common.unmute') : t('common.mute')}
      >
        {muted ? <VolumeX className="size-4 sm:size-5" /> : <Volume2 className="size-4 sm:size-5" />}
      </MatchHudIconButton>
      <MatchHudIconButton
        onClick={() => setShowQuitModal(true)}
        className="absolute right-[calc(env(safe-area-inset-right)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[70] hidden sm:right-[calc(env(safe-area-inset-right)+0.5rem)] sm:top-[calc(env(safe-area-inset-top)+0.5rem)] lg:flex lg:fixed lg:right-[calc(env(safe-area-inset-right)+1rem)] lg:top-[calc(env(safe-area-inset-top)+1rem)]"
        data-testid="party-match-quit-desktop"
        title={t('partyResults.leaveMatch')}
        aria-label={t('partyResults.leaveMatch')}
      >
        <X className="size-5" />
      </MatchHudIconButton>

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
            muted={muted}
            onToggleMute={toggleMuted}
            onQuit={() => setShowQuitModal(true)}
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
