'use client';

import { useQueuedTooltips } from '@/features/training/hooks/useQueuedTooltips';
import { AUCTION_TRAINING_TOOLTIPS } from '../data/auctionTrainingTooltipConfig';

/** Queued tooltips for the training auction (see useQueuedTooltips). */
export function useAuctionTrainingTooltips() {
  return useQueuedTooltips(AUCTION_TRAINING_TOOLTIPS);
}
