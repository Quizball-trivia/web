export type BuyModalMode = "stripe" | "coins" | "equip" | "none";

/**
 * Whether coin affordability permits confirming the store modal. Pending
 * state and mode "none" are enforced elsewhere; this only answers the wallet
 * question — and an owned part in equip mode never costs coins, so the wallet
 * must not be consulted for it. Regression from #310 (2026-08-14): affordability
 * became a render-time derivation from the live catalogue price that ignored
 * the mode, so an owned kit's equip modal showed a disabled "Need more" button
 * whenever the wallet was below that kit's price.
 */
export function affordabilityAllowsConfirm(mode: BuyModalMode | undefined, affordable: boolean): boolean {
  return mode === "equip" || affordable;
}
