import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export const WORD_LANDING_ROOTS = [
  "src/app/layout.tsx",
  "src/app/[locale]/(hub)/layout.tsx",
  "src/app/[locale]/(hub)/(default-shell)/layout.tsx",
  "src/app/[locale]/(hub)/(word-shell)/layout.tsx",
  "src/components/layout/WordAppShell.tsx",
  // The staging webpack substitution is deliberately absent from normal
  // imports. Include its thin triggers and every interaction/error state.
  "src/components/layout/app-shell/DeferredShellChrome.tsx",
  ...[
    "football-games/football-name-chain", "football-games/played-for-both-clubs",
    "juegos-de-futbol/cadena-de-futbolistas", "juegos-de-futbol/jugador-en-comun",
    "futbol-oyunlari/son-harfle-futbolcu", "futbol-oyunlari/ortak-futbolcu-oyunu",
  ].map((route) => `src/app/[locale]/(hub)/(word-shell)/${route}/page.tsx`),
];

// Each reachable local import() must be reviewed. Pre-Play includes member,
// auth, locale-menu and scroll-triggered UI, not just the first guest viewport.
const boundary = (from, specifier, phase, reason) => [`${from} -> ${specifier}`, { phase, reason }];
export const WORD_DYNAMIC_BOUNDARIES = Object.fromEntries([
  ...[
    "../../i18n/LanguageSwitcher", "../../shared/SocialLinks", "../../shared/ContactModal",
    "./AppShellProfileMenu", "./AppShellLogoutDialog",
  ].map((specifier) => boundary("src/components/layout/app-shell/DeferredShellChrome.tsx", specifier, "pre-play", "Flag-on non-word fallbacks and restored members use the unchanged originals before Play.")),
  ...[
    "../../i18n/LanguageSwitcher", "../../i18n/PublicLanguageLink", "../../shared/SocialLinks",
    "../../shared/ContactModal", "./AppShellProfileMenu", "./AppShellLogoutDialog",
  ].map((specifier) => boundary("src/components/layout/app-shell/shellChromeLoader.ts", specifier, "pre-play", "Explicit intent loads an original popup; include its complete styles, not just the first viewport.")),
  boundary("src/app/route-providers.tsx", "./providers", "pre-play", "Hub word routes render FullProviders immediately, including toast UI."),
  ...["es", "tr", "ka"].map((locale) => boundary("src/app/route-providers.tsx", `./locale-asset-providers.${locale}`, "pre-play", "Staging opt-in entry renders the same complete Providers tree; preserve all shell/auth/toast styles.")),
  boundary("src/app/route-providers.tsx", "@/features/partner/PartnerProviders", "other-host", "Partner hosts never render these Quizball word routes."),
  ...["es", "ka", "tr"].map((locale) => boundary("src/lib/i18n/client-messages.ts", `@/messages/${locale}.json`, "data", "Translation data has no rendered component styles.")),
  boundary("src/components/auth/AppAuthGate.tsx", "@/features/auth/GuestAuthDialog", "pre-play", "Guest authentication can open before Play."),
  boundary("src/components/auth/AppAuthGate.tsx", "@/components/shared/LoadingScreen", "pre-play", "Retain all authentication loading states."),
  boundary("src/components/AppLogo.tsx", "./AnimatedAppLogo", "pre-play", "Preserve animated-logo styling even when currently dormant."),
  boundary("src/components/layout/app-shell/AppShellProfileMenu.tsx", "@/components/TierFrameAvatar", "pre-play", "A restored member renders avatar equipment before Play."),
  boundary("src/components/i18n/LanguageSwitcher.tsx", "./PublicLanguageLink", "pre-play", "The existing language menu opens before Play."),
  boundary("src/components/layout/app-shell/DeferredShellRealtime.tsx", "./ShellRealtime", "pre-play", "Preserve the CSS-neutral member realtime boundary."),
  ...[
    "@/components/layout/ChallengeInvitePrompt", "@/components/layout/NotificationsDropdown",
    "@/components/shared/EventAwardCeremony", "@/features/weekend-league/rewards/WlRewardCeremonyHost",
  ].map((specifier) => boundary("src/components/layout/AppShellFrame.tsx", specifier, "pre-play", "Member UI can render immediately on session restoration.")),
  boundary("src/features/fifa-universe/FifaModeArtLazy.tsx", "./FifaModeArt", "pre-play", "Keep all related-card artwork variants covered."),
  boundary("src/features/marketing/public/DeferredCardArt.tsx", "@/features/demos/DemoModeArt", "pre-play", "Scrolling can show related artwork without Play; retain its complete styles."),
  boundary("src/features/marketing/public/PracticeLayer.tsx", "@/features/demos/DemoModeView", "play-only", "The practice portal is mounted only while playing."),
  ...[
    "./GuestDailyPlay", "@/features/buscaminas/BuscaminasGame", "@/features/pistas/PistasGame",
    "@/features/minuto/MinutoGame", "@/features/ultimo/UltimoGame", "@/features/mini-games/components/GuessTheGoalGuest",
    "@/features/shared-player/SharedPlayerDaily", "@/features/name-chain/NameChainDaily",
    "./StatSniperPublicPlay", "@/features/demos/DemoModeView",
  ].map((specifier) => boundary("src/features/marketing/public/PublicGameEmbed.tsx", specifier, "play-only", "Every engine is gated by playing; word engines import application CSS.")),
  boundary("src/features/marketing/public/DeferredWordDailyBoard.tsx", "@/features/wordgames/daily/WordDailyPageBoards", "pre-play", "Scrolling can mount rankings without Play."),
  boundary("src/features/wordgames/daily/WordDailyLeaderboardRows.tsx", "./WordDailyLeaderboardTable", "pre-play", "A nonempty visible ranking loads its original table before Play; retain every row and failure-state style."),
  ...[
    "./PublicTopTen", "@/features/buscaminas/BuscaminasLeaderboard", "@/features/pistas/PistasLeaderboard",
    "@/features/ultimo/UltimoLeaderboard", "@/features/minuto/MinutoLeaderboard", "./StatSniperPageBoard",
  ].map((specifier) => boundary("src/features/marketing/public/PublicPageBoard.tsx", specifier, "other-mode", "These eight routes select DeferredWordDailyBoard instead.")),
]);

const CODE = /\.(?:[cm]?js|jsx|ts|tsx)$/;
const posix = (value) => value.split(path.sep).join("/");
function typeOnly(node) {
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    return clause?.isTypeOnly || Boolean(clause && !clause.name && clause.namedBindings
      && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length
      && clause.namedBindings.elements.every((item) => item.isTypeOnly));
  }
  return node.isTypeOnly || Boolean(node.exportClause && ts.isNamedExports(node.exportClause)
    && node.exportClause.elements.length && node.exportClause.elements.every((item) => item.isTypeOnly));
}

export function resolveWordStyleClosure({ root = process.cwd(), entries = WORD_LANDING_ROOTS, boundaries = WORD_DYNAMIC_BOUNDARIES } = {}) {
  const visited = new Set();
  const observed = new Set();
  const resolve = (from, specifier) => {
    if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;
    const base = specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2)) : path.resolve(path.dirname(from), specifier);
    const file = ["", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"]
      .map((suffix) => base + suffix).find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!file) throw new Error(`Unresolved local style dependency: ${posix(path.relative(root, from))} -> ${specifier}`);
    return file;
  };
  const visit = (file) => {
    if (visited.has(file) || !CODE.test(file)) return;
    visited.add(file);
    const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    for (const node of source.statements) {
      if ((!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) || typeOnly(node)
        || !node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) continue;
      const dependency = resolve(file, node.moduleSpecifier.text);
      if (dependency) visit(dependency);
    }
    const walk = (node) => {
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const specifier = node.arguments[0];
        if (!specifier || !ts.isStringLiteral(specifier)) throw new Error(`Nonliteral dynamic style boundary in ${posix(path.relative(root, file))}`);
        const dependency = resolve(file, specifier.text);
        if (dependency) {
          const key = `${posix(path.relative(root, file))} -> ${specifier.text}`;
          const classification = boundaries[key];
          if (!classification || !classification.reason || !["pre-play", "play-only", "navigation", "other-host", "other-mode", "data"].includes(classification.phase)) {
            throw new Error(`Unclassified dynamic style boundary: ${key}`);
          }
          observed.add(key);
          if (classification.phase === "data" && CODE.test(dependency)) throw new Error(`Code cannot be classified as data: ${key}`);
          if (classification.phase === "pre-play") visit(dependency);
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(source);
  };
  for (const entry of entries) visit(path.resolve(root, entry));
  const stale = Object.keys(boundaries).filter((key) => !observed.has(key));
  if (stale.length) throw new Error(`Stale dynamic style classifications: ${stale.join(", ")}`);
  return { files: [...visited].map((file) => posix(path.relative(root, file))).sort(), boundaries: [...observed].sort() };
}

export function renderWordStyleSources(files) {
  const directory = "src/styles";
  return "/* Generated by scripts/generate-word-landing-sources.mjs --write. Do not edit. */\n"
    + files.map((file) => `@source "${path.posix.relative(directory, file)}";`).join("\n") + "\n";
}
