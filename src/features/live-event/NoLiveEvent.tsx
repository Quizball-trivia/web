'use client';

import { CalendarX } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { liveEventCopy } from './liveEvent.copy';

/** The Events tab when nothing is on: a neutral card (no show branding, so non-Georgian users never see ორშაბათობა). */
export function NoLiveEvent() {
  const { locale } = useLocale();
  const copy = liveEventCopy(locale);
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <section className="rounded-[20px] border-2 border-white/10 bg-surface-card-deep px-6 py-8 text-center">
        <CalendarX className="mx-auto size-10 text-white/50" aria-hidden />
        <div className="mt-3 font-poppins text-base font-black uppercase text-white">{copy.noEvent}</div>
      </section>
    </div>
  );
}
