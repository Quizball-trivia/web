"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/** A Tic Tac Toe room's rules. Mirrors the backend's footballGridRoomOptionsSchema. */
export const GRID_ROOM_ROUNDS = ["bo3", "bo5", "bo7"] as const;
export const GRID_ROOM_TURN_SECONDS = [20, 40, 60] as const;
export const GRID_ROOM_ANSWERS = ["type", "choice"] as const;
export const GRID_ROOM_DIFFICULTIES = ["mixed", "easy", "normal", "hard"] as const;

export interface GridRoomOptionsValue {
  rounds: (typeof GRID_ROOM_ROUNDS)[number];
  turnSeconds: (typeof GRID_ROOM_TURN_SECONDS)[number];
  answers: (typeof GRID_ROOM_ANSWERS)[number];
  difficulty: (typeof GRID_ROOM_DIFFICULTIES)[number];
}

const ROUND_LABELS: Record<GridRoomOptionsValue["rounds"], MessageKey> = {
  bo3: "friend.gridRoundsBo3", bo5: "friend.gridRoundsBo5", bo7: "friend.gridRoundsBo7",
};
const ANSWER_LABELS: Record<GridRoomOptionsValue["answers"], MessageKey> = {
  type: "friend.gridAnswersType", choice: "friend.gridAnswersChoice",
};
const DIFFICULTY_LABELS: Record<GridRoomOptionsValue["difficulty"], MessageKey> = {
  mixed: "friend.roomDifficultyMixed", easy: "friend.roomDifficultyEasy",
  normal: "friend.gridDifficultyNormal", hard: "friend.gridDifficultyHard",
};

/** The room's stored options as this game reads them (anything else is the standard game). */
export function readGridRoomOptions(raw: Record<string, unknown> | null | undefined): GridRoomOptionsValue {
  return {
    rounds: GRID_ROOM_ROUNDS.find((value) => value === raw?.rounds) ?? "bo3",
    turnSeconds: GRID_ROOM_TURN_SECONDS.find((value) => value === raw?.turnSeconds) ?? 40,
    answers: GRID_ROOM_ANSWERS.find((value) => value === raw?.answers) ?? "type",
    difficulty: GRID_ROOM_DIFFICULTIES.find((value) => value === raw?.difficulty) ?? "mixed",
  };
}

const chip = (selected: boolean, canEdit: boolean) => cn(
  "min-h-9 rounded-full px-3 text-xs font-bold transition-colors",
  selected ? "bg-brand-blue text-white" : "bg-white/[0.07] text-white/75",
  canEdit && !selected && "hover:bg-white/[0.12]",
  !canEdit && !selected && "opacity-45",
);

/** Read in event handlers and effects only (never while rendering). */
const wallClock = () => Date.now();
const keyOf = (o: GridRoomOptionsValue) => `${o.rounds}:${o.turnSeconds}:${o.answers}:${o.difficulty}`;

/** The host picks; the other player sees what was picked. */
export function GridRoomOptions({ options, canEdit, onChange }: {
  options: Record<string, unknown> | null;
  canEdit: boolean;
  onChange: (options: Record<string, unknown>) => void;
}) {
  const { t } = useLocale();
  const current = readGridRoomOptions(options);
  // The host's latest choice, ahead of the server's echo: a second choice made before the first comes back builds
  // on it (rounds, then turn time) instead of undoing it.
  const latest = useRef(current);
  /** The choice sent last and not echoed yet: echoes of older choices arriving meanwhile do not overwrite it. */
  const awaiting = useRef<{ key: string; since: number } | null>(null);
  const echoed = keyOf(current);
  useEffect(() => {
    const waiting = awaiting.current;
    if (waiting && waiting.key !== echoed && wallClock() - waiting.since < 4_000) return;
    awaiting.current = null;
    latest.current = readGridRoomOptions(options);
  }, [echoed]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (change: Partial<GridRoomOptionsValue>) => {
    if (!canEdit) return;
    if (awaiting.current && wallClock() - awaiting.current.since >= 4_000) {
      awaiting.current = null;
      latest.current = current;
    }
    const next = { ...latest.current, ...change };
    latest.current = next;
    awaiting.current = { key: keyOf(next), since: wallClock() };
    onChange({ ...next });
  };
  const row = <K extends keyof GridRoomOptionsValue>(
    legend: MessageKey,
    field: K,
    values: ReadonlyArray<GridRoomOptionsValue[K]>,
    label: (value: GridRoomOptionsValue[K]) => string,
  ) => (
    <fieldset disabled={!canEdit} className="min-w-0">
      <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/55">{t(legend)}</legend>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <button key={String(value)} type="button" aria-pressed={current[field] === value} data-grid-option={`${field}:${value}`}
            onClick={() => set({ [field]: value } as Partial<GridRoomOptionsValue>)} className={chip(current[field] === value, canEdit)}>
            {label(value)}
          </button>
        ))}
      </div>
    </fieldset>
  );
  return (
    <div className="mt-1 flex w-full flex-col gap-3 text-left">
      {row("friend.roomOptionDifficulty", "difficulty", GRID_ROOM_DIFFICULTIES, (value) => t(DIFFICULTY_LABELS[value]))}
      {row("friend.gridOptionRounds", "rounds", GRID_ROOM_ROUNDS, (value) => t(ROUND_LABELS[value]))}
      {row("friend.gridOptionTurn", "turnSeconds", GRID_ROOM_TURN_SECONDS, (value) => t("friend.gridTurnSeconds", { n: value }))}
      {row("friend.gridOptionAnswers", "answers", GRID_ROOM_ANSWERS, (value) => t(ANSWER_LABELS[value]))}
      {!canEdit && <p className="text-[11px] text-white/50">{t("friend.roomOptionsHostOnly")}</p>}
    </div>
  );
}
