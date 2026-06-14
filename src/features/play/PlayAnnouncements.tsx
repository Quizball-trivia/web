'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { getI18nText } from '@/lib/utils/i18n';
import { useActiveAnnouncements, type AnnouncementItem } from '@/lib/queries/announcements.queries';

type AnnouncementType = AnnouncementItem['type'];

const TYPE_STYLES: Record<AnnouncementType, { bg: string; icon: string }> = {
  update: { bg: 'bg-brand-blue', icon: '📢' },
  info: { bg: 'bg-white/5', icon: 'ℹ️' },
  event: { bg: 'bg-brand-orange', icon: '🏆' },
};

// Short month names per locale. We format the date ourselves rather than relying
// on Intl.DateTimeFormat('ka-GE') — browser ICU builds vary and some fall back
// to English month abbreviations, which is exactly the bug this avoids.
const MONTHS_SHORT: Record<'en' | 'ka', readonly string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ka: ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'],
};

function formatAnnouncementDate(iso: string, locale: 'en' | 'ka'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const month = MONTHS_SHORT[locale][d.getMonth()] ?? '';
  const day = d.getDate();
  const year = d.getFullYear();
  return locale === 'ka' ? `${day} ${month} ${year}` : `${month} ${day}, ${year}`;
}

export function PlayAnnouncements() {
  const { t, locale } = useLocale();
  const dateLocale: 'en' | 'ka' = locale === 'ka' ? 'ka' : 'en';
  const { data } = useActiveAnnouncements();
  const announcements = data?.items ?? [];
  // Collapsed by default — each item is a tappable header the user can expand.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Hide the entire section (header included) when there are no announcements.
  if (announcements.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Megaphone className="size-4 text-white" />
        <h2 className="font-poppins text-base uppercase text-white">
          {t('announcements.sectionTitle')}
        </h2>
      </div>
      {announcements.map((a) => {
        const expanded = expandedId === a.id;
        const style = TYPE_STYLES[a.type] ?? TYPE_STYLES.update;
        const panelId = `announcement-panel-${a.id}`;
        const title = getI18nText(a.title, locale);
        const body = getI18nText(a.body, locale);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => setExpandedId(expanded ? null : a.id)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className={cn(
              'w-full rounded-xl border border-white/10 px-4 py-3 text-left transition-colors',
              style.bg,
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">{style.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-poppins text-sm font-bold text-white">{title}</span>
                  <span className="font-poppins text-[11px] font-medium tracking-[0.08em] text-white/70">
                    {formatAnnouncementDate(a.createdAt, dateLocale)}
                  </span>
                </div>
              </div>
              {expanded ? (
                <ChevronUp className="size-4 shrink-0 text-white/50" />
              ) : (
                <ChevronDown className="size-4 shrink-0 text-white/50" />
              )}
            </div>
            {expanded && (
              <div id={panelId} className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-white">
                {body.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
