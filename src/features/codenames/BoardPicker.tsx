"use client";

import type { KeyboardEvent } from "react";
import { ImageIcon, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { poppins } from "@/features/wordgames/ui";
import { codenamesCopy } from "./codenames.copy";
import type { BoardKind } from "./codenames.view";

/** Pictures or words: the board of the daily, and of a friend room (the host picks; the others see the choice). */
export function BoardPicker({ locale, value, onChange, className }: { locale: string; value: BoardKind; onChange?: (board: BoardKind) => void; className?: string }) {
  const c = codenamesCopy(locale).board;
  const options = [
    { id: "pictures", label: c.pictures, note: c.picturesNote, Icon: ImageIcon },
    { id: "words", label: c.words, note: c.wordsNote, Icon: Type },
  ] as const;
  // A radio group: Tab reaches the picked board, the arrow keys move between the two.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onChange || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const next = value === "pictures" ? "words" : "pictures";
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-board="${next}"]`)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={c.label} data-codenames-board-picker className={cn("grid grid-cols-2 gap-2", className)} onKeyDown={onKeyDown}>
      {options.map(({ id, label, note, Icon }) => {
        const on = value === id;
        return (
          <button key={id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} disabled={!onChange} onClick={() => onChange?.(id)} data-board={id}
            className={cn("flex min-h-16 flex-col items-start justify-center rounded-2xl px-3 py-2 text-left transition-colors",
              on ? "bg-white text-black" : "bg-white/[0.07] text-white enabled:hover:bg-white/[0.12]", !onChange && !on && "opacity-50")}>
            <span className="flex items-center gap-1.5 text-sm font-black uppercase" style={poppins}><Icon className="size-4 shrink-0" aria-hidden />{label}</span>
            <span className={cn("mt-0.5 text-xs font-semibold leading-snug", on ? "text-black/65" : "text-white/60")}>{note}</span>
          </button>
        );
      })}
    </div>
  );
}
