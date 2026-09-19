export type GeoApiResponse = {
  countryCode: string | null;
  isGeorgia: boolean;
  isGeoExperimentEnabled: boolean;
  showBetson: boolean;
  source: "header" | "override" | "unknown";
};

type ResolveGeoInput = {
  headerCountry?: string | null;
  overrideCountry?: string | null;
  host?: string | null;
  vercelEnv?: string | null;
  publicVercelEnv?: string | null;
  nodeEnv?: string | null;
};

const PRODUCTION_HOSTS = new Set(["quizball.io", "www.quizball.io"]);

function normalizeHost(host: string | null | undefined): string {
  const normalized = host?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("[::1]")) return "::1";
  return normalized.split(":")[0] ?? "";
}

export function normalizeCountryCode(value: string | null | undefined): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) && normalized !== "XX" ? normalized : null;
}

export function isProductionGeoRuntime(input: Pick<ResolveGeoInput, "host" | "vercelEnv" | "publicVercelEnv">): boolean {
  const host = normalizeHost(input.host);
  return (
    input.vercelEnv === "production" ||
    input.publicVercelEnv === "production" ||
    PRODUCTION_HOSTS.has(host)
  );
}

function isLocalHost(host: string | null | undefined): boolean {
  const normalized = normalizeHost(host);
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function isGeoOverrideAllowed(input: ResolveGeoInput): boolean {
  if (isProductionGeoRuntime(input)) {
    return false;
  }

  const host = input.host?.trim().toLowerCase() ?? "";
  return (
    input.vercelEnv === "preview" ||
    input.vercelEnv === "development" ||
    input.nodeEnv === "development" ||
    isLocalHost(host) ||
    host.startsWith("staging.") ||
    host.includes(".vercel.app")
  );
}

export function resolveGeo(input: ResolveGeoInput): GeoApiResponse {
  const normalizedHeaderCountry = normalizeCountryCode(input.headerCountry);
  const normalizedOverrideCountry = normalizeCountryCode(input.overrideCountry);
  const useOverride = Boolean(normalizedOverrideCountry && isGeoOverrideAllowed(input));
  const countryCode = useOverride ? normalizedOverrideCountry : normalizedHeaderCountry;
  const isGeoExperimentEnabled = !isProductionGeoRuntime(input);
  const isGeorgia = countryCode === "GE";

  return {
    countryCode,
    isGeorgia,
    isGeoExperimentEnabled,
    showBetson: isGeoExperimentEnabled && isGeorgia,
    source: useOverride ? "override" : normalizedHeaderCountry ? "header" : "unknown",
  };
}
