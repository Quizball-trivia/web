"use client";

import { useEffect, useState } from "react";
import { guestApi, type PublicStandings, type PublicStandingsBlock } from "@/lib/repositories/guest.repo";

type Locale = "en" | "ka" | "es";
const COPY: Record<Locale, { title: string; ranked: string; wl: string; notStarted: string; pending: string; unavailable: string; updated: string }> = {
  en: { title: "Standings", ranked: "Ranked", wl: "Weekend League", notStarted: "Weekend League has not started yet.", pending: "Standings appear after the first game.", unavailable: "Standings are temporarily unavailable.", updated: "Updated" },
  es: { title: "Clasificación", ranked: "Clasificatorio", wl: "Weekend League", notStarted: "La Weekend League aún no ha empezado.", pending: "La clasificación aparece tras el primer juego.", unavailable: "La clasificación no está disponible ahora mismo.", updated: "Actualizado" },
  ka: { title: "ცხრილი", ranked: "რეიტინგული", wl: "შაბათ-კვირის ლიგა", notStarted: "შაბათ-კვირის ლიგა ჯერ არ დაწყებულა.", pending: "ცხრილი პირველი თამაშის შემდეგ გამოჩნდება.", unavailable: "ცხრილი დროებით მიუწვდომელია.", updated: "განახლდა" },
};

function Block({ block, label, copy, locale }: { block: PublicStandingsBlock; label: string; copy: (typeof COPY)[Locale]; locale: Locale }) {
  const time = new Date(block.updated_at).toLocaleTimeString(locale === "ka" ? "ka-GE" : locale === "es" ? "es-ES" : "en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-white/85">{label}</h3>
        <span className="text-[10px] text-white/45">{copy.updated} {time}</span>
      </div>
      {block.status === "live" && block.entries.length > 0 ? (
        <ol className="mt-2 space-y-1">
          {block.entries.map((e) => (
            <li key={`${e.rank}-${e.alias}`} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-right font-black tabular-nums text-brand-yellow">#{e.rank}</span>
              <span className="min-w-0 flex-1 truncate font-semibold uppercase">{e.alias}</span>
              <span className="tabular-nums text-white/75">{e.score.toLocaleString()} {block.scoring_label}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-white/65">{block.status === "not_started" ? copy.notStarted : block.status === "pending_results" ? copy.pending : copy.unavailable}</p>
      )}
    </div>
  );
}

/** Real standings for the homepage: a read-only projection with honest empty and failure states; the grid never waits on it. */
export function StandingsSnippet({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const [data, setData] = useState<PublicStandings | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    guestApi.standings().then((d) => { if (!cancelled) setData(d); });
    return () => { cancelled = true; };
  }, []);
  const fallback = (competition: PublicStandingsBlock["competition"]): PublicStandingsBlock => ({ competition, scoring_label: "", status: "unavailable", entries: [], updated_at: new Date().toISOString() });
  return (
    <section aria-label={copy.title} className="mt-4 min-h-[16rem] space-y-3">
      <h2 className="text-base font-bold uppercase text-white/85">{copy.title}</h2>
      {data === undefined ? (
        <div className="h-52 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <>
          <Block block={data?.ranked ?? fallback("ranked")} label={copy.ranked} copy={copy} locale={locale} />
          <Block block={data?.weekend_league ?? fallback("weekend_league")} label={copy.wl} copy={copy} locale={locale} />
        </>
      )}
    </section>
  );
}
