// Mock data for the Weekend League prototype. Deterministic (no Math.random /
// no module-load Date.now) so SSR and client render identically. All of this is
// throwaway demo content the real backend will replace.

import { PLAYOFF_CUTOFF, QUIZ_LENGTH, nextGeorgianOccurrence } from './constants';
import type {
  Bracket,
  BracketMatch,
  BracketPlayer,
  BracketRound,
  LeaguePlayer,
  MCQuestion,
  Milestone,
  PrizeTier,
} from './types';

export const REGISTERED_COUNT = 1_240;

// ── Prize ladder (football-themed digital prizes) ───────────────────────────
// Prizes are TOP-3 ONLY: store vouchers (Wolt / Zoommer / PlayStation Store,
// winner's choice) valued by final place — ₾200 / ₾100 / ₾50.
export const PRIZES: PrizeTier[] = [
  { id: 'p1', labelKey: 'weekendLeague.prize1Label', rankKey: 'weekendLeague.prize1Rank', rankFrom: 1, rankTo: 1, prizeKey: 'weekendLeague.prize1Reward', icon: '🏆', accent: 'gold' },
  { id: 'p2', labelKey: 'weekendLeague.prize2Label', rankKey: 'weekendLeague.prize2Rank', rankFrom: 2, rankTo: 2, prizeKey: 'weekendLeague.prize2Reward', icon: '🥈', accent: 'silver' },
  { id: 'p3', labelKey: 'weekendLeague.prize3Label', rankKey: 'weekendLeague.prize3Rank', rankFrom: 3, rankTo: 3, prizeKey: 'weekendLeague.prize3Reward', icon: '🥉', accent: 'bronze' },
];

export function prizeForRank(rank: number): PrizeTier | null {
  return PRIZES.find((p) => rank >= p.rankFrom && rank <= p.rankTo) ?? null;
}

// ── Schedule (Georgian time) ────────────────────────────────────────────────
// Friday = 5, Saturday = 6, Sunday = 0.
export function getMilestones(nowMs: number): Record<'entry' | 'qualifier' | 'playoffs', Milestone> {
  // ONE coherent event weekend: everything anchors to the next qualifier
  // Saturday, so mid-weekend the rail can never mix this week's final with
  // next week's qualifier (Sat 15:00 must show next Sat + its own Fri/Sun,
  // not tomorrow's final).
  const DAY = 24 * 60 * 60_000;
  const saturdayMs = nextGeorgianOccurrence(6, 14, nowMs);
  return {
    entry: { key: 'entry', label: 'Entry closes', dayLabel: 'Friday', timeLabel: '12:00', targetMs: saturdayMs - DAY - 2 * 60 * 60_000 },
    qualifier: { key: 'qualifier', label: 'Qualifier', dayLabel: 'Saturday', timeLabel: '14:00', targetMs: saturdayMs },
    playoffs: { key: 'playoffs', label: 'Playoffs', dayLabel: 'Sunday', timeLabel: '14:00', targetMs: saturdayMs + DAY },
  };
}

// ── Players ─────────────────────────────────────────────────────────────────
const HANDLES = [
  'Kvaro7', 'GamePlay_Gio', 'TotoMessi', 'Nika10', 'BeriaGOAT', 'SabaKeeper', 'DerbyKing', 'LevaniX',
  'Gocha_11', 'MproBaller', 'TatoTrivia', 'IrakliIQ', 'QuizLasha', 'VanoScores', 'DatoDinamo', 'GigaBrain',
  'ZuraZonal', 'ShotaShots', 'LukaLibero', 'BachoBoss', 'OtarOffside', 'GuramGegga', 'RezoRapid', 'Elene_El',
  'MacoMaco', 'NinoKnows', 'AnaAegis', 'SalomeStop', 'TekoTiki', 'VaneKeeps', 'DavaWinger', 'GogaGoal',
  'IliaInsta', 'MishoMidf', 'PapunaP', 'SopoSaves', 'TazoTrap', 'BesoBraga', 'LashaLine', 'JabaJinx',
  'KahaKante', 'ZazaZeb', 'RatiRush', 'NodoNet', 'GelaGuard', 'VitoVolley', 'ArchilA',
];

function tierForRank(rank: number): string {
  if (rank <= 2) return 'GOAT';
  if (rank <= 5) return 'Legend';
  if (rank <= 8) return 'World-Class';
  if (rank <= 16) return 'Captain';
  if (rank <= 24) return 'Key Player';
  if (rank <= 36) return 'Starting11';
  return 'Rotation';
}

function countryForIndex(i: number): string {
  if (i % 7 === 3) return 'BR';
  if (i % 11 === 5) return 'AR';
  if (i % 13 === 7) return 'ES';
  if (i % 17 === 4) return 'PT';
  return 'GE';
}

const OTHER_PLAYERS: LeaguePlayer[] = HANDLES.map((username, i) => ({
  id: `p-${i}`,
  username,
  avatar: `avatar-${(i % 8) + 1}`,
  tier: 'Rotation', // reassigned by final rank below
  country: countryForIndex(i),
  score: 4260 - i * 46 - (i % 3) * 7,
})).sort((a, b) => b.score - a.score);

/**
 * The qualifier standings with "You" landed at a specific rank. Returns 48
 * players sorted best-first; the array index + 1 is the rank, and tier is
 * assigned from that rank. "You"'s score is interpolated between the neighbours
 * so the number looks plausible for the chosen rank.
 */
export function buildLeaderboardAtRank(rank: number): LeaguePlayer[] {
  const n = OTHER_PLAYERS.length;
  const r = Math.max(1, Math.min(n + 1, rank));
  const above = r <= 1 ? OTHER_PLAYERS[0].score + 40 : OTHER_PLAYERS[r - 2].score;
  const below = r > n ? OTHER_PLAYERS[n - 1].score - 40 : OTHER_PLAYERS[r - 1].score;
  const you: LeaguePlayer = {
    id: 'you',
    username: 'You',
    avatar: 'avatar-1',
    tier: 'Rotation',
    country: 'GE',
    score: Math.round((above + below) / 2),
    isYou: true,
  };
  return [...OTHER_PLAYERS, you]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, tier: tierForRank(i + 1) }));
}

/** Demo standings: "You" at rank 7 (qualified) or rank 41 (missed the cut). */
export function buildLeaderboard(qualified: boolean): LeaguePlayer[] {
  return buildLeaderboardAtRank(qualified ? 7 : 41);
}

/**
 * Stand-in for the live qualifier feed: on each tick a rotating slice of
 * players "finishes a round" and gains points, then the board re-sorts so they
 * visibly climb. Deterministic in `tick` so re-renders don't jitter, and the
 * viewer's own row is left alone — their score comes from actually playing.
 */
export function applyLiveScores(entries: LeaguePlayer[], tick: number): LeaguePlayer[] {
  const moved = entries.map((p, i) => {
    if (p.isYou) return p;
    // Three players advance per tick, cycling through the field.
    const finishes = (i + tick) % Math.max(1, Math.floor(entries.length / 3)) === 0;
    if (!finishes) return p;
    const gain = 15 + ((i * 7 + tick * 13) % 45);
    return { ...p, score: p.score + gain };
  });
  return moved.sort((a, b) => b.score - a.score);
}

// ── Mapping a quiz performance → a leaderboard rank ──────────────────────────
// Rank you'd land at for N correct out of QUIZ_LENGTH. Tuned so ~4/6 is the
// cut-off to qualify (top 24), a perfect run challenges for the win.
const RANK_BY_CORRECT = [48, 45, 40, 31, 19, 9, 3];

export function rankForQuiz(correct: number, remaining: number): number {
  const base = RANK_BY_CORRECT[Math.max(0, Math.min(QUIZ_LENGTH, correct))];
  const avgRemaining = remaining / QUIZ_LENGTH;
  const speedNudge = Math.min(2, Math.floor(avgRemaining / 5)); // fast answers climb a little
  return Math.max(1, base - speedNudge);
}

// ── Playoff bracket (curated) ───────────────────────────────────────────────
// Top 24 seeded by qualifier rank. Seeds 1–8 bye into the Round of 16.
const RO24_PAIRS: [number, number][] = [[9, 24], [10, 23], [11, 22], [12, 21], [13, 20], [14, 19], [15, 18], [16, 17]];
const RO24_WINNERS = [9, 10, 22, 12, 20, 14, 15, 16];
const RO16_PAIRS: [number, number][] = [[1, 22], [2, 20], [3, 16], [4, 15], [5, 14], [6, 12], [7, 10], [8, 9]];
const RO16_WINNERS = [1, 20, 3, 4, 5, 6, 7, 9];
const QF_PAIRS: [number, number][] = [[1, 20], [3, 9], [4, 7], [5, 6]];
const QF_WINNERS = [1, 3, 7, 5];
const SF_PAIRS: [number, number][] = [[1, 7], [3, 5]];
const SF_WINNERS = [7, 3];
const FINAL_PAIR: [number, number] = [3, 7];
const FINAL_WINNER = 7; // seed 7 = "You" (or the stand-in when not qualified)

function seededQualifiers(qualified: boolean): Map<number, BracketPlayer> {
  const top = buildLeaderboard(true).slice(0, PLAYOFF_CUTOFF);
  const map = new Map<number, BracketPlayer>();
  top.forEach((p, i) => {
    const seed = i + 1;
    const isSeed7Standin = seed === 7 && !qualified;
    map.set(seed, {
      id: isSeed7Standin ? 'standin-7' : p.id,
      username: isSeed7Standin ? 'Kvaro7' : p.username,
      avatar: isSeed7Standin ? 'avatar-5' : p.avatar,
      tier: p.tier,
      country: p.country,
      seed,
      isYou: seed === 7 && qualified,
    });
  });
  return map;
}

function matchScores(idx: number): [number, number] {
  const winner = 6 + (idx % 3); // 6–8
  const loser = winner - (1 + (idx % 2)); // 4–7, always < winner
  return [winner, loser];
}

export function buildBracket(qualified: boolean, level: 'live' | 'completed'): Bracket {
  const q = seededQualifiers(qualified);
  const seedId = (seed: number) => q.get(seed)!.id;

  const mk = (
    id: string,
    pair: [number, number] | null,
    winnerSeed: number | null,
    resolved: boolean,
    idx: number,
    live = false,
  ): BracketMatch => {
    const a = pair ? q.get(pair[0])! : null;
    const b = pair ? q.get(pair[1])! : null;
    const m: BracketMatch = { id, a, b };
    if (pair) m.isYours = (pair[0] === 7 || pair[1] === 7) && qualified;
    if (resolved && winnerSeed != null && pair) {
      const [ws, ls] = matchScores(idx);
      m.winnerId = seedId(winnerSeed);
      m.scoreA = winnerSeed === pair[0] ? ws : ls;
      m.scoreB = winnerSeed === pair[1] ? ws : ls;
    }
    if (live) m.live = true;
    return m;
  };

  const completed = level === 'completed';

  const ro24: BracketRound = {
    id: 'ro24',
    name: 'Round of 24',
    subtitle: 'Seeds 1–8 advance on a bye',
    matches: RO24_PAIRS.map((p, i) => mk(`ro24-${i}`, p, RO24_WINNERS[i], true, i)),
  };
  const ro16: BracketRound = {
    id: 'ro16',
    name: 'Round of 16',
    matches: RO16_PAIRS.map((p, i) => mk(`ro16-${i}`, p, RO16_WINNERS[i], true, i)),
  };
  // QF: resolved only when completed; in live, seed-7's match is on now.
  const qf: BracketRound = {
    id: 'qf',
    name: 'Quarter-finals',
    matches: QF_PAIRS.map((p, i) =>
      mk(`qf-${i}`, p, QF_WINNERS[i], completed, i, !completed && (p[0] === 7 || p[1] === 7)),
    ),
  };
  // SF / Final: participants unknown until QFs resolve → TBD in live.
  const sf: BracketRound = {
    id: 'sf',
    name: 'Semi-finals',
    matches: (completed ? SF_PAIRS : [null, null]).map((p, i) =>
      mk(`sf-${i}`, p as [number, number] | null, completed ? SF_WINNERS[i] : null, completed, i),
    ),
  };
  const final: BracketRound = {
    id: 'final',
    name: 'Final',
    matches: [mk('final-0', completed ? FINAL_PAIR : null, completed ? FINAL_WINNER : null, completed, 0)],
  };

  return {
    rounds: [ro24, ro16, qf, sf, final],
    championId: completed ? seedId(FINAL_WINNER) : null,
    championName: completed ? q.get(FINAL_WINNER)!.username : null,
  };
}

// ── Quiz content (mock MC questions) ────────────────────────────────────────
const QUESTION_POOL: MCQuestion[] = [
  { id: 'q1', prompt: 'Which country won the 2022 FIFA World Cup?', options: ['France', 'Argentina', 'Brazil', 'Croatia'], correctIndex: 1 },
  { id: 'q2', prompt: 'Which club has won the most Champions League titles?', options: ['Barcelona', 'Real Madrid', 'Bayern Munich', 'AC Milan'], correctIndex: 1 },
  { id: 'q3', prompt: "Who is the men's Champions League all-time top scorer?", options: ['Lionel Messi', 'Cristiano Ronaldo', 'Robert Lewandowski', 'Karim Benzema'], correctIndex: 1 },
  { id: 'q4', prompt: 'How many players per team are on the pitch, including the keeper?', options: ['10', '11', '12', '9'], correctIndex: 1 },
  { id: 'q5', prompt: 'Which Georgian forward joined Napoli in 2022?', options: ['Kvaratskhelia', 'Chakvetadze', 'Kvekveskiri', 'Lobjanidze'], correctIndex: 0 },
  { id: 'q6', prompt: 'Which nation has won the most World Cups?', options: ['Germany', 'Italy', 'Brazil', 'Argentina'], correctIndex: 2 },
  { id: 'q7', prompt: 'How long is a standard match in normal time?', options: ['80 min', '90 min', '100 min', '120 min'], correctIndex: 1 },
  { id: 'q8', prompt: 'Which club plays its home games at Anfield?', options: ['Everton', 'Liverpool', 'Man City', 'Chelsea'], correctIndex: 1 },
  { id: 'q9', prompt: 'Who won the 2024 Ballon d’Or?', options: ['Vinícius Jr', 'Rodri', 'Jude Bellingham', 'Erling Haaland'], correctIndex: 1 },
  { id: 'q10', prompt: 'A hat-trick is how many goals by one player in a match?', options: ['2', '3', '4', '5'], correctIndex: 1 },
  { id: 'q11', prompt: 'The offside line is judged from which reference?', options: ['The halfway line', 'The second-last defender', 'The goal line', 'The penalty spot'], correctIndex: 1 },
  { id: 'q12', prompt: 'Which player is nicknamed “O Fenômeno”?', options: ['Ronaldinho', 'Ronaldo Nazário', 'Rivaldo', 'Romário'], correctIndex: 1 },
];

/** N questions starting at an offset (wraps), so different matches vary. */
export function getQuizQuestions(offset = 0, n = QUIZ_LENGTH): MCQuestion[] {
  return Array.from({ length: n }, (_, i) => QUESTION_POOL[(offset + i) % QUESTION_POOL.length]);
}

// ── Playoff run (your playable path: QF → SF → Final) ───────────────────────
// Opponent seeds match the curated bracket ties for seed 7 ("You"). Target
// points rise each round, so deeper rounds demand a stronger quiz.
export interface PlayoffRoundDef {
  name: string;
  nextName: string | null;
  opponentSeed: number;
  opponentTargetPoints: number;
  /** Placement if you lose here. */
  eliminationPlacement: string;
}

export const PLAYOFF_ROUNDS: PlayoffRoundDef[] = [
  { name: 'Quarter-final', nextName: 'Semi-final', opponentSeed: 4, opponentTargetPoints: 340, eliminationPlacement: 'in the top 8' },
  { name: 'Semi-final', nextName: 'Final', opponentSeed: 1, opponentTargetPoints: 430, eliminationPlacement: 'in the top 4' },
  { name: 'Final', nextName: null, opponentSeed: 3, opponentTargetPoints: 500, eliminationPlacement: 'as runner-up' },
];

/** The opponent player for a playoff round (from the top-24 seeding). */
export function playoffOpponent(seed: number): LeaguePlayer {
  return buildLeaderboard(true)[seed - 1];
}
