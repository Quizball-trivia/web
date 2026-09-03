import type { LucideIcon } from "lucide-react";
import {
  Gem,
  Grid3x3,
  Layers,
  ListOrdered,
  Megaphone,
  Puzzle,
  Shirt,
  Skull,
  Target,
} from "lucide-react";

export type LabModeId =
  | "top-10-knockout"
  | "missing-xi"
  | "ball-knowledge"
  | "bingo-battle"
  | "draft-battle"
  | "connections-race"
  | "stat-501"
  | "own-goal"
  | "say-it-with-memes";

// Static Tailwind class strings (never computed) so the compiler keeps them.
export interface LabAccent {
  text: string;
  bg: string;
  softBg: string;
  border: string;
}

export interface LabModeMeta {
  id: LabModeId;
  name: string;
  tagline: string;
  howTo: string[];
  icon: LucideIcon;
  accent: LabAccent;
}

export const LAB_MODES: LabModeMeta[] = [
  {
    id: "top-10-knockout",
    name: "Top 10 Knockout",
    tagline: "Take turns naming players from a hidden Top 10 list.",
    howTo: [
      "A hidden Top 10 list is picked — you and your opponent take turns naming players on it.",
      "Correct answers get revealed on the list. Wrong or repeated answers cost a life.",
      "You each have 3 lives. Knock out your opponent, or reveal more of the list than they do.",
    ],
    icon: ListOrdered,
    accent: {
      text: "text-brand-cyan",
      bg: "bg-brand-cyan",
      softBg: "bg-brand-cyan/15",
      border: "border-brand-cyan/40",
    },
  },
  {
    id: "missing-xi",
    name: "Missing XI",
    tagline: "Fill in the starting lineup from a famous final.",
    howTo: [
      "A legendary starting XI is shown on the pitch — with every name hidden.",
      "Take turns: pick an empty shirt, then name who started there.",
      "Correct guesses claim the shirt in your colour. Most shirts when the XI is complete wins.",
    ],
    icon: Shirt,
    accent: {
      text: "text-brand-green-light",
      bg: "bg-brand-green-light",
      softBg: "bg-brand-green-light/15",
      border: "border-brand-green-light/40",
    },
  },
  {
    id: "ball-knowledge",
    name: "Ball Knowledge",
    tagline: "Rare answers score big. Obvious answers score small.",
    howTo: [
      "Each round is an open question with many valid answers.",
      "The rarer your answer, the more points you score — obvious picks earn little.",
      "5 rounds against an opponent. Deepest ball knowledge wins.",
    ],
    icon: Gem,
    accent: {
      text: "text-brand-gold",
      bg: "bg-brand-gold",
      softBg: "bg-brand-gold/15",
      border: "border-brand-gold/40",
    },
  },
  {
    id: "bingo-battle",
    name: "Bingo Battle",
    tagline: "Place each player on a category square — first line wins.",
    howTo: [
      "You have a 3×3 card of football categories. Players appear one at a time.",
      "Place each player on a square they qualify for — or skip if nothing fits.",
      "First to complete a row, column or diagonal wins. Your opponent is racing on their own card.",
    ],
    icon: Grid3x3,
    accent: {
      text: "text-brand-orange",
      bg: "bg-brand-orange",
      softBg: "bg-brand-orange/15",
      border: "border-brand-orange/40",
    },
  },
  {
    id: "draft-battle",
    name: "Draft Battle",
    tagline: "Spin the wheel, draft a legendary XI, chase the cup.",
    howTo: [
      "Spin the wheel — it lands on a legendary European squad. Pick one of its players for the current position, all the way to a full XI. 3 re-spins.",
      "Every pick asks a trivia question about that squad: correct = +2 form, wrong = −2. Your knowledge literally becomes team strength.",
      "Draft a manager whose trait bends the engine, then survive a simulated QF, semi and final to lift the trophy.",
    ],
    icon: Layers,
    accent: {
      text: "text-brand-blue",
      bg: "bg-brand-blue",
      softBg: "bg-brand-blue/15",
      border: "border-brand-blue/40",
    },
  },
  {
    id: "connections-race",
    name: "Connections Race",
    tagline: "16 players hide 4 secret groups. Find them first.",
    howTo: [
      "16 footballers, 4 hidden groups of 4 — something connects each group.",
      "Select 4 players and submit. Correct groups lock in your colour.",
      "Your opponent is solving the same board. Claim more groups than they do.",
    ],
    icon: Puzzle,
    accent: {
      text: "text-brand-red-soft",
      bg: "bg-brand-red-soft",
      softBg: "bg-brand-red-soft/15",
      border: "border-brand-red-soft/40",
    },
  },
  {
    id: "stat-501",
    name: "Stat 501",
    tagline: "Darts with footballers: count down from 501 using real stats.",
    howTo: [
      "Both start on 501. Name a footballer and their career stat is subtracted from your total.",
      "Finish between 0 and −10 to win. Dropping below −10 is a bust — your score resets to the previous total.",
      "No repeats. Know your numbers: on 63, who scored roughly 60?",
    ],
    icon: Target,
    accent: {
      text: "text-brand-green-bright",
      bg: "bg-brand-green-bright",
      softBg: "bg-brand-green-bright/15",
      border: "border-brand-green-bright/40",
    },
  },
  {
    id: "own-goal",
    name: "Own Goal",
    tagline: "Codenames, football edition — claim your team's meme cards, dodge the Own Goal.",
    howTo: [
      "20 football-culture cards. 7 secretly belong to your team, 7 to the rival — and one is the Own Goal.",
      "Your Scout gives ONE word + a number, Codenames-style \u2014 \u201cMadrid \u2014 3\u201d. Flip the cards you think it means; every correct flip keeps your turn alive (clue + 1 bonus guess).",
      "Flip a rival card and they claim it. Flip the Own Goal and you lose instantly. First team to clear their 7 wins.",
    ],
    icon: Skull,
    accent: {
      text: "text-brand-red",
      bg: "bg-brand-red",
      softBg: "bg-brand-red/15",
      border: "border-brand-red/40",
    },
  },
  {
    id: "say-it-with-memes",
    name: "Say It With Memes",
    tagline: "Explain footballers using only football-meme cards — no words allowed.",
    howTo: [
      "Two roles, one language: football memes. First you guess — your teammate signals a secret player or manager using only image cards.",
      "Fewer cards = more points. Ask for an extra card and the prize drops (100 → 70 → 40).",
      "Then you signal: pick up to 3 cards to say the name to your teammate. Beat the rival team's 10-round total.",
    ],
    icon: Megaphone,
    accent: {
      text: "text-brand-yellow",
      bg: "bg-brand-yellow-deep",
      softBg: "bg-brand-yellow/15",
      border: "border-brand-yellow/40",
    },
  },
];

export function getLabMode(id: string): LabModeMeta | undefined {
  return LAB_MODES.find((mode) => mode.id === id);
}
