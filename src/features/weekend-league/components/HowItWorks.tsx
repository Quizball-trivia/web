'use client';

import { useLocale } from '@/contexts/LocaleContext';

const STEPS = [
  { n: 1, icon: '🎟️', titleKey: 'weekendLeague.step1Title', bodyKey: 'weekendLeague.step1Body' },
  { n: 2, icon: '⚽', titleKey: 'weekendLeague.step2Title', bodyKey: 'weekendLeague.step2Body' },
  { n: 3, icon: '🏆', titleKey: 'weekendLeague.step3Title', bodyKey: 'weekendLeague.step3Body' },
] as const;

/** Three-step explainer for the weekend format. */
export function HowItWorks() {
  const { t } = useLocale();
  return (
    <section>
      <h2 className="mb-3 font-poppins text-lg font-black uppercase tracking-wide text-white">
        {t('weekendLeague.howItWorks')}
      </h2>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="rounded-2xl border-2 border-white/12 p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand-blue font-poppins text-sm font-black text-white">
                {step.n}
              </span>
              <span className="text-xl leading-none">{step.icon}</span>
            </div>
            <div className="font-poppins text-sm font-black uppercase text-white">{t(step.titleKey)}</div>
            <p className="mt-1 font-poppins text-[12px] font-medium leading-snug text-white/60">
              {t(step.bodyKey)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
