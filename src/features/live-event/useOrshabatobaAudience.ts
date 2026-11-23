'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { useGeoEligibility } from '@/lib/geo/useGeoEligibility';
import { useAuthStore } from '@/stores/auth.store';

/**
 * ორშაბათობა is for Georgian users only, whatever language their app is in: an IP in Georgia, a Georgian profile
 * country, or the app set to Georgian. Everyone else (Argentina, Brazil, …) never sees the event.
 */
export function useIsOrshabatobaAudience(): boolean {
  const { locale } = useLocale();
  const geo = useGeoEligibility();
  const profileCountry = useAuthStore((s) => s.user?.country ?? null);
  return geo.isGeorgia || profileCountry?.toUpperCase() === 'GE' || locale === 'ka';
}
