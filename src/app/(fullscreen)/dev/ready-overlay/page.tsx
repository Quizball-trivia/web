'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ShowdownScreen } from '@/components/ShowdownScreen';
import { MatchWaitingForReadyOverlay } from '@/components/shared/MatchWaitingForReadyOverlay';
import { KickoffCountdownOverlay } from '@/features/possession/components/KickoffCountdownOverlay';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

type ScenarioId =
  | 'kickoff-ai'
  | 'kickoff-human'
  | 'party-six'
  | 'resume-human'
  | 'safety-ceiling'
  | 'countdown-ready';

type ScenarioTitleKey =
  | 'possession.gettingMatchReady'
  | 'possession.waitingForOpponent'
  | 'possession.kickoffIn'
  | 'partyResults.waitingForPlayers';

type ShowdownStatusKey =
  | 'showdown.syncingMatch'
  | 'showdown.waitingForOpponent';

type ScenarioDetailKey =
  | 'possession.startsAfterReady'
  | 'possession.resumesAfterReady'
  | 'partyResults.startsAfterReady';

type Scenario = {
  id: ScenarioId;
  label: string;
  group: 'possession' | 'partyResults';
  titleKey: ScenarioTitleKey;
  detailKey: ScenarioDetailKey;
  ready: number;
  total: number;
  phase: 'kickoff' | 'resume';
  description: string;
  surface: 'showdown' | 'pregame' | 'match' | 'party' | 'countdown';
  showdownStatusKey?: ShowdownStatusKey;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'kickoff-ai',
    label: 'AI match: your screen',
    group: 'possession',
    titleKey: 'possession.gettingMatchReady',
    detailKey: 'possession.startsAfterReady',
    ready: 0,
    total: 1,
    phase: 'kickoff',
    description: 'Ranked kickoff hides the ready wait inside showdown. AI does not count as a ready UI.',
    surface: 'showdown',
    showdownStatusKey: 'showdown.syncingMatch',
  },
  {
    id: 'kickoff-human',
    label: '1v1: opponent loading',
    group: 'possession',
    titleKey: 'possession.waitingForOpponent',
    detailKey: 'possession.startsAfterReady',
    ready: 1,
    total: 2,
    phase: 'kickoff',
    description: 'One player is ready, so showdown quietly holds until the opponent screen is ready.',
    surface: 'showdown',
    showdownStatusKey: 'showdown.waitingForOpponent',
  },
  {
    id: 'party-six',
    label: 'Party quiz: 6 players',
    group: 'partyResults',
    titleKey: 'partyResults.waitingForPlayers',
    detailKey: 'partyResults.startsAfterReady',
    ready: 3,
    total: 6,
    phase: 'kickoff',
    description: 'Party quiz can wait on several players before showing the first-question intro.',
    surface: 'party',
  },
  {
    id: 'resume-human',
    label: 'Mid-match resume',
    group: 'possession',
    titleKey: 'possession.waitingForOpponent',
    detailKey: 'possession.resumesAfterReady',
    ready: 1,
    total: 2,
    phase: 'resume',
    description: 'After reconnect grace, play stays paused until the restored match screen is ready.',
    surface: 'match',
  },
  {
    id: 'safety-ceiling',
    label: 'Safety ceiling',
    group: 'partyResults',
    titleKey: 'partyResults.waitingForPlayers',
    detailKey: 'partyResults.startsAfterReady',
    ready: 5,
    total: 6,
    phase: 'kickoff',
    description: 'The hidden server ceiling prevents an infinite freeze; the UI still reads as waiting, not countdown.',
    surface: 'party',
  },
  {
    id: 'countdown-ready',
    label: 'Everyone ready',
    group: 'possession',
    titleKey: 'possession.kickoffIn',
    detailKey: 'possession.startsAfterReady',
    ready: 2,
    total: 2,
    phase: 'kickoff',
    description: 'This is the separate 5-second intro that starts after the ready gate releases.',
    surface: 'countdown',
  },
];

export default function DevReadyOverlayPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-deep font-fun text-white">
        Dev only
      </div>
    );
  }

  return <DevReadyOverlayContent />;
}

function DevReadyOverlayContent() {
  const { t } = useLocale();
  const [scenarioId, setScenarioId] = useState<ScenarioId>('kickoff-ai');
  const [countdownStartedAt, setCountdownStartedAt] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());

  const scenario = useMemo(
    () => SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[0],
    [scenarioId],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(intervalId);
  }, []);

  const countdownDisplay = Math.max(1, Math.ceil((countdownStartedAt + 5_000 - nowMs) / 1000));

  useEffect(() => {
    if (scenario.surface !== 'countdown') return;
    const timeoutId = window.setTimeout(() => {
      setCountdownStartedAt(Date.now());
      setNowMs(Date.now());
    }, Math.max(500, countdownStartedAt + 5_400 - Date.now()));
    return () => window.clearTimeout(timeoutId);
  }, [countdownStartedAt, scenario.surface]);

  const readyLabel = t(`${scenario.group}.playersReadyCount`, {
    ready: scenario.ready,
    total: scenario.total,
  });

  return (
    <div className="min-h-dvh bg-surface-page-alt text-white">
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[18px] border border-white/10 bg-surface-card/95 p-4 shadow-2xl lg:sticky lg:top-5 lg:h-[calc(100dvh-2.5rem)] lg:overflow-y-auto">
          <div className="font-poppins text-[11px] font-bold uppercase tracking-[0.24em] text-brand-yellow">
            Ready Overlay Lab
          </div>
          <h1 className="mt-2 font-poppins text-2xl font-semibold uppercase leading-tight">
            Showdown vs kickoff
          </h1>
          <p className="mt-2 text-sm font-semibold leading-snug text-white/65">
            Ranked kickoff waits inside showdown. The 5-second number appears only after the ready gate releases.
          </p>

          <div className="mt-5 grid gap-2">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setScenarioId(item.id);
                  setCountdownStartedAt(Date.now());
                  setNowMs(Date.now());
                }}
                className={cn(
                  'rounded-xl border px-3 py-3 text-left font-poppins text-sm font-semibold transition',
                  scenario.id === item.id
                    ? 'border-brand-yellow bg-brand-yellow text-surface-page'
                    : 'border-white/10 bg-white/6 text-white hover:bg-white/10',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-surface-page-alt/65 p-3">
            <div className="font-poppins text-[10px] font-bold uppercase tracking-[0.2em] text-brand-slate-light">
              Current case
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-white/75">
              {scenario.description}
            </p>
            {scenario.surface === 'countdown' ? (
              <button
                type="button"
                onClick={() => {
                  setCountdownStartedAt(Date.now());
                  setNowMs(Date.now());
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
              >
                <RotateCcw className="size-3.5" />
                replay
              </button>
            ) : null}
          </div>
        </aside>

        <main className="flex min-h-[720px] items-center justify-center rounded-[24px] border border-white/8 bg-black/20 p-3 shadow-inner sm:p-6">
          <div className="relative h-[760px] w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/12 bg-surface-page-alt shadow-2xl sm:h-[820px]">
            {scenario.surface === 'showdown' ? (
              <ShowdownScreen
                matchType="ranked"
                playerUsername="You"
                playerAvatar="avatar-1"
                opponentUsername="Opponent"
                opponentAvatar="avatar-2"
                onComplete={() => {}}
                autoComplete={false}
                statusLabel={t(scenario.showdownStatusKey ?? 'showdown.syncingMatch')}
                statusWaiting
                variant="vertical"
                wrapperClassName="absolute inset-0 h-full min-h-full"
                playerInfo={{
                  username: 'You',
                  avatar: 'avatar-1',
                  rankPoints: 495,
                  tier: 'Academy',
                }}
                opponentInfo={{
                  username: 'Opponent',
                  avatar: 'avatar-2',
                  rankPoints: 980,
                  tier: 'Pro',
                }}
              />
            ) : (
              <MockMatchSurface surface={scenario.surface} />
            )}
            {scenario.surface === 'countdown' ? (
              <KickoffCountdownOverlay
                countdownDisplay={countdownDisplay}
                phase="kickoff"
                durationMs={5_000}
                runKey={`dev-ready-${countdownStartedAt}`}
                playerName="You"
                opponentName="Opponent"
                playerAvatarBase="avatar-1"
                opponentAvatarBase="avatar-2"
                playerRankPoints={495}
                opponentRankPoints={980}
                className="absolute inset-0 h-full min-h-full w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
              />
            ) : scenario.surface !== 'showdown' ? (
              <MatchWaitingForReadyOverlay
                title={t(scenario.titleKey)}
                readyLabel={readyLabel}
                detailLabel={t(scenario.detailKey)}
                className="absolute inset-0 h-full min-h-full"
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function MockMatchSurface({ surface }: { surface: Scenario['surface'] }) {
  const isParty = surface === 'party';
  const isMatch = surface === 'match';

  return (
    <div className="absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-surface-page-alt/35" />
      <div className="relative flex h-full flex-col px-5 pb-7 pt-8">
        <div className="flex items-center justify-between">
          <div className="rounded-full bg-white/8 px-3 py-1.5 font-poppins text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">
            {isParty ? 'Party quiz' : isMatch ? 'Second half' : 'Pregame'}
          </div>
          <div className="size-10 rounded-full border border-white/15 bg-white/8" />
        </div>

        <div className="mt-16 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="mx-auto size-20 rounded-full bg-brand-blue shadow-[0_0_35px_rgba(22,69,255,0.45)]" />
          <div className="rounded-full bg-brand-blue px-6 py-4 font-poppins text-3xl font-semibold tabular-nums shadow-xl">
            {isParty ? '3' : '14'}
          </div>
          <div className="mx-auto size-20 rounded-full bg-brand-red shadow-[0_0_35px_rgba(255,75,85,0.35)]" />
        </div>

        <div className="mt-auto grid gap-3">
          <div className="h-3 rounded-full bg-white/8" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-24 rounded-2xl bg-brand-blue/40" />
            <div className="h-24 rounded-2xl bg-brand-cyan/25" />
            <div className="h-24 rounded-2xl bg-brand-yellow/25" />
          </div>
        </div>
      </div>
    </div>
  );
}
