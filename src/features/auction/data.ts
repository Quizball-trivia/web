import type { Footballer, Formation, AuctionPlayer, AuctionTeam, PositionGroup, SeasonSnapshot } from './types';
import { randomBotAvatar } from './data/botAvatars';

// 7-a-side squads. Budget tuned so you can't buy every star: ~7 slots, player
// values run 90–200M, so 350M forces real trade-offs (a couple of premiums +
// cheaper fills) rather than the old 1B free-for-all.
export const AUCTION_SQUAD_SIZE = 7;
/** Mirrors AUCTION_SOLO_PICK_TIMEOUT_MS server-side: the pick auto-resolves
 *  to the default option when this window expires. */
export const SOLO_PICK_MS = 10_000;
export const STARTING_BUDGET = 350_000_000;
// Every raise is exactly one increment — the bid surface is a single "+10M"
// button. Mirrors MIN_BID_INCREMENT in the backend auction constants.
export const MIN_BID_INCREMENT = 10_000_000;
// Turn time limits: the opener (first turn, no standing bid) gets longer to read
// the clues and decide; every turn after is fast. Shared by the game hook (timer
// scheduling) and the UI (countdown bar) so they can never drift.
export const OPENING_TURN_MS = 30_000;
export const RAISE_TURN_MS = 15_000;
// Bot deliberation before it bids or folds. Mirrors AUCTION_BOT_MIN/MAX_THINK_MS
// in the backend bot service — long enough that bidding reads as a contest, and
// comfortably inside RAISE_TURN_MS so a bot never times its own turn out.
export const BOT_MIN_THINK_MS = 2_000;
export const BOT_MAX_THINK_MS = 5_000;
// Delay between each stat/clue reveal during the pre-bid phase: stats drip onto
// the board one by one, then CLUE_STUDY_MS runs before bidding opens. Shorter now
// that a lot reveals ~5 individual stats rather than 3 long clue sentences.
export const CLUE_REVEAL_INTERVAL_MS = 2000;
export const CLUE_STUDY_MS = 10_000;

/** The season stats revealed one-by-one for a scouting lot, in reveal order.
 *  Drives the reveal-step count for footballers that have `snapshots`. */
export const SNAPSHOT_STAT_STEPS = ['Goals', 'Assists', 'Market value', 'Age', 'League'] as const;

// Placeholder face for a footballer. The structure supports a real photo via
// the `imageUrl` field on Footballer; this is just the stand-in until we wire
// up actual portraits.
export function getFootballerPlaceholderImage(id: string): string {
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(id)}&radius=50`;
}

// Fixed 7-a-side shape: 2 FWD · 2 MID · 2 DEF · 1 GK. `required` is the per-group
// total the game logic relies on (sums to AUCTION_SQUAD_SIZE); `rows` is display-
// only, top (FWD) → bottom (GK), so the pitch renders the recognisable shape.
export const FORMATIONS: Formation[] = [
  {
    name: '2-2-2',
    required: { GK: 1, DEF: 2, MID: 2, FWD: 2 },
    rows: [
      { pos: 'FWD', count: 2 },
      { pos: 'MID', count: 2 },
      { pos: 'DEF', count: 2 },
      { pos: 'GK', count: 1 },
    ],
  },
];

const RAW_FOOTBALLERS: Footballer[] = [
  // Goalkeepers
  {
    id: 'gk-buffon',
    name: 'Gianluigi Buffon',
    positionGroup: 'GK',
    value: 120_000_000,
    startingPrice: 30_000_000,
    clues: [
      'Started his professional career as a teenager at Parma',
      'Holds the record for most Serie A appearances',
      'Won the 2006 World Cup as the starting goalkeeper',
    ],
    nationality: 'Italy',
  },
  {
    id: 'gk-neuer',
    name: 'Manuel Neuer',
    positionGroup: 'GK',
    value: 110_000_000,
    startingPrice: 25_000_000,
    clues: [
      'Revolutionized the sweeper-keeper role in modern football',
      'Won the 2014 World Cup with Germany',
      'Spent his entire peak at Bayern Munich',
    ],
    nationality: 'Germany',
  },
  {
    id: 'gk-yashin',
    name: 'Lev Yashin',
    positionGroup: 'GK',
    value: 100_000_000,
    startingPrice: 20_000_000,
    clues: [
      'The only goalkeeper to ever win the Ballon d\'Or',
      'Known as the "Black Spider" for his all-black outfit',
      'Saved over 150 penalty kicks in his career',
    ],
    nationality: 'Soviet Union',
  },
  {
    id: 'gk-casillas',
    name: 'Iker Casillas',
    positionGroup: 'GK',
    value: 95_000_000,
    startingPrice: 20_000_000,
    clues: [
      'Won the World Cup, and two European Championships',
      'Became Real Madrid\'s youngest-ever first-choice keeper at 18',
      'Made a legendary save in the 2010 World Cup final',
    ],
    nationality: 'Spain',
  },

  // Defenders
  {
    id: 'def-maldini',
    name: 'Paolo Maldini',
    positionGroup: 'DEF',
    value: 180_000_000,
    startingPrice: 40_000_000,
    clues: [
      'Spent his entire 25-year career at one club',
      'Could play both left-back and centre-back at the highest level',
      'Five-time Champions League winner with AC Milan',
    ],
    nationality: 'Italy',
  },
  {
    id: 'def-beckenbauer',
    name: 'Franz Beckenbauer',
    positionGroup: 'DEF',
    value: 200_000_000,
    startingPrice: 50_000_000,
    clues: [
      'Invented the modern libero/sweeper role',
      'Won the World Cup as both player and manager',
      'Known as "Der Kaiser"',
    ],
    nationality: 'Germany',
  },
  {
    id: 'def-carlos',
    name: 'Roberto Carlos',
    positionGroup: 'DEF',
    value: 140_000_000,
    startingPrice: 30_000_000,
    clues: [
      'Famous for his powerful free kicks that bent impossibly',
      'Won three Champions League titles with Real Madrid',
      'Part of Brazil\'s 2002 World Cup winning squad',
    ],
    nationality: 'Brazil',
  },
  {
    id: 'def-cafu',
    name: 'Cafu',
    positionGroup: 'DEF',
    value: 130_000_000,
    startingPrice: 30_000_000,
    clues: [
      'The only player to appear in three consecutive World Cup finals',
      'Won the World Cup twice with Brazil',
      'Known as "Il Pendolino" for his tireless runs',
    ],
    nationality: 'Brazil',
  },
  {
    id: 'def-ramos',
    name: 'Sergio Ramos',
    positionGroup: 'DEF',
    value: 125_000_000,
    startingPrice: 25_000_000,
    clues: [
      'Scored a famous 93rd-minute header in a Champions League final',
      'Won four Champions League titles and a World Cup',
      'Known for his leadership and last-minute goals',
    ],
    nationality: 'Spain',
  },
  {
    id: 'def-cannavaro',
    name: 'Fabio Cannavaro',
    positionGroup: 'DEF',
    value: 115_000_000,
    startingPrice: 25_000_000,
    clues: [
      'Won the Ballon d\'Or as a defender — one of the rarest achievements',
      'Captained Italy to World Cup glory in 2006',
      'Small in stature but dominant in the air',
    ],
    nationality: 'Italy',
  },
  {
    id: 'def-lahm',
    name: 'Philipp Lahm',
    positionGroup: 'DEF',
    value: 110_000_000,
    startingPrice: 25_000_000,
    clues: [
      'Could play full-back on either side or in midfield',
      'Captained Germany to the 2014 World Cup title',
      'Retired at the top after winning the treble with Bayern Munich',
    ],
    nationality: 'Germany',
  },

  // Midfielders
  {
    id: 'mid-zidane',
    name: 'Zinedine Zidane',
    positionGroup: 'MID',
    value: 250_000_000,
    startingPrice: 60_000_000,
    clues: [
      'Scored two headers in a World Cup final',
      'His last act in professional football was a red card in the 2006 final',
      'Won the Champions League with a stunning volley in the final',
    ],
    nationality: 'France',
  },
  {
    id: 'mid-iniesta',
    name: 'Andrés Iniesta',
    positionGroup: 'MID',
    value: 160_000_000,
    startingPrice: 35_000_000,
    clues: [
      'Scored the winning goal in a World Cup final',
      'Master of tiki-taka football at Barcelona',
      'Won four Champions League titles and a World Cup',
    ],
    nationality: 'Spain',
  },
  {
    id: 'mid-modric',
    name: 'Luka Modrić',
    positionGroup: 'MID',
    value: 140_000_000,
    startingPrice: 30_000_000,
    clues: [
      'Won the Ballon d\'Or breaking the Messi-Ronaldo duopoly',
      'Led his small nation to a World Cup final',
      'Won five Champions League titles with Real Madrid',
    ],
    nationality: 'Croatia',
  },
  {
    id: 'mid-xavi',
    name: 'Xavi Hernández',
    positionGroup: 'MID',
    value: 150_000_000,
    startingPrice: 35_000_000,
    clues: [
      'The brain behind Spain\'s tiki-taka era',
      'Won the World Cup, two Euros, and four Champions Leagues',
      'Known for his incredible passing accuracy',
    ],
    nationality: 'Spain',
  },
  {
    id: 'mid-matthaus',
    name: 'Lothar Matthäus',
    positionGroup: 'MID',
    value: 130_000_000,
    startingPrice: 30_000_000,
    clues: [
      'Holds the record for most World Cup appearances',
      'Won the first-ever FIFA World Player of the Year award',
      'Captain of Germany\'s 1990 World Cup-winning team',
    ],
    nationality: 'Germany',
  },
  {
    id: 'mid-maradona',
    name: 'Diego Maradona',
    positionGroup: 'MID',
    value: 300_000_000,
    startingPrice: 70_000_000,
    clues: [
      'Scored both the "Hand of God" and "Goal of the Century" in the same match',
      'Single-handedly carried his nation to World Cup glory in 1986',
      'Turned Napoli into Italian champions for the first time ever',
    ],
    nationality: 'Argentina',
  },
  {
    id: 'mid-cruijff',
    name: 'Johan Cruyff',
    positionGroup: 'MID',
    value: 220_000_000,
    startingPrice: 50_000_000,
    clues: [
      'Pioneer of "Total Football" who revolutionized the game',
      'Three-time Ballon d\'Or winner',
      'Famous for a signature turn that bears his name',
    ],
    nationality: 'Netherlands',
  },

  // Forwards
  {
    id: 'fwd-pele',
    name: 'Pelé',
    positionGroup: 'FWD',
    value: 300_000_000,
    startingPrice: 70_000_000,
    clues: [
      'The only player to win three World Cups',
      'Scored over 1,000 official career goals',
      'Known as "O Rei" — The King of Football',
    ],
    nationality: 'Brazil',
  },
  {
    id: 'fwd-messi',
    name: 'Lionel Messi',
    positionGroup: 'FWD',
    value: 280_000_000,
    startingPrice: 65_000_000,
    clues: [
      'Won the World Cup in 2022, completing football',
      'Eight-time Ballon d\'Or winner',
      'Scored 91 goals in a single calendar year',
    ],
    nationality: 'Argentina',
  },
  {
    id: 'fwd-ronaldo',
    name: 'Cristiano Ronaldo',
    positionGroup: 'FWD',
    value: 250_000_000,
    startingPrice: 60_000_000,
    clues: [
      'All-time top scorer in Champions League history',
      'Won league titles in England, Spain, and Italy',
      'Led his nation to their first-ever European Championship',
    ],
    nationality: 'Portugal',
  },
  {
    id: 'fwd-r9',
    name: 'Ronaldo Nazário',
    positionGroup: 'FWD',
    value: 260_000_000,
    startingPrice: 60_000_000,
    clues: [
      'Won two World Cups and scored 15 World Cup goals',
      'Known as "O Fenômeno" for his otherworldly talent',
      'Won the Ballon d\'Or twice before turning 22',
    ],
    nationality: 'Brazil',
  },
  {
    id: 'fwd-mbappe',
    name: 'Kylian Mbappé',
    positionGroup: 'FWD',
    value: 200_000_000,
    startingPrice: 45_000_000,
    clues: [
      'Became the youngest French player to score at a World Cup',
      'Scored a hat trick in a World Cup final',
      'Won four consecutive Ligue 1 titles before moving to Spain',
    ],
    nationality: 'France',
  },
  {
    id: 'fwd-henry',
    name: 'Thierry Henry',
    positionGroup: 'FWD',
    value: 170_000_000,
    startingPrice: 35_000_000,
    clues: [
      'Arsenal\'s all-time leading scorer',
      'Won the World Cup, Euro, and the Premier League unbeaten season',
      'Converted from a winger to a striker by Arsène Wenger',
    ],
    nationality: 'France',
  },
  {
    id: 'fwd-muller',
    name: 'Gerd Müller',
    positionGroup: 'FWD',
    value: 180_000_000,
    startingPrice: 40_000_000,
    clues: [
      'Known as "Der Bomber" for his incredible goal-scoring record',
      'Scored 14 World Cup goals in just 13 matches',
      'His record of 85 goals in a calendar year stood for 40 years',
    ],
    nationality: 'Germany',
  },
  {
    id: 'fwd-ronaldinho',
    name: 'Ronaldinho',
    positionGroup: 'FWD',
    value: 190_000_000,
    startingPrice: 40_000_000,
    clues: [
      'Won the World Cup in 2002 and the Ballon d\'Or in 2005',
      'Received a standing ovation from Real Madrid fans at the Bernabéu',
      'Famous for his joyful playing style and incredible skill moves',
    ],
    nationality: 'Brazil',
  },
];

// Club + league for each legend, feeding the two non-nation chemistry
// dimensions. Clubs are chosen to (a) be the player's most iconic side and
// (b) resolve to a real crest in clubs.json via getClub(). Assignments cluster
// on purpose so chemistry is actually reachable in an 11-man squad — e.g. Real
// Madrid, Bayern and Barcelona each recur several times, and La Liga / Serie A /
// Bundesliga dominate the league links. Yashin has no club in our crest set, so
// he is intentionally left blank (club/league contribute 0, flag simply hides).
const SQUAD_META_BY_ID: Record<string, { club: string; league: string }> = {
  // GK
  'gk-buffon': { club: 'Juventus', league: 'Serie A' },
  'gk-neuer': { club: 'FC Bayern Munich', league: 'Bundesliga' },
  'gk-casillas': { club: 'Real Madrid CF', league: 'La Liga' },
  // DEF
  'def-maldini': { club: 'AC Milan', league: 'Serie A' },
  'def-beckenbauer': { club: 'FC Bayern Munich', league: 'Bundesliga' },
  'def-carlos': { club: 'Real Madrid CF', league: 'La Liga' },
  'def-cafu': { club: 'AC Milan', league: 'Serie A' },
  'def-ramos': { club: 'Real Madrid CF', league: 'La Liga' },
  'def-cannavaro': { club: 'Juventus', league: 'Serie A' },
  'def-lahm': { club: 'FC Bayern Munich', league: 'Bundesliga' },
  // MID
  'mid-zidane': { club: 'Real Madrid CF', league: 'La Liga' },
  'mid-iniesta': { club: 'FC Barcelona', league: 'La Liga' },
  'mid-modric': { club: 'Real Madrid CF', league: 'La Liga' },
  'mid-xavi': { club: 'FC Barcelona', league: 'La Liga' },
  'mid-matthaus': { club: 'FC Bayern Munich', league: 'Bundesliga' },
  'mid-maradona': { club: 'SSC Napoli', league: 'Serie A' },
  'mid-cruijff': { club: 'AFC Ajax', league: 'Eredivisie' },
  // FWD
  'fwd-pele': { club: 'Santos FC', league: 'Brasileirão' },
  'fwd-messi': { club: 'FC Barcelona', league: 'La Liga' },
  'fwd-ronaldo': { club: 'Real Madrid CF', league: 'La Liga' },
  'fwd-r9': { club: 'Inter Milan', league: 'Serie A' },
  'fwd-mbappe': { club: 'Paris Saint-Germain', league: 'Ligue 1' },
  'fwd-henry': { club: 'Arsenal', league: 'Premier League' },
  'fwd-muller': { club: 'FC Bayern Munich', league: 'Bundesliga' },
  'fwd-ronaldinho': { club: 'FC Barcelona', league: 'La Liga' },
};

// Anonymised older-season stat lines (the "scouting" clue format). Club is never
// included; league gives level+region; the that-season value is a weak proxy for
// today's value. Authored for modern forwards (market-value era); players without
// an entry fall back to their text clues.
const SNAPSHOTS_BY_ID: Record<string, SeasonSnapshot[]> = {
  'fwd-messi': [
    { season: '2006/07', league: 'La Liga', age: 19, apps: 26, goals: 14, assists: 3, valueEur: 26_000_000 },
    { season: '2009/10', league: 'La Liga', age: 22, apps: 35, goals: 34, assists: 11, valueEur: 80_000_000 },
    { season: '2012/13', league: 'La Liga', age: 25, apps: 32, goals: 46, assists: 12, valueEur: 120_000_000 },
  ],
  'fwd-ronaldo': [
    { season: '2006/07', league: 'Premier League', age: 21, apps: 34, goals: 17, assists: 8, valueEur: 50_000_000 },
    { season: '2010/11', league: 'La Liga', age: 25, apps: 34, goals: 40, assists: 10, valueEur: 110_000_000 },
    { season: '2013/14', league: 'La Liga', age: 28, apps: 30, goals: 31, assists: 9, valueEur: 100_000_000 },
  ],
  'fwd-r9': [
    { season: '1997/98', league: 'Serie A', age: 21, apps: 32, goals: 25, assists: 7, valueEur: 45_000_000 },
    { season: '2002/03', league: 'La Liga', age: 26, apps: 31, goals: 23, assists: 6, valueEur: 75_000_000 },
    { season: '2004/05', league: 'La Liga', age: 28, apps: 34, goals: 21, assists: 5, valueEur: 50_000_000 },
  ],
  'fwd-mbappe': [
    { season: '2017/18', league: 'Ligue 1', age: 19, apps: 27, goals: 13, assists: 8, valueEur: 120_000_000 },
    { season: '2019/20', league: 'Ligue 1', age: 21, apps: 17, goals: 18, assists: 5, valueEur: 180_000_000 },
    { season: '2021/22', league: 'Ligue 1', age: 23, apps: 35, goals: 28, assists: 17, valueEur: 160_000_000 },
  ],
  'fwd-henry': [
    { season: '1999/00', league: 'Premier League', age: 22, apps: 31, goals: 17, assists: 5, valueEur: 30_000_000 },
    { season: '2003/04', league: 'Premier League', age: 26, apps: 37, goals: 30, assists: 20, valueEur: 70_000_000 },
    { season: '2005/06', league: 'Premier League', age: 28, apps: 32, goals: 27, assists: 9, valueEur: 50_000_000 },
  ],
  'fwd-ronaldinho': [
    { season: '2003/04', league: 'La Liga', age: 23, apps: 32, goals: 15, assists: 8, valueEur: 45_000_000 },
    { season: '2005/06', league: 'La Liga', age: 25, apps: 29, goals: 17, assists: 11, valueEur: 75_000_000 },
    { season: '2007/08', league: 'La Liga', age: 27, apps: 18, goals: 8, assists: 6, valueEur: 40_000_000 },
  ],
};

// Inject club/league (chemistry dimensions), season snapshots, and a placeholder
// portrait for each mocked footballer. Real photo URLs / club / league can be set
// directly on a RAW_FOOTBALLERS entry and will take precedence over these fallbacks.
/** Stable small string hash → non-negative int (for deterministic mock variety). */
export function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Position-appropriate output ranges [young, mid, peak] for generated snapshots
// so the goals/assists themselves read as a positional hint.
const POS_OUTPUT: Record<PositionGroup, { g: [number, number, number]; a: [number, number, number] }> = {
  GK: { g: [0, 0, 0], a: [0, 1, 1] },
  DEF: { g: [1, 2, 3], a: [1, 2, 3] },
  MID: { g: [4, 7, 9], a: [4, 6, 8] },
  FWD: { g: [10, 18, 24], a: [4, 7, 10] },
};

/** Plausible 3-season scouting history for players without authored snapshots, so
 *  every lot uses the scouting format. Since the clue phase shows the EARLIEST
 *  season and scoring uses the LATEST one, the shape of the trajectory IS the
 *  gamble: ~1 in 3 generated players DECLINE (a hot, expensive early season that
 *  fades to a low later value — overpay on that form and you lose), the rest
 *  RISE (a cheap early season that grows). Seasons are generic (mock) — a real
 *  DB would carry true history. */
function generateSnapshots(f: Footballer, league: string): SeasonSnapshot[] {
  const h = hashId(f.id);
  const startAge = 18 + (h % 3);
  const startYear = 2010 + (h % 7);
  const out = POS_OUTPUT[f.positionGroup];
  const isGk = f.positionGroup === 'GK';
  const declining = h % 3 === 0;
  // Risers back-cast up to ~85% of peak value; decliners start hot (~95%) then
  // sink well below it. Output & keeper stats follow the same direction so the
  // whole clue line tells one coherent story (rising star vs faded talent).
  const mult = declining ? [0.95, 0.55, 0.3] : [0.18, 0.55, 0.85];
  const goalsByYear = declining ? [out.g[2], out.g[1], out.g[0]] : out.g;
  const assistsByYear = declining ? [out.a[2], out.a[1], out.a[0]] : out.a;
  const cleanSheetsByYear = declining ? [15, 11, 7] : [8, 12, 15];
  const concededByYear = declining ? [22, 29, 38] : [34, 27, 21];
  return [0, 1, 2].map((i) => {
    const year = startYear + i * 3;
    return {
      season: `${year}/${String((year + 1) % 100).padStart(2, '0')}`,
      league,
      age: startAge + i * 3,
      apps: 26 + ((h >> i) % 12),
      goals: goalsByYear[i],
      assists: assistsByYear[i],
      ...(isGk ? { cleanSheets: cleanSheetsByYear[i], conceded: concededByYear[i] } : {}),
      valueEur: Math.max(1_000_000, Math.round((f.value * mult[i]) / 5_000_000) * 5_000_000),
    };
  });
}

export const FOOTBALLERS: Footballer[] = RAW_FOOTBALLERS.map((f) => {
  const club = f.club ?? SQUAD_META_BY_ID[f.id]?.club ?? null;
  const league = f.league ?? SQUAD_META_BY_ID[f.id]?.league ?? null;
  // Authored snapshots win; otherwise generate so every position uses the format.
  const snapshots = f.snapshots ?? SNAPSHOTS_BY_ID[f.id] ?? generateSnapshots({ ...f, club, league }, league ?? 'Top division');
  return {
    ...f,
    club,
    league,
    snapshots,
    // A scouting lot reveals one season's stats one-by-one, so its reveal-step
    // count is the number of stat facets.
    clues: [...SNAPSHOT_STAT_STEPS],
    imageUrl: f.imageUrl ?? getFootballerPlaceholderImage(f.id),
  };
});

export const BOT_PLAYERS: Omit<AuctionPlayer, 'budget' | 'team' | 'isEliminated'>[] = [
  { id: 'bot-1', username: 'CarlosGol99', avatarSeed: 'avatar-2', isBot: true },
  { id: 'bot-2', username: 'FutbolMaster', avatarSeed: 'avatar-3', isBot: true },
  { id: 'bot-3', username: 'GoalHunter', avatarSeed: 'avatar-5', isBot: true },
];

export function createEmptyTeam(formation: Formation): AuctionTeam {
  return {
    formation,
    slots: { GK: [], DEF: [], MID: [], FWD: [] },
  };
}

export function createBotPlayer(
  bot: typeof BOT_PLAYERS[number],
  formation: Formation,
): AuctionPlayer {
  return {
    ...bot,
    avatarCustomization: randomBotAvatar(bot.id),
    budget: STARTING_BUDGET,
    team: createEmptyTeam(formation),
    isEliminated: false,
  };
}

export function getRandomFormation(): Formation {
  return FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
}

export function getFilledCount(team: AuctionTeam): number {
  return Object.values(team.slots).reduce((sum, arr) => sum + arr.length, 0);
}

export function getRemainingSlots(team: AuctionTeam): Record<PositionGroup, number> {
  const req = team.formation.required;
  return {
    GK: Math.max(0, req.GK - team.slots.GK.length),
    DEF: Math.max(0, req.DEF - team.slots.DEF.length),
    MID: Math.max(0, req.MID - team.slots.MID.length),
    FWD: Math.max(0, req.FWD - team.slots.FWD.length),
  };
}

export function getTotalTeamValue(team: AuctionTeam): number {
  return Object.values(team.slots)
    .flat()
    .reduce((sum, f) => sum + f.value, 0);
}

// ── Squad chemistry (mirrors the backend, which is authoritative) ────────────
// FC-style chemistry on three dimensions — club, league and nation. Each of the
// 7 players earns up to 3 points from how many squadmates share their club,
// league and nation (each dimension has its own tier thresholds, FC-style). A
// player's points are the sum across the three dimensions, capped at 3; the
// squad total scales the team's value by chem ÷ 10. With a 7-a-side squad the
// max is 7 × 3 = 21 → ×2.1.

export const MAX_PLAYER_CHEMISTRY = 3;
export const MAX_SQUAD_CHEMISTRY = AUCTION_SQUAD_SIZE * MAX_PLAYER_CHEMISTRY; // 21

// Squadmate counts (including the player) needed for tier 1 / 2 / 3. Rescaled
// for a 7-player squad (you can't reach 7–8 of the same league here).
export const CLUB_CHEM_THRESHOLDS = [2, 3, 4];
export const LEAGUE_CHEM_THRESHOLDS = [2, 4, 6];
export const NATION_CHEM_THRESHOLDS = [2, 4, 6];

export type ChemDimension = 'club' | 'league' | 'nation';

export const CHEM_THRESHOLDS: Record<ChemDimension, number[]> = {
  club: CLUB_CHEM_THRESHOLDS,
  league: LEAGUE_CHEM_THRESHOLDS,
  nation: NATION_CHEM_THRESHOLDS,
};

function chemTierPoints(count: number, thresholds: number[]): number {
  return thresholds.reduce((points, threshold) => points + (count >= threshold ? 1 : 0), 0);
}

export interface SquadChemistry {
  total: number; // 0…21
  perPlayer: Record<string, number>; // footballer id → 0…3
}

function dimensionValue(f: Footballer, dim: ChemDimension): string | null {
  return dim === 'club' ? f.club ?? null : dim === 'league' ? f.league ?? null : f.nationality ?? null;
}

export function computeSquadChemistry(team: AuctionTeam): SquadChemistry {
  const squad = Object.values(team.slots).flat();
  const counts: Record<ChemDimension, Map<string, number>> = {
    club: new Map(),
    league: new Map(),
    nation: new Map(),
  };
  for (const f of squad) {
    for (const dim of ['club', 'league', 'nation'] as ChemDimension[]) {
      const key = dimensionValue(f, dim);
      if (key) counts[dim].set(key, (counts[dim].get(key) ?? 0) + 1);
    }
  }
  const perPlayer: Record<string, number> = {};
  let total = 0;
  for (const f of squad) {
    let points = 0;
    for (const dim of ['club', 'league', 'nation'] as ChemDimension[]) {
      const key = dimensionValue(f, dim);
      if (key) points += chemTierPoints(counts[dim].get(key) ?? 0, CHEM_THRESHOLDS[dim]);
    }
    const chem = Math.min(MAX_PLAYER_CHEMISTRY, points);
    perPlayer[f.id] = chem;
    total += chem;
  }
  return { total: Math.min(MAX_SQUAD_CHEMISTRY, total), perPlayer };
}

/** A shared club/league/nation link within a squad, for the breakdown UI. */
export interface ChemLink {
  dimension: ChemDimension;
  /** The shared value — club name, league name or nationality. */
  key: string;
  /** How many squad players share it. */
  count: number;
  /** Tier reached: 0 (building, not yet linked) … 3 (max). */
  tier: number;
}

export interface ChemistryBreakdown {
  total: number;
  multiplier: number;
  /** Every shared value present 2+ times, best links first (active before
   *  building, then by count). A tier-0 link is "on the way" — enough players
   *  to be worth showing, not yet enough to score. */
  links: ChemLink[];
  perPlayer: Record<string, number>;
}

/** Full chemistry with a per-link breakdown for display (flags/crests/badges). */
export function getSquadChemistryBreakdown(team: AuctionTeam): ChemistryBreakdown {
  const { total, perPlayer } = computeSquadChemistry(team);
  const squad = Object.values(team.slots).flat();
  const counts: Record<ChemDimension, Map<string, number>> = {
    club: new Map(),
    league: new Map(),
    nation: new Map(),
  };
  for (const f of squad) {
    for (const dim of ['club', 'league', 'nation'] as ChemDimension[]) {
      const key = dimensionValue(f, dim);
      if (key) counts[dim].set(key, (counts[dim].get(key) ?? 0) + 1);
    }
  }
  const links: ChemLink[] = [];
  for (const dim of ['club', 'league', 'nation'] as ChemDimension[]) {
    for (const [key, count] of counts[dim]) {
      if (count < 2) continue; // a lone player forms no link
      links.push({ dimension: dim, key, count, tier: chemTierPoints(count, CHEM_THRESHOLDS[dim]) });
    }
  }
  // Active (tier ≥ 1) before building (tier 0), then by squad count, then size.
  links.sort((a, b) => (b.tier > 0 ? 1 : 0) - (a.tier > 0 ? 1 : 0) || b.tier - a.tier || b.count - a.count);
  return { total, multiplier: chemistryMultiplier(total), links, perPlayer };
}

/** Chemistry → multiplier, a BONUS not a gate: 1 + chem/10, so no chemistry is
 *  ×1.0 (profit kept in full) and max chemistry (21) is ×3.1. Applied to profit,
 *  so chemistry rewards a good squad rather than wiping a chemistry-less one. */
export function chemistryMultiplier(totalChemistry: number): number {
  return 1 + totalChemistry / 10;
}

/** How much a footballer would raise the squad's TOTAL chemistry if added to
 *  their position — captures knock-on gains (completing a link lifts squadmates
 *  too), which is exactly the strategic signal a bidder wants. */
export function chemistryDeltaForAdding(team: AuctionTeam, footballer: Footballer): number {
  const before = computeSquadChemistry(team).total;
  const pos = footballer.positionGroup;
  const nextTeam: AuctionTeam = {
    ...team,
    slots: { ...team.slots, [pos]: [...team.slots[pos], footballer] },
  };
  return computeSquadChemistry(nextTeam).total - before;
}

/** Team value scaled by chemistry. */
export function getAdjustedTeamValue(team: AuctionTeam): number {
  return Math.round(getTotalTeamValue(team) * chemistryMultiplier(computeSquadChemistry(team).total));
}

// ── Profit scoring ───────────────────────────────────────────────────────────
// The clue phase scouts an EARLY season; scoring uses the player's LATER-season
// value. You profit by buying a player for less than they end up worth — so the
// game rewards spotting who rose (and avoiding who declined), not just who's
// famous. Final score = total profit × chemistry.

/** The later-season "sell" value used for scoring (last snapshot). Falls back to
 *  the peak `value` for players without snapshots. */
export function getFutureValue(footballer: Footballer): number {
  const snaps = footballer.snapshots;
  return snaps && snaps.length ? snaps[snaps.length - 1].valueEur : footballer.value;
}

export function getTotalFutureValue(team: AuctionTeam): number {
  return Object.values(team.slots)
    .flat()
    .reduce((sum, f) => sum + getFutureValue(f), 0);
}

/** Profit = squad's later-season value − what was paid (starting budget minus
 *  what's left). Can be negative if you overpaid or bought decliners. Uses the
 *  seat's recorded starting budget (server-sent) with a 0-clamp on spend, in
 *  parity with auction-rules.getSquadProfit — legacy states created under a
 *  different economy must not fabricate negative spend (fake profit). */
export function getSquadProfit(player: AuctionPlayer): number {
  const startingBudget = player.startingBudget ?? STARTING_BUDGET;
  const spent = Math.max(0, startingBudget - player.budget);
  return getTotalFutureValue(player.team) - spent;
}

/** Profit scaled by chemistry — the score the winner is decided on. Mirrors the
 *  server exactly: chemistry is a BONUS that amplifies gains but never deepens
 *  a loss (multiplying negative profit would rank better-linked squads lower). */
export function getAdjustedProfit(player: AuctionPlayer): number {
  const profit = getSquadProfit(player);
  if (profit <= 0) return Math.round(profit);
  return Math.round(profit * chemistryMultiplier(computeSquadChemistry(player.team).total));
}

export function needsPosition(player: AuctionPlayer, pos: PositionGroup): boolean {
  return player.team.slots[pos].length < player.team.formation.required[pos];
}

/**
 * Order players so YOU sit in the centre, with rivals split around you — the
 * layout the desktop squad grid and the stadium board both want. (The mobile
 * squad switcher uses a simpler YOU-first order.)
 */
export function orderPlayersHumanCentered(
  players: readonly AuctionPlayer[],
  humanPlayerId: string,
): AuctionPlayer[] {
  const human = players.filter((p) => p.id === humanPlayerId);
  const others = players.filter((p) => p.id !== humanPlayerId);
  const leftCount = Math.floor(others.length / 2);
  return [...others.slice(0, leftCount), ...human, ...others.slice(leftCount)];
}

export function isTeamComplete(team: AuctionTeam): boolean {
  return getFilledCount(team) >= AUCTION_SQUAD_SIZE;
}

export const MIN_PLAYER_COST = 20_000_000;

export function getMaxBid(player: AuctionPlayer): number {
  const remaining = getRemainingSlots(player.team);
  const emptySlots = Object.values(remaining).reduce((s, v) => s + v, 0);
  if (emptySlots <= 1) return player.budget;
  return Math.max(0, player.budget - (emptySlots - 1) * MIN_PLAYER_COST);
}

/** Minimum legal bid: a min-increment raise over the standing bid, or the
 *  starting price when no one has bid yet. Single source of truth shared by the
 *  bot, human-bid validation, and the bidding UI so they cannot drift. */
export function getMinBid(round: { highestBid: number; startingPrice: number }): number {
  return round.highestBid > 0 ? round.highestBid + MIN_BID_INCREMENT : round.startingPrice;
}

/** Display surname: the last whitespace-separated token of a footballer's name. */
export function lastName(name: string): string {
  return name.split(' ').pop() ?? name;
}

export function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return `$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `$${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

export const POSITION_ORDER: PositionGroup[] = ['GK', 'DEF', 'MID', 'FWD'];
