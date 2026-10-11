/** Read-only stylesheet/route checks; no browser or private configuration. */
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import ts from "typescript";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const styleDirectory = path.join(root, "src/styles");
const criticalText = read("src/styles/word-landing-utilities.css");
const sources = [...criticalText.matchAll(/@source "([^"]+)";/g)].map((match) => path.resolve(styleDirectory, match[1]));
const covered = (file) => sources.some((source) => file === source || file.startsWith(`${source}${path.sep}`));

// Static dependencies plus shell/auth/board boundaries which can render without Play.
const entries = [
  "src/app/layout.tsx", "src/app/providers.tsx", "src/app/seo-providers.tsx",
  "src/components/layout/AppShell.tsx", "src/components/auth/AppAuthGate.tsx",
  "src/features/marketing/PublicGameScreen.tsx", "src/features/auth/GuestAuthDialog.tsx",
  "src/components/layout/ChallengeInvitePrompt.tsx", "src/components/layout/NotificationsDropdown.tsx",
  "src/components/shared/EventAwardCeremony.tsx", "src/features/weekend-league/rewards/WlRewardCeremonyHost.tsx",
  "src/features/wordgames/daily/WordDailyPageBoards.tsx", "src/components/TierFrameAvatar.tsx",
];
const visited = new Set();
const absentSources = [];
function resolveImport(from, name) {
  const absolute = name.startsWith("@/") ? path.join(root, "src", name.slice(2)) : name.startsWith(".") ? path.resolve(path.dirname(from), name) : null;
  if (!absolute) return null;
  for (const suffix of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const file = absolute + suffix;
    if (/\.tsx?$/.test(file) && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}
function visit(file) {
  if (visited.has(file)) return;
  visited.add(file);
  const text = fs.readFileSync(file, "utf8");
  if (/\bclassName\b/.test(text) && !covered(file)) absentSources.push(path.relative(root, file));
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  for (const node of ast.statements) {
    if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    const dependency = resolveImport(file, node.moduleSpecifier.text);
    if (dependency) visit(dependency);
  }
}
for (const entry of entries) visit(path.join(root, entry));
if (absentSources.length) throw new Error(`Critical render dependencies missing: ${absentSources.join(", ")}`);

const wordSlugs = new Map([
  ["football-games", ["football-name-chain", "played-for-both-clubs"]],
  ["juegos-de-futbol", ["cadena-de-futbolistas", "jugador-en-comun"]],
  ["futbol-oyunlari", ["son-harfle-futbolcu", "ortak-futbolcu-oyunu"]],
]);
const fixedEntries = new Set([...wordSlugs].flatMap(([folder, slugs]) => slugs.map((slug) => `src/app/[locale]/(hub)/${folder}/${slug}/page.tsx`)));
const appDirectory = path.join(root, "src/app");
let checkedPages = 0;
function visitRoutes(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) visitRoutes(file);
    else if (item.name === "page.tsx") {
      checkedPages++;
      const relative = path.relative(root, file);
      const fixed = fixedEntries.has(relative);
      const inherited = [file];
      for (let ancestor = path.dirname(file); ancestor.startsWith(appDirectory); ancestor = path.dirname(ancestor)) {
        const layout = path.join(ancestor, "layout.tsx");
        if (fs.existsSync(layout)) inherited.push(layout);
        if (ancestor === appDirectory) break;
      }
      const full = inherited.some((entry) => fs.readFileSync(entry, "utf8").includes("@/styles/application-utilities.css"));
      if (full === fixed) throw new Error(`Wrong route stylesheet: ${relative}`);
      if (fixed && !read(relative).includes("@/styles/word-landing-utilities.css")) throw new Error(`Missing fixed landing stylesheet: ${relative}`);
    }
  }
}
visitRoutes(appDirectory);

function declarations(ast) {
  const result = new Set();
  ast.walkRules((rule) => {
    const parents = [];
    for (let ancestor = rule.parent; ancestor && ancestor.type !== "root"; ancestor = ancestor.parent) {
      if (ancestor.type === "atrule") parents.unshift(`@${ancestor.name} ${ancestor.params}`);
    }
    for (const selector of postcss.list.comma(rule.selector)) {
      for (const declaration of rule.nodes ?? []) if (declaration.type === "decl") {
        result.add(`${parents.join("|")}|${selector}|${declaration.prop}:${declaration.value}${declaration.important ? "!important" : ""}`);
      }
    }
  });
  ast.walkAtRules("property", (rule) => {
    for (const declaration of rule.nodes ?? []) if (declaration.type === "decl") result.add(`@property ${rule.params}|${declaration.prop}:${declaration.value}`);
  });
  return result;
}

// Recompose the monolithic equivalent with the SAME current tokens/custom CSS.
// This tests utility generation, not a frozen snapshot of old brand colours.
const base = read("src/styles/globals.css");
const equivalent = base
  .replace('@layer theme, base, components, utilities;\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/preflight.css" layer(base);', '@import "tailwindcss";')
  .replace('@import "./theme-tokens.css";', read("src/styles/theme-tokens.css"));
const compiled = [];
const renderClosureSheet = criticalText.replace(/@source "[^"]+";/g, "")
  + [...visited].map((file) => `\n@source "${file}";`).join("");
for (const [name, css] of [
  ["monolithic", equivalent], ["base", base],
  ["word", criticalText], ["application", read("src/styles/application-utilities.css")],
  ["render-closure", renderClosureSheet],
]) {
  const output = await postcss([tailwind({ optimize: true })]).process(css, { from: path.join(styleDirectory, `${name}-check.css`) });
  compiled.push(output);
  console.log(JSON.stringify({ sheet: name, gzip: gzipSync(output.css).length }));
}
const complete = declarations(compiled[0].root);
const split = new Set(compiled.slice(1, 4).flatMap((output) => [...declarations(output.root)]));
const missing = [...complete].filter((declaration) => !split.has(declaration));
if (missing.length) throw new Error(`Missing ${missing.length} contextual declarations: ${missing.slice(0, 8).join("\n")}`);
const readyBeforePlay = new Set([...declarations(compiled[1].root), ...declarations(compiled[2].root)]);
const missingBeforePlay = [...declarations(compiled[4].root)].filter((declaration) => !readyBeforePlay.has(declaration));
if (missingBeforePlay.length) throw new Error(`Render closure needs app-only CSS: ${missingBeforePlay.slice(0, 8).join("\n")}`);
for (const engine of ["src/features/shared-player/SharedPlayerDaily.tsx", "src/features/name-chain/NameChainDaily.tsx"]) {
  if (!read(engine).includes('import "@/styles/application-utilities.css";')) throw new Error(`Lazy engine lacks stylesheet dependency: ${engine}`);
}
console.log(JSON.stringify({ checkedPages, criticalModules: visited.size, contextualDeclarations: complete.size, missing: 0, missingBeforePlay: 0 }));
