"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/** Which clubs a "played for both" room draws from, and how hard. Mirrors the backend's shared-player options. */
export const SHARED_PLAYER_SCOPES = ["mixed", "tr-eu", "TR", "ENG", "ESP", "ITA", "GER", "FRA"] as const;
export type SharedPlayerScope = (typeof SHARED_PLAYER_SCOPES)[number];
export type SharedPlayerDifficulty = "easy" | "medium";
export interface SharedPlayerOptions { scope: SharedPlayerScope; difficulty?: SharedPlayerDifficulty }

const LEAGUE_NAMES: Record<Exclude<SharedPlayerScope, "mixed" | "tr-eu">, string> = {
  TR: "Süper Lig", ENG: "Premier League", ESP: "La Liga", ITA: "Serie A", GER: "Bundesliga", FRA: "Ligue 1",
};
const DIFFICULTIES: ReadonlyArray<{ value: SharedPlayerDifficulty | null; labelKey: MessageKey }> = [
  { value: null, labelKey: "friend.roomDifficultyMixed" },
  { value: "easy", labelKey: "friend.roomDifficultyEasy" },
  { value: "medium", labelKey: "friend.roomDifficultyMedium" },
];

/** The room's stored options as this game reads them (anything else is the default: top clubs, mixed difficulty). */
export function readSharedPlayerOptions(raw: Record<string, unknown> | null | undefined): SharedPlayerOptions {
  const scope = SHARED_PLAYER_SCOPES.find((value) => value === raw?.scope) ?? "mixed";
  const difficulty = raw?.difficulty === "easy" || raw?.difficulty === "medium" ? raw.difficulty : undefined;
  return { scope, ...(difficulty && { difficulty }) };
}

export function sharedPlayerScopeLabel(scope: SharedPlayerScope, t: (key: MessageKey) => string): string {
  if (scope === "mixed") return t("friend.roomScopeMixed");
  if (scope === "tr-eu") return t("friend.roomScopeTrEu");
  return LEAGUE_NAMES[scope];
}

const chip = (selected: boolean, canEdit: boolean) => cn(
  "min-h-9 rounded-full px-3 text-xs font-bold transition-colors",
  selected ? "bg-brand-blue text-white" : "bg-white/[0.07] text-white/75",
  canEdit && !selected && "hover:bg-white/[0.12]",
  !canEdit && !selected && "opacity-45",
);

/** Read in event handlers and effects only (never while rendering). */
const wallClock = () => Date.now();

/** The host picks; everyone else sees what was picked. */
export function RoomGameOptions({ options, canEdit, onChange }: {
  options: Record<string, unknown> | null;
  canEdit: boolean;
  onChange: (options: Record<string, unknown>) => void;
}) {
  const { t } = useLocale();
  const current = readSharedPlayerOptions(options);
  // The host's latest choice, ahead of the server's echo: a second choice made before the first comes back builds
  // on it (league, then difficulty) instead of undoing it.
  const latest = useRef(current);
  /** The choice sent last and not echoed yet: echoes of older choices arriving meanwhile do not overwrite it. */
  const awaiting = useRef<{ key: string; since: number } | null>(null);
  const keyOf = (o: SharedPlayerOptions) => `${o.scope}:${o.difficulty ?? ""}`;
  const echoed = keyOf(current);
  useEffect(() => {
    const waiting = awaiting.current;
    // Taken from the server when nothing is outstanding, when this is the echo waited for, or when that echo never
    // came (refused, connection lost).
    if (waiting && waiting.key !== echoed && wallClock() - waiting.since < 4_000) return;
    awaiting.current = null;
    latest.current = readSharedPlayerOptions(options);
  }, [echoed]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (change: Partial<SharedPlayerOptions>) => {
    if (!canEdit) return;
    const next = { ...latest.current, ...change };
    latest.current = next;
    awaiting.current = { key: keyOf(next), since: wallClock() };
    onChange({ scope: next.scope, ...(next.difficulty && { difficulty: next.difficulty }) });
  };
  return (
    <div className="mt-1 flex w-full flex-col gap-3 text-left">
      <fieldset disabled={!canEdit} className="min-w-0">
        <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/55">{t("friend.roomOptionScope")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {SHARED_PLAYER_SCOPES.map((scope) => (
            <button key={scope} type="button" aria-pressed={current.scope === scope} data-room-scope={scope}
              onClick={() => set({ scope })} className={chip(current.scope === scope, canEdit)}>
              {sharedPlayerScopeLabel(scope, t)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={!canEdit} className="min-w-0">
        <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/55">{t("friend.roomOptionDifficulty")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {DIFFICULTIES.map(({ value, labelKey }) => {
            const selected = (current.difficulty ?? null) === value;
            return (
              <button key={labelKey} type="button" aria-pressed={selected} data-room-difficulty={value ?? "mixed"}
                onClick={() => set({ difficulty: value ?? undefined })} className={chip(selected, canEdit)}>
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </fieldset>
      {!canEdit && <p className="text-[11px] text-white/50">{t("friend.roomOptionsHostOnly")}</p>}
    </div>
  );
}
