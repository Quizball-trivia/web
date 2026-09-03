// Hardcoded prototype data — Say It With Memes (reverse-signal mode).
//
// The inverse of Own Goal: the EXPLAINER holds secret player/manager names and
// can only communicate by selecting football-culture image cards — no words,
// no flags, no club badges (owner's call: generic attribute cards are banned;
// pure meme fluency is the skill being tested). Guessers type the name.
// The prototype answers "is pure-meme explanation feasible?" by making you
// play both roles: 5 guess rounds (AI teammate signals) + 5 explain rounds
// (you signal, AI teammate reads). Card images reuse the Own Goal Commons
// library (public/game-mode-lab/cards/<id>.jpg, emoji fallback).

export interface SignalCard {
  id: string;
  emoji: string;
  label: string;
}

export interface SignalTarget {
  name: string;
  aliases: string[];
  role: "player" | "manager" | "keeper";
  /** Any single one of these cards communicates the name on its own. */
  strong: string[];
  /** Two of these (or one + anything strong) also communicate it. */
  support: string[];
  /** What the AI teammate guesses when your signal is too weak. */
  decoyGuess: string;
  /** Guess-phase script: cards the AI explainer reveals, one at a time. */
  revealOrder: string[];
}

/** The fixed signal vocabulary — 28 concept cards, no player-identity photos. */
export const signalBoard: SignalCard[] = [
  { id: "bus", emoji: "🚌", label: "The Team Bus" },
  { id: "fax", emoji: "📠", label: "The Fax Machine" },
  { id: "pizza", emoji: "🍕", label: "The Pizza" },
  { id: "gloves", emoji: "🧤", label: "The Gloves" },
  { id: "redcard", emoji: "🟥", label: "Red Card" },
  { id: "wall", emoji: "🧱", label: "The Wall" },
  { id: "bicycle", emoji: "🚴", label: "The Bicycle Kick" },
  { id: "bigears", emoji: "🏆", label: "Ol' Big Ears" },
  { id: "ballondor", emoji: "🥇", label: "Ballon d'Or" },
  { id: "bottlejob", emoji: "🍼", label: "Bottle Job" },
  { id: "farmers", emoji: "🚜", label: "Farmers League" },
  { id: "moneybags", emoji: "💰", label: "Money Bags" },
  { id: "opengoal", emoji: "🥅", label: "The Open Goal" },
  { id: "var", emoji: "📺", label: "VAR Check" },
  { id: "spot", emoji: "⚪", label: "The Penalty Spot" },
  { id: "corner", emoji: "🚩", label: "The Corner Flag" },
  { id: "banana", emoji: "🍌", label: "The Banana Peel" },
  { id: "cobra", emoji: "🐍", label: "The Snake" },
  { id: "stopwatch", emoji: "⏱️", label: "The Stopwatch" },
  { id: "bite", emoji: "🦈", label: "The Bite" },
  { id: "goat", emoji: "🐐", label: "The Goat" },
  { id: "shell", emoji: "🐢", label: "The Turtle" },
  { id: "robot", emoji: "🤖", label: "The Robot" },
  { id: "volvo", emoji: "🚗", label: "The Volvo" },
  { id: "bull", emoji: "🐂", label: "The Bull" },
  { id: "aura", emoji: "🕶️", label: "Aura" },
  { id: "crown", emoji: "👑", label: "The Crown" },
  { id: "handofgod", emoji: "🖐️", label: "The Shrine" },
];

export const signalTargets: SignalTarget[] = [
  // ——— Guess-phase scripts (AI explainer signals these to you) ———
  {
    name: "José Mourinho",
    aliases: ["Mourinho", "Jose Mourinho"],
    role: "manager",
    strong: ["bus"],
    support: ["aura", "redcard"],
    decoyGuess: "Diego Simeone",
    revealOrder: ["bus", "aura", "redcard"],
  },
  {
    name: "Luis Suárez",
    aliases: ["Suarez", "Luis Suarez"],
    role: "player",
    strong: ["bite"],
    support: ["goat", "handofgod"],
    decoyGuess: "Jaws",
    revealOrder: ["bite", "goat", "banana"],
  },
  {
    name: "Lionel Messi",
    aliases: ["Messi"],
    role: "player",
    strong: [],
    support: ["goat", "ballondor", "handofgod"],
    decoyGuess: "Cristiano Ronaldo",
    revealOrder: ["goat", "ballondor", "handofgod"],
  },
  {
    name: "David de Gea",
    aliases: ["De Gea"],
    role: "keeper",
    strong: ["fax"],
    support: ["gloves"],
    decoyGuess: "Keylor Navas",
    revealOrder: ["gloves", "fax"],
  },
  {
    name: "Divock Origi",
    aliases: ["Origi"],
    role: "player",
    strong: ["corner"],
    support: ["bigears"],
    decoyGuess: "Trent Alexander-Arnold",
    revealOrder: ["corner", "bigears"],
  },
  // ——— Explain-phase targets (you signal these to the AI teammate) ———
  {
    name: "Zlatan Ibrahimović",
    aliases: ["Zlatan", "Ibrahimovic", "Zlatan Ibrahimovic"],
    role: "player",
    strong: ["volvo"],
    support: ["bull", "aura", "bicycle"],
    decoyGuess: "Erling Haaland",
    revealOrder: ["volvo", "bull"],
  },
  {
    name: "Cristiano Ronaldo",
    aliases: ["Ronaldo", "CR7"],
    role: "player",
    strong: [],
    support: ["goat", "spot", "crown"],
    decoyGuess: "Lionel Messi",
    revealOrder: ["goat", "spot"],
  },
  {
    name: "Steven Gerrard",
    aliases: ["Gerrard"],
    role: "player",
    strong: ["banana"],
    support: ["bottlejob"],
    decoyGuess: "John Terry",
    revealOrder: ["banana", "bottlejob"],
  },
  {
    name: "Thibaut Courtois",
    aliases: ["Courtois"],
    role: "keeper",
    strong: [],
    support: ["gloves", "cobra"],
    decoyGuess: "David de Gea",
    revealOrder: ["gloves", "cobra"],
  },
  {
    name: "Sir Alex Ferguson",
    aliases: ["Ferguson", "Alex Ferguson", "Fergie"],
    role: "manager",
    strong: [],
    support: ["stopwatch", "pizza", "crown"],
    decoyGuess: "Arsène Wenger",
    revealOrder: ["stopwatch", "pizza"],
  },
  {
    name: "Kylian Mbappé",
    aliases: ["Mbappe", "Kylian Mbappe"],
    role: "player",
    strong: [],
    support: ["shell", "moneybags", "farmers"],
    decoyGuess: "Neymar",
    revealOrder: ["shell", "moneybags"],
  },
  {
    name: "Erling Haaland",
    aliases: ["Haaland"],
    role: "player",
    strong: [],
    support: ["robot", "moneybags", "farmers"],
    decoyGuess: "Peter Crouch",
    revealOrder: ["robot", "moneybags"],
  },
];

/** First 5 targets are guess-phase, the rest feed the explain phase. */
export const GUESS_PHASE_COUNT = 5;
export const EXPLAIN_PHASE_COUNT = 5;

/** Points on offer by number of signal cards used/revealed (index = count-1). */
export const SIGNAL_POINTS = [100, 70, 40];

/** Scripted rival-team score per round (10 rounds), revealed as you play. */
export const signalRivalScores = [70, 40, 100, 70, 0, 70, 40, 70, 0, 100];

/** Autocomplete pool for the guess phase: all targets + plausible decoys. */
export const signalGuessPool: string[] = [
  ...signalTargets.map((t) => t.name),
  "Pep Guardiola",
  "Jürgen Klopp",
  "Arsène Wenger",
  "Diego Simeone",
  "Peter Crouch",
  "Neymar",
  "Kaká",
  "Gianluigi Buffon",
  "Manuel Neuer",
  "Keylor Navas",
  "Iker Casillas",
  "Zinedine Zidane",
  "Diego Maradona",
  "Pelé",
  "Trent Alexander-Arnold",
  "John Terry",
  "Wayne Rooney",
  "Didier Drogba",
];
