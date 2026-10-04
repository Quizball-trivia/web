import { PRIZES } from './mock-data';

export const WEEKEND_COIN_REWARDS = [
  { id: 'winner', coins: 40000, labelKey: 'weekendLeague.coinWinner' },
  { id: 'second', coins: 25000, labelKey: 'weekendLeague.coinSecond' },
  { id: 'third', coins: 15000, labelKey: 'weekendLeague.coinThird' },
  { id: 'top10', coins: 8000, labelKey: 'weekendLeague.coinTop10' },
  { id: 'finalist', coins: 4000, labelKey: 'weekendLeague.coinFinalist' },
  { id: 'participant', coins: 1500, labelKey: 'weekendLeague.coinParticipant' },
] as const;

/** Same in-game reward ladder in every supported country. */
const REWARDS = { tiers: PRIZES, championRewardKey: 'weekendLeague.prize1Reward' } as const;
export function getWeekendLeaguePrizes(_country?: string | null) { return REWARDS; }
