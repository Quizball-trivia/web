'use client';

/**
 * Local driver for the Live Show prototype: the whole night (creator → lobby → stages with cuts → final → champion)
 * against a simulated crowd, on a virtual clock that can be sped up, paused or skipped. Phase 2 replaces this with
 * the server feed; the screens only read the `ShowState` it produces.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { finalSizeOf, keepCount, minesTally, scoreAnswer, windowMs } from './show.rules';
import {
  applyCut, applyQuestion, boardOf, botAnswer, knockOutYou, makeCrowd, playStageInstantly, YOU_ID, type BoardRow, type SimPlayer,
} from './show.sim';
import type { ShowAnswer, ShowPack, ShowQuestion } from './show.types';

export type ShowScreen =
  | { kind: 'creator' }
  | { kind: 'lobby'; openedAt: number; closesAt: number }
  | { kind: 'stage_intro'; stage: number; until: number }
  | { kind: 'question'; stage: number; q: number; shownAt: number; startsAt: number; deadline: number }
  | { kind: 'reveal'; stage: number; q: number; until: number }
  | { kind: 'stage_result'; stage: number; until: number; keep: number; board: BoardRow[] }
  | { kind: 'champion'; board: BoardRow[] };

export interface ShowSettings {
  title: string;
  joinMinutes: number;
  georgiaOnly: boolean;
}

export interface RevealStats {
  /** Choice kinds: share of answering players per option id (0..1). */
  shares: Record<string, number>;
  answered: number;
  correctShare: number;
  /** Sliders: every guess, for the spread chart. */
  values: number[];
  /** Mines: average fits found and the share that hit a mine. */
  minesFoundAvg: number;
  minesHitShare: number;
}

export interface ShowState {
  pack: ShowPack;
  settings: ShowSettings;
  screen: ShowScreen;
  now: number;
  paused: boolean;
  speed: number;
  fieldSize: number;
  players: SimPlayer[];
  you: SimPlayer;
  youAlive: boolean;
  /** Your submitted answer for the current question. */
  yourAnswer: ShowAnswer | null;
  /** Your result for the question just revealed. */
  yourResult: { points: number; correct: boolean } | null;
  reveal: RevealStats | null;
  answeredCount: number;
  aliveCount: number;
  board: BoardRow[];
  stage: ShowPack['stages'][number] | null;
  question: ShowQuestion | null;
}

const TICK_MS = 100;
const STAGE_INTRO_MS = 3_200;
const REVEAL_MS = 5_000;
const STAGE_RESULT_MS = 9_000;

function readMs(q: ShowQuestion): number {
  return q.kind === 'zoom_out' || q.kind === 'evolution' ? 1_200 : 2_500;
}

interface Model {
  players: SimPlayer[];
  /** Bot + your answers for the open question. */
  answers: Map<string, ShowAnswer | null>;
  yourAnswer: ShowAnswer | null;
  yourResult: { points: number; correct: boolean } | null;
  reveal: RevealStats | null;
  keepYouIn: boolean;
}

function revealStatsOf(q: ShowQuestion, answers: Map<string, ShowAnswer | null>): RevealStats {
  const given = [...answers.values()].filter((a): a is ShowAnswer => a != null);
  const shares: Record<string, number> = {};
  let correct = 0;
  const values: number[] = [];
  let found = 0;
  let hit = 0;
  for (const a of given) {
    const s = scoreAnswer(q, a);
    if (s.correct) correct += 1;
    if (a.kind === 'choice' || a.kind === 'reveal_choice') shares[a.optionId] = (shares[a.optionId] ?? 0) + 1;
    if (a.kind === 'slider') values.push(a.value);
    if (a.kind === 'mines' && q.kind === 'mines') {
      const tally = minesTally(q.fits, a.picked);
      found += tally.found;
      if (tally.mines > 0) hit += 1;
    }
  }
  const n = Math.max(1, given.length);
  for (const k of Object.keys(shares)) shares[k] = shares[k]! / n;
  return {
    shares,
    answered: given.length,
    correctShare: correct / n,
    values,
    minesFoundAvg: found / n,
    minesHitShare: hit / n,
  };
}

const CREATOR: ShowScreen = { kind: 'creator' };

function isDue(s: ShowScreen, now: number): boolean {
  switch (s.kind) {
    case 'lobby':
      return now >= s.closesAt;
    case 'question':
      return now >= s.deadline;
    case 'stage_intro':
    case 'reveal':
    case 'stage_result':
      return now >= s.until;
    default:
      return false;
  }
}

function freshModel(crowd: number, youName: string, keepYouIn: boolean): Model {
  return { players: makeCrowd(crowd, youName), answers: new Map(), yourAnswer: null, yourResult: null, reveal: null, keepYouIn };
}

interface Snapshot {
  players: SimPlayer[];
  yourAnswer: ShowAnswer | null;
  yourResult: { points: number; correct: boolean } | null;
  reveal: RevealStats | null;
  keepYouIn: boolean;
  /** When each bot answered the open question, for the live "answered" counter. */
  answerTimes: number[];
}

function snapshotOf(m: Model): Snapshot {
  const answerTimes: number[] = [];
  for (const [id, a] of m.answers) if (a && id !== YOU_ID) answerTimes.push(a.elapsedMs);
  return {
    players: m.players.map((p) => ({ ...p })),
    yourAnswer: m.yourAnswer,
    yourResult: m.yourResult,
    reveal: m.reveal,
    keepYouIn: m.keepYouIn,
    answerTimes,
  };
}

export function useShowSim(pack: ShowPack, opts: { crowd?: number; youName?: string } = {}) {
  const crowd = opts.crowd ?? 300;
  const youName = opts.youName ?? 'You';
  const finalSize = finalSizeOf(pack.stages);

  const [initial] = useState<Model>(() => freshModel(crowd, youName, false));
  const model = useRef<Model>(initial);
  const [snap, setSnap] = useState<Snapshot>(() => snapshotOf(initial));
  const screenRef = useRef<ShowScreen>(CREATOR);
  const [screen, setScreenState] = useState<ShowScreen>(CREATOR);
  const setScreen = useCallback((next: ShowScreen) => {
    screenRef.current = next;
    setScreenState(next);
  }, []);
  const [settings, setSettings] = useState<ShowSettings>({ title: 'Orshabatoba Live', joinMinutes: 10, georgiaOnly: false });
  const [now, setNow] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  /** Copies the mutable model into render state; every mutation ends with this. */
  const bump = useCallback(() => setSnap(snapshotOf(model.current)), []);

  const clock = useRef(0);

  const openQuestion = useCallback((stage: number, q: number, at: number) => {
    const question = pack.stages[stage]!.questions[q]!;
    const m = model.current;
    m.answers = new Map();
    for (const p of m.players) {
      if (p.alive && p.id !== YOU_ID) m.answers.set(p.id, botAnswer(p, question));
    }
    m.yourAnswer = null;
    m.yourResult = null;
    m.reveal = null;
    const startsAt = at + readMs(question);
    setScreen({ kind: 'question', stage, q, shownAt: at, startsAt, deadline: startsAt + windowMs(question) });
  }, [pack, setScreen]);

  const closeQuestion = useCallback((stage: number, q: number, at: number) => {
    const def = pack.stages[stage]!;
    const question = def.questions[q]!;
    const m = model.current;
    if (m.players.some((p) => p.id === YOU_ID && p.alive)) m.answers.set(YOU_ID, m.yourAnswer);
    m.yourResult = applyQuestion(m.players, question, m.answers, def.final === true);
    m.reveal = revealStatsOf(question, m.answers);
    setScreen({ kind: 'reveal', stage, q, until: at + REVEAL_MS });
  }, [pack, setScreen]);

  const finishStage = useCallback((stage: number, at: number) => {
    const def = pack.stages[stage]!;
    const m = model.current;
    if (def.final) {
      setScreen({ kind: 'champion', board: boardOf(m.players, true) });
      return;
    }
    const keep = keepCount(def, m.players.filter((p) => p.alive).length, finalSize);
    const board = applyCut(m.players, keep, stage, m.keepYouIn ? 'keep' : 'auto');
    setScreen({ kind: 'stage_result', stage, until: at + STAGE_RESULT_MS, keep, board });
  }, [pack, finalSize, setScreen]);

  /** Moves on from `from`; a no-op when the screen already changed (a tick and a skip can race). */
  const advance = useCallback((from: ShowScreen, at: number) => {
    if (screenRef.current !== from) return;
    switch (from.kind) {
      case 'lobby':
        setScreen({ kind: 'stage_intro', stage: 0, until: at + STAGE_INTRO_MS });
        break;
      case 'stage_intro':
        openQuestion(from.stage, 0, at);
        break;
      case 'question':
        closeQuestion(from.stage, from.q, at);
        break;
      case 'reveal': {
        const def = pack.stages[from.stage]!;
        if (from.q + 1 < def.questions.length) openQuestion(from.stage, from.q + 1, at);
        else finishStage(from.stage, at);
        break;
      }
      case 'stage_result':
        if (from.stage + 1 < pack.stages.length) {
          setScreen({ kind: 'stage_intro', stage: from.stage + 1, until: at + STAGE_INTRO_MS });
        }
        break;
      default:
        break;
    }
    bump();
  }, [pack, openQuestion, closeQuestion, finishStage, setScreen, bump]);

  // Virtual clock: advances TICK_MS × speed per real tick unless paused, and moves on when a step is due.
  const advanceRef = useRef(advance);
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      clock.current += TICK_MS * speed;
      setNow(clock.current);
      const current = screenRef.current;
      if (isDue(current, clock.current)) advanceRef.current(current, clock.current);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [paused, speed]);

  const create = useCallback((next: ShowSettings) => {
    setSettings(next);
    setScreen({ kind: 'lobby', openedAt: clock.current, closesAt: clock.current + next.joinMinutes * 60_000 });
  }, [setScreen]);

  const startNow = useCallback(() => {
    const current = screenRef.current;
    if (current.kind === 'lobby') advance(current, clock.current);
  }, [advance]);

  const skip = useCallback(() => {
    const current = screenRef.current;
    if (current.kind === 'question') {
      // Jump the clock to the deadline so the reveal shows the full countdown spent.
      clock.current = Math.max(clock.current, current.deadline);
      setNow(clock.current);
      return;
    }
    advance(current, clock.current);
  }, [advance]);

  const answer = useCallback((a: ShowAnswer) => {
    const m = model.current;
    const current = screenRef.current;
    if (current.kind !== 'question' || m.yourAnswer) return;
    const you = m.players.find((p) => p.id === YOU_ID);
    if (!you?.alive || clock.current < current.startsAt || clock.current >= current.deadline) return;
    m.yourAnswer = a;
    bump();
  }, [bump]);

  const restart = useCallback(() => {
    model.current = freshModel(crowd, youName, model.current.keepYouIn);
    clock.current = 0;
    setNow(0);
    setScreen(CREATOR);
    bump();
  }, [crowd, youName, setScreen, bump]);

  /** Dev: play every earlier stage instantly (you answer like a decent player) and open `stage`. */
  const jumpToStage = useCallback((stage: number, opts2: { asSpectator?: boolean } = {}) => {
    const m = model.current;
    m.players = makeCrowd(crowd, youName);
    if (opts2.asSpectator && stage === 0) knockOutYou(m.players);
    for (let s = 0; s < stage; s += 1) {
      const def = pack.stages[s]!;
      playStageInstantly(m.players, def.questions, false);
      const keep = keepCount(def, m.players.filter((p) => p.alive).length, finalSize);
      applyCut(m.players, keep, s, opts2.asSpectator ? 'cut' : 'keep');
    }
    setScreen({ kind: 'stage_intro', stage, until: clock.current + STAGE_INTRO_MS });
    bump();
  }, [pack, crowd, youName, finalSize, setScreen, bump]);

  const setKeepYouIn = useCallback((v: boolean) => {
    model.current.keepYouIn = v;
    bump();
  }, [bump]);

  const you = snap.players.find((p) => p.id === YOU_ID)!;
  const stageIndex = 'stage' in screen ? screen.stage : null;
  const stage = stageIndex != null ? pack.stages[stageIndex] ?? null : null;
  const question = (screen.kind === 'question' || screen.kind === 'reveal') && stage
    ? stage.questions[screen.q] ?? null
    : null;

  let answeredCount = 0;
  if (screen.kind === 'question') {
    const elapsed = now - screen.startsAt;
    answeredCount = (snap.yourAnswer ? 1 : 0) + snap.answerTimes.filter((ms) => ms <= elapsed).length;
  }

  const finalStage = stage?.final === true;
  const board = useMemo(() => boardOf(snap.players, finalStage), [snap.players, finalStage]);

  const state: ShowState = {
    pack,
    settings,
    screen,
    now,
    paused,
    speed,
    fieldSize: crowd + 1,
    players: snap.players,
    you,
    youAlive: you.alive,
    yourAnswer: snap.yourAnswer,
    yourResult: snap.yourResult,
    reveal: snap.reveal,
    answeredCount,
    aliveCount: snap.players.filter((p) => p.alive).length,
    board,
    stage,
    question,
  };

  return {
    state,
    keepYouIn: snap.keepYouIn,
    create,
    startNow,
    answer,
    skip,
    restart,
    jumpToStage,
    setPaused,
    setSpeed,
    setKeepYouIn,
  };
}
