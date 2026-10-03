"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale";
import { parseMinute } from "./minuto.logic";
import { minutoCopy } from "./minuto.copy";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/**
 * The minute box from the stream ("MINUTO ?'"): a big numeric field and a confirm button. Accepts "93" or "90+3".
 * `tone` colours it like the seat it belongs to (you = brand green).
 */
export function MinuteInput({ locale, busy, onSubmit, autoFocus = true, id = "minuto-guess", stackOnDesktop = false, className }: {
  locale: Locale; busy: boolean; onSubmit: (minute: number) => void; autoFocus?: boolean; id?: string;
  /** Box above the button from the desktop breakpoint (the duel's narrow side column); CSS only, so typing survives a resize. */
  stackOnDesktop?: boolean; className?: string;
}) {
  const c = minutoCopy(locale);
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) inputRef.current?.focus({ preventScroll: true }); }, [autoFocus]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const minute = parseMinute(text);
    if (minute === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onSubmit(minute);
  };

  return (
    <form onSubmit={submit} className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/70" style={poppins}>{c.inputLabel}</label>
      <div className={cn("flex gap-2", stackOnDesktop && "lg:flex-col")}>
        <div className={cn("relative flex h-16 min-w-0 flex-1 items-center rounded-2xl border-[3px] bg-brand-green/15 transition-colors", invalid ? "border-brand-red-soft" : "border-brand-green focus-within:border-brand-green-light")}>
          <input
            id={id}
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); setInvalid(false); }}
            inputMode="numeric"
            enterKeyHint="go"
            autoComplete="off"
            placeholder="?"
            aria-describedby={`${id}-hint`}
            aria-invalid={invalid}
            disabled={busy}
            className="h-full w-full bg-transparent text-center text-4xl font-black tabular-nums text-white placeholder:text-white/35 focus:outline-none disabled:opacity-60"
            style={poppins}
          />
          <span aria-hidden className="pointer-events-none absolute right-3 top-2 text-2xl font-black text-white/60">&apos;</span>
        </div>
        <button type="submit" disabled={busy || text.trim() === ""} className="h-14 shrink-0 rounded-2xl sm:h-16 bg-brand-green px-5 text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep disabled:opacity-45" style={poppins}>
          {busy ? "…" : c.confirm}
        </button>
      </div>
      <p id={`${id}-hint`} role={invalid ? "alert" : undefined} className={cn("text-center text-[11.5px]", invalid ? "font-bold text-brand-red-soft" : "text-white/55")}>
        {invalid ? c.invalidMinute : c.inputHint}
      </p>
    </form>
  );
}
