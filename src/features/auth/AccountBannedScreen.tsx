'use client';

/**
 * Full-screen blocking state shown when a banned account attempts to use the app.
 *
 * Rendered at the app root when the auth store status is "banned" (set by the
 * bootstrap flow or a login attempt that hits a `reason: 'banned'` auth error).
 * Unlike the centered notice dialog, this takes over the whole viewport so the
 * ban is unmissable and there is no path back into the game.
 */

import { ShieldX } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';

const SUPPORT_EMAIL = 'support@quizball.com';

export function AccountBannedScreen() {
  const { t } = useLocale();
  const setAnonymous = useAuthStore((state) => state.setAnonymous);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-brand-blue px-6 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-white/10">
        <ShieldX className="size-10 text-white" strokeWidth={2.25} aria-hidden="true" />
      </div>

      <h1 className="font-poppins text-[26px] font-bold uppercase tracking-wide text-white sm:text-[30px]">
        {t('accountBanned.title')}
      </h1>

      <p className="mt-4 max-w-sm font-poppins text-[14px] font-medium leading-relaxed text-white/85 sm:text-[15px]">
        {t('accountBanned.description')}
      </p>

      <p className="mt-3 max-w-sm font-poppins text-[13px] font-medium leading-relaxed text-white/70">
        {t('accountBanned.contact')}{' '}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-semibold text-white underline underline-offset-2"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>

      <button
        type="button"
        onClick={() => setAnonymous()}
        className="mt-8 h-11 rounded-[28px] bg-white/10 px-8 font-poppins text-xs font-semibold uppercase tracking-wide text-white transition-opacity hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        {t('accountBanned.back')}
      </button>
    </div>
  );
}
