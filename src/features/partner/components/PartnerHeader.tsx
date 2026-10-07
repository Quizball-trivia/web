"use client";

import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { PARTNER_LOCALE_LABELS, PARTNER_LOCALES, partnerCopy, toPartnerLocale } from "../partnerCopy";
import { postToPartnerParent } from "../partnerMessages";

export function PartnerHeader() {
  const { locale, setLocale } = useLocale();
  const active = toPartnerLocale(locale);
  const copy = partnerCopy(active);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-surface-page/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
        <button
          type="button"
          onClick={() => postToPartnerParent({ type: "quizball:close" })}
          aria-label={copy.backToFreecroco}
          title={copy.backToFreecroco}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-white/[0.08] px-3 font-poppins text-xs font-semibold text-white transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{copy.backToFreecroco}</span>
        </button>

        {/* Text placeholder until Freecroco sends their logo. */}
        <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5 font-poppins">
          <span className="truncate text-[15px] font-extrabold tracking-tight text-brand-green-light">Freecroco</span>
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-white/60">× Quizball</span>
        </div>

        <div role="group" aria-label={copy.language} className="flex shrink-0 rounded-full bg-white/[0.08] p-0.5">
          {PARTNER_LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              lang={option}
              aria-pressed={option === active}
              onClick={() => setLocale(option)}
              className={cn(
                "h-9 min-w-10 rounded-full px-2.5 font-poppins text-[11px] font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                option === active ? "bg-white text-black" : "text-white/70 hover:text-white",
              )}
            >
              {PARTNER_LOCALE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
