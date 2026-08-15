'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X as XIcon, Trophy, Bot, Handshake } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { ClubCrest, FlagChip } from './Badges';
import { GRID_CONFIGS, type GridAnswer, type GridConfig } from '../data/footballGrid';
import { matchesName } from '../lib/matching';
import { useMiniT } from '../lib/i18n';

const ANSWER_MS = 20_000;
const AI_SUCCESS = 0.72;
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

type Owner = 'you' | 'ai';
type Phase = 'idle' | 'pick' | 'answer' | 'ai' | 'over';

interface Claim {
  owner: Owner;
  player: string;
  pct: number;
}

interface Strike {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function lineWinner(board: (Owner | null)[]): { owner: Owner; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { owner: board[a] as Owner, line };
    }
  }
  return null;
}

/** Win-if-possible, block, center, corner, random — classic tic-tac-toe order. */
function pickAiCell(board: (Owner | null)[]): number {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  const finds = (owner: Owner) =>
    LINES.map((line) => {
      const owned = line.filter((i) => board[i] === owner).length;
      const free = line.filter((i) => board[i] === null);
      return owned === 2 && free.length === 1 ? free[0] : -1;
    }).find((i) => i >= 0);
  const winAt = finds('ai');
  if (winAt !== undefined && winAt >= 0) return winAt;
  const blockAt = finds('you');
  if (blockAt !== undefined && blockAt >= 0) return blockAt;
  if (board[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

/** AI names a popular answer — weighted toward the crowd favourite. */
function pickAiAnswer(answers: GridAnswer[]): GridAnswer {
  const total = answers.reduce((s, a) => s + a.pct, 0);
  let roll = Math.random() * total;
  for (const a of answers) {
    roll -= a.pct;
    if (roll <= 0) return a;
  }
  return answers[0];
}

const CONFETTI_COLORS = ['#FFE500', '#58CC02', '#1CB0F6', '#1645FF', '#FF9600'];

function ConfettiBurst() {
  // Deterministic pseudo-random spread — render must stay pure (no Math.random).
  const parts = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const rnd = (salt: number) => (((i + 1) * 2654435761 * (salt + 3)) % 1000) / 1000;
        return {
          x: (rnd(1) - 0.5) * 260,
          y: -(30 + rnd(2) * 150),
          rot: (rnd(3) - 0.5) * 300,
          dur: 0.7 + rnd(4) * 0.6,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 top-8 z-10 flex justify-center">
      {parts.map((p, i) => (
        <motion.span
          key={i}
          className="absolute h-2.5 w-1.5 rounded-[2px]"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rot }}
          transition={{ duration: p.dur, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export function FootballGrid({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const [gridIndex, setGridIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [board, setBoard] = useState<(Owner | null)[]>(Array(9).fill(null));
  const [claims, setClaims] = useState<Record<number, Claim>>({});
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<'wrong' | 'timeout' | null>(null);
  const [aiNote, setAiNote] = useState<'thinking' | 'missed' | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [strike, setStrike] = useState<Strike | null>(null);
  const [result, setResult] = useState<Owner | 'draw' | null>(null);
  const [remaining, setRemaining] = useState(ANSWER_MS);
  const deadlineRef = useRef(0);
  const timers = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef(board);
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const grid: GridConfig = GRID_CONFIGS[gridIndex % GRID_CONFIGS.length];
  const yourCells = board.filter((c) => c === 'you').length;
  const aiCells = board.filter((c) => c === 'ai').length;

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  // Measure the winning cells and lay the strike line across them.
  useEffect(() => {
    if (!winLine) {
      setStrike(null);
      return;
    }
    const wrap = gridWrapRef.current;
    const first = cellRefs.current[winLine[0]];
    const last = cellRefs.current[winLine[2]];
    if (!wrap || !first || !last) return;
    const wr = wrap.getBoundingClientRect();
    const fr = first.getBoundingClientRect();
    const lr = last.getBoundingClientRect();
    const x1 = fr.left + fr.width / 2 - wr.left;
    const y1 = fr.top + fr.height / 2 - wr.top;
    const x2 = lr.left + lr.width / 2 - wr.left;
    const y2 = lr.top + lr.height / 2 - wr.top;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ext = Math.min(fr.width, fr.height) * 0.42;
    setStrike({
      x1: x1 - (dx / len) * ext,
      y1: y1 - (dy / len) * ext,
      x2: x2 + (dx / len) * ext,
      y2: y2 + (dy / len) * ext,
    });
  }, [winLine]);

  // Answer countdown.
  useEffect(() => {
    if (phase !== 'answer') return;
    const id = window.setInterval(() => {
      const left = deadlineRef.current - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(id);
        setFlash('timeout');
        later(() => {
          setFlash(null);
          setActiveCell(null);
          startAiTurn();
        }, 1100);
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeCell]);

  const start = () => {
    setBoard(Array(9).fill(null));
    setClaims({});
    setActiveCell(null);
    setInput('');
    setFlash(null);
    setAiNote(null);
    setWinLine(null);
    setStrike(null);
    setResult(null);
    setPhase('pick');
  };

  const settle = (nextBoard: (Owner | null)[]): boolean => {
    const win = lineWinner(nextBoard);
    if (win) {
      setWinLine(win.line);
      setResult(win.owner);
      setPhase('over');
      return true;
    }
    if (nextBoard.every((c) => c !== null)) {
      const you = nextBoard.filter((c) => c === 'you').length;
      const ai = nextBoard.filter((c) => c === 'ai').length;
      setResult(you > ai ? 'you' : ai > you ? 'ai' : 'draw');
      setPhase('over');
      return true;
    }
    return false;
  };

  const startAiTurn = () => {
    setPhase('ai');
    setAiNote('thinking');
    later(() => {
      const prev = boardRef.current;
      const cell = pickAiCell(prev);
      if (Math.random() < AI_SUCCESS) {
        const row = Math.floor(cell / 3);
        const col = cell % 3;
        const answer = pickAiAnswer(grid.cells[row][col]);
        const next = [...prev];
        next[cell] = 'ai';
        setBoard(next);
        setClaims((c) => ({ ...c, [cell]: { owner: 'ai', player: answer.name, pct: answer.pct } }));
        setAiNote(null);
        if (!settle(next)) setPhase('pick');
      } else {
        setAiNote('missed');
        later(() => {
          setAiNote(null);
          setPhase('pick');
        }, 1200);
      }
    }, 1400);
  };

  const pickCell = (i: number) => {
    if (phase !== 'pick' || board[i] !== null) return;
    setActiveCell(i);
    setInput('');
    deadlineRef.current = Date.now() + ANSWER_MS;
    setRemaining(ANSWER_MS);
    setPhase('answer');
    later(() => inputRef.current?.focus(), 50);
  };

  const submit = () => {
    if (phase !== 'answer' || activeCell === null || !input.trim()) return;
    const row = Math.floor(activeCell / 3);
    const col = activeCell % 3;
    const answers = grid.cells[row][col];
    const hit = answers.find((a) => matchesName(input, [a.name, ...a.accepted]).ok);
    if (hit) {
      const cell = activeCell;
      const next = [...boardRef.current];
      next[cell] = 'you';
      setBoard(next);
      setClaims((c) => ({ ...c, [cell]: { owner: 'you', player: hit.name, pct: hit.pct } }));
      setActiveCell(null);
      setInput('');
      if (!settle(next)) startAiTurn();
    } else {
      setFlash('wrong');
      later(() => {
        setFlash(null);
        setActiveCell(null);
        setInput('');
        startAiTurn();
      }, 1100);
    }
  };

  const passTurn = () => {
    if (phase !== 'answer') return;
    setActiveCell(null);
    setInput('');
    startAiTurn();
  };

  const nextGame = () => {
    setGridIndex((g) => g + 1);
    start();
  };

  const activeRow = activeCell !== null ? Math.floor(activeCell / 3) : null;
  const activeCol = activeCell !== null ? activeCell % 3 : null;
  const pctBar = remaining / ANSWER_MS;

  return (
    <MiniGameShell
      backHref={backHref}
      title={t('Football Tic Tac Toe')}
      subtitle={t('Claim cells with players — three in a row wins')}
      accent="#1CB0F6"
      headerRight={<StatPill label={t('You · AI')} value={`${yourCells} · ${aiCells}`} color="#1CB0F6" />}
    >
      {phase === 'idle' ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl">⚽</div>
          <div className="font-poppins text-xl font-black uppercase text-brand-cyan">{t('Football Tic Tac Toe')}</div>
          <p className="max-w-xs font-poppins text-sm font-semibold leading-snug text-white/60">
            {t('Pick a cell and name a player who played for that club AND that nation. The AI answers back — line up three to win.')}
          </p>
          <button type="button" onClick={start} className="h-14 w-full max-w-xs rounded-2xl bg-brand-cyan font-poppins text-lg font-black uppercase tracking-wide text-black">
            {t('Start match')}
          </button>
        </motion.div>
      ) : (
        <div className="mt-2 flex flex-1 flex-col">
          {/* Grid */}
          <div ref={gridWrapRef} className="relative">
            <div className="grid grid-cols-[44px_repeat(3,1fr)] gap-1.5">
              <div />
              {grid.nations.map((nation) => (
                <div key={nation} className="flex flex-col items-center gap-1 rounded-xl bg-brand-yellow py-1.5">
                  <FlagChip country={nation} width={26} height={17} />
                  <span className="font-poppins text-[9px] font-black uppercase tracking-wide text-black/80">{t(nation)}</span>
                </div>
              ))}
              {grid.clubs.map((club, row) => (
                <RowCells
                  key={club}
                  club={club}
                  row={row}
                  board={board}
                  claims={claims}
                  winLine={winLine}
                  activeCell={activeCell}
                  canPick={phase === 'pick'}
                  onPick={pickCell}
                  setCellRef={(i, el) => {
                    cellRefs.current[i] = el;
                  }}
                />
              ))}
            </div>
            {/* Winning strike line */}
            {strike && (
              <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
                <motion.line
                  x1={strike.x1}
                  y1={strike.y1}
                  x2={strike.x2}
                  y2={strike.y2}
                  stroke="#FFE500"
                  strokeWidth={6}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(255,229,0,0.75))' }}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.55, delay: 0.15, ease: 'easeOut' }}
                />
              </svg>
            )}
          </div>

          {/* Turn / answer panel */}
          <div className="mt-3 flex-1">
            <AnimatePresence mode="wait">
              {phase === 'pick' && (
                <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl bg-brand-blue/15 p-3 text-center">
                  <span className="font-poppins text-sm font-black uppercase tracking-wide text-white">{t('Your turn — pick a cell')}</span>
                </motion.div>
              )}

              {phase === 'answer' && activeRow !== null && activeCol !== null && (
                <motion.div
                  key={`answer-${activeCell}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-2xl border-2 p-3 ${flash ? 'border-brand-red bg-brand-red/10' : 'border-brand-blue/60 bg-brand-blue/[0.08]'}`}
                >
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <ClubCrest club={grid.clubs[activeRow]} size={22} />
                    <span className="font-poppins text-xs font-black uppercase text-white/80">{grid.clubs[activeRow]}</span>
                    <span className="font-poppins text-xs font-black text-white/35">×</span>
                    <FlagChip country={grid.nations[activeCol]} width={22} height={15} />
                    <span className="font-poppins text-xs font-black uppercase text-white/80">{t(grid.nations[activeCol])}</span>
                  </div>
                  <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full transition-[width] duration-100 ${pctBar < 0.25 ? 'bg-brand-red' : 'bg-brand-cyan'}`} style={{ width: `${pctBar * 100}%` }} />
                  </div>
                  {flash ? (
                    <div className="py-1.5 text-center font-poppins text-sm font-black uppercase text-brand-red">
                      {flash === 'wrong' ? t('Not a match — turn passes') : t("Time's up — turn passes")}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submit()}
                        placeholder={t('Name a player…')}
                        className="h-12 min-w-0 flex-1 rounded-xl border-none bg-brand-blue px-4 text-center text-lg font-bold text-white placeholder:text-white/60 focus-visible:ring-0"
                      />
                      <button
                        type="button"
                        onClick={submit}
                        disabled={!input.trim()}
                        className="h-12 rounded-xl bg-brand-green px-5 font-poppins font-black uppercase text-white transition-colors hover:bg-brand-green-deep disabled:opacity-50"
                      >
                        {t('Go')}
                      </button>
                      <button
                        type="button"
                        onClick={passTurn}
                        aria-label={t('Pass')}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-white/10 text-white/40 hover:text-white/70"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {phase === 'ai' && (
                <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border-2 border-brand-red-soft/30 bg-brand-red-soft/[0.06] p-3 text-center">
                  <span className="font-poppins text-sm font-black uppercase tracking-wide text-brand-red-soft">
                    {aiNote === 'missed' ? t('AI blanked — your turn!') : t('AI is thinking…')}
                  </span>
                </motion.div>
              )}

              {phase === 'over' && (
                <motion.div
                  key="over"
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: winLine ? 0.75 : 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                  className={`relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border-2 p-5 text-center ${
                    result === 'you'
                      ? 'border-brand-yellow/60 bg-gradient-to-b from-brand-yellow/[0.12] to-transparent'
                      : result === 'ai'
                        ? 'border-brand-red-soft/40 bg-gradient-to-b from-brand-red-soft/[0.08] to-transparent'
                        : 'border-white/15 bg-white/[0.04]'
                  }`}
                >
                  {result === 'you' && <ConfettiBurst />}
                  <motion.div
                    initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ delay: winLine ? 0.9 : 0.2, type: 'spring', stiffness: 300, damping: 14 }}
                    className={`flex size-14 items-center justify-center rounded-full border-2 ${
                      result === 'you' ? 'border-brand-yellow bg-brand-yellow/15' : result === 'ai' ? 'border-brand-red-soft bg-brand-red-soft/10' : 'border-white/20 bg-white/[0.06]'
                    }`}
                  >
                    {result === 'you' ? (
                      <Trophy className="size-7 text-brand-yellow" />
                    ) : result === 'ai' ? (
                      <Bot className="size-7 text-brand-red-soft" />
                    ) : (
                      <Handshake className="size-7 text-white/60" />
                    )}
                  </motion.div>
                  <div className={`font-poppins text-2xl font-black uppercase ${result === 'you' ? 'text-brand-green-light' : result === 'ai' ? 'text-brand-red' : 'text-white/70'}`}>
                    {result === 'you' ? t('You win!') : result === 'ai' ? t('AI wins') : t('Draw')}
                  </div>
                  <p className="font-poppins text-xs font-semibold text-white/50">
                    {winLine ? t('Three in a row!') : t('Board full — {a} cells vs {b}', { a: yourCells, b: aiCells })}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-brand-blue/20 px-3 py-1 font-poppins text-[11px] font-black tabular-nums text-brand-cyan">
                      {t('You')} {yourCells}
                    </span>
                    <span className="rounded-full bg-brand-red-soft/15 px-3 py-1 font-poppins text-[11px] font-black tabular-nums text-brand-red-soft">
                      AI {aiCells}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={nextGame}
                    className="mt-2 w-full rounded-xl bg-brand-blue py-3 font-poppins text-base font-black uppercase text-white transition-opacity hover:opacity-90"
                  >
                    {t('New grid')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </MiniGameShell>
  );
}

function RowCells({
  club, row, board, claims, winLine, activeCell, canPick, onPick, setCellRef,
}: {
  club: string;
  row: number;
  board: (Owner | null)[];
  claims: Record<number, Claim>;
  winLine: number[] | null;
  activeCell: number | null;
  canPick: boolean;
  onPick: (i: number) => void;
  setCellRef: (i: number, el: HTMLButtonElement | null) => void;
}) {
  const t = useMiniT();
  return (
    <>
      <div className="flex items-center justify-center rounded-xl bg-brand-blue">
        <ClubCrest club={club} size={26} />
      </div>
      {[0, 1, 2].map((col) => {
        const i = row * 3 + col;
        const owner = board[i];
        const claim = claims[i];
        const inWin = winLine?.includes(i) ?? false;
        const isActive = activeCell === i;
        return (
          <motion.button
            key={i}
            ref={(el) => setCellRef(i, el)}
            type="button"
            disabled={!canPick || owner !== null}
            onClick={() => onPick(i)}
            animate={inWin ? { scale: [1, 1.04, 1] } : {}}
            transition={inWin ? { repeat: Infinity, duration: 1.4 } : {}}
            className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-1 text-center transition-colors ${
              inWin
                ? 'border-brand-yellow bg-brand-yellow/15'
                : isActive
                  ? 'border-brand-cyan bg-brand-cyan/15'
                  : owner === 'you'
                    ? 'border-brand-cyan bg-brand-cyan/20'
                    : owner === 'ai'
                      ? 'border-brand-red-soft bg-brand-red-soft/15'
                      : canPick
                        ? 'border-white/10 bg-white/[0.03] hover:border-brand-cyan/50'
                        : 'border-white/10 bg-white/[0.02] opacity-60'
            }`}
          >
            {claim ? (
              <motion.div
                key={claim.player}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                className="flex flex-col items-center gap-0.5"
              >
                <span className={`font-poppins text-[10px] font-black leading-tight ${inWin ? 'text-brand-yellow' : owner === 'you' ? 'text-brand-cyan' : 'text-brand-red-soft'}`}>
                  {claim.player}
                </span>
                <span className="font-poppins text-[8px] font-bold text-white/40">{t('{pct}%', { pct: claim.pct })}</span>
              </motion.div>
            ) : (
              <span className="font-poppins text-lg font-black text-white/15">·</span>
            )}
            {claim && (
              <motion.span
                key={`ring-${claim.player}`}
                className="pointer-events-none absolute inset-0 rounded-xl border-2"
                style={{ borderColor: owner === 'you' ? '#1CB0F6' : '#FF4B4B' }}
                initial={{ opacity: 0.9, scale: 1 }}
                animate={{ opacity: 0, scale: 1.22 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
              />
            )}
          </motion.button>
        );
      })}
    </>
  );
}
