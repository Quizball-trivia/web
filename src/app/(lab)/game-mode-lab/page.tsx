"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { FlaskConical, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModePreview } from "@/features/game-mode-lab/components/ModePreview";
import { LAB_MODES } from "@/features/game-mode-lab/registry";

export default function GameModeLabPage() {
  return (
    <main className="min-h-dvh bg-surface-page pb-10 font-poppins text-white">
      <div className="mx-auto w-full max-w-4xl px-4">
        <header className="py-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-green/15">
            <FlaskConical className="size-6 text-brand-green-light" />
          </div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Game Mode Lab</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-brand-slate-light">
            Nine experimental QuizBall modes. Each is a 1–3 minute playable
            prototype — try them all and tell us which we should build for real.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {LAB_MODES.map((mode, i) => {
            const Icon = mode.icon;
            return (
              <motion.div
                key={mode.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/game-mode-lab/${mode.id}`}
                  className={cn(
                    "group flex h-full flex-col rounded-3xl border border-border bg-surface-card p-4 transition-all",
                    "hover:-translate-y-0.5 hover:border-white/20 hover:bg-surface-card-tint",
                  )}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        mode.accent.softBg,
                      )}
                    >
                      <Icon className={cn("size-5", mode.accent.text)} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-extrabold">{mode.name}</h2>
                    </div>
                  </div>

                  <ModePreview modeId={mode.id} />

                  <p className="mt-3 flex-1 text-xs leading-relaxed text-brand-slate-light">
                    {mode.tagline}
                  </p>

                  <div
                    className={cn(
                      "mt-3 flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-transform group-active:scale-95",
                      mode.accent.bg,
                    )}
                  >
                    <Play className="size-4 fill-current" />
                    Play Prototype
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-brand-slate">
          Internal prototypes — hardcoded content, simulated opponents. Nothing is saved.
        </p>
      </div>
    </main>
  );
}
