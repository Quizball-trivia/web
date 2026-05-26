// Detect in-app browsers (Messenger, Instagram, FB feed, etc.) and try to
// kick the user out into Safari/Chrome where Google sign-in actually works.

export type Platform = 'ios' | 'android' | 'other';

export function getPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

// FBAN/FBAV = Facebook + Messenger, FB_IAB = embedded Facebook tab,
// Instagram has its own marker, Line and KAKAOTALK are also common offenders.
const IN_APP_PATTERNS = /FBAN|FBAV|FB_IAB|Instagram|Line\/|KAKAOTALK|MicroMessenger|TikTok|Twitter|Snapchat|WhatsApp/i;

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return IN_APP_PATTERNS.test(navigator.userAgent);
}

// Try to bounce the user from the in-app webview into their real browser.
// iOS: x-safari-https:// — system prompts to open Safari.
// Android: intent:// — opens Chrome directly when installed.
// Returns true if an attempt was fired (caller still shows manual
// instructions in case the OS silently ignores it).
export function tryOpenInExternalBrowser(url: string): boolean {
  if (typeof window === 'undefined') return false;

  // Validate the input is a real http(s) URL — refuse to inject anything
  // weird (javascript:, data:, intent: already-formed payloads, etc.) into
  // window.location.href.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  // Compose body from host + path + query only. Drop the fragment — the
  // android intent:// syntax uses `#` as a separator, so a stray hash would
  // break the payload.
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
