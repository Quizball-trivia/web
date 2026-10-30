"use client";

import Image from "next/image";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { PARTNER_LOCALE_LABELS, PARTNER_LOCALES, partnerCopy, toPartnerLocale } from "../partnerCopy";

export function PartnerHeader() {
  const { locale, setLocale } = useLocale();
  const active = toPartnerLocale(locale);
  const copy = partnerCopy(active);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-surface-page/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] lg:max-w-none lg:px-6">
        <Image src="/assets/brand/quizball-logo.webp" alt="Quizball" width={160} height={40} priority className="mr-auto h-9 w-auto object-contain" />

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
