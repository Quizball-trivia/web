'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Flag,
  LayoutGrid,
  LoaderCircle,
  Menu,
  RotateCcw,
  Search,
  ShieldAlert,
  Trophy,
  UserRoundSearch,
  WifiOff,
  X,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import type { FootballGridCriterionView, FootballGridState } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { MiniGameShell, StatPill } from '@/features/mini-games/components/MiniGameShell';
import {
  FOOTBALL_GRID_COPY,
  FootballGridNoticeScreen,
  FootballGridTurnPanel,
  MatchBoard,
  PhaseOverlay,
  SearchScreen,
} from './FootballGridFlowScreen';

function criterion(
  id: string,
  family: FootballGridCriterionView['family'],
  labelEn: string,
  labelKa: string,
  assetKey: string,
): FootballGridCriterionView {
  return { id, key: id, family, labelEn, labelKa, assetKey, difficulty: 'normal' };
}

const PREVIEW_STATE: FootballGridState = {
  matchId: 'preview-match',
  status: 'active',
  phase: 'turn',
  board: {
    boardId: 'preview-board',
    boardVersion: 1,
    checksum: 'preview',
    columns: [
      criterion('france', 'country', 'France', 'საფრანგეთი', 'fr'),
      criterion('brazil', 'country', 'Brazil', 'ბრაზილია', 'br'),
      criterion('spain', 'country', 'Spain', 'ესპანეთი', 'es'),
    ],
    rows: [
      criterion('arsenal', 'club', 'Arsenal', 'არსენალი', 'arsenal'),
      criterion('fc-barcelona', 'club', 'FC Barcelona', 'ბარსელონა', 'fc-barcelona'),
      criterion('real-madrid-cf', 'club', 'Real Madrid', 'რეალ მადრიდი', 'real-madrid-cf'),
    ],
  },
  players: [
    { userId: 'preview-self', seat: 1, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
    { userId: 'preview-rival', seat: 2, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 30_000 },
  ],
  openerUserId: 'preview-self',
  currentPlayerUserId: 'preview-self',
  winnerUserId: null,
  turnNumber: 4,
  stateVersion: 8,
  claims: [
    { cellIndex: 0, footballPlayerId: 'thierry-henry', displayName: 'Thierry Henry', claimantUserId: 'preview-self', turnNumber: 1 },
    { cellIndex: 4, footballPlayerId: 'neymar', displayName: 'Neymar', claimantUserId: 'preview-rival', turnNumber: 2 },
  ],
  phaseDeadlineAt: null,
  turnDeadlineAt: null,
  turnRemainingMs: 16_000,
  pausedAt: null,
  pausedFromPhase: null,
  reconnectDeadlineAt: null,
  completionReason: null,
};

type ScenarioId =
  | 'searching'
  | 'pairing'
  | 'handoff'
  | 'loading'
  | 'countdown'
  | 'your-turn'
  | 'answer-entry'
  | 'correct'
  | 'wrong'
  | 'ambiguous'
  | 'already-used'
  | 'opponent-turn'
  | 'paused'
  | 'interrupted'
  | 'signed-out'
  | 'unavailable'
  | 'win'
  | 'loss'
  | 'draw';

const SCENARIOS: Array<{
  id: ScenarioId;
  label: string;
  group: 'Matchmaking' | 'Match' | 'Feedback' | 'System' | 'Results';
  icon: typeof Search;
}> = [
  { id: 'searching', label: 'Finding opponent', group: 'Matchmaking', icon: Search },
  { id: 'pairing', label: 'Building board', group: 'Matchmaking', icon: LayoutGrid },
  { id: 'handoff', label: 'Opponent found', group: 'Matchmaking', icon: CheckCircle2 },
  { id: 'loading', label: 'Players readying', group: 'Matchmaking', icon: LoaderCircle },
  { id: 'countdown', label: 'Countdown', group: 'Matchmaking', icon: LoaderCircle },
  { id: 'your-turn', label: 'Pick a cell', group: 'Match', icon: LayoutGrid },
  { id: 'answer-entry', label: 'Type an answer', group: 'Match', icon: LayoutGrid },
  { id: 'opponent-turn', label: 'Opponent turn', group: 'Match', icon: UserRoundSearch },
  { id: 'correct', label: 'Correct answer', group: 'Feedback', icon: CheckCircle2 },
  { id: 'wrong', label: 'Wrong answer', group: 'Feedback', icon: X },
  { id: 'ambiguous', label: 'Ambiguous name', group: 'Feedback', icon: AlertTriangle },
  { id: 'already-used', label: 'Player already used', group: 'Feedback', icon: ShieldAlert },
  { id: 'paused', label: 'Connection paused', group: 'System', icon: WifiOff },
  { id: 'interrupted', label: 'Service interruption', group: 'System', icon: AlertTriangle },
  { id: 'signed-out', label: 'Sign-in required', group: 'System', icon: UserRoundSearch },
  { id: 'unavailable', label: 'Mode unavailable', group: 'System', icon: ShieldAlert },
  { id: 'win', label: 'Win + rematch', group: 'Results', icon: Trophy },
  { id: 'loss', label: 'Loss', group: 'Results', icon: Flag },
  { id: 'draw', label: 'Draw', group: 'Results', icon: RotateCcw },
];

const GROUPS = ['Matchmaking', 'Match', 'Feedback', 'System', 'Results'] as const;

function stateForScenario(scenario: ScenarioId): FootballGridState {
  const phase = scenario === 'handoff'
    ? 'handoff'
    : scenario === 'loading'
      ? 'loading'
      : scenario === 'countdown'
        ? 'countdown'
        : scenario === 'paused'
          ? 'paused'
          : scenario === 'interrupted'
            ? 'service_interruption'
            : 'turn';
  return {
    ...PREVIEW_STATE,
    phase,
    status: phase === 'paused' || phase === 'service_interruption'
      ? 'paused'
      : phase === 'handoff' || phase === 'loading'
        ? phase
        : 'active',
    currentPlayerUserId: scenario === 'opponent-turn' ? 'preview-rival' : 'preview-self',
    phaseDeadlineAt: ['handoff', 'loading', 'countdown'].includes(phase) ? new Date(Date.now() + 3_000).toISOString() : null,
    turnDeadlineAt: phase === 'turn' ? new Date(Date.now() + 16_000).toISOString() : null,
    pausedAt: phase === 'paused' || phase === 'service_interruption' ? new Date().toISOString() : null,
    pausedFromPhase: phase === 'paused' || phase === 'service_interruption' ? 'turn' : null,
  };
}

function MatchScenario({ scenario }: { scenario: ScenarioId }) {
  const { locale } = useLocale();
  const copy = FOOTBALL_GRID_COPY[locale];
  const state = useMemo(() => stateForScenario(scenario), [scenario]);
  const forcedSelection = ['answer-entry', 'correct', 'wrong', 'ambiguous', 'already-used'].includes(scenario) ? 2 : null;
  const [selectedCell, setSelectedCell] = useState<number | null>(forcedSelection);
  const [answer, setAnswer] = useState(forcedSelection === null ? '' : 'Sergio Ramos');
  const feedback = scenario === 'correct'
    ? 'correct'
    : scenario === 'wrong'
      ? 'wrong'
      : scenario === 'ambiguous'
        ? 'ambiguous'
        : scenario === 'already-used'
          ? 'already_used'
          : undefined;
  const isMyTurn = state.phase === 'turn' && state.currentPlayerUserId === 'preview-self';
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => event.preventDefault();

  return (
    <MiniGameShell
      title={copy.title}
      subtitle={copy.subtitle}
      accent="#1CB0F6"
      headerRight={<StatPill label={copy.scoreLabel} value="1 · 1" color="#1CB0F6" />}
      onBack={() => undefined}
      disclaimer={false}
      backgroundImageUrl={footballGridAssetUrl('/assets/bg-pattern.webp')!}
    >
      <div className="mt-2 flex flex-1 flex-col">
        <MatchBoard
          state={state}
          selfUserId="preview-self"
          locale={locale}
          selectedCell={selectedCell}
          onSelect={(cell) => { setSelectedCell(cell); setAnswer(''); }}
        />
        <FootballGridTurnPanel
          state={state}
          locale={locale}
          isMyTurn={isMyTurn}
          selectedCell={selectedCell}
          remaining={scenario === 'countdown' ? 3_000 : 16_000}
          answer={answer}
          onAnswerChange={setAnswer}
          onSubmit={handleSubmit}
          onPass={() => { setSelectedCell(null); setAnswer(''); }}
          feedback={feedback}
          reportableAttempt={feedback && feedback !== 'correct' ? 'preview-attempt' : null}
          onReport={() => undefined}
        />
        <PhaseOverlay state={state} remaining={scenario === 'countdown' ? 3_000 : 16_000} copy={copy} />
      </div>
    </MiniGameShell>
  );
}

function ResultScenario({ outcome }: { outcome: 'win' | 'loss' | 'draw' }) {
  const { locale } = useLocale();
  const copy = FOOTBALL_GRID_COPY[locale];
  const won = outcome === 'win';
  const draw = outcome === 'draw';
  const Icon = won ? Trophy : draw ? RotateCcw : Flag;
  const title = won ? copy.resultWin : draw ? copy.resultDraw : copy.resultLoss;
  const myScore = won ? 3 : 2;
  const opponentScore = won ? 1 : draw ? 2 : 3;

  return (
    <main className="min-h-dvh overflow-y-auto bg-surface-page-alt px-5 py-10 text-center text-white">
      <div className="mx-auto max-w-xl">
        <div className={cn('mx-auto grid size-24 place-items-center rounded-[30px]', won ? 'bg-brand-yellow text-surface-page' : draw ? 'bg-white/10 text-white' : 'bg-brand-blue text-white')}>
          <Icon className="size-12" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-white/40">{copy.title}</p>
        <h1 className="mt-2 text-4xl font-black uppercase tracking-tight">{title}</h1>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-brand-blue-light bg-brand-blue/15 p-4"><p className="text-xs font-bold uppercase text-white/45">quizballPro</p><p className="mt-1 text-4xl font-black">{myScore}</p></div>
          <div className="rounded-2xl border border-brand-yellow/50 bg-brand-yellow/10 p-4"><p className="text-xs font-bold uppercase text-white/45">Giorgi 10</p><p className="mt-1 text-4xl font-black">{opponentScore}</p></div>
        </div>
        <div className="mt-3 rounded-2xl bg-white/5 p-4 font-black text-brand-blue-light">+{won ? 70 : 50} {copy.xp}</div>
        <div className="mt-7 space-y-3">
          {won && <button type="button" className="w-full rounded-2xl bg-brand-yellow px-6 py-4 font-black uppercase text-surface-page">{copy.rematch}</button>}
          <button type="button" className="w-full rounded-2xl bg-brand-blue px-6 py-4 font-black uppercase">{copy.newOpponent}</button>
          <button type="button" className="w-full rounded-2xl border border-white/15 px-6 py-4 font-bold text-white/70">{copy.backToPlay}</button>
        </div>
      </div>
    </main>
  );
}

function ScenarioSurface({ scenario }: { scenario: ScenarioId }) {
  const { locale } = useLocale();
  const copy = FOOTBALL_GRID_COPY[locale];
  const { player } = usePlayer();

  if (scenario === 'searching' || scenario === 'pairing') {
    return (
      <SearchScreen
        playerName={player.username}
        avatar={player.avatar}
        customization={player.avatarCustomization}
        status={scenario === 'pairing' ? 'pairing' : 'searching'}
        onCancel={() => undefined}
        copy={copy}
      />
    );
  }
  if (scenario === 'signed-out') {
    return <FootballGridNoticeScreen kind="auth" title={copy.signIn} body={copy.signInBody} actionLabel={copy.goSignIn} onAction={() => undefined} />;
  }
  if (scenario === 'unavailable') {
    return <FootballGridNoticeScreen kind="unavailable" title={copy.unavailable} body={copy.unavailableBody} actionLabel={copy.retry} onAction={() => undefined} />;
  }
  if (scenario === 'win' || scenario === 'loss' || scenario === 'draw') return <ResultScenario outcome={scenario} />;
  return <MatchScenario key={scenario} scenario={scenario} />;
}

export function FootballGridDevPreview() {
  const [scenario, setScenario] = useState<ScenarioId>('searching');
  const [panelOpen, setPanelOpen] = useState(true);
  const selected = SCENARIOS.find((item) => item.id === scenario)!;

  return (
    <div className="relative min-h-dvh bg-[#080b15]">
      <ScenarioSurface scenario={scenario} />

      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        aria-label={panelOpen ? 'Close UI workshop' : 'Open UI workshop'}
        className="fixed right-4 top-4 z-[220] grid size-11 place-items-center rounded-2xl border border-white/15 bg-black/75 text-white shadow-2xl backdrop-blur-xl"
      >
        {panelOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {panelOpen && (
        <aside className="fixed bottom-4 right-4 top-4 z-[210] w-[min(340px,calc(100vw-32px))] overflow-y-auto rounded-[28px] border border-white/15 bg-[#0c1020]/95 p-4 text-white shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-2xl">
          <div className="pr-12">
            <p className="font-poppins text-[10px] font-black uppercase tracking-[0.22em] text-brand-yellow">Development route</p>
            <h1 className="mt-1 font-poppins text-xl font-black uppercase leading-tight">Tic Tac Toe UI workshop</h1>
            <p className="mt-2 text-xs leading-relaxed text-white/45">Choose any screen or match state. This panel is never included in production.</p>
          </div>

          <div className="mt-5 rounded-2xl border border-brand-blue-light/30 bg-brand-blue/10 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-brand-blue-light">Now previewing</p>
            <p className="mt-1 font-poppins text-sm font-black uppercase">{selected.label}</p>
          </div>

          <div className="mt-5 space-y-5">
            {GROUPS.map((group) => (
              <section key={group}>
                <h2 className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{group}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {SCENARIOS.filter((item) => item.group === group).map((item) => {
                    const Icon = item.icon;
                    const active = item.id === scenario;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setScenario(item.id)}
                        className={cn(
                          'flex min-h-16 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition',
                          active
                            ? 'border-brand-yellow bg-brand-yellow text-surface-page'
                            : 'border-white/10 bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.07]',
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="text-[11px] font-black uppercase leading-tight">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <button type="button" onClick={() => setPanelOpen(false)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-xs font-bold text-white/50">
            <ChevronLeft className="size-4" /> Hide workshop
          </button>
        </aside>
      )}
    </div>
  );
}
