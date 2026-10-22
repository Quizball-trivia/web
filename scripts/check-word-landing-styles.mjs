/** Read-only stylesheet/route checks; no browser or private configuration. */
import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { resolveWordStyleClosure, renderWordStyleSources } from "./lib/word-landing-style-closure.mjs";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const styleDirectory = path.join(root, "src/styles");
const criticalText = read("src/styles/word-landing-utilities.css");
// Resolve independently from physical route/layout roots, not from the manifest.
const closure = resolveWordStyleClosure({ root });
const freshManifest = renderWordStyleSources(closure.files);
if (read("src/styles/word-landing-sources.css") !== freshManifest) throw new Error("Stale word style manifest; regenerate with scripts/generate-word-landing-sources.mjs --write.");

const wordSlugs = new Map([
  ["football-games", ["football-name-chain", "played-for-both-clubs", "football-horserace", "football-codenames", "football-odd-one-out"]],
  ["juegos-de-futbol", ["cadena-de-futbolistas", "jugador-en-comun", "carrera-de-caballos-futbolera", "codenames-futbolero", "dato-falso-futbolero"]],
  ["futbol-oyunlari", ["son-harfle-futbolcu", "ortak-futbolcu-oyunu", "futbol-at-yarisi", "futbol-codenames", "hangisi-yanlis"]],
  ["futbolnye-igry", ["futbolisty-na-poslednyuyu-bukvu", "igravshie-za-oba-kluba", "futbolnye-skachki", "kodovye-imena-futbol", "lozhnyj-fakt"]],
  ["jogos-de-futebol", ["jogo-da-ultima-letra", "jogador-em-comum", "corrida-das-selecoes", "codenames-futebol", "qual-e-a-mentira"]],
]);
const fixedEntries = new Set([...wordSlugs].flatMap(([folder, slugs]) => slugs.map((slug) => `src/app/[locale]/(hub)/(word-shell)/${folder}/${slug}/page.tsx`)));
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
const renderClosureSheet = criticalText.replace('@import "./word-landing-sources.css";', "")
  + closure.files.map((file) => `\n@source "${path.join(root, file)}";`).join("");
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
// Import expansion can change harmless whitespace/comments. Preserve every
// ordered rule, at-rule and declaration, but not formatting/source locations.
const orderedRules = (nodes) => nodes.filter((node) => node.type !== "comment").map((node) => ({
  type: node.type, selector: node.selector, name: node.name, params: node.params,
  prop: node.prop, value: node.value, important: Boolean(node.important),
  ...(node.nodes ? { nodes: orderedRules(node.nodes) } : {}),
}));
if (JSON.stringify(orderedRules(compiled[2].root.nodes)) !== JSON.stringify(orderedRules(compiled[4].root.nodes))) {
  throw new Error("Generated sheet differs from independently compiled fresh closure (ordering/rules included).");
}
for (const engine of ["src/features/shared-player/SharedPlayerDaily.tsx", "src/features/name-chain/NameChainDaily.tsx"]) {
  if (!read(engine).includes('import "@/styles/application-utilities.css";')) throw new Error(`Lazy engine lacks stylesheet dependency: ${engine}`);
}
console.log(JSON.stringify({ checkedPages, criticalModules: closure.files.length, dynamicBoundaries: closure.boundaries.length, manifestFresh: true, identicalCriticalOutput: true, contextualDeclarations: complete.size, missing: 0, missingBeforePlay: 0 }));
