// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyWordShellAlias, deferredShellChromeEnabled, optimizeWordShellStartup } from "../../../scripts/lib/deferred-shell-chrome";

const on = { QB_EXPERIMENTAL_DEFER_SHELL_CHROME: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "staging", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "0", QB_EXPERIMENTAL_LOCALE_ASSET_SEED: "0" };
describe("deferred shell staging kill switch", () => {
  it("composes disjoint groups without changing the installed request limits", () => {
    const config = { resolve: { alias: { "react$": "/framework/react" } as Record<string, unknown> }, optimization: { splitChunks: { maxInitialRequests: 25, maxAsyncRequests: 30, cacheGroups: { existing: { priority: 42 } } } } };
    const options = { dev: false, isServer: false };
    expect(optimizeWordShellStartup(config, options, "/workspace")).toBe(config);
    expect(config.resolve.alias["react$"]).toBe("/framework/react");
    expect(config.resolve.alias["@/components/layout/WordAppShellEntry$"]).toBe("/workspace/src/components/layout/WordAppShell.tsx");
    expect(config.optimization.splitChunks).toMatchObject({ maxInitialRequests: 25, maxAsyncRequests: 30, cacheGroups: { existing: { priority: 42 } } });
    expect(Object.keys(config.optimization.splitChunks.cacheGroups)).toEqual(["existing", "qbShellCore", "qbShellSocial", "qbShellContact", "qbShellNeutral", "qbShellPrimitives", "qbShellRanked"]);
    expect(options).toEqual({ dev: false, isServer: false });
  });
  it.each([{ dev: true, isServer: false }, { dev: false, isServer: true }])("keeps server/dev packing unchanged while applying matching server/client entry aliases: %j", options => {
    const config = { resolve: { alias: {} as Record<string, unknown> }, optimization: { splitChunks: { maxInitialRequests: 25 } } };
    expect(optimizeWordShellStartup(config, options, "/workspace")).toBe(config);
    expect(config.optimization.splitChunks.maxInitialRequests).toBe(25);
    expect(config.resolve.alias["@/components/layout/WordAppShellEntry$"]).toBe("/workspace/src/components/layout/WordAppShell.tsx");
  });
  it.each([undefined, false as const, { maxInitialRequests: 17 }])("does not change absent/false/non-default splitting %j", splitChunks => {
    const config = { resolve: { alias: {} as Record<string, unknown> }, optimization: { splitChunks } };
    const before = structuredClone(config.optimization);
    optimizeWordShellStartup(config, { dev: false, isServer: false }, "/workspace");
    expect(config.optimization).toEqual(before);
  });
  it.each([undefined, false, [], () => ({}), Object.create({ inherited: true }), Object.freeze({}), Object.seal({}), { qbShellCore: false }, { qbShellSocial: {} }, { qbShellContact: {} }, { qbShellNeutral: {} }, { qbShellPrimitives: {} }, { qbShellRanked: {} }])("refuses unfamiliar or colliding cache groups atomically: %j", cacheGroups => {
    const aliases = { "react$": "/framework/react" };
    const splitChunks = { maxInitialRequests: 25, cacheGroups };
    const config = { resolve: { alias: aliases }, optimization: { splitChunks } };
    expect(() => optimizeWordShellStartup(config, { dev: false, isServer: false }, "/workspace")).toThrow("Unexpected webpack cache groups");
    expect(aliases).toEqual({ "react$": "/framework/react" });
    expect(splitChunks.maxInitialRequests).toBe(25);
  });
  it("accepts readonly installed limits while adding only to a mutable cache-group record", () => {
    const config = { resolve: { alias: {} }, optimization: { splitChunks: Object.freeze({ maxInitialRequests: 25, cacheGroups: {} }) } };
    expect(optimizeWordShellStartup(config, { dev: false, isServer: false }, "/workspace")).toBe(config);
    expect(config.optimization.splitChunks.maxInitialRequests).toBe(25);
    expect(Object.keys(config.optimization.splitChunks.cacheGroups)).toHaveLength(6);
  });
  it.each([
    { "@/components/layout/WordAppShellEntry$": "/other" },
    { "/workspace/src/components/layout/WordAppShellEntry.tsx$": "/other" },
    Object.freeze({}), Object.seal({}),
    Object.defineProperty({}, "@/components/layout/WordAppShellEntry$", { get: () => "/workspace/src/components/layout/WordAppShell.tsx" }),
  ])("does not overwrite conflicting, accessor or immutable aliases", alias => {
    const splitChunks = { maxInitialRequests: 25, cacheGroups: {} };
    const before = Object.getOwnPropertyDescriptors(alias);
    expect(() => optimizeWordShellStartup({ resolve: { alias }, optimization: { splitChunks } }, { dev: false, isServer: false }, "/workspace")).toThrow("Conflicting or immutable word-shell aliases");
    expect(Object.getOwnPropertyDescriptors(alias)).toEqual(before);
    expect(splitChunks).toEqual({ maxInitialRequests: 25, cacheGroups: {} });
  });
  it("accepts identical preexisting aliases idempotently", () => {
    const config = { resolve: { alias: {} as Record<string, unknown> } };
    applyWordShellAlias(config, "/workspace");
    Object.freeze(config.resolve.alias);
    expect(applyWordShellAlias(config, "/workspace")).toBe(config);
  });
  it.each(["qb-shell-core", "qb-shell-social", "qb-shell-contact", "qb-shell-neutral", "qb-shell-primitives", "qb-shell-ranked"])("rejects fixed-name cache-group/entry collisions: %s", name => {
    for (const existing of [ { cacheGroups: { other: { name } }, entry: {} }, { cacheGroups: {}, entry: { [name]: "./unrelated.ts" } } ]) {
      const config = { resolve: { alias: {} }, entry: existing.entry, optimization: { splitChunks: { maxInitialRequests: 25, cacheGroups: existing.cacheGroups } } };
      expect(() => optimizeWordShellStartup(config, { dev: false, isServer: false }, "/workspace")).toThrow("Unexpected webpack cache groups");
      expect(config.resolve.alias).toEqual({});
      expect(config.optimization.splitChunks.maxInitialRequests).toBe(25);
    }
  });
  it("extracts exact allowlists with separate names, no enforce, unrelated or nested copies", () => {
    const cacheGroups: Record<string, { test: (module: { resource?: string; nameForCondition?: () => string | null }) => boolean; [key: string]: unknown }> = {};
    optimizeWordShellStartup({ resolve: { alias: {} }, optimization: { splitChunks: { maxInitialRequests: 25, cacheGroups } } }, { dev: false, isServer: false }, "/workspace");
    const { qbShellCore: core, qbShellSocial: social, qbShellContact: contact, qbShellNeutral: neutral, qbShellPrimitives: primitives, qbShellRanked: ranked } = cacheGroups;
    for (const [group, name] of [[core, "qb-shell-core"], [social, "qb-shell-social"], [contact, "qb-shell-contact"], [neutral, "qb-shell-neutral"], [primitives, "qb-shell-primitives"], [ranked, "qb-shell-ranked"]] as const) {
      expect(group).toMatchObject({ chunks: "all", name, minChunks: 2, minSize: 0, priority: 45, reuseExistingChunk: true });
      expect(group).not.toHaveProperty("enforce");
    }
    expect(core.test({ resource: "/workspace/src/stores/authPrompt.store.ts" })).toBe(true);
    for (const file of ["components/auth/AppAuthGate.tsx", "features/auth/AccountBannedScreen.tsx", "lib/routes/publicHub.ts", "lib/sounds/audioControl.ts"]) {
      expect(core.test({ resource: `/workspace/src/${file}` })).toBe(true);
      expect(core.test({ resource: `/other/src/${file}` })).toBe(false);
      expect(core.test({ resource: `/workspace/src/${file}?variant` })).toBe(false);
      expect(social.test({ resource: `/workspace/src/${file}` })).toBe(false);
      expect(contact.test({ resource: `/workspace/src/${file}` })).toBe(false);
      expect(neutral.test({ resource: `/workspace/src/${file}` })).toBe(false);
    }
    for (const file of ["lib/i18n/locale-config.ts", "lib/i18n/useDocumentLanguage.ts", "lib/analytics/utmAttribution.ts"]) {
      expect(neutral.test({ resource: `/workspace/src/${file}` })).toBe(true);
      expect(neutral.test({ resource: `/other/src/${file}` })).toBe(false);
      expect(neutral.test({ resource: `/workspace/src/${file}?variant` })).toBe(false);
      for (const group of [core, social, contact]) expect(group.test({ resource: `/workspace/src/${file}` })).toBe(false);
    }
    for (const file of ["lib/queries/queryKeys.ts", "lib/repositories/ranked.repo.ts", "lib/queries/ranked.queries.ts"]) {
      expect(ranked.test({ resource: `/workspace/src/${file}` })).toBe(true);
      for (const group of [core, social, contact, neutral, primitives]) expect(group.test({ resource: `/workspace/src/${file}` })).toBe(false);
    }
    const primitiveResource = "/deps/node_modules/@radix-ui/react-context/dist/index.mjs";
    expect(primitives.test({ nameForCondition: () => primitiveResource })).toBe(true);
    for (const group of [core, social, contact, neutral, ranked]) expect(group.test({ resource: primitiveResource })).toBe(false);
    expect(primitives.test({ resource: "C:\\deps\\node_modules\\@radix-ui\\react-context\\dist\\index.mjs" })).toBe(true);
    expect(social.test({ resource: "/workspace/src/components/shared/SocialLinks.tsx" })).toBe(true);
    expect(social.test({ resource: "/deps/node_modules/@radix-ui/react-popover/dist/index.mjs" })).toBe(true);
    expect(contact.test({ resource: "/workspace/src/lib/repositories/feedback.repo.ts" })).toBe(true);
    for (const resource of [
      "/workspace/src/stores/authPrompt.store.ts?query", "/workspace/src/stores/other.store.ts",
      "/workspace/src/components/ui/dialog.tsx", "/workspace/src/components/ui/input.tsx",
      "/other/src/stores/authPrompt.store.ts", "/deps/node_modules/@radix-ui/react-context-extra/dist/index.mjs",
      "/deps/node_modules/another/node_modules/@radix-ui/react-context/dist/index.mjs",
      "/deps/node_modules/@radix-ui/react-primitive/node_modules/@radix-ui/react-slot/dist/index.mjs",
      "/deps/node_modules/.pnpm/@radix-ui+react-context@1/node_modules/@radix-ui/react-context/dist/index.mjs",
      "/deps/node_modules/@radix-ui/react-context/../unapproved/index.js",
      "/deps/node_modules/@radix-ui/react-context/./dist/index.mjs", "relative/node_modules/@radix-ui/react-context/dist/index.mjs",
    ]) for (const group of [core, social, contact, neutral, primitives, ranked]) expect(group.test({ resource })).toBe(false);
    expect(core.test({})).toBe(false);
    expect(core.test({ resource: "/workspace/src/components/shared/ContactModal.tsx" })).toBe(false);
    expect(social.test({ resource: "/workspace/src/components/shared/ContactModal.tsx" })).toBe(false);
    expect(contact.test({ resource: "/workspace/src/components/shared/SocialLinks.tsx" })).toBe(false);
  });
  it("preserves framework aliases and selects only exact word entry names", () => {
    const config = { resolve: { alias: { "react$": "/framework/react", other: false } as Record<string, unknown> } };
    expect(applyWordShellAlias(config, "/workspace")).toBe(config);
    expect(config.resolve.alias).toEqual({ "react$": "/framework/react", other: false,
      "@/components/layout/WordAppShellEntry$": "/workspace/src/components/layout/WordAppShell.tsx",
      "/workspace/src/components/layout/WordAppShellEntry.tsx$": "/workspace/src/components/layout/WordAppShell.tsx" });
  });
  it("refuses unfamiliar alias structures rather than replacing framework defaults", () => {
    expect(() => applyWordShellAlias({}, "/workspace")).toThrow("Unexpected webpack alias shape");
    expect(() => applyWordShellAlias({ resolve: { alias: [] } }, "/workspace")).toThrow("Unexpected webpack alias shape");
  });
  it("requires a separate exact opt-in with other experiments off", () => { expect(deferredShellChromeEnabled(on)).toBe(true); });
  it.each([
    { QB_EXPERIMENTAL_DEFER_SHELL_CHROME: undefined }, { QB_EXPERIMENTAL_DEFER_SHELL_CHROME: "0" },
    { QB_EXPERIMENTAL_DEFER_SHELL_CHROME: "1\n" }, { QB_EXPERIMENTAL_DEFER_SHELL_CHROME: "true" },
    { VERCEL_ENV: "production" }, { VERCEL_ENV: "development" }, { VERCEL_GIT_COMMIT_REF: "main" },
    { VERCEL_GIT_COMMIT_REF: "preview-branch" }, { VERCEL_GIT_COMMIT_REF: undefined },
    { QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "1" }, { QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: undefined },
    { QB_EXPERIMENTAL_LOCALE_ASSET_SEED: "1" }, { QB_EXPERIMENTAL_LOCALE_ASSET_SEED: undefined },
  ])("fails closed for %j", change => { expect(deferredShellChromeEnabled({ ...on, ...change })).toBe(false); });
  it("defaults off", () => { expect(deferredShellChromeEnabled({})).toBe(false); });
});
