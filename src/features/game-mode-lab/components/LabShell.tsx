"use client";

import Link from "next/link";
import { ArrowLeft, CircleHelp } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LabModeMeta } from "../registry";

interface LabShellProps {
  mode: LabModeMeta;
  children: React.ReactNode;
  /** Where the back arrow returns to (the demos hub, or the standalone lab). */
  backHref?: string;
}

/** Common frame for every prototype: back link, title, tagline, How to Play. */
export function LabShell({ mode, children, backHref = "/game-mode-lab" }: LabShellProps) {
  const [howToOpen, setHowToOpen] = useState(false);
  const Icon = mode.icon;

  return (
    <main className="min-h-dvh bg-surface-page font-poppins text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-8 pt-4">
        <header className="mb-4 flex items-center gap-3">
          <Link
            href={backHref}
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-card text-brand-slate-light transition-colors hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              mode.accent.softBg,
            )}
          >
            <Icon className={cn("size-5", mode.accent.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight">{mode.name}</h1>
            <p className="truncate text-xs text-brand-slate-light">{mode.tagline}</p>
          </div>
          <button
            type="button"
            onClick={() => setHowToOpen(true)}
            aria-label="How to play"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-card text-brand-slate-light transition-colors hover:text-white"
          >
            <CircleHelp className="size-5" />
          </button>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
      </div>

      <Dialog open={howToOpen} onOpenChange={setHowToOpen}>
        <DialogContent className="border-border bg-surface-deep font-poppins text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className={cn("size-5", mode.accent.text)} />
              {mode.name}
            </DialogTitle>
            <DialogDescription className="sr-only">How to play {mode.name}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-brand-slate-light">
            {mode.howTo.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                    mode.accent.bg,
                  )}
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          <Button variant="secondary" onClick={() => setHowToOpen(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
