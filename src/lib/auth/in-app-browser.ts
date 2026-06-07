// Detect in-app browsers (Messenger, Instagram, FB feed, etc.) and try to
// send the user to Safari/Chrome where OAuth and session handoff are reliable.

export type Platform = 'ios' | 'android' | 'other';
export type InAppBrowserApp =
  | 'facebook'
  | 'instagram'
  | 'messenger'
  | 'line'
  | 'kakaotalk'
  | 'wechat'
  | 'tiktok'
  | 'twitter'
  | 'snapchat'
  | 'whatsapp'
  | 'youtube';

export function getPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

function readUserAgent(): string {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent;
}

export function getInAppBrowserApp(userAgent = readUserAgent()): InAppBrowserApp | null {
  if (/Instagram/i.test(userAgent)) return 'instagram';
  if (/FBAN\/Messenger|MessengerForiOS|MessengerForAndroid|FB_IAB\/MESSENGER/i.test(userAgent)) {
    return 'messenger';
  }
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return 'facebook';
  if (/Line\//i.test(userAgent)) return 'line';
  if (/KAKAOTALK/i.test(userAgent)) return 'kakaotalk';
  if (/MicroMessenger/i.test(userAgent)) return 'wechat';
  if (/TikTok/i.test(userAgent)) return 'tiktok';
  if (/Twitter/i.test(userAgent)) return 'twitter';
  if (/Snapchat/i.test(userAgent)) return 'snapchat';
  if (/WhatsApp/i.test(userAgent)) return 'whatsapp';
  if (/YouTube/i.test(userAgent)) return 'youtube';
  return null;
}

export function isInAppBrowser(): boolean {
  return getInAppBrowserApp() !== null;
}

// In-app browsers where ALL social sign-in is blocked: Google's GIS popup is
// swallowed (blank accounts.google.com) AND Facebook's redirect can't complete.
// In these, login can't work at all, so we show only an "open in your browser"
// prompt. Instagram is NOT here — its webview allows the GIS popup, so Google
// works in place there.
const POPUP_BLOCKED_IN_APP_BROWSERS: ReadonlySet<InAppBrowserApp> = new Set([
  'messenger',
  'facebook',
]);

export function isPopupBlockedInAppBrowser(app = getInAppBrowserApp()): boolean {
  return app !== null && POPUP_BLOCKED_IN_APP_BROWSERS.has(app);
}

export function tryOpenInExternalBrowser(url: string): boolean {
  if (typeof window === 'undefined') return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const body = `${parsed.host}${parsed.pathname}${parsed.search}`;
  const platform = getPlatform();

  if (platform === 'ios') {
    window.location.href = `x-safari-https://${body}`;
    return true;
  }

  if (platform === 'android') {
    window.location.href = `intent://${body}#Intent;scheme=https;package=com.android.chrome;end`;
    return true;
  }

  return false;
}
