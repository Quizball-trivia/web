// Saturday qualifier gauntlet — 3 games of 5 rounds; the field only shrinks
// between games. Frontend prototype: mock data + local state only.

export type RoundType = 'trueFalse' | 'higherLower' | 'mcq' | 'careerPath' | 'whoAmI' | 'moneyDrop';

export interface GameDef {
  /** 0-based game index. */
  index: number;
  /** Field size at kickoff of this game. */
  players: number;
  /** How many advance when the game ends. */
  advance: number;
}

export interface RoundDef {
  index: number;
  type: RoundType;
  maxPoints: number;
  seconds: number;
  label: string;
}

export interface TrueFalseQ {
  type: 'trueFalse';
  /** Five statements played back to back within the round. */
  items: { statement: string; answer: boolean }[];
}

export interface HigherLowerQ {
  type: 'higherLower';
  statLabel: string;
  /** Consecutive entries; each step asks whether the next is higher or lower
   *  than the previous, so N entries = N-1 comparisons in a row. */
  chain: { name: string; value: number }[];
  /** Points per correct comparison. */
  stepPoints: number;
}

export interface McqQ {
  type: 'mcq';
  /** Five questions played back to back within the round. */
  items: { prompt: string; options: string[]; correctIndex: number }[];
}

export interface CareerPathQ {
  type: 'careerPath';
  /** Five career paths played back to back within the round. */
  items: {
    /** Club logo slugs from /public/clubs (without .webp). */
    clubs: string[];
    options: string[];
    correctIndex: number;
  }[];
}

export interface WhoAmIQ {
  type: 'whoAmI';
  /** One puzzle per round — the clue chain is the round, as in ranked. */
  clues: string[];
  options: string[];
  correctIndex: number;
  /** Points available while clue N (0-based) is the latest one shown. */
  cluePoints: number[];
}

export type RoundQuestion = TrueFalseQ | HigherLowerQ | McqQ | CareerPathQ | WhoAmIQ;

/** What a finished round reports up to the state machine. */
export interface RoundResult {
  correct: boolean;
  /** Points earned this round (already speed/clue-scaled). */
  points: number;
  /** 0..1 fraction of the timer left when the answer locked. */
  timeFrac: number;
}

export interface StandingsRow {
  rank: number;
  name: string;
  score: number;
  isYou?: boolean;
}

export type GauntletScreenKind =
  | 'lobby'
  | 'checkin'
  | 'intro'
  | 'roundIntro'
  | 'question'
  | 'reveal'
  | 'elimination'
  | 'result'
  | 'break';

export type GauntletExit =
  | { status: 'finalist'; rank: number; score: number }
  | { status: 'eliminated'; gameIndex: number; rank: number; score: number }
  | { status: 'left' };
