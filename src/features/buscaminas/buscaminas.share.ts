import { ROUNDS_PER_DAY, MAX_SCORE, type RoundOutcome, type RoundResult } from "./buscaminas.logic";

export type ShareLocale = "es" | "en" | "ka" | "tr";
const LETTER: Record<RoundOutcome, string> = { perfect: "p", banked: "b", mine: "m" };
const OUTCOME: Record<string, RoundOutcome> = { p: "perfect", b: "banked", m: "mine" };
const CODE = /^(\d{1,5})-(\d{1,3})-([pbm]{20})-(es|en|ka|tr)$/;

export interface ShareResult {
  number: number;
  score: number;
  outcomes: RoundOutcome[];
  locale: ShareLocale;
}

/** Compact, unsigned result code for share links; purely cosmetic (it drives a preview image, nothing else). */
export function encodeShare(number: number, results: readonly RoundResult[], locale: string): string {
  const score = results.reduce((sum, r) => sum + r.points, 0);
  const shareLocale: ShareLocale = locale === "es" || locale === "ka" || locale === "tr" ? locale : "en";
  return `${number}-${score}-${results.map((r) => LETTER[r.outcome]).join("")}-${shareLocale}`;
}

export function decodeShare(code: string | null | undefined): ShareResult | null {
  if (!code || code.length > 40) return null;
  const match = CODE.exec(code);
  if (!match) return null;
  const number = Number(match[1]);
  const score = Number(match[2]);
  if (number < 1 || score > MAX_SCORE || match[3].length !== ROUNDS_PER_DAY) return null;
  return { number, score, outcomes: [...match[3]].map((c) => OUTCOME[c]), locale: match[4] as ShareLocale };
}

export const SHARE_COPY: Record<ShareLocale, { brandA: string; brandB: string; points: string; challenge: string; title: (n: number, s: number) => string; description: string; open: string }> = {
  es: { brandA: "Buscaminas", brandB: "futbolero", points: "pts", challenge: "¿Me superás?", title: (n, s) => `Buscaminas futbolero #${n}: ${s} pts`, description: "16 jugadores, 12 cumplen la consigna y 4 son minas. ¿Cuántos puntos hacés vos?", open: "Jugar el Buscaminas futbolero" },
  en: { brandA: "Football", brandB: "Minesweeper", points: "pts", challenge: "Can you beat me?", title: (n, s) => `Football Minesweeper #${n}: ${s} pts`, description: "16 players, 12 fit the clue and 4 are mines. How many points can you get?", open: "Play Football Minesweeper" },
  ka: { brandA: "საფეხბურთო", brandB: "მაღაროები", points: "ქულა", challenge: "მაჯობებ?", title: (n, s) => `საფეხბურთო მაღაროები #${n}: ${s} ქულა`, description: "16 მოთამაშე, 12 შეესაბამება, 4 მაღაროა. რამდენ ქულას აიღებ?", open: "ითამაშე" },
  tr: { brandA: "Futbol", brandB: "Mayın Tarlası", points: "puan", challenge: "Beni geçebilir misin?", title: (n, s) => `Futbol Mayın Tarlası #${n}: ${s} puan`, description: "16 oyuncu, 12'si uyar, 4'ü mayın. Kaç puan alırsın?", open: "Oyna" },
};
