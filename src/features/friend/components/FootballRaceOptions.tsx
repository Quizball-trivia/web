"use client";

import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";

/**
 * The tournaments a Football Horserace room can be pinned to, and the most players each one seats fairly (mirrors the
 * current data release; the server checks again at the start and refuses a group it cannot deal).
 */
const TOURNAMENTS: ReadonlyArray<{ id: string; seats: number; label: Record<"en" | "es" | "ka" | "tr", string> }> = [
  { id: "WC", seats: 4, label: { en: "World Cup", es: "Mundial", ka: "მსოფლიო ჩემპიონატი", tr: "Dünya Kupası" } },
  { id: "EURO", seats: 4, label: { en: "Euros", es: "Eurocopa", ka: "ევროპის ჩემპიონატი", tr: "Avrupa Şampiyonası" } },
  { id: "COPA", seats: 3, label: { en: "Copa América", es: "Copa América", ka: "კოპა ამერიკა", tr: "Copa América" } },
  { id: "AFCON", seats: 3, label: { en: "Africa Cup of Nations", es: "Copa Africana", ka: "აფრიკის ერთა თასი", tr: "Afrika Uluslar Kupası" } },
  { id: "ASIA", seats: 3, label: { en: "Asian Cup", es: "Copa Asiática", ka: "აზიის თასი", tr: "Asya Kupası" } },
  { id: "GOLD", seats: 2, label: { en: "Gold Cup", es: "Copa Oro", ka: "ოქროს თასი", tr: "Altın Kupa" } },
  { id: "WCQ", seats: 4, label: { en: "World Cup qualifiers", es: "Eliminatorias", ka: "მსოფლიო ჩემპიონატის შესარჩევი", tr: "Dünya Kupası elemeleri" } },
  { id: "EUROQ", seats: 3, label: { en: "Euro qualifiers", es: "Clasificación Eurocopa", ka: "ევროს შესარჩევი", tr: "Avrupa Şampiyonası elemeleri" } },
  { id: "NL", seats: 3, label: { en: "Nations League", es: "Liga de Naciones", ka: "ერთა ლიგა", tr: "Uluslar Ligi" } },
  { id: "ALL", seats: 4, label: { en: "All internationals", es: "Todos los partidos", ka: "ყველა მატჩი", tr: "Tüm maçlar" } },
];

export function readFootballRaceTournament(raw: Record<string, unknown> | null | undefined): string {
  return TOURNAMENTS.find((t) => t.id === raw?.tournament)?.id ?? "random";
}

const chip = (selected: boolean, enabled: boolean) => cn(
  "min-h-9 rounded-full px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed",
  selected ? "bg-brand-blue text-white" : "bg-white/[0.07] text-white/75",
  enabled && !selected && "hover:bg-white/[0.12]",
  !enabled && !selected && "opacity-45",
);

/** The host picks the tournament (or random, the big ones most often); a tournament too small for the room is off. */
export function FootballRaceOptions({ options, memberCount, canEdit, onChange }: {
  options: Record<string, unknown> | null;
  memberCount: number;
  canEdit: boolean;
  onChange: (options: Record<string, unknown>) => void;
}) {
  const { t, locale } = useLocale();
  const lang = locale === "es" || locale === "ka" || locale === "tr" ? locale : "en";
  const current = readFootballRaceTournament(options);
  const choices = [{ id: "random", seats: 4, label: t("friend.roomTournamentRandom") }, ...TOURNAMENTS.map((x) => ({ id: x.id, seats: x.seats, label: x.label[lang] }))];
  return (
    <div className="mt-1 flex w-full flex-col gap-2 text-left">
      <fieldset disabled={!canEdit} className="min-w-0">
        <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/55">{t("friend.roomOptionTournament")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {choices.map((choice) => {
            const selected = current === choice.id;
            const fits = memberCount <= choice.seats;
            return (
              <button key={choice.id} type="button" aria-pressed={selected} data-race-tournament={choice.id} disabled={!fits && !selected}
                title={fits ? undefined : t("friend.roomTournamentTooSmall")}
                onClick={() => canEdit && !selected && onChange({ tournament: choice.id })} className={chip(selected, canEdit && fits)}>
                {choice.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      {TOURNAMENTS.some((x) => x.id === current && memberCount > x.seats) && (
        <p role="status" className="text-[11px] font-semibold text-brand-yellow">{t("friend.roomTournamentTooSmall")}</p>
      )}
      {!canEdit && <p className="text-[11px] text-white/50">{t("friend.roomOptionsHostOnly")}</p>}
    </div>
  );
}
