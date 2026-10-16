import { rng, type RaceMetric, type RacePack } from "@/features/football-race/race.rules";

/**
 * INVENTED nations and numbers (public repo): nothing here is a real team or a real statistic. The real pack is a local
 * file that is never committed (public/dev-data/football-race.json); the playground falls back to this one without it.
 */
const NATIONS = ["Aurora", "Brisa", "Nube", "Solera", "Marea", "Cumbre", "Lirio", "Tormenta", "Vendaval", "Ribera", "Faro", "Dehesa"];
const SCOPES = [
  { id: "COPA", label: { en: "Invented Cup", es: "Copa Inventada" } },
  { id: "LIGA", label: { en: "Invented Nations League", es: "Liga de Naciones Inventada" } },
  { id: "ALL", label: { en: "All matches", es: "Todos los partidos" } },
];
const FAMILIES = [
  { id: "results", label: { en: "Results", es: "Resultados" } },
  { id: "goals", label: { en: "Goals", es: "Goles" } },
  { id: "defence", label: { en: "Defence", es: "Defensa" } },
  { id: "drama", label: { en: "Drama", es: "Drama" } },
  { id: "unwanted", label: { en: "Unwanted records", es: "Récords que nadie quiere" } },
];
const M = (id: string, family: string, en: string, es: string, keywords: string, extra: Partial<RaceMetric> = {}): RaceMetric =>
  ({ id, family, dir: "high", unwanted: family === "unwanted", decimals: 0, kind: "count", label: { en, es }, keywords, ...extra });
const METRICS: RaceMetric[] = [
  M("wins", "results", "Most wins", "Más victorias", "won victories ganados"),
  M("matches", "results", "Most matches played", "Más partidos jugados", "games partidos"),
  M("win_rate", "results", "Best win rate", "Mejor porcentaje de victorias", "percentage porcentaje", { decimals: 1, kind: "percent" }),
  M("goals_for", "goals", "Most goals scored", "Más goles marcados", "scored anotados"),
  M("gf_per_match", "goals", "Most goals per match", "Más goles por partido", "average promedio", { decimals: 2, kind: "rate" }),
  M("biggest_win", "goals", "Biggest win (goal margin)", "Mayor goleada a favor", "thrashing goleada"),
  M("max_goals_one_match", "goals", "Most goals scored in a single match", "Más goles marcados en un solo partido", "one match un partido record"),
  M("penalty_goals", "goals", "Most penalty goals", "Más goles de penal", "penalties pens penales"),
  M("clean_sheets", "defence", "Most clean sheets", "Más porterías a cero", "shutouts valla invicta"),
  M("ga_per_match_low", "defence", "Fewest goals conceded per match", "Menos goles recibidos por partido", "best defence defensa", { dir: "low", decimals: 2, kind: "rate" }),
  M("shootouts_won", "drama", "Most shootouts won", "Más tandas de penales ganadas", "shootout pens tanda"),
  M("longest_unbeaten", "drama", "Longest unbeaten run", "Mayor racha invicta", "streak racha invicto"),
  M("losses", "unwanted", "Most matches lost", "Más derrotas", "lost defeats perdidos"),
  M("heaviest_defeat", "unwanted", "Heaviest defeat (goal margin)", "Peor goleada en contra", "worst loss goleada"),
  M("failed_to_score", "unwanted", "Most matches without scoring", "Más partidos sin marcar", "blank sin gol"),
  M("longest_winless", "unwanted", "Longest winless run", "Mayor racha sin ganar", "winless racha"),
];
const RANGE: Record<string, [number, number]> = {
  wins: [20, 140], matches: [60, 260], win_rate: [28, 64], goals_for: [70, 420], gf_per_match: [0.9, 2.3], biggest_win: [3, 11], max_goals_one_match: [4, 12], penalty_goals: [2, 24],
  clean_sheets: [12, 90], ga_per_match_low: [0.7, 1.9], shootouts_won: [0, 7], longest_unbeaten: [5, 28], losses: [15, 110], heaviest_defeat: [2, 9],
  failed_to_score: [8, 70], longest_winless: [3, 16],
};

export function inventedRacePack(): RacePack {
  const random = rng(20261009);
  return {
    version: "invented-1", cutoff: "2031-05-01", real: false,
    source: { en: "Invented nations and numbers (playground fixture).", es: "Selecciones y números inventados (fixture del playground)." },
    nations: NATIONS.map((name, tier) => ({ id: name.toUpperCase().slice(0, 3), name: { en: name, es: name }, tier })),
    scopes: SCOPES, families: FAMILIES, metrics: METRICS,
    stats: SCOPES.flatMap((scope) => METRICS.map((m) => {
      const [lo, hi] = RANGE[m.id];
      const values = Object.fromEntries(NATIONS.map((name) => {
        const v = lo + random() * (hi - lo);
        return [name.toUpperCase().slice(0, 3), m.decimals ? Math.round(v * 100) / 100 : Math.round(v)];
      }));
      return { id: `${scope.id}:${m.id}`, scope: scope.id, metric: m.id, values };
    })),
  };
}
