'use client';

import { CalendarDays } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { liveEventCopy } from './liveEvent.copy';

export function NoLiveEvent() {
  const { locale } = useLocale();
  const copy = liveEventCopy(locale);
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-8 text-center">
        <CalendarDays className="mx-auto size-10 text-white/40" aria-hidden />
        <div className="mt-3 font-poppins text-lg font-black uppercase text-white">{copy.noEvent}</div>
        <p className="mt-2 font-poppins text-[13px] font-semibold text-white/60">{copy.noEventBody}</p>
      </div>
    </div>
  );
}
