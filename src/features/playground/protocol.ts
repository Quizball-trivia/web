import type { Locale } from "@/lib/i18n/messages";
import type { GameId, PlayMode } from "./types";

export const PLAYGROUND = "qb-playground";

export type ToPreview = { source: typeof PLAYGROUND; type: "render"; game: GameId; mode: PlayMode; scenario: string; data: unknown; locale: Locale; key: string; applied: number };
export type FromPreview =
  | { source: typeof PLAYGROUND; type: "ready" }
  | { source: typeof PLAYGROUND; type: "action"; action: string; args: unknown[] }
  | { source: typeof PLAYGROUND; type: "error"; message: string };

/** The message minus its `source` tag, per variant (a plain Omit over a union keeps only the shared keys). */
export type PreviewPayload = FromPreview extends infer M ? (M extends unknown ? Omit<M, "source"> : never) : never;

export const isPlaygroundMessage = (event: MessageEvent): boolean =>
  event.origin === window.location.origin && (event.data as { source?: string } | null)?.source === PLAYGROUND;
