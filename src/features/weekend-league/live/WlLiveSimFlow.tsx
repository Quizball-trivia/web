'use client';

// /dev/wl "Simulate" mode: the REAL live-game UI (WlLiveFlowView — the exact
// component the weekend league renders in production) driven by the scripted
// useWlSimulated state machine. Walks check-in → game intro → all five
// question kinds → reveals → standings → elimination → break → three games →
// champion, with every real animation. Iterate on the shared components and
// this, the playground AND live play all change together.

import { useEffect, useState } from 'react';
import { FastForward, RotateCcw, X } from 'lucide-react';
import { GauntletBackdrop } from '../gauntlet/RoundViews';
import { GauntletLobby } from '../gauntlet/GauntletScreens';
import { buildGames } from '../gauntlet/gauntlet.data';
import { WlLiveFlowView } from './WlLiveFlow';
import { SIM_SELF_ID, useWlSimulated, type SimJumpTarget } from './useWlSimulated';

/** Every designed screen, addressable from the sim bar. */
const SCREENS: { label: string; go: SimJumpTarget | 'lobby' | 'checkin' }[] = [
  // 'lobby' is reachable via Restart; the picker starts at check-in.
  { label: 'lobby', go: 'lobby' },
  { label: 'check-in', go: 'checkin' },
  { label: 'intro', go: { kind: 'question', round: 0 } },
  { label: 'T/F', go: { kind: 'question', round: 0, skipIntro: true } },
  { label: 'hi/lo', go: { kind: 'question', round: 1, skipIntro: true } },
  { label: 'MCQ', go: { kind: 'question', round: 2, skipIntro: true } },
  { label: 'career', go: { kind: 'question', round: 3, skipIntro: true } },
  { label: 'who am i', go: { kind: 'question', round: 4, skipIntro: true } },
  { label: 'reveal', go: { kind: 'reveal', round: 2 } },
  { label: 'result', go: { kind: 'game_result' } },
  { label: 'break', go: { kind: 'break' } },
  { label: 'champion', go: { kind: 'final' } },
];

const CHECKIN_WINDOW_MS = 25_000;
const SIM_FIELD = 600;

export function WlLiveSimFlow({ onExit }: { onExit: () => void }) {
  const { live, sim } = useWlSimulated();
  const [phase, setPhase] = useState<'lobby' | 'checkin' | 'playing'>('lobby');
  const [checkedIn, setCheckedIn] = useState(false);
  const [kickoffMs, setKickoffMs] = useState(() => Date.now() + CHECKIN_WINDOW_MS);

  // Kickoff when the simulated check-in window closes (checked in or not —
  // the sim always lets you watch the games). The scripted driver ticks from
  // mount, so RESTART it at kickoff — gameplay must open on game 1 question 1,
  // not wherever the script drifted while the lobby/check-in was showing.
  const { restart } = sim;
  useEffect(() => {
    if (phase !== 'checkin') return;
    const id = setTimeout(() => {
      restart();
      setPhase('playing');
    }, Math.max(0, kickoffMs - Date.now()));
    return () => clearTimeout(id);
  }, [phase, kickoffMs, restart]);

  if (phase === 'lobby') {
    return (
      <GauntletBackdrop>
        <GauntletLobby
          games={buildGames(SIM_FIELD)}
          registered={SIM_FIELD}
          kickoffMs={kickoffMs}
          canPlay
          onEnter={() => { setKickoffMs(Date.now() + CHECKIN_WINDOW_MS); setPhase('checkin'); }}
          onWatch={() => { setKickoffMs(Date.now() + CHECKIN_WINDOW_MS); setPhase('checkin'); }}
        />
        <button
          type="button"
          onClick={onExit}
          className="fixed left-3 top-3 z-50 flex size-10 items-center justify-center rounded-full bg-black/40 font-poppins text-white/80 backdrop-blur hover:bg-black/60"
          aria-label="Exit simulation"
        >
          <X className="size-5" />
        </button>
      </GauntletBackdrop>
    );
  }

  return (
    <>
      <WlLiveFlowView
        live={live}
        selfUserId={SIM_SELF_ID}
        role="player"
        status={phase === 'checkin' ? 'checkin' : 'game_live'}
        checkedIn={checkedIn}
        checkinPending={false}
        onCheckin={() => setCheckedIn(true)}
        onExit={onExit}
        onSpectate={onExit}
        kickoffMs={kickoffMs}
        registered={SIM_FIELD}
        checkedInCount={Math.min(SIM_FIELD, 512 + (checkedIn ? 1 : 0))}
        breakUntilMs={sim.breakUntilMs}
        currentGameIndex={live.gameIndex}
      />

      {/* Sim controls — float above the real UI, never part of it. */}
      <div className="fixed bottom-4 left-1/2 z-[60] flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-2xl border-2 border-brand-purple/40 bg-black/85 px-3 py-2 backdrop-blur">
        <span className="font-poppins text-[10px] font-black uppercase tracking-widest text-brand-purple">
          SIM
        </span>
        {/* Screen picker: jump straight to any designed screen. */}
        {SCREENS.map((sc) => {
          // The lobby returns early, so only check-in / playing reach here.
          // intro vs T/F share a step — the lead phase tells them apart.
          const active = phase === 'checkin'
            ? sc.go === 'checkin'
            : typeof sc.go === 'object' && sim.current != null
              && sc.go.kind === sim.current.kind
              && (!('round' in sc.go) || !('round' in sim.current) || sc.go.round === sim.current.round)
              && (sc.go.kind !== 'question' || (sc.go.skipIntro ?? false) !== sim.inLead);
          return (
            <button
              key={sc.label}
              type="button"
              onClick={() => {
                if (sc.go === 'lobby') { sim.restart(); setPhase('lobby'); return; }
                if (sc.go === 'checkin') { setKickoffMs(Date.now() + CHECKIN_WINDOW_MS); setCheckedIn(false); setPhase('checkin'); return; }
                setPhase('playing');
                sim.jumpTo(sc.go);
              }}
              className={`rounded-lg px-2 py-1 font-poppins text-[10px] font-black uppercase tracking-wide transition-colors ${
                active ? 'bg-brand-purple text-white' : 'bg-white/8 text-white/55 hover:bg-white/15'
              }`}
            >
              {sc.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            if (phase === 'playing') { sim.skip(); return; }
            sim.restart();
            setPhase('playing');
          }}
          className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 font-poppins text-[11px] font-black uppercase text-white hover:bg-white/20"
        >
          <FastForward className="size-3.5" /> Skip
        </button>
        <button
          type="button"
          onClick={() => { sim.restart(); setCheckedIn(false); setKickoffMs(Date.now() + CHECKIN_WINDOW_MS); setPhase('lobby'); }}
          className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 font-poppins text-[11px] font-black uppercase text-white hover:bg-white/20"
        >
          <RotateCcw className="size-3.5" /> Restart
        </button>
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 font-poppins text-[11px] font-black uppercase text-white/70 hover:bg-white/20"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </>
  );
}
