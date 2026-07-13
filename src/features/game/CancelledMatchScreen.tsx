"use client";

import { RotateCcw, TicketCheck } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

interface CancelledMatchScreenProps {
  ticketRefunded: boolean;
  onPlayAgain: () => void;
  onReturnToPlay: () => void;
}

export function CancelledMatchScreen({
  ticketRefunded,
  onPlayAgain,
  onReturnToPlay,
}: CancelledMatchScreenProps) {
  const { t } = useLocale();

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-page px-5 py-10 font-poppins">
      <section className="w-full max-w-md text-center" aria-labelledby="cancelled-match-title">
        <div className="mx-auto mb-8 flex size-20 items-center justify-center rounded-full bg-brand-yellow text-surface-page">
          <TicketCheck className="size-10" aria-hidden="true" strokeWidth={2.25} />
        </div>
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand-yellow">
          {t("matchCancelled.eyebrow")}
        </p>
        <h1 id="cancelled-match-title" className="text-3xl font-extrabold text-white sm:text-4xl">
          {t("matchCancelled.title")}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-base font-medium leading-7 text-brand-slate-light">
          {ticketRefunded ? t("matchCancelled.ticketRefunded") : t("matchCancelled.noResult")}
        </p>
        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-6 text-base font-extrabold text-white transition-colors hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-green/35"
          >
            <RotateCcw className="size-5" aria-hidden="true" />
            {t("matchCancelled.playAgain")}
          </button>
          <button
            type="button"
            onClick={onReturnToPlay}
            className="min-h-12 w-full rounded-xl px-6 text-sm font-bold text-brand-slate-light transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/15"
          >
            {t("matchCancelled.returnToPlay")}
          </button>
        </div>
      </section>
    </main>
  );
}
