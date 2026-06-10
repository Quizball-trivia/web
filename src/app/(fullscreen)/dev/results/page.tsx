'use client';

/**
 * Dev playground for iterating on the ranked-match results screen.
 *
 * Mounts the production `RealtimePossessionMatchScreen`'s sibling
 * `RealtimeResultsScreen` with dummy data so the UI can be tuned without
 * playing a real match. A side panel exposes the variables that change
 * the visual: outcome (win/loss/draw), RP delta, accuracy, XP, achievements,
 * etc.
 *
 * Production code paths are untouched — guarded by NODE_ENV.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RealtimeResultsScreen } from '@/features/game/RealtimeResultsScreen';
import { getRankedTierProgress } from '@/utils/rankedTier';
import type {
  AchievementUnlockPayload,
  RankedMatchOutcomePayload,
} from '@/lib/realtime/socket.types';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import type { UserProgression } from '@/lib/domain';

const SELF_ID = 'dev-self';
const OPP_ID = 'dev-opp';

type Outcome = 'win' | 'loss' | 'draw';

const ACHIEVEMENT_SAMPLES: AchievementUnlockPayload[] = [
  {
    id: 'first_win',
    title: { en: 'First Blood' },
    description: { en: 'Win your first ranked match' },
    icon: 'Trophy',
    unlocked: true,
    progress: 1,
    target: 1,
    unlockedAt: new Date().toISOString(),
  },
  {
    id: 'sharp_shooter',
    title: { en: 'Sharp Shooter' },
    description: { en: '90%+ accuracy in a ranked match' },
    icon: 'Star',
    unlocked: true,
    progress: 1,
    target: 1,
    unlockedAt: new Date().toISOString(),
  },
];

export default function DevResultsPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }
  return <DevResultsContent />;
}

function DevResultsContent() {
  const router = useRouter();

  const [outcome, setOutcome] = useState<Outcome>('loss');
  const [preMatchRp, setPreMatchRp] = useState(495);
  const [rpDelta, setRpDelta] = useState(35);
  const [playerGoals, setPlayerGoals] = useState(0);
  const [opponentGoals, setOpponentGoals] = useState(5);
  const [playerCorrect, setPlayerCorrect] = useState(7);
  const [opponentCorrect, setOpponentCorrect] = useState(10);
  const [totalQuestions, setTotalQuestions] = useState(12);
  const [withAchievements, setWithAchievements] = useState(false);
  const [withProgression, setWithProgression] = useState(true);
  const [withQuestionDots, setWithQuestionDots] = useState(true);
  // Tick to force-remount the results screen so internal animations replay.
  const [replayKey, setReplayKey] = useState(0);

  // Build per-question result arrays from the correct/total counts. Marks the
  // first N as correct, the rest as wrong (questions beyond what either player
  // saw are left as null → hollow yellow rings).
  const playerQuestionResults = useMemo<Array<'correct' | 'wrong' | null>>(() => {
    if (!withQuestionDots) return [];
    return Array.from({ length: totalQuestions }, (_, i) =>
      i < playerCorrect ? 'correct' : 'wrong'
    );
  }, [withQuestionDots, totalQuestions, playerCorrect]);

  const opponentQuestionResults = useMemo<Array<'correct' | 'wrong' | null>>(() => {
    if (!withQuestionDots) return [];
    return Array.from({ length: totalQuestions }, (_, i) =>
      i < opponentCorrect ? 'correct' : 'wrong'
    );
  }, [withQuestionDots, totalQuestions, opponentCorrect]);

  const signedRpDelta = useMemo(() => {
    if (outcome === 'draw') return 0;
    // For loss show a negative delta unless the slider is explicitly negative.
    if (outcome === 'loss') return -Math.abs(rpDelta);
    return Math.abs(rpDelta);
  }, [outcome, rpDelta]);

  const newRp = useMemo(
    () => Math.max(0, Math.min(3500, preMatchRp + signedRpDelta)),
    [preMatchRp, signedRpDelta]
  );

  // Opponent's pre/post RP for the rankedOutcome — independent of the
  // player's. We mirror the player's outcome (inverted sign) by default so
  // the opp tier badge always shows on the right side.
  const [opponentPreMatchRp, setOpponentPreMatchRp] = useState(950);
  const opponentSignedRpDelta = -signedRpDelta;
  const opponentNewRp = Math.max(0, Math.min(3500, opponentPreMatchRp + opponentSignedRpDelta));

  const rankedOutcome: RankedMatchOutcomePayload = useMemo(() => {
    const oldTier = getRankedTierProgress(preMatchRp).tier;
    const newTier = getRankedTierProgress(newRp).tier;
    const oppOldTier = getRankedTierProgress(opponentPreMatchRp).tier;
    const oppNewTier = getRankedTierProgress(opponentNewRp).tier;
    return {
      isPlacement: false,
      byUserId: {
        [SELF_ID]: {
          userId: SELF_ID,
          oldRp: preMatchRp,
          newRp,
          deltaRp: signedRpDelta,
          // Mirrors backend: win 300, anything else (loss/draw) 100.
          coinsAwarded: outcome === 'win' ? 300 : 100,
          oldTier,
          newTier,
          placementStatus: 'placed',
          placementPlayed: 0,
          placementRequired: 0,
          isPlacement: false,
        },
        [OPP_ID]: {
          userId: OPP_ID,
          oldRp: opponentPreMatchRp,
          newRp: opponentNewRp,
          deltaRp: opponentSignedRpDelta,
          coinsAwarded: outcome === 'loss' ? 300 : 100,
          oldTier: oppOldTier,
          newTier: oppNewTier,
          placementStatus: 'placed',
          placementPlayed: 0,
          placementRequired: 0,
          isPlacement: false,
        },
      },
    };
  }, [preMatchRp, newRp, signedRpDelta, opponentPreMatchRp, opponentNewRp, opponentSignedRpDelta, outcome]);

  const preMatchRankedProfile = useMemo<RankedProfileResponse>(() => ({
    rp: preMatchRp,
    tier: getRankedTierProgress(preMatchRp).tier,
    placementStatus: 'placed',
    placementPlayed: 0,
    placementRequired: 0,
    placementWins: 0,
    currentWinStreak: 0,
    lastRankedMatchAt: null,
  }), [preMatchRp]);

  const preMatchProgression = useMemo<UserProgression | null>(
    () => withProgression
      ? { level: 8, totalXp: 1280, currentLevelXp: 180, xpForNextLevel: 400, progressPct: 45 }
      : null,
    [withProgression]
  );

  // For win: player has the higher goal count. For loss: opp higher. Force
  // those to a sensible default but allow override via the sliders.
  const finalWinnerId = outcome === 'win'
    ? SELF_ID
    : outcome === 'loss'
      ? OPP_ID
      : null; // draw

  return (
    <div className="relative min-h-dvh bg-surface-page">
      {/* Mount the results screen with a remount key so animations can be replayed. */}
      <div className="lg:pl-72">
        <RealtimeResultsScreen
          key={replayKey}
          matchType="ranked"
          playerUsername="Konstantine Kevlishvili"
          playerAvatar="avatar-1"
          playerAvatarCustomization={null}
          opponentUsername="Konstantine Kevlishvili"
          opponentAvatar="avatar-2"
          opponentAvatarCustomization={null}
          playerScore={playerGoals}
          opponentScore={opponentGoals}
          playerCorrect={playerCorrect}
          opponentCorrect={opponentCorrect}
          totalQuestions={totalQuestions}
          playerQuestionResults={withQuestionDots ? playerQuestionResults : undefined}
          opponentQuestionResults={withQuestionDots ? opponentQuestionResults : undefined}
          selfUserId={SELF_ID}
          finalWinnerId={finalWinnerId}
          winnerDecisionMethod="goals"
          preMatchRp={preMatchRp}
          opponentId={OPP_ID}
          rankedOutcome={rankedOutcome}
          preMatchRankedProfile={preMatchRankedProfile}
          preMatchProgression={preMatchProgression}
          unlockedAchievements={withAchievements ? ACHIEVEMENT_SAMPLES : []}
          onPlayAgain={() => setReplayKey((k) => k + 1)}
          onMainMenu={() => router.push('/play')}
        />
      </div>

      {/* ── Side control panel ─────────────────────────────────────────── */}
      <aside className="fixed left-4 top-4 bottom-4 z-50 hidden w-64 overflow-y-auto rounded-2xl border border-surface-card-light bg-surface-card/95 p-4 shadow-2xl backdrop-blur font-fun lg:block">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-brand-yellow">
            Results Playground
          </h2>
          <button
            onClick={() => router.push('/play')}
            className="text-[10px] font-bold uppercase tracking-wider text-brand-slate hover:text-white"
          >
            exit
          </button>
        </div>

        {/* Outcome */}
        <Group label="Outcome">
          <Segmented
            options={['win', 'loss', 'draw'] as const}
            value={outcome}
            onChange={setOutcome}
          />
        </Group>

        {/* One-click scenarios for the rank frame unlock animation */}
        <Group label="Presets">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setOutcome('win');
                setPreMatchRp(880); // Reserve, 20 below Bench (900)
                setRpDelta(35);
                setReplayKey((k) => k + 1);
              }}
              className="rounded-lg bg-brand-yellow px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-surface-page"
            >
              ▲ Tier up
            </button>
            <button
              onClick={() => {
                setOutcome('loss');
                setPreMatchRp(910); // Bench, 10 above Reserve cutoff
                setRpDelta(30);
                setReplayKey((k) => k + 1);
              }}
              className="rounded-lg bg-surface-deep px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-red"
            >
              ▼ Tier down
            </button>
          </div>
          <p className="mt-1 text-[9px] text-brand-slate">
            Tier up shows the frame-unlock animation (Reserve → Bench).
          </p>
        </Group>

        {/* RP */}
        <Group label="Pre-match RP">
          <Slider min={0} max={3500} step={5} value={preMatchRp} onChange={setPreMatchRp} suffix="RP" />
        </Group>
        <Group label={`RP Δ (${signedRpDelta >= 0 ? '+' : ''}${signedRpDelta})`}>
          <Slider min={0} max={200} step={1} value={rpDelta} onChange={setRpDelta} suffix="pts" />
          <p className="mt-1 text-[9px] text-brand-slate">
            Sign follows outcome (win = +, loss = −, draw = 0). New RP: <span className="text-white">{newRp}</span>.
          </p>
        </Group>

        <Group label="Opp pre-match RP">
          <Slider min={0} max={3500} step={5} value={opponentPreMatchRp} onChange={setOpponentPreMatchRp} suffix="RP" />
          <p className="mt-1 text-[9px] text-brand-slate">
            Opp Δ mirrors yours (inverted). Opp new RP: <span className="text-white">{opponentNewRp}</span>.
          </p>
        </Group>

        {/* Goals */}
        <Group label="Score">
          <div className="grid grid-cols-2 gap-2">
            <Slider min={0} max={9} step={1} value={playerGoals} onChange={setPlayerGoals} label="You" />
            <Slider min={0} max={9} step={1} value={opponentGoals} onChange={setOpponentGoals} label="Opp" />
          </div>
        </Group>

        {/* Correct answers */}
        <Group label="Correct answers">
          <div className="grid grid-cols-2 gap-2">
            <Slider min={0} max={totalQuestions} step={1} value={playerCorrect} onChange={setPlayerCorrect} label="You" />
            <Slider min={0} max={totalQuestions} step={1} value={opponentCorrect} onChange={setOpponentCorrect} label="Opp" />
          </div>
        </Group>
        <Group label="Total questions">
          <Slider
            min={1}
            max={20}
            step={1}
            value={totalQuestions}
            onChange={(next) => {
              setTotalQuestions(next);
              setPlayerCorrect((v) => Math.min(v, next));
              setOpponentCorrect((v) => Math.min(v, next));
            }}
          />
        </Group>

        {/* Toggles */}
        <Group label="Extras">
          <Toggle checked={withAchievements} onChange={setWithAchievements} label="Achievements" />
          <Toggle checked={withProgression} onChange={setWithProgression} label="XP / Level" />
          <Toggle checked={withQuestionDots} onChange={setWithQuestionDots} label="Question dots" />
        </Group>

        <button
          onClick={() => setReplayKey((k) => k + 1)}
          className="mt-2 w-full rounded-xl bg-brand-green px-4 py-2.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_0_var(--color-brand-green-deep)] active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-brand-green-deep)]"
        >
          ▶ Replay animations
        </button>

        <p className="mt-3 text-[10px] leading-tight text-brand-slate">
          Dev-only. Edits the props passed to RealtimeResultsScreen in memory — no socket, no backend.
        </p>
      </aside>

      <div className="lg:hidden fixed top-2 left-2 right-2 z-50 rounded-lg bg-brand-yellow/95 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-surface-page">
        Open on desktop (≥1024px) for the control panel
      </div>
    </div>
  );
}

// ─── Tiny presentational primitives for the panel ───────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-brand-slate-light">
        {label}
      </div>
      {children}
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
  options, value, onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
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
          {opt}
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
