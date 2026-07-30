'use client';

import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, Play } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { PLAYOFF_CUTOFF, poppins } from './constants';
import { useWeekendLeague } from './use-weekend-league';
import type { WeekendLeagueState } from './types';
import { LeagueHeader } from './components/LeagueHeader';
import { YourStatusCard } from './components/YourStatusCard';
import { EntryPanel } from './components/EntryPanel';
import { HowItWorks } from './components/HowItWorks';
import { PrizesPanel } from './components/PrizesPanel';
import { QualifierLeaderboard } from './components/QualifierLeaderboard';
import { PlayoffBracket } from './components/PlayoffBracket';
import { PhaseSwitcher } from './components/PhaseSwitcher';
import { LiveBadge } from './components/LiveBadge';
import { WeekendLeagueGame } from './components/game/WeekendLeagueGame';
import { GauntletFlow } from './gauntlet/GauntletFlow';
import { SpectatorFlow } from './gauntlet/SpectatorFlow';
import type { GauntletExit } from './gauntlet/gauntlet.types';

/**
 * Weekend League — full frontend prototype (mock data). Renders the whole week:
 * entry → Saturday qualifier → Sunday playoffs. `showControls` adds the demo
 * phase switcher; turn it off for the "real" in-app placement.
 */
export function WeekendLeagueScreen({
  showControls = true,
  initial,
}: {
  showControls?: boolean;
  initial?: Partial<WeekendLeagueState>;
}) {
  const wl = useWeekendLeague(initial);
  const [liveMode, setLiveMode] = useState<'gauntlet' | 'spectate' | null>(null);

  const handleGauntletExit = useCallback(
    (exit: GauntletExit) => {
      setLiveMode(null);
      const outcome = { score: 0, correct: 0, total: 0, remaining: 0 };
      if (exit.status === 'finalist') {
        wl.finishQualifier(Math.min(exit.rank, 24), { ...outcome, score: exit.score });
      } else if (exit.status === 'eliminated') {
        wl.finishQualifier(Math.max(exit.rank, 25), { ...outcome, score: exit.score });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wl.finishQualifier],
  );

  if (liveMode === 'gauntlet') {
    return (
      <GauntletFlow
        registered={wl.registered}
        kickoffMs={null}
        canPlay={wl.hasEntered}
        startAtCheckIn
        onExit={handleGauntletExit}
        onWatch={() => setLiveMode('spectate')}
      />
    );
  }
  if (liveMode === 'spectate') {
    return <SpectatorFlow onExit={() => setLiveMode(null)} />;
  }

  // While a match is being played, the game flow takes over the whole screen.
  if (wl.session) {
    return (
      <WeekendLeagueGame
        kind={wl.session.kind}
        onExitQualifier={wl.finishQualifier}
        onExitPlayoff={wl.finishPlayoff}
        onCancel={wl.cancelGame}
      />
    );
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

      {/* Once the qualifier is live the entry/QP card is spent — the screen is
          just play + live standings. */}
      {wl.phase !== 'qualifier_live' && (
        <LeagueHeader
          phase={wl.phase}
          milestones={wl.milestones}
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


      {/* The header's status panel already states where you stand while entry
          is open, so the status card would just repeat it. */}
      {wl.phase !== 'entry_open' && wl.phase !== 'qualifier_live' && (
        <YourStatusCard
          phase={wl.phase}
          hasEntered={wl.hasEntered}
          qualified={wl.qualified}
          yourRank={wl.yourRank}
          championName={wl.bracket?.championName ?? null}
        />
      )}

      <PhaseContent wl={wl} onJoin={() => setLiveMode('gauntlet')} onWatch={() => setLiveMode('spectate')} />
    </div>
  );
}

function PhaseContent({
  wl,
  onJoin,
  onWatch,
}: {
  wl: ReturnType<typeof useWeekendLeague>;
  onJoin: () => void;
  onWatch: () => void;
}) {
  const { t } = useLocale();
  const { phase, milestones } = wl;

  if (phase === 'upcoming') {
    return (
      <>
        <EntryPanel
          mode="locked"
          countdownTarget={milestones?.entry.targetMs ?? null}
          countdownCaption="Claim before Friday 12:00."
          registered={wl.registered}
          onEnter={wl.enterLeague}
        />
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
              className="mx-auto mt-2.5 flex items-center justify-center gap-1.5 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/50 hover:text-white"
            >
              <Eye className="size-4" /> {t('weekendLeague.watchLive')}
            </button>
          </div>
        ) : (
          <div className="rounded-[24px] border-2 border-white/10 p-5 text-center">
            <div className="font-poppins text-lg font-black uppercase text-white">
              {t('weekendLeague.entryClosedTitle')}
            </div>
            <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
              {t('weekendLeague.entryClosedLiveBody')}
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onWatch}
              className="mx-auto mt-4 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green py-3 font-poppins text-base font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
            >
              <Eye className="size-5" /> {t('weekendLeague.watchLive')}
            </motion.button>
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

  if (phase === 'playoffs_live' && wl.bracket) {
    const eliminated = wl.playoffOutcome?.status === 'out';
    return (
      <>
        {wl.qualified && !eliminated && (
          <div className="rounded-[24px] border-2 border-brand-gold/40 bg-brand-gold/10 p-5 text-center">
            <div className="mb-2 flex items-center justify-center">
              <LiveBadge />
            </div>
            <div className="font-poppins text-xl font-black uppercase text-white" style={poppins}>Your match is up</div>
            <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
              Win your knockout tie to advance. Lose and your weekend is over.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={wl.startPlayoffGame}
              className="mx-auto mt-4 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
            >
              <Play className="size-5 fill-current" /> Play your match
            </motion.button>
          </div>
        )}
        {eliminated && (
          <div className="rounded-[24px] border-2 border-brand-red-soft/40 bg-brand-red-soft/10 p-5 text-center">
            <div className="font-poppins text-lg font-black uppercase text-brand-red-soft">Knocked out</div>
            <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/70">
              You were beaten in the {wl.playoffOutcome?.status === 'out' ? wl.playoffOutcome.roundName : ''}. Watch the rest of the bracket play out below.
            </p>
          </div>
        )}
        <PlayoffBracket bracket={wl.bracket} live />
        <PrizesPanel highlightRank={wl.qualified ? wl.yourRank : null} />
      </>
    );
  }

  if (phase === 'completed' && wl.bracket) {
    return (
      <>
        <PlayoffBracket bracket={wl.bracket} />
        <QualifierLeaderboard entries={wl.leaderboard} yourRank={wl.yourRank} title="Final standings" />
        <PrizesPanel highlightRank={wl.qualified ? wl.yourRank : null} />
      </>
    );
  }

  return null;
}
