import { useLocale } from '@/contexts/LocaleContext';
import type { MessageKey } from '@/lib/i18n/messages';
import type { PositionGroup } from '../types';

const POSITION_LABEL_KEYS: Record<PositionGroup, MessageKey> = {
  GK: 'auctionGame.positionGoalkeeper',
  DEF: 'auctionGame.positionDefender',
  MID: 'auctionGame.positionMidfielder',
  FWD: 'auctionGame.positionForward',
};

/** Returns a translator `(pos) => localized position label`. */
export function usePositionLabel() {
  const { t } = useLocale();
  return (pos: PositionGroup) => t(POSITION_LABEL_KEYS[pos]);
}
