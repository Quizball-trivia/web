'use client';

/**
 * In-app-browser fallback panel — shown inside the login dialog when
 * the user is on Messenger/Instagram webview and Google blocks OAuth.
 *
 * Renders platform-specific copy (iOS / Android / generic), a manual
 * "open in browser" button that re-attempts the bounce, and a
 * link-copy fallback for webviews that block the bounce entirely.
 */

import { useState } from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';

interface InAppBrowserInstructionsProps {
  platform: 'ios' | 'android' | 'other';
  onTryAgain: () => void;
}

export function InAppBrowserInstructions({ platform, onTryAgain }: InAppBrowserInstructionsProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked in some webviews — no-op */
    }
  };

  return (
    <>
      <DialogHeader className="text-center">
        <DialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
          {t('inAppBrowser.title')}
        </DialogTitle>
        <DialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
          {t('inAppBrowser.body')}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 rounded-2xl bg-black/20 p-4 text-left font-poppins text-[13px] font-medium leading-relaxed text-white/90 sm:text-[14px]">
        {platform === 'ios' ? (
          <ol className="list-decimal space-y-2 pl-5">
            <li>{t('inAppBrowser.iosStep1')}</li>
            <li>{t('inAppBrowser.iosStep2')}</li>
          </ol>
        ) : platform === 'android' ? (
          <ol className="list-decimal space-y-2 pl-5">
            <li>{t('inAppBrowser.androidStep1')}</li>
            <li>{t('inAppBrowser.androidStep2')}</li>
          </ol>
        ) : (
          <p>{t('inAppBrowser.genericInstructions')}</p>
        )}
      </div>

      <Button
        onClick={onTryAgain}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-[20px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black shadow-none transition-colors hover:bg-brand-yellow-deep hover:shadow-none focus-visible:ring-0 focus-visible:outline-none"
      >
        {t('inAppBrowser.openInBrowser')}
      </Button>

      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 text-center font-poppins text-[12px] font-medium text-white/70 underline-offset-2 hover:underline"
      >
        {copied ? t('inAppBrowser.linkCopied') : t('inAppBrowser.orCopyLink')}
      </button>
    </>
  );
}
