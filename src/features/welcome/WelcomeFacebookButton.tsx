'use client';

/**
 * "Continue with Facebook" CTA inside the login dialog. The handler lives in
 * useWelcomeAuthController; this component is presentation only.
 */

import { FaFacebookF } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';

interface WelcomeFacebookButtonProps {
  onClick: () => void;
}

export function WelcomeFacebookButton({ onClick }: WelcomeFacebookButtonProps) {
  const { t } = useLocale();
  return (
    <Button
      onClick={onClick}
      className="flex h-[52px] w-full items-center justify-center rounded-[28px] bg-white px-6 font-poppins text-sm font-semibold uppercase tracking-wide text-brand-slate-deep shadow-none transition-colors hover:bg-white/90 hover:shadow-none sm:h-14 sm:px-8 sm:text-base focus-visible:ring-0 focus-visible:outline-none"
    >
      <span className="grid w-[18.5rem] max-w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3">
        <FaFacebookF className="size-5 justify-self-center text-brand-blue" />
        <span className="min-w-0 text-center">{t('welcome.continueWithFacebook')}</span>
      </span>
    </Button>
  );
}
