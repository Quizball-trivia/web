'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { QuitMatchModal } from '@/components/match/QuitMatchModal';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { useLocale } from '@/contexts/LocaleContext';
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
        {showPendingKickoff ? (
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
      <MatchHudIconButton
        onClick={toggleMuted}
        className="absolute left-[calc(env(safe-area-inset-left)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[70] sm:left-[calc(env(safe-area-inset-left)+0.5rem)] sm:top-[calc(env(safe-area-inset-top)+0.5rem)]"
        aria-label={muted ? t('possession.unmuteAudio') : t('possession.muteAudio')}
        aria-pressed={muted}
        title={muted ? t('common.unmute') : t('common.mute')}
      >
        {muted ? <VolumeX className="size-4 sm:size-5" /> : <Volume2 className="size-4 sm:size-5" />}
      </MatchHudIconButton>

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
                {forfeitPending.message}
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
            className="absolute inset-0 z-40 flex items-center justify-center bg-surface-page-alt/70 px-4 backdrop-blur-[2px]"
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
                {t('possession.waitingForReconnect')}
              </div>
              <div className="mt-4 inline-flex items-center justify-center rounded-full bg-black/30 px-6 py-2 font-poppins text-3xl font-semibold tabular-nums text-white">
                {pauseSeconds}
              </div>
              {reconnectCopy && (
                <div className="mt-3 font-poppins text-xs font-semibold uppercase tracking-wide text-brand-yellow">
                  {reconnectCopy}
                </div>
              )}
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
