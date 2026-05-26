'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { MatchCountdownPuck } from '@/components/shared/MatchCountdownPuck';
import { KickoffCountdownOverlay } from '@/features/possession/components/KickoffCountdownOverlay';
import { cn } from '@/lib/utils';

type TimerKind =
  | 'kickoff'
  | 'disconnect'
  | 'forfeit'
  | 'finalizing'
  | 'mcqPill'
  | 'partyMcqPill'
  | 'penaltyHud'
  | 'shotHud'
  | 'dailyCountdown';

interface TimerPreset {
  id: TimerKind;
  mode: 'Ranked' | 'Party Quiz' | 'Daily' | 'Shared';
  label: string;
  description: string;
  durationMs: number;
  source: string;
}

const TIMER_PRESETS: TimerPreset[] = [
  {
    id: 'kickoff',
    mode: 'Ranked',
    label: 'Kickoff countdown',
    description: 'The 5-second countdown emitted before a ranked possession match starts.',
    durationMs: 5_000,
    source: 'KickoffCountdownOverlay + MatchCountdownPuck',
  },
  {
    id: 'disconnect',
    mode: 'Shared',
    label: 'Reconnect grace overlay',
    description: '60-second grace shown to the still-connected player when the opponent disconnects.',
    durationMs: 60_000,
    source: 'RealtimePossessionMatchScreen pause overlay',
  },
  {
    id: 'forfeit',
    mode: 'Shared',
    label: 'Opponent forfeit overlay',
    description: 'Static finalizing-results modal — 8s countdown shown while server confirms forfeit result.',
    durationMs: 8_000,
    source: 'RealtimePossessionMatchScreen / RealtimePartyQuizScreen forfeitPending block',
  },
  {
    id: 'finalizing',
    mode: 'Party Quiz',
    label: 'Match complete / calculating',
    description: 'Royal-blue overlay shown after the last party-quiz round while the server tallies final scores.',
    durationMs: 6_000,
    source: 'RealtimePartyQuizScreen — showFinalizingResults block',
  },
  {
    id: 'mcqPill',
    mode: 'Ranked',
    label: 'MCQ question timer pill',
    description: 'Blue header pill counting down a possession-mode multiple-choice question.',
    durationMs: 10_000,
    source: 'components/game/PossessionQuestionPanel — header timer pill',
  },
  {
    id: 'partyMcqPill',
    mode: 'Party Quiz',
    label: 'Party MCQ question timer pill',
    description: 'Same blue header pill, but for the 10-second party-quiz MCQ.',
    durationMs: 10_000,
    source: 'PossessionQuestionPanel shared between possession + party',
  },
  {
    id: 'penaltyHud',
    mode: 'Ranked',
    label: 'Penalty shoot/save timer',
    description: '5-second HUD countdown during a penalty kick or save. Pulses red ≤2s.',
    durationMs: 5_000,
    source: 'features/possession/components/PenaltyHUD',
  },
  {
    id: 'shotHud',
    mode: 'Ranked',
    label: 'Shot on goal timer',
    description: '8-second HUD countdown during the bar-battle shot phase. Pulses red ≤3s.',
    durationMs: 8_000,
    source: 'features/possession/components/ShotHUD',
  },
  {
    id: 'dailyCountdown',
    mode: 'Daily',
    label: 'Daily Countdown game timer',
    description: '30-second per-round timer in the Countdown daily challenge.',
    durationMs: 30_000,
    source: 'features/daily/CountdownGame — timer card',
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

function PreviewFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden bg-[url('/assets/bg-pattern.png')] bg-cover bg-center px-4 py-8">
      <div className="absolute inset-0 bg-surface-page-alt/65" />
      <div className="absolute left-3 top-3 z-20 rounded-full bg-black/60 px-3 py-1 font-poppins text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
        {label}
      </div>
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

function MatchKickoffPreview({ preset, runId }: { preset: TimerPreset; runId: number }) {
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

function DisconnectGracePreview({ preset, runId }: { preset: TimerPreset; runId: number }) {
  const remainingMs = useRemainingMs(preset.durationMs, runId);
  const pauseSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt shadow-2xl shadow-black/20">
      <PreviewFrame label="Reconnect grace overlay">
        <motion.div
          key={`pause-${runId}`}
          initial={{ y: -12, scale: 0.96, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="mx-auto w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-6 text-center shadow-2xl"
        >
          <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
            Match Paused
          </div>
          <div className="mt-2 font-poppins text-xl font-semibold uppercase text-white">
            Opponent disconnected
          </div>
          <div className="mt-1 font-poppins text-sm font-semibold text-white/70">
            Waiting for them to reconnect
          </div>
          <div className="mt-4 inline-flex items-center justify-center rounded-full bg-black/30 px-6 py-2 font-poppins text-3xl font-semibold tabular-nums text-white">
            {pauseSeconds}
          </div>
          <div className="mt-3 font-poppins text-xs font-semibold uppercase tracking-wide text-brand-yellow">
            3 reconnects left.
          </div>
        </motion.div>
      </PreviewFrame>
      <TimerMeta preset={preset} remainingMs={remainingMs} />
    </section>
  );
}

function FinalizingResultsPreview({ preset, runId }: { preset: TimerPreset; runId: number }) {
  const remainingMs = useRemainingMs(preset.durationMs, runId);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt shadow-2xl shadow-black/20">
      <PreviewFrame label="Match complete / calculating">
        <motion.div
          key={`finalizing-${runId}`}
          initial={{ y: -12, scale: 0.96, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="mx-auto w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-7 text-center shadow-2xl"
        >
          <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-yellow">
            Match Complete
          </div>
          <LoadingScreen
            fullScreen={false}
            text=""
            className="h-auto min-h-0 bg-transparent py-2"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mt-2 font-poppins text-sm font-semibold uppercase tracking-wide text-white"
          >
            Calculating final scores…
          </motion.p>
        </motion.div>
      </PreviewFrame>
      <TimerMeta preset={preset} remainingMs={remainingMs} />
    </section>
  );
}

function ForfeitPendingPreview({ preset, runId }: { preset: TimerPreset; runId: number }) {
  const remainingMs = useRemainingMs(preset.durationMs, runId);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt shadow-2xl shadow-black/20">
      <PreviewFrame label="Forfeit / finalizing modal">
        <motion.div
          key={`forfeit-${runId}`}
          initial={{ y: -12, scale: 0.96, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="mx-auto w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-6 text-center shadow-2xl"
        >
          <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-yellow">
            Finalizing Match
          </div>
          <div className="mt-2 font-poppins text-xl font-semibold uppercase text-white">
            Opponent forfeited
          </div>
          <div className="mt-1 font-poppins text-sm font-semibold text-white/70">
            Opponent forfeited. Finalizing results…
          </div>
        </motion.div>
      </PreviewFrame>
      <TimerMeta preset={preset} remainingMs={remainingMs} />
    </section>
  );
}

function QuestionPillPreview({ preset, runId }: { preset: TimerPreset; runId: number }) {
  const remainingMs = useRemainingMs(preset.durationMs, runId);
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const timerLabel = secondsLeft >= 10 ? `${secondsLeft}` : `0${secondsLeft}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt shadow-2xl shadow-black/20">
      <PreviewFrame label="MCQ question header pill">
        <div className="mx-auto w-full max-w-2xl px-4">
          <div className="flex items-stretch gap-2.5">
            <div
              className="flex flex-1 items-center justify-center rounded-[16px] bg-brand-blue px-5 text-white h-[52px] md:h-[62px]"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 'clamp(14px, 2.2vw, 22px)' }}
            >
              QUESTION 3/12
            </div>
            <div
              className="flex w-[92px] items-center justify-center rounded-[16px] bg-brand-blue text-white h-[52px] md:h-[62px] tabular-nums"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 'clamp(14px, 2.2vw, 22px)' }}
            >
              {timerLabel}
            </div>
          </div>
          <div className="mt-3 rounded-[24px] bg-surface-page px-5 py-5 text-center text-white/45 font-poppins text-sm">
            (question content goes here)
          </div>
        </div>
      </PreviewFrame>
      <TimerMeta preset={preset} remainingMs={remainingMs} />
    </section>
  );
}

function PenaltyHudPreview({ preset, runId }: { preset: TimerPreset; runId: number }) {
  const remainingMs = useRemainingMs(preset.durationMs, runId);
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const danger = secondsLeft <= 2;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt shadow-2xl shadow-black/20">
      <PreviewFrame label="Penalty HUD timer">
        <div className="mx-auto flex w-full max-w-lg items-center justify-center gap-6 rounded-[20px] bg-surface-card px-6 py-5">
          <div className="text-center">
            <div className="font-poppins text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
              Pen 3/5
            </div>
            <motion.div
              animate={danger ? { scale: [1, 1.1, 1] } : {}}
              transition={danger ? { repeat: Infinity, duration: 0.6 } : {}}
              className={cn(
                'font-poppins text-4xl font-semibold tabular-nums transition-colors',
                danger ? 'text-brand-red-soft' : 'text-white',
              )}
            >
              {secondsLeft}
            </motion.div>
            <div className="-mt-0.5 font-poppins text-[10px] font-semibold tracking-[0.18em] text-brand-orange/70">
              YOU SHOOT
            </div>
          </div>
        </div>
      </PreviewFrame>
      <TimerMeta preset={preset} remainingMs={remainingMs} />
    </section>
  );
}

function ShotHudPreview({ preset, runId }: { preset: TimerPreset; runId: number }) {
  const remainingMs = useRemainingMs(preset.durationMs, runId);
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const danger = secondsLeft <= 3;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt shadow-2xl shadow-black/20">
      <PreviewFrame label="Shot on goal HUD timer">
        <div className="mx-auto flex w-full max-w-lg items-center justify-center gap-6 rounded-[20px] bg-surface-card px-6 py-5">
          <div className="text-center">
            <div className="font-poppins text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-orange">
              Shot on Goal
            </div>
            <motion.div
              animate={danger ? { scale: [1, 1.1, 1] } : {}}
              transition={danger ? { repeat: Infinity, duration: 0.6 } : {}}
              className={cn(
                'font-poppins text-4xl font-semibold tabular-nums transition-colors',
                danger ? 'text-brand-red-soft' : 'text-white',
              )}
            >
              {secondsLeft}
            </motion.div>
            <div className="-mt-0.5 font-poppins text-[10px] font-semibold tracking-[0.18em] text-brand-orange/70">
              YOU SHOOT
            </div>
          </div>
        </div>
      </PreviewFrame>
      <TimerMeta preset={preset} remainingMs={remainingMs} />
    </section>
  );
}

function DailyCountdownPreview({ preset, runId }: { preset: TimerPreset; runId: number }) {
  const remainingMs = useRemainingMs(preset.durationMs, runId);
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const danger = secondsLeft <= 5;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt shadow-2xl shadow-black/20">
      <PreviewFrame label="Daily Countdown game timer">
        <div className="mx-auto w-full max-w-md">
          <div
            className={cn(
              'rounded-xl border-b-4 bg-surface-card p-4',
              danger ? 'border-b-brand-red-soft animate-pulse' : 'border-b-surface-card-deeper',
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className={cn('size-5', danger ? 'text-brand-red-soft' : 'text-brand-cyan')} />
                <span className="text-sm font-bold text-brand-slate">Time remaining</span>
              </div>
              <div className={cn('text-3xl font-black tabular-nums', danger ? 'text-brand-red-soft' : 'text-brand-cyan')}>
                {secondsLeft}s
              </div>
            </div>
          </div>
        </div>
      </PreviewFrame>
      <TimerMeta preset={preset} remainingMs={remainingMs} />
    </section>
  );
}

function TimerMeta({ preset, remainingMs }: { preset: TimerPreset; remainingMs: number }) {
  return (
    <div className="px-5 pb-5 pt-4 text-center">
      <div className="font-poppins text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-yellow">
        {preset.mode}
      </div>
      <div className="mt-1 font-poppins text-lg font-extrabold uppercase tracking-wide text-brand-blue">
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

const MODE_COLORS: Record<TimerPreset['mode'], string> = {
  Ranked: 'text-brand-yellow',
  'Party Quiz': 'text-brand-purple',
  Daily: 'text-brand-cyan',
  Shared: 'text-brand-slate-light',
};

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

  const grouped = useMemo(() => {
    const map = new Map<TimerPreset['mode'], TimerPreset[]>();
    for (const preset of TIMER_PRESETS) {
      const list = map.get(preset.mode) ?? [];
      list.push(preset);
      map.set(preset.mode, list);
    }
    return map;
  }, []);

  return (
    <main className="min-h-dvh bg-surface-page-alt px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header>
          <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-yellow">
            Dev playground
          </div>
          <h1 className="mt-2 font-poppins text-3xl font-extrabold tracking-tight sm:text-4xl">
            All Timer UIs
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/55">
            Every timer/countdown surface the user sees, grouped by mode. Click a preset to preview, hit replay to re-run the animation.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-surface-card/80 p-4">
            {[...grouped.entries()].map(([mode, presets]) => (
              <div key={mode} className="mb-4 last:mb-0">
                <div className={cn('mb-2 font-poppins text-[11px] font-semibold uppercase tracking-[0.2em]', MODE_COLORS[mode])}>
                  {mode}
                </div>
                <div className="grid gap-2">
                  {presets.map((preset) => {
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
                          <span className="font-poppins text-sm font-semibold uppercase tracking-wide text-white">
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
              </div>
            ))}

            <button
              type="button"
              onClick={replayTimer}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-3 font-poppins text-sm font-semibold uppercase tracking-wide text-white transition active:translate-y-[1px]"
            >
              <RotateCcw className="size-4" />
              Replay active
            </button>
          </aside>

          <div className="grid gap-5">
            {activePreset.id === 'kickoff' && <MatchKickoffPreview preset={activePreset} runId={timerRunId} />}
            {activePreset.id === 'disconnect' && <DisconnectGracePreview preset={activePreset} runId={timerRunId} />}
            {activePreset.id === 'forfeit' && <ForfeitPendingPreview preset={activePreset} runId={timerRunId} />}
            {activePreset.id === 'finalizing' && <FinalizingResultsPreview preset={activePreset} runId={timerRunId} />}
            {(activePreset.id === 'mcqPill' || activePreset.id === 'partyMcqPill') && (
              <QuestionPillPreview preset={activePreset} runId={timerRunId} />
            )}
            {activePreset.id === 'penaltyHud' && <PenaltyHudPreview preset={activePreset} runId={timerRunId} />}
            {activePreset.id === 'shotHud' && <ShotHudPreview preset={activePreset} runId={timerRunId} />}
            {activePreset.id === 'dailyCountdown' && <DailyCountdownPreview preset={activePreset} runId={timerRunId} />}

            <section className="rounded-2xl border border-white/10 bg-surface-card/80 p-4">
              <div className="mb-4">
                <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-yellow">
                  Bouncing ball loader
                </div>
                <p className="mt-1 text-sm font-semibold text-white/55">
                  Separate preview for the shared <span className="font-mono text-white/75">LoadingScreen</span>.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="grid grid-cols-3 gap-2">
                  {LOADING_DURATIONS.map((item) => (
                    <button
                      key={item.durationMs}
                      type="button"
                      onClick={() => startLoader(item.durationMs)}
                      className="rounded-xl border border-brand-blue bg-brand-blue/15 px-3 py-3 font-poppins text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-blue/25 active:translate-y-[1px]"
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
                    <div className="flex h-64 items-center justify-center px-6 text-center font-poppins text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                      Pick a loader duration
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-surface-card/80 p-4">
              <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-cyan">
                Shared countdown puck
              </div>
              <p className="mt-1 text-sm font-semibold text-white/55">
                Isolated render of the <span className="font-mono text-white/75">MatchCountdownPuck</span> at all 3 sizes.
                Used by the kickoff overlay, party-quiz start, and reconnect resume.
              </p>
              <div className="mt-4 grid grid-cols-3 items-end gap-4">
                <div className="flex flex-col items-center gap-2">
                  <MatchCountdownPuck label="sm" seconds={3} size="sm" />
                  <span className="font-mono text-[10px] text-white/40">size=sm</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <MatchCountdownPuck label="md" seconds={3} size="md" durationMs={3_000} runKey={`puck-md-${timerRunId}`} />
                  <span className="font-mono text-[10px] text-white/40">size=md (+bar)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <MatchCountdownPuck label="lg" seconds={3} size="lg" durationMs={3_000} runKey={`puck-lg-${timerRunId}`} />
                  <span className="font-mono text-[10px] text-white/40">size=lg (+bar)</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
