import { createWordDailyApi, type WordRunStateBase } from "@/features/wordgames/daily/wordDaily.api";
import type { GameFeedbackAnswer } from "@/features/feedback/GameFeedback";
import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import { API_BASE_URL } from "@/lib/config";
import { timeoutSignal } from "@/lib/timeoutSignal";
import type { FigureUnit } from "./tenable.figures";

type Localized = { es: string; en: string; ka: string; tr: string; ru?: string; pt?: string; de?: string };
export type EntityKind = "player" | "manager" | "club" | "nation";

/** Server-held run state (backend tenable-daily.rules PublicRunState). */
export interface TenableServerRun extends WordRunStateBase {
  list: { title: Localized; note: Localized | null; asOf: string | null; kind: EntityKind; release: string };
  /** Names and figures only of slots this run found, or of every slot once the day is over. */
  slots: Array<{ rank: number; name: string | null; figure: { value: number; unit: FigureUnit } | null; found: boolean }>;
  lives: number;
  maxLives: number;
  misses: string[];
  last: { kind: "right" | "wrong" | "repeat" | "repeatWrong" | "ambiguous" | "unknown"; text: string; name: string | null; rank: number | null; n: number } | null;
  end: "complete" | "lives" | "gaveUp" | null;
  disclosed: boolean;
}
export interface TenableReview { day: string; list: Localized; slots: Array<{ rank: number; name: string; figure: { value: number; unit: FigureUnit } }> }

export const tenableDailyApi = createWordDailyApi<TenableServerRun, never, TenableReview>("/api/v1/tenable");

const tenableCall = createDailyGameCall("/api/v1/tenable");
/** The after-game card, from the solo daily or a room match. */
export const sendTenableFeedback = (mode: "solo" | "room", answer: GameFeedbackAnswer, locale: string) =>
  tenableCall<null>("/feedback", "POST", {
    mode, rating: answer.rating, wantsOnline: answer.wantsOnline, locale: ["en", "ka", "es", "tr", "ru", "pt", "de"].includes(locale) ? locale : "en",
    ...(answer.comment ? { comment: answer.comment } : {}),
  }, locale);

export interface Suggestion { eid: string; label: string; qualifier: string | null }

/** Names starting with the text, from the whole release of the list's kind (never from the list). */
/** The server's cap on an answer's text (the transport refuses longer ones). */
export const ANSWER_MAX_LENGTH = 60;

/** Languages the server labels clubs and nations in (other pages get the release's own names). */
const LABEL_LOCALES = ["pt", "de"];

/** Throws when the lookup failed (rate limit, outage): a failure must not be kept as "no names". */
export async function fetchSuggestions(kind: EntityKind, release: string, q: string, locale?: string): Promise<Suggestion[]> {
  const params = new URLSearchParams({ kind, release, q, ...(locale && LABEL_LOCALES.includes(locale) ? { locale } : {}) });
  const response = await fetch(`${API_BASE_URL}/api/v1/tenable/suggest?${params}`, { signal: timeoutSignal(4_000) });
  if (!response.ok) throw new Error(`suggest ${response.status}`);
  const body = (await response.json()) as { items?: Suggestion[] };
  return body.items ?? [];
}
