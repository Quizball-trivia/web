/**
 * Simulated crowd for the Live Show prototype: deterministic bot answers (seeded by bot and question), so a replay
 * of the same night gives the same board. Pure — the hook owns time.
 */

import { compareStanding, revealSteps, REVEAL_STEP_MS, scoreAnswer, windowMs } from './show.rules';
import type { ShowAnswer, ShowQuestion } from './show.types';

export const YOU_ID = 'you';

const NAMES = [
  'BOBBIGOL', 'Totti10', 'DAVE8', 'zaqoo', 'Irakli0407', 'Thenotorious', 'gio_beqa', 'LashaK', 'Nika77', 'guram22',
  'datola', 'saba_fc', 'levan9', 'tazo10', 'anzori', 'beka_m', 'ilia21', 'sandro7', 'giorgi_b', 'luka99', 'oto_gel',
  'vato_z', 'demna4', 'rezi_k', 'mamuka', 'kote_fc', 'sopo_gol', 'nino11', 'ana_kvara', 'temo99',
];

export interface SimPlayer {
  id: string;
  name: string;
  skill: number;
  alive: boolean;
  /** Stage index where this player was cut; null while in. */
  outAfterStage: number | null;
  points: number;
  timeMs: number;
  /** Final points (the final starts at zero). */
  finalPoints: number;
  finalTimeMs: number;
}

function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function makeCrowd(count: number, youName: string): SimPlayer[] {
  const players: SimPlayer[] = [];
  const blank = { alive: true, outAfterStage: null, points: 0, timeMs: 0, finalPoints: 0, finalTimeMs: 0 };
  players.push({ id: YOU_ID, name: youName, skill: 0.7, ...blank });
  for (let i = 0; i < count; i += 1) {
    const r = rng(`bot-${i}`);
    const base = NAMES[i % NAMES.length]!;
    const name = i < NAMES.length ? base : `${base}${Math.floor(r() * 90) + 10}`;
    players.push({ id: `bot-${i}`, name, skill: 0.3 + r() * 0.62, ...blank });
  }
  return players;
}

/** One bot's answer to one question. Null = didn't answer in time. */
export function botAnswer(player: SimPlayer, q: ShowQuestion): ShowAnswer | null {
  const r = rng(`${player.id}:${q.id}`);
  const win = windowMs(q);
  if (r() < 0.04) return null;
  const elapsed = Math.round(900 + r() * win * 0.75 * (1.25 - player.skill));
  switch (q.kind) {
    case 'true_false':
    case 'mcq':
    case 'odd_one_out':
    case 'fake_fact': {
      const difficulty = q.kind === 'true_false' ? 0.12 : q.kind === 'fake_fact' ? -0.08 : 0;
      const right = r() < Math.min(0.97, player.skill + difficulty);
      const wrong = q.options.filter((o) => o.id !== q.correctId);
      const optionId = right ? q.correctId : wrong[Math.floor(r() * wrong.length)]?.id ?? q.correctId;
      return { kind: 'choice', optionId, elapsedMs: Math.min(elapsed, win - 200) };
    }
    case 'zoom_out':
    case 'evolution': {
      const steps = revealSteps(q);
      const step = Math.min(steps - 1, Math.floor((1 - player.skill) * steps + r() * 1.6));
      const right = r() < Math.min(0.97, 0.3 + player.skill * 0.45 + step * 0.12);
      const wrong = q.options.filter((o) => o.id !== q.correctId);
      const optionId = right ? q.correctId : wrong[Math.floor(r() * wrong.length)]?.id ?? q.correctId;
      const elapsedMs = Math.min(win - 200, step * REVEAL_STEP_MS + Math.round(400 + r() * 2200));
      return { kind: 'reveal_choice', optionId, step, elapsedMs };
    }
    case 'mines': {
      const fits = new Set(q.fits);
      const order = [...q.cards];
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.floor(r() * (i + 1));
        [order[i], order[j]] = [order[j]!, order[i]!];
      }
      // Each card: a bot recognises a fit or a mine with its skill, and only picks what it believes fits. A cautious
      // streak (stop early) keeps some bots safe on a partial board.
      const picked: string[] = [];
      const caution = r() * 0.5;
      for (const card of order) {
        const isFit = fits.has(card.id);
        const believesFit = r() < player.skill + 0.08 ? isFit : !isFit;
        if (believesFit && r() > caution * 0.6) picked.push(card.id);
      }
      return { kind: 'mines', picked, elapsedMs: Math.min(win - 200, 3000 + picked.length * 1100 + Math.round(r() * 3000)) };
    }
    case 'closest_number':
    case 'what_minute': {
      const spread = (q.tolerance ?? (q.max - q.min) / 4) * (1.15 - player.skill);
      const gauss = (r() + r() + r() - 1.5) / 1.5;
      const raw = q.answer + gauss * spread;
      const value = Math.min(q.max, Math.max(q.min, Math.round(raw / q.step) * q.step));
      return { kind: 'slider', value, elapsedMs: Math.min(elapsed + 1500, win - 200) };
    }
  }
}

export interface BoardRow {
  id: string;
  name: string;
  points: number;
  timeMs: number;
  rank: number;
}

export function boardOf(players: SimPlayer[], final: boolean): BoardRow[] {
  const rows = players
    .filter((p) => p.alive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      points: final ? p.finalPoints : p.points,
      timeMs: final ? p.finalTimeMs : p.timeMs,
    }))
    .sort(compareStanding);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Points earned by every answering player, for the reveal's spread. */
export function scoreAll(q: ShowQuestion, answers: Map<string, ShowAnswer | null>) {
  const out = new Map<string, ReturnType<typeof scoreAnswer>>();
  for (const [id, a] of answers) out.set(id, scoreAnswer(q, a));
  return out;
}

/** Adds one question's points to every player still in. Returns your result (null when you're out). */
export function applyQuestion(
  players: SimPlayer[],
  q: ShowQuestion,
  answers: Map<string, ShowAnswer | null>,
  final: boolean,
): { points: number; correct: boolean } | null {
  let yours: { points: number; correct: boolean } | null = null;
  for (const p of players) {
    if (!p.alive) continue;
    const s = scoreAnswer(q, answers.get(p.id) ?? null);
    if (final) {
      p.finalPoints += s.points;
      p.finalTimeMs += s.timeMs;
    } else {
      p.points += s.points;
      p.timeMs += s.timeMs;
    }
    if (p.id === YOU_ID) yours = { points: s.points, correct: s.correct };
  }
  return yours;
}

/** Cuts everyone outside the top `keep` after `stage`. `you` forces you in or out (dev jumps). */
export function applyCut(players: SimPlayer[], keep: number, stage: number, you: 'keep' | 'cut' | 'auto' = 'auto'): BoardRow[] {
  const board = boardOf(players, false);
  const top = board.slice(0, keep).map((r) => r.id);
  // A dev jump that keeps you in swaps you for the last seat, so the cut size stays honest.
  if (you === 'keep' && !top.includes(YOU_ID) && board.some((r) => r.id === YOU_ID)) top[top.length - 1] = YOU_ID;
  const survivors = new Set(top);
  if (you === 'cut') survivors.delete(YOU_ID);
  for (const p of players) {
    if (p.alive && !survivors.has(p.id)) {
      p.alive = false;
      p.outAfterStage = stage;
    }
  }
  return board;
}

/** Plays a stage instantly, everyone (you included) answering like a bot. */
export function playStageInstantly(players: SimPlayer[], questions: ShowQuestion[], final: boolean): void {
  for (const q of questions) {
    const answers = new Map<string, ShowAnswer | null>();
    for (const p of players) if (p.alive) answers.set(p.id, botAnswer(p, q));
    applyQuestion(players, q, answers, final);
  }
}

export function knockOutYou(players: SimPlayer[]): void {
  const you = players.find((p) => p.id === YOU_ID);
  if (you) {
    you.alive = false;
    you.outAfterStage = -1;
  }
}
