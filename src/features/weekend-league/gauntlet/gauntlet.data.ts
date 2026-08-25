import type { MessageKey } from '@/lib/i18n/messages';
import type {
  GameDef,
  RoundDef,
  RoundQuestion,
  StandingsRow,
} from './gauntlet.types';

/** Finalists — must equal the backend's WL_FINALISTS. */
// Must equal the backend's WL_FINALISTS (wl-rules.ts) — the ladder below is a
// mirror of wlBuildLadder, so a mismatch shows players the wrong cut numbers.
export const FINALISTS = 24;

/**
 * The qualifier ladder — a MIRROR of the backend `wlBuildLadder` (wl-rules.ts).
 * Every game must eliminate someone: big fields keep the product shape
 * ONE continuous rule, identical to the backend's wlBuildLadder: the gentler of
 * the product shape (n/3, n/6) and an equal-ratio spread, so large fields land
 * near 600 -> 205 -> 100 -> 24 and small ones spread (54 -> 41 -> 31 -> 24)
 * without a discontinuity when one extra player joins. Fields too small for
 * three cuts to 24 end just below it. Keep the two implementations in step.
 */
export function wlLadder(fieldSize: number): [number, number, number] {
  const n = Math.max(0, Math.floor(fieldSize));
  if (n <= 3) return [n, n, n];

  const finalTarget = Math.min(FINALISTS, n - 3);
  const ratio = Math.pow(finalTarget / n, 1 / 3);
  const a1 = Math.min(
    n - 1,
    Math.max(finalTarget + 2, Math.round(n / 3), Math.round(n * ratio)),
  );
  const a2 = Math.min(
    a1 - 1,
    Math.max(finalTarget + 1, Math.round(n / 6), Math.round(n * ratio * ratio)),
  );
  return [a1, a2, finalTarget];
}

/** Reference ladder at the design field size — derived, never hand-written,
 *  so it cannot drift from the rules. Declared after buildGames (TDZ). */
export function buildGames(fieldSize: number, singleGame = false): GameDef[] {
  // Sunday's final is one game that crowns a champion, not an elimination ladder.
  if (singleGame) {
    const players = Math.max(2, Math.round(fieldSize));
    return [{ index: 0, players, advance: 1 }];
  }

  const players = Math.max(4, Math.round(fieldSize));
  const [a1, a2, a3] = wlLadder(players);
  return [
    { index: 0, players, advance: a1 },
    { index: 1, players: a1, advance: a2 },
    { index: 2, players: a2, advance: a3 },
  ];
}

export const GAMES: GameDef[] = buildGames(600);

// Timings mirror ranked (backend `QUESTION_TIME_MS` = 10s per question, and
// clues run 10s per clue). Multi-question rounds carry 5 × 10s; the clue round
// is one puzzle over 5 × 10s.
const SECONDS_PER_QUESTION = 10;
const QUESTIONS_PER_ROUND = 5;
const ROUND_SECONDS = SECONDS_PER_QUESTION * QUESTIONS_PER_ROUND;

// maxPoints mirror the backend exactly: 5×30, 5×30, 5×40, 5×40, 300 puzzle.
export const ROUNDS: RoundDef[] = [
  { index: 0, type: 'trueFalse', maxPoints: 500, seconds: ROUND_SECONDS, label: 'True or False' },
  { index: 1, type: 'putInOrder', maxPoints: 500, seconds: ROUND_SECONDS * 2, label: 'Put In Order' },
  { index: 2, type: 'mcq', maxPoints: 500, seconds: ROUND_SECONDS, label: 'Multiple Choice' },
  { index: 3, type: 'careerPath', maxPoints: 500, seconds: ROUND_SECONDS, label: 'Career Path' },
  { index: 4, type: 'whoAmI', maxPoints: 100, seconds: ROUND_SECONDS, label: 'Who Am I?' },
];

export const ROUND_LABEL_KEYS: Record<string, MessageKey> = {
  trueFalse: 'weekendLeague.rTrueFalse',
  higherLower: 'weekendLeague.rHigherLower',
  mcq: 'weekendLeague.rMcq',
  careerPath: 'weekendLeague.rCareerPath',
  whoAmI: 'weekendLeague.rWhoAmI',
  moneyDrop: 'weekendLeague.rMoneyDrop',
  putInOrder: 'weekendLeague.rPutInOrder',
};

export const BREAK_SECONDS = 120;
export const GAME_MAX_POINTS = ROUNDS.reduce((s, r) => s + r.maxPoints, 0);

// ── Questions: [game][round] ────────────────────────────────────────────────
export const QUESTIONS: RoundQuestion[][] = [
  [
    {
      type: 'trueFalse',
      items: [
        { statement: 'Lionel Messi won his first World Cup in 2022.', answer: true },
        { statement: 'Real Madrid have won more Champions League titles than any other club.', answer: true },
        { statement: 'The offside rule does not apply at a throw-in.', answer: true },
        { statement: 'Pelé scored over 1,000 official career goals.', answer: false },
        { statement: 'A goalkeeper may handle a deliberate back-pass from a team-mate.', answer: false },
      ],
    },
    {
      type: 'higherLower',
      statLabel: 'Champions League goals',
      chain: [
        { name: 'Cristiano Ronaldo', value: 140 },
        { name: 'Lionel Messi', value: 129 },
        { name: 'Robert Lewandowski', value: 105 },
        { name: 'Karim Benzema', value: 90 },
      ],
      stepPoints: 50,
    },
    {
      type: 'mcq',
      items: [
        { prompt: 'Which club won the 2023 UEFA Champions League?', options: ['Manchester City', 'Real Madrid', 'Inter Milan', 'Bayern Munich'], correctIndex: 0 },
        { prompt: 'Which country won the 2018 World Cup?', options: ['Croatia', 'France', 'Belgium', 'England'], correctIndex: 1 },
        { prompt: 'Which club is nicknamed "The Old Lady"?', options: ['AC Milan', 'Roma', 'Juventus', 'Napoli'], correctIndex: 2 },
        { prompt: 'Who is the all-time Premier League top scorer?', options: ['Wayne Rooney', 'Thierry Henry', 'Andy Cole', 'Alan Shearer'], correctIndex: 3 },
        { prompt: 'Which stadium hosts the Champions League 2026 final?', options: ['Puskás Aréna', 'Wembley', 'Santiago Bernabéu', 'Allianz Arena'], correctIndex: 0 },
      ],
    },
    {
      type: 'careerPath',
      items: [
        { clubs: ['manchester-united', 'real-madrid', 'juventus-fc', 'manchester-united'], options: ['Cristiano Ronaldo', 'Ángel Di María', 'Nani', 'Marcus Rashford'], correctIndex: 0 },
        { clubs: ['fc-barcelona', 'paris-saint-germain', 'inter-milan'], options: ['Neymar', 'Lionel Messi', 'Luis Suárez', 'Ousmane Dembélé'], correctIndex: 1 },
        { clubs: ['borussia-dortmund', 'bayern-munich', 'fc-barcelona'], options: ['Mario Götze', 'Robert Lewandowski', 'Thomas Müller', 'Erling Haaland'], correctIndex: 1 },
        { clubs: ['ssc-napoli', 'paris-saint-germain'], options: ['Khvicha Kvaratskhelia', 'Victor Osimhen', 'Dries Mertens', 'Lorenzo Insigne'], correctIndex: 0 },
        { clubs: ['chelsea-fc', 'real-madrid'], options: ['Eden Hazard', 'Thibaut Courtois', 'Both of them', 'Neither'], correctIndex: 2 },
      ],
    },
    {
      type: 'whoAmI',
      clues: [
        'I have won the World Cup.',
        'I played for Barcelona for two decades.',
        "I have won multiple Ballon d'Or awards.",
        'I represent Argentina.',
        'I wear number 10.',
      ],
      options: ['Lionel Messi', 'Neymar', 'Luis Suárez', 'Ronaldinho'],
      correctIndex: 0,
      // Mirrors ranked's clue decay: 300 → 240 → 180 → 120 → 60.
      cluePoints: [100, 80, 60, 40, 20],
    },
  ],
  [
    {
      type: 'trueFalse',
      items: [
        { statement: 'Khvicha Kvaratskhelia won Serie A with Napoli in 2023.', answer: true },
        { statement: 'Georgia qualified for Euro 2024.', answer: true },
        { statement: 'A match can restart with a drop ball.', answer: true },
        { statement: 'Italy won the 2022 World Cup.', answer: false },
        { statement: 'A red card means the team plays on with ten players.', answer: true },
      ],
    },
    {
      type: 'higherLower',
      statLabel: 'World Cup titles',
      chain: [
        { name: 'Germany', value: 4 },
        { name: 'Brazil', value: 5 },
        { name: 'Italy', value: 4 },
        { name: 'Argentina', value: 3 },
      ],
      stepPoints: 50,
    },
    {
      type: 'mcq',
      items: [
        { prompt: 'Which country hosted the 2010 World Cup?', options: ['Brazil', 'South Africa', 'Germany', 'Japan'], correctIndex: 1 },
        { prompt: 'Which club did Pep Guardiola manage before Manchester City?', options: ['Bayern Munich', 'Barcelona', 'Roma', 'Chelsea'], correctIndex: 0 },
        { prompt: 'How many players are on the pitch per team at kickoff?', options: ['10', '11', '12', '9'], correctIndex: 1 },
        { prompt: 'Which nation has won the most Copa América titles?', options: ['Brazil', 'Chile', 'Uruguay', 'Argentina'], correctIndex: 3 },
        { prompt: 'Which goalkeeper won the 2022 World Cup Golden Glove?', options: ['Emiliano Martínez', 'Hugo Lloris', 'Thibaut Courtois', 'Yassine Bounou'], correctIndex: 0 },
      ],
    },
    {
      type: 'careerPath',
      items: [
        { clubs: ['borussia-dortmund', 'manchester-city'], options: ['Erling Haaland', 'Jadon Sancho', 'İlkay Gündoğan', 'Jude Bellingham'], correctIndex: 0 },
        { clubs: ['juventus-fc', 'bayern-munich', 'manchester-united'], options: ['Matthijs de Ligt', 'Frenkie de Jong', 'Donny van de Beek', 'Antony'], correctIndex: 0 },
        { clubs: ['as-roma', 'liverpool-fc'], options: ['Mohamed Salah', 'Alisson', 'Both of them', 'Neither'], correctIndex: 2 },
        { clubs: ['atletico-de-madrid', 'fc-barcelona', 'atletico-de-madrid'], options: ['Antoine Griezmann', 'João Félix', 'Luis Suárez', 'Diego Costa'], correctIndex: 0 },
        { clubs: ['tottenham-hotspur', 'bayern-munich'], options: ['Harry Kane', 'Son Heung-min', 'Gareth Bale', 'Dele Alli'], correctIndex: 0 },
      ],
    },
    {
      type: 'whoAmI',
      clues: [
        'I am a goalkeeper.',
        'I won the Champions League with two different clubs.',
        'I captained Italy.',
        'I spent two decades at Juventus.',
        'I won the World Cup in 2006.',
      ],
      options: ['Iker Casillas', 'Gianluigi Buffon', 'Manuel Neuer', 'Petr Čech'],
      correctIndex: 1,
      cluePoints: [100, 80, 60, 40, 20],
    },
  ],
  [
    {
      type: 'trueFalse',
      items: [
        { statement: 'The 2026 World Cup will be hosted by three countries.', answer: true },
        { statement: 'Liverpool play their home games at Anfield.', answer: true },
        { statement: 'A penalty shootout starts with five kicks per team.', answer: true },
        { statement: 'Barcelona have never been relegated from La Liga.', answer: true },
        { statement: 'The Ballon d’Or is awarded to the best club of the year.', answer: false },
      ],
    },
    {
      type: 'higherLower',
      statLabel: 'Premier League titles',
      chain: [
        { name: 'Manchester United', value: 13 },
        { name: 'Arsenal', value: 3 },
        { name: 'Manchester City', value: 8 },
        { name: 'Chelsea', value: 5 },
      ],
      stepPoints: 50,
    },
    {
      type: 'mcq',
      items: [
        { prompt: 'Who won the Ballon d’Or in 2024?', options: ['Vinícius Júnior', 'Jude Bellingham', 'Rodri', 'Erling Haaland'], correctIndex: 2 },
        { prompt: 'Which club has won the most Serie A titles?', options: ['Inter Milan', 'Juventus', 'AC Milan', 'Napoli'], correctIndex: 1 },
        { prompt: 'Where was the 2014 World Cup held?', options: ['Brazil', 'Russia', 'Qatar', 'South Africa'], correctIndex: 0 },
        { prompt: 'Which Georgian club has won the most national titles?', options: ['Torpedo Kutaisi', 'Saburtalo', 'Dinamo Tbilisi', 'Dila Gori'], correctIndex: 2 },
        { prompt: 'How long is a standard match, excluding stoppage time?', options: ['80 minutes', '90 minutes', '100 minutes', '120 minutes'], correctIndex: 1 },
      ],
    },
    {
      type: 'careerPath',
      items: [
        { clubs: ['ssc-napoli', 'paris-saint-germain'], options: ['Georges Mikautadze', 'Khvicha Kvaratskhelia', 'Giorgi Chakvetadze', 'Zuriko Davitashvili'], correctIndex: 1 },
        { clubs: ['sevilla-fc', 'liverpool-fc', 'bayern-munich'], options: ['Sadio Mané', 'Naby Keïta', 'Roberto Firmino', 'Konrad Laimer'], correctIndex: 0 },
        { clubs: ['juventus-fc', 'chelsea-fc'], options: ['Gonzalo Higuaín', 'Álvaro Morata', 'Juan Cuadrado', 'Federico Chiesa'], correctIndex: 1 },
        { clubs: ['real-madrid', 'juventus-fc'], options: ['Cristiano Ronaldo', 'Gonzalo Higuaín', 'Both of them', 'Neither'], correctIndex: 2 },
        { clubs: ['borussia-dortmund', 'real-madrid'], options: ['Jude Bellingham', 'Erling Haaland', 'Christian Pulisic', 'Marco Reus'], correctIndex: 0 },
      ],
    },
    {
      type: 'whoAmI',
      clues: [
        'I scored in a World Cup final as a teenager.',
        'I have won Ligue 1 many times.',
        'I left PSG on a free transfer.',
        'I now play for Real Madrid.',
        'I captain France.',
      ],
      options: ['Antoine Griezmann', 'Karim Benzema', 'Kylian Mbappé', 'Ousmane Dembélé'],
      correctIndex: 2,
      cluePoints: [100, 80, 60, 40, 20],
    },
  ],
];

// ── Deterministic field simulation ──────────────────────────────────────────
// No Math.random: everything derives from (game, round, bot index) so renders
// are stable and the whole flow can be replayed.

function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const FIRST = ['Kvaro', 'Gio', 'Nika', 'Beso', 'Dato', 'Luka', 'Saba', 'Zura', 'Lasha', 'Vano', 'Goga', 'Tazo', 'Rezo', 'Shota', 'Guram', 'Irakli', 'Otar', 'Levan', 'Beka', 'Tornike'];
const LAST = ['7', '10', 'GOAT', 'Pro', 'X', 'Geo', 'King', 'Boss', 'Star', '99', 'FC', 'Ball', 'Goal', 'Ace', '11'];

export function botName(i: number): string {
  return `${FIRST[i % FIRST.length]}${LAST[Math.floor(i / FIRST.length) % LAST.length]}${i > 299 ? Math.floor(i / 300) : ''}`;
}

/** Bot quality 0..1 — fixed per bot, reshuffled per game so each field feels new. */
function botQuality(game: number, bot: number): number {
  return rand(game * 1000 + bot * 7 + 1);
}

/** A bot's cumulative score after `roundsDone` rounds of a game. */
export function botScore(game: number, bot: number, roundsDone: number): number {
  const q = botQuality(game, bot);
  let score = 0;
  for (let r = 0; r < roundsDone; r++) {
    const max = ROUNDS[r].maxPoints;
    const luck = rand(game * 5000 + r * 613 + bot * 13 + 2);
    // Correct-rate rises with quality; earned points scale with both.
    const answeredCorrectly = luck < 0.35 + q * 0.55;
    if (answeredCorrectly) score += Math.round(max * (0.45 + 0.5 * (0.3 * luck + 0.7 * q)));
  }
  return score;
}

/** Number of bots in this game's field (you occupy one slot). */
export function fieldBots(game: number, games: GameDef[] = GAMES): number {
  return games[game].players - 1;
}

/** Your rank in the field given your cumulative score after `roundsDone` rounds. */
export function rankForScore(
  game: number,
  roundsDone: number,
  yourScore: number,
  games: GameDef[] = GAMES,
): number {
  const bots = fieldBots(game, games);
  let ahead = 0;
  for (let i = 0; i < bots; i++) {
    if (botScore(game, i, roundsDone) > yourScore) ahead++;
  }
  return ahead + 1;
}

/** Sorted field rows (bots + you) around the standings we need to show. */
export function buildStandings(
  game: number,
  roundsDone: number,
  yourScore: number,
  games: GameDef[] = GAMES,
): StandingsRow[] {
  const bots = fieldBots(game, games);
  const rows: StandingsRow[] = [];
  for (let i = 0; i < bots; i++) {
    rows.push({ rank: 0, name: botName(i), score: botScore(game, i, roundsDone) });
  }
  rows.push({ rank: 0, name: 'You', score: yourScore, isYou: true });
  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

/** Answer-split percentages for the reveal — deterministic per (game, round). */
export function answerDistribution(game: number, round: number, optionCount: number, correctIndex: number) {
  const correctPct = 38 + Math.round(rand(game * 97 + round * 31 + 5) * 40); // 38..78
  const noAnswerPct = 3 + Math.round(rand(game * 53 + round * 17 + 9) * 7); // 3..10
  let remaining = 100 - correctPct - noAnswerPct;
  const wrong: number[] = [];
  let wrongCount = optionCount - 1;
  for (let i = 0; i < optionCount; i++) {
    if (i === correctIndex) continue;
    if (wrongCount === 1) {
      wrong.push(remaining);
    } else {
      const share = Math.round(remaining * (0.3 + rand(game * 11 + round * 7 + i) * 0.5));
      wrong.push(Math.min(share, remaining));
      remaining -= Math.min(share, remaining);
    }
    wrongCount--;
  }
  const perOption: number[] = [];
  let w = 0;
  for (let i = 0; i < optionCount; i++) {
    perOption.push(i === correctIndex ? correctPct : wrong[w++] ?? 0);
  }
  return { correctPct, noAnswerPct, wrongPct: 100 - correctPct - noAnswerPct, perOption };
}

/**
 * Live drift for the spectator board: on each tick a rotating slice of the field
 * posts points and the board re-sorts, so watchers see positions change during a
 * round instead of only between rounds. Deterministic in `tick`.
 */
export function applyLiveDrift(
  rows: StandingsRow[],
  game: number,
  round: number,
  tick: number,
): StandingsRow[] {
  const moved = rows.map((r, i) => {
    const answers = (i + tick * 3) % 4 === 0;
    if (!answers) return r;
    const gain = Math.round(ROUNDS[round].maxPoints / 5) * (rand(game * 31 + round * 17 + i + tick) < 0.62 ? 1 : 0);
    return gain > 0 ? { ...r, score: r.score + gain } : r;
  });
  moved.sort((a, b) => b.score - a.score);
  return moved.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** The stepped count used by the elimination animation, e.g. 600 → … → 200. */
export function eliminationSteps(from: number, to: number): number[] {
  const steps = [from];
  const n = 5;
  for (let i = 1; i < n; i++) {
    const f = i / n;
    const eased = 1 - Math.pow(1 - f, 2);
    steps.push(Math.round(from - (from - to) * eased));
  }
  steps.push(to);
  return steps;
}
