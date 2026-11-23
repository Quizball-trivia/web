/**
 * Live Show: a creator-hosted quiz night. Viewers join from a stream during a join window, then everyone plays the same
 * questions at once: points per question, a cut after every stage, and a final among the last few.
 *
 * Every question is answered with taps (owner rule 2026-11-20: no typing).
 */

export type ShowLocale = 'en' | 'ka';
export type Localized = { en: string; ka?: string };

/** Something drawn on screen: a hosted image, or an invented crest / shirt the fixtures render as SVG. */
export type ShowArt =
  | { kind: 'image'; src: string; alt?: string; fit?: 'cover' | 'contain' }
  | { kind: 'crest'; seed: string; era: number; initials: string }
  | { kind: 'shirt'; seed: string; era: number };

export interface ShowOption {
  id: string;
  label: Localized;
  art?: ShowArt;
}

interface BaseQuestion {
  id: string;
  prompt: Localized;
}

/** One tap among 2–5 options: true/false, multiple choice, odd one out, fake fact. */
export interface ChoiceQuestion extends BaseQuestion {
  kind: 'true_false' | 'mcq' | 'odd_one_out' | 'fake_fact';
  options: ShowOption[];
  correctId: string;
  /** Subject shown above the prompt (fake fact: the footballer; odd one out: the link). */
  subject?: { name: Localized; art?: ShowArt };
  explain?: Localized;
}

/** A picture that starts as an extreme close-up and zooms out step by step; earlier answers score more. */
export interface ZoomOutQuestion extends BaseQuestion {
  kind: 'zoom_out';
  art: ShowArt;
  /** Where the close-up starts, as fractions of the picture (0..1). */
  focus: { x: number; y: number };
  options: ShowOption[];
  correctId: string;
}

/** A club's crest or kit history, oldest first, revealed one era at a time; earlier answers score more. */
export interface EvolutionQuestion extends BaseQuestion {
  kind: 'evolution';
  subject: 'crest' | 'shirt';
  eras: Array<{ year: number; art: ShowArt }>;
  options: ShowOption[];
  correctId: string;
}

/**
 * A small Minesweeper board: pick the cards that fit the clue, then lock in. Nothing flips until the reveal (an instant
 * verdict per tap would let a second account find the mines for the first). Any mine in your picks scores the board 0.
 */
export interface MinesQuestion extends BaseQuestion {
  kind: 'mines';
  cards: ShowOption[];
  /** Card ids that fit the clue; every other card is a mine. */
  fits: string[];
}

/** Drag a slider to a number: closest number or "what minute". */
export interface SliderQuestion extends BaseQuestion {
  kind: 'closest_number' | 'what_minute';
  min: number;
  max: number;
  step: number;
  answer: number;
  /** Distance at which a guess scores 0; defaults to a quarter of the range. */
  tolerance?: number;
  unit?: Localized;
  /** What the number is about (a goal card for "what minute"). */
  context?: Localized;
  art?: ShowArt;
}

export type ShowQuestion = ChoiceQuestion | ZoomOutQuestion | EvolutionQuestion | MinesQuestion | SliderQuestion;
export type ShowQuestionKind = ShowQuestion['kind'];

/** What a player submitted. */
export type ShowAnswer =
  | { kind: 'choice'; optionId: string; elapsedMs: number }
  /** Zoom/evolution: the reveal step (0-based) visible when the player tapped. */
  | { kind: 'reveal_choice'; optionId: string; step: number; elapsedMs: number }
  | { kind: 'mines'; picked: string[]; elapsedMs: number }
  | { kind: 'slider'; value: number; elapsedMs: number };

export interface ShowStageDef {
  id: string;
  title: Localized;
  questions: ShowQuestion[];
  /** How many go through after this stage: a share of the field, or a fixed count. Absent on the final. */
  keep?: { share: number } | { count: number };
  /** The final starts everyone at zero. */
  final?: boolean;
}

export interface ShowPack {
  id: string;
  title: Localized;
  stages: ShowStageDef[];
}
