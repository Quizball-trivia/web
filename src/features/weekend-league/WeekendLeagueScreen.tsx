'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, Play } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { PLAYOFF_CUTOFF, poppins } from './constants';
import { useWeekendLeague, type WeekendLeagueController } from './use-weekend-league';
import type { WeekendLeagueLiveExtras } from './use-weekend-league-live';
import type { WeekendLeagueState } from './types';
import { LeagueHeader } from './components/LeagueHeader';
import { YourStatusCard } from './components/YourStatusCard';
import { HowItWorks } from './components/HowItWorks';
import { PrizesPanel } from './components/PrizesPanel';
import { QualifierLeaderboard } from './components/QualifierLeaderboard';
import { PhaseSwitcher } from './components/PhaseSwitcher';
import { LiveBadge } from './components/LiveBadge';
import { WlLiveSimFlow } from './live/WlLiveSimFlow';

/**
 * Weekend League — the whole week on one screen: entry → Saturday qualifier →
 * Sunday playoffs. Without a `controller` it runs on the mock hook (the /dev/wl
 * prototype, where `showControls` adds the demo phase switcher); the in-app
 * placement injects the live backend-driven controller instead.
 */
export function WeekendLeagueScreen({
  showControls = true,
  initial,
  controller,
  onJoinLive,
  onWatchLive,
}: {
  showControls?: boolean;
  initial?: Partial<WeekendLeagueState>;
  controller?: WeekendLeagueController & Partial<WeekendLeagueLiveExtras>;
  /** Live-mode handlers: open the real socket-driven game/spectator flow. */
  onJoinLive?: () => void;
  onWatchLive?: () => void;
}) {
  const { t } = useLocale();
  const mock = useWeekendLeague(initial);
  const wl = controller ?? mock;
  // Without a live controller (the /dev/wl playground) every play/watch action
  // opens the SIMULATOR — the real live-game UI on a scripted driver. Real
  // players go through the socket flow via onJoinLive/onWatchLive.
  const playable = controller ? controller.playable === true && !controller.live : true;
  const [simulating, setSimulating] = useState(false);

  if (simulating) {
    return <WlLiveSimFlow onExit={() => setSimulating(false)} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5 font-fun">
      {showControls && (
        <PhaseSwitcher
          phase={wl.phase}
          hasEntered={wl.hasEntered}
          qualified={wl.qualified}
          onPhase={wl.setPhase}
          onEntered={wl.setEntered}
          onQualified={wl.setQualified}
        />
      )}

      {/* The whole phase view swaps as one block, so week transitions (entry →
          live → done) cross-fade instead of components popping in and out. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={wl.phase}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="space-y-5"
        >
          {/* Once a game is live the entry/QP card is spent — the screen is just
              play + live standings. Before kickoff it's the countdown card. */}
          {wl.phase !== 'qualifier_live' && wl.phase !== 'playoffs_live' && (
            <LeagueHeader
              phase={wl.phase}
              milestones={wl.milestones}
              qp={controller?.qp}
              qpTarget={controller?.qpTarget}
              qpQualified={controller?.qpQualified}
              canEnter={controller?.canEnter ?? true}
              hasEntered={wl.hasEntered}
              registered={wl.registered}
              result={
                wl.phase === 'qualifier_done'
                  ? { qualified: wl.qualified, rank: wl.yourRank, cutoff: PLAYOFF_CUTOFF }
                  : null
              }
              onEnter={wl.enterLeague}
            />
          )}

          {/* The blue header card already carries status + countdown + the
              entry CTA, so the status card only earns its spot once there is a
              real outcome to report (champion / weekend wrapped). */}
          {wl.phase !== 'upcoming' &&
            wl.phase !== 'entry_open' &&
            wl.phase !== 'qualifier_live' &&
            wl.phase !== 'qualifier_done' &&
            wl.phase !== 'playoffs_live' && (
            <YourStatusCard
              phase={wl.phase}
              hasEntered={wl.hasEntered}
              qualified={
                // In live mode "completed + qualified" reads as champion on the
                // card — only the actual winner gets that.
                wl.phase === 'completed' && controller?.live
                  ? (controller.champion ?? false)
                  : wl.qualified
              }
              yourRank={wl.yourRank}
            />
          )}

          {/* Sunday final check-in: the backend's final_checkin status maps to
              the qualifier_done phase, which otherwise has no action — without
              this card a finalist could never check in and would be marked a
              no-show. */}
          {controller?.live && controller.status === 'final_checkin' && wl.qualified && onJoinLive && (
            <div className="rounded-[24px] border-2 border-brand-gold/40 bg-brand-gold/10 p-5 text-center">
              <div className="mb-2 flex items-center justify-center gap-2"><LiveBadge /></div>
              <div className="font-poppins text-xl font-black uppercase text-white" style={poppins}>
                {controller.checkedIn ? t('weekendLeague.gCheckedIn') : t('weekendLeague.gCheckinTitle')}
              </div>
              <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
                {controller.checkedIn ? t('weekendLeague.gWaitingKickoff') : t('weekendLeague.gCheckinBody')}
              </p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onJoinLive}
                className="mx-auto mt-4 flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green py-3 font-poppins text-base font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
              >
                <Play className="size-5 fill-current" />
                {controller.checkedIn ? t('weekendLeague.joinGame') : t('weekendLeague.gCheckin')}
              </motion.button>
            </div>
          )}

          <PhaseContent
            wl={wl}
            onJoin={playable ? () => setSimulating(true) : onJoinLive}
            onJoinFinal={playable ? () => setSimulating(true) : onJoinLive}
            onWatch={playable ? () => setSimulating(true) : onWatchLive}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PhaseContent({
  wl,
  onJoin,
  onJoinFinal,
  onWatch,
}: {
  wl: WeekendLeagueController;
  /** Absent handler = that action isn't available — its CTA is not rendered. */
  onJoin?: () => void;
  /** The Sunday final runs the same gauntlet with only the finalists. */
  onJoinFinal?: () => void;
  onWatch?: () => void;
}) {
  const { t } = useLocale();
  const { phase } = wl;

  // The blue header card owns the countdown + entry state, so before the
  // week opens the page is just the format explainer and the prize ladder.
  if (phase === 'upcoming') {
    return (
      <>
        <HowItWorks />
        <PrizesPanel />
      </>
    );
  }

  if (phase === 'entry_open') {
    return (
      <>
        <HowItWorks />
        <PrizesPanel />
      </>
    );
  }

  if (phase === 'qualifier_live') {
    return (
      <>
        {wl.hasEntered ? (
          <div className="rounded-[24px] bg-brand-cyan/[0.08] p-5 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <LiveBadge />
            </div>
            <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>{t('weekendLeague.qualifierLive')}</div>
            <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
              {t('weekendLeague.qualifierLiveBody')}
            </p>
            {onJoin && (
              <>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={onJoin}
                  className="mx-auto mt-4 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
                >
                  <Play className="size-5 fill-current" /> {t('weekendLeague.joinGame')}
                </motion.button>
                <button
                  type="button"
                  onClick={onWatch}
                  hidden={!onWatch}
                  className="mx-auto mt-2.5 flex items-center justify-center gap-1.5 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/50 hover:text-white"
                >
                  <Eye className="size-4" /> {t('weekendLeague.watchLive')}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-[24px] border-2 border-white/10 p-5 text-center">
            <div className="font-poppins text-lg font-black uppercase text-white">
              {t('weekendLeague.entryClosedTitle')}
            </div>
            <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
              {t('weekendLeague.entryClosedLiveBody')}
            </p>
            {onWatch && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onWatch}
                className="mx-auto mt-4 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green py-3 font-poppins text-base font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
              >
                <Eye className="size-5" /> {t('weekendLeague.watchLive')}
              </motion.button>
            )}
          </div>
        )}
        <QualifierLeaderboard entries={wl.leaderboard} yourRank={wl.yourRank} />
      </>
    );
  }

  // The result card above already carries the outcome and the countdown, so
  // this phase is just the qualifier standings and the prize ladder.
  if (phase === 'qualifier_done') {
    return (
      <>
        <QualifierLeaderboard entries={wl.leaderboard} yourRank={wl.yourRank} />
        <PrizesPanel highlightRank={wl.yourRank} />
      </>
    );
  }

  // The Sunday final runs the same gauntlet as Saturday, just with the 24 who
  // qualified — no knockout bracket.
  if (phase === 'playoffs_live') {
    return (
      <>
        {wl.qualified ? (
          <div className="rounded-[24px] bg-brand-cyan/[0.08] p-5 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <LiveBadge />
            </div>
            <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>
              {t('weekendLeague.finalLive')}
            </div>
            <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
              {t('weekendLeague.finalLiveBody', { n: PLAYOFF_CUTOFF })}
            </p>
            {onJoinFinal && (
              <>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={onJoinFinal}
                  className="mx-auto mt-4 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
                >
                  <Play className="size-5 fill-current" /> {t('weekendLeague.joinGame')}
                </motion.button>
                <button
                  type="button"
                  onClick={onWatch}
                  hidden={!onWatch}
                  className="mx-auto mt-2.5 flex items-center justify-center gap-1.5 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/50 hover:text-white"
                >
                  <Eye className="size-4" /> {t('weekendLeague.watchLive')}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-[24px] border-2 border-white/10 p-5 text-center">
            <div className="font-poppins text-lg font-black uppercase text-white">
              {t('weekendLeague.notInFinal')}
            </div>
            <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
              {t('weekendLeague.notInFinalBody', { n: PLAYOFF_CUTOFF })}
            </p>
            {onWatch && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={onWatch}
                className="mx-auto mt-4 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green py-3 font-poppins text-base font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
              >
                <Eye className="size-5" /> {t('weekendLeague.watchLive')}
              </motion.button>
            )}
          </div>
        )}
        <QualifierLeaderboard
          entries={wl.leaderboard.slice(0, PLAYOFF_CUTOFF)}
          yourRank={wl.yourRank}
          live
        />
      </>
    );
  }

  if (phase === 'completed') {
    return (
      <>
        <QualifierLeaderboard
          entries={wl.leaderboard.slice(0, PLAYOFF_CUTOFF)}
          yourRank={wl.yourRank}
          title={t('weekendLeague.finalStandings')}
        />
        <PrizesPanel highlightRank={wl.qualified ? wl.yourRank : null} />
      </>
    );
  }

  return null;
}
