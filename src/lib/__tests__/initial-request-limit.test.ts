// @vitest-environment node
import { describe, expect, it } from "vitest";
import { limitClientInitialRequests, startupRequestLimitEnabled, startupLocaleAssetSeedEnabled } from "../../../scripts/lib/initial-request-limit";

describe("preview startup request experiment", () => {
  it("changes only the installed default client-production limit", () => {
    const config = { optimization: { splitChunks: { maxInitialRequests: 25, maxAsyncRequests: 30, minSize: 20_000, cacheGroups: { framework: { priority: 40 }, lib: { priority: 30 } } } } };
    const expected = structuredClone(config);
    expected.optimization.splitChunks.maxInitialRequests = 12;
    expect(limitClientInitialRequests(config, { dev: false, isServer: false })).toBe(config);
    expect(config).toEqual(expected);
  });

  it.each([{ dev: true, isServer: false }, { dev: false, isServer: true }, { dev: true, isServer: true }])("does not change development/server options %j", options => {
    const config = { optimization: { splitChunks: { maxInitialRequests: 25 } } };
    const before = structuredClone(config);
    expect(limitClientInitialRequests(config, options)).toBe(config);
    expect(config).toEqual(before);
  });

  it.each([{}, { optimization: {} }, { optimization: { splitChunks: false as const } }, { optimization: { splitChunks: { maxInitialRequests: 17 } } }])("fails closed on absent, disabled or changed defaults %j", config => {
    const before = structuredClone(config);
    expect(limitClientInitialRequests(config, { dev: false, isServer: false })).toBe(config);
    expect(config).toEqual(before);
  });

  it("requires explicit staging-preview opt-in", () => {
    expect(startupRequestLimitEnabled({ VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "staging", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "1" })).toBe(true);
  });

  it("keeps the dictionary switch independent and staging-only", () => {
    const on = { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "staging", QB_EXPERIMENTAL_LOCALE_ASSET_SEED: "1" };
    expect(startupLocaleAssetSeedEnabled(on)).toBe(true);
    expect(startupRequestLimitEnabled(on)).toBe(false);
    for (const changed of [{ VERCEL_ENV: "production" }, { VERCEL_GIT_COMMIT_REF: "main" }, { VERCEL_GIT_COMMIT_REF: undefined }, { QB_EXPERIMENTAL_LOCALE_ASSET_SEED: "0" }]) {
      expect(startupLocaleAssetSeedEnabled({ ...on, ...changed })).toBe(false);
    }
    expect(startupLocaleAssetSeedEnabled({})).toBe(false);
  });

  it.each([
    {}, { VERCEL_ENV: "preview" },
    { VERCEL_ENV: "preview", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "0" },
    { VERCEL_ENV: "preview", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "true" },
    { VERCEL_ENV: "development", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "1" },
    { VERCEL_ENV: "production", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "1" },
    { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "staging", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "1" },
    { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "main", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "1" },
    { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feature/preview", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "1" },
    { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "staging" },
    { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "staging", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "0" },
    { QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "1" },
  ])("leaves production/default builds unchanged %j", env => {
    expect(startupRequestLimitEnabled(env)).toBe(false);
  });
});
