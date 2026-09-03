"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeAnswer } from "../lib/text";

interface PlayerSearchInputProps {
  /** Full-name suggestions shown while typing. */
  candidates: string[];
  onSubmit: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
  accentBgClass: string;
}

/**
 * Autocomplete input shared by the name-a-player prototypes. Free text is
 * allowed; suggestions just make mobile play pleasant.
 */
export function PlayerSearchInput({
  candidates,
  onSubmit,
  disabled = false,
  placeholder = "Type a player name…",
  submitLabel = "Answer",
  accentBgClass,
}: PlayerSearchInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const query = normalizeAnswer(value);
    if (!query) return [];
    return candidates
      .filter((name) => normalizeAnswer(name).includes(query))
      .slice(0, 6);
  }, [candidates, value]);

  const showList = focused && suggestions.length > 0 && !disabled;

  const submit = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || disabled) return;
    setValue("");
    setHighlight(0);
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit(showList && suggestions[highlight] ? suggestions[highlight] : value);
    }
  };

  return (
    <div className="relative">
      {showList ? (
        <ul className="absolute bottom-full left-0 right-0 z-20 mb-1.5 overflow-hidden rounded-xl border border-border bg-surface-deep shadow-xl">
          {suggestions.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                // onMouseDown so the click wins over the input's blur.
                onMouseDown={(e) => {
                  e.preventDefault();
                  submit(name);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "w-full px-4 py-2.5 text-left text-sm font-semibold text-white transition-colors",
                  i === highlight ? "bg-surface-card-tint" : "bg-transparent",
                )}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-brand-slate" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => {
              setValue(e.target.value);
              setHighlight(0);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            className="h-12 w-full rounded-xl border border-border bg-surface-input pl-10 pr-3 text-sm font-semibold text-white placeholder:text-brand-slate focus:border-ring focus:outline-none disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={() => submit(value)}
          className={cn(
            "h-12 shrink-0 rounded-xl px-5 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40",
            accentBgClass,
          )}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
