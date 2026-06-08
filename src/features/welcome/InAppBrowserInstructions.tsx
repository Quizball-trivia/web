'use client';

import { useMemo, useState } from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocale } from '@/contexts/LocaleContext';
import type { InAppBrowserApp, Platform } from '@/lib/auth/in-app-browser';
import { normalizePostAuthRedirect, peekPostAuthRedirect } from '@/lib/auth/postAuthRedirect';

interface InAppBrowserInstructionsProps {
  platform: Platform;
  app: InAppBrowserApp | null;
}

export function InAppBrowserInstructions({ platform, app }: InAppBrowserInstructionsProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const usesBottomRightMenu = app === 'messenger' || app === 'facebook';
  const hasMenuInstructions = platform === 'ios' || platform === 'android';

  // Only offer "copy the link" when the current URL carries something worth
  // reopening — i.e. a friend-lobby invite (/friend/room/CODE). AppAuthGate
  // redirects logged-out invite visitors to "/" and stores the invite path for
  // post-auth return, so read that remembered path too.
  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined') return null;

    const invitePath = normalizePostAuthRedirect(window.location.pathname) ?? peekPostAuthRedirect();
    return invitePath ? `${window.location.origin}${invitePath}` : null;
  }, []);

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked inside embedded browsers.
    }
  };

  return (
    <>
      <DialogHeader className="text-center">
        <DialogTitle className="text-center font-poppins text-[20px] font-semibold leading-tight text-white sm:text-[26px]">
          {t('inAppBrowser.title')}
        </DialogTitle>
        <DialogDescription className="mt-2.5 text-center font-poppins text-[12px] font-medium leading-snug text-white/80 sm:mt-3 sm:text-[14px]">
          {t('inAppBrowser.body')}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 rounded-2xl bg-black/20 p-3.5 text-left font-poppins text-[12px] font-medium leading-relaxed text-white/90 sm:mt-5 sm:p-4 sm:text-[14px]">
        {hasMenuInstructions ? (
          <ol className="list-decimal space-y-1.5 pl-5 sm:space-y-2">
            <li>{t(usesBottomRightMenu ? 'inAppBrowser.bottomRightStep' : 'inAppBrowser.menuStep')}</li>
            <li>{t('inAppBrowser.openBrowserStep')}</li>
          </ol>
        ) : (
          <p>{t('inAppBrowser.genericInstructions')}</p>
        )}
      </div>

      {inviteLink && (
        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-white px-4 text-center font-poppins text-[13px] font-semibold uppercase text-brand-blue transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
        >
          {copied ? t('inAppBrowser.inviteLinkCopied') : t('inAppBrowser.copyInviteLink')}
        </button>
      )}
    </>
  );
}
