import { trackEvent } from '@/lib/posthog';

/**
 * One event family for every house-banked coin game (Free Kicks, Trivia Mines,
 * Squad Spin; Road to Goal keeps its own richer, prod-gated set). Properties are
 * flat and numeric so PostHog funnels/insights can compare games side by side.
 */
export type CoinGame = 'free_kicks' | 'trivia_mines' | 'squad_spin';
type Settled = 'cashed' | 'lost' | 'expired' | 'completed';

export function trackMiniGameIntroViewed(slug: string): void {
  trackEvent('mini_game_intro_viewed', { game_slug: slug });
}

export function trackMiniGameIntroStarted(slug: string, resumed: boolean): void {
  trackEvent('mini_game_intro_started', { game_slug: slug, resumed });
}

export function trackMiniGameRoundStarted(game: CoinGame, props: { roundId: string; stake: number; reels?: number }): void {
  trackEvent('mini_game_round_started', { game, round_id: props.roundId, stake: props.stake, reels: props.reels ?? null });
}

export function trackMiniGameRoundSettled(game: CoinGame, props: { roundId: string; status: Settled; stake: number; payout: number; steps?: number }): void {
  trackEvent('mini_game_round_settled', {
    game,
    round_id: props.roundId,
    status: props.status,
    stake: props.stake,
    payout: props.payout,
    net: props.payout - props.stake,
    run_mult: props.stake > 0 ? Math.round((props.payout / props.stake) * 100) / 100 : null,
    steps: props.steps ?? null,
  });
}

export function trackMiniGameError(game: CoinGame, stage: string, status?: number | null): void {
  trackEvent('mini_game_error', { game, stage, status: status ?? null });
}

/** Fires once per round when it leaves `active`; callers keep the last tracked id in a ref. */
export function settleOnce(trackedRef: { current: string | null }, game: CoinGame, state: { round_id: string; status: string; stake_coins: number; payout_coins: number | null } | null, steps?: number): void {
  if (!state || state.status === 'active' || trackedRef.current === state.round_id) return;
  trackedRef.current = state.round_id;
  trackMiniGameRoundSettled(game, { roundId: state.round_id, status: state.status as Settled, stake: state.stake_coins, payout: state.payout_coins ?? 0, steps });
}
