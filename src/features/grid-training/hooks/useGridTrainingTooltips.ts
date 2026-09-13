'use client';

import { useQueuedTooltips } from '@/features/training/hooks/useQueuedTooltips';
import { GRID_TRAINING_TOOLTIPS } from '../data/gridTrainingTooltipConfig';

export function useGridTrainingTooltips() {
  return useQueuedTooltips(GRID_TRAINING_TOOLTIPS);
}
