'use client';

import { MessageCircle } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { SocialLinks } from '@/components/shared/SocialLinks';
import { ContactModal } from '@/components/shared/ContactModal';

/**
 * Socials + "Contact us" cluster shown in the top-left of the desktop app shell
 * (after the sidebar) so it's visible across the app, not buried in a footer.
 */
export function AppShellSocials() {
  const { t } = useLocale();
  return (
    <div className="flex flex-1 items-center gap-3">
      <SocialLinks size="sm" className="gap-2" />
      <ContactModal
        trigger={
          <button
            type="button"
            aria-label={t('feedback.contactUs')}
            title={t('feedback.contactUs')}
            className={cn(
              'flex size-9 items-center justify-center rounded-[14px] bg-brand-yellow text-black',
              'shadow-[0_4px_0_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5 active:translate-y-0',
            )}
          >
            <MessageCircle className="size-4" />
          </button>
        }
      />
    </div>
  );
}
