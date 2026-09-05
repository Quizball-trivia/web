'use client';

/**
 * Table Derby — frontend prototype of the online show adaptation.
 * Flow: home → matchmaking (mock) → showdown → rock-paper-scissors →
 * Round 1 "ჩამოთვალე" vs a scripted opponent. Georgian-only UI.
 * The round logic mirrors what the server state machine will own later.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { matchesName } from '@/features/mini-games/lib/matching';
import { TD, OPPONENT_NAMES } from './lib/copy';
import { TD_LIST_CATEGORIES, type TdListCategory } from './data/categories';
import {
  TD_DISPLAY,
  BetssonWordmark,
  TdLogoSticker,
  RoundIconsRow,
  MuralBackdrop,
  BoltGlyph,
  StarburstGlyph,
  PERF_DOTS,
} from './components/brand';
import { CategoryBand, PlayerBoard, ScorePill, TurnTimerBar } from './components/chrome';

type Phase = 'home' | 'matchmaking' | 'showdown' | 'rps' | 'category' | 'play' | 'roundEnd' | 'matchEnd';
type Seat = 'me' | 'op';
type RpsPick = 'rock' | 'paper' | 'scissors';

const TURN_MS = 10_000;
const LIVES = 3;

interface RoundState {
  categoryIdx: number;
  usedCategoryIdxs: number[];
  found: { display: string; by: Seat }[];
  lives: Record<Seat, number>;
  count: Record<Seat, number>;
  turn: Seat;
  turnNo: number;
}

interface Flash {
  key: number;
  kind: 'correct' | 'wrong' | 'duplicate' | 'timeUp' | 'pool';
}

const RPS_META: Record<RpsPick, { label: string; glyph: string; beats: RpsPick }> = {
  rock: { label: TD.rpsRock, glyph: '✊', beats: 'scissors' },
  paper: { label: TD.rpsPaper, glyph: '✋', beats: 'rock' },
  scissors: { label: TD.rpsScissors, glyph: '✌️', beats: 'paper' },
};

function categoryAt(idx: number): TdListCategory {
  return TD_LIST_CATEGORIES[idx % TD_LIST_CATEGORIES.length];
}

export function TableDerbyApp() {
  const [phase, setPhase] = useState<Phase>('home');
  const [opponentName, setOpponentName] = useState<string>(OPPONENT_NAMES[0]);
  const [roundsWon, setRoundsWon] = useState<Record<Seat, number>>({ me: 0, op: 0 });
  const [roundWinner, setRoundWinner] = useState<Seat | null>(null);
  const [round, setRound] = useState<RoundState | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [input, setInput] = useState('');

  // RPS
  const [myPick, setMyPick] = useState<RpsPick | null>(null);
  const [opPick, setOpPick] = useState<RpsPick | null>(null);
  const [rpsResult, setRpsResult] = useState<'me' | 'op' | 'tie' | null>(null);

  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeouts.current.push(t);
  }, []);
  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  const category = round ? categoryAt(round.categoryIdx) : null;
  const remaining = useMemo(() => {
    if (!round || !category) return [];
    const found = new Set(round.found.map((f) => f.display));
    return category.answers.filter((a) => !found.has(a.display));
  }, [round, category]);

  /* ── flow: home → matchmaking → showdown → rps ──────────────── */

  const startMatch = () => {
    setOpponentName(OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)]);
    setRoundsWon({ me: 0, op: 0 });
    setRoundWinner(null);
    setPhase('matchmaking');
    later(() => setPhase('showdown'), 2800);
    later(() => setPhase('rps'), 5400);
  };

  const beginRound = useCallback(
    (starter: Seat) => {
      const firstIdx = Math.floor(Math.random() * TD_LIST_CATEGORIES.length);
      setRound({
        categoryIdx: firstIdx,
        usedCategoryIdxs: [firstIdx],
        found: [],
        lives: { me: LIVES, op: LIVES },
        count: { me: 0, op: 0 },
        turn: starter,
        turnNo: 1,
      });
      setInput('');
      setPhase('category');
      later(() => setPhase('play'), 3000);
    },
    [later],
  );

  const pickRps = (mine: RpsPick) => {
    if (myPick) return;
    setMyPick(mine);
    const theirs: RpsPick = (['rock', 'paper', 'scissors'] as const)[Math.floor(Math.random() * 3)];
    later(() => {
      setOpPick(theirs);
      const result = mine === theirs ? 'tie' : RPS_META[mine].beats === theirs ? 'me' : 'op';
      setRpsResult(result);
      if (result === 'tie') {
        later(() => {
          setMyPick(null);
          setOpPick(null);
          setRpsResult(null);
        }, 1500);
      } else {
        later(() => {
          setMyPick(null);
          setOpPick(null);
          setRpsResult(null);
          beginRound(result);
        }, 1800);
      }
    }, 800);
  };

  /* ── round engine ───────────────────────────────────────────── */

  const doFlash = useCallback((kind: Flash['kind']) => {
    setFlash({ key: Date.now(), kind });
  }, []);

  const endRound = useCallback(
    (winner: Seat) => {
      setRoundWinner(winner);
      setRoundsWon((s) => ({ ...s, [winner]: s[winner] + 1 }));
      later(() => setPhase('roundEnd'), 1100);
    },
    [later],
  );

  const swapCategory = useCallback(() => {
    doFlash('pool');
    later(() => {
      setRound((r) => {
        if (!r) return r;
        const unused = TD_LIST_CATEGORIES.map((_, i) => i).filter((i) => !r.usedCategoryIdxs.includes(i));
        const nextIdx = unused.length > 0 ? unused[Math.floor(Math.random() * unused.length)] : Math.floor(Math.random() * TD_LIST_CATEGORIES.length);
        return {
          ...r,
          categoryIdx: nextIdx,
          usedCategoryIdxs: [...r.usedCategoryIdxs, nextIdx],
          found: [],
          // Owner ruling: exhausted pool = tie → fresh category; lives reset
          // (SPEC assumption), correct-counts keep accumulating.
          lives: { me: LIVES, op: LIVES },
          turnNo: r.turnNo + 1,
        };
      });
      setPhase('category');
      later(() => setPhase('play'), 2600);
    }, 1400);
  }, [doFlash, later]);

  const applyCorrect = useCallback(
    (seat: Seat, display: string) => {
      let exhausted = false;
      setRound((r) => {
        if (!r) return r;
        const found = [...r.found, { display, by: seat }];
        exhausted = found.length >= categoryAt(r.categoryIdx).answers.length;
        return {
          ...r,
          found,
          count: { ...r.count, [seat]: r.count[seat] + 1 },
          turn: seat === 'me' ? 'op' : 'me',
          turnNo: r.turnNo + 1,
        };
      });
      if (seat === 'me') doFlash('correct');
      // setState is sync-queued; schedule the exhaustion check right after.
      later(() => {
        if (exhausted) swapCategory();
      }, 50);
    },
    [doFlash, later, swapCategory],
  );

  const applyMiss = useCallback(
    (seat: Seat, reason: 'wrong' | 'duplicate' | 'timeUp') => {
      let eliminated = false;
      setRound((r) => {
        if (!r) return r;
        const lives = { ...r.lives, [seat]: Math.max(0, r.lives[seat] - 1) };
        eliminated = lives[seat] === 0;
        return { ...r, lives, turn: seat === 'me' ? 'op' : 'me', turnNo: r.turnNo + 1 };
      });
      if (seat === 'me') doFlash(reason === 'wrong' ? 'wrong' : reason === 'duplicate' ? 'duplicate' : 'timeUp');
      later(() => {
        if (eliminated) endRound(seat === 'me' ? 'op' : 'me');
      }, 50);
    },
    [doFlash, endRound, later],
  );

  // Opponent (scripted): acts within the 10s window.
  useEffect(() => {
    if (phase !== 'play' || !round || round.turn !== 'op') return;
    if (roundWinner) return;
    const delay = 1600 + Math.random() * 3600;
    const t = setTimeout(() => {
      const pool = remaining;
      const successP = pool.length <= 2 ? 0.55 : 0.72;
      if (pool.length > 0 && Math.random() < successP) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        applyCorrect('op', pick.display);
      } else {
        applyMiss('op', 'wrong');
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by turnNo; `remaining` is derived from the same state snapshot
  }, [phase, round?.turn, round?.turnNo, roundWinner]);

  // My 10s turn clock.
  useEffect(() => {
    if (phase !== 'play' || !round || round.turn !== 'me') return;
    if (roundWinner) return;
    const t = setTimeout(() => applyMiss('me', 'timeUp'), TURN_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by turnNo
  }, [phase, round?.turn, round?.turnNo, roundWinner]);

  const submit = () => {
    if (!round || !category || round.turn !== 'me' || phase !== 'play') return;
    const value = input.trim();
    if (!value) return;
    setInput('');
    const foundSet = round.found.map((f) => f.display);
    // Duplicate = wrong in the show's rules — costs a life, own message.
    const dup = category.answers.some(
      (a) => foundSet.includes(a.display) && matchesName(value, a.aliases).ok,
    );
    if (dup) {
      applyMiss('me', 'duplicate');
      return;
    }
    const hit = remaining.find((a) => matchesName(value, a.aliases).ok);
    if (hit) applyCorrect('me', hit.display);
    else applyMiss('me', 'wrong');
  };

  const continueAfterRound = () => setPhase('matchEnd');

  const resetToHome = () => {
    setRound(null);
    setRoundWinner(null);
    setPhase('home');
  };

  /* ── screens ────────────────────────────────────────────────── */

  const flashText =
    flash?.kind === 'correct'
      ? TD.correct
      : flash?.kind === 'wrong'
        ? TD.wrong
        : flash?.kind === 'duplicate'
          ? TD.duplicate
          : flash?.kind === 'timeUp'
            ? TD.timeUp
            : flash?.kind === 'pool'
              ? TD.poolExhausted
              : null;

  return (
    <div className="td-theme relative min-h-dvh overflow-hidden" style={{ background: 'var(--td-bg)' }}>
      <MuralBackdrop dim={phase === 'home' ? 1 : 0.45} />

      {/* betsson.sport — persistent, top-right like the broadcast */}
      <div className="absolute right-4 top-4 z-20 md:right-8 md:top-6">
        <BetssonWordmark tone={phase === 'home' ? 'orange' : 'white'} size={16} />
      </div>

      <AnimatePresence mode="wait">
        {/* ── HOME ── */}
        {phase === 'home' && (
          <motion.main
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-7 px-6"
          >
            <TdLogoSticker variant="blackOnWhite" scale={1.15} />
            <div className="flex items-center gap-3">
              <RoundIconsRow size={30} color="var(--td-orange)" />
            </div>
            <p className="text-center text-[13px] text-white/75 md:text-sm" style={TD_DISPLAY}>
              {TD.tagline}
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={startMatch}
              className="relative overflow-hidden rounded-[14px] px-10 py-4 text-lg md:text-xl"
              style={{
                ...TD_DISPLAY,
                background: 'var(--td-orange)',
                color: '#0d0d0d',
                boxShadow: '6px 6px 0 #000',
                transform: 'rotate(-1.5deg)',
              }}
            >
              <span aria-hidden className="pointer-events-none absolute inset-0" style={PERF_DOTS} />
              <span className="relative">{TD.playCta}</span>
            </motion.button>
          </motion.main>
        )}

        {/* ── MATCHMAKING ── */}
        {phase === 'matchmaking' && (
          <motion.main
            key="mm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-8 px-6"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 6, -6, 0] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
            >
              <BoltGlyph size={90} />
            </motion.div>
            <div className="flex items-end gap-1.5">
              <span className="text-xl text-white md:text-2xl" style={TD_DISPLAY}>
                {TD.searching}
              </span>
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="text-xl text-white md:text-2xl"
                style={TD_DISPLAY}
              >
                ...
              </motion.span>
            </div>
          </motion.main>
        )}

        {/* ── SHOWDOWN ── */}
        {phase === 'showdown' && (
          <motion.main
            key="vs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-6"
          >
            <motion.div initial={{ x: -120, rotate: -6, opacity: 0 }} animate={{ x: 0, rotate: -3, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
              <div className="rounded-[10px] px-8 py-4" style={{ background: 'var(--td-paper)', boxShadow: '6px 6px 0 #000' }}>
                <span className="text-2xl md:text-3xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
                  {TD.you}
                </span>
              </div>
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35, type: 'spring', damping: 10 }}>
              <span
                className="block text-5xl md:text-6xl"
                style={{ ...TD_DISPLAY, color: 'var(--td-orange)', transform: 'rotate(-6deg)' }}
              >
                VS
              </span>
            </motion.div>
            <motion.div initial={{ x: 120, rotate: 6, opacity: 0 }} animate={{ x: 0, rotate: 2, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
              <div className="rounded-[10px] px-8 py-4" style={{ background: 'var(--td-paper)', boxShadow: '6px 6px 0 #000' }}>
                <span className="text-2xl md:text-3xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
                  {opponentName}
                </span>
              </div>
            </motion.div>
            <div
              className="mt-2 rounded-full px-4 py-1.5 text-[11px] md:text-xs"
              style={{ ...TD_DISPLAY, background: 'var(--td-white)', color: '#0d0d0d' }}
            >
              {TD.bestOfRounds}
            </div>
          </motion.main>
        )}

        {/* ── RPS ── */}
        {phase === 'rps' && (
          <motion.main
            key="rps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-7 px-6"
          >
            <h2 className="text-2xl text-white md:text-3xl" style={TD_DISPLAY}>
              {TD.rpsTitle}
            </h2>
            <div className="flex items-center gap-3 md:gap-4">
              {(Object.keys(RPS_META) as RpsPick[]).map((k) => (
                <motion.button
                  key={k}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => pickRps(k)}
                  disabled={!!myPick}
                  className="flex flex-col items-center gap-1.5 rounded-[16px] px-5 py-4 md:px-7 md:py-5"
                  style={{
                    background: myPick === k ? 'var(--td-orange)' : 'var(--td-charcoal)',
                    boxShadow: '5px 5px 0 #000',
                    opacity: myPick && myPick !== k ? 0.45 : 1,
                    transition: 'background 0.2s, opacity 0.2s',
                  }}
                >
                  <span className="text-3xl md:text-4xl" aria-hidden>
                    {RPS_META[k].glyph}
                  </span>
                  <span className="text-[11px] text-white md:text-xs" style={TD_DISPLAY}>
                    {RPS_META[k].label}
                  </span>
                </motion.button>
              ))}
            </div>
            <div className="flex h-16 items-center justify-center">
              <AnimatePresence>
                {opPick && (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-4"
                  >
                    <span className="text-4xl" aria-hidden>
                      {myPick ? RPS_META[myPick].glyph : ''}
                    </span>
                    <span className="text-lg text-white/60" style={TD_DISPLAY}>
                      —
                    </span>
                    <span className="text-4xl" aria-hidden>
                      {RPS_META[opPick].glyph}
                    </span>
                    <span
                      className="ml-2 rounded-[8px] px-3 py-1.5 text-sm"
                      style={{
                        ...TD_DISPLAY,
                        background: rpsResult === 'tie' ? 'var(--td-white)' : 'var(--td-orange)',
                        color: '#0d0d0d',
                      }}
                    >
                      {rpsResult === 'tie' ? TD.rpsTie : rpsResult === 'me' ? TD.rpsYouStart : TD.rpsOpponentStarts}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        )}

        {/* ── CATEGORY INTRO ── */}
        {phase === 'category' && category && (
          <motion.main
            key={`cat-${round?.usedCategoryIdxs.length ?? 0}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-4 md:px-10"
          >
            <div className="flex items-center gap-3">
              <StarburstGlyph size={20} />
              <span className="text-lg text-white md:text-xl" style={TD_DISPLAY}>
                {TD.roundLabel} 1 · {TD.round1Name}
              </span>
              <StarburstGlyph size={20} rotate={20} />
            </div>
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 16 }}
              className="w-full max-w-2xl"
            >
              <CategoryBand prompt={category.prompt} />
            </motion.div>
          </motion.main>
        )}

        {/* ── PLAY ── */}
        {phase === 'play' && round && category && (
          <motion.main
            key="play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-3 px-3 pb-4 pt-4 md:gap-4 md:px-6"
          >
            <div className="flex justify-center">
              <ScorePill
                roundsMe={roundsWon.me}
                roundsOp={roundsWon.op}
                inRoundMe={round.count.me}
                inRoundOp={round.count.op}
              />
            </div>
            <CategoryBand prompt={category.prompt} compact />

            <div className="flex flex-1 items-end gap-3 md:gap-5">
              <PlayerBoard
                name={TD.you}
                side="left"
                lives={round.lives.me}
                count={round.count.me}
                answers={round.found.filter((f) => f.by === 'me').map((f) => f.display)}
                active={round.turn === 'me'}
              />
              <PlayerBoard
                name={opponentName}
                side="right"
                lives={round.lives.op}
                count={round.count.op}
                answers={round.found.filter((f) => f.by === 'op').map((f) => f.display)}
                active={round.turn === 'op'}
                thinking={round.turn === 'op' ? TD.opponentTurn : undefined}
              />
            </div>

            <TurnTimerBar turnKey={`t-${round.turnNo}`} ms={TURN_MS} running={!roundWinner} />

            <div className="relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={round.turn !== 'me' || !!roundWinner}
                  placeholder={round.turn === 'me' ? TD.answerPlaceholder : TD.opponentTurn}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  className="h-12 min-w-0 flex-1 rounded-[10px] border-0 px-4 text-[15px] text-white outline-none placeholder:text-white/35 disabled:opacity-50"
                  style={{ background: 'var(--td-charcoal)', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)', fontFamily: "'Noto Sans Georgian', sans-serif", fontWeight: 600 }}
                />
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.95 }}
                  disabled={round.turn !== 'me' || !!roundWinner}
                  className="h-12 shrink-0 rounded-[10px] px-5 text-sm disabled:opacity-40"
                  style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
                >
                  {TD.submit}
                </motion.button>
              </form>
              <AnimatePresence>
                {flash && flashText && (
                  <motion.div
                    key={flash.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onAnimationComplete={() => later(() => setFlash((f) => (f?.key === flash.key ? null : f)), 1300)}
                    className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-[8px] px-3 py-1 text-[12px]"
                    style={{
                      ...TD_DISPLAY,
                      background: flash.kind === 'correct' ? 'var(--td-orange)' : flash.kind === 'pool' ? 'var(--td-white)' : 'var(--td-steel-deep)',
                      color: flash.kind === 'correct' || flash.kind === 'pool' ? '#0d0d0d' : 'var(--td-white)',
                      boxShadow: '3px 3px 0 rgba(0,0,0,0.5)',
                    }}
                  >
                    {flashText}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        )}

        {/* ── ROUND END ── */}
        {phase === 'roundEnd' && roundWinner && (
          <motion.main
            key="re"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-6"
          >
            <motion.div
              initial={{ scale: 0.7, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="rounded-[12px] px-10 py-6"
              style={{
                background: roundWinner === 'me' ? 'var(--td-orange)' : 'var(--td-steel-deep)',
                boxShadow: '7px 7px 0 #000',
              }}
            >
              <span
                className="text-3xl md:text-4xl"
                style={{ ...TD_DISPLAY, color: roundWinner === 'me' ? '#0d0d0d' : 'var(--td-white)' }}
              >
                {roundWinner === 'me' ? TD.roundWon : TD.roundLost}
              </span>
            </motion.div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70" style={TD_DISPLAY}>
                {TD.matchScore}
              </span>
              <span className="text-3xl text-white" style={TD_DISPLAY}>
                {roundsWon.me} - {roundsWon.op}
              </span>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={continueAfterRound}
              className="rounded-[12px] px-8 py-3.5"
              style={{ ...TD_DISPLAY, background: 'var(--td-white)', color: '#0d0d0d', boxShadow: '5px 5px 0 #000', fontSize: 15 }}
            >
              {TD.nextRoundsSoon}
            </motion.button>
          </motion.main>
        )}

        {/* ── MATCH END (prototype: only round 1 exists) ── */}
        {phase === 'matchEnd' && (
          <motion.main
            key="me"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-7 px-6"
          >
            <TdLogoSticker variant="whiteOnOrange" scale={0.9} tilt={-3} />
            <span className="text-4xl text-white" style={TD_DISPLAY}>
              {roundsWon.me} - {roundsWon.op}
            </span>
            <p className="text-center text-sm text-white/70" style={TD_DISPLAY}>
              {TD.nextRoundsSoon}
            </p>
            <div className="flex gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={startMatch}
                className="rounded-[12px] px-7 py-3.5 text-sm"
                style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '5px 5px 0 #000' }}
              >
                {TD.playAgain}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={resetToHome}
                className="rounded-[12px] px-7 py-3.5 text-sm"
                style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', color: 'var(--td-white)', boxShadow: '5px 5px 0 #000' }}
              >
                {TD.backHome}
              </motion.button>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
