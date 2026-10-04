'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { differsFromGeorgiaClock, formatStageWhen, GEORGIA_TIME_ZONE } from '../wlTime';

/**
 * "Times are in your local time · Sat 22:00 in Georgia" — only for viewers
 * whose clock differs from Georgia's. The Georgia reference keeps screenshots,
 * friends in other zones and a misset device clock from causing confusion.
 */
export function LocalTimeNote({ kickoffMs, timeZone, className }: {
  kickoffMs: number;
  timeZone: string | undefined;
  className: string;
}) {
  const { t, locale } = useLocale();
  if (!differsFromGeorgiaClock(kickoffMs, timeZone)) return null;
  return (
    <p className={className}>
      {t('weekendLeague.localTimeNote', { georgia: formatStageWhen(kickoffMs, locale, GEORGIA_TIME_ZONE) })}
    </p>
  );
}
