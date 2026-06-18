import type { Footballer, Formation, AuctionPlayer, AuctionTeam, PositionGroup } from './types';

export const STARTING_BUDGET = 1_000_000_000;
export const BID_COUNTDOWN_MS = 10_000;
export const MIN_BID_INCREMENT = 5_000_000;
// Delay between each clue reveal during the pre-bid clue-reveal phase.
// One extra tick of this duration is added after the last clue so players have
// a beat to read it before bidding opens.
export const CLUE_REVEAL_INTERVAL_MS = 2500;

// Placeholder face for a footballer. The structure supports a real photo via
// the `imageUrl` field on Footballer; this is just the stand-in until we wire
// up actual portraits.
export function getFootballerPlaceholderImage(id: string): string {
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(id)}&radius=50`;
}

export const FORMATIONS: Formation[] = [
  {
    name: '4-3-3',
    required: { GK: 1, DEF: 4, MID: 3, FWD: 3 },
    rows: [
      { pos: 'FWD', count: 3 },
      { pos: 'MID', count: 3 },
      { pos: 'DEF', count: 4 },
      { pos: 'GK', count: 1 },
    ],
  },
  {
    name: '4-4-2',
    required: { GK: 1, DEF: 4, MID: 4, FWD: 2 },
    rows: [
      { pos: 'FWD', count: 2 },
      { pos: 'MID', count: 4 },
      { pos: 'DEF', count: 4 },
      { pos: 'GK', count: 1 },
    ],
  },
  {
    name: '3-5-2',
    required: { GK: 1, DEF: 3, MID: 5, FWD: 2 },
    rows: [
      { pos: 'FWD', count: 2 },
      { pos: 'MID', count: 5 },
      { pos: 'DEF', count: 3 },
      { pos: 'GK', count: 1 },
    ],
  },
  {
    name: '4-2-3-1',
    required: { GK: 1, DEF: 4, MID: 5, FWD: 1 },
    rows: [
      { pos: 'FWD', count: 1 },
      { pos: 'MID', count: 3 },
      { pos: 'MID', count: 2 },
      { pos: 'DEF', count: 4 },
      { pos: 'GK', count: 1 },
    ],
  },
  {
    name: '3-4-3',
    required: { GK: 1, DEF: 3, MID: 4, FWD: 3 },
    rows: [
      { pos: 'FWD', count: 3 },
      { pos: 'MID', count: 4 },
      { pos: 'DEF', count: 3 },
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

// Inject a placeholder portrait for each mocked footballer. When real photo
// URLs land they can be added directly to RAW_FOOTBALLERS entries and will
// override the placeholder via the `??` fallback below.
export const FOOTBALLERS: Footballer[] = RAW_FOOTBALLERS.map((f) => ({
  ...f,
  imageUrl: f.imageUrl ?? getFootballerPlaceholderImage(f.id),
}));

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

export function needsPosition(player: AuctionPlayer, pos: PositionGroup): boolean {
  return player.team.slots[pos].length < player.team.formation.required[pos];
}

export function isTeamComplete(team: AuctionTeam): boolean {
  return getFilledCount(team) >= 11;
}

export const MIN_PLAYER_COST = 20_000_000;

export function getMaxBid(player: AuctionPlayer): number {
  const remaining = getRemainingSlots(player.team);
  const emptySlots = Object.values(remaining).reduce((s, v) => s + v, 0);
  if (emptySlots <= 1) return player.budget;
  return Math.max(0, player.budget - (emptySlots - 1) * MIN_PLAYER_COST);
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

export const POSITION_LABELS: Record<PositionGroup, string> = {
  GK: 'Goalkeeper',
  DEF: 'Defender',
  MID: 'Midfielder',
  FWD: 'Forward',
};

export const POSITION_ORDER: PositionGroup[] = ['GK', 'DEF', 'MID', 'FWD'];
