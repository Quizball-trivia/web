/**
 * Auction card visibility on /play. OPT-IN for the production release: the
 * card stays hidden until NEXT_PUBLIC_AUCTION_CARD_ENABLED is explicitly
 * "true" in the deploy environment. Unsetting it (plus a redeploy) is the
 * "hide auction from the UI" emergency action; the backend AUCTION_ENABLED
 * kill switch is the instant lever.
 */
export const isAuctionCardEnabled = process.env.NEXT_PUBLIC_AUCTION_CARD_ENABLED === 'true';
