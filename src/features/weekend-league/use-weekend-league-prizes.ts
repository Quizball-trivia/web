'use client';

import { useAuthStore } from '@/stores/auth.store';
import { getWeekendLeaguePrizes } from './prizes';

export function useWeekendLeaguePrizes() {
  const country = useAuthStore((state) => state.user?.country);
  return getWeekendLeaguePrizes(country);
}
