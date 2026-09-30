import type { UltimoRunState } from "@/lib/repositories/ultimo.repo";
import type { CategoryResult, EndReason, LocalizedText } from "@/features/ultimo/ultimo.logic";
import { CLUB, PLAYERS } from "./universe";

const same = (text: string): LocalizedText => ({ es: text, en: text, ka: text, tr: text });
export const TITLES: LocalizedText[] = [
  { es: `XI del ${CLUB.aurora} en la final de 2031`, en: `${CLUB.aurora} XI in the 2031 final`, ka: `${CLUB.aurora} — 2031 ფინალის XI`, tr: `${CLUB.aurora} 2031 finali ilk 11'i` },
  { es: `Campeones de la Liga Nube (2030–2039)`, en: `Nube League champions (2030–2039)`, ka: `ნუბე ლიგის ჩემპიონები (2030–2039)`, tr: `Nube Ligi şampiyonları (2030–2039)` },
  { es: `Clubes en los que jugó ${PLAYERS[4]}`, en: `Clubs ${PLAYERS[4]} played for`, ka: `${PLAYERS[4]}-ის კლუბები`, tr: `${PLAYERS[4]}'nun oynadığı kulüpler` },
  { es: `Goleadores históricos del ${CLUB.brisa}`, en: `${CLUB.brisa} all-time top scorers`, ka: `${CLUB.brisa}-ის საუკეთესო ბომბარდირები`, tr: `${CLUB.brisa} tarihi golcüleri` },
  { es: `XI del ${CLUB.nube} en su primer ascenso`, en: `${CLUB.nube} XI in its first promotion`, ka: `${CLUB.nube} — პირველი დაწინაურების XI`, tr: `${CLUB.nube} ilk terfi 11'i` },
];
const HINT = same("Una lista inventada para el playground");
export const DEADLINE = "2031-05-01T12:00:20.000Z";

export const result = (i: number, named: number, total: number, reason: EndReason): CategoryResult =>
  ({ named, complete: reason === "complete", reason, points: named + (reason === "complete" ? 5 : 0), title: TITLES[i], total });

const said = (n: number) => PLAYERS.slice(0, n).map((name) => same(name));

/** A run in category `category` (0-based) with `n` names said and the clock running. */
export function playing(category: number, n: number, extra: Partial<UltimoRunState> = {}): UltimoRunState {
  const results = [result(0, 7, 11, "misses"), result(1, 5, 12, "time"), result(2, 12, 12, "complete"), result(3, 3, 14, "misses")].slice(0, category);
  return {
    day: "2026-10-03", category, totalCategories: 5, title: TITLES[category], hint: HINT, total: 11, open: true, deadline: DEADLINE,
    serverNow: "2031-05-01T12:00:08.000Z", turnMs: 16_000, said: said(n), misses: 0, settled: null, results, done: false,
    score: results.reduce((sum, r) => sum + r.points, 0), answers: results.reduce((sum, r) => sum + r.named, 0), ranked: true, ...extra,
  };
}

/** The category just ended (the sheet), with the names nobody said when the day may show them. */
export function settled(category: number, named: number, reason: EndReason, showMissing: boolean): UltimoRunState {
  const s = playing(category, named, { open: false, deadline: null });
  const r = result(category, named, 11, reason);
  return { ...s, settled: { ...r, missing: showMissing ? said(11).slice(named) : null, missingCount: 11 - named }, results: [...s.results, r] };
}

export function finished(score: number, extra: Partial<UltimoRunState> = {}): UltimoRunState {
  const results = [result(0, 7, 11, "misses"), result(1, 5, 12, "time"), result(2, 12, 12, "complete"), result(3, 3, 14, "misses"), result(4, 0, 11, "time")];
  return { ...playing(4, 0), open: false, deadline: null, done: true, results, score, answers: 27, ...extra };
}
