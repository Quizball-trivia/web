type Config = {
  optimization?: { splitChunks?: false | { maxInitialRequests?: number; [key: string]: unknown } };
};

function isStagingPreview(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV === "preview" && env.VERCEL_GIT_COMMIT_REF === "staging";
}

/** Build-time staging experiment. Off by default, including other previews. */
export function startupRequestLimitEnabled(env: Record<string, string | undefined>): boolean {
  return env.QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT === "1"
    && isStagingPreview(env);
}

/** Separate kill switch: keeps dictionary serialization unchanged by default. */
export function startupLocaleAssetSeedEnabled(env: Record<string, string | undefined>): boolean {
  return env.QB_EXPERIMENTAL_LOCALE_ASSET_SEED === "1" && isStagingPreview(env);
}

/** Preserve every framework option except the verified client-production extraction limit. */
export function limitClientInitialRequests<T extends Config>(config: T, { dev, isServer }: { dev: boolean; isServer: boolean }): T {
  const split = config.optimization?.splitChunks;
  if (!dev && !isServer && split && typeof split === "object" && split.maxInitialRequests === 25) {
    split.maxInitialRequests = 12;
  }
  return config;
}
