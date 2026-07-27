"use client";

import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface LeaderboardSelectOption<T extends string> {
  value: T;
  label: string;
  /** Optional leading glyph for the row (e.g. a trophy on finished seasons). */
  icon?: LucideIcon;
}

interface LeaderboardSelectProps<T extends string> {
  /** Tiny uppercase label above the value, e.g. "SEASON". */
  eyebrow: string;
  icon: LucideIcon;
  options: LeaderboardSelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Event mode swaps brand orange for the Betsson accent. */
  accentHex?: string;
}

export function LeaderboardSelect<T extends string>({
  eyebrow,
  icon: Icon,
  options,
  value,
  onChange,
  ariaLabel,
  accentHex,
}: LeaderboardSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];

  const accent = accentHex ?? "hsl(var(--brand-orange))";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex h-11 min-w-0 items-center gap-2 rounded-lg border bg-black/40 px-2.5 text-left transition-colors hover:bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{ borderColor: accent }}
        >
          <Icon className="size-3.5 shrink-0" aria-hidden style={{ color: accent }} />
          <span className="min-w-0 leading-none">
            <span className="block text-[8px] font-black uppercase tracking-[0.16em] text-white/50">
              {eyebrow}
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-black uppercase tracking-wide text-white">
              {selected?.label}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-white/50 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        role="listbox"
        aria-label={ariaLabel}
        className="w-[190px] overflow-hidden rounded-xl border border-white/10 bg-popover p-1 font-fun shadow-[0_18px_48px_rgba(0,0,0,0.5)]"
      >
        {options.map((option) => {
          const isActive = option.value === value;
          const RowIcon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "relative flex w-full items-center gap-2 rounded-lg py-2 pl-3 pr-2 text-left text-[11px] font-black uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                isActive ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
              )}
              style={isActive ? { backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)` } : undefined}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-0 w-[3px] rounded-full"
                  style={{ backgroundColor: accent }}
                />
              )}
              {RowIcon && <RowIcon className="size-3 shrink-0 text-white/50" aria-hidden />}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {isActive && <Check className="size-3.5 shrink-0" aria-hidden style={{ color: accent }} />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
