import { CLUES_PER_ROUND, ROUNDS_PER_DAY, latestDay, pointsFor, puzzleNumber, releaseDay, type RoundResult } from "./pistas.logic";

export type ShareLocale = "es" | "en" | "ka" | "tr";
/** g/y/o: solved with ≤3 / ≤6 / more clues, r: missed — the same buckets as the emoji grid. */
const letterOf = (r: RoundResult) => (r.outcome === "missed" ? "r" : r.clues <= 3 ? "g" : r.clues <= 6 ? "y" : "o");
/** The points a colour can stand for: solved with clues 1–3 / 4–6 / 7–10 pays 10–8 / 7–5 / 4–1, a miss pays 0. */
const POINTS_OF: Record<string, readonly [min: number, max: number]> = {
  g: [pointsFor(3), pointsFor(1)],
  y: [pointsFor(6), pointsFor(4)],
  o: [pointsFor(CLUES_PER_ROUND), pointsFor(7)],
  r: [0, 0],
};
/** `pf-` keeps these apart from Buscaminas codes on the shared /r/ route. */
const CODE = /^pf-(\d{1,5})-(\d{1,3})-([gyor]{10})-(es|en|ka|tr)$/;

export interface PistasShareResult {
  number: number;
  score: number;
  letters: string;
  locale: ShareLocale;
}

export function encodePistasShare(number: number, results: readonly RoundResult[], locale: string): string {
  const score = results.reduce((sum, r) => sum + r.points, 0);
  const shareLocale: ShareLocale = locale === "es" || locale === "ka" || locale === "tr" ? locale : "en";
  return `pf-${number}-${score}-${results.map(letterOf).join("")}-${shareLocale}`;
}

/** The code only drives a preview card, but it must still describe a result that could exist: a released board and a score the grid can add up to. */
export function decodePistasShare(code: string | null | undefined, today: string = releaseDay()): PistasShareResult | null {
  if (!code || code.length > 40) return null;
  const match = CODE.exec(code);
  if (!match) return null;
  const number = Number(match[1]);
  const score = Number(match[2]);
  const letters = match[3];
  const latest = latestDay(today);
  if (!latest || number < 1 || number > puzzleNumber(latest) || letters.length !== ROUNDS_PER_DAY) return null;
  let min = 0;
  let max = 0;
  for (const letter of letters) {
    min += POINTS_OF[letter][0];
    max += POINTS_OF[letter][1];
  }
  if (score < min || score > max) return null;
  return { number, score, letters, locale: match[4] as ShareLocale };
}

export const PISTAS_SHARE_COPY: Record<ShareLocale, { brandA: string; brandB: string; points: string; challenge: string; title: (n: number, s: number) => string; description: string; open: string }> = {
  es: { brandA: "Pistas", brandB: "futboleras", points: "/100", challenge: "¿Me superás?", title: (n, s) => `Pistas futboleras #${n}: ${s}/100`, description: "10 jugadores ocultos, 10 pistas cada uno. Adiviná con menos pistas y sumá más puntos.", open: "Jugar Pistas futboleras" },
  en: { brandA: "Football", brandB: "Clues", points: "/100", challenge: "Can you beat me?", title: (n, s) => `Football Clues #${n}: ${s}/100`, description: "10 hidden players, 10 clues each. Guess with fewer clues to score more.", open: "Play Football Clues" },
  ka: { brandA: "საფეხბურთო", brandB: "მინიშნებები", points: "/100", challenge: "მაჯობებ?", title: (n, s) => `საფეხბურთო მინიშნებები #${n}: ${s}/100`, description: "10 დამალული მოთამაშე, თითოეულს 10 მინიშნება.", open: "ითამაშე" },
  tr: { brandA: "Futbolcu", brandB: "Tahmini", points: "/100", challenge: "Beni geçebilir misin?", title: (n, s) => `Futbolcu Tahmin Etme Oyunu #${n}: ${s}/100`, description: "10 gizli oyuncu, her birine 10 ipucu. Daha az ipucuyla bil, daha çok puan al.", open: "Oyna" },
};
