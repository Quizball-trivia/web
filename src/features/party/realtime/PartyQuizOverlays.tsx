'use client';

/**
 * Top-of-screen overlays for the realtime party quiz: kickoff/resume
 * countdown puck, forfeit-pending banner, and the pause banner.
 *
 * Pure presentation — every dynamic input comes from the view-model.
 * Each overlay is its own AnimatePresence so they can show/hide
 * independently.
 */

import { AnimatePresence, motion } from 'motion/react';
import type { MatchForfeitPendingPayload } from '@/lib/realtime/socket.types';
import { MatchCountdownPuck } from '@/components/shared/MatchCountdownPuck';
import { MatchWaitingForReadyOverlay } from '@/components/shared/MatchWaitingForReadyOverlay';
import { useLocale } from '@/contexts/LocaleContext';
import type { MatchStatus } from '@/stores/realtime-match/types';

interface PartyQuizOverlaysProps {
  startCountdownActive: boolean;
  countdownSeconds: number;
  countdownReason: 'kickoff' | 'resume' | string | null | undefined;
  forfeitPending: MatchForfeitPendingPayload | null;
  forfeitPendingTitle: string;
  matchPaused: boolean;
  pauseSeconds: number;
  waitingForReady: MatchStatus['waitingForReady'];
}

export function PartyQuizOverlays({
  startCountdownActive,
  countdownSeconds,
  countdownReason,
  forfeitPending,
  forfeitPendingTitle,
  matchPaused,
  pauseSeconds,
  waitingForReady,
}: PartyQuizOverlaysProps) {
  const { t } = useLocale();
  const waitingReadyLabel = waitingForReady
    ? t('partyResults.playersReadyCount', { ready: waitingForReady.readyCount, total: waitingForReady.totalCount })
    : '';
  const waitingTotalCount = waitingForReady?.totalCount ?? 0;
  const waitingTitle = waitingTotalCount <= 1
    ? t('partyResults.gettingMatchReady')
    : waitingTotalCount > 2
      ? t('partyResults.waitingForPlayers')
      : t('partyResults.waitingForOpponent');
  const waitingDetailLabel = waitingForReady?.phase === 'resume'
    ? t('partyResults.resumesAfterReady')
    : t('partyResults.startsAfterReady');
  // i18n subtitle keyed off the reason — the server's payload.message is
  // English-only, so rendering it raw leaked English onto the KA client.
  const forfeitPendingSubtitle =
    forfeitPending?.reason === 'opponent_forfeit' || forfeitPending?.reason === 'opponent_reconnect_limit'
      ? t('forfeit.youWinByForfeit')
      : t('forfeit.youLostMatch');

  return (
    <>
      <AnimatePresence>
        {waitingForReady && !startCountdownActive && (
          <MatchWaitingForReadyOverlay
            key="party-waiting-for-ready"
            title={waitingTitle}
            readyLabel={waitingReadyLabel}
            detailLabel={waitingDetailLabel}
            className="absolute inset-0 z-40 min-h-full"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {startCountdownActive && (
          <motion.div
            key="party-countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-surface-page-alt/45 backdrop-blur-[1.5px]" />
            <div className="relative">
              <MatchCountdownPuck
                label={countdownReason === 'resume' ? t('partyResults.resumingIn') : t('partyResults.quizStartsIn')}
                seconds={Math.max(1, countdownSeconds)}
                size="md"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forfeitPending && (
          <motion.div
            key="party-forfeit-pending"
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
              <div className="mt-2 font-poppins text-xl font-semibold uppercase text-white">{forfeitPendingTitle}</div>
              <div className="mt-1 font-poppins text-sm font-semibold text-white/70">{forfeitPendingSubtitle}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {matchPaused && pauseSeconds > 0 && (
          <motion.div
            key="party-pause"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute left-1/2 top-4 z-30 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 rounded-[20px] bg-brand-blue px-5 py-3 shadow-2xl"
          >
              <div className="text-center font-poppins">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">{t('partyResults.matchPaused')}</div>
                <div className="mt-1 text-base font-semibold uppercase text-white">{t('partyResults.waitingForReconnect')}</div>
              <div className="mt-1 text-xs font-semibold text-brand-yellow">{t('partyResults.opponentDisconnectedContinueIfNotReturn', { seconds: pauseSeconds })}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
