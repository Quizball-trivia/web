// Hardcoded prototype data — Top 10 Knockout. Figures are approximate and for
// prototype/testing only; production would serve curated lists from the server.

export interface Top10Entry {
  rank: number;
  name: string;
  aliases: string[];
  /** Shown next to the name once revealed, e.g. "141 goals". */
  detail: string;
}

export interface Top10OpponentMove {
  /** Canonical name the mock opponent will try (must exist in entries when correct). */
  answer: string;
  correct: boolean;
}

export interface Top10Category {
  id: string;
  title: string;
  entries: Top10Entry[];
  /** Extra plausible-but-wrong names to pad the autocomplete pool. */
  decoys: string[];
  /** Scripted opponent turn order; already-revealed names are skipped. */
  opponentMoves: Top10OpponentMove[];
}

export const top10Categories: Top10Category[] = [
  {
    id: "ucl-scorers",
    title: "Top 10 all-time Champions League scorers",
    entries: [
      { rank: 1, name: "Cristiano Ronaldo", aliases: ["Ronaldo", "CR7"], detail: "141 goals" },
      { rank: 2, name: "Lionel Messi", aliases: ["Messi"], detail: "129 goals" },
      { rank: 3, name: "Robert Lewandowski", aliases: ["Lewandowski"], detail: "105 goals" },
      { rank: 4, name: "Karim Benzema", aliases: ["Benzema"], detail: "90 goals" },
      { rank: 5, name: "Raúl", aliases: ["Raul", "Raul Gonzalez"], detail: "71 goals" },
      { rank: 6, name: "Ruud van Nistelrooy", aliases: ["Van Nistelrooy"], detail: "60 goals" },
      { rank: 7, name: "Thomas Müller", aliases: ["Muller", "Thomas Muller"], detail: "57 goals" },
      { rank: 8, name: "Kylian Mbappé", aliases: ["Mbappe", "Kylian Mbappe"], detail: "55 goals" },
      { rank: 9, name: "Mohamed Salah", aliases: ["Salah", "Mo Salah"], detail: "52 goals" },
      { rank: 10, name: "Erling Haaland", aliases: ["Haaland"], detail: "49 goals" },
    ],
    decoys: [
      "Thierry Henry",
      "Zlatan Ibrahimović",
      "Andriy Shevchenko",
      "Didier Drogba",
      "Filippo Inzaghi",
      "Alessandro Del Piero",
      "Neymar",
      "Sergio Agüero",
      "Antoine Griezmann",
      "Edinson Cavani",
      "Wayne Rooney",
      "Harry Kane",
      "Gareth Bale",
      "Luis Suárez",
      "Vinícius Júnior",
    ],
    opponentMoves: [
      { answer: "Lionel Messi", correct: true },
      { answer: "Robert Lewandowski", correct: true },
      { answer: "Karim Benzema", correct: true },
      { answer: "Thierry Henry", correct: false },
      { answer: "Thomas Müller", correct: true },
      { answer: "Kylian Mbappé", correct: true },
      { answer: "Didier Drogba", correct: false },
      { answer: "Raúl", correct: true },
      { answer: "Zlatan Ibrahimović", correct: false },
      { answer: "Mohamed Salah", correct: true },
      { answer: "Erling Haaland", correct: true },
    ],
  },
  {
    id: "pl-scorers",
    title: "Top 10 all-time Premier League scorers",
    entries: [
      { rank: 1, name: "Alan Shearer", aliases: ["Shearer"], detail: "260 goals" },
      { rank: 2, name: "Harry Kane", aliases: ["Kane"], detail: "213 goals" },
      { rank: 3, name: "Wayne Rooney", aliases: ["Rooney"], detail: "208 goals" },
      { rank: 4, name: "Andrew Cole", aliases: ["Andy Cole", "Cole"], detail: "187 goals" },
      { rank: 5, name: "Mohamed Salah", aliases: ["Salah", "Mo Salah"], detail: "186 goals" },
      { rank: 6, name: "Sergio Agüero", aliases: ["Aguero", "Sergio Aguero"], detail: "184 goals" },
      { rank: 7, name: "Frank Lampard", aliases: ["Lampard"], detail: "177 goals" },
      { rank: 8, name: "Thierry Henry", aliases: ["Henry"], detail: "175 goals" },
      { rank: 9, name: "Robbie Fowler", aliases: ["Fowler"], detail: "163 goals" },
      { rank: 10, name: "Jermain Defoe", aliases: ["Defoe"], detail: "162 goals" },
    ],
    decoys: [
      "Michael Owen",
      "Didier Drogba",
      "Robin van Persie",
      "Steven Gerrard",
      "Ryan Giggs",
      "Paul Scholes",
      "Cristiano Ronaldo",
      "Jamie Vardy",
      "Romelu Lukaku",
      "Raheem Sterling",
      "Son Heung-min",
      "Fernando Torres",
      "Dennis Bergkamp",
      "Eric Cantona",
      "Les Ferdinand",
    ],
    opponentMoves: [
      { answer: "Alan Shearer", correct: true },
      { answer: "Wayne Rooney", correct: true },
      { answer: "Sergio Agüero", correct: true },
      { answer: "Michael Owen", correct: false },
      { answer: "Thierry Henry", correct: true },
      { answer: "Frank Lampard", correct: true },
      { answer: "Robin van Persie", correct: false },
      { answer: "Andrew Cole", correct: true },
      { answer: "Steven Gerrard", correct: false },
      { answer: "Robbie Fowler", correct: true },
      { answer: "Jermain Defoe", correct: true },
    ],
  },
  {
    id: "barca-apps",
    title: "Top 10 Barcelona all-time appearance makers",
    entries: [
      { rank: 1, name: "Lionel Messi", aliases: ["Messi"], detail: "778 apps" },
      { rank: 2, name: "Xavi", aliases: ["Xavi Hernandez"], detail: "767 apps" },
      { rank: 3, name: "Sergio Busquets", aliases: ["Busquets"], detail: "722 apps" },
      { rank: 4, name: "Andrés Iniesta", aliases: ["Iniesta", "Andres Iniesta"], detail: "674 apps" },
      { rank: 5, name: "Gerard Piqué", aliases: ["Pique", "Gerard Pique"], detail: "616 apps" },
      { rank: 6, name: "Carles Puyol", aliases: ["Puyol"], detail: "593 apps" },
      { rank: 7, name: "Migueli", aliases: [], detail: "549 apps" },
      { rank: 8, name: "Víctor Valdés", aliases: ["Valdes", "Victor Valdes"], detail: "535 apps" },
      { rank: 9, name: "Jordi Alba", aliases: ["Alba"], detail: "459 apps" },
      { rank: 10, name: "Carles Rexach", aliases: ["Rexach"], detail: "449 apps" },
    ],
    decoys: [
      "Ronaldinho",
      "Luis Suárez",
      "Samuel Eto'o",
      "Dani Alves",
      "Marc-André ter Stegen",
      "Sergi Roberto",
      "Neymar",
      "Rivaldo",
      "Luis Enrique",
      "Pep Guardiola",
      "Deco",
      "David Villa",
      "Ivan Rakitić",
      "Johan Cruyff",
      "Hristo Stoichkov",
    ],
    opponentMoves: [
      { answer: "Lionel Messi", correct: true },
      { answer: "Xavi", correct: true },
      { answer: "Andrés Iniesta", correct: true },
      { answer: "Dani Alves", correct: false },
      { answer: "Carles Puyol", correct: true },
      { answer: "Gerard Piqué", correct: true },
      { answer: "Sergi Roberto", correct: false },
      { answer: "Víctor Valdés", correct: true },
      { answer: "Ronaldinho", correct: false },
      { answer: "Sergio Busquets", correct: true },
      { answer: "Jordi Alba", correct: true },
    ],
  },
];
