"use client";

// ModalCloseButton — shared "X" affordance used by every dialog/sheet
// in the app. Centralised here because partner feedback flagged that
// the previous per-modal implementations drifted (different sizes,
// different corner radii, different absolute offsets), making the
// close target jump around as the user moved between modals.
//
// All values pinned from the Figma reference (node 620-6336):
//
//   • 48×48 square (`size-12`)
//   • 12px radius (`rounded-xl`)
//   • Red brand fill `#FB3101`, white icon, stroke 3
//   • Anchored to the top-right of the parent modal, INSIDE its
//     padding (not a floating negative-offset overlay) — keeps it
//     reliably tappable on small screens.
//
// The parent modal must have `position: relative` (the default
// `<DialogContent>` / `<SheetContent>` already provide this).
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalCloseButtonProps {
  onClose: () => void;
  /** Override the absolute position if a specific modal needs to nudge
   *  the button (rare — prefer keeping the default for consistency). */
  className?: string;
}

export function ModalCloseButton({ onClose, className }: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className={cn(
        "absolute top-4 right-4 z-20 flex size-12 items-center justify-center",
        "rounded-xl bg-brand-red text-white shadow-sm transition-colors",
        "hover:bg-brand-red active:translate-y-[1px]",
        // The app's default focus ring is green (--ring is a green hue), which
        // looks like a stray glow when Radix auto-focuses this button on open.
        // Suppress the default outline; show a tasteful white ring only on
        // keyboard focus.
        "outline-hidden focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0",
        className,
      )}
    >
      <X className="size-5" strokeWidth={3} />
    </button>
  );
}
