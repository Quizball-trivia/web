// Hardcoded prototype data — Draft Battle, rebuilt as a copy of Drafted
// (playdrafted.app): spin a wheel of legendary European squads, draft one
// player per position from whichever squad the wheel lands on (limited
// re-spins), draft a manager whose trait bends the match engine, then chase
// the cup through a simulated QF → SF → Final run.
// NOTE: unlike the other lab modes, the winner here IS ratings+sim driven —
// owner explicitly opted into copying Drafted's engine for this prototype.
// Ratings are invented prototype numbers.

export type DraftGroup = "GK" | "FB" | "CB" | "MID" | "WING" | "ST";

export interface DraftedPlayer {
  name: string;
  rating: number; // 84–97, hidden until picked? shown for prototype clarity
}

export interface LegendarySquad {
  id: string;
  label: string; // "Milan 2007"
  short: string; // wheel chip, "MIL '07"
  groups: Record<DraftGroup, DraftedPlayer[]>;
}

/** 4-3-3 slot order: label + which squad group feeds it. */
export const XI_SLOTS: Array<{ label: string; group: DraftGroup }> = [
  { label: "GK", group: "GK" },
  { label: "RB", group: "FB" },
  { label: "CB", group: "CB" },
  { label: "CB", group: "CB" },
  { label: "LB", group: "FB" },
  { label: "CM", group: "MID" },
  { label: "CM", group: "MID" },
  { label: "CM", group: "MID" },
  { label: "RW", group: "WING" },
  { label: "ST", group: "ST" },
  { label: "LW", group: "WING" },
];

export const RESPINS_ALLOWED = 3;

export const legendarySquads: LegendarySquad[] = [
  {
    id: "milan07",
    label: "AC Milan 2007",
    short: "MIL '07",
    groups: {
      GK: [{ name: "Dida", rating: 88 }],
      FB: [{ name: "Cafu", rating: 90 }, { name: "Jankulovski", rating: 84 }, { name: "Oddo", rating: 84 }],
      CB: [{ name: "Maldini", rating: 95 }, { name: "Nesta", rating: 93 }, { name: "Kaladze", rating: 84 }],
      MID: [{ name: "Pirlo", rating: 94 }, { name: "Gattuso", rating: 89 }, { name: "Ambrosini", rating: 85 }],
      WING: [{ name: "Kaká", rating: 95 }, { name: "Seedorf", rating: 91 }],
      ST: [{ name: "Inzaghi", rating: 89 }, { name: "Gilardino", rating: 85 }],
    },
  },
  {
    id: "barca11",
    label: "Barcelona 2011",
    short: "BAR '11",
    groups: {
      GK: [{ name: "Valdés", rating: 89 }],
      FB: [{ name: "Dani Alves", rating: 92 }, { name: "Abidal", rating: 88 }, { name: "Maxwell", rating: 84 }],
      CB: [{ name: "Piqué", rating: 91 }, { name: "Puyol", rating: 92 }, { name: "Mascherano", rating: 89 }],
      MID: [{ name: "Xavi", rating: 96 }, { name: "Iniesta", rating: 96 }, { name: "Busquets", rating: 92 }],
      WING: [{ name: "Messi", rating: 97 }, { name: "Pedro", rating: 87 }],
      ST: [{ name: "David Villa", rating: 90 }, { name: "Bojan", rating: 84 }],
    },
  },
  {
    id: "real17",
    label: "Real Madrid 2017",
    short: "RMA '17",
    groups: {
      GK: [{ name: "Keylor Navas", rating: 88 }],
      FB: [{ name: "Marcelo", rating: 91 }, { name: "Carvajal", rating: 89 }, { name: "Danilo", rating: 84 }],
      CB: [{ name: "Sergio Ramos", rating: 93 }, { name: "Varane", rating: 89 }, { name: "Pepe", rating: 88 }],
      MID: [{ name: "Modrić", rating: 94 }, { name: "Kroos", rating: 93 }, { name: "Casemiro", rating: 90 }, { name: "Isco", rating: 88 }],
      WING: [{ name: "Cristiano Ronaldo", rating: 97 }, { name: "Bale", rating: 89 }, { name: "Asensio", rating: 85 }],
      ST: [{ name: "Benzema", rating: 91 }, { name: "Morata", rating: 85 }],
    },
  },
  {
    id: "united99",
    label: "Man United 1999",
    short: "MUN '99",
    groups: {
      GK: [{ name: "Schmeichel", rating: 93 }],
      FB: [{ name: "Gary Neville", rating: 87 }, { name: "Irwin", rating: 86 }, { name: "Phil Neville", rating: 83 }],
      CB: [{ name: "Stam", rating: 92 }, { name: "Johnsen", rating: 85 }, { name: "Berg", rating: 83 }],
      MID: [{ name: "Keane", rating: 92 }, { name: "Scholes", rating: 92 }, { name: "Butt", rating: 84 }],
      WING: [{ name: "Beckham", rating: 91 }, { name: "Giggs", rating: 91 }, { name: "Blomqvist", rating: 83 }],
      ST: [{ name: "Yorke", rating: 89 }, { name: "Andy Cole", rating: 88 }, { name: "Solskjær", rating: 87 }],
    },
  },
  {
    id: "arsenal04",
    label: "Arsenal 2004",
    short: "ARS '04",
    groups: {
      GK: [{ name: "Lehmann", rating: 87 }],
      FB: [{ name: "Ashley Cole", rating: 90 }, { name: "Lauren", rating: 86 }, { name: "Clichy", rating: 83 }],
      CB: [{ name: "Sol Campbell", rating: 91 }, { name: "Kolo Touré", rating: 88 }, { name: "Cygan", rating: 82 }],
      MID: [{ name: "Vieira", rating: 93 }, { name: "Gilberto Silva", rating: 88 }, { name: "Edu", rating: 84 }],
      WING: [{ name: "Pires", rating: 91 }, { name: "Ljungberg", rating: 88 }, { name: "Reyes", rating: 85 }],
      ST: [{ name: "Henry", rating: 96 }, { name: "Bergkamp", rating: 91 }, { name: "Kanu", rating: 85 }],
    },
  },
  {
    id: "inter10",
    label: "Inter 2010",
    short: "INT '10",
    groups: {
      GK: [{ name: "Júlio César", rating: 90 }],
      FB: [{ name: "Maicon", rating: 91 }, { name: "Zanetti", rating: 90 }, { name: "Chivu", rating: 85 }],
      CB: [{ name: "Lúcio", rating: 90 }, { name: "Samuel", rating: 89 }, { name: "Materazzi", rating: 85 }],
      MID: [{ name: "Sneijder", rating: 92 }, { name: "Cambiasso", rating: 89 }, { name: "Thiago Motta", rating: 86 }, { name: "Stanković", rating: 86 }],
      WING: [{ name: "Eto'o", rating: 92 }, { name: "Pandev", rating: 84 }],
      ST: [{ name: "Milito", rating: 90 }, { name: "Balotelli", rating: 84 }],
    },
  },
  {
    id: "bayern13",
    label: "Bayern 2013",
    short: "BAY '13",
    groups: {
      GK: [{ name: "Neuer", rating: 93 }],
      FB: [{ name: "Lahm", rating: 93 }, { name: "Alaba", rating: 88 }, { name: "Rafinha", rating: 83 }],
      CB: [{ name: "Boateng", rating: 88 }, { name: "Dante", rating: 87 }, { name: "Van Buyten", rating: 83 }],
      MID: [{ name: "Schweinsteiger", rating: 92 }, { name: "Toni Kroos", rating: 89 }, { name: "Javi Martínez", rating: 88 }],
      WING: [{ name: "Robben", rating: 93 }, { name: "Ribéry", rating: 93 }, { name: "Müller", rating: 90 }],
      ST: [{ name: "Mandžukić", rating: 88 }, { name: "Mario Gómez", rating: 86 }],
    },
  },
  {
    id: "liverpool19",
    label: "Liverpool 2019",
    short: "LIV '19",
    groups: {
      GK: [{ name: "Alisson", rating: 92 }],
      FB: [{ name: "Alexander-Arnold", rating: 90 }, { name: "Robertson", rating: 90 }, { name: "Milner", rating: 85 }],
      CB: [{ name: "Van Dijk", rating: 94 }, { name: "Matip", rating: 86 }, { name: "Lovren", rating: 83 }],
      MID: [{ name: "Fabinho", rating: 89 }, { name: "Henderson", rating: 87 }, { name: "Wijnaldum", rating: 87 }],
      WING: [{ name: "Salah", rating: 94 }, { name: "Mané", rating: 93 }, { name: "Shaqiri", rating: 84 }],
      ST: [{ name: "Firmino", rating: 90 }, { name: "Origi", rating: 83 }],
    },
  },
];

export interface DraftedManager {
  id: string;
  name: string;
  trait: string;
  description: string;
  /** Match-engine nudges, Drafted-style. */
  attackBonus: number;
  defenseBonus: number;
  shootoutBonus: number; // added to 0.5 base shootout win chance
}

export const draftedManagers: DraftedManager[] = [
  {
    id: "professor",
    name: "The Professor",
    trait: "Total Football",
    description: "Your XI attacks in waves — expect goals at both ends.",
    attackBonus: 2,
    defenseBonus: 0,
    shootoutBonus: 0,
  },
  {
    id: "busdriver",
    name: "The Bus Driver",
    trait: "Low Block",
    description: "Park it. 1-0 is a statement victory.",
    attackBonus: 0,
    defenseBonus: 2,
    shootoutBonus: 0,
  },
  {
    id: "elloco",
    name: "El Loco",
    trait: "Cup Specialist",
    description: "Normal time is a formality — he lives for shootouts.",
    attackBonus: 0,
    defenseBonus: 0,
    shootoutBonus: 0.3,
  },
];

export interface CupOpponent {
  stage: "Quarter-final" | "Semi-final" | "Final";
  name: string;
  strength: number;
}

export const cupRun: CupOpponent[] = [
  { stage: "Quarter-final", name: "Ajax 1995", strength: 88 },
  { stage: "Semi-final", name: "Juventus 1996", strength: 90 },
  { stage: "Final", name: "Barcelona 2009", strength: 93 },
];

// ——— Trivia form system ———
// Every pick asks one question about the squad the wheel landed on.
// Correct: player joins at +FORM_BONUS. Wrong: −FORM_BONUS ("out of form").
// Team rating = average of (base rating + form), so knowledge converts
// directly into win probability — the QuizBall twist on Drafted's engine.

export const FORM_BONUS = 2;

export interface SquadQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
}

export const squadQuestions: Record<string, SquadQuestion[]> = {
  milan07: [
    { prompt: "Who scored both Milan goals in the 2007 final?", options: ["Kaká", "Inzaghi", "Gilardino", "Seedorf"], correctIndex: 1 },
    { prompt: "The 2007 final avenged which defeat?", options: ["Rome 2009", "Manchester 2003", "Istanbul 2005", "Athens 1994"], correctIndex: 2 },
    { prompt: "Who won the 2007 Ballon d'Or?", options: ["Ronaldinho", "Cannavaro", "Messi", "Kaká"], correctIndex: 3 },
    { prompt: "Milan's captain in 2007?", options: ["Maldini", "Nesta", "Pirlo", "Ambrosini"], correctIndex: 0 },
    { prompt: "Milan beat which English club in the 2007 semi?", options: ["Chelsea", "Manchester United", "Liverpool", "Arsenal"], correctIndex: 1 },
  ],
  barca11: [
    { prompt: "Who scored Barça's third in the 2011 final?", options: ["Messi", "Pedro", "David Villa", "Iniesta"], correctIndex: 2 },
    { prompt: "Barça's manager in 2011?", options: ["Rijkaard", "Guardiola", "Vilanova", "Luis Enrique"], correctIndex: 1 },
    { prompt: "Where was the 2011 final played?", options: ["Rome", "Paris", "Madrid", "Wembley"], correctIndex: 3 },
    { prompt: "Who did Barça beat in the 2011 semi-final?", options: ["Real Madrid", "Inter", "Chelsea", "Bayern"], correctIndex: 0 },
    { prompt: "Messi's shirt number in 2011?", options: ["19", "10", "30", "7"], correctIndex: 1 },
  ],
  real17: [
    { prompt: "The 2017 final score vs Juventus?", options: ["3-0", "2-1", "4-1", "3-1"], correctIndex: 2 },
    { prompt: "Who scored twice in the 2017 final?", options: ["Cristiano Ronaldo", "Bale", "Benzema", "Asensio"], correctIndex: 0 },
    { prompt: "Real's manager in 2017?", options: ["Ancelotti", "Mourinho", "Zidane", "Benítez"], correctIndex: 2 },
    { prompt: "The 2017 win made Real the first to…", options: ["win 10 European Cups", "retain the UCL in the CL era", "win it unbeaten", "win a treble"], correctIndex: 1 },
    { prompt: "Where was the 2017 final?", options: ["Kyiv", "Milan", "Lisbon", "Cardiff"], correctIndex: 3 },
  ],
  united99: [
    { prompt: "Who scored the 93rd-minute winner in the '99 final?", options: ["Sheringham", "Solskjær", "Yorke", "Cole"], correctIndex: 1 },
    { prompt: "United beat whom in the '99 final?", options: ["Bayern Munich", "Juventus", "Inter", "Real Madrid"], correctIndex: 0 },
    { prompt: "Which two missed the '99 final through suspension?", options: ["Beckham & Keane", "Stam & Keane", "Keane & Scholes", "Scholes & Butt"], correctIndex: 2 },
    { prompt: "The '99 win completed United's…", options: ["Double", "Treble", "Quadruple", "first European Cup"], correctIndex: 1 },
    { prompt: "Where was the '99 final played?", options: ["Wembley", "San Siro", "Old Trafford", "Camp Nou"], correctIndex: 3 },
  ],
  arsenal04: [
    { prompt: "The Invincibles went unbeaten for how many league games in 03/04?", options: ["38", "42", "49", "36"], correctIndex: 0 },
    { prompt: "Arsenal's top scorer in 03/04?", options: ["Bergkamp", "Pires", "Henry", "Ljungberg"], correctIndex: 2 },
    { prompt: "The Invincibles' home ground?", options: ["Emirates", "Highbury", "Wembley", "White Hart Lane"], correctIndex: 1 },
    { prompt: "Arsenal's number 1 for the unbeaten season?", options: ["Seaman", "Almunia", "Lehmann", "Wright"], correctIndex: 2 },
    { prompt: "Arsenal's captain in 03/04?", options: ["Vieira", "Henry", "Tony Adams", "Campbell"], correctIndex: 0 },
  ],
  inter10: [
    { prompt: "Inter's manager in 2010?", options: ["Mancini", "Benítez", "Mourinho", "Spalletti"], correctIndex: 2 },
    { prompt: "Who scored both goals in the 2010 final?", options: ["Milito", "Sneijder", "Eto'o", "Pandev"], correctIndex: 0 },
    { prompt: "2010 completed Inter's…", options: ["Double", "Treble", "back-to-back UCLs", "unbeaten season"], correctIndex: 1 },
    { prompt: "Inter knocked out whom in the 2010 semi?", options: ["Chelsea", "Barcelona", "CSKA", "Bayern"], correctIndex: 1 },
    { prompt: "Where was the 2010 final?", options: ["Bernabéu", "Wembley", "Rome", "Munich"], correctIndex: 0 },
  ],
  bayern13: [
    { prompt: "Bayern's 2013 final opponent?", options: ["Barcelona", "Real Madrid", "Borussia Dortmund", "Chelsea"], correctIndex: 2 },
    { prompt: "Who scored the 89th-minute winner in 2013?", options: ["Müller", "Robben", "Ribéry", "Mandžukić"], correctIndex: 1 },
    { prompt: "Bayern's manager in 2013?", options: ["Guardiola", "van Gaal", "Klinsmann", "Heynckes"], correctIndex: 3 },
    { prompt: "Where was the 2013 final?", options: ["Munich", "Wembley", "Berlin", "Amsterdam"], correctIndex: 1 },
    { prompt: "Bayern beat Barcelona in the 2013 semi by what aggregate?", options: ["7-0", "5-0", "4-0", "6-1"], correctIndex: 0 },
  ],
  liverpool19: [
    { prompt: "Liverpool's 2019 final opponent?", options: ["Ajax", "Tottenham", "Barcelona", "Man City"], correctIndex: 1 },
    { prompt: "Who scored the early penalty in the 2019 final?", options: ["Mané", "Firmino", "Salah", "Origi"], correctIndex: 2 },
    { prompt: "The 2019 semi comeback vs Barcelona finished…", options: ["3-0", "4-3", "5-1", "4-0"], correctIndex: 3 },
    { prompt: "Who scored the “corner taken quickly” goal?", options: ["Origi", "Wijnaldum", "Shaqiri", "Milner"], correctIndex: 0 },
    { prompt: "Liverpool's manager in 2019?", options: ["Rodgers", "Benítez", "Klopp", "Gerrard"], correctIndex: 2 },
  ],
};
