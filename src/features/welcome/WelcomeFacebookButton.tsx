'use client';

/**
 * "Continue with Facebook" CTA inside the login dialog. The handler lives in
 * useWelcomeAuthController; this component is presentation only.
 */

import { FaFacebookF } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';

interface WelcomeFacebookButtonProps {
  onClick: () => void;
  submitting?: boolean;
}

export function WelcomeFacebookButton({ onClick, submitting = false }: WelcomeFacebookButtonProps) {
  const { t } = useLocale();
  return (
    <Button
      onClick={onClick}
      disabled={submitting}
      aria-busy={submitting}
      aria-label={t('welcome.continueWithFacebook')}
      className="flex h-[52px] w-full items-center justify-center rounded-[28px] bg-white px-6 font-poppins text-sm font-semibold uppercase tracking-wide text-brand-slate-deep shadow-none transition-colors hover:bg-white/90 hover:shadow-none sm:h-14 sm:px-8 sm:text-base focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:opacity-70"
    >
      {submitting ? (
        <Loader2 className="size-5 animate-spin text-brand-blue" />
      ) : (
        <span className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-3">
          <FaFacebookF className="size-5 justify-self-center text-brand-blue" />
          <span className="min-w-0 text-center">{t('welcome.continueWithFacebook')}</span>
        </span>
      )}
    </Button>
  );
}
