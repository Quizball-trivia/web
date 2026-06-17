'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { MatchWaitingForReadyOverlay } from '@/components/shared/MatchWaitingForReadyOverlay';
import { KickoffCountdownOverlay } from '@/features/possession/components/KickoffCountdownOverlay';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

type ScenarioId =
  | 'kickoff-ai'
  | 'kickoff-human'
  | 'party-six'
  | 'resume-human'
  | 'resume-countdown'
  | 'safety-ceiling'
  | 'countdown-ready';

type ScenarioTitleKey =
  | 'possession.gettingMatchReady'
  | 'possession.waitingForOpponent'
  | 'possession.kickoffIn'
  | 'partyResults.waitingForPlayers';

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
  surface: 'kickoff-wait' | 'match' | 'party' | 'countdown';
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
    description: 'AI is already ready. Your side shows a spinner until your game screen reports ready.',
    surface: 'kickoff-wait',
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
    description: 'You are ready, opponent is still loading. Kickoff countdown has not started yet.',
    surface: 'kickoff-wait',
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
    id: 'resume-countdown',
    label: 'Resume countdown',
    group: 'possession',
    titleKey: 'possession.kickoffIn',
    detailKey: 'possession.resumesAfterReady',
    ready: 2,
    total: 2,
    phase: 'resume',
    description: 'Both match screens are restored. This is the compact 5-second resume countdown before play continues.',
    surface: 'countdown',
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

function isScenarioId(value: string | null): value is ScenarioId {
  return SCENARIOS.some((item) => item.id === value);
}

function readInitialScenarioId(): ScenarioId {
  if (typeof window === 'undefined') return 'kickoff-ai';
  const scenario = new URLSearchParams(window.location.search).get('case');
  return isScenarioId(scenario) ? scenario : 'kickoff-ai';
}

function readInitialDevLocale(): 'en' | 'ka' | null {
  if (typeof window === 'undefined') return null;
  const locale = new URLSearchParams(window.location.search).get('locale');
  return locale === 'en' || locale === 'ka' ? locale : null;
}

function readFullscreenPreview(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('preview') === 'full';
}

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
  const { locale, setLocale, t } = useLocale();
  const [scenarioId, setScenarioId] = useState<ScenarioId>(readInitialScenarioId);
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

  useEffect(() => {
    const initialLocale = readInitialDevLocale();
    if (initialLocale && initialLocale !== locale) {
      setLocale(initialLocale);
    }
  }, [locale, setLocale]);

  const updateDevUrl = useCallback((updates: { scenarioId?: ScenarioId; locale?: 'en' | 'ka' }) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (updates.scenarioId) {
      url.searchParams.set('case', updates.scenarioId);
    }
    if (updates.locale) {
      url.searchParams.set('locale', updates.locale);
    }
    const query = url.searchParams.toString();
    window.history.replaceState(null, '', `${url.pathname}${query ? `?${query}` : ''}${url.hash}`);
  }, []);

  const resetCountdown = useCallback(() => {
    const now = Date.now();
    setCountdownStartedAt(now);
    setNowMs(now);
  }, []);

  const selectScenario = useCallback((nextScenarioId: ScenarioId) => {
    setScenarioId(nextScenarioId);
    resetCountdown();
    updateDevUrl({ scenarioId: nextScenarioId });
  }, [resetCountdown, updateDevUrl]);

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

  if (readFullscreenPreview()) {
    return (
      <ScenarioPreview
        scenario={scenario}
        countdownDisplay={countdownDisplay}
        countdownStartedAt={countdownStartedAt}
        readyLabel={readyLabel}
        className="h-dvh min-h-dvh w-screen"
      />
    );
  }

  return (
    <div className="min-h-dvh bg-surface-page-alt text-white">
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl grid-cols-1 gap-6 px-4 py-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6">
        <aside className="rounded-[18px] border border-white/10 bg-surface-card/95 p-4 shadow-2xl lg:sticky lg:top-5 lg:h-[calc(100dvh-2.5rem)] lg:overflow-y-auto">
          <div className="font-poppins text-[11px] font-bold uppercase tracking-[0.24em] text-brand-yellow">
            Ready Overlay Lab
          </div>
          <h1 className="mt-2 font-poppins text-2xl font-semibold uppercase leading-tight">
            Kickoff gate
          </h1>
          <p className="mt-2 text-sm font-semibold leading-snug text-white/65">
            Ranked shows ready checkmarks first. The 5-second kickoff countdown starts only after all screens are ready.
          </p>
          <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
            {(['en', 'ka'] as const).map((nextLocale) => (
              <button
                key={nextLocale}
                type="button"
                onClick={() => {
                  setLocale(nextLocale);
                  updateDevUrl({ locale: nextLocale });
                }}
                className={cn(
                  'rounded-lg px-3 py-1.5 font-poppins text-xs font-black uppercase tracking-[0.14em] transition',
                  locale === nextLocale
                    ? 'bg-brand-yellow text-surface-page'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                {nextLocale}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-2">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectScenario(item.id)}
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
                onClick={resetCountdown}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white"
              >
                <RotateCcw className="size-3.5" />
                replay
              </button>
            ) : null}
          </div>
        </aside>

        <main className="min-h-[720px] overflow-hidden rounded-[24px] border border-white/8 bg-black/20 shadow-inner">
          <ScenarioPreview
            scenario={scenario}
            countdownDisplay={countdownDisplay}
            countdownStartedAt={countdownStartedAt}
            readyLabel={readyLabel}
            className="min-h-[720px]"
          />
        </main>
      </div>
    </div>
  );
}

function ScenarioPreview({
  scenario,
  countdownDisplay,
  countdownStartedAt,
  readyLabel,
  className,
}: {
  scenario: Scenario;
  countdownDisplay: number;
  countdownStartedAt: number;
  readyLabel: string;
  className?: string;
}) {
  const { t } = useLocale();

  return (
    <div className={cn('relative w-full overflow-hidden bg-surface-page-alt text-white', className)}>
      <MockMatchSurface surface={scenario.surface} />
      {scenario.surface === 'countdown' || scenario.surface === 'kickoff-wait' ? (
        <KickoffCountdownOverlay
          countdownDisplay={countdownDisplay}
          phase={scenario.phase}
          waiting={scenario.surface === 'kickoff-wait'}
          waitingLabel={scenario.total > 1 ? t('possession.waitingForOpponent') : t('possession.startingSoon')}
          waitingDetailLabel={scenario.total > 1 ? t('possession.startsAfterReady') : undefined}
          playerReady={
            scenario.surface === 'kickoff-wait'
              ? scenario.ready >= 1
              : scenario.surface === 'countdown' && scenario.phase === 'kickoff'
                ? true
                : undefined
          }
          opponentReady={
            scenario.surface === 'kickoff-wait'
              ? (scenario.total <= 1 || scenario.ready >= 2)
              : scenario.surface === 'countdown' && scenario.phase === 'kickoff'
                ? true
                : undefined
          }
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
      ) : (
        <MatchWaitingForReadyOverlay
          title={t(scenario.titleKey)}
          readyLabel={readyLabel}
          detailLabel={t(scenario.detailKey)}
          className="absolute inset-0 h-full min-h-full"
        />
      )}
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
