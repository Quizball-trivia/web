'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { liveEventCopy } from './liveEvent.copy';
import { NeonTitle, StudioHero } from './OrshabatobaCard';

/** Between shows: the studio, lights down, and when registration opens again. */
export function NoLiveEvent() {
  const { locale } = useLocale();
  const copy = liveEventCopy(locale);
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5">
      <section className="@container overflow-hidden rounded-[24px] border-2 border-[#5a3a22] bg-[#1c120b]">
        <StudioHero dim>
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4 sm:px-7 sm:pb-5">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-black/50 px-3 py-1 font-poppins text-[12px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
              {copy.everyMonday}
            </span>
            <NeonTitle className="mt-2 opacity-80">{copy.title}</NeonTitle>
          </div>
        </StudioHero>
        <div className="h-1.5 bg-[linear-gradient(90deg,#2b6e1b,#58b52f_50%,#2b6e1b)]" aria-hidden />
        <div className="bg-[#1c120b] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0_18px,rgba(0,0,0,0.28)_18px_20px)] px-5 py-5 sm:px-7">
          <div className="font-poppins text-base font-black uppercase text-white">{copy.noEvent}</div>
          <p className="mt-1 font-poppins text-[14px] font-semibold text-white/70">{copy.noEventBody}</p>
        </div>
      </section>
    </div>
  );
}
