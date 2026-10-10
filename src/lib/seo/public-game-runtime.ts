/** Lightweight client/server contract: do not import the full SEO catalogue into launch controls. */
export const FULL_GAME_DEMO_SLUGS = new Set(["buscaminas", "pistas", "ultimo", "minuto", "daily-statSniper", "shared-player", "name-chain"]);
export const isFullGameDemo = (demoSlug: string | undefined): boolean => FULL_GAME_DEMO_SLUGS.has(demoSlug ?? "");
const COIN_SAMPLE_DEMO_SLUGS = new Set(["mini-trivia-mines", "mini-final-third", "mini-road-to-goal", "mini-squad-spin"]);
/** Dailies and coin samples report their own events; training is timed by its launcher. */
export const engineEmitsEvents = (demoSlug: string | undefined): boolean => Boolean(demoSlug?.startsWith("daily-")) || COIN_SAMPLE_DEMO_SLUGS.has(demoSlug ?? "") || isFullGameDemo(demoSlug);
export const SIGN_IN_PATH = "/play?signin=1";
