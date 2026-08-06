'use client';

// Scripted driver for the REAL live-game UI (WlLiveFlowView): produces the
// same WlLiveState the socket hook produces, but from a local state machine —
// so /dev/wl can walk every live screen (questions of all five kinds, reveals,
// standings, elimination, break, game intro, champion) with zero backend.
//
// One UI, two drivers: iterate on the components here, and the real weekend
// league renders the same pixels.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  WlAnswerAck,
  WlBoardRow,
  WlDispatchEventPayload,
  WlRevealEventPayload,
} from '@/lib/realtime/socket.types';
import type { WlLiveScreen, WlLiveState } from './useWlLive';
import { wlLadder } from '../gauntlet/gauntlet.data';

export const SIM_SELF_ID = 'sim-you';

const BOT_NAMES = [
  'BOBBIGOL', 'Totti10', 'DAVE8', 'zaqoo', 'Irakli0407', 'Thenotorious',
  'gio_beqa', 'LashaK', 'Nika77', 'guram22', 'datola', 'saba_fc',
  'levan9', 'tazo10', 'anzori', 'beka_m', 'ilia21', 'sandro7',
  'giorgi_b', 'luka99', 'oto_gel', 'vato_z', 'demna4', 'rezi_k',
] as const;

// Derived from the shared ladder mirror so the sim can never drift from the
// real cut numbers.
const FIELD = 600;
const [SIM_A1, SIM_A2, SIM_A3] = wlLadder(FIELD);
const LADDER = [
  { index: 0, players: FIELD, advance: SIM_A1 },
  { index: 1, players: SIM_A1, advance: SIM_A2 },
  { index: 2, players: SIM_A2, advance: SIM_A3 },
] as const;

// Compressed pacing so the walkthrough flows; Skip jumps ahead any time.
const QUESTION_MS = 12_000;
const LEAD_MS = 2_600; // long enough to see the game-intro / round overlay
// Mid-round the question simply stays up with its verdict, so the "reveal"
// step is just the short gap before the next dispatch.
const REVEAL_MS = 1_800;
// Round boundaries get the server's breather so the standings beat can play.
const ROUND_END_REVEAL_MS = 6_000;
const RESULT_MS = 7_000;
const BREAK_MS = 14_000;

type I18n = { en: string; ka: string };
const i18n = (en: string, ka: string): I18n => ({ en, ka });

interface SimQuestion {
  kind: WlDispatchEventPayload['kind'];
  question: Record<string, unknown>;
  evaluation: Record<string, unknown>;
  points: number;
}

const QUESTIONS: SimQuestion[] = [
  {
    kind: 'true_false',
    question: { prompt: i18n('Zidane scored twice in the 1998 World Cup final.', 'ზიდანმა 1998 წლის მუნდიალის ფინალში ორი გოლი გაიტანა.') },
    evaluation: { correct_id: 'true' },
    points: 150,
  },
  {
    kind: 'higher_lower',
    question: {
      stat_label: i18n('Career goals', 'კარიერული გოლები'),
      left_name: i18n('Cristiano Ronaldo', 'კრიშტიანუ რონალდუ'),
      right_name: i18n('Lionel Messi', 'ლიონელ მესი'),
    },
    evaluation: { left_value: 895, right_value: 851 },
    points: 150,
  },
  {
    kind: 'mcq',
    question: {
      prompt: i18n('Which club has won the most Champions League titles?', 'რომელ კლუბს აქვს ყველაზე მეტი ჩემპიონთა ლიგის ტიტული?'),
      options: [
        { id: 'a', text: i18n('Real Madrid', 'რეალ მადრიდი') },
        { id: 'b', text: i18n('AC Milan', 'მილანი') },
        { id: 'c', text: i18n('Bayern Munich', 'ბავარია') },
        { id: 'd', text: i18n('Liverpool', 'ლივერპული') },
      ],
      image: null,
    },
    evaluation: { correct_id: 'a' },
    points: 200,
  },
  {
    kind: 'career_path',
    question: {
      clubs: [
        i18n('Sporting CP', 'სპორტინგი'),
        i18n('Man United', 'მან იუნაიტედი'),
        i18n('Real Madrid', 'რეალ მადრიდი'),
        i18n('Juventus', 'იუვენტუსი'),
        i18n('Chelsea', 'ჩელსი'),
      ],
    },
    evaluation: {
      display_answer: i18n('Cristiano Ronaldo', 'კრიშტიანუ რონალდუ'),
      accepted_answers: ['ronaldo', 'cristiano ronaldo', 'cristiano', 'რონალდუ'],
    },
    points: 250,
  },
  {
    kind: 'money_drop',
    question: {
      prompt: i18n('Which country won the 2022 World Cup?', 'რომელმა ქვეყანამ მოიგო 2022 წლის მუნდიალი?'),
      options: [
        { id: 'a', text: i18n('France', 'საფრანგეთი') },
        { id: 'b', text: i18n('Argentina', 'არგენტინა') },
        { id: 'c', text: i18n('Brazil', 'ბრაზილია') },
        { id: 'd', text: i18n('Germany', 'გერმანია') },
      ],
    },
    evaluation: { correct_id: 'b' },
    points: 300,
  },
];

/** Addressable screens for the playground picker. */
export type SimJumpTarget =
  | { kind: 'question'; round: number; skipIntro?: boolean }
  | { kind: 'reveal'; round: number }
  | { kind: 'game_result' }
  | { kind: 'break' }
  | { kind: 'final' };

type SimStep =
  | { kind: 'question'; game: number; round: number; ms: number }
  | { kind: 'reveal'; game: number; round: number; ms: number }
  | { kind: 'game_result'; game: number; ms: number }
  | { kind: 'break'; game: number; ms: number }
  | { kind: 'final'; ms: number };

function buildScript(): SimStep[] {
  const steps: SimStep[] = [];
  for (let g = 0; g < 3; g += 1) {
    for (let r = 0; r < QUESTIONS.length; r += 1) {
      steps.push({ kind: 'question', game: g, round: r, ms: QUESTION_MS });
      const lastOfRound = true; // one question per kind in the sim script
      steps.push({ kind: 'reveal', game: g, round: r, ms: lastOfRound ? ROUND_END_REVEAL_MS : REVEAL_MS });
    }
    steps.push({ kind: 'game_result', game: g, ms: RESULT_MS });
    if (g < 2) steps.push({ kind: 'break', game: g, ms: BREAK_MS });
  }
  steps.push({ kind: 'final', ms: Number.POSITIVE_INFINITY });
  return steps;
}

function normalize(v: string): string {
  return v.toLowerCase().trim().replace(/\s+/g, ' ');
}

function simBoard(game: number, round: number, myScore: number): WlBoardRow[] {
  // Deterministic drifting bot scores: stable per (game, round), no Math.random
  // so re-renders don't reshuffle the board.
  const rows: WlBoardRow[] = BOT_NAMES.map((name, i) => ({
    user_id: `sim-bot-${i}`,
    nickname: name,
    points: Math.max(0, Math.round((round + 1) * (170 - i * 6) + ((i * 37 + game * 91) % 60))),
    time_ms_total: 30_000 + i * 1_800,
    rank: 0,
  }));
  rows.push({ user_id: SIM_SELF_ID, nickname: 'You', points: myScore, time_ms_total: 28_000, rank: 0 });
  rows.sort((a, b) => b.points - a.points || a.time_ms_total - b.time_ms_total);
  return rows.slice(0, 24).map((r, i) => ({ ...r, rank: i + 1 }));
}

function dispatchFor(game: number, round: number, now: number): WlDispatchEventPayload {
  const q = QUESTIONS[round];
  return {
    tournamentId: 'simulated',
    seq: game * 100 + round,
    serverNowAtEmit: now,
    type: 'dispatch',
    attempt_id: `sim-${game}-${round}`,
    game_index: game,
    round_index: round,
    question_index: 0,
    kind: q.kind,
    question: q.question,
    evaluation: {}, // scrubbed pre-reveal, exactly like the real dispatch
    playableAt: now + LEAD_MS,
    deadlineAt: now + LEAD_MS + QUESTION_MS,
  };
}

function revealFor(game: number, round: number, now: number, board: WlBoardRow[]): WlRevealEventPayload {
  const q = QUESTIONS[round];
  const correctKey = typeof q.evaluation['correct_id'] === 'string'
    ? (q.evaluation['correct_id'] as string)
    : Number(q.evaluation['left_value']) > Number(q.evaluation['right_value']) ? 'left' : 'right';
  return {
    tournamentId: 'simulated',
    seq: game * 100 + round + 50,
    serverNowAtEmit: now,
    type: 'reveal',
    attempt_id: `sim-${game}-${round}`,
    game_index: game,
    round_index: round,
    question_index: 0,
    kind: q.kind,
    evaluation: q.evaluation,
    answered: LADDER[game].players,
    distribution: { [correctKey]: Math.round(LADDER[game].players * 0.62) },
    board,
  };
}

export interface WlSimControls {
  /** Jump to the next scripted step immediately. */
  skip: () => void;
  restart: () => void;
  /** Jump straight to a screen — the playground's screen picker. */
  jumpTo: (target: SimJumpTarget) => void;
  /** Which screen is showing (drives the picker's active chip). */
  current: SimJumpTarget | null;
  /** True while a question is still in its dispatch lead (intro overlay up). */
  inLead: boolean;
  /** Break deadline while the break step runs (feeds the view prop). */
  breakUntilMs: number | null;
  /** The finished game's counts while the break runs. */
  lastResult: { game_index: number; field: number; advanced: number } | null;
  stepLabel: string;
}

export function useWlSimulated(): { live: WlLiveState; sim: WlSimControls } {
  const script = useMemo(() => buildScript(), []);
  // One state object with pure functional transitions — StrictMode-safe.
  const [st, setSt] = useState(() => ({
    stepIndex: 0,
    startedAt: Date.now(),
    score: 0,
    ack: null as WlAnswerAck | null,
    /** Entered with the dispatch lead skipped (picker jumped past the intro). */
    leadSkipped: false,
  }));
  // Generation guard: bumps on every step change/restart so a delayed ack
  // timeout from an earlier question can never land on a later state.
  const genRef = useRef(0);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = script[Math.min(st.stepIndex, script.length - 1)];

  const clearPending = useCallback(() => {
    genRef.current += 1;
    if (pendingRef.current != null) clearTimeout(pendingRef.current);
    pendingRef.current = null;
  }, []);
  useEffect(() => () => clearPending(), [clearPending]);

  const advance = useCallback(() => {
    clearPending();
    const now = Date.now();
    setSt((cur) => {
      const next = Math.min(cur.stepIndex + 1, script.length - 1);
      if (next === cur.stepIndex) return cur;
      const to = script[next];
      return {
        stepIndex: next,
        startedAt: now,
        leadSkipped: false,
        ack: to.kind === 'question' ? null : cur.ack,
        score: to.kind === 'question' && to.round === 0 && to.game > 0 ? 0 : cur.score,
      };
    });
  }, [script, clearPending]);

  const restart = useCallback(() => {
    clearPending();
    setSt({ stepIndex: 0, startedAt: Date.now(), score: 0, ack: null, leadSkipped: false });
  }, [clearPending]);

  // Auto-pace: every step advances itself when its window elapses. The
  // callback is generation-checked — a restart/skip between the timer firing
  // and this effect's cleanup must not advance the freshly reset state.
  useEffect(() => {
    if (!Number.isFinite(step.ms)) return;
    const extra = step.kind === 'question' ? LEAD_MS + 800 : 0;
    const gen = genRef.current;
    const id = setTimeout(() => {
      if (gen === genRef.current) advance();
    }, step.ms + extra);
    return () => clearTimeout(id);
    // startedAt is a dep so a jump to the CURRENT step reschedules the timer
    // (its old generation is dead) instead of freezing auto-advance.
  }, [step, st.stepIndex, st.startedAt, advance]);

  const submitAnswer = useCallback((answer: unknown) => {
    if (pendingRef.current != null) return;
    const cur = script[st.stepIndex];
    if (cur.kind !== 'question' || st.ack != null) return;
    const q = QUESTIONS[cur.round];
    let correct = false;
    let carry: number | undefined;
    if (q.kind === 'money_drop') {
      // One question stands in for the whole round in the sim: whatever lands
      // on the correct option IS the round's carry (and the points).
      const bets = ((answer as { bets?: Record<string, number> })?.bets) ?? {};
      carry = Math.max(0, Math.min(Math.floor(bets[String(q.evaluation['correct_id'])] ?? 0), q.points));
      correct = carry > 0;
    } else if (q.kind === 'true_false' || q.kind === 'mcq') {
      correct = answer === q.evaluation['correct_id'];
    } else if (q.kind === 'higher_lower') {
      const expected = Number(q.evaluation['left_value']) > Number(q.evaluation['right_value']) ? 'left' : 'right';
      correct = answer === expected;
    } else {
      const guess = typeof answer === 'string' ? answer : String((answer as { guess?: unknown })?.guess ?? '');
      const accepted = (q.evaluation['accepted_answers'] as string[]) ?? [];
      correct = guess.trim() !== '' && accepted.some((a) => normalize(a) === normalize(guess));
    }
    const earned = carry ?? (correct ? q.points : 0);
    const result: WlAnswerAck = correct
      ? { accepted: true, correct: true, points: earned, elapsedMs: 2_000, ...(carry != null ? { carry } : {}) }
      : { accepted: true, correct: false, points: 0, elapsedMs: 2_000, ...(carry != null ? { carry } : {}) };
    // Small round-trip delay so the pending state is visible, like the wire —
    // generation-checked so Skip/Restart discard it.
    const gen = genRef.current;
    pendingRef.current = setTimeout(() => {
      pendingRef.current = null;
      if (gen !== genRef.current) return;
      setSt((prev) => ({
        ...prev,
        ack: prev.ack ?? result,
        score: prev.ack == null && correct ? prev.score + earned : prev.score,
      }));
    }, 350);
  }, [script, st.stepIndex, st.ack]);

  const serverNow = useCallback(() => Date.now(), []);

  const board = useMemo(() => {
    const g = 'game' in step ? step.game : 2;
    const r = step.kind === 'question' || step.kind === 'reveal' ? step.round : QUESTIONS.length - 1;
    return simBoard(g, r, st.score);
  }, [step, st.score]);

  const screen: WlLiveScreen = useMemo(() => {
    switch (step.kind) {
      case 'question':
        return { kind: 'question', attempt: dispatchFor(step.game, step.round, st.startedAt), answer: st.ack };
      case 'reveal':
        return {
          kind: 'reveal',
          attempt: dispatchFor(step.game, step.round, st.startedAt - QUESTION_MS),
          reveal: revealFor(step.game, step.round, st.startedAt, board),
          answer: st.ack,
        };
      case 'game_result':
        return {
          kind: 'game_result',
          result: {
            tournamentId: 'simulated',
            seq: 900 + step.game,
            serverNowAtEmit: st.startedAt,
            type: 'game_result',
            game_index: step.game,
            board,
            field: LADDER[step.game].players,
            advanced: LADDER[step.game].advance,
          },
          eliminated: false,
        };
      case 'break':
        return { kind: 'waiting' };
      case 'final':
        return {
          kind: 'final_result',
          result: {
            tournamentId: 'simulated',
            seq: 999,
            serverNowAtEmit: st.startedAt,
            type: 'final_result',
            game_index: 2,
            board,
            champion_user_id: SIM_SELF_ID,
            final_played: true,
          },
          champion: true,
        };
    }
  }, [step, st.startedAt, st.ack, board]);

  const live: WlLiveState = useMemo(() => ({
    connected: true,
    subscribed: true,
    denied: null,
    screen,
    board,
    score: st.score,
    gameIndex: 'game' in step ? step.game : 2,
    serverNow,
    submitAnswer,
    lastAck: st.ack,
    retryNonce: 0,
    snapshotMoneyBudget: null,
  }), [screen, board, st.score, st.ack, step, serverNow, submitAnswer]);

  const jumpTo = useCallback((target: SimJumpTarget) => {
    const idx = script.findIndex((sp) => {
      if (sp.kind !== target.kind) return false;
      if (target.kind === 'question' || target.kind === 'reveal') {
        return 'round' in sp && sp.round === target.round && sp.game === 0;
      }
      return true;
    });
    if (idx < 0) return;
    clearPending();
    // skipIntro backdates the start so playableAt has already passed — the
    // question opens live instead of behind the game-intro/round overlay.
    const skipped = target.kind === 'question' && target.skipIntro === true;
    const startedAt = skipped ? Date.now() - LEAD_MS - 200 : Date.now();
    setSt((cur) => ({ ...cur, stepIndex: idx, startedAt, ack: null, leadSkipped: skipped }));
  }, [script, clearPending]);

  const current: SimJumpTarget | null = useMemo(() => {
    if (step.kind === 'question' || step.kind === 'reveal') return { kind: step.kind, round: step.round };
    if (step.kind === 'game_result') return { kind: 'game_result' };
    if (step.kind === 'break') return { kind: 'break' };
    if (step.kind === 'final') return { kind: 'final' };
    return null;
  }, [step]);

  const sim: WlSimControls = useMemo(() => ({
    skip: advance,
    restart,
    jumpTo,
    current,
    inLead: step.kind === 'question' && !st.leadSkipped,
    breakUntilMs: step.kind === 'break' ? st.startedAt + BREAK_MS : null,
    lastResult: step.kind === 'break'
      ? {
          game_index: step.game,
          field: LADDER[step.game].players,
          advanced: LADDER[step.game].advance,
        }
      : null,
    stepLabel: step.kind === 'question' || step.kind === 'reveal'
      ? `G${step.game + 1} R${step.round + 1} ${step.kind}`
      : step.kind === 'game_result' ? `G${step.game + 1} result`
      : step.kind === 'break' ? `break after G${step.game + 1}`
      : 'champion',
  }), [step, st.startedAt, st.leadSkipped, advance, restart, jumpTo, current]);

  return { live, sim };
}
