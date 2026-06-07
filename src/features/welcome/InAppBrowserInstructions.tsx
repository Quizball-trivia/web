'use client';

import { useMemo, useState } from 'react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocale } from '@/contexts/LocaleContext';
import type { InAppBrowserApp, Platform } from '@/lib/auth/in-app-browser';
import { extractFriendInviteCodeFromPath } from '@/lib/friend/inviteCode';

interface InAppBrowserInstructionsProps {
  platform: Platform;
  app: InAppBrowserApp | null;
}

export function InAppBrowserInstructions({ platform, app }: InAppBrowserInstructionsProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const usesBottomRightMenu = app === 'messenger' || app === 'facebook';

  // Only offer "copy the link" when the current URL carries something worth
  // reopening — i.e. a friend-lobby invite (/friend/room/CODE). Copying the bare
  // homepage URL is pointless, so we hide the button for a plain quizball.io link.
  const hasInviteLink = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return extractFriendInviteCodeFromPath(window.location.pathname) !== null;
  }, []);

  const handleCopy = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked inside embedded browsers.
    }
  };

  return (
    <>
      <DialogHeader className="text-center">
        <DialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
          {platform === 'ios'
            ? t('inAppBrowser.iosTitle')
            : platform === 'android'
              ? t('inAppBrowser.androidTitle')
              : t('inAppBrowser.title')}
        </DialogTitle>
        <DialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
          {platform === 'ios'
            ? t('inAppBrowser.iosBody')
            : platform === 'android'
              ? t('inAppBrowser.androidBody')
              : t('inAppBrowser.body')}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 rounded-2xl bg-black/20 p-4 text-left font-poppins text-[13px] font-medium leading-relaxed text-white/90 sm:text-[14px]">
        {platform === 'ios' ? (
          <ol className="list-decimal space-y-2 pl-5">
            <li>{t(usesBottomRightMenu ? 'inAppBrowser.iosBottomRightStep1' : 'inAppBrowser.iosStep1')}</li>
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

      {hasInviteLink && (
        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 block w-full text-center font-poppins text-[12px] font-medium text-white/75 underline-offset-2 hover:text-white hover:underline"
        >
          {copied ? t('inAppBrowser.linkCopied') : t('inAppBrowser.orCopyLink')}
        </button>
      )}
    </>
  );
}
