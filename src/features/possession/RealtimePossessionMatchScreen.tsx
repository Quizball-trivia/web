'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Volume2, VolumeX } from 'lucide-react';
import { QuitMatchModal } from '@/components/match/QuitMatchModal';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MatchWaitingForReadyOverlay } from '@/components/shared/MatchWaitingForReadyOverlay';
import { ConnectionQualitySignal } from '@/components/shared/ConnectionQualitySignal';
import { RealtimeConnectionBanner } from '@/components/shared/RealtimeConnectionBanner';
import { useLocale } from '@/contexts/LocaleContext';
import { useMatchUiReadyAcks } from '@/lib/match/useMatchUiReadyAcks';
import { useMatchStagePresence } from '@/lib/realtime/useMatchStagePresence';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { BarBattleFlightOverlay } from './components/BarBattleFlightOverlay';
import { HalftimeScreen } from './components/HalftimeScreen';
import { KickoffCountdownOverlay } from './components/KickoffCountdownOverlay';
import { PenaltyStartCountdownOverlay } from './components/PenaltyStartCountdownOverlay';
import { MatchHudIconButton } from './components/MatchHudPrimitives';
import { PenaltyMatchEndOverlay } from './components/PenaltyMatchEndOverlay';
import { PossessionMatchViewport } from './components/PossessionMatchViewport';
import { PossessionQuestionArea } from './components/PossessionQuestionArea';
import { usePossessionBarBattleFlights } from './hooks/usePossessionBarBattleFlights';
import { useRealtimePossessionMatchController } from './hooks/useRealtimePossessionMatchController';
import type { AvatarCustomization } from '@/types/game';

interface RealtimePossessionMatchScreenProps {
  playerAvatar: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  playerUsername: string;
  opponentAvatar: string;
  opponentAvatarCustomization?: AvatarCustomization | null;
  opponentUsername: string;
  /** ISO country code — enables the flag badge on halftime avatars. */
  playerCountryCode?: string | null;
  opponentCountryCode?: string | null;
  /** Player's favourite club slug (e.g. `real-madrid`). Used by the quit
   *  modal to pick a famous player from that club for the motivational
   *  headline. */
  playerFavoriteClub?: string | null;
  /** Pre-match ranked points — shown as tier shield frames on the
   *  kickoff/resume countdown overlay when provided. */
  playerRankPoints?: number | null;
  opponentRankPoints?: number | null;
  centerPossessionTrack?: boolean;
  simpleShotAnimation?: boolean;
  /** Dev prototype: glow one-sided surviving bars before normal possession moves. */
  unopposedBarPulse?: boolean;
  /** Skip the ranked background music loop. Pass `true` from dev playgrounds. */
  disableBgm?: boolean;
  onQuit: () => void;
  onForfeit: () => void;
}

export function RealtimePossessionMatchScreen(props: RealtimePossessionMatchScreenProps) {
  const { t } = useLocale();
  // Bar-battle flight ghosts — fires +N from MCQ prompt onto pitch when the
  // 'avatar-anchored' variant is active (ranked-sim matches). No-op in
  // classic variant. Manages its own state internally.
  const barBattleFlights = usePossessionBarBattleFlights();
  const matchPaused = useRealtimeMatchStore((state) => state.matchPaused);
  const hasMatch = useRealtimeMatchStore((state) => state.match != null);
  const matchId = useRealtimeMatchStore((state) => state.match?.matchId ?? null);
  const currentQuestionIndex = useRealtimeMatchStore((state) => state.match?.currentQuestion?.qIndex ?? null);
  const currentPhaseKind = useRealtimeMatchStore((state) =>
    state.match?.currentQuestion?.phaseKind ?? state.match?.possessionState?.phaseKind ?? null
  );
  const waitingForReady = useRealtimeMatchStore((state) => state.match?.waitingForReady ?? null);
  const finalResults = useRealtimeMatchStore((state) => state.match?.finalResults ?? null);
  const selfUserId = useRealtimeMatchStore((state) => state.selfUserId);
  const opponentInfo = useRealtimeMatchStore((state) => state.match?.opponent ?? null);
  const pauseUntil = useRealtimeMatchStore((state) => state.pauseUntil);
  const remainingReconnects = useRealtimeMatchStore((state) => state.remainingReconnects);
  const forfeitPending = useRealtimeMatchStore((state) => state.forfeitPending);
  const [pauseNowMs, setPauseNowMs] = useState(() => Date.now());
  const [completedPenaltySplash, setCompletedPenaltySplash] = useState<{
    resultKey: string;
    qIndex: number;
  } | null>(null);

  const {
    isReady,
    showStartCountdown,
    countdownDisplay,
    countdownPhase,
    penaltyCountdownActive,
    penaltyCountdownDisplay,
    muted,
    toggleMuted,
    viewportModel,
    questionAreaModel,
    showQuestionArea,
    halftimeModel,
    quitModalOpen,
    setQuitModalOpen,
    handleTemporaryQuit,
    handleForfeit,
  } = useRealtimePossessionMatchController({
    ...props,
    suppressAvatarScoreSplash: barBattleFlights.suppressScoreSplash,
  });

  useMatchUiReadyAcks({ matchId, currentQuestionIndex, waitingForReady });

  const stagePresenceKey = useMemo(() => {
    if (!hasMatch || finalResults) return null;
    if (matchPaused || waitingForReady?.phase === 'resume') return 'resume';
    if (halftimeModel) return 'category_ban';
    if (showStartCountdown) return 'kickoff';
    if (penaltyCountdownActive || currentPhaseKind === 'penalty') return 'penalties';
    return 'question';
  }, [
    currentPhaseKind,
    finalResults,
    halftimeModel,
    hasMatch,
    matchPaused,
    penaltyCountdownActive,
    showStartCountdown,
    waitingForReady?.phase,
  ]);
  useMatchStagePresence({ matchId, stageKey: stagePresenceKey, enabled: hasMatch && !finalResults });

  const waitingReadyLabel = waitingForReady
    ? t('possession.playersReadyCount', { ready: waitingForReady.readyCount, total: waitingForReady.totalCount })
    : '';
  const waitingTotalCount = waitingForReady?.totalCount ?? 0;
  const waitingTitle = waitingTotalCount <= 1
    ? t('possession.gettingMatchReady')
    : waitingTotalCount > 2
      ? t('possession.waitingForPlayers')
      : t('possession.waitingForOpponent');

  useEffect(() => {
    if (!matchPaused || !pauseUntil) return;
    const tick = () => setPauseNowMs(Date.now());
    tick();
    const intervalId = setInterval(tick, 250);
    return () => clearInterval(intervalId);
  }, [matchPaused, pauseUntil]);

  const pauseSeconds = pauseUntil
    ? Math.max(0, Math.ceil((pauseUntil - pauseNowMs) / 1000))
    : 0;
  const reconnectCopy =
    remainingReconnects == null
      ? null
      : remainingReconnects <= 0
        ? t('forfeit.lastReconnect')
        : remainingReconnects === 1
          ? t('forfeit.reconnectsLeftOne', { n: remainingReconnects })
          : t('forfeit.reconnectsLeftOther', { n: remainingReconnects });
  const forfeitPendingTitle =
    forfeitPending?.reason === 'opponent_forfeit'
      ? t('forfeit.opponentForfeited')
      : forfeitPending?.reason === 'opponent_reconnect_limit'
        ? t('forfeit.opponentDidNotReconnect')
        : t('forfeit.matchForfeited');
  // Subtitle is i18n-keyed off the reason (the server's payload.message is
  // English-only, so rendering it raw leaked English onto the KA client).
  const forfeitPendingSubtitle =
    forfeitPending?.reason === 'opponent_forfeit' || forfeitPending?.reason === 'opponent_reconnect_limit'
      ? t('forfeit.youWinByForfeit')
      : t('forfeit.youLostMatch');
  const penaltyMatchEndOverlay = useMemo(() => {
    if (!finalResults || finalResults.winnerDecisionMethod !== 'penalty_goals' || !selfUserId) {
      return null;
    }
    const myResult = finalResults.players[selfUserId];
    const opponentEntry = Object.entries(finalResults.players).find(([userId]) => userId !== selfUserId);
    const opponentResult = opponentEntry?.[1] ?? null;
    if (!myResult || !opponentResult) return null;

    return {
      playerWon: finalResults.winnerId === selfUserId,
      myPenaltyGoals: myResult.penaltyGoals ?? 0,
      oppPenaltyGoals: opponentResult.penaltyGoals ?? 0,
      playerRankPoints: finalResults.rankedOutcome?.byUserId[selfUserId]?.newRp ?? null,
      opponentRankPoints: opponentInfo?.rp ?? null,
    };
  }, [finalResults, opponentInfo?.rp, selfUserId]);
  const penaltyFinalResultKey = finalResults
    ? `${finalResults.matchId}:${finalResults.resultVersion}`
    : null;

  const showPenaltyMatchEndOverlay =
    Boolean(penaltyMatchEndOverlay)
    && completedPenaltySplash?.resultKey === penaltyFinalResultKey;

  const handlePenaltySplashComplete = useCallback((localQuestionIndex: number | null) => {
    if (!penaltyMatchEndOverlay || !penaltyFinalResultKey || localQuestionIndex === null) return;
    setCompletedPenaltySplash((current) => (
      current?.resultKey === penaltyFinalResultKey
        ? current
        : {
          resultKey: penaltyFinalResultKey,
          qIndex: localQuestionIndex,
        }
    ));
  }, [penaltyFinalResultKey, penaltyMatchEndOverlay]);

  if (!isReady) {
    const showPendingKickoff = showStartCountdown || hasMatch;

    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-surface-page-alt">
        <RealtimeConnectionBanner />
        {waitingForReady ? (
          <MatchWaitingForReadyOverlay
            title={waitingTitle}
            readyLabel={waitingReadyLabel}
            startingLabel={t('possession.startingSoon')}
            forceStartsAtMs={waitingForReady.forceStartsAtMs}
            serverTimeOffsetMs={waitingForReady.serverTimeOffsetMs}
          />
        ) : showPendingKickoff ? (
          <KickoffCountdownOverlay
            countdownDisplay={countdownDisplay}
            phase={countdownPhase}
            durationMs={5_000}
            runKey={countdownPhase}
            playerName={props.playerUsername}
            opponentName={props.opponentUsername}
            playerAvatarBase={props.playerAvatar}
            opponentAvatarBase={props.opponentAvatar}
            playerAvatarCustomization={props.playerAvatarCustomization}
            opponentAvatarCustomization={props.opponentAvatarCustomization}
            playerRankPoints={props.playerRankPoints}
            opponentRankPoints={props.opponentRankPoints ?? opponentInfo?.rp ?? null}
            className="h-dvh min-h-dvh w-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
          />
        ) : (
          <LoadingScreen fullScreen={false} className="h-auto min-h-0" />
        )}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <RealtimeConnectionBanner />
      <MatchHudIconButton
        onClick={toggleMuted}
        className="fixed left-[calc(env(safe-area-inset-left)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[70] sm:left-[calc(env(safe-area-inset-left)+0.5rem)] sm:top-[calc(env(safe-area-inset-top)+0.5rem)] lg:left-[calc(env(safe-area-inset-left)+1rem)] lg:top-[calc(env(safe-area-inset-top)+1rem)]"
        aria-label={muted ? t('possession.unmuteAudio') : t('possession.muteAudio')}
        aria-pressed={muted}
        title={muted ? t('common.unmute') : t('common.mute')}
      >
        {muted ? <VolumeX className="size-4 sm:size-5" /> : <Volume2 className="size-4 sm:size-5" />}
      </MatchHudIconButton>
      {/* Desktop (sm+) only: sits beside the mute button in the top-left HUD.
          Both are `fixed` with matching top offsets, and the pill (h-8) is
          nudged down ~0.25rem so its center lines up with the taller mute
          button (h-10) — otherwise the shorter pill reads as sitting too high.
          On mobile the pill is anchored to the bottom-left corner of the pitch
          inside PossessionMatchViewport instead (the top HUD bar is too tight). */}
      <ConnectionQualitySignal
        className="hidden sm:fixed sm:flex sm:left-[calc(env(safe-area-inset-left)+3.5rem)] sm:top-[calc(env(safe-area-inset-top)+0.75rem)] sm:z-[70] lg:left-[calc(env(safe-area-inset-left)+4rem)] lg:top-[calc(env(safe-area-inset-top)+1.25rem)]"
      />

      <AnimatePresence>
        {waitingForReady && !showStartCountdown && (
          <MatchWaitingForReadyOverlay
            key="possession-waiting-for-ready"
            title={waitingTitle}
            readyLabel={waitingReadyLabel}
            startingLabel={t('possession.startingSoon')}
            forceStartsAtMs={waitingForReady.forceStartsAtMs}
            serverTimeOffsetMs={waitingForReady.serverTimeOffsetMs}
            className="fixed inset-0 z-[95]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStartCountdown && (
          <motion.div
            key="match-start-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed inset-0 z-[90]"
          >
            <KickoffCountdownOverlay
              countdownDisplay={countdownDisplay}
              phase={countdownPhase}
              durationMs={5_000}
              runKey={countdownPhase}
              playerName={props.playerUsername}
              opponentName={props.opponentUsername}
              playerAvatarBase={props.playerAvatar}
              opponentAvatarBase={props.opponentAvatar}
              playerAvatarCustomization={props.playerAvatarCustomization}
              opponentAvatarCustomization={props.opponentAvatarCustomization}
              playerRankPoints={props.playerRankPoints}
              opponentRankPoints={props.opponentRankPoints ?? opponentInfo?.rp ?? null}
              className="h-dvh min-h-dvh w-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {penaltyCountdownActive && (
          <PenaltyStartCountdownOverlay display={penaltyCountdownDisplay} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forfeitPending && (
          <motion.div
            key="possession-forfeit-pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-surface-page-alt/75 px-4 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ y: -12, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -12, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-6 text-center shadow-2xl"
            >
              <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-yellow">
                {t('possession.finalizingMatch')}
              </div>
              <div className="mt-2 font-poppins text-xl font-semibold uppercase text-white">
                {forfeitPendingTitle}
              </div>
              <div className="mt-1 font-poppins text-sm font-semibold text-white/70">
                {forfeitPendingSubtitle}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchPaused && pauseSeconds > 0 && (
          <motion.div
            key="possession-match-pause"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-surface-page-alt/70 px-4 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ y: -12, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -12, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-6 text-center shadow-2xl"
            >
              <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                {t('possession.matchPaused')}
              </div>
              <div className="mt-2 font-poppins text-xl font-semibold uppercase text-white">
                {t('possession.opponentDisconnected')}
              </div>
              <div className="mt-1 font-poppins text-sm font-semibold text-white/70">
                {t('possession.opponentDisconnectedWinIfNotReturn', { seconds: pauseSeconds })}
              </div>
              <div className="mt-4 inline-flex items-center justify-center rounded-full bg-black/30 px-6 py-2 font-poppins text-3xl font-semibold tabular-nums text-white">
                {pauseSeconds}
              </div>
              {reconnectCopy && (
                <div className="mt-3 font-poppins text-xs font-semibold uppercase tracking-wide text-brand-yellow">
                  {reconnectCopy}
                </div>
              )}
              <button
                type="button"
                onClick={handleTemporaryQuit}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-brand-yellow px-5 py-2.5 font-poppins text-sm font-semibold uppercase tracking-wide text-brand-blue shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-brand-blue"
              >
                <LogOut className="size-4" aria-hidden="true" />
                {t('possession.leaveSafely')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-lg flex flex-col lg:max-w-7xl lg:flex-row lg:h-[calc(100dvh-2rem)] lg:items-stretch lg:gap-4 lg:px-4">
        {viewportModel && (
          <PossessionMatchViewport
            model={viewportModel}
            onPenaltySplashComplete={handlePenaltySplashComplete}
          >
            {showQuestionArea && questionAreaModel && (
              <PossessionQuestionArea model={questionAreaModel} />
            )}

            {halftimeModel && (
              <HalftimeScreen {...halftimeModel} />
            )}
          </PossessionMatchViewport>
        )}
      </div>

      <AnimatePresence>
        {penaltyMatchEndOverlay && showPenaltyMatchEndOverlay && (
          <PenaltyMatchEndOverlay
            visible
            playerWon={penaltyMatchEndOverlay.playerWon}
            myPenaltyGoals={penaltyMatchEndOverlay.myPenaltyGoals}
            oppPenaltyGoals={penaltyMatchEndOverlay.oppPenaltyGoals}
            playerName={props.playerUsername}
            opponentName={props.opponentUsername}
            playerAvatarUrl={props.playerAvatar}
            opponentAvatarUrl={props.opponentAvatar}
            playerAvatarCustomization={props.playerAvatarCustomization}
            opponentAvatarCustomization={props.opponentAvatarCustomization}
            playerCountryCode={props.playerCountryCode}
            opponentCountryCode={props.opponentCountryCode}
            playerRankPoints={penaltyMatchEndOverlay.playerRankPoints}
            opponentRankPoints={penaltyMatchEndOverlay.opponentRankPoints}
          />
        )}
      </AnimatePresence>

      <QuitMatchModal
        open={quitModalOpen}
        onOpenChange={setQuitModalOpen}
        playerClubId={props.playerFavoriteClub}
        onSecondaryConfirm={handleTemporaryQuit}
        onConfirm={handleForfeit}
      />

      {/* Bar-battle +N flight overlay — fixed-position, spans the viewport.
          Renders nothing for non-ranked matches; in ranked-sim it flies the
          score splash from the MCQ prompt onto the pitch avatar, where the
          SVG bars expand outward from the landing point. */}
      <BarBattleFlightOverlay
        flights={barBattleFlights.flights}
        onArrive={barBattleFlights.handleFlightArrive}
      />
    </div>
  );
}
