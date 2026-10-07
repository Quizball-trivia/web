export const FREECROCO_ORIGIN = "https://freecroco.com";

// The result is pasted into a CSP header, so anything beyond scheme://host[:port] is rejected outright.
const SAFE_ORIGIN = /^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/;

/** Parses a comma/space separated origin list; drops anything that is not a plain https origin (http for localhost). */
export function parseOriginList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const origins = raw
    .split(/[\s,]+/)
    .filter(Boolean)
    .flatMap((entry) => {
      try {
        const url = new URL(entry);
        const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".localhost");
        if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) return [];
        const origin = url.origin.toLowerCase();
        return SAFE_ORIGIN.test(origin) ? [origin] : [];
      } catch {
        return [];
      }
    });
  return Array.from(new Set(origins));
}

/** CSP frame-ancestors for the partner host: Freecroco plus PARTNER_FRAME_ANCESTORS (their test domain, local testing). */
export function partnerFrameAncestors(extra = process.env.PARTNER_FRAME_ANCESTORS): string[] {
  return Array.from(new Set([FREECROCO_ORIGIN, ...parseOriginList(extra)]));
}

/** Parent origins of this environment for postMessage (production: freecroco.com; test: their test domain). */
export function partnerParentOrigins(configured = process.env.NEXT_PUBLIC_PARTNER_PARENT_ORIGINS): string[] {
  const origins = parseOriginList(configured);
  return origins.length > 0 ? origins : [FREECROCO_ORIGIN];
}
