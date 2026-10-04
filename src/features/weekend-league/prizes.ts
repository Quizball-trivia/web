import { PRIZES } from './mock-data';

/** Podium packs carry the matching frame once frames are granted by the
 *  backend (reward policy v2). Until then the card shows kit + coins only. */
export const WL_PACK_HAS_FRAME = true;

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
