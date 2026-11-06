import { useLocale } from '@/contexts/LocaleContext';
import { zoneMatchCopy } from './zoneMatch.copy';

/** This seat's Zone match wording. */
export function useZoneCopy() {
  const { locale } = useLocale();
  return { c: zoneMatchCopy(locale), locale };
}
