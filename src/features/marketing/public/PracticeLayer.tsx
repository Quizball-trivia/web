"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Every engine lives in one client chunk that is fetched only when a visitor presses Play. */
const DemoModeView = dynamic(() => import("@/features/demos/DemoModeView").then((m) => m.DemoModeView), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });

/** Engines that render their own way out ("Skip training"); the layer hides its exit control for them. */
export const SELF_EXITING_ENGINES = new Set(["match", "auction"]);

export const EXIT_LABEL: Record<string, string> = { en: "Exit practice", ka: "სავარჯიშოდან გასვლა", es: "Salir de la práctica", tr: "Alıştırmadan çık" };

/**
 * Full-viewport layer for a practice round. The engines are full-screen
 * screens, so they open portalled to <body> (outside the app shell's scroll
 * container) with their own exit control; focus moves in and back out.
 */
/** `exitControl` false = the engine renders its own way out (the training match has "Skip training"). */
export function PracticeLayer({ title, exitLabel, onExit, exitControl = true, children }: { title: string; exitLabel: string; onExit: () => void; exitControl?: boolean; children: ReactNode }) {
  const exitRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    exitRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, []);
  // Self-exiting engines bind Escape to their own skip (it records completion + analytics).
  useEffect(() => {
    if (!exitControl) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onExit(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [exitControl, onExit]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[80] overflow-y-auto bg-surface-page-alt">
      {exitControl && (
        <button
          ref={exitRef}
          type="button"
          onClick={onExit}
          className="fixed right-3 top-3 z-[120] inline-flex h-9 items-center gap-1 rounded-full bg-black/60 px-3 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/80"
        >
          <X className="size-4" /> {exitLabel}
        </button>
      )}
      {children}
    </div>,
    document.body,
  );
}

/** A practice prototype (no account state) in the layer; used by the hub's ranked demo and the public game pages. */
export function PracticeDemo({ slug, title, locale, backHref, onExit, onEvent }: {
  slug: string; title: string; locale: string; backHref: string; onExit: () => void;
  onEvent?: (event: "start" | "complete" | "replay", detail?: { score?: number }) => void;
}) {
  return (
    <PracticeLayer title={title} exitLabel={EXIT_LABEL[locale] ?? EXIT_LABEL.en} onExit={onExit} exitControl={!SELF_EXITING_ENGINES.has(slug)}>
      <DemoModeView slug={slug} backHref={backHref} onExit={onExit} onEvent={onEvent} />
    </PracticeLayer>
  );
}
