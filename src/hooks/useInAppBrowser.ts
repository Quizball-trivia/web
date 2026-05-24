"use client";

import { useState } from "react";

export type InAppBrowser =
  | "facebook"
  | "messenger"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "twitter"
  | "snapchat"
  | "line"
  | "wechat"
  | "kakao"
  | "discord"
  | "telegram"
  | "other";

export interface InAppBrowserState {
  isInApp: boolean;
  browser: InAppBrowser | null;
  isIOS: boolean;
  isAndroid: boolean;
}

const DEFAULT_STATE: InAppBrowserState = {
  isInApp: false,
  browser: null,
  isIOS: false,
  isAndroid: false,
};

function detect(ua: string): InAppBrowserState {
  const lowered = ua.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(lowered);
  const isAndroid = /android/.test(lowered);

  // Order matters — Messenger reports `FBAN/MessengerForiOS`, so we check
  // messenger before the generic Facebook (FBAN) signature.
  let browser: InAppBrowser | null = null;
  if (/fban\/messengerforios|messenger|fb_iab\/messenger/i.test(ua)) {
    browser = "messenger";
  } else if (/fban|fbav|fb_iab|\bfb4a\b/i.test(ua)) {
    browser = "facebook";
  } else if (/instagram/i.test(ua)) {
    browser = "instagram";
  } else if (/tiktok|musical_ly|bytedance/i.test(ua)) {
    browser = "tiktok";
  } else if (/linkedinapp/i.test(ua)) {
    browser = "linkedin";
  } else if (/twitter|twitterandroid/i.test(ua)) {
    browser = "twitter";
  } else if (/snapchat/i.test(ua)) {
    browser = "snapchat";
  } else if (/line\//i.test(ua)) {
    browser = "line";
  } else if (/micromessenger/i.test(ua)) {
    browser = "wechat";
  } else if (/kakaotalk/i.test(ua)) {
    browser = "kakao";
  } else if (/discord/i.test(ua)) {
    browser = "discord";
  } else if (/telegram/i.test(ua)) {
    browser = "telegram";
  } else if (
    // Generic embedded webview heuristics — Android wv flag and iOS lack of
    // Safari token while still being mobile. These catch unknown wrappers.
    (isAndroid && /; wv\)/.test(ua)) ||
    (isIOS && /applewebkit/i.test(lowered) && !/safari/i.test(lowered) && !/crios|fxios|edgios/i.test(lowered))
  ) {
    browser = "other";
  }

  return {
    isInApp: browser !== null,
    browser,
    isIOS,
    isAndroid,
  };
}

/**
 * Detect whether the page is running inside a known in-app browser
 * (Messenger, Instagram, TikTok, etc.). These webviews block Google OAuth
 * via `disallowed_useragent`, so callers should show an "Open in Safari /
 * Chrome" prompt instead of letting the user try to sign in.
 *
 * SSR-safe: returns the default state on the server, then re-runs on
 * mount.
 */
export function useInAppBrowser(): InAppBrowserState {
  const [state] = useState<InAppBrowserState>(() =>
    typeof navigator === "undefined" ? DEFAULT_STATE : detect(navigator.userAgent),
  );
  return state;
}
