'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { AuctionLeaveControl } from '@/features/auction/components/shared/AuctionLeaveControl';
import { MiniGameShell } from '@/features/mini-games/components/MiniGameShell';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import { gridSoloApi, GridSoloError, type GridSoloBoard } from '@/lib/football-grid/soloApi';
import { loadGridTypeaheadRoster, searchGridPlayers, type GridTypeaheadPreparedPlayer } from '@/lib/football-grid/typeahead';
import type { Locale } from '@/lib/i18n/locale';
import type { FootballGridCommandResultPayload, FootballGridOption, FootballGridState } from '@/lib/realtime/socket.types';
import type { AvatarCustomization } from '@/types/game';
import { cn } from '@/lib/utils';
import {
  FOOTBALL_GRID_COPY,
  FootballGridTurnPanel,
  GRID_BACKGROUND_STYLE,
  GridResultHero,
  GridRulesPanel,
  MatchBoard,
} from '../FootballGridFlowScreen';
import { GridWinLine } from '../components/GridWinLine';
import { GRID_WIN_LINE_HOLD_MS } from '../winLine';
import { fillLocal, GRID_LOCAL_COPY, type GridLocalCopy } from './localCopy';
import { LOCAL_SESSION_KEY, localSnapshotOf, parseLocalSnapshot, type LocalSnapshot } from './localSession';
import {
  agreeLocalDraw,
  canPickLocalCell,
  claimLocalCell,
  DEFAULT_LOCAL_SETTINGS,
  LOCAL_ANSWERS,
  LOCAL_DIFFICULTIES,
  LOCAL_ROUNDS,
  LOCAL_STEALS,
  LOCAL_SUSPENSIONS,
  LOCAL_TURN_SECONDS,
  localMaxGames,
  localWinningLine,
  missLocalTurn,
  newLocalGame,
  newLocalSeries,
  otherSeat,
  recordLocalGame,
  type LocalEndReason,
  type LocalGame,
  type LocalSeat,
  type LocalSeries,
  type LocalSettings,
} from './localGame';

const SEAT_ID: Record<LocalSeat, string> = { 1: 'local-1', 2: 'local-2' };
const SETTINGS_KEY = 'qb-grid-local-settings-v1';
const GRID_BACKGROUND = footballGridAssetUrl('/assets/bg-pattern.webp')!;
const SEAT_AVATARS: Record<LocalSeat, AvatarCustomization> = {
  1: { skin: 'skin_male_white', hair: 'hair_wave', jersey: 'jersey_barcelona' },
  2: { skin: 'skin_male_dark', hair: 'hair_buzz', jersey: 'jersey_milan' },
};

const SESSION_KEY = LOCAL_SESSION_KEY;
type Stage = 'setup' | 'suspend' | 'handoff' | 'loading' | 'failed' | 'play' | 'between' | 'done';
type Feedback = FootballGridCommandResultPayload['outcome'] | undefined;

function readSnapshot(): LocalSnapshot | null {
  try { return parseLocalSnapshot(window.sessionStorage.getItem(SESSION_KEY), Date.now()); } catch { return null; }
}

function forgetSnapshot(): void {
  try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* storage blocked: nothing was kept */ }
}

function readStoredSettings(): LocalSettings {
  try {
    const raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<LocalSettings> | null;
    if (!raw) return DEFAULT_LOCAL_SETTINGS;
    return {
      difficulty: LOCAL_DIFFICULTIES.find((value) => value === raw.difficulty) ?? DEFAULT_LOCAL_SETTINGS.difficulty,
      rounds: LOCAL_ROUNDS.find((value) => value === raw.rounds) ?? DEFAULT_LOCAL_SETTINGS.rounds,
      turnSeconds: LOCAL_TURN_SECONDS.find((value) => value === raw.turnSeconds) ?? DEFAULT_LOCAL_SETTINGS.turnSeconds,
      answers: LOCAL_ANSWERS.find((value) => value === raw.answers) ?? DEFAULT_LOCAL_SETTINGS.answers,
      steals: LOCAL_STEALS.find((value) => value === raw.steals) ?? DEFAULT_LOCAL_SETTINGS.steals,
      suspensions: raw.suspensions === true,
    };
  } catch {
    return DEFAULT_LOCAL_SETTINGS;
  }
}

function gridStateOf(deal: GridSoloBoard, game: LocalGame, locale: Locale): FootballGridState {
  return {
    matchId: 'local',
    status: game.endReason ? 'completed' : 'active',
    phase: game.endReason ? 'terminal' : 'turn',
    board: deal.board,
    players: ([1, 2] as const).map((seat) => ({
      userId: SEAT_ID[seat], seat, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 0,
    })) as FootballGridState['players'],
    openerUserId: SEAT_ID[1],
    currentPlayerUserId: game.endReason ? null : SEAT_ID[game.current],
    winnerUserId: game.winner ? SEAT_ID[game.winner] : null,
    turnNumber: game.turnNumber,
    stateVersion: game.turnNumber,
    claims: game.claims.map((claim) => ({
      cellIndex: claim.cellIndex,
      footballPlayerId: claim.player.playerId,
      displayName: locale === 'ka' && claim.player.nameKa ? claim.player.nameKa : claim.player.name,
      imageUrl: claim.player.imageUrl,
      claimantUserId: SEAT_ID[claim.seat],
      turnNumber: claim.turnNumber,
    })),
    phaseDeadlineAt: null,
    turnDeadlineAt: null,
    turnRemainingMs: null,
    pausedAt: null,
    reconnectDeadlineAt: null,
    completionReason: null,
  };
}

const optionsKey = (deal: GridSoloBoard, gameIndex: number, turnNumber: number, cell: number): string =>
  `${deal.board.boardId}:g${gameIndex}t${turnNumber}:${cell}`;

function endNote(reason: LocalEndReason | null, copy: GridLocalCopy): string | null {
  if (reason === 'board_dead') return copy.noteDead;
  if (reason === 'board_full') return copy.noteFull;
  if (reason === 'draw_agreed') return copy.noteAgreed;
  if (reason === 'turn_limit') return copy.noteTurnLimit;
  return null;
}

function ChipRow<T extends string | number | boolean>({ legend, help, values, value, label, onChange, name }: {
  legend: string;
  help?: string;
  values: readonly T[];
  value: T;
  label: (value: T) => string;
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 font-poppins text-[11px] font-bold uppercase tracking-wide text-white/55">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {values.map((entry) => (
          <button
            key={String(entry)}
            type="button"
            aria-pressed={entry === value}
            data-local-option={`${name}:${entry}`}
            onClick={() => onChange(entry)}
            className={cn(
              'min-h-10 rounded-full px-3.5 font-poppins text-xs font-bold transition-colors',
              entry === value ? 'bg-brand-blue text-white' : 'bg-white/[0.07] text-white/75 hover:bg-white/[0.12]',
            )}
          >
            {label(entry)}
          </button>
        ))}
      </div>
      {help && <p className="mt-1.5 text-[11px] leading-snug text-white/45">{help}</p>}
    </fieldset>
  );
}

/** Milliseconds left on the turn; null when the game is untimed or not being played. */
function useTurnRemaining(deadline: number | null, onExpire: () => void): number | null {
  const [now, setNow] = useState(() => Date.now());
  const expire = useRef(onExpire);
  useEffect(() => { expire.current = onExpire; }, [onExpire]);
  useEffect(() => {
    if (deadline === null) return;
    let fired = false;
    const interval = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && !fired) { fired = true; expire.current(); }
    }, 200);
    return () => window.clearInterval(interval);
  }, [deadline]);
  return deadline === null ? null : Math.max(0, deadline - now);
}

export function GridLocalScreen() {
  const router = useRouter();
  const { siteLocale: locale } = useLocale();
  const copy = GRID_LOCAL_COPY[locale];
  const gridCopy = FOOTBALL_GRID_COPY[locale];
  const [stage, setStage] = useState<Stage>('setup');
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_LOCAL_SETTINGS);
  const [names, setNames] = useState<Record<LocalSeat, string>>({ 1: '', 2: '' });
  const [deal, setDeal] = useState<GridSoloBoard | null>(null);
  const [game, setGame] = useState<LocalGame | null>(null);
  const [series, setSeries] = useState<LocalSeries>(newLocalSeries);
  const [opener, setOpener] = useState<LocalSeat>(1);
  /** blocked[seat]: the footballers that seat may not use, named by the other player. */
  const [blocked, setBlocked] = useState<Record<LocalSeat, FootballGridOption[]>>({ 1: [], 2: [] });
  const [suspendSeat, setSuspendSeat] = useState<LocalSeat>(1);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [options, setOptions] = useState<{ key: string; items: FootballGridOption[] | null } | null>(null);
  /** The running turn's clock, kept with the turn it belongs to so the two can never be read apart. */
  const [clock, setClock] = useState<LocalSnapshot['deadline']>(null);
  const [confirmDraw, setConfirmDraw] = useState(false);
  /** typing[seat]: that player chose "type it instead" in a pick-from-four series. */
  const [typing, setTyping] = useState<Record<LocalSeat, boolean>>({ 1: false, 2: false });
  const playedBoardIds = useRef<string[]>([]);
  /** Who moves first on the board being dealt: a retry after a failed deal asks for the same game. */
  const dealMover = useRef<LocalSeat>(1);
  /** A clock carried over a reload, for its own turn only. */
  const restoredDeadline = useRef<LocalSnapshot['deadline']>(null);
  const pendingRef = useRef(false);
  /** Changes whenever the game on screen is replaced or left: an answer still on its way to an older game is dropped. */
  const gameToken = useRef(0);
  /** The options request the sheet is waiting for; an older one arriving late is ignored. */
  const optionsWanted = useRef<string | null>(null);

  useEffect(() => {
    setSettings(readStoredSettings());
    const saved = readSnapshot();
    if (!saved) return;
    playedBoardIds.current = saved.played;
    restoredDeadline.current = saved.deadline;
    setSettings(saved.settings);
    setNames(saved.names);
    setDeal(saved.deal);
    setGame(saved.game);
    setSeries(saved.series);
    setOpener(saved.opener);
    setBlocked(saved.blocked);
    setTyping(saved.typing);
    setStage(saved.stage);
  }, []);
  const updateSettings = (change: Partial<LocalSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...change };
      try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* storage blocked: the choice lasts for this visit */ }
      return next;
    });
  };

  const nameOf = useCallback((seat: LocalSeat) => names[seat].trim() || (seat === 1 ? copy.playerOne : copy.playerTwo), [copy, names]);

  const dealBoard = useCallback(async (firstMover: LocalSeat) => {
    const token = ++gameToken.current;
    dealMover.current = firstMover;
    optionsWanted.current = null;
    setStage('loading');
    setSelectedCell(null);
    setAnswer('');
    setFeedback(undefined);
    setNotice(null);
    setOptions(null);
    setConfirmDraw(false);
    try {
      const next = await gridSoloApi.dealBoard({ difficulty: settings.difficulty, excludeBoardIds: playedBoardIds.current.slice(-20) });
      if (token !== gameToken.current) return;
      playedBoardIds.current.push(next.board.boardId);
      setDeal(next);
      setGame(newLocalGame(firstMover, settings));
      setStage('play');
    } catch {
      if (token === gameToken.current) setStage('failed');
    }
  }, [settings]);

  /** Back to the settings: whatever was in flight for the game being left no longer applies. */
  const backToSetup = () => {
    gameToken.current += 1;
    optionsWanted.current = null;
    restoredDeadline.current = null;
    forgetSnapshot();
    setStage('setup');
  };

  const startSeries = () => {
    const first: LocalSeat = Math.random() < 0.5 ? 1 : 2;
    setOpener(first);
    setSeries(newLocalSeries());
    setBlocked({ 1: [], 2: [] });
    setTyping({ 1: false, 2: false });
    restoredDeadline.current = null;
    forgetSnapshot();
    if (settings.suspensions) {
      setSuspendSeat(1);
      setStage('suspend');
    } else {
      void dealBoard(first);
    }
  };

  /** Folds a finished game into the series and moves to the screen that follows it. */
  const finishGame = useCallback((finished: LocalGame) => {
    setClock(null);
    setSelectedCell(null);
    const next = recordLocalGame(series, finished, settings.rounds);
    setSeries(next);
    setStage(next.finished ? 'done' : 'between');
  }, [series, settings.rounds]);

  const applyGame = useCallback((next: LocalGame) => {
    setGame(next);
    setSelectedCell(null);
    setAnswer('');
    setOptions(null);
    setConfirmDraw(false);
    if (next.endReason !== 'line') {
      if (next.endReason) finishGame(next);
      return;
    }
    // Three in a line: the board stays up with the line crossed out, then the result.
    const token = gameToken.current;
    setClock(null);
    window.setTimeout(() => { if (token === gameToken.current) finishGame(next); }, GRID_WIN_LINE_HOLD_MS);
  }, [finishGame]);

  // A fresh clock for every turn of a timed game.
  const turnKey = stage === 'play' && game && !game.endReason ? `${series.gameIndex}:${game.turnNumber}` : null;
  // Only the clock set for the turn on screen counts: for the instant after a turn ends the one on hand is the
  // last turn's, and it must neither show nor run out for the new turn.
  const deadline = clock && clock.turn === turnKey ? clock.at : null;
  useEffect(() => {
    const carried = restoredDeadline.current;
    // A clock carried over a reload serves the turn it was running for and no other.
    if (turnKey && carried && carried.turn !== turnKey) restoredDeadline.current = null;
    if (turnKey && carried?.turn === turnKey) setClock(carried);
    else setClock(turnKey && settings.turnSeconds > 0 ? { turn: turnKey, at: Date.now() + settings.turnSeconds * 1_000 } : null);
  }, [settings.turnSeconds, turnKey]);
  useEffect(() => {
    const snapshot = localSnapshotOf({
      stage, settings, names, deal, game, series, opener, blocked, typing,
      played: playedBoardIds.current,
      // Between a turn ending and the next clock being set, the clock on hand is the old turn's: it is not kept.
      deadline: clock && clock.turn === turnKey ? clock : null,
    });
    if (!snapshot) return;
    try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot)); } catch { /* storage blocked: a reload starts over */ }
  }, [blocked, clock, deal, game, names, opener, series, settings, stage, turnKey, typing]);

  const expireTurn = useCallback((current: LocalGame) => {
    setFeedback(undefined);
    setNotice(copy.timeUp);
    applyGame(missLocalTurn(current));
  }, [applyGame, copy.timeUp]);
  const handleExpire = useCallback(() => {
    // A verdict already on its way decides the turn; if it decides nothing, submit() ends the turn when it lands.
    if (pendingRef.current || !game || game.endReason || stage !== 'play') return;
    if (deadline === null || Date.now() < deadline) return;
    expireTurn(game);
  }, [deadline, expireTurn, game, stage]);
  const remainingMs = useTurnRemaining(stage === 'play' ? deadline : null, handleExpire);

  const usedForOptions = useMemo(
    () => (game ? [...game.usedPlayerIds, ...blocked[game.current].map((player) => player.playerId)] : []),
    [blocked, game],
  );

  const selectCell = (cell: number) => {
    if (!game || !deal || !canPickLocalCell(game, cell) || pending) return;
    setSelectedCell(cell);
    setAnswer('');
    setFeedback(undefined);
    setNotice(null);
    if (settings.answers !== 'choice') return;
    const optionSeed = `g${series.gameIndex}t${game.turnNumber}`;
    const key = optionsKey(deal, series.gameIndex, game.turnNumber, cell);
    optionsWanted.current = key;
    if (options?.key === key) return;
    setOptions(null);
    const keep = (items: FootballGridOption[] | null) => { if (optionsWanted.current === key) setOptions({ key, items }); };
    void gridSoloApi.options({ boardId: deal.board.boardId, ticket: deal.ticket, cellIndex: cell, usedPlayerIds: usedForOptions, optionSeed })
      .then(keep, () => keep(null));
  };

  const submit = async (text: string, picked: FootballGridOption | null) => {
    if (!game || !deal || selectedCell === null || pendingRef.current || !text.trim()) return;
    // The clock's own tick can be late (a tab in the background): an answer sent after time is up is not an answer.
    if (deadline !== null && Date.now() >= deadline) { expireTurn(game); return; }
    const cell = selectedCell;
    const mover = game.current;
    const token = gameToken.current;
    const turnDeadline = deadline;
    pendingRef.current = true;
    setPending(true);
    setNotice(null);
    setConfirmDraw(false);
    /** The turn's time ran out while the answer was being judged and the answer did not end the turn. */
    const outOfTime = () => turnDeadline !== null && Date.now() >= turnDeadline;
    try {
      const verdict = await gridSoloApi.answer({
        boardId: deal.board.boardId,
        ticket: deal.ticket,
        cellIndex: cell,
        text: text.trim(),
        usedPlayerIds: game.usedPlayerIds,
        ...(picked && { optionPlayerId: picked.playerId }),
      });
      if (token !== gameToken.current) return;
      if (verdict.outcome === 'ambiguous') {
        if (outOfTime()) expireTurn(game);
        else setFeedback('ambiguous');
      } else if (verdict.outcome === 'correct' && blocked[mover].some((player) => player.playerId === verdict.player.playerId)) {
        setFeedback(undefined);
        setNotice(fillLocal(copy.suspended, { player: locale === 'ka' && verdict.player.nameKa ? verdict.player.nameKa : verdict.player.name }));
        applyGame(missLocalTurn(game));
      } else if (verdict.outcome === 'correct') {
        setFeedback('correct');
        applyGame(claimLocalCell(game, cell, verdict.player));
      } else {
        setFeedback(verdict.outcome);
        applyGame(missLocalTurn(game));
      }
    } catch (error) {
      if (token !== gameToken.current) return;
      if (error instanceof GridSoloError && error.status === 403) {
        // The board's ticket lapsed (the game sat for hours): no retry can succeed, so this game starts again on a
        // new board with the same player to move, and the series score stands.
        void dealBoard(mover).then(() => { if (gameToken.current === token + 1) setNotice(copy.boardExpired); });
      } else if (outOfTime()) expireTurn(game);
      else setNotice(copy.boardFailed);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const leave = () => { forgetSnapshot(); router.push('/play'); };

  if (stage === 'setup') {
    return (
      <main className="min-h-dvh bg-surface-page-alt bg-cover bg-center bg-no-repeat px-4 py-8 text-white" style={GRID_BACKGROUND_STYLE}>
        <AuctionLeaveControl ariaLabel={copy.back} onClick={leave} />
        <div className="mx-auto flex w-full max-w-md flex-col gap-5 pt-10" data-local-stage="setup">
          <header className="text-center font-poppins">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/40">{gridCopy.title}</p>
            <h1 className="mt-1 text-3xl font-black uppercase leading-tight">{copy.title}</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-white/60">{copy.subtitle}</p>
          </header>
          <div className="grid grid-cols-2 gap-2">
            {([1, 2] as const).map((seat) => (
              <label key={seat} className="flex min-w-0 flex-col gap-1">
                <span className={cn('font-poppins text-[11px] font-bold uppercase tracking-wide', seat === 1 ? 'text-brand-cyan' : 'text-brand-red-soft')}>
                  {seat === 1 ? copy.playerOne : copy.playerTwo}
                </span>
                <input
                  value={names[seat]}
                  onChange={(event) => setNames((current) => ({ ...current, [seat]: event.target.value.slice(0, 14) }))}
                  placeholder={copy.namePlaceholder}
                  maxLength={14}
                  autoComplete="off"
                  data-local-name={seat}
                  className="h-11 w-full min-w-0 rounded-xl border-none bg-surface-input px-3 text-base font-bold text-white outline-none placeholder:text-white/35"
                />
              </label>
            ))}
          </div>
          <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-card/80 p-4">
            <ChipRow name="difficulty" legend={copy.difficulty} values={LOCAL_DIFFICULTIES} value={settings.difficulty}
              label={(value) => copy[value]} onChange={(difficulty) => updateSettings({ difficulty })} />
            <ChipRow name="rounds" legend={copy.rounds} values={LOCAL_ROUNDS} value={settings.rounds}
              label={(value) => (value === 'bo1' ? copy.single : fillLocal(copy.bestOf, { n: localMaxGames(value) }))}
              onChange={(rounds) => updateSettings({ rounds })} />
            <ChipRow name="turnSeconds" legend={copy.turnTime} values={LOCAL_TURN_SECONDS} value={settings.turnSeconds}
              label={(value) => (value === 0 ? copy.noClock : fillLocal(copy.seconds, { n: value }))}
              onChange={(turnSeconds) => updateSettings({ turnSeconds })} />
            <ChipRow name="answers" legend={copy.answers} values={LOCAL_ANSWERS} value={settings.answers}
              label={(value) => (value === 'type' ? copy.typeName : copy.pickFour)} onChange={(answers) => updateSettings({ answers })} />
            <ChipRow name="steals" legend={copy.steals} help={copy.stealsHelp} values={LOCAL_STEALS} value={settings.steals}
              label={(value) => (value === 0 ? copy.stealsOff : fillLocal(copy.stealsEach, { n: value }))}
              onChange={(steals) => updateSettings({ steals })} />
            <ChipRow name="suspensions" legend={copy.suspensions} help={copy.suspensionsHelp} values={[false, true] as const} value={settings.suspensions}
              label={(value) => (value ? copy.suspensionsOn : copy.stealsOff)} onChange={(suspensions) => updateSettings({ suspensions })} />
          </section>
          <button type="button" onClick={startSeries} data-local-action="start"
            className="h-14 w-full rounded-2xl bg-brand-green font-poppins text-base font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep">
            {copy.start}
          </button>
        </div>
      </main>
    );
  }

  if (stage === 'suspend' || stage === 'handoff') {
    const chooser = suspendSeat;
    const target = otherSeat(chooser);
    return (
      <main className="min-h-dvh bg-surface-page-alt bg-cover bg-center bg-no-repeat px-4 py-8 text-white" style={GRID_BACKGROUND_STYLE}>
        <AuctionLeaveControl ariaLabel={copy.back} onClick={backToSetup} />
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 pt-12 font-poppins" data-local-stage={stage}>
          {stage === 'handoff' ? (
            <div className="flex flex-col items-center gap-3 pt-16 text-center">
              <h1 className="text-2xl font-black uppercase leading-tight">{fillLocal(copy.passPhone, { name: nameOf(chooser) })}</h1>
              <p className="text-sm text-white/60">{fillLocal(copy.passPhoneBody, { name: nameOf(chooser) })}</p>
              <button type="button" onClick={() => setStage('suspend')} data-local-action="have-phone"
                className="mt-4 h-14 w-full rounded-2xl bg-brand-blue text-base font-black uppercase tracking-wide text-white">
                {copy.ready}
              </button>
            </div>
          ) : (
            <SuspensionPicker
              key={chooser}
              copy={copy}
              locale={locale}
              title={fillLocal(copy.suspendTitle, { name: nameOf(chooser) })}
              body={fillLocal(copy.suspendBody, { other: nameOf(target) })}
              onDone={(picked) => {
                setBlocked((current) => ({ ...current, [target]: picked }));
                if (chooser === 1) {
                  setSuspendSeat(2);
                  setStage('handoff');
                } else {
                  void dealBoard(opener);
                }
              }}
            />
          )}
        </div>
      </main>
    );
  }

  if (stage === 'loading' || stage === 'failed' || !deal || !game) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-page-alt bg-cover bg-center bg-no-repeat px-6 text-center font-poppins text-white" style={GRID_BACKGROUND_STYLE}>
        {stage === 'failed' ? (
          <>
            <p className="max-w-xs text-sm font-semibold text-white/75">{copy.boardFailed}</p>
            <button type="button" onClick={() => void dealBoard(dealMover.current)} className="h-12 rounded-2xl bg-brand-green px-8 text-sm font-black uppercase text-white">{copy.retry}</button>
            <button type="button" onClick={backToSetup} className="text-sm font-bold text-white/60 underline underline-offset-4">{copy.changeSettings}</button>
          </>
        ) : (
          <>
            <LoaderCircle className="size-8 animate-spin text-brand-yellow" aria-hidden="true" />
            <p className="text-sm font-bold uppercase tracking-wide text-white/70">{copy.loadingBoard}</p>
          </>
        )}
      </main>
    );
  }

  const state = gridStateOf(deal, game, locale);
  const maxGames = localMaxGames(settings.rounds);

  if (stage === 'between' || stage === 'done') {
    const seriesOver = stage === 'done';
    const winner = seriesOver ? series.winner : game.winner;
    const title = seriesOver
      ? (winner ? fillLocal(copy.seriesWon, { name: nameOf(winner) }) : copy.seriesDrawn)
      : (winner ? fillLocal(copy.gameWon, { name: nameOf(winner), n: series.gameIndex }) : fillLocal(copy.gameDrawn, { n: series.gameIndex }));
    const single = maxGames === 1;
    const score = (seat: LocalSeat) => (single ? game.claims.filter((claim) => claim.seat === seat).length : series.wins[seat]);
    return (
      <main className="min-h-dvh overflow-y-auto bg-surface-page-alt bg-cover bg-center bg-no-repeat px-5 py-10 text-white" style={GRID_BACKGROUND_STYLE}>
        <div className="mx-auto max-w-3xl text-center font-poppins" data-local-stage={stage}>
          <div className="mx-auto max-w-xl">
            <GridResultHero
              copy={gridCopy}
              title={title}
              tone={winner ? 'win' : 'draw'}
              note={endNote(game.endReason, copy)}
              selfName={nameOf(1)}
              selfCustomization={SEAT_AVATARS[1]}
              opponentName={nameOf(2)}
              opponentCustomization={SEAT_AVATARS[2]}
              myScore={score(1)}
              theirScore={score(2)}
            />
          </div>
          <div className="mx-auto mt-6 max-w-[26rem] text-left">
            <MatchBoard state={state} selfUserId={SEAT_ID[1]} locale={locale} selectedCell={null} onSelect={() => {}} />
            <GridRulesPanel board={deal.board} locale={locale} />
          </div>
          <div className="mx-auto mt-7 max-w-xl space-y-3">
            {seriesOver ? (
              <>
                <button type="button" onClick={startSeries} data-local-action="again" className="w-full rounded-2xl bg-brand-green px-6 py-4 font-black uppercase text-white transition-colors hover:bg-brand-green-deep">{copy.playAgain}</button>
                <button type="button" onClick={backToSetup} className="w-full rounded-2xl border border-white/15 px-6 py-4 font-bold text-white/70">{copy.changeSettings}</button>
                <button type="button" onClick={leave} className="w-full rounded-2xl border border-white/15 px-6 py-4 font-bold text-white/70">{copy.back}</button>
              </>
            ) : (
              <button
                type="button"
                data-local-action="next"
                onClick={() => {
                  const next = otherSeat(opener);
                  setOpener(next);
                  setSeries((current) => ({ ...current, gameIndex: current.gameIndex + 1 }));
                  void dealBoard(next);
                }}
                className="w-full rounded-2xl bg-brand-green px-6 py-4 font-black uppercase text-white transition-colors hover:bg-brand-green-deep"
              >
                {copy.nextBoard}
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const mover = game.current;
  // The tick can be a moment behind a fresh deadline: never show more than the full turn.
  const seconds = remainingMs === null ? null : Math.min(settings.turnSeconds, Math.ceil(remainingMs / 1_000));
  const ratio = remainingMs === null || settings.turnSeconds === 0 ? 0 : Math.min(1, remainingMs / (settings.turnSeconds * 1_000));
  const takeableCells = game.stealsLeft[mover] > 0
    ? game.claims.filter((claim) => claim.seat !== mover).map((claim) => claim.cellIndex)
    : null;
  const cellOptions = selectedCell !== null && options?.key === optionsKey(deal, series.gameIndex, game.turnNumber, selectedCell) ? options.items : undefined;
  const wonLine = game.endReason === 'line' ? localWinningLine(game.claims) : null;
  return (
    <>
      <MiniGameShell title={gridCopy.title} accent="#1CB0F6" hideHeader disclaimer={false} backgroundImageUrl={GRID_BACKGROUND} wide scrollable>
        <div className="mx-auto mt-14 flex w-full max-w-[26rem] flex-1 flex-col sm:mt-16 sm:max-w-[28rem]" data-local-stage="play">
          <div className="px-1 py-2 font-poppins">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <span className={cn('truncate text-sm font-black uppercase', mover === 1 ? 'text-brand-cyan' : 'text-brand-cyan/55')}>{nameOf(1)}</span>
              <div className="flex flex-col items-center">
                <div className="flex h-9 min-w-[88px] items-center justify-center rounded-xl bg-brand-blue px-3 text-xl font-black tabular-nums text-white">
                  {series.wins[1]}<span className="mx-1.5 text-white/60">–</span>{series.wins[2]}
                </div>
                {maxGames > 1 && (
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-white/50">
                    {fillLocal(gridCopy.gameOf, { n: series.gameIndex, m: maxGames })}
                  </span>
                )}
              </div>
              <span className={cn('truncate text-right text-sm font-black uppercase', mover === 2 ? 'text-brand-red-soft' : 'text-brand-red-soft/55')}>{nameOf(2)}</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span
                aria-live="polite"
                data-local-turn={mover}
                className={cn('max-w-[60%] shrink-0 truncate rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black', mover === 1 ? 'bg-brand-cyan' : 'bg-brand-red-soft')}
              >
                {fillLocal(copy.turnOf, { name: nameOf(mover) })}
              </span>
              {seconds !== null && (
                <div className="flex min-w-0 flex-1 items-center gap-2" data-grid-anchor="turn-timer">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className={cn('h-full rounded-full transition-[width] duration-200', ratio < 0.25 ? 'bg-brand-red' : 'bg-brand-yellow')} style={{ width: `${ratio * 100}%` }} />
                  </div>
                  <span className={cn('w-8 text-right text-lg font-black tabular-nums', ratio < 0.25 ? 'text-brand-red' : 'text-brand-yellow')}>{seconds}</span>
                </div>
              )}
            </div>
            <div className="mt-2.5 flex gap-2">
              <button type="button" disabled={pending || Boolean(game.endReason)} data-local-action="skip"
                onClick={() => { setFeedback(undefined); setNotice(null); applyGame(missLocalTurn(game)); }}
                className="h-10 flex-1 rounded-xl border-2 border-brand-red-soft/60 text-xs font-black uppercase tracking-wide text-brand-red-soft transition-colors hover:bg-brand-red-soft/10 disabled:opacity-35">
                {copy.skip}
              </button>
              <button type="button" disabled={pending || Boolean(game.endReason)} data-local-action="draw" onClick={() => setConfirmDraw(true)}
                className="h-10 flex-1 rounded-xl border-2 border-brand-orange/70 text-xs font-black uppercase tracking-wide text-brand-orange transition-colors hover:bg-brand-orange/10 disabled:opacity-35">
                {copy.endDraw}
              </button>
            </div>
            {settings.steals > 0 && (
              <p className="mt-2 text-center text-[11px] font-bold text-white/55" data-local-steals={game.stealsLeft[mover]}>
                {fillLocal(copy.stealsLeft, { n: game.stealsLeft[mover] })}
                {takeableCells && takeableCells.length > 0 && <span className="text-white/40"> · {fillLocal(copy.stealHint, { name: nameOf(otherSeat(mover)) })}</span>}
              </p>
            )}
          </div>
          {confirmDraw && (
            <div role="dialog" aria-label={copy.drawConfirm} className="mt-1 rounded-2xl border-2 border-brand-orange bg-brand-orange/10 p-3 text-center font-poppins">
              <p className="text-sm font-black uppercase tracking-wide text-brand-orange">{copy.drawConfirm}</p>
              <div className="mt-2.5 flex gap-2">
                <button type="button" data-local-action="draw-yes" disabled={pending} onClick={() => applyGame(agreeLocalDraw(game))} className="h-10 flex-1 rounded-xl bg-brand-green text-xs font-black uppercase text-white disabled:opacity-40">{copy.yes}</button>
                <button type="button" onClick={() => setConfirmDraw(false)} className="h-10 flex-1 rounded-xl border-2 border-white/15 text-xs font-black uppercase text-white/80">{copy.no}</button>
              </div>
            </div>
          )}
          <div className="mt-3" />
          <div className="relative">
            <MatchBoard
              state={state}
              selfUserId={SEAT_ID[1]}
              activeUserId={SEAT_ID[mover]}
              takeableCells={takeableCells}
              locale={locale}
              selectedCell={selectedCell}
              onSelect={selectCell}
            />
            {wonLine && <GridWinLine cells={wonLine.cells} tone={wonLine.seat === 1 ? 'self' : 'rival'} />}
          </div>
          {notice && <p role="status" data-local-notice className="mt-3 text-center font-poppins text-xs font-bold text-brand-yellow">{notice}</p>}
          {!game.endReason && <FootballGridTurnPanel
            // One panel per player: "type it instead" is that player's choice, not the next one's.
            key={mover}
            state={state}
            locale={locale}
            isMyTurn
            selectedCell={selectedCell}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit(answer, null); }}
            onCancel={() => { setSelectedCell(null); setAnswer(''); }}
            pending={pending}
            feedback={feedback}
            choice={settings.answers === 'choice' ? { options: cellOptions, onPick: (option) => { void submit(option.name, option); } } : undefined}
            prefersTyping={typing[mover]}
            onPrefersTypingChange={(value) => setTyping((current) => ({ ...current, [mover]: value }))}
            sheetNotice={feedback === 'ambiguous' ? gridCopy.ambiguous : null}
          />}
          <GridRulesPanel board={deal.board} locale={locale} />
        </div>
      </MiniGameShell>
      <AuctionLeaveControl ariaLabel={copy.back} onClick={backToSetup} />
    </>
  );
}

function SuspensionPicker({ copy, locale, title, body, onDone }: {
  copy: GridLocalCopy;
  locale: Locale;
  title: string;
  body: string;
  onDone: (picked: FootballGridOption[]) => void;
}) {
  const [roster, setRoster] = useState<GridTypeaheadPreparedPlayer[]>([]);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<FootballGridOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    void loadGridTypeaheadRoster().then((players) => { if (!cancelled) setRoster(players); });
    return () => { cancelled = true; };
  }, []);
  const results = useMemo(
    () => searchGridPlayers(roster, query, locale, 6).filter((player) => !picked.some((entry) => entry.playerId === player.id)),
    [locale, picked, query, roster],
  );
  const full = picked.length >= LOCAL_SUSPENSIONS;
  const shown = (player: { name: string; nameKa: string | null }) => (locale === 'ka' && player.nameKa ? player.nameKa : player.name);
  return (
    <>
      <header className="text-center">
        <h1 className="text-2xl font-black uppercase leading-tight">{title}</h1>
        <p className="mt-2 text-sm text-white/60">{body}</p>
      </header>
      <ul className="flex min-h-11 flex-wrap justify-center gap-1.5" data-local-suspended={picked.length}>
        {picked.map((player) => (
          <li key={player.playerId}>
            <button type="button" onClick={() => setPicked((current) => current.filter((entry) => entry.playerId !== player.playerId))}
              className="flex min-h-10 items-center gap-1.5 rounded-full bg-brand-red-soft/20 px-3 text-xs font-bold text-white">
              {shown(player)}<X className="size-3.5 text-white/60" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={full}
        placeholder={copy.suspendSearch}
        autoComplete="off"
        data-local-suspend-search
        className="h-12 w-full rounded-xl border-none bg-brand-blue px-3 text-base font-bold text-white outline-none placeholder:text-white/60 disabled:opacity-40"
      />
      {!full && results.length > 0 && (
        <ul className="overflow-hidden rounded-xl bg-white/[0.04]">
          {results.map((player) => (
            <li key={player.id}>
              <button type="button"
                onClick={() => { setPicked((current) => [...current, { playerId: player.id, name: player.nameEn, nameKa: player.nameKa, imageUrl: null }]); setQuery(''); }}
                className="flex w-full border-b border-white/5 px-3 py-3 text-left text-sm font-bold text-white last:border-b-0 hover:bg-white/5">
                {locale === 'ka' && player.nameKa ? player.nameKa : player.nameEn}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => onDone(picked)} data-local-action="suspend-done"
        className="mt-2 h-14 w-full rounded-2xl bg-brand-green text-base font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep">
        {picked.length === 0 ? copy.suspendSkip : copy.suspendDone}
      </button>
    </>
  );
}
