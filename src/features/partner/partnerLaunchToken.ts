// No imports: the middleware (edge) and the root layout both load this file.

export const PARTNER_LAUNCH_TOKEN_PARAM = "token";

const CAPTURE_KEY = "__quizballPartnerLaunch";

/** Token from the fragment (where the middleware's redirect puts it) or the query, plus the URL without it. */
function extractLaunchToken(href: string): { token: string | null; cleanUrl: string } | null {
  const url = new URL(href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const inFragment = fragment.has(PARTNER_LAUNCH_TOKEN_PARAM);
  const inQuery = url.searchParams.has(PARTNER_LAUNCH_TOKEN_PARAM);
  if (!inFragment && !inQuery) return null;
  const token = (inFragment ? fragment.get(PARTNER_LAUNCH_TOKEN_PARAM) : url.searchParams.get(PARTNER_LAUNCH_TOKEN_PARAM))?.trim() || null;
  fragment.delete(PARTNER_LAUNCH_TOKEN_PARAM);
  url.searchParams.delete(PARTNER_LAUNCH_TOKEN_PARAM);
  const rest = fragment.toString();
  return { token, cleanUrl: `${url.pathname}${url.search}${rest ? `#${rest}` : ""}` };
}

const P = JSON.stringify(PARTNER_LAUNCH_TOKEN_PARAM);

/**
 * Inline twin of extractLaunchToken (kept in sync by partnerLaunchToken.test.ts), run as a beforeInteractive
 * script: before Next hydrates and copies window.location into its router state and history entry, it moves the
 * token into memory and replaces the history entry with the clean URL and a fresh state.
 */
export const PARTNER_LAUNCH_CAPTURE_SCRIPT = [
  "(function(){try{",
  "var u=new URL(window.location.href),f=new URLSearchParams(u.hash.slice(1));",
  `var inF=f.has(${P}),inQ=u.searchParams.has(${P});if(!inF&&!inQ)return;`,
  `var t=((inF?f.get(${P}):u.searchParams.get(${P}))||"").trim()||null;`,
  `f.delete(${P});u.searchParams.delete(${P});var rest=f.toString();`,
  'window.history.replaceState(null,"",u.pathname+u.search+(rest?"#"+rest:""));',
  `Object.defineProperty(window,${JSON.stringify(CAPTURE_KEY)},{value:{token:t},configurable:true,enumerable:false,writable:false});`,
  "}catch(e){}})();",
].join("");

type CaptureWindow = Window & { [CAPTURE_KEY]?: { token: string | null } };

/**
 * Returns the launch token once. Normally the capture script already took it; the address-bar fallback covers
 * a page where that script did not run (and tests). A null history state lets Next re-sync its router to the clean URL.
 */
export function takeLaunchToken(): string | null {
  const captureWindow = window as CaptureWindow;
  const captured = captureWindow[CAPTURE_KEY];
  if (captured) {
    delete captureWindow[CAPTURE_KEY];
    return captured.token;
  }
  const extracted = extractLaunchToken(window.location.href);
  if (!extracted) return null;
  window.history.replaceState(null, "", extracted.cleanUrl);
  return extracted.token;
}
