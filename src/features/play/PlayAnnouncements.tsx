'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Megaphone } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import type { MessageKey } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';

interface Announcement {
  id: string;
  date: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  type: 'update' | 'info' | 'event';
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'rp-rebalance-june-2026',
    date: '2026-06-12',
    titleKey: 'announcements.rpRebalanceTitle',
    bodyKey: 'announcements.rpRebalanceBody',
    type: 'update',
  },
];

const TYPE_STYLES: Record<Announcement['type'], { bg: string; icon: string }> = {
  update: { bg: 'bg-brand-blue', icon: '📢' },
  info: { bg: 'bg-white/5', icon: 'ℹ️' },
  event: { bg: 'bg-brand-orange', icon: '🏆' },
};

export function PlayAnnouncements() {
  const { t } = useLocale();
  // Collapsed by default — the announcement is shown as a tappable header the
  // user can expand, not an auto-opened modal. (Proper notifications system TBD.)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (ANNOUNCEMENTS.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Megaphone className="size-4 text-white" />
        <h2 className="font-poppins text-base uppercase text-white">
          {t('announcements.sectionTitle')}
        </h2>
      </div>
      {ANNOUNCEMENTS.map((a) => {
        const expanded = expandedId === a.id;
        const style = TYPE_STYLES[a.type];
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => setExpandedId(expanded ? null : a.id)}
            className={cn(
              'w-full rounded-xl border border-white/10 px-4 py-3 text-left transition-colors',
              style.bg,
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">{style.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-poppins text-sm font-bold text-white">
                    {t(a.titleKey)}
                  </span>
                  <span className="font-poppins text-[11px] font-medium tracking-[0.08em] text-white/70">
                    {a.date}
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
              <div className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-white">
                {t(a.bodyKey).split('\n\n').map((paragraph, idx) => (
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
