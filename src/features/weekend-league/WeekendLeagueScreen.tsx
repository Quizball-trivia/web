'use client';

import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import { poppins } from './constants';
import { useWeekendLeague } from './use-weekend-league';
import type { WeekendLeagueState } from './types';
import { LeagueHeader } from './components/LeagueHeader';
import { ScheduleTimeline } from './components/ScheduleTimeline';
import { YourStatusCard } from './components/YourStatusCard';
import { EntryPanel } from './components/EntryPanel';
import { HowItWorks } from './components/HowItWorks';
import { PrizesPanel } from './components/PrizesPanel';
import { QualifierLeaderboard } from './components/QualifierLeaderboard';
import { PlayoffBracket } from './components/PlayoffBracket';
import { LeagueCountdown } from './components/LeagueCountdown';
import { PhaseSwitcher } from './components/PhaseSwitcher';
import { LiveBadge } from './components/LiveBadge';
import { WeekendLeagueGame } from './components/game/WeekendLeagueGame';

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

      <LeagueHeader />

      <div className="rounded-2xl border-2 border-white/8 bg-surface-card-deep px-4 py-4">
        <ScheduleTimeline phase={wl.phase} milestones={wl.milestones} />
      </div>

      <YourStatusCard
        phase={wl.phase}
        hasEntered={wl.hasEntered}
        qualified={wl.qualified}
        yourRank={wl.yourRank}
        championName={wl.bracket?.championName ?? null}
      />

      <PhaseContent wl={wl} />
    </div>
  );
}

function PhaseContent({ wl }: { wl: ReturnType<typeof useWeekendLeague> }) {
  const { phase, milestones } = wl;

  if (phase === 'upcoming') {
    return (
      <>
        <EntryPanel
          mode="locked"
          countdownTarget={milestones?.entry.targetMs ?? null}
          countdownCaption="Your free entry unlocks Friday night."
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
        <EntryPanel
          mode={wl.hasEntered ? 'entered' : 'open'}
          countdownTarget={milestones?.qualifier.targetMs ?? null}
          countdownCaption="See you Saturday 14:00 — the qualifier starts for everyone at once."
          registered={wl.registered}
          onEnter={wl.enterLeague}
        />
        <HowItWorks />
        <PrizesPanel />
      </>
    );
  }

  if (phase === 'qualifier_live') {
    return (
      <>
        {wl.hasEntered ? (
          <div className="rounded-[24px] border-2 border-brand-cyan/40 bg-brand-cyan/[0.08] p-5 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <LiveBadge />
            </div>
            <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>Qualifier is live</div>
            <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
              Everyone plays the same questions right now. Post your best score before the whistle.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={wl.startQualifierGame}
              className="mx-auto mt-4 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green py-3.5 font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90"
            >
              <Play className="size-5 fill-current" /> Play now
            </motion.button>
          </div>
        ) : (
          <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-5 text-center">
            <div className="font-poppins text-lg font-black uppercase text-white">Entry closed</div>
            <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
              The qualifier is live but you didn&apos;t enter this week. You can still follow the standings below.
            </p>
          </div>
        )}
        <QualifierLeaderboard entries={wl.leaderboard} yourRank={wl.yourRank} live />
        <PrizesPanel />
      </>
    );
  }

  if (phase === 'qualifier_done') {
    return (
      <>
        <div
          className={`rounded-[24px] border-2 p-5 text-center ${
            wl.qualified ? 'border-brand-gold/40 bg-brand-gold/10' : 'border-white/10 bg-surface-card-deep'
          }`}
        >
          <div className="font-poppins text-[11px] font-black uppercase tracking-widest text-white/50">Playoffs start in</div>
          <div className="mt-1 font-poppins text-xl font-black uppercase text-white" style={poppins}>
            {wl.qualified ? "You're through to Sunday" : 'Sunday 14:00 · Georgian time'}
          </div>
          {milestones && (
            <div className="mt-4 flex justify-center">
              <LeagueCountdown targetMs={milestones.playoffs.targetMs} accent={wl.qualified ? 'text-brand-gold' : 'text-brand-yellow'} />
            </div>
          )}
        </div>
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
