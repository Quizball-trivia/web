'use client';

import { AnimatePresence, motion } from 'motion/react';
import { QuitMatchModal } from '@/features/game/components/QuitMatchModal';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { BarBattleFlightOverlay } from './components/BarBattleFlightOverlay';
import { HalftimeScreen } from './components/HalftimeScreen';
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

  const {
    isReady,
    showStartCountdown,
    countdownDisplay,
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

  if (!isReady) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-surface-page-alt">
        {showStartCountdown ? (
          <div className="flex flex-col items-center gap-2">
            <div className="text-xs font-bold uppercase tracking-[0.28em] text-white/60 font-fun">Kickoff in</div>
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
      <button
        onClick={toggleMuted}
        className="fixed top-4 left-4 z-40 flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg text-white transition-colors hover:bg-white/20"
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
        aria-pressed={muted}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '\ud83d\udd07' : '\ud83d\udd0a'}
      </button>

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
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-white/70 font-fun">Kickoff in</div>
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
