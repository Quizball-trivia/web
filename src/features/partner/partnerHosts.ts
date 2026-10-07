// No imports: next.config.ts and instrumentation-client.ts load this file too.

export type PartnerSlug = "freecroco";

export const PARTNER_NAMESPACE = "/partner";

const PARTNER_HOSTNAMES: Record<string, PartnerSlug> = {
  "freecroco.quizball.io": "freecroco",
  "staging-freecroco.quizball.io": "freecroco",
};

const LOCAL_PARTNER_HOSTNAMES: Record<string, PartnerSlug> = {
  "freecroco.localhost": "freecroco",
};

function hostnamesFor(nodeEnv: string | undefined): Record<string, PartnerSlug> {
  return nodeEnv === "development" ? { ...PARTNER_HOSTNAMES, ...LOCAL_PARTNER_HOSTNAMES } : PARTNER_HOSTNAMES;
}

/** The partner served on this Host header, or null for every Quizball host. */
export function partnerFromHost(host: string | null | undefined, nodeEnv = process.env.NODE_ENV): PartnerSlug | null {
  const hostname = host?.trim().toLowerCase().replace(/:\d+$/, "");
  if (!hostname) return null;
  return hostnamesFor(nodeEnv)[hostname] ?? null;
}

/**
 * Regex for next.config `has`/`missing` host conditions. Next anchors it and matches it against the hostname
 * without the port, so it must select exactly the hosts `partnerFromHost` accepts (CSP and XFO depend on both).
 */
export function partnerHostPattern(nodeEnv = process.env.NODE_ENV): string {
  const escaped = Object.keys(hostnamesFor(nodeEnv)).map((hostname) => hostname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return `(?:${escaped.join("|")})`;
}

/** Internal route prefix a partner host is rewritten to. */
export function partnerBasePath(partner: PartnerSlug): string {
  return `${PARTNER_NAMESPACE}/${partner}`;
}

export function isPartnerNamespacePath(pathname: string): boolean {
  return pathname === PARTNER_NAMESPACE || pathname.startsWith(`${PARTNER_NAMESPACE}/`);
}
