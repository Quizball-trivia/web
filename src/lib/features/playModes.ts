/**
 * Controls which optional mode cards appear on the Play screen. Routes stay
 * reachable by direct URL so unfinished modes can still be tested safely.
 */
export const isMiniGamesEnabled = process.env.NEXT_PUBLIC_MINI_GAMES_ENABLED === 'true';

/**
 * Tic Tac Toe is now available on staging, so its card is opt-out. Set the
 * variable to "false" to hide it again.
 */
export const isTicTacToeEnabled = process.env.NEXT_PUBLIC_TIC_TAC_TOE_ENABLED !== 'false';

/**
 * Auction is already available on staging, so its card is opt-out. Set the
 * variable to "false" to return to the Friendly + Daily two-card layout.
 */
export const isAuctionCardEnabled = process.env.NEXT_PUBLIC_AUCTION_CARD_ENABLED !== 'false';
