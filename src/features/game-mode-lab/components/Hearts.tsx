"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/** Row of life hearts (filled = remaining). */
export function Hearts({ lives, max = 3 }: { lives: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${lives} of ${max} lives`}>
      {Array.from({ length: max }, (_, i) => (
        <Heart
          key={i}
          className={cn(
            "size-4 transition-colors",
            i < lives ? "fill-brand-red-soft text-brand-red-soft" : "text-brand-slate/50",
          )}
        />
      ))}
    </span>
  );
}
