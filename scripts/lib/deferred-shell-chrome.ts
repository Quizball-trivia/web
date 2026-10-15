import path from "node:path";

/** Separate, exact-value staging kill switch. Never activates on main or other previews. */
export function deferredShellChromeEnabled(env: Record<string, string | undefined>): boolean {
  return env.QB_EXPERIMENTAL_DEFER_SHELL_CHROME === "1"
    && env.VERCEL_ENV === "preview"
    && env.VERCEL_GIT_COMMIT_REF === "staging"
    && env.QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT === "0"
    && env.QB_EXPERIMENTAL_LOCALE_ASSET_SEED === "0";
}

/** Preserve every framework alias; select only the unique word client entry. */
export function applyWordShellAlias<T extends { resolve?: { alias?: Record<string, unknown> | unknown[] } }>(config: T, root: string): T {
  const aliases = config.resolve?.alias;
  if (!plainRecord(aliases)) throw new Error("Unexpected webpack alias shape; refuse word-shell experiment");
  const target = path.resolve(root, "src/components/layout/WordAppShell.tsx");
  const keys = ["@/components/layout/WordAppShellEntry$", `${path.resolve(root, "src/components/layout/WordAppShellEntry.tsx")}$`];
  // Other plugins must not silently lose an alias; preflight both writes first.
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(aliases, key);
    if (descriptor ? !("value" in descriptor) || descriptor.value !== target : !Object.isExtensible(aliases)) {
      throw new Error("Conflicting or immutable word-shell aliases; refuse experiment");
    }
  }
  for (const key of keys) if (!Object.hasOwn(aliases, key)) aliases[key] = target;
  return config;
}

type WordStartupConfig = Parameters<typeof applyWordShellAlias>[0] & {
  optimization?: { splitChunks?: false | { maxInitialRequests?: number; cacheGroups?: unknown; [key: string]: unknown } };
  entry?: unknown;
};

type ResourceModule = { nameForCondition?: () => string | null; resource?: string };
const coreFiles = [
  "stores/authPrompt.store.ts", "lib/auth/postAuthRedirect.ts", "lib/auth/onboarding.ts",
  "lib/friend/inviteCode.ts", "lib/api/endpoints.ts", "features/friend/hooks/useLobbyCommandMachine.ts",
  "lib/auth/useIsGuest.ts", "lib/queries/store.queries.ts",
  "stores/rankedMatchmaking.store.ts", "lib/repositories/store.repo.ts", "lib/social-links.ts",
  "stores/gameSession.store.ts",
  "components/ui/button.tsx",
  // Existing gate dependencies are also duplicated into unrelated route entries.
  // Every resource was already in each of the eight word startup graphs.
  "components/auth/AppAuthGate.tsx", "features/auth/AccountBannedScreen.tsx",
  "lib/routes/publicHub.ts", "lib/sounds/audioControl.ts",
];
const primitivePackages = [
  "@radix-ui/react-primitive/", "@radix-ui/primitive/", "@radix-ui/react-compose-refs/",
  "@radix-ui/react-use-layout-effect/", "@radix-ui/react-use-callback-ref/", "@radix-ui/react-context/",
];
const groupKeys = ["qbShellCore", "qbShellSocial", "qbShellContact", "qbShellNeutral", "qbShellPrimitives", "qbShellRanked"] as const;
const chunkNames = ["qb-shell-core", "qb-shell-social", "qb-shell-contact", "qb-shell-neutral", "qb-shell-primitives", "qb-shell-ranked"] as const;

function plainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** Canonical flat-package resources only: no loader queries, pnpm or nested copies. */
function modulePath(module: ResourceModule): string | undefined {
  const resource = module.nameForCondition?.() ?? module.resource;
  if (!resource || /[?!\0]/.test(resource)) return;
  const normalized = resource.replaceAll("\\", "/");
  const canonical = /^[A-Za-z]:\//.test(normalized)
    ? path.win32.normalize(resource).replaceAll("\\", "/")
    : path.posix.isAbsolute(normalized) ? path.posix.normalize(normalized) : undefined;
  return normalized === canonical ? normalized : undefined;
}

function sharedShellGroups(root: string) {
  const sourceRoot = path.resolve(root, "src").replaceAll("\\", "/") + "/";
  const files = (paths: string[]) => new Set(paths.map(file => sourceRoot + file));
  const core = files(coreFiles);
  const social = files(["components/shared/SocialLinks.tsx", "components/ui/popover.tsx"]);
  const contact = files(["components/shared/ContactModal.tsx", "lib/repositories/feedback.repo.ts"]);
  // Packaging classification only: these already run on both host families.
  // Keep them separate so locale helpers never fetch QuizBall-only gate/game UI.
  const neutral = files(["lib/i18n/locale-config.ts", "lib/i18n/useDocumentLanguage.ts", "lib/analytics/utmAttribution.ts"]);
  const ranked = files(["lib/queries/queryKeys.ts", "lib/repositories/ranked.repo.ts", "lib/queries/ranked.queries.ts"]);
  const inPackage = (resource: string, packages: string[]) => {
    const marker = "/node_modules/";
    const index = resource.indexOf(marker);
    if (index < 0) return false;
    const relative = resource.slice(index + marker.length);
    return !relative.includes(marker) && packages.some(prefix => relative.startsWith(prefix));
  };
  const group = (name: string, matches: (resource: string) => boolean) => ({
    test: (module: ResourceModule) => { const resource = modulePath(module); return !!resource && matches(resource); },
    chunks: "all" as const, priority: 45, minChunks: 2, minSize: 0,
    // Fixed allowlists require post-build source/coupling checks before staging.
    // Do not bypass the framework request limits.
    name, reuseExistingChunk: true,
  });
  return {
    qbShellCore: group(chunkNames[0], resource => core.has(resource)),
    qbShellSocial: group(chunkNames[1], resource => social.has(resource) || inPackage(resource, ["@radix-ui/react-popover/"])),
    qbShellContact: group(chunkNames[2], resource => contact.has(resource)),
    qbShellNeutral: group(chunkNames[3], resource => neutral.has(resource)),
    qbShellPrimitives: group(chunkNames[4], resource => inPackage(resource, primitivePackages)),
    qbShellRanked: group(chunkNames[5], resource => ranked.has(resource)),
  };
}

/** One opt-in hook, preserving framework settings and the original options. */
export function optimizeWordShellStartup<T extends WordStartupConfig>(config: T, options: { dev: boolean; isServer: boolean }, root: string): T {
  const split = config.optimization?.splitChunks;
  const eligible = !options.dev && !options.isServer && split && split.maxInitialRequests === 25;
  // Validate before mutating any settings. Framework upgrades must not silently opt in.
  if (eligible && (!plainRecord(split.cacheGroups) || !Object.isExtensible(split.cacheGroups)
    || groupKeys.some(key => Object.hasOwn(split.cacheGroups as object, key))
    || Object.values(split.cacheGroups).some(group => plainRecord(group) && chunkNames.includes(group.name as typeof chunkNames[number]))
    || plainRecord(config.entry) && chunkNames.some(name => Object.hasOwn(config.entry as object, name)))) {
    throw new Error("Unexpected webpack cache groups; refuse word-shell experiment");
  }
  applyWordShellAlias(config, root);
  // Preserve installed request packing: other hosts and thin routes share this build.
  if (eligible) Object.assign(split.cacheGroups as Record<string, unknown>, sharedShellGroups(root));
  return config;
}
