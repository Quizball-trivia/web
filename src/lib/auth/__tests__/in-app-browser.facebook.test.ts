import { describe, expect, it } from 'vitest';
import { getInAppBrowserApp, isPopupBlockedInAppBrowser } from '../in-app-browser';

// showFacebookLogin in the welcome controller is `!authInAppBrowser`, i.e. hide
// Facebook whenever getInAppBrowserApp() detects an embedded webview. These cases
// lock that rule to the user agents we actually see in analytics.
const shouldHideFacebook = (ua: string) => getInAppBrowserApp(ua) !== null;

describe('hide Facebook login inside in-app browsers', () => {
  const inApp: Array<[string, string]> = [
    ['Instagram', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 300.0'],
    ['Facebook (FBAN)', 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/450.0]'],
    ['Messenger', 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 FBAN/Messenger;FBAV/450'],
    ['TikTok', 'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 musical_ly_2023 TikTok'],
  ];

  it.each(inApp)('hides Facebook in %s', (_label, ua) => {
    expect(shouldHideFacebook(ua)).toBe(true);
  });

  const realBrowsers: Array<[string, string]> = [
    ['Mobile Safari', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'],
    ['Chrome Android', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'],
  ];

  it.each(realBrowsers)('keeps Facebook in %s', (_label, ua) => {
    expect(shouldHideFacebook(ua)).toBe(false);
  });
});

describe('"open in browser" modal targets only popup-blocking webviews', () => {
  it('shows for Messenger (popup blocked → Google dead-ends)', () => {
    expect(isPopupBlockedInAppBrowser('messenger')).toBe(true);
  });

  it('shows for Facebook in-app browser', () => {
    expect(isPopupBlockedInAppBrowser('facebook')).toBe(true);
  });

  it('does NOT show for Instagram (GIS popup works there)', () => {
    expect(isPopupBlockedInAppBrowser('instagram')).toBe(false);
  });

  it('does NOT show in a real browser (no in-app app)', () => {
    expect(isPopupBlockedInAppBrowser(null)).toBe(false);
  });
});
