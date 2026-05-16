'use client';

/**
 * Bar-battle playground.
 *
 * Mounts the real `BarBattleOverlay` inside a pitch-sized SVG (the same
 * viewBox the production pitch uses), with sliders to pick each side's
 * earned points. "Play" walks through the production phase machine with
 * the exact timing used by `useBarBattle`:
 *
 *   player-score → opponent-score → both-score → convert → bars → battle → result → done
 *
 * Variant toggle exposes both the classic centre-clash layout and the
 * avatar-anchored variant (ranked_sim) where bars spawn below each
 * avatar and pairs annihilate in place.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  BarBattleOverlay,
  type BarBattlePhase,
  type BarBattleState,
} from '@/features/possession/components/BarBattleOverlay';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import type { MatchStartPayload } from '@/lib/realtime/socket.types';

// Mirror the constants from useBarBattle.ts so production timing stays in sync.
const POINTS_PER_BAR = 10;
const MAX_BARS = 12;
const BOTH_SCORE_HOLD_MS = 400;
const CONVERT_DURATION = 500;
const BARS_SPAWN_BASE_MS = 300;
const BARS_PER_STAGGER_MS = 80;
const BATTLE_BASE_MS = 200;
const BATTLE_PER_BAR_MS = 150;
const RESULT_HOLD_MS = 500;
const DONE_LINGER_MS = 100;

// Inter-splash stagger — production fires player-score on answer ack, then
// opponent-score arrives later from the network. We pick a snappy ~250ms
// between them so the playground reads naturally.
const PLAYER_TO_OPP_DELAY_MS = 250;
const OPP_TO_BOTH_DELAY_MS = 250;

const MATCH_ID = 'dev-bar-battle';
const SELF_ID = 'dev-self';
const OPP_ID = 'dev-opp';

function pointsToBars(points: number): number {
  if (points <= 0) return 0;
  return Math.min(Math.max(Math.round(points / POINTS_PER_BAR), 1), MAX_BARS);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function makeStartPayload(variant: 'ranked_sim' | 'friendly_possession'): MatchStartPayload {
  return {
    matchId: MATCH_ID,
    mode: variant === 'ranked_sim' ? 'ranked' : 'friendly',
    variant,
    mySeat: 1,
    opponent: { id: OPP_ID, username: 'Opp', avatarUrl: null },
    participants: [
      { userId: SELF_ID, username: 'Me', avatarUrl: null, seat: 1 },
      { userId: OPP_ID, username: 'Opp', avatarUrl: null, seat: 2 },
    ],
  };
}

export default function DevBarBattlePage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }
  return <DevBarBattleContent />;
}

function DevBarBattleContent() {
  const router = useRouter();

  // Variant selection drives BarBattleOverlay's anchored/classic mode via the
  // realtime match store.
  const [variant, setVariant] = useState<'ranked_sim' | 'friendly_possession'>('ranked_sim');
  const [myPoints, setMyPoints] = useState(30);
  const [oppPoints, setOppPoints] = useState(20);
  const [mirrored, setMirrored] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [autoLoop, setAutoLoop] = useState(false);

  const [battle, setBattle] = useState<BarBattleState | null>(null);
  const [playKey, setPlayKey] = useState(0);
  // Possession 0-100: 50 = centre. Surviving bars push it toward the
  // opponent's goal, which moves both avatars together along the pitch.
  // Matches production's `playerPosition` model in PitchVisualization.
  const [possession, setPossession] = useState(50);
  const timers = useRef<number[]>([]);

  // Seed the store so BarBattleOverlay picks up the variant (ranked_sim →
  // avatar-anchored).
  useEffect(() => {
    const s = useRealtimeMatchStore.getState();
    s.reset();
    s.setSelfUserId(SELF_ID);
    s.setMatchStart(makeStartPayload(variant));
    return () => {
      useRealtimeMatchStore.getState().reset();
    };
  }, [variant]);

  // Cleanup timers on unmount
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function play() {
    // Clear any in-flight timeline
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];

    const myBars = pointsToBars(myPoints);
    const oppBars = pointsToBars(oppPoints);
    const cancelledCount = Math.min(myBars, oppBars);
    const maxBars = Math.max(myBars, oppBars);
    const delta = myBars - oppBars;
    const key = playKey;
    // Divider X — pitch centre in production. The classic variant clusters
    // around it; the anchored variant ignores it for spawn positions.
    const dividerX = 242.5;

    const baseState: BarBattleState = {
      key,
      phase: 'player-score',
      playerBars: 0,
      opponentBars: 0,
      playerPoints: 0,
      opponentPoints: 0,
      remainingDelta: 0,
      dividerX,
    };

    function step(phase: BarBattlePhase, delayMs: number, patch?: Partial<BarBattleState>) {
      const t = window.setTimeout(() => {
        setBattle((prev) => ({ ...(prev ?? baseState), ...(patch ?? {}), phase, key }));
      }, delayMs);
      timers.current.push(t);
    }

    // Step 1: player splash (just my points filled)
    setBattle({ ...baseState, playerPoints: myPoints, phase: 'player-score' });

    // Step 2: opponent splash arrives → 'both-score' shows both numbers
    step('both-score', PLAYER_TO_OPP_DELAY_MS, { opponentPoints: oppPoints });

    // Step 3 onwards mirrors useBarBattle.ts timing
    let t = PLAYER_TO_OPP_DELAY_MS + OPP_TO_BOTH_DELAY_MS;
    step('both-score', t, {
      playerBars: myBars,
      opponentBars: oppBars,
      playerPoints: myPoints,
      opponentPoints: oppPoints,
      remainingDelta: delta,
    });

    t += BOTH_SCORE_HOLD_MS;
    step('convert', t);

    t += CONVERT_DURATION;
    step('bars', t);

    const barsPhaseMs = BARS_SPAWN_BASE_MS + maxBars * BARS_PER_STAGGER_MS;
    t += barsPhaseMs;
    step('battle', t);

    const battleMs = BATTLE_BASE_MS + cancelledCount * BATTLE_PER_BAR_MS;
    t += battleMs;
    step('result', t);

    // Push the avatars when the surviving bars resolve. Each surviving bar
    // is worth ~4.5% of the pitch — matches the feel of production's
    // possessionDiff conversion (10 pts ≈ ~5% nudge).
    const PUSH_PER_BAR = 4.5;
    const surviving = myBars - oppBars;
    const pushDelay = t + 60; // tiny beat after result begins
    const tPush = window.setTimeout(() => {
      setPossession((p) => clamp(p + surviving * PUSH_PER_BAR, 0, 100));
    }, pushDelay);
    timers.current.push(tPush);

    t += RESULT_HOLD_MS;
    step('done', t);

    t += DONE_LINGER_MS;
    const tEnd = window.setTimeout(() => {
      setBattle(null);
      if (autoLoop) {
        const tLoop = window.setTimeout(() => setPlayKey((k) => k + 1), 400);
        timers.current.push(tLoop);
      }
    }, t);
    timers.current.push(tEnd);
  }

  // Replay when autoLoop ticks playKey
  useEffect(() => {
    if (playKey === 0) return;
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);

  function replay() {
    setBattle(null);
    setPlayKey((k) => k + 1);
  }

  function stop() {
    setAutoLoop(false);
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setBattle(null);
  }

  // Avatar positions driven by `possession` (0..100), matching production's
  // PitchVisualization formula: the player avatar slides across the pitch as
  // possession shifts, with the opponent shadowing 30 units offset.
  const pitchWidth = isPortrait ? 230 : 500;
  const leftAnchor = 15;
  const rightAnchor = pitchWidth - 30;
  const travel = rightAnchor - leftAnchor;
  const centreX = (leftAnchor + rightAnchor) / 2;
  const playerAvatarX = mirrored
    ? rightAnchor - (possession / 100) * travel + 35
    : leftAnchor + (possession / 100) * travel - 35;
  const opponentAvatarX = mirrored
    ? rightAnchor - (possession / 100) * travel - 35
    : leftAnchor + (possession / 100) * travel + 35;

  const myBars = pointsToBars(myPoints);
  const oppBars = pointsToBars(oppPoints);

  return (
    <div className="relative min-h-dvh bg-surface-page-alt">
      <div className="lg:pl-72">
        <div className="relative flex min-h-dvh flex-col items-center justify-center p-6 gap-4">
          {/* Pitch surface */}
          <div
            className="relative w-full max-w-[820px] rounded-[20px] overflow-hidden shadow-2xl"
            style={{
              background:
                'linear-gradient(180deg, #1e5c32 0%, #1a472a 60%, #143820 100%)',
              aspectRatio: isPortrait ? '230 / 500' : '500 / 230',
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.06) 50px, rgba(255,255,255,0.06) 100px)',
              }}
            />
            <svg
              viewBox={isPortrait ? '0 0 230 500' : '0 0 500 230'}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 overflow-visible"
            >
              {/* Centre line + circle to match the production pitch */}
              <line x1={centreX} y1="0" x2={centreX} y2="230" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
              <circle cx={centreX} cy="115" r="36" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" fill="none" />

              {/* Player & opponent avatars — animate cx via motion so the
                  push at 'result' phase reads as the avatar charging through
                  the cancelled bars. Bar positions track these via the
                  `playerAvatarX` / `opponentAvatarX` props on BarBattleOverlay. */}
              <motion.g
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 16 }}
              >
                <motion.circle
                  cy={115} r={20} fill="#1CB0F6" opacity={0.95}
                  animate={{ cx: playerAvatarX }}
                  transition={{ type: 'spring', stiffness: 90, damping: 14 }}
                />
                <motion.text
                  y={119} textAnchor="middle" fontSize="10" fontWeight="900" fill="white"
                  animate={{ x: playerAvatarX }}
                  transition={{ type: 'spring', stiffness: 90, damping: 14 }}
                >
                  YOU
                </motion.text>
              </motion.g>
              <motion.g>
                <motion.circle
                  cy={115} r={20} fill="#FF4B4B" opacity={0.95}
                  animate={{ cx: opponentAvatarX }}
                  transition={{ type: 'spring', stiffness: 90, damping: 14 }}
                />
                <motion.text
                  y={119} textAnchor="middle" fontSize="10" fontWeight="900" fill="white"
                  animate={{ x: opponentAvatarX }}
                  transition={{ type: 'spring', stiffness: 90, damping: 14 }}
                >
                  OPP
                </motion.text>
              </motion.g>

              {/* The actual overlay */}
              {battle && (
                <BarBattleOverlay
                  battle={battle}
                  mirrored={mirrored}
                  playerAvatarX={playerAvatarX}
                  opponentAvatarX={opponentAvatarX}
                  isPortrait={isPortrait}
                />
              )}
            </svg>
          </div>

          {/* Computed values */}
          <div className="rounded-xl bg-surface-card/70 backdrop-blur px-4 py-2 text-[11px] text-white/80 font-mono flex items-center gap-4">
            <span>my bars: <span className="text-brand-cyan">{myBars}</span></span>
            <span>opp bars: <span className="text-brand-red-soft">{oppBars}</span></span>
            <span>cancelled: <span className="text-white">{Math.min(myBars, oppBars)}</span></span>
            <span>surviving Δ: <span className="text-brand-yellow">{myBars - oppBars}</span></span>
            <span>possession: <span className="text-brand-green">{possession.toFixed(0)}%</span></span>
            <span>phase: <span className="text-white">{battle?.phase ?? 'idle'}</span></span>
          </div>
        </div>
      </div>

      <aside className="fixed left-4 top-4 bottom-4 z-[60] hidden w-64 overflow-y-auto rounded-2xl border border-surface-card-light bg-surface-card/95 p-4 shadow-2xl backdrop-blur font-fun lg:block">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-brand-yellow">
            Bar Battle Lab
          </h2>
          <button
            onClick={() => router.push('/play')}
            className="text-[10px] font-bold uppercase tracking-wider text-brand-slate hover:text-white"
          >
            exit
          </button>
        </div>

        <Group label="Points (per round)">
          <Slider min={0} max={120} step={5} value={myPoints} onChange={setMyPoints} label="You" suffix={`(${pointsToBars(myPoints)} bars)`} />
          <Slider min={0} max={120} step={5} value={oppPoints} onChange={setOppPoints} label="Opp" suffix={`(${pointsToBars(oppPoints)} bars)`} />
        </Group>

        <Group label="Variant">
          <Segmented
            options={['ranked_sim', 'friendly_possession'] as const}
            value={variant}
            onChange={setVariant}
            labels={{ ranked_sim: 'Anchored', friendly_possession: 'Classic' }}
          />
          <p className="mt-1 text-[9px] text-brand-slate">
            Anchored: bars spawn below each avatar, pairs annihilate in place.<br />
            Classic: bars cluster at the centre divider and march in to clash.
          </p>
        </Group>

        <Group label="Orientation">
          <Toggle checked={mirrored} onChange={setMirrored} label="Mirrored (2nd half)" />
          <Toggle checked={isPortrait} onChange={setIsPortrait} label="Portrait layout" />
        </Group>

        <Group label="Loop">
          <Toggle checked={autoLoop} onChange={setAutoLoop} label="Auto-replay" />
        </Group>

        <button
          onClick={replay}
          className="mb-2 w-full rounded-xl bg-brand-green px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_0_var(--color-brand-green-deep)] active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-brand-green-deep)]"
        >
          ▶ Play
        </button>
        <button
          onClick={stop}
          className="mb-2 w-full rounded-xl border border-white/15 bg-transparent px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white/80 hover:bg-white/5"
        >
          ■ stop
        </button>
        <button
          onClick={() => setPossession(50)}
          className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white/80 hover:bg-white/5"
        >
          ⟲ centre avatars
        </button>

        <p className="mt-3 text-[10px] leading-tight text-brand-slate">
          Timing mirrors <code className="text-white/60">useBarBattle</code>:
          player splash → opp splash → both-score → convert → bars → battle → result.
        </p>
      </aside>

      <div className="lg:hidden fixed top-2 left-2 right-2 z-[60] rounded-lg bg-brand-yellow/95 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-surface-page">
        Open on desktop (≥1024px) for the control panel
      </div>
    </div>
  );
}

// ─── Side panel primitives ──────────────────────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-brand-slate-light">
        {label}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Slider({
  min, max, step, value, onChange, label, suffix,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  label?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-[10px] text-brand-slate">
        {label && <span>{label}</span>}
        <span className="ml-auto font-mono text-white">
          {value}
          {suffix ? ` ${suffix}` : ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-brand-cyan"
      />
    </label>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex rounded-lg bg-surface-deep p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
            value === opt ? 'bg-brand-cyan text-surface-page' : 'text-brand-slate hover:text-white'
          }`}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-brand-green' : 'bg-surface-card-light'}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}
