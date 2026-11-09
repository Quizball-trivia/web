import { RANKED_V2_ENABLED, ZONE_BOT_ENABLED } from "@/lib/config";

/**
 * Ranked 2.0 is free: tickets are hidden everywhere in the UI (header pill, ranked entry cost). The ticket code stays
 * untouched until the Ranked 2.0 release cleanup removes the whole ticket system (docs/zone-match/RANKED-2.0-PLAN.md).
 * Note: until then the old ranked backend still checks tickets at queue time.
 */
export const SHOW_TICKETS = false;

/**
 * Whether the store sells tickets. While the Play page still starts the old ticketed ranked queue (Ranked 2.0 or the
 * Zone bot switched off, see PlayHome), a player with no tickets is sent to the store, so the packs must be there.
 */
export const STORE_SELLS_TICKETS = SHOW_TICKETS || !(RANKED_V2_ENABLED && ZONE_BOT_ENABLED);
