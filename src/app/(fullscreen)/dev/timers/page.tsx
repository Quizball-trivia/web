'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { KickoffCountdownOverlay } from '@/features/possession/components/KickoffCountdownOverlay';
import { cn } from '@/lib/utils';

type TimerKind = 'kickoff' | 'disconnect';

interface TimerPreset {
  id: TimerKind;
  label: string;
  description: string;
  durationMs: number;
  source: string;
}

const TIMER_PRESETS: TimerPreset[] = [
  {
    id: 'kickoff',
    label: 'Kickoff countdown',
    description: 'The 5-second countdown emitted before a ranked possession match starts.',
    durationMs: 5_000,
    source: 'backend-node/src/realtime/services/match-realtime.service.ts: MATCH_START_COUNTDOWN_SEC; frontend fallback DEFAULT_COUNTDOWN_MS',
  },
  {
    id: 'disconnect',
    label: 'Reconnect grace overlay',
    description: 'The 60-second grace overlay shown to the still-connected player when the opponent disconnects.',
    durationMs: 60_000,
    source: 'backend-node/src/realtime/services/match-realtime.service.ts: MATCH_DISCONNECT_GRACE_MS; RealtimePossessionMatchScreen pause overlay',
  },
];

const LOADING_DURATIONS = [
  { label: '3s loader', durationMs: 3_000 },
  { label: '5s loader', durationMs: 5_000 },
  { label: '10s loader', durationMs: 10_000 },
];

function formatSeconds(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${seconds}s`;
}

function useRemainingMs(durationMs: number, runId: number) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startedAtMs = performance.now();

    const tick = (nowMs: number) => {
      const nextElapsedMs = Math.min(durationMs, nowMs - startedAtMs);
      setElapsedMs(nextElapsedMs);
      if (nextElapsedMs < durationMs) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [durationMs, runId]);

  return Math.max(0, durationMs - elapsedMs);
}

function MatchKickoffPreview({
  preset,
  runId,
}: {
  preset: TimerPreset;
  runId: number;
}) {
  const remainingMs = useRemainingMs(preset.durationMs, runId);
  const countdownDisplay = Math.max(1, Math.ceil(remainingMs / 1000));
  const finished = remainingMs === 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt shadow-2xl shadow-black/20">
      <KickoffCountdownOverlay
        countdownDisplay={countdownDisplay}
        finished={finished}
        durationMs={preset.durationMs}
        runKey={runId}
        playerName="TAZI"
        opponentName="ALEX"
        playerAvatarBase="avatar-1"
        opponentAvatarBase="avatar-2"
      />
      <TimerMeta preset={preset} remainingMs={remainingMs} />
    </section>
  );
}

function DisconnectGracePreview({
  preset,
  runId,
}: {
  preset: TimerPreset;
  runId: number;
}) {
  const remainingMs = useRemainingMs(preset.durationMs, runId);
  const pauseSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt shadow-2xl shadow-black/20">
      <div className="relative flex min-h-[420px] items-center justify-center bg-[url('/assets/bg-pattern.png')] bg-cover bg-center px-4">
        <div className="absolute inset-0 bg-surface-page-alt/70 backdrop-blur-[2px]" />
        <motion.div
          key="possession-match-pause"
          initial={{ y: -12, scale: 0.96, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-surface-deep/95 px-5 py-4 text-center shadow-2xl"
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
          <div className="mt-3 font-fun text-xs font-bold uppercase tracking-wide text-brand-yellow">
            3 reconnects left.
          </div>
        </motion.div>
      </div>
      <TimerMeta preset={preset} remainingMs={remainingMs} />
    </section>
  );
}

function TimerMeta({ preset, remainingMs }: { preset: TimerPreset; remainingMs: number }) {
  return (
    <div className="px-5 pb-5 pt-4 text-center">
      <div className="font-poppins text-lg font-extrabold uppercase tracking-wide text-brand-blue">
        {preset.label}
      </div>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-snug text-white/55">
        {preset.description}
      </p>
      <div className="mx-auto mt-3 max-w-xl rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-[10px] leading-snug text-white/45">
        {preset.source}
      </div>
      <div className="mt-3 font-mono text-xs text-white/40">
        {formatSeconds(remainingMs)} / {formatSeconds(preset.durationMs)}
      </div>
    </div>
  );
}

export default function DevTimersPage() {
  const [activePresetId, setActivePresetId] = useState<TimerKind>('kickoff');
  const [timerRunId, setTimerRunId] = useState(0);
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [loaderDurationMs, setLoaderDurationMs] = useState(5_000);
  const [loaderRunId, setLoaderRunId] = useState(0);

  const activePreset = useMemo(
    () => TIMER_PRESETS.find((preset) => preset.id === activePresetId) ?? TIMER_PRESETS[0]!,
    [activePresetId],
  );

  useEffect(() => {
    if (!loaderVisible) return;
    const timer = window.setTimeout(() => setLoaderVisible(false), loaderDurationMs);
    return () => window.clearTimeout(timer);
  }, [loaderDurationMs, loaderRunId, loaderVisible]);

  function startPreset(preset: TimerPreset) {
    setActivePresetId(preset.id);
    setTimerRunId((value) => value + 1);
  }

  function replayTimer() {
    setTimerRunId((value) => value + 1);
  }

  function startLoader(durationMs: number) {
    setLoaderDurationMs(durationMs);
    setLoaderVisible(true);
    setLoaderRunId((value) => value + 1);
  }

  return (
    <main className="min-h-dvh bg-surface-page-alt px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header>
          <div className="font-fun text-[11px] font-black uppercase tracking-[0.24em] text-brand-yellow">
            Dev playground
          </div>
          <h1 className="mt-2 font-poppins text-3xl font-extrabold tracking-tight sm:text-4xl">
            Real Timer Overlays
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/55">
            Only the actual user-facing ranked match timing states are shown here. The bouncing ball loader is separate.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-surface-card/80 p-4">
            <div className="mb-3 font-fun text-xs font-black uppercase tracking-[0.2em] text-white/45">
              Ranked match timers
            </div>
            <div className="grid gap-2">
              {TIMER_PRESETS.map((preset) => {
                const active = preset.id === activePreset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => startPreset(preset)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left transition active:translate-y-[1px]',
                      active
                        ? 'border-brand-blue bg-brand-blue/20'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-poppins text-sm font-extrabold uppercase tracking-wide text-white">
                        {preset.label}
                      </span>
                      <span className={cn('font-mono text-xs font-bold', active ? 'text-brand-blue' : 'text-white/35')}>
                        {formatSeconds(preset.durationMs)}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-white/45">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={replayTimer}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-3 font-poppins text-sm font-extrabold uppercase tracking-wide text-white transition active:translate-y-[1px]"
            >
              <RotateCcw className="size-4" />
              Replay active
            </button>
          </aside>

          <div className="grid gap-5">
            {activePreset.id === 'kickoff' ? (
              <MatchKickoffPreview preset={activePreset} runId={timerRunId} />
            ) : (
              <DisconnectGracePreview preset={activePreset} runId={timerRunId} />
            )}

            <section className="rounded-2xl border border-white/10 bg-surface-card/80 p-4">
              <div className="mb-4">
                <div className="font-fun text-xs font-black uppercase tracking-[0.2em] text-brand-yellow">
                  Bouncing ball loader
                </div>
                <p className="mt-1 text-sm font-semibold text-white/55">
                  Separate preview for the real shared <span className="font-mono text-white/75">LoadingScreen</span>.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="grid grid-cols-3 gap-2">
                  {LOADING_DURATIONS.map((item) => (
                    <button
                      key={item.durationMs}
                      type="button"
                      onClick={() => startLoader(item.durationMs)}
                      className="rounded-xl border border-brand-blue bg-brand-blue/15 px-3 py-3 font-poppins text-xs font-extrabold uppercase tracking-wide text-white transition hover:bg-brand-blue/25 active:translate-y-[1px]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-h-64 overflow-hidden rounded-2xl border border-white/10 bg-surface-page">
                  {loaderVisible ? (
                    <LoadingScreen
                      key={loaderRunId}
                      text={`Loading ${formatSeconds(loaderDurationMs)}`}
                      fullScreen={false}
                      className="h-64"
                    />
                  ) : (
                    <div className="flex h-64 items-center justify-center px-6 text-center font-fun text-xs font-black uppercase tracking-[0.2em] text-white/30">
                      Pick a loader duration
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
