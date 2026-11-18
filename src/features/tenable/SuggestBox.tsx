"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ANSWER_MAX_LENGTH, fetchSuggestions, type EntityKind, type Suggestion } from "./tenable.api";

const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const startsLike = (label: string, typed: string) => label.startsWith(typed) || label.split(/[\s.-]+/).some((word) => word.startsWith(typed));

const DEBOUNCE_MS = 150;
const MIN_QUERY = 2;
/** Suggestions depend only on (kind, release, text, language): kept for the page's life, bounded; failures are never kept. */
const cache = new Map<string, Suggestion[]>();
const CACHE_MAX = 300;
/** The server reads only an answer with a letter or a digit in it (symbols alone are refused, not judged). */
const sendable = (text: string) => /[\p{L}\p{N}]/u.test(text.slice(0, ANSWER_MAX_LENGTH));

/**
 * A floor on typed answers sent without a pick, for lists of people (Darts): at least `min` letters or digits with a
 * letter among them (shorter names are never read), and under `known` only when the suggestions asked for the text came
 * back with someone in them (a name is always suggested for its own start). Measured on Darts' typed answers: it holds
 * back the cut-off text sent as is ("h", "inz") and the numbers, never a name that was read.
 */
export type AnswerFloor = { min: number; known: number };
const chars = (text: string) => (text.match(/[\p{L}\p{N}]/gu) ?? []).length;

export type SuggestLookup = (kind: EntityKind, release: string, q: string, locale?: string) => Promise<Suggestion[]>;

/**
 * The typed-answer look of the other games (blue pill input, green pill button) with name suggestions above it. Picking
 * a suggestion sends it at once with its id (namesakes are told apart by the qualifier); Enter sends the highlighted
 * suggestion, or the text as typed when none is highlighted. Results belong to the text and the list (kind, release)
 * they were fetched for: a change of either drops them (and the highlight) at once, so Enter can never send an older pick.
 */
export function SuggestBox({ kind, release, locale, placeholder, say, disabled, note, className, lookup = fetchSuggestions, floor, floorHint, onSubmit }: {
  kind: EntityKind | undefined; release: string | undefined; locale?: string; placeholder: string; say: string; disabled?: boolean; note?: string | null; className?: string;
  lookup?: SuggestLookup;
  floor?: AnswerFloor;
  /** Shown (and announced) when the floor held a typed answer back. */
  floorHint?: string;
  /** Resolves to false when the answer was not applied: it is put back in the box unless something new was typed. */
  onSubmit: (text: string, pick: string | null) => void | Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<{ key: string; items: Suggestion[]; failed?: boolean } | null>(null);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const [held, setHeld] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-o${i}`;

  // Not while a question sheet (leave?) is open over the game: the focus belongs to the sheet.
  useEffect(() => { if (!disabled && !document.querySelector("[data-sheet-asks]")) input.current?.focus({ preventScroll: true }); }, [disabled]);

  const q = draft.trim();
  const key = `${kind}|${release}|${locale ?? ""}|${q.toLowerCase()}`;
  useEffect(() => {
    if (!kind || !release || q.length < MIN_QUERY) return;
    let alive = true;
    const show = (items: Suggestion[], failed = false) => { if (alive) setResult({ key, items, failed }); };
    const hit = cache.get(key);
    if (hit) { const id = window.setTimeout(() => show(hit), 0); return () => { alive = false; window.clearTimeout(id); }; }
    const id = window.setTimeout(() => {
      void lookup(kind, release, q, locale).then((items) => {
        cache.set(key, items);
        if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
        show(items);
      }, () => show([], true));
    }, DEBOUNCE_MS);
    return () => { alive = false; window.clearTimeout(id); };
  }, [key, q, kind, release, locale, lookup]);

  const shown = open && q.length >= MIN_QUERY && result?.key === key ? result.items : [];
  // Nothing picked by keyboard and a single suggestion shown that starts like the typed text (or a word of it does):
  // it is highlighted, so Enter sends the name the player sees. With more than one suggestion nothing is preselected
  // (the typed text may be an exact name of another one); the player picks.
  const typed = fold(q);
  const current = active >= 0 ? active : shown.length === 1 && typed && startsLike(fold(shown[0].label), typed) ? 0 : -1;
  // A highlight belongs to the results it was made on: a new list (another kind or release) drops it with them.
  const [activeKey, setActiveKey] = useState(key);
  if (activeKey !== key) { setActiveKey(key); setActive(-1); }
  // Suggestions still on their way, or failed, never hold an answer back.
  const unknownName = result?.key === key && !result.failed && result.items.length === 0;
  const typedOk = (text: string) => {
    if (!floor) return sendable(text);
    const n = chars(text.slice(0, ANSWER_MAX_LENGTH));
    return /\p{L}/u.test(text) && n >= floor.min && (n >= floor.known || !unknownName);
  };
  const send = (text: string, pick: string | null) => {
    if (disabled) return;
    if (!pick && sendable(text) && !typedOk(text)) { setHeld(true); return; }
    if (!(pick ? sendable(text) : typedOk(text))) return;
    const sent = text.slice(0, ANSWER_MAX_LENGTH);
    void Promise.resolve(onSubmit(sent, pick)).then((applied) => { if (applied === false) setDraft((now) => now || sent); });
    setDraft("");
    setResult(null);
    setActive(-1);
    input.current?.focus({ preventScroll: true });
  };
  const choose = (s: Suggestion) => send(s.label, s.eid);
  const picked = current >= 0 && Boolean(shown[current]);
  // Held back by the floor: said once the suggestions show nobody for it, or once the player tried to send it.
  const blocked = !picked && sendable(draft) && !typedOk(draft);
  const hint = Boolean(floorHint) && blocked && (held || unknownName);

  return (
    <form className={cn("sticky bottom-0 mt-3 space-y-2 bg-surface-page-alt/95 pb-1 pt-2", className)}
      onSubmit={(e) => { e.preventDefault(); if (current >= 0 && shown[current]) choose(shown[current]); else send(draft, null); }}>
      {shown.length > 0 && (
        <ul id={listId} role="listbox" aria-label={placeholder} className="max-h-56 overflow-y-auto rounded-2xl bg-surface-card p-1 shadow-2xl shadow-black/40">
          {shown.map((s, i) => (
            <li key={s.eid} id={optionId(i)} role="option" aria-selected={i === current}
              // The input keeps the focus (the phone keyboard stays up); the pick itself is a click, so a drag that
              // scrolls the list never picks anything.
              onPointerDown={(e) => e.preventDefault()} onClick={() => choose(s)}
              className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm", i === current ? "bg-brand-blue text-white" : "text-white/90 hover:bg-white/10")}>
              <span className="min-w-0 truncate font-semibold">{s.label}</span>
              {s.qualifier && <span className="shrink-0 text-xs text-white/60">{s.qualifier}</span>}
            </li>
          ))}
        </ul>
      )}
      <input ref={input} value={draft} disabled={disabled}
        onChange={(e) => { setDraft(e.target.value.slice(0, ANSWER_MAX_LENGTH)); setActive(-1); setOpen(true); setHeld(false); }}
        onBlur={() => setOpen(false)} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          // Enter that confirms an input-method composition is not a send.
          if (e.key === "Enter" && (e.nativeEvent.isComposing || e.keyCode === 229)) { e.preventDefault(); return; }
          // A disabled Throw blocks Enter's submit: the floor's hint still has to show.
          if (e.key === "Enter" && blocked) setHeld(true);
          if (e.key === "ArrowDown" && shown.length) { e.preventDefault(); setActive((current + 1) % shown.length); }
          else if (e.key === "ArrowUp" && shown.length) { e.preventDefault(); setActive(current <= 0 ? shown.length - 1 : current - 1); }
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
        aria-describedby={hint ? `${listId}-hint` : undefined} aria-invalid={hint || undefined}
        aria-activedescendant={current >= 0 && shown[current] ? optionId(current) : undefined}
        autoComplete="off" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="send"
        placeholder={disabled && note ? note : placeholder} aria-label={placeholder}
        className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
        style={{ fontWeight: 600, letterSpacing: "0.08em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }} />
      {floorHint && <p id={`${listId}-hint`} role="status" className={cn("text-center text-xs font-semibold text-white/70", !hint && "sr-only")}>{hint ? floorHint : ""}</p>}
      <button type="submit" disabled={disabled || !(picked || typedOk(draft))}
        // Keeps the input focused (and the highlighted suggestion with it), so the button sends what Enter would.
        onPointerDown={(e) => e.preventDefault()}
        className="font-poppins h-14 w-full rounded-[20px] bg-brand-green uppercase text-white outline-none transition-colors hover:bg-brand-green-deep focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)" }}>
        {say}
      </button>
    </form>
  );
}
