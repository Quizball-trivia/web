/** Betting-style odds helpers for the bet-native mini-games. */

/** Decimal odds → implied probability %, e.g. 1.2 → 83%, 6.0 → 17%. */
export function impliedPct(odds: number): number {
  return Math.round((1 / odds) * 100);
}

/** Format decimal odds, e.g. 2 → "2.00", 1.25 → "1.25". */
export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

/** Format a coin/points amount with thousands separators. */
export function money(n: number): string {
  return Math.round(n).toLocaleString();
}
