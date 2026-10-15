"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ANSWER_MAX_LENGTH, fetchSuggestions, type EntityKind, type Suggestion } from "./tenable.api";

const DEBOUNCE_MS = 150;
const MIN_QUERY = 2;
/** Suggestions depend only on (kind, release, text): kept for the page's life, bounded; failures are never kept. */
const cache = new Map<string, Suggestion[]>();
const CACHE_MAX = 300;

export type SuggestLookup = (kind: EntityKind, release: string, q: string) => Promise<Suggestion[]>;

/**
 * The typed-answer look of the other games (blue pill input, green pill button) with name suggestions above it. Picking
 * a suggestion sends it at once with its id (namesakes are told apart by the qualifier); Enter sends the highlighted
 * suggestion, or the text as typed when none is highlighted. Results belong to the text and the list (kind, release)
 * they were fetched for: a change of either drops them (and the highlight) at once, so Enter can never send an older pick.
 */
export function SuggestBox({ kind, release, placeholder, say, disabled, note, className, lookup = fetchSuggestions, onSubmit }: {
  kind: EntityKind | undefined; release: string | undefined; placeholder: string; say: string; disabled?: boolean; note?: string | null; className?: string;
  lookup?: SuggestLookup; onSubmit: (text: string, pick: string | null) => void;
}) {
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<{ key: string; items: Suggestion[] } | null>(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-o${i}`;

  // Not while a question sheet (leave?) is open over the game: the focus belongs to the sheet.
  useEffect(() => { if (!disabled && !document.querySelector("[data-sheet-asks]")) input.current?.focus({ preventScroll: true }); }, [disabled]);

  const q = draft.trim();
  const key = `${kind}|${release}|${q.toLowerCase()}`;
  useEffect(() => {
    if (!kind || !release || q.length < MIN_QUERY) return;
    let alive = true;
    const show = (items: Suggestion[]) => { if (alive) setResult({ key, items }); };
    const hit = cache.get(key);
    if (hit) { const id = window.setTimeout(() => show(hit), 0); return () => { alive = false; window.clearTimeout(id); }; }
    const id = window.setTimeout(() => {
      void lookup(kind, release, q).then((items) => {
        cache.set(key, items);
        if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
        show(items);
      }, () => show([]));
    }, DEBOUNCE_MS);
    return () => { alive = false; window.clearTimeout(id); };
  }, [key, q, kind, release, lookup]);

  const shown = open && q.length >= MIN_QUERY && result?.key === key ? result.items : [];
  // A highlight belongs to the results it was made on: a new list (another kind or release) drops it with them.
  const [activeKey, setActiveKey] = useState(key);
  if (activeKey !== key) { setActiveKey(key); setActive(-1); }
  const send = (text: string, pick: string | null) => {
    if (!text.trim() || disabled) return;
    onSubmit(text.slice(0, ANSWER_MAX_LENGTH), pick);
    setDraft("");
    setResult(null);
    setActive(-1);
    input.current?.focus({ preventScroll: true });
  };
  const choose = (s: Suggestion) => send(s.label, s.eid);

  return (
    <form className={cn("sticky bottom-0 mt-3 space-y-2 bg-surface-page-alt/95 pb-1 pt-2", className)}
      onSubmit={(e) => { e.preventDefault(); if (active >= 0 && shown[active]) choose(shown[active]); else send(draft, null); }}>
      {shown.length > 0 && (
        <ul id={listId} role="listbox" aria-label={placeholder} className="max-h-56 overflow-y-auto rounded-2xl bg-surface-card p-1 shadow-2xl shadow-black/40">
          {shown.map((s, i) => (
            <li key={s.eid} id={optionId(i)} role="option" aria-selected={i === active}
              // The input keeps the focus (the phone keyboard stays up); the pick itself is a click, so a drag that
              // scrolls the list never picks anything.
              onPointerDown={(e) => e.preventDefault()} onClick={() => choose(s)}
              className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm", i === active ? "bg-brand-blue text-white" : "text-white/90 hover:bg-white/10")}>
              <span className="min-w-0 truncate font-semibold">{s.label}</span>
              {s.qualifier && <span className="shrink-0 text-xs text-white/60">{s.qualifier}</span>}
            </li>
          ))}
        </ul>
      )}
      <input ref={input} value={draft} disabled={disabled}
        onChange={(e) => { setDraft(e.target.value.slice(0, ANSWER_MAX_LENGTH)); setActive(-1); setOpen(true); }}
        onBlur={() => setOpen(false)} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && shown.length) { e.preventDefault(); setActive((a) => (a + 1) % shown.length); }
          else if (e.key === "ArrowUp" && shown.length) { e.preventDefault(); setActive((a) => (a <= 0 ? shown.length - 1 : a - 1)); }
          else if (e.key === "Escape" && shown.length) {
            // Closes the suggestions only; the game's own Escape (exit) is for when they are closed.
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            setOpen(false);
            setActive(-1);
          }
        }}
        role="combobox" aria-autocomplete="list" aria-expanded={shown.length > 0} aria-controls={listId}
        aria-activedescendant={active >= 0 && shown[active] ? optionId(active) : undefined}
        autoComplete="off" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="send"
        placeholder={disabled && note ? note : placeholder} aria-label={placeholder}
        className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
        style={{ fontWeight: 600, letterSpacing: "0.08em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }} />
      <button type="submit" disabled={disabled || !draft.trim()}
        className="font-poppins h-14 w-full rounded-[20px] bg-brand-green uppercase text-white outline-none transition-colors hover:bg-brand-green-deep focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)" }}>
        {say}
      </button>
    </form>
  );
}
