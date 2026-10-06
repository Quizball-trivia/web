import { randomBotAvatar } from "@/features/auction/data/botAvatars";
import { scoreRound, standings, type AproximadoQuestion, type RoundResult, type Scoring, type SeatStatus } from "@/features/aproximado/aproximado.rules";
import { toPublicQuestion, type AproximadoRoomView, type RoomSeatView } from "@/features/aproximado/aproximado.views";
import { CLUB, PLAYERS } from "./universe";

/** INVENTED facts about the invented universe (public repo): nothing here is a real player, club or number. */
type L = "es" | "en";
const Q = (id: string, kind: AproximadoQuestion["kind"], prompt: Record<L, string>, unit: Record<L, string>, value: number, precision = 0, exactWithin = 0) =>
  ({ id, kind, prompt, unit, value, precision, exactWithin });

const QUESTIONS = [
  Q("q1", "fee", { es: `¿Por cuánto fichó el ${CLUB.brisa} a ${PLAYERS[0]} en 2021?`, en: `What did ${CLUB.brisa} pay for ${PLAYERS[0]} in 2021?` }, { es: "M€", en: "€M" }, 64.5, 1, 0.5),
  Q("q2", "goals", { es: `¿Cuántos goles de liga marcó ${PLAYERS[1]} en la temporada 2019/20?`, en: `How many league goals did ${PLAYERS[1]} score in 2019/20?` }, { es: "goles", en: "goals" }, 27),
  Q("q3", "attendance", { es: `¿Cuánto público hubo en la final de copa ${CLUB.aurora} – ${CLUB.nube}?`, en: `How big was the crowd at the ${CLUB.aurora} – ${CLUB.nube} cup final?` }, { es: "espectadores", en: "fans" }, 71250, 0, 500),
  Q("q4", "height", { es: `¿Cuánto mide ${PLAYERS[2]}?`, en: `How tall is ${PLAYERS[2]}?` }, { es: "cm", en: "cm" }, 191),
  Q("q5", "value", { es: `¿Cuál fue el valor de mercado más alto de ${PLAYERS[3]}?`, en: `What was ${PLAYERS[3]}'s highest market value?` }, { es: "M€", en: "€M" }, 120, 0, 2),
  Q("q6", "apps", { es: `¿Cuántos partidos jugó ${PLAYERS[4]} con el ${CLUB.brisa}?`, en: `How many games did ${PLAYERS[4]} play for ${CLUB.brisa}?` }, { es: "partidos", en: "games" }, 312),
  Q("q7", "age", { es: `¿A qué edad debutó ${PLAYERS[5]} en primera?`, en: `How old was ${PLAYERS[5]} on his first-team debut?` }, { es: "años", en: "years" }, 17),
  Q("q8", "fee", { es: `¿Por cuánto se fue ${PLAYERS[6]} del ${CLUB.nube}?`, en: `What fee did ${CLUB.nube} get for ${PLAYERS[6]}?` }, { es: "M€", en: "€M" }, 38, 1, 0.5),
  Q("q9", "goals", { es: `¿Cuántos goles hizo ${PLAYERS[7]} con su selección?`, en: `How many international goals did ${PLAYERS[7]} score?` }, { es: "goles", en: "goals" }, 44),
  Q("q10", "attendance", { es: `¿Cuántos socios tiene el ${CLUB.aurora}?`, en: `How many members does ${CLUB.aurora} have?` }, { es: "socios", en: "members" }, 88400, 0, 1000),
];

export function questionFor(round: number, locale: string): AproximadoQuestion {
  const q = QUESTIONS[round % QUESTIONS.length];
  const l: L = locale === "es" ? "es" : "en";
  return { id: q.id, kind: q.kind, prompt: q.prompt[l], unit: q.unit[l], value: q.value, precision: q.precision, exactWithin: q.exactWithin };
}

export const SEAT_NAMES = ["Vos", "Rival Inventado 4821", "Pivote Secreto 9934", "Lateral Anónimo 5520", "Arquero Oculto 7781", "Volante Fantasma 1203"];
export const avatarFor = (seat: number) => randomBotAvatar(`aproximado-seat-${seat}`);

/** A spread of guesses around a value: close, a bit off, far, none (`null`), exact. */
export function guessesFor(n: number, value: number, precision: number, pattern: "spread" | "tie" | "exact" | "missing" | "same" | "none" = "spread"): Array<number | null> {
  const factor = 10 ** precision;
  const round = (v: number) => Math.round(v * factor) / factor;
  const offsets = {
    spread: [0.04, -0.09, 0.18, -0.3, 0.45, 0.7], tie: [0.05, -0.05, 0.2, -0.3, 0.5, 0.8], exact: [0, 0.12, -0.2, 0.35, -0.5, 0.6],
    missing: [0.06, null, -0.15, null, 0.4, -0.6], same: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1], none: [null, null, null, null, null, null],
  }[pattern];
  return Array.from({ length: n }, (_, i) => (offsets[i] === null ? null : round(value * (1 + (offsets[i] as number)))));
}

interface ViewOptions {
  n: number;
  phase: AproximadoRoomView["phase"];
  round?: number;
  scoring?: Scoring;
  locale: string;
  answered?: number[];
  myGuess?: number | null;
  statuses?: Partial<Record<number, SeatStatus>>;
  idle?: number[];
  pattern?: Parameters<typeof guessesFor>[3];
  /** Every past round played with this pattern (e.g. "tie" → a shared first place at the end). */
  pastPattern?: Parameters<typeof guessesFor>[3];
}

/** A whole room view for a static screen: past rounds scored with the real rules, scores summed from them. */
export function roomView(o: ViewOptions): AproximadoRoomView {
  const scoring = o.scoring ?? (o.n === 2 ? "closest" : "podium");
  const round = o.round ?? 3;
  const past: RoundResult[] = Array.from({ length: o.phase === "over" ? 10 : round }, (_, r) => {
    const q = questionFor(r, o.locale);
    return scoreRound(guessesFor(o.n, q.value, q.precision, o.pastPattern ?? (["spread", "tie", "exact", "missing"] as const)[r % 4]), q.value, q.exactWithin, scoring, q.precision);
  });
  const q = questionFor(round, o.locale);
  const reveal = o.phase === "reveal" ? scoreRound(guessesFor(o.n, q.value, q.precision, o.pattern ?? "spread"), q.value, q.exactWithin, scoring, q.precision) : null;
  const results = reveal ? [...past, reveal] : past;
  const withdrawn = new Set(Object.entries(o.statuses ?? {}).filter(([, s]) => s === "withdrawn").map(([k]) => Number(k)));
  const table = standings(o.n, results, withdrawn);
  const seats: RoomSeatView[] = Array.from({ length: o.n }, (_, seat) => ({
    seat, name: SEAT_NAMES[seat], avatar: avatarFor(seat), status: o.statuses?.[seat] ?? "in",
    answered: o.phase === "guess" ? (o.answered ?? []).includes(seat) : reveal ? reveal.entries[seat].guess !== null : false,
    idle: (o.idle ?? []).includes(seat), score: table.find((s) => s.seat === seat)!.points,
  }));
  const question = toPublicQuestion(q);
  return {
    phase: o.phase, round: o.phase === "over" ? 9 : round, totalRounds: 10, scoring, question, seats, mySeat: 0,
    myGuess: o.myGuess ?? (reveal ? reveal.entries[0].guess : null), reveal, results, standings: o.phase === "over" ? table : null,
  };
}
