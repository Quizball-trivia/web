import { COMPLETE_BONUS, CATEGORIES_PER_DAY, latestDay, puzzleNumber, releaseDay, type Tier } from "./ultimo.logic";

export type ShareLocale = "es" | "en" | "ka" | "tr";
const LETTER: Record<Tier, string> = { complete: "c", good: "g", some: "s", none: "n" };
const TIER: Record<string, Tier> = { c: "complete", g: "good", s: "some", n: "none" };
/** `ue-` keeps these apart from Buscaminas and Pistas codes on the shared /r/ route. */
const CODE = /^ue-(\d{1,5})-(\d{1,3})-([cgsn]{5})-(es|en|ka|tr)$/;

export interface UltimoShareResult {
  number: number;
  score: number;
  tiers: Tier[];
  locale: ShareLocale;
}

export function encodeUltimoShare(number: number, score: number, tiers: readonly Tier[], locale: string): string {
  const shareLocale: ShareLocale = locale === "es" || locale === "ka" || locale === "tr" ? locale : "en";
  return `ue-${number}-${score}-${tiers.map((t) => LETTER[t]).join("")}-${shareLocale}`;
}

/**
 * The code only drives a preview card, but it must still describe a result that could exist: a released board, and
 * a score the tiles allow (a whole list pays at least 8 + the bonus; "none" pays nothing; at most 60 + bonus each).
 */
export function decodeUltimoShare(code: string | null | undefined, today: string = releaseDay()): UltimoShareResult | null {
  if (!code || code.length > 40) return null;
  const match = CODE.exec(code);
  if (!match) return null;
  const number = Number(match[1]);
  const score = Number(match[2]);
  const tiers = [...match[3]].map((l) => TIER[l]);
  const latest = latestDay(today);
  if (!latest || number < 1 || number > puzzleNumber(latest) || tiers.length !== CATEGORIES_PER_DAY) return null;
  const min = tiers.reduce((sum, t) => sum + (t === "complete" ? 8 + COMPLETE_BONUS : t === "none" ? 0 : 1), 0);
  const max = tiers.reduce((sum, t) => sum + (t === "complete" ? 60 + COMPLETE_BONUS : t === "none" ? 0 : 59), 0);
  if (score < min || score > max) return null;
  return { number, score, tiers, locale: match[4] as ShareLocale };
}

export const ULTIMO_SHARE_COPY: Record<ShareLocale, { brandA: string; brandB: string; points: string; challenge: string; title: (n: number, s: number) => string; description: string; open: string }> = {
  es: { brandA: "Último en pie", brandB: "futbolero", points: "pts", challenge: "¿Aguantás más que yo?", title: (n, s) => `Último en pie futbolero #${n}: ${s} pts`, description: "5 categorías por día. Nombrá todas las respuestas que puedas antes de que se acabe el reloj.", open: "Jugar Último en pie" },
  en: { brandA: "Last Answer", brandB: "Standing", points: "pts", challenge: "Can you last longer?", title: (n, s) => `Last Answer Standing #${n}: ${s} pts`, description: "5 football categories a day. Name as many answers as you can before the clock runs out.", open: "Play Last Answer Standing" },
  ka: { brandA: "ბოლომდე", brandB: "დარჩენილი", points: "ქულა", challenge: "უფრო დიდხანს გაძლებ?", title: (n, s) => `ბოლომდე დარჩენილი #${n}: ${s} ქულა`, description: "დღეში 5 საფეხბურთო კატეგორია. დაასახელე რაც შეიძლება მეტი პასუხი, სანამ დრო ამოიწურება.", open: "ითამაშე" },
  tr: { brandA: "Futbolcu", brandB: "Sayma", points: "puan", challenge: "Benden uzun dayanabilir misin?", title: (n, s) => `Futbolcu Sayma Oyunu #${n}: ${s} puan`, description: "Günde 5 futbol kategorisi. Süre bitmeden olabildiğince çok cevap say.", open: "Oyna" },
};
