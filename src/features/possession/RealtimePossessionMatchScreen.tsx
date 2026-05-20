'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { BarBattleFlightOverlay } from './components/BarBattleFlightOverlay';
import { HalftimeScreen } from './components/HalftimeScreen';
import { MatchHudIconButton } from './components/MatchHudPrimitives';
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
  // Bar-battle flight ghosts — fires +N from MCQ prompt onto pitch when the
  // 'avatar-anchored' variant is active (ranked-sim matches). No-op in
  // classic variant. Manages its own state internally.
  const barBattleFlights = usePossessionBarBattleFlights();
  const matchPaused = useRealtimeMatchStore((state) => state.matchPaused);
  const pauseUntil = useRealtimeMatchStore((state) => state.pauseUntil);
  const remainingReconnects = useRealtimeMatchStore((state) => state.remainingReconnects);
  const forfeitPending = useRealtimeMatchStore((state) => state.forfeitPending);
  const [pauseNowMs, setPauseNowMs] = useState(() => Date.now());

  const {
    isReady,
    showStartCountdown,
    countdownDisplay,
    countdownLabel,
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
        ? 'This is their last reconnect.'
        : `${remainingReconnects} ${remainingReconnects === 1 ? 'reconnect' : 'reconnects'} left.`;
  const forfeitPendingTitle =
    forfeitPending?.reason === 'opponent_forfeit'
      ? 'Opponent forfeited'
      : forfeitPending?.reason === 'opponent_reconnect_limit'
        ? 'Opponent did not reconnect'
        : 'Match forfeited';

  if (!isReady) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-surface-page-alt">
        {showStartCountdown ? (
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs font-bold uppercase tracking-[0.28em] text-white/60 font-fun">{countdownLabel}</div>
            <div className="flex size-28 items-center justify-center rounded-full border-4 border-brand-cyan/60 bg-surface-deep shadow-[0_0_40px_rgba(28,176,246,0.25)]">
              <span className="text-5xl font-black leading-none tabular-nums text-white font-fun">{countdownDisplay}</span>
            </div>
          </div>
        ) : (
          <LoadingScreen fullScreen={false} className="h-auto min-h-0" />
        )}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat">
      <MatchHudIconButton
        onClick={toggleMuted}
        className="absolute left-[calc(env(safe-area-inset-left)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[70] sm:left-[calc(env(safe-area-inset-left)+0.5rem)] sm:top-[calc(env(safe-area-inset-top)+0.5rem)]"
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        aria-pressed={muted}
        title={muted ? 'Unmute' : 'Mute'}
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
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-surface-page-alt/45 backdrop-blur-[1.5px]" />
            <motion.div
              key={`countdown-${countdownDisplay}`}
              initial={{ scale: 0.72, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              className="relative flex flex-col items-center gap-2"
            >
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-white/70 font-fun">{countdownLabel}</div>
              <div className="flex size-32 items-center justify-center rounded-full border-4 border-brand-cyan/70 bg-surface-deep shadow-[0_0_50px_rgba(28,176,246,0.3)]">
                <span className="text-6xl font-black leading-none tabular-nums text-white font-fun">{countdownDisplay}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {penaltyCountdownActive && (
          <motion.div
            key="penalty-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-surface-page-alt/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="relative flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="text-4xl font-black uppercase tracking-wider text-brand-red-soft font-fun"
                style={{ textShadow: '0 0 30px rgba(255,75,75,0.5), 0 4px 0 rgba(200,40,40,0.8)' }}
              >
                Penalty Shootout
              </motion.div>
              <motion.div
                key={`pen-cd-${penaltyCountdownDisplay}`}
                initial={{ scale: 0.72, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 340, damping: 22 }}
              >
                <div className="flex size-28 items-center justify-center rounded-full border-4 border-brand-red-soft/70 bg-surface-deep shadow-[0_0_50px_rgba(255,75,75,0.3)]">
                  <span className="text-5xl font-black leading-none tabular-nums text-white font-fun">
                    {penaltyCountdownDisplay}
                  </span>
                </div>
              </motion.div>
              <div className="text-sm font-bold uppercase tracking-widest text-white/60 font-fun">Get Ready</div>
            </motion.div>
          </motion.div>
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
              className="w-full max-w-sm rounded-2xl border border-red-500/25 bg-surface-deep/95 px-5 py-4 text-center shadow-2xl"
            >
              <div className="font-fun text-[10px] font-bold uppercase tracking-[0.28em] text-red-300/70">
                Finalizing Match
              </div>
              <div className="mt-2 font-fun text-base font-black text-white">
                {forfeitPendingTitle}
              </div>
              <div className="mt-1 font-fun text-sm font-bold text-white/60">
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
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface-deep/95 px-5 py-4 text-center shadow-2xl"
            >
              <div className="font-fun text-[10px] font-bold uppercase tracking-[0.28em] text-white/50">
                Match Paused
              </div>
              <div className="mt-2 font-fun text-base font-black text-white">
                Opponent disconnected
              </div>
              <div className="mt-1 font-fun text-sm font-bold text-white/60">
                Waiting for them to reconnect
              </div>
              <div className="mt-3 inline-flex items-center justify-center rounded-full bg-brand-blue px-5 py-2 font-fun text-2xl font-black tabular-nums text-white">
                {pauseSeconds}
              </div>
              {reconnectCopy && (
                <div className="mt-3 font-fun text-xs font-bold uppercase tracking-wide text-brand-yellow">
                  {reconnectCopy}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-lg flex flex-col lg:max-w-7xl lg:flex-row lg:h-[calc(100dvh-2rem)] lg:items-stretch lg:gap-4 lg:px-4">
        {viewportModel && (
          <PossessionMatchViewport model={viewportModel}>
            {showQuestionArea && questionAreaModel && (
              <PossessionQuestionArea model={questionAreaModel} />
            )}

            {halftimeModel && (
              <HalftimeScreen {...halftimeModel} />
            )}
          </PossessionMatchViewport>
        )}
      </div>

      <QuitMatchModal
        open={quitModalOpen}
        onOpenChange={setQuitModalOpen}
        playerClubId={props.playerFavoriteClub}
        description="Leave temporarily and rejoin before the timer ends, or forfeit now."
        secondaryConfirmLabel="Leave Temporarily"
        onSecondaryConfirm={handleTemporaryQuit}
        confirmLabel="Forfeit Match"
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
