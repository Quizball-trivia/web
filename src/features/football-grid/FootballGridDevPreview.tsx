'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
import type {
  FootballGridCompletedPayload,
  FootballGridCriterionView,
  FootballGridState,
  OpponentInfo,
} from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { MiniGameShell } from '@/features/mini-games/components/MiniGameShell';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { AnimatedCounter } from '@/features/game/results/AnimatedCounter';
import {
  FOOTBALL_GRID_COPY,
  FootballGridNoticeScreen,
  FootballGridTurnPanel,
  GridRewardChips,
  MatchBoard,
  PhaseOverlay,
  ResultSampleGallery,
  SearchScreen,
} from './FootballGridFlowScreen';
import { CriterionAsset } from './components/CriterionAsset';
import { FootballGridModeModal } from './components/FootballGridModeModal';

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

const PREVIEW_OPPONENT: OpponentInfo = {
  id: 'preview-rival',
  username: 'Giorgi 10',
  avatarUrl: null,
  avatarCustomization: { skin: 'skin_male_dark', hair: 'hair_cornrows', jersey: 'jersey_barcelona' },
};

const PREVIEW_RESULT_SAMPLES: FootballGridCompletedPayload['samples'] = [
  {
    cellIndex: 0,
    players: [
      { playerId: '662e7c41-0436-4be0-a5dc-8b3fabe93ecf', name: 'Thierry Henry', imageUrl: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/player-images/662e7c41-0436-4be0-a5dc-8b3fabe93ecf.webp', imageAssetKey: null },
      { playerId: '70dc16b3-f5c1-4c31-b386-34c6999cd837', name: 'Patrick Vieira', imageUrl: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/football-grid/v1/players/70dc16b3-f5c1-4c31-b386-34c6999cd837.webp', imageAssetKey: null },
      { playerId: '2ee9513d-f64a-47f0-b43b-dc934bfacf6e', name: 'Olivier Giroud', imageUrl: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/football-grid/v1/players/2ee9513d-f64a-47f0-b43b-dc934bfacf6e.webp', imageAssetKey: null },
    ],
  },
  {
    cellIndex: 1,
    players: [
      { playerId: 'a40f8645-200d-4a4b-9c3b-08e70e642e29', name: 'Gabriel Jesus', imageUrl: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/football-grid/v1/players/a40f8645-200d-4a4b-9c3b-08e70e642e29.webp', imageAssetKey: null },
      { playerId: '76ad088d-765f-4f1d-a35c-e7effbae230e', name: 'Gabriel Martinelli', imageUrl: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/football-grid/v1/players/76ad088d-765f-4f1d-a35c-e7effbae230e.webp', imageAssetKey: null },
      { playerId: '0d41d451-deba-4fc3-999c-381bd55d566f', name: 'Gilberto Silva', imageUrl: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/player-images/0d41d451-deba-4fc3-999c-381bd55d566f.webp', imageAssetKey: null },
    ],
  },
  {
    cellIndex: 2,
    players: [
      { playerId: '9c90e944-d94b-4c0c-99bc-40401f3cb3fe', name: 'Cesc Fàbregas', imageUrl: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/football-grid/v1/players/9c90e944-d94b-4c0c-99bc-40401f3cb3fe.webp', imageAssetKey: null },
      { playerId: '764741cd-3e44-46d7-8e94-b9f182069b3a', name: 'Mikel Arteta', imageUrl: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/football-grid/v1/players/764741cd-3e44-46d7-8e94-b9f182069b3a.webp', imageAssetKey: null },
      { playerId: '91f8aaa1-ffec-441b-ae1c-4d724ae98da8', name: 'Santi Cazorla', imageUrl: 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/football-grid/v1/players/91f8aaa1-ffec-441b-ae1c-4d724ae98da8.webp', imageAssetKey: null },
    ],
  },
];

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
  | 'draw'
  | 'packs'
  | 'mode-modal';

const SCENARIOS: Array<{
  id: ScenarioId;
  label: string;
  group: 'Matchmaking' | 'Match' | 'Feedback' | 'System' | 'Results' | 'Content';
  icon: typeof Search;
}> = [
  { id: 'packs', label: 'League packs (draft release)', group: 'Content', icon: LayoutGrid },
  { id: 'mode-modal', label: 'Mode modal + league picker', group: 'Content', icon: Flag },
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

const GROUPS = ['Matchmaking', 'Match', 'Feedback', 'System', 'Results', 'Content'] as const;

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
    phaseDeadlineAt: ['handoff', 'loading', 'countdown'].includes(phase)
      ? new Date(Date.now() + 3_000).toISOString()
      : phase === 'paused'
        ? new Date(Date.now() + 20_000).toISOString()
        : null,
    reconnectDeadlineAt: phase === 'paused' ? new Date(Date.now() + 20_000).toISOString() : null,
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
      accent="#1CB0F6"
      onBack={() => undefined}
      disclaimer={false}
      backgroundImageUrl={footballGridAssetUrl('/assets/bg-pattern.webp')!}
      wide
      scrollable
    >
      <div className="mx-auto mt-2 flex w-full max-w-xl flex-1 flex-col">
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
          answer={answer}
          onAnswerChange={setAnswer}
          onSubmit={handleSubmit}
          feedback={feedback}
          reportableAttempt={feedback && feedback !== 'correct' ? 'preview-attempt' : null}
          onReport={() => undefined}
        />
        <PhaseOverlay state={state} remaining={scenario === 'countdown' ? 3_000 : scenario === 'paused' ? 20_000 : 16_000} copy={copy} />
      </div>
    </MiniGameShell>
  );
}

function ResultScenario({ outcome }: { outcome: 'win' | 'loss' | 'draw' }) {
  const { locale } = useLocale();
  const copy = FOOTBALL_GRID_COPY[locale];
  const { player } = usePlayer();
  const won = outcome === 'win';
  const draw = outcome === 'draw';
  const title = won ? copy.resultWin : draw ? copy.resultDraw : copy.resultLoss;
  const myScore = won ? 3 : 2;
  const opponentScore = won ? 1 : draw ? 2 : 3;

  return (
    <main className="min-h-dvh overflow-y-auto bg-surface-page-alt bg-cover bg-center bg-no-repeat px-5 py-10 text-center text-white" style={{ backgroundImage: `url(${footballGridAssetUrl('/assets/bg-pattern.webp')})` }}>
      <div className="mx-auto max-w-3xl font-poppins">
        <div className="mx-auto max-w-xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">{copy.title}</p>
        <h1
          className={cn(
            'mt-2 font-poppins text-[2.5rem] font-black uppercase leading-[1.3] tracking-[0] sm:text-[3rem]',
            won ? 'text-brand-green' : draw ? 'text-brand-yellow' : 'text-brand-red',
          )}
        >
          {title}
        </h1>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
          <div className="flex min-w-0 flex-col items-center gap-2">
            <AvatarDisplay customization={player.avatarCustomization ?? { base: player.avatar }} size="lg" shape="square" />
            <span className="w-full truncate text-sm font-semibold uppercase text-white">{player.username}</span>
          </div>
          <div className="flex h-[44px] min-w-[110px] items-center justify-center rounded-[20px] bg-brand-blue px-5 text-2xl font-semibold tabular-nums text-white sm:h-[51px] sm:min-w-[133px] sm:px-6 sm:text-[36px]">
            <AnimatedCounter from={0} to={myScore} delay={0.25} />
            <span className="mx-1 sm:mx-1.5">:</span>
            <AnimatedCounter from={0} to={opponentScore} delay={0.25} />
          </div>
          <div className="flex min-w-0 flex-col items-center gap-2">
            <AvatarDisplay
              customization={PREVIEW_OPPONENT.avatarCustomization ?? { base: undefined }}
              size="lg"
              shape="square"
              className="-scale-x-100"
            />
            <span className="w-full truncate text-sm font-semibold uppercase text-white">{PREVIEW_OPPONENT.username}</span>
          </div>
        </div>
        {/* Fixture amounts mirror the settlement values (ranked-parity coins,
            AP-style TP: win 50 / draw 30 / loss 10). */}
        <GridRewardChips
          xp={won ? 70 : 50}
          tp={won ? 50 : draw ? 30 : 10}
          coins={won ? 700 : 250}
        />
        </div>
        <ResultSampleGallery
          samples={PREVIEW_RESULT_SAMPLES}
          board={PREVIEW_STATE.board}
          locale={locale}
          title={copy.sampleAnswers}
          body={copy.sampleAnswersBody}
        />
        <div className="mx-auto mt-7 max-w-xl space-y-3">
          {won && <button type="button" className="w-full rounded-2xl bg-brand-green px-6 py-4 font-black uppercase text-white">{copy.rematch}</button>}
          {!won && <button type="button" className="w-full rounded-2xl bg-brand-green px-6 py-4 font-black uppercase text-white transition-colors hover:bg-brand-green-deep">{copy.newOpponent}</button>}
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

  if (scenario === 'searching' || scenario === 'pairing' || scenario === 'handoff' || scenario === 'loading' || scenario === 'countdown') {
    const matchedScenario = scenario === 'handoff' || scenario === 'loading' || scenario === 'countdown';
    return (
      <SearchScreen
        playerName={player.username}
        avatar={player.avatar}
        customization={player.avatarCustomization}
        status={matchedScenario ? 'matched' : scenario === 'pairing' ? 'pairing' : 'searching'}
        opponent={matchedScenario ? PREVIEW_OPPONENT : null}
        countdownSeconds={scenario === 'countdown' ? 3 : null}
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
  if (scenario === 'packs') return <PackBrowserScenario />;
  if (scenario === 'mode-modal') return <ModeModalScenario />;
  if (scenario === 'win' || scenario === 'loss' || scenario === 'draw') return <ResultScenario outcome={scenario} />;
  return <MatchScenario key={scenario} scenario={scenario} />;
}

interface PackPreviewCriterion {
  key: string; family: FootballGridCriterionView['family'];
  labelEn: string; labelKa: string; assetKey: string | null; difficulty: 'easy' | 'normal' | 'hard';
}
interface PackPreviewBoard {
  id: string; difficulty: string; familiarityScore: number;
  rows: PackPreviewCriterion[]; columns: PackPreviewCriterion[];
  cells: Array<{ cellIndex: number; answers: number; samples: string[] }>;
}
interface PackPreviewPayload {
  release: { version: number; status: string } | null;
  themes: Array<{ theme: string; boards: number }>;
  boards: PackPreviewBoard[];
}

function toCriterionView2(criterion: PackPreviewCriterion): FootballGridCriterionView {
  return {
    id: criterion.key, key: criterion.key, family: criterion.family,
    labelEn: criterion.labelEn, labelKa: criterion.labelKa,
    assetKey: criterion.assetKey, difficulty: criterion.difficulty,
  };
}

function PackBrowserScenario() {
  const [payload, setPayload] = useState<PackPreviewPayload | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [releaseKind, setReleaseKind] = useState<'draft' | 'published'>('draft');
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const load = async (nextTheme: string | null, kind: 'draft' | 'published') => {
    const seq = ++requestSeq.current;
    try {
      const { API_BASE_URL } = await import('@/lib/config');
      const { getSupabaseAccessToken } = await import('@/lib/auth/supabase');
      // State writes only after the first await, so the initial-load effect
      // never sets state synchronously.
      if (seq === requestSeq.current) setError(null);
      const token = await getSupabaseAccessToken();
      const params = new URLSearchParams({ release: kind, limit: '40' });
      if (nextTheme) params.set('theme', nextTheme);
      const res = await fetch(`${API_BASE_URL}/api/v1/football-grid/pack-preview?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`pack-preview ${res.status}`);
      const json = await res.json() as PackPreviewPayload;
      // Drop stale responses: fast chip-switching must not render the previous
      // pack's boards under the newly selected chip.
      if (seq === requestSeq.current) setPayload(json);
    } catch (err) {
      // A superseded request must not overwrite the newer request's outcome.
      if (seq === requestSeq.current) setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Strict Mode replays this effect in development; the ref survives the
  // replay, so only one initial request is sent.
  const initialLoadRef = useRef(false);
  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    void load(null, releaseKind);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- initial load only

  return (
    <main className="min-h-dvh overflow-y-auto bg-surface-page-alt px-5 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-poppins text-2xl font-black uppercase">League pack review</h1>
        <p className="mt-1 text-sm text-white/50">
          Release: {payload?.release ? `v${payload.release.version} (${payload.release.status})` : '—'}
          <button
            type="button"
            className="ml-3 rounded-lg border border-white/20 px-2 py-0.5 text-xs font-bold"
            onClick={() => {
              const next = releaseKind === 'draft' ? 'published' : 'draft';
              setReleaseKind(next); setTheme(null); void load(null, next);
            }}
          >
            switch to {releaseKind === 'draft' ? 'published' : 'draft'}
          </button>
        </p>
        {error && <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-300">{error} — is FOOTBALL_GRID_PACK_PREVIEW_ENABLED=true on the backend?</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {(payload?.themes ?? []).map((entry) => (
            <button
              key={entry.theme}
              type="button"
              onClick={() => { setTheme(entry.theme); void load(entry.theme, releaseKind); }}
              className={cn(
                'rounded-xl border px-3 py-2 font-poppins text-xs font-black uppercase',
                theme === entry.theme ? 'border-brand-yellow bg-brand-yellow text-surface-page' : 'border-white/15 bg-white/[0.05] text-white/80',
              )}
            >
              {entry.theme} · {entry.boards}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-8">
          {(payload?.boards ?? []).map((board) => (
            <section key={board.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/45">
                {board.difficulty} · familiarity {Math.round(board.familiarityScore)}
              </p>
              <div className="grid max-w-xl grid-cols-[90px_repeat(3,minmax(0,1fr))] gap-1.5">
                <div />
                {board.columns.map((column) => (
                  <div key={column.key} className="flex flex-col items-center gap-1 rounded-xl bg-brand-blue/25 p-2 text-center">
                    <CriterionAsset criterion={toCriterionView2(column)} className="size-8" />
                    <span className="text-[10px] font-bold leading-tight text-white/80">{column.labelEn}</span>
                  </div>
                ))}
                {board.rows.flatMap((row, rowIndex) => [
                  <div key={row.key} className="flex flex-col items-center justify-center gap-1 rounded-xl bg-brand-blue/25 p-2 text-center">
                    <CriterionAsset criterion={toCriterionView2(row)} className="size-8" />
                    <span className="text-[10px] font-bold leading-tight text-white/80">{row.labelEn}</span>
                  </div>,
                  ...board.columns.map((column, columnIndex) => {
                    const cell = board.cells.find((candidate) => candidate.cellIndex === rowIndex * 3 + columnIndex);
                    return (
                      <div key={`${row.key}-${column.key}`} className="rounded-xl border border-white/10 bg-black/25 p-2">
                        <p className="text-right font-poppins text-[10px] font-black text-brand-cyan">{cell?.answers ?? 0}</p>
                        <p className="mt-1 text-[10px] leading-snug text-white/60">{(cell?.samples ?? []).join(', ')}</p>
                      </div>
                    );
                  }),
                ])}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function ModeModalScenario() {
  const [open, setOpen] = useState(true);
  return (
    <main className="grid min-h-dvh place-items-center bg-surface-page-alt text-white">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-2xl bg-brand-yellow px-6 py-3 font-poppins font-black uppercase text-black"
        >
          Reopen mode modal
        </button>
      )}
      <FootballGridModeModal
        isOpen={open}
        onOpenChange={setOpen}
        onFindOnline={(pack) => {
          // Workshop: show the chosen pack instead of navigating.
          console.log('[dev] would queue for pack:', pack);
          setOpen(false);
        }}
      />
    </main>
  );
}

export function FootballGridDevPreview() {
  const [scenario, setScenario] = useState<ScenarioId>('searching');
  const [panelOpen, setPanelOpen] = useState(true);
  const selected = SCENARIOS.find((item) => item.id === scenario)!;

  return (
    <div className="relative min-h-dvh bg-surface-page-alt">
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
        <aside className="fixed bottom-4 right-4 top-4 z-[210] w-[min(340px,calc(100vw-32px))] overflow-y-auto rounded-[28px] border border-white/15 bg-surface-page-alt/95 p-4 text-white shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-2xl">
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
