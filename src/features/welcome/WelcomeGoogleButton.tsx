'use client';

/**
 * "Continue with Google" CTA inside the login dialog. The handler
 * (which owns the GIS / in-app-browser / redirect-fallback flow)
 * lives in useWelcomeAuthController; this component is presentation
 * only.
 */

import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';

interface WelcomeGoogleButtonProps {
  onClick: () => void;
}

export function WelcomeGoogleButton({ onClick }: WelcomeGoogleButtonProps) {
  const { t } = useLocale();
  return (
    <Button
      onClick={onClick}
      className="flex h-[52px] w-full items-center justify-center rounded-[28px] bg-brand-yellow px-6 font-poppins text-sm font-semibold uppercase tracking-wide text-black shadow-none transition-colors hover:bg-brand-yellow-deep hover:shadow-none sm:h-14 sm:px-8 sm:text-base focus-visible:ring-0 focus-visible:outline-none"
    >
      <span className="grid w-[18.5rem] max-w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3">
        <FcGoogle className="size-6 justify-self-center" />
        <span className="min-w-0 text-center">{t('welcome.continueWithGoogle')}</span>
      </span>
    </Button>
  );
}
