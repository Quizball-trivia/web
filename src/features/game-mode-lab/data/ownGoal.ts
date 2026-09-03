// Hardcoded prototype data — Own Goal (Codenames × football culture).
//
// Design notes for the real version (per the Codenames-Pictures analysis):
// cards are NOT player names — they're football-culture images with many
// possible meanings (goat, parked bus, the Slip, fax machine…). The game never
// pre-bakes connections; a clue-giver invents them from a random board. A
// production build would curate ~300 illustrated cards, tag each with 8–20
// hidden semantic tags, and generate boards that maximize overlapping tags and
// dangerous cross-team associations ("board fertility"), with a human Scout
// giving clues in 2v2–4v4 teams. The prototype fakes all of that: boards are
// hand-curated for fertility and the Scout + rival team are scripted. Clues
// follow official Codenames legality: ONE word plus a number (proper names
// allowed; the number has no minimum — 1 is fine). Boards enforce football\n// clueing STRUCTURALLY: generic tags (GOAT, animals, statues, colours) always\n// cross teams so word-association clues are dangerous, while football-precise\n// tags cluster within one team. A future generator must keep that invariant.\n// Card art
// is real photos from Wikimedia Commons, served from
// public/game-mode-lab/cards/<card id>.jpg by convention (attribution in
// CREDITS.md there); the emoji field is the fallback if an image fails.

export type OwnGoalOwner = "you" | "rival" | "neutral" | "owngoal";

export interface OwnGoalCard {
  id: string;
  emoji: string;
  label: string;
  owner: OwnGoalOwner;
  /** Punchline shown when the card flips — teaches the meme, sells the joke. */
  revealNote: string;
  /** Late-game single-target Scout clue (only used for owner === "you"). */
  fallbackClue?: string;
}

export interface OwnGoalHint {
  teammate: string;
  cardId: string;
  text: string;
}

export interface OwnGoalClue {
  text: string;
  count: number;
  /** Optional teammate whisper that appears mid-turn (sometimes a trap!). */
  hint?: OwnGoalHint;
}

export interface OwnGoalRivalTurn {
  clueText: string;
  count: number;
  /** Card ids flipped in order; a non-rival pick ends the turn (scripted miss). */
  picks: string[];
}

export interface OwnGoalBoard {
  id: string;
  title: string;
  subtitle: string;
  cards: OwnGoalCard[]; // 20 cards: 7 you / 7 rival / 5 neutral / 1 own goal
  yourClues: OwnGoalClue[];
  rivalTurns: OwnGoalRivalTurn[];
}

export const OWN_GOAL_TEAM_BLUE = ["You", "Nika", "Gio", "Luka"];
export const OWN_GOAL_TEAM_RED = ["Beka", "Dato", "Sandro", "Tako"];

export const ownGoalBoards: OwnGoalBoard[] = [
  {
    id: "meme-board-1",
    title: "The Classics",
    subtitle: "Legends, traitors and one very tempting trophy",
    // Generic-tag poisoning: GOAT (Messi/you vs Pelé+Ronaldo/rival), Madrid
    // (Figo+Özil/you vs Siuuu+Fax/rival + Big Ears/own goal) and Brazil
    // (Maracanã/you vs Pelé/rival vs Bicycle/neutral) all cross teams, so only
    // football-precise clues are safe.
    cards: [
      { id: "goatwc", emoji: "🐐", label: "The GOAT", owner: "you", revealNote: "Messi in Qatar — the debate ended in Lusail.", fallbackClue: "Albiceleste — 1" },
      { id: "snake", emoji: "🐍", label: "The Snake", owner: "you", revealNote: "Figo — Camp Nou to the Bernabéu, 2000. Pig heads followed.", fallbackClue: "Traitor — 1" },
      { id: "wizard", emoji: "🧙", label: "The Wizard", owner: "you", revealNote: "Özil — the assist wand was real. And yes, he wore white first.", fallbackClue: "Assists — 1" },
      { id: "slip", emoji: "🧎", label: "The Slip", owner: "you", revealNote: "Gerrard. Demba Ba. You know the rest.", fallbackClue: "Liverpool — 1" },
      { id: "cold", emoji: "🥶", label: "Ice Cold", owner: "you", revealNote: "Haaland — the zen goal machine.", fallbackClue: "Norway — 1" },
      { id: "turtle", emoji: "🐢", label: "The Turtle", owner: "you", revealNote: "Mbappé — the ninja turtle himself, now in white.", fallbackClue: "Ninja — 1" },
      { id: "cryingfan", emoji: "🏟️", label: "The Maracanã", owner: "you", revealNote: "Rio 2014 — the cathedral of Brazil's cruellest summer.", fallbackClue: "Carnival — 1" },
      { id: "bus", emoji: "🚌", label: "The Team Bus", owner: "rival", revealNote: "Parked, obviously. Mourinho's masterpiece — rival card." },
      { id: "hairdryer", emoji: "💨", label: "The Hairdryer", owner: "rival", revealNote: "Sir Alex, cast in bronze at Old Trafford — rival card." },
      { id: "siu", emoji: "🙌", label: "Siuuu", owner: "rival", revealNote: "Mid-jump, mid-Siuuu. Rival card." },
      { id: "king", emoji: "👑", label: "The King", owner: "rival", revealNote: "Pelé in the sacred yellow — rival card." },
      { id: "fax", emoji: "📠", label: "The Fax Machine", owner: "rival", revealNote: "De Gea to Madrid, killed by a fax machine — rival card." },
      { id: "pizza", emoji: "🍕", label: "The Pizza", owner: "rival", revealNote: "Battle of the Buffet — pizza on Fergie's suit. Rival card." },
      { id: "gloves", emoji: "🧤", label: "The Gloves", owner: "rival", revealNote: "Keepers' union — rival card." },
      { id: "redcard", emoji: "🟥", label: "Red Card", owner: "neutral", revealNote: "Straight red — neutral. Turn over." },
      { id: "wall", emoji: "🧱", label: "The Wall", owner: "neutral", revealNote: "Jump or your keeper suffers — neutral. Turn over." },
      { id: "bicycle", emoji: "🚴", label: "The Bicycle Kick", owner: "neutral", revealNote: "Acrobatics, old-school — neutral. Turn over." },
      { id: "limbs", emoji: "🎉", label: "Limbs", owner: "neutral", revealNote: "Absolute scenes in the away end — neutral. Turn over." },
      { id: "tifo", emoji: "🎨", label: "The Tifo", owner: "neutral", revealNote: "Curva artwork — neutral. Turn over." },
      { id: "bigears", emoji: "🏆", label: "Ol' Big Ears", owner: "owngoal", revealNote: "Fifteen of them live in Madrid… which is exactly why it was the trap." },
    ],
    yourClues: [
      {
        text: "Madrid — 2",
        count: 2,
        // Intended: The Snake (Figo), The Wizard (Özil's Real years).
        // Traps: Siuuu, Fax (rival) and Ol' Big Ears (own goal).
        hint: { teammate: "Nika", cardId: "wizard", text: "Özil wore white before Arsenal — the Wizard is ours." },
      },
      {
        text: "Captains — 2",
        count: 2,
        // Intended: The Slip (Gerrard), The GOAT (Messi).
        hint: { teammate: "Gio", cardId: "king", text: "Pelé captained Brazil… surely the King?" }, // trap: rival card
      },
      {
        text: "Paris — 1",
        count: 1,
        // Intended: The Turtle (Mbappé). The GOAT also fits (PSG) but is yours anyway.
      },
      {
        text: "Zen — 1",
        count: 1,
        // Intended: Ice Cold.
        hint: { teammate: "Luka", cardId: "cold", text: "Haaland literally meditates after scoring. Ice Cold." },
      },
      {
        text: "Rio — 1",
        count: 1,
        // Intended: The Maracanã.
      },
    ],
    rivalTurns: [
      { clueText: "Ferguson — 2", count: 2, picks: ["hairdryer", "pizza"] },
      { clueText: "Manchester — 2", count: 2, picks: ["siu", "fax"] },
      { clueText: "Keeper — 2", count: 2, picks: ["gloves", "wall"] }, // second pick is a scripted miss
      { clueText: "Santos — 1", count: 1, picks: ["king"] },
      { clueText: "Mourinho — 1", count: 1, picks: ["bus"] },
    ],
  },
  {
    id: "meme-board-2",
    title: "Deep Lore",
    subtitle: "Statues, remontadas and the Ballon d'Or trap",
    // Poisoning here: Messi tags cross teams (Penalty photo = rival, Ballon
    // d'Or = own goal) so "Argentina"/"Barcelona" clues are always spicy, and
    // the France tag baits Zidane's own Ballon d'Or. The literal Goat and
    // Turtle (neutral) poison animal/GOAT word-association clues.
    cards: [
      { id: "headbutt", emoji: "🤕", label: "The Headbutt", owner: "you", revealNote: "Berlin 2006 — Zidane vs Materazzi.", fallbackClue: "Materazzi — 1" },
      { id: "handofgod", emoji: "🖐️", label: "Hand of God", owner: "you", revealNote: "Naples still prays to him — a little with the head of Maradona…", fallbackClue: "Azteca — 1" },
      { id: "remontada", emoji: "🌪️", label: "Remontada", owner: "you", revealNote: "6-1. Sergi Roberto. Camp Nou shaking.", fallbackClue: "Comeback — 1" },
      { id: "actor", emoji: "🎭", label: "The Actor", owner: "you", revealNote: "The rolls. The theatrics. Neymar cinema.", fallbackClue: "Hollywood — 1" },
      { id: "statue", emoji: "🗿", label: "The Statue", owner: "you", revealNote: "Zlatan's statue in Malmö — vandalised the day he bought into Hammarby.", fallbackClue: "Malmö — 1" },
      { id: "lion", emoji: "🦁", label: "The Lion", owner: "you", revealNote: "\"Lions don't compare themselves to humans.\" — Zlatan.", fallbackClue: "Roar — 1" },
      { id: "aguero", emoji: "⏱️", label: "93:20", owner: "you", revealNote: "AGUEROOOOO — immortalised outside the Etihad.", fallbackClue: "Kun — 1" },
      { id: "bottlejob", emoji: "🍼", label: "Bottle Job", owner: "rival", revealNote: "Throwing it away from a winning position — rival card." },
      { id: "farmers", emoji: "🚜", label: "Farmers League", owner: "rival", revealNote: "\"But it's a farmers league…\" — rival card." },
      { id: "moneybags", emoji: "💰", label: "Money Bags", owner: "rival", revealNote: "Oil money FC — rival card." },
      { id: "collar", emoji: "🧥", label: "The Collar", owner: "rival", revealNote: "Cantona — collar up, seagulls following the trawler. Rival card." },
      { id: "opengoal", emoji: "🥅", label: "The Open Goal", owner: "rival", revealNote: "How did he miss?! Rival card." },
      { id: "var", emoji: "📺", label: "VAR Check", owner: "rival", revealNote: "Checking… checking… disallowed. Rival card." },
      { id: "penalty", emoji: "⚽", label: "The Penalty", owner: "rival", revealNote: "Messi from the spot — which is why your Argentina clues were dangerous. Rival card." },
      { id: "airport", emoji: "🛫", label: "Deadline Day", owner: "neutral", revealNote: "Airport shots and yellow tickers — neutral. Turn over." },
      { id: "corner", emoji: "🚩", label: "The Corner Flag", owner: "neutral", revealNote: "Corner taken quickly… — neutral. Turn over." },
      { id: "goat", emoji: "🐐", label: "The Goat", owner: "neutral", revealNote: "An actual goat. GOAT clues are a minefield here — neutral. Turn over." },
      { id: "scarf", emoji: "🧣", label: "The Scarf", owner: "neutral", revealNote: "Held aloft in every end on earth — neutral. Turn over." },
      { id: "shell", emoji: "🐢", label: "The Turtle", owner: "neutral", revealNote: "An actual turtle. Slow build-up play — neutral. Turn over." },
      { id: "ballondor", emoji: "🥇", label: "Ballon d'Or", owner: "owngoal", revealNote: "Zidane's actual 1998 Ballon d'Or — every Messi, Argentina and France clue pointed here. That's the trap." },
    ],
    yourClues: [
      {
        text: "Zlatan — 2",
        count: 2,
        // Intended: The Statue, The Lion.
        hint: { teammate: "Luka", cardId: "statue", text: "They vandalised his statue in Malmö — that one's ours." },
      },
      {
        text: "Barcelona — 2",
        count: 2,
        // Intended: Remontada (Camp Nou), The Actor (Neymar starred in it).
        // Traps: The Penalty (Messi — rival) and Ballon d'Or (Messi — own goal).
        hint: { teammate: "Nika", cardId: "remontada", text: "6-1 — the Remontada is 100% ours." },
      },
      {
        text: "Argentina — 2",
        count: 2,
        // Intended: Hand of God, 93:20 (Agüero). Traps: The Penalty (Messi for
        // Argentina — rival) and Ballon d'Or (own goal). Double bait.
        hint: { teammate: "Gio", cardId: "penalty", text: "Messi's penalty — Argentina, surely!" }, // trap: rival card
      },
      {
        text: "France — 1",
        count: 1,
        // Intended: The Headbutt. ULTIMATE TRAP: the own-goal card is literally
        // Zidane's 1998 Ballon d'Or.
      },
    ],
    rivalTurns: [
      { clueText: "Choke — 2", count: 2, picks: ["bottlejob", "opengoal"] },
      { clueText: "Ligue 1 — 2", count: 2, picks: ["farmers", "moneybags"] },
      { clueText: "King — 2", count: 2, picks: ["collar", "scarf"] }, // second pick is a scripted miss
      { clueText: "Spot — 1", count: 1, picks: ["penalty"] },
      { clueText: "Screens — 1", count: 1, picks: ["var"] },
    ],
  },
];
