// Weekend League — a weekly synchronized tournament.
//
// The week runs: entry closes Friday 24:00 → everyone plays the same qualifier
// Saturday 14:00 (Georgian time) → the top 24 return for a knockout playoff
// Sunday 14:00. This file types the whole thing; it is a FRONTEND PROTOTYPE
// driven by mock data (see mock-data.ts) so the flow can be demoed end to end
// before the backend exists.

import type { MessageKey } from '@/lib/i18n/messages';

export type LeaguePhase =
  | 'upcoming' // before entry closes (before Fri 24:00)
  | 'entry_open' // Mon → Fri 24:00: claim your one weekly entry
  | 'qualifier_live' // Sat 14:00: the qualifier quiz is running
  | 'qualifier_done' // qualifier finished, top 24 known, waiting for Sunday
  | 'playoffs_live' // Sun 14:00: knockout bracket for the top 24
  | 'completed'; // champion decided

export type MilestoneKey = 'entry' | 'qualifier' | 'playoffs';

export interface Milestone {
  key: MilestoneKey;
  /** Short action label, e.g. "Entry opens". */
  label: string;
  /** Weekday, e.g. "Friday". */
  dayLabel: string;
  /** Wall-clock time in Georgian time, e.g. "21:00". */
  timeLabel: string;
  /** Absolute target as epoch ms (next occurrence), for live countdowns. */
  targetMs: number;
}

export interface LeaguePlayer {
  id: string;
  username: string;
  /** Layered-avatar base id, e.g. "avatar-3". */
  avatar: string;
  tier: string;
  country: string;
  /** Qualifier points. */
  score: number;
  isYou?: boolean;
}

export type PrizeAccent = 'gold' | 'silver' | 'bronze' | 'blue' | 'green';

export interface PrizeTier {
  id: string;
  /** i18n key for the band name ("Champion", "Runner-up", …). */
  labelKey: MessageKey;
  /** i18n key for the rank label ("1st", "4th–8th"). */
  rankKey: MessageKey;
  rankFrom: number;
  rankTo: number;
  /** i18n key for the reward copy. */
  prizeKey: MessageKey;
  icon: string; // emoji marker
  accent: PrizeAccent;
}

export interface BracketPlayer {
  id: string;
  username: string;
  avatar: string;
  tier: string;
  country: string;
  seed: number;
  isYou?: boolean;
}

export interface BracketMatch {
  id: string;
  a: BracketPlayer | null;
  b: BracketPlayer | null; // null with isBye = a straight-through bye
  scoreA?: number;
  scoreB?: number;
  winnerId?: string | null;
  isBye?: boolean;
  /** This match is happening right now. */
  live?: boolean;
  /** Contains the current player's path. */
  isYours?: boolean;
}

export interface BracketRound {
  id: string;
  name: string; // "Round of 24", "Quarter-finals", "Final"…
  subtitle?: string; // e.g. "Seeds 1–8 advance on a bye"
  matches: BracketMatch[];
}

export interface Bracket {
  rounds: BracketRound[];
  championId: string | null;
  championName: string | null;
}

export interface WeekendLeagueState {
  phase: LeaguePhase;
  /** The player claimed this week's entry. */
  hasEntered: boolean;
  /** The player finished the qualifier inside the top 24. */
  qualified: boolean;
}

// ── Gameplay (mock quiz) ────────────────────────────────────────────────────

export interface MCQuestion {
  id: string;
  prompt: string;
  options: string[]; // 4 choices
  correctIndex: number;
}

export interface QuizOutcome {
  /** Total points: POINTS_PER_CORRECT per correct + seconds-remaining speed bonus. */
  score: number;
  correct: number;
  total: number;
  /** Sum of seconds left across correct answers (speed) — used to break rank ties. */
  remaining: number;
}

/** Which game the full-screen play flow is running. */
export type GameSession = { kind: 'qualifier' } | { kind: 'playoff' };

/** How the playoff run ended. */
export type PlayoffOutcome = { status: 'champion' } | { status: 'out'; roundName: string };
