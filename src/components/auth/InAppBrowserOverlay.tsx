"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useInAppBrowser } from "@/hooks/useInAppBrowser";
import { useLocale } from "@/contexts/LocaleContext";
import { trackInAppBrowserBlocked } from "@/lib/analytics/game-events";

/**
 * Full-screen overlay shown when the page is running inside an in-app
 * browser (Messenger, Instagram, TikTok, etc.). Google OAuth refuses to
 * load in these webviews — see `disallowed_useragent` 403 error — so we
 * block the auth flow and instruct the user to open the link in Safari /
 * Chrome instead.
 *
 * Mount inside auth-sensitive layouts only.
 */
export function InAppBrowserOverlay() {
  const { isInApp, isIOS, isAndroid, browser } = useInAppBrowser();
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isInApp && browser) {
      trackInAppBrowserBlocked(browser, isIOS, isAndroid);
    }
  }, [isInApp, browser, isIOS, isAndroid]);

  if (!isInApp) return null;

  const currentUrl =
    typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard write can fail in some webviews — surface a manual
      // selection fallback by selecting the URL text node.
      const node = document.getElementById("in-app-browser-url-text");
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  const handleOpenExternal = () => {
    if (isAndroid) {
      // Facebook in-app browser on Android respects this query param and
      // re-opens the URL in Chrome. iOS has no equivalent.
      const url = new URL(currentUrl);
      url.searchParams.set("openExternalBrowser", "1");
      window.location.href = url.toString();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat px-6 py-10 font-poppins text-white">
      <div className="w-full max-w-md rounded-[24px] bg-surface-card/60 backdrop-blur-md p-7 sm:p-9">
        <div className="flex items-center justify-center mb-5">
          <AppLogo size="md" />
        </div>

        <h1 className="text-center text-xl sm:text-2xl font-semibold uppercase tracking-tight text-white">
          {t("inAppBrowser.title")}
        </h1>
        <p className="mt-3 text-center text-sm sm:text-base text-white/70 leading-relaxed">
          {t("inAppBrowser.body")}
        </p>

        <div className="mt-6 rounded-[16px] bg-white/5 p-4 text-sm leading-relaxed text-white/80">
          {isIOS ? (
            <ol className="list-decimal list-inside space-y-1.5">
              <li>{t("inAppBrowser.iosStep1")}</li>
              <li>{t("inAppBrowser.iosStep2")}</li>
            </ol>
          ) : isAndroid ? (
            <ol className="list-decimal list-inside space-y-1.5">
              <li>{t("inAppBrowser.androidStep1")}</li>
              <li>{t("inAppBrowser.androidStep2")}</li>
            </ol>
          ) : (
            <p>{t("inAppBrowser.genericInstructions")}</p>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50 mb-2">
            {t("inAppBrowser.orCopyLink")}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center justify-between gap-3 rounded-[14px] bg-white/8 hover:bg-white/14 px-4 py-3 text-left transition-colors"
          >
            <span
              id="in-app-browser-url-text"
              className="text-sm text-white/90 break-all line-clamp-2"
            >
              {currentUrl}
            </span>
            {copied ? (
              <Check className="size-5 text-brand-green shrink-0" />
            ) : (
              <Copy className="size-5 text-white/70 shrink-0" />
            )}
          </button>
        </div>

        {isAndroid && (
          <button
            type="button"
            onClick={handleOpenExternal}
            style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)' }}
            className="mt-4 w-full flex items-center justify-center gap-2 h-12 rounded-[20px] bg-brand-green hover:bg-brand-green-deep text-white font-semibold uppercase text-sm transition-colors"
          >
            <ExternalLink className="size-4" />
            {t("inAppBrowser.openInBrowser")}
          </button>
        )}
      </div>
    </div>
  );
}
