'use client';

/**
 * /dev/orshabatoba-live?s=pack: the whole ორშაბათობა night played locally from a real show pack, with the server's
 * timings (reading lead, round intro, 5 s break after a cut, reveal hold), 99 simulated players, and the cuts.
 * The pack is read from /__local/pack.json, a git-ignored local file: questions never enter this public repo.
 * ?cd=<seconds> shortens the Start countdown (default 60).
 */

import { useEffect, useMemo, useState } from 'react';
import type { WlBoardRow, WlDispatchEventPayload, WlRevealEventPayload } from '@/lib/realtime/socket.types';
import type { WlLiveScreen } from '@/features/weekend-league/live/useWlLive';
import { LiveShowStage, type LiveShowPhase } from '@/features/live-show/live/LiveShowStage';
import type { ShowRound } from '@/features/live-show/live/showLive.adapter';
import { EventLobby, KickoffCountdown } from '@/features/live-event/LiveEventScreen';
import { liveEventCopy } from '@/features/live-event/liveEvent.copy';

type I18n = { ka: string; en?: string };
type PackQ = {
  prompt: I18n; options?: Array<{ id: string; text: I18n; image?: string }>; correct?: string; image?: string;
  wl?: { payload: Record<string, unknown>; evaluation: Record<string, unknown> };
};
type PackRound = { kind: string; title?: I18n; cut?: { keep_percent?: number; keep_count?: number }; questions: PackQ[] };
type Pack = { rounds: PackRound[] };

const LEAD = 3_000;
const INTRO = 2_200;
const BREAK = 5_000;
const REVEAL_HOLD = 3_000;
const WHO_AM_I_POINTS = [100, 80, 60, 40, 20];
const FIELD = 100;
const ME = 'me';
const NAMES = ['gio_10', 'nino', 'luka.k', 'sandro', 'tatia', 'beqa', 'mari', 'dato', 'ana', 'levani', 'saba', 'keti', 'irakli', 'tamo', 'zura'];

const windowOf = (kind: string) => (kind === 'put_in_order' ? 20_000 : kind === 'who_am_i' ? 50_000 : 10_000);
const i18n = (t: I18n | undefined) => ({ ka: t?.ka ?? '', en: t?.en ?? t?.ka ?? '' });
/** Deterministic 0..1 per (a, b). */
const rnd = (a: number, b: number) => {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

type Step = {
  round: number; q: number; kind: string; dispatchAt: number; playableAt: number; deadlineAt: number; nextAt: number;
  question: Record<string, unknown>; evaluation: Record<string, unknown>;
};

function buildSteps(pack: Pack, kickoff: number): Step[] {
  const steps: Step[] = [];
  let t = kickoff;
  pack.rounds.forEach((r, ri) => r.questions.forEach((q, qi) => {
    const lead = LEAD + (qi === 0 ? INTRO : 0) + (qi === 0 && ri > 0 && pack.rounds[ri - 1]!.cut ? BREAK : 0);
    const win = windowOf(r.kind);
    const show = { kind: r.kind, ...(r.title ? { round_title: i18n(r.title) } : {}) };
    let question: Record<string, unknown>;
    let evaluation: Record<string, unknown>;
    if (q.wl) {
      question = { ...q.wl.payload, show };
      evaluation = q.wl.evaluation;
    } else {
      question = {
        prompt: i18n(q.prompt), show,
        ...(q.image ? { image: { url: q.image } } : {}),
        ...(q.options ? { options: q.options.map((o) => ({ id: o.id, text: i18n(o.text) })) } : {}),
      };
      evaluation = { correct_id: q.correct };
    }
    const kind = q.wl ? r.kind : r.kind === 'true_false' ? 'true_false' : 'mcq';
    steps.push({ round: ri, q: qi, kind, dispatchAt: t, playableAt: t + lead, deadlineAt: t + lead + win, nextAt: t + lead + win + REVEAL_HOLD, question, evaluation });
    t = t + lead + win + REVEAL_HOLD;
  }));
  return steps;
}

/** Your answer → correct + points, like the server: speed curve for one-tap kinds, clue ladder for who am I. */
function judge(step: Step, answer: unknown, at: number): { correct: boolean; points: number } {
  const elapsed = Math.max(0, at - step.playableAt);
  const win = step.deadlineAt - step.playableAt;
  const speed = Math.ceil(Math.max(0, win - Math.max(0, elapsed - 500)) / 1000) * 10;
  if (step.kind === 'true_false' || step.kind === 'mcq') {
    const ok = answer === step.evaluation['correct_id'];
    return { correct: ok, points: ok ? Math.min(100, speed) : 0 };
  }
  if (step.kind === 'put_in_order') {
    const order = (step.evaluation['order'] as unknown[] | undefined)?.map(String) ?? [];
    const ok = Array.isArray(answer) && answer.map(String).join('|') === order.join('|');
    return { correct: ok, points: ok ? 100 : 0 };
  }
  const guess = norm(typeof answer === 'string' ? answer : String((answer as { guess?: unknown })?.guess ?? ''));
  const strings: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') strings.push(norm(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(step.evaluation);
  const ok = guess.length >= 3 && strings.some((s) => s === guess || s.split(' ').includes(guess));
  if (!ok) return { correct: false, points: 0 };
  if (step.kind === 'who_am_i') return { correct: true, points: WHO_AM_I_POINTS[Math.min(4, Math.floor(elapsed / (win / 5)))] ?? 20 };
  return { correct: true, points: Math.min(100, speed) };
}

export function PackDemo() {
  const copy = liveEventCopy('ka');
  const [pack, setPack] = useState<Pack | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/__local/pack.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((p: Pack) => setPack(p)).catch(() => setError('No local pack at /__local/pack.json'));
  }, []);
  const [cdMs] = useState(() => {
    const v = typeof window === 'undefined' ? NaN : Number(new URLSearchParams(window.location.search).get('cd'));
    return (Number.isFinite(v) && v > 0 ? v : 60) * 1000;
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);
  const [entered, setEntered] = useState(false);
  const [kickoff, setKickoff] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, { answer: unknown; at: number }>>({});

  const steps = useMemo(() => (pack && kickoff ? buildSteps(pack, kickoff) : []), [pack, kickoff]);
  const rounds: ShowRound[] = useMemo(() => (pack?.rounds ?? []).map((r) => ({
    kind: r.kind as ShowRound['kind'], count: r.questions.length,
    ...(r.title ? { title: i18n(r.title) } : {}), ...(r.cut ? { cut: r.cut } : {}),
  })), [pack]);

  // Index of the step on screen (the last one dispatched), and how many are fully scored.
  const cur = steps.findLastIndex((s) => now >= s.dispatchAt);
  const scored = steps.filter((s) => now >= s.deadlineAt).length;

  // Standings + cuts, replayed step by step: a cut applies when the next round's first question goes out.
  const { board, eliminated } = useMemo(() => {
    const pts = new Map<string, number>([[ME, 0]]);
    const time = new Map<string, number>([[ME, 0]]);
    for (let b = 0; b < FIELD - 1; b++) { pts.set(`b${b}`, 0); time.set(`b${b}`, 0); }
    const out = new Set<string>();
    const sorted = () => [...pts.keys()].sort((a, b) => (pts.get(b)! - pts.get(a)!) || (time.get(a)! - time.get(b)!));
    steps.forEach((s, j) => {
      if (j > cur) return;
      if (s.q === 0 && s.round > 0 && rounds[s.round - 1]?.cut) {
        const cut = rounds[s.round - 1]!.cut!;
        const alive = sorted().filter((id) => !out.has(id));
        const keep = cut.keep_count ?? Math.ceil((alive.length * (cut.keep_percent ?? 100)) / 100);
        alive.slice(keep).forEach((id) => out.add(id));
      }
      if (j >= scored) return;
      for (let b = 0; b < FIELD - 1; b++) {
        const id = `b${b}`;
        if (out.has(id)) continue;
        const skill = 0.25 + 0.55 * rnd(b, 1);
        const ok = rnd(b, j + 7) < skill;
        const t = Math.floor(1_500 + rnd(b, j + 99) * 7_000);
        pts.set(id, pts.get(id)! + (ok ? Math.max(10, 100 - Math.floor(t / 1000) * 10) : 0));
        time.set(id, time.get(id)! + t);
      }
      const mine = answers[j];
      if (mine && !out.has(ME)) {
        const r = judge(s, mine.answer, mine.at);
        pts.set(ME, pts.get(ME)! + r.points);
        time.set(ME, time.get(ME)! + Math.max(0, mine.at - s.playableAt));
      } else {
        time.set(ME, time.get(ME)! + (s.deadlineAt - s.playableAt));
      }
    });
    const rows: WlBoardRow[] = sorted().map((id, i) => ({
      user_id: id, nickname: id === ME ? 'შენ' : `${NAMES[Number(id.slice(1)) % NAMES.length]}${Number(id.slice(1)) >= NAMES.length ? Number(id.slice(1)) : ''}`,
      points: pts.get(id)!, time_ms_total: time.get(id)!, rank: i + 1,
    }));
    return { board: rows, eliminated: out };
  }, [steps, cur, scored, answers, rounds]);

  if (error) return <div className="p-8 font-poppins text-white">{error}</div>;
  if (!pack) return <div className="p-8 font-poppins text-white">…</div>;

  const phase: LiveShowPhase = kickoff == null ? 'pregame' : now < kickoff ? 'countdown' : 'game';
  const out = eliminated.has(ME);
  const step = cur >= 0 ? steps[cur]! : null;
  let screen: WlLiveScreen = { kind: 'waiting' };
  if (phase === 'game' && step) {
    const last = cur === steps.length - 1;
    if (last && now >= step.nextAt) {
      screen = { kind: 'final_result', result: { type: 'final_result', tournamentId: 'dev', seq: 999, board, champion_user_id: board[0]!.user_id } as never, champion: board[0]!.user_id === ME };
    } else {
      const attempt = {
        type: 'dispatch', tournamentId: 'dev', seq: 10 + cur * 2, serverNowAtEmit: step.dispatchAt,
        attempt_id: `pack-${cur}`, game_index: 0, round_index: step.round, question_index: step.q,
        kind: step.kind, question: step.question, evaluation: now >= step.deadlineAt ? step.evaluation : {},
        playableAt: step.playableAt, deadlineAt: step.deadlineAt,
      } as unknown as WlDispatchEventPayload;
      const mine = answers[cur];
      const r = mine ? judge(step, mine.answer, mine.at) : null;
      const ack = mine && r ? { accepted: true as const, correct: r.correct, points: r.points, elapsedMs: Math.max(0, mine.at - step.playableAt) } : null;
      if (now < step.deadlineAt) {
        screen = { kind: 'question', attempt, answer: ack } as WlLiveScreen;
      } else {
        const correctId = typeof step.evaluation['correct_id'] === 'string' ? step.evaluation['correct_id'] : null;
        const reveal = {
          type: 'reveal', tournamentId: 'dev', seq: 11 + cur * 2, attempt_id: attempt.attempt_id, game_index: 0,
          round_index: step.round, question_index: step.q, kind: step.kind, evaluation: step.evaluation,
          answered: board.length - eliminated.size,
          distribution: correctId ? { [correctId]: 0.55, ...(step.kind === 'true_false' ? { [correctId === 'true' ? 'false' : 'true']: 0.45 } : {}) } : {},
          board,
        } as unknown as WlRevealEventPayload;
        screen = { kind: 'reveal', attempt, reveal, answer: ack } as WlLiveScreen;
      }
    }
  }
  const myScore = board.find((r) => r.user_id === ME)?.points ?? 0;

  return (
    <LiveShowStage
      locale="ka"
      title={copy.title}
      phase={phase}
      now={now}
      kickoffMs={kickoff}
      registered={FIELD - 1 + (entered ? 1 : 0)}
      screen={screen}
      board={phase === 'game' ? board : []}
      score={myScore}
      selfUserId={ME}
      canAnswer={entered && !out}
      eliminated={entered && out}
      onAnswer={(answer) => {
        if (cur < 0 || answers[cur] || now < steps[cur]!.playableAt || now >= steps[cur]!.deadlineAt) return;
        setAnswers((a) => ({ ...a, [cur]: { answer, at: Date.now() } }));
      }}
      retryNonce={0}
      rounds={rounds}
      lobbyLine={copy.startsWhenHostsSay}
      pregamePanel={(
        <EventLobby
          compact
          copy={copy}
          registered={FIELD - 1 + (entered ? 1 : 0)}
          status="entry_open"
          entered={entered}
          onRegister={() => setEntered(true)}
          host={{ busy: false, message: 'დემო: ამ ღილაკს მხოლოდ წამყვანი ხედავს.', onStart: () => { setEntered(true); setKickoff(Date.now() + cdMs); } }}
        />
      )}
      countdownPanel={(
        <KickoffCountdown compact copy={copy} kickoffMs={kickoff} canJoin={!entered} joining={false} onJoin={() => setEntered(true)} />
      )}
      onExit={() => window.location.reload()}
      fullPage
    />
  );
}
