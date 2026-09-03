// Hardcoded prototype data — Ball Knowledge / Rare Answers.
// IMPORTANT: the "% of players answered this" figures are invented for the
// prototype. They are NOT real production statistics and must be replaced by
// server-computed rarity before this mode ships.

export interface RareAnswer {
  name: string;
  aliases: string[];
  /** Fake "% of players gave this answer" figure. */
  pct: number;
  points: number;
}

export interface RareAnswerQuestion {
  id: string;
  prompt: string;
  answers: RareAnswer[];
  /** Name (must match an entry in answers) the mock opponent gives. */
  opponentAnswer: string;
}

export const rareAnswerQuestions: RareAnswerQuestion[] = [
  {
    id: "chelsea-milan",
    prompt: "Name a player who played for Chelsea AND AC Milan",
    answers: [
      { name: "Andriy Shevchenko", aliases: ["Shevchenko"], pct: 31.5, points: 22 },
      { name: "Olivier Giroud", aliases: ["Giroud"], pct: 18.4, points: 32 },
      { name: "Christian Pulisic", aliases: ["Pulisic"], pct: 8.1, points: 61 },
      { name: "Fernando Torres", aliases: ["Torres"], pct: 4.9, points: 74 },
      { name: "Tiémoué Bakayoko", aliases: ["Bakayoko", "Tiemoue Bakayoko"], pct: 2.2, points: 85 },
      { name: "Marco van Ginkel", aliases: ["Van Ginkel"], pct: 0.8, points: 96 },
    ],
    opponentAnswer: "Olivier Giroud",
  },
  {
    id: "barca-pl",
    prompt: "Name a player who played for Barcelona AND a Premier League club",
    answers: [
      { name: "Cesc Fàbregas", aliases: ["Fabregas", "Cesc Fabregas"], pct: 24.6, points: 26 },
      { name: "Luis Suárez", aliases: ["Suarez", "Luis Suarez"], pct: 19.2, points: 31 },
      { name: "Thierry Henry", aliases: ["Henry"], pct: 14.8, points: 42 },
      { name: "Philippe Coutinho", aliases: ["Coutinho"], pct: 9.3, points: 57 },
      { name: "Alexis Sánchez", aliases: ["Alexis Sanchez", "Sanchez"], pct: 6.4, points: 68 },
      { name: "Yaya Touré", aliases: ["Yaya Toure", "Toure"], pct: 3.5, points: 80 },
      { name: "Marc Overmars", aliases: ["Overmars"], pct: 1.4, points: 91 },
      { name: "Ibrahim Afellay", aliases: ["Afellay"], pct: 0.6, points: 97 },
    ],
    opponentAnswer: "Philippe Coutinho",
  },
  {
    id: "brazil-ucl",
    prompt: "Name a Brazilian who won the Champions League",
    answers: [
      { name: "Ronaldinho", aliases: ["Ronaldinho Gaucho"], pct: 26.1, points: 24 },
      { name: "Kaká", aliases: ["Kaka"], pct: 17.5, points: 34 },
      { name: "Vinícius Júnior", aliases: ["Vinicius", "Vinicius Junior", "Vini Jr"], pct: 15.2, points: 40 },
      { name: "Roberto Carlos", aliases: [], pct: 11.0, points: 50 },
      { name: "Marcelo", aliases: [], pct: 9.8, points: 55 },
      { name: "Casemiro", aliases: [], pct: 7.7, points: 62 },
      { name: "Cafu", aliases: [], pct: 4.1, points: 77 },
      { name: "Dida", aliases: [], pct: 2.3, points: 86 },
      { name: "Juliano Belletti", aliases: ["Belletti"], pct: 1.1, points: 93 },
      { name: "Anderson", aliases: [], pct: 0.7, points: 96 },
    ],
    opponentAnswer: "Roberto Carlos",
  },
  {
    id: "mou-pep",
    prompt: "Name a player who played under BOTH José Mourinho and Pep Guardiola",
    answers: [
      { name: "Zlatan Ibrahimović", aliases: ["Ibrahimovic", "Zlatan", "Zlatan Ibrahimovic"], pct: 29.4, points: 23 },
      { name: "Cesc Fàbregas", aliases: ["Fabregas", "Cesc Fabregas"], pct: 21.0, points: 30 },
      { name: "Kevin De Bruyne", aliases: ["De Bruyne"], pct: 15.2, points: 41 },
      { name: "Alexis Sánchez", aliases: ["Alexis Sanchez", "Sanchez"], pct: 11.1, points: 52 },
      { name: "Samuel Eto'o", aliases: ["Etoo", "Samuel Etoo"], pct: 6.8, points: 67 },
      { name: "Pedro", aliases: ["Pedro Rodriguez"], pct: 2.4, points: 88 },
    ],
    opponentAnswer: "Zlatan Ibrahimović",
  },
  {
    id: "juve-united",
    prompt: "Name a player who played for Juventus AND Manchester United",
    answers: [
      { name: "Cristiano Ronaldo", aliases: ["Ronaldo", "CR7"], pct: 40.8, points: 14 },
      { name: "Paul Pogba", aliases: ["Pogba"], pct: 22.6, points: 28 },
      { name: "Zlatan Ibrahimović", aliases: ["Ibrahimovic", "Zlatan", "Zlatan Ibrahimovic"], pct: 12.3, points: 47 },
      { name: "Carlos Tevez", aliases: ["Tevez"], pct: 8.4, points: 60 },
      { name: "Patrice Evra", aliases: ["Evra"], pct: 5.9, points: 70 },
      { name: "Matteo Darmian", aliases: ["Darmian"], pct: 1.6, points: 92 },
    ],
    opponentAnswer: "Carlos Tevez",
  },
];

/** Flavour tag shown with the rarity reveal. */
export function rarityLabel(pct: number): string {
  if (pct >= 20) return "Common pick";
  if (pct >= 10) return "Solid pick";
  if (pct >= 4) return "Sharp pick";
  return "Deep cut";
}
