import { asWordLocale, russianPlural } from "@/features/wordgames/copy";

/** Same units and words as the backend (tenable.figures.ts): "141 goals" / "141 goles" / "141 gol" / "141 გოლი". */
export type FigureUnit = "goals" | "apps" | "caps" | "titles" | "eur_m" | "assists" | "wins" | "points" | "seasons" | "year" | "none";
const WORDS: Record<Exclude<FigureUnit, "eur_m" | "year" | "none">, Record<"en" | "es" | "tr" | "ka", [string, string]>> = {
  goals: { en: ["goal", "goals"], es: ["gol", "goles"], tr: ["gol", "gol"], ka: ["გოლი", "გოლი"] },
  apps: { en: ["app", "apps"], es: ["partido", "partidos"], tr: ["maç", "maç"], ka: ["მატჩი", "მატჩი"] },
  caps: { en: ["cap", "caps"], es: ["partido", "partidos"], tr: ["maç", "maç"], ka: ["მატჩი", "მატჩი"] },
  titles: { en: ["title", "titles"], es: ["título", "títulos"], tr: ["kupa", "kupa"], ka: ["ტიტული", "ტიტული"] },
  assists: { en: ["assist", "assists"], es: ["asistencia", "asistencias"], tr: ["asist", "asist"], ka: ["საგოლე პასი", "საგოლე პასი"] },
  wins: { en: ["win", "wins"], es: ["victoria", "victorias"], tr: ["galibiyet", "galibiyet"], ka: ["მოგება", "მოგება"] },
  points: { en: ["pt", "pts"], es: ["punto", "puntos"], tr: ["puan", "puan"], ka: ["ქულა", "ქულა"] },
  seasons: { en: ["season", "seasons"], es: ["temporada", "temporadas"], tr: ["sezon", "sezon"], ka: ["სეზონი", "სეზონი"] },
};
/** 1 гол, 2 гола, 5 голов; a fraction takes the genitive singular (12,5 гола). */
const RU: Record<keyof typeof WORDS, [string, string, string]> = {
  goals: ["гол", "гола", "голов"], apps: ["матч", "матча", "матчей"], caps: ["матч", "матча", "матчей"], titles: ["титул", "титула", "титулов"],
  assists: ["ассист", "ассиста", "ассистов"], wins: ["победа", "победы", "побед"], points: ["очко", "очка", "очков"], seasons: ["сезон", "сезона", "сезонов"],
};

export function formatFigure(figure: { value: number; unit: FigureUnit } | null, rawLocale: string): string | null {
  if (!figure) return null;
  const locale = asWordLocale(rawLocale);
  const { value, unit } = figure;
  if (unit === "none") return null;
  if (unit === "year") return String(Math.round(value));
  const n = new Intl.NumberFormat(locale === "en" ? "en-GB" : locale, { maximumFractionDigits: 1 }).format(value);
  if (unit === "eur_m") return locale === "es" ? `${n} M€` : locale === "tr" ? `${n} milyon €` : locale === "ka" ? `€${n} მლნ` : locale === "ru" ? `${n} млн €` : `€${n}m`;
  if (locale === "ru") {
    const [one, few, many] = RU[unit];
    return `${n} ${Number.isInteger(value) ? russianPlural(value, one, few, many) : few}`;
  }
  const [one, many] = WORDS[unit][locale];
  return `${n} ${value === 1 ? one : many}`;
}
