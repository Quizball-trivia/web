import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/messages";

export type GameId = "buscaminas" | "pistas" | "ultimo";
export type PlayMode = "solo" | "duel";

export interface ScenarioContext {
  locale: Locale;
  /** Records a callback the real game would handle (shown in the action log). */
  log: (action: string, ...args: unknown[]) => void;
}

/**
 * One screen state. `data` is plain JSON (edited live in the playground); `render` turns it into the REAL component the game
 * uses, wiring its callbacks to the action log with the return values the component expects.
 */
export interface Scenario<Data = unknown> {
  id: string;
  name: string;
  note?: string;
  data: Data;
  render: (data: Data, ctx: ScenarioContext) => ReactNode;
}

export interface GameEntry {
  id: GameId;
  name: string;
  scenarios: Partial<Record<PlayMode, Scenario<never>[]>>;
}

export const scenario = <Data,>(s: Scenario<Data>): Scenario<never> => s as unknown as Scenario<never>;
