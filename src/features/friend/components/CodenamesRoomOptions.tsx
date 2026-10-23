"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Timer } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { BoardPicker } from "@/features/codenames/BoardPicker";
import { codenamesCopy } from "@/features/codenames/codenames.copy";
import { takeRoomPreset } from "@/features/codenames/codenames.board";
import { wordDeckLang } from "@/features/codenames/codenames.practice";
import { poppins } from "@/features/wordgames/ui";
import { cn } from "@/lib/utils";

/** The board languages and how each is written in itself. */
const LANGUAGE: Record<string, string> = { en: "English", es: "Español", tr: "Türkçe", ru: "Русский", pt: "Português", ka: "ქართული" };

/** Seconds per clue and per team's guessing that the host may pick (the server's TURN_TIMERS); null: no clock. */
export const TURN_TIMERS = [null, 60, 90, 120] as const;
export type TurnTimer = (typeof TURN_TIMERS)[number];

/** How long a pick waits for the room to confirm it before the screen shows the room's options again. */
const PENDING_MS = 5_000;

export interface CodenamesOptions { board: "pictures" | "words"; lang: string | null; timer: TurnTimer }

/** The room's stored options as Codenames reads them: the board (a word board in its language) and the turn timer. */
export function readCodenamesOptions(raw: Record<string, unknown> | null | undefined): CodenamesOptions {
  const words = raw?.board === "words" && typeof raw.lang === "string";
  const timer = TURN_TIMERS.find((t) => t !== null && t === raw?.timer) ?? null;
  return { board: words ? "words" : "pictures", lang: words ? (raw!.lang as string) : null, timer };
}

/** What the server stores: only what differs from a picture board without a clock (null: nothing). */
export function writeCodenamesOptions(o: CodenamesOptions): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  if (o.board === "words" && o.lang) Object.assign(out, { board: "words", lang: o.lang });
  if (o.timer) out.timer = o.timer;
  return Object.keys(out).length > 0 ? out : null;
}

/** Off, 60 s, 90 s or 2 min: a radio group like the board picker. */
function TimerPicker({ locale, value, onChange }: { locale: string; value: TurnTimer; onChange?: (timer: TurnTimer) => void }) {
  const c = codenamesCopy(locale).timer;
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onChange || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const next = TURN_TIMERS[(TURN_TIMERS.indexOf(value) + step + TURN_TIMERS.length) % TURN_TIMERS.length];
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-timer="${next ?? "off"}"]`)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={c.label} data-codenames-timer-picker className="grid grid-cols-4 gap-1.5" onKeyDown={onKeyDown}>
      {TURN_TIMERS.map((t) => {
        const on = value === t;
        return (
          <button key={t ?? "off"} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} disabled={!onChange} onClick={() => onChange?.(t)} data-timer={t ?? "off"}
            className={cn("h-10 min-w-0 truncate rounded-xl px-1 text-xs font-black uppercase transition-colors", on ? "bg-white text-black" : "bg-white/[0.07] text-white enabled:hover:bg-white/[0.12]", !onChange && !on && "opacity-50")}
            style={poppins}>
            {t === null ? c.off : c.option(t)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Pictures or words, and the turn timer, picked by the host in the lobby (the board is dealt at kick-off). A word board
 * is in the host's language at the moment of the pick (English while that language has no deck). A host who chose Words
 * on the Codenames screen before opening the room gets it preset once.
 */
export function CodenamesRoomOptions({ options, canEdit, onChange }: {
  options: Record<string, unknown> | null;
  canEdit: boolean;
  onChange: (options: Record<string, unknown> | null) => void;
}) {
  const { locale } = useLocale();
  const c = codenamesCopy(locale);
  const stored = readCodenamesOptions(options);
  // The host's last pick until the room confirms it: a second tap before the first one's answer builds on the first
  // (board then timer must not send a timer on the old board). A refused pick falls back to the room's after a while.
  const [pending, setPending] = useState<CodenamesOptions | null>(null);
  const keyOf = (o: CodenamesOptions) => JSON.stringify(writeCodenamesOptions(o));
  if (pending && keyOf(pending) === keyOf(stored)) setPending(null);
  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => setPending(null), PENDING_MS);
    return () => window.clearTimeout(id);
  }, [pending]);
  const current = pending ?? stored;
  const change = (next: Partial<CodenamesOptions>) => {
    const merged = { ...current, ...next };
    setPending(merged);
    onChange(writeCodenamesOptions(merged));
  };
  const preset = useRef(false);
  useEffect(() => {
    if (preset.current || !canEdit || stored.board === "words") return;
    preset.current = true;
    if (!takeRoomPreset()) return;
    const words: CodenamesOptions = { ...stored, board: "words", lang: wordDeckLang(locale) };
    // As a pending pick, so a timer chosen before the room confirms Words builds on it (set after this effect).
    queueMicrotask(() => setPending(words));
    onChange(writeCodenamesOptions(words));
  }, [canEdit, stored, locale, onChange]);
  return (
    <div data-codenames-room-options className="mt-2 w-full text-left">
      <BoardPicker locale={locale} value={current.board}
        onChange={canEdit ? (board) => change(board === "words" ? { board, lang: wordDeckLang(locale) } : { board, lang: null }) : undefined} />
      {current.board === "words" && current.lang && <p className="mt-2 text-center text-xs font-semibold text-white/70">{c.board.words} · {LANGUAGE[current.lang] ?? current.lang}</p>}
      <p className="mb-1.5 mt-3 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-white/60"><Timer className="size-3.5" aria-hidden />{c.timer.label}</p>
      <TimerPicker locale={locale} value={current.timer} onChange={canEdit ? (timer) => change({ timer }) : undefined} />
      {current.timer && <p className="mt-1.5 text-center text-xs text-white/55">{c.timer.note}</p>}
      {!canEdit && <p className="mt-1 text-center text-xs text-white/55">{c.timer.hostPicks}</p>}
    </div>
  );
}
