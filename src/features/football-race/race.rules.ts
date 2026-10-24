/**
 * Football Race (prototype): every player owns a racer (a nation), picks a stat, and the racer that really leads that
 * stat moves one space, whoever picked it. This file is the content model and the comparisons; no clock, no state.
 */
export type L10n = { en: string; es: string; pt?: string; de?: string };
export const l10n = (text: L10n, locale: string) => (locale === "pt" ? (text.pt ?? text.en) : locale === "de" ? (text.de ?? text.en) : locale === "es" ? text.es : text.en);

export interface RaceNation {
  id: string; name: L10n; /** flag-icons code; none for invented nations */ flag?: string; /** 0 = most appearances */ tier: number;
  /** Scoreboard code (GER, MEX) for narrow lanes; the id when absent. */
  code?: string;
}
/** A race is played inside one tournament: its eras are the picker's tabs, and only nations with data there are dealt. */
export interface RaceTournament { id: string; label: L10n; scopes: string[]; /** Most matches in the tournament first. */ nations: string[] }
export interface RaceMetric {
  id: string; family: string; dir: "high" | "low"; unwanted: boolean; decimals: number;
  kind: "count" | "rate" | "percent" | "year"; label: L10n; keywords: string;
}
export interface RaceStat {
  id: string; scope: string; metric: string; values: Record<string, number>;
  /** The match, years or player behind a racer's number ("7–3 vs Paraguay · 1958"), shown with it on the reveal. */
  details?: Record<string, L10n>;
}
export interface RacePack {
  version: string; cutoff: string; source: L10n; real: boolean;
  nations: RaceNation[]; scopes: Array<{ id: string; label: L10n; tournament?: string }>; families: Array<{ id: string; label: L10n }>;
  metrics: RaceMetric[]; stats: RaceStat[];
  tournaments?: RaceTournament[];
}

/** What a screen may know about a stat before it is revealed: wording only, never a value. */
export interface PublicStat { id: string; scope: string; metric: string; family: string; unwanted: boolean }

export interface Comparison { values: number[]; leaders: number[]; details: Array<L10n | null> }

/** The number as the screen will show it (one rounding for the comparison guard and for the display). */
export const displayed = (value: number, decimals: number) => Math.round((value + Number.EPSILON) * 10 ** decimals) / 10 ** decimals;

/**
 * The racers' values on one stat and who leads it. `null` = not playable for these racers: a value is missing (unknown is
 * never zero), everyone is level, or the leader and a chaser would show the same number on screen.
 */
export function compare(stat: RaceStat, metric: RaceMetric, racers: readonly string[]): Comparison | null {
  const values: number[] = [];
  for (const r of racers) {
    const v = stat.values[r];
    if (typeof v !== "number") return null;
    values.push(v);
  }
  const score = (v: number) => (metric.dir === "low" ? -v : v);
  const best = Math.max(...values.map(score));
  const leaders = values.flatMap((v, i) => (score(v) === best ? [i] : []));
  if (leaders.length === values.length) return null;
  const top = displayed(values[leaders[0]], metric.decimals);
  if (values.some((v, i) => !leaders.includes(i) && displayed(v, metric.decimals) === top)) return null;
  return { values, leaders, details: racers.map((r) => stat.details?.[r] ?? null) };
}

export function formatValue(metric: RaceMetric, value: number, locale: string): string {
  if (metric.kind === "year") return String(value);
  const text = displayed(value, metric.decimals).toLocaleString(locale === "pt" ? "pt-BR" : locale === "de" ? "de-DE" : locale, { minimumFractionDigits: metric.decimals, maximumFractionDigits: metric.decimals });
  return metric.kind === "percent" ? `${text}%` : text;
}

/** Seeded, so a deal or an automatic pick can be replayed (the room runtime keeps a seed, never Math.random). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Deal {
  /** The tournament the race is played in (packs with tournaments). */
  tournament?: string;
  racers: string[];
  scopes: string[];
  /** Stats playable for these racers inside the theme. */
  statIds: string[];
  /** Stats each racer leads alone: how much each player has to find. */
  leads: number[];
  /** The deal met the full fairness bar (false = the best found after relaxing it). */
  fair: boolean;
}

export interface DealOptions {
  /** Nation ids or scoreboard codes to seat, in seat order. */
  nations?: string[]; scopes?: string[]; themeSize?: number; minLeads?: number;
  /** Fewest leads ÷ most leads a deal must reach (1 = identical). */ balance?: number;
  /** A tournament id, or "random": one that can seat this table fairly. Ignored by packs without tournaments. */
  tournament?: string;
}

const sample = <T,>(items: readonly T[], n: number, random: () => number): T[] => {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
};

/**
 * How many stats each racer leads alone, and whether the deal is fair: every racer leads enough of them, varied, not only
 * unwanted records, and no racer leads far more than another (a wrong pick moves whoever leads that stat, so the racer
 * with the most leads collects the most gifts).
 */
function fairness(pack: RacePack, racers: string[], statIds: string[], minLeads: number, balance: number): { leads: number[]; fair: boolean } {
  const metricOf = new Map(pack.metrics.map((m) => [m.id, m]));
  const statOf = new Map(pack.stats.map((s) => [s.id, s]));
  const per = racers.map(() => ({ count: 0, metrics: new Set<string>(), wanted: 0 }));
  for (const id of statIds) {
    const stat = statOf.get(id)!;
    const metric = metricOf.get(stat.metric)!;
    const c = compare(stat, metric, racers);
    if (!c || c.leaders.length !== 1) continue;
    const p = per[c.leaders[0]];
    p.count += 1; p.metrics.add(metric.id); if (!metric.unwanted) p.wanted += 1;
  }
  const leads = per.map((p) => p.count);
  const enough = per.every((p) => p.count >= minLeads && p.metrics.size >= Math.min(4, minLeads) && p.wanted >= Math.min(3, minLeads));
  return { leads, fair: enough && Math.min(...leads) >= Math.max(...leads) * balance };
}

/**
 * Racers and a theme (a few scopes) for a match. Racers come from one tier of similar nations; a deal is offered only when
 * every racer leads enough stats in the theme and none leads far more than another. The bar relaxes step by step if
 * nothing passes (small or lopsided packs, or racers fixed by hand).
 */
/** A room holds 1v1 up to this many players: beyond it the weakest nation leads too few stats for a fair race. */
export const MAX_SEATS = 4;

/** How often each tournament is drawn when the room leaves it to chance (the big ones most). */
export const TOURNAMENT_WEIGHT: Record<string, number> = { WC: 6, EURO: 3, COPA: 3, AFCON: 2, ALL: 2, WCQ: 1, EUROQ: 1, ASIA: 1, GOLD: 1, NL: 1 };

/** Tournaments that can seat this many players fairly (the room's tournament list shows only these). */
export function tournamentsFor(pack: RacePack, seats: number, seed = 1): string[] {
  return (pack.tournaments ?? []).filter((t) => {
    if (t.nations.length < seats) return false;
    try { return dealMatch(pack, seats, seed, { tournament: t.id }).fair; } catch { return false; }
  }).map((t) => t.id);
}

export function dealMatch(pack: RacePack, seats: number, seed: number, options: DealOptions = {}): Deal {
  const tournaments = pack.tournaments ?? [];
  if (options.tournament === "random" && tournaments.length) {
    // Tournaments in a seeded order that favours the big ones; the first that can seat this table fairly hosts the race.
    const random = rng(seed + 17);
    const order = tournaments.filter((t) => t.nations.length >= seats)
      .map((t) => ({ t, k: random() ** (1 / (TOURNAMENT_WEIGHT[t.id] ?? 1)) })).sort((a, b) => b.k - a.k).map((x) => x.t);
    let best: Deal | null = null;
    for (const t of order) {
      let deal: Deal;
      try { deal = dealMatch(pack, seats, seed, { ...options, tournament: t.id }); } catch { continue; }
      if (deal.fair) return deal;
      if (!best || Math.min(...deal.leads) / Math.max(...deal.leads) > Math.min(...best.leads) / Math.max(...best.leads)) best = deal;
    }
    if (!best) throw new Error("football-race: no tournament can seat this table");
    return best;
  }
  const tournament = tournaments.find((t) => t.id === options.tournament);
  const random = rng(seed);
  const metricOf = new Map(pack.metrics.map((m) => [m.id, m]));
  const byTier = tournament ? tournament.nations : [...pack.nations].sort((a, b) => a.tier - b.tier).map((n) => n.id);
  const known = new Set(byTier);
  const byCode = new Map(pack.nations.map((n) => [n.code ?? n.id, n.id]));
  const fixed = [...new Set((options.nations ?? []).map((id) => (known.has(id) ? id : byCode.get(id) ?? id)))].filter((id) => known.has(id)).slice(0, seats);
  const scopeIds = tournament ? tournament.scopes : pack.scopes.map((s) => s.id);
  const fixedScopes = tournament ? scopeIds : (options.scopes ?? []).filter((id) => scopeIds.includes(id));
  const themeSize = Math.min(scopeIds.length, options.themeSize ?? 3);
  const window = Math.min(byTier.length, Math.max(12, seats * 2));
  const wantLeads = options.minLeads ?? 7;
  const wantBalance = options.balance ?? 0.6;
  const evenness = (leads: number[]) => Math.min(...leads) / Math.max(1, ...leads);
  let best: Deal | null = null;
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const step = Math.floor(attempt / 150);
    const minLeads = Math.max(2, wantLeads - step * 2);
    const balance = Math.max(0, wantBalance - step * 0.15);
    const start = Math.floor(random() * (byTier.length - window + 1));
    const extra = sample(byTier.slice(start, start + window).filter((id) => !fixed.includes(id)), seats - fixed.length, random);
    const racers = [...fixed, ...extra];
    if (racers.length < seats) continue;
    const scopes = fixedScopes.length ? fixedScopes : sample(scopeIds, themeSize, random);
    const statIds = pack.stats.filter((s) => scopes.includes(s.scope) && compare(s, metricOf.get(s.metric)!, racers)).map((s) => s.id);
    const { leads, fair } = fairness(pack, racers, statIds, minLeads, balance);
    const deal: Deal = { tournament: tournament?.id, racers, scopes: scopeIds.filter((id) => scopes.includes(id)), statIds, leads, fair: fair && step === 0 };
    if (fair) return deal;
    if (!best || evenness(leads) > evenness(best.leads)) best = deal;
  }
  // Relaxing fairness never goes as far as an unplayable match: every racer must lead something.
  if (!best || Math.min(...best.leads) < 1) throw new Error("football-race: no playable deal for these racers and scopes");
  return best;
}

export const toPublicStats = (pack: RacePack, statIds: readonly string[]): PublicStat[] => {
  const metricOf = new Map(pack.metrics.map((m) => [m.id, m]));
  const statOf = new Map(pack.stats.map((s) => [s.id, s]));
  return statIds.map((id) => {
    const s = statOf.get(id)!;
    const m = metricOf.get(s.metric)!;
    return { id: s.id, scope: s.scope, metric: s.metric, family: m.family, unwanted: m.unwanted };
  });
};

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Stats matching what the player typed: every word must appear in the wording, the scope or the metric's keywords. */
export function searchStats(pack: Pick<RacePack, "metrics" | "scopes">, stats: readonly PublicStat[], query: string): PublicStat[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...stats];
  const metricOf = new Map(pack.metrics.map((m) => [m.id, m]));
  const scopeOf = new Map(pack.scopes.map((s) => [s.id, s]));
  return stats.filter((s) => {
    const m = metricOf.get(s.metric)!;
    const sc = scopeOf.get(s.scope)!;
    const hay = fold(`${m.label.en} ${m.label.es} ${m.label.pt ?? m.label.en} ${m.label.de ?? m.label.en} ${m.keywords} ${sc.label.en} ${sc.label.es} ${sc.label.pt ?? sc.label.en} ${sc.label.de ?? sc.label.en}`);
    return words.every((w) => hay.includes(w));
  });
}

/** Spaces to the line for a table of this size: about four to five rounds whatever the lobby (more seats = more moves a round). */
export const targetFor = (seats: number) => (seats <= 3 ? 5 : seats + 2);
