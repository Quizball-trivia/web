// Stat names only, no card data: screens that must not ship the bundled FIFA dataset (the partner Card Detective)
// import these instead of ./data.
import type { FifaCardStats } from '@/features/mini-games/data/guessFifaCard';

export type StatKey = keyof FifaCardStats;
export const STAT_KEYS: StatKey[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
export type BattleStat = StatKey | 'overall';
export const BATTLE_STATS: BattleStat[] = ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'overall'];

export const STAT_LABEL: Record<BattleStat, string> = {
  pac: 'PACE',
  sho: 'SHOOTING',
  pas: 'PASSING',
  dri: 'DRIBBLING',
  def: 'DEFENDING',
  phy: 'PHYSICAL',
  overall: 'OVERALL',
};
export const STAT_SHORT: Record<BattleStat, string> = {
  pac: 'PAC', sho: 'SHO', pas: 'PAS', dri: 'DRI', def: 'DEF', phy: 'PHY', overall: 'OVR',
};
