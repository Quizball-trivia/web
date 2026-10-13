// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveWordStyleClosure, renderWordStyleSources } from "../../../../scripts/lib/word-landing-style-closure.mjs";

const fixtures: string[] = [];
function fixture(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "quizball-style-closure-"));
  fixtures.push(root);
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  return root;
}
afterEach(() => {
  for (const root of fixtures.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});
const resolve = (root: string, boundaries = {}) => resolveWordStyleClosure({ root, entries: ["src/start.tsx"], boundaries });

describe("word stylesheet dependency resolver", () => {
  it("includes the full provider tree that word routes actually mount before Play", () => {
    const actual = resolveWordStyleClosure();
    expect(actual.files).toEqual(expect.arrayContaining([
      "src/app/providers.tsx", "src/components/auth/AuthSessionBridge.tsx",
      "src/contexts/CspNonceContext.tsx", "src/components/ui/sonner.tsx",
      "src/app/locale-asset-providers.es.tsx", "src/app/locale-asset-providers.tr.tsx", "src/app/locale-asset-providers.ka.tsx",
    ]));
  });
  it("resolves alias imports, re-exports, directory indexes, JS and cycles deterministically", () => {
    const root = fixture({
      "src/start.tsx": 'import "@/z"; import "./directory"; export { thing } from "./barrel";',
      "src/z.ts": 'import "./start";',
      "src/directory/index.jsx": 'export const item = <div className="h-10" />;',
      "src/barrel.ts": 'export { thing } from "./thing.js";',
      "src/thing.js": 'export const thing = "bg-brand-blue";',
    });
    expect(resolve(root).files).toEqual(["src/barrel.ts", "src/directory/index.jsx", "src/start.tsx", "src/thing.js", "src/z.ts"]);
    expect(resolve(root)).toEqual(resolve(root));
    expect(renderWordStyleSources(resolve(root).files)).toContain('@source "../directory/index.jsx";');
  });

  it("ignores type-only imports/re-exports but preserves mixed value imports", () => {
    const root = fixture({
      "src/start.tsx": 'import type { A } from "./missing"; import { type B } from "./also-missing"; export type { C } from "./missing"; export { type D } from "./missing"; import { type E, value } from "./value";',
      "src/value.ts": 'export const value = "rounded-full";',
    });
    expect(resolve(root).files).toEqual(["src/start.tsx", "src/value.ts"]);
  });

  it("includes complete pre-Play dynamic closures, excluding explicitly deferred engines", () => {
    const root = fixture({
      "src/start.tsx": 'const auth = () => import("./auth"); const game = () => import("./game");',
      "src/auth.tsx": 'export { Form } from "./form";',
      "src/form.tsx": 'export const Form = <div className="bg-brand-yellow" />;',
      "src/game.tsx": 'export const Game = <div className="bg-brand-green" />;',
    });
    const boundaries = {
      "src/start.tsx -> ./auth": { phase: "pre-play", reason: "Opens without Play." },
      "src/start.tsx -> ./game": { phase: "play-only", reason: "Engine owns full CSS." },
    };
    expect(resolve(root, boundaries).files).toEqual(["src/auth.tsx", "src/form.tsx", "src/start.tsx"]);
  });

  it("fails closed on new unclassified or nonliteral dynamic imports", () => {
    const root = fixture({ "src/start.tsx": 'const menu = () => import("./menu");', "src/menu.tsx": "export {};" });
    expect(() => resolve(root)).toThrow("Unclassified dynamic style boundary");
    const variable = fixture({ "src/start.tsx": 'const menu = (file: string) => import(file);' });
    expect(() => resolve(variable)).toThrow("Nonliteral dynamic style boundary");
  });

  it("fails on stale classifications and unresolved runtime dependencies", () => {
    const root = fixture({ "src/start.tsx": "export {};" });
    expect(() => resolve(root, { "src/start.tsx -> ./old": { phase: "pre-play", reason: "Old menu." } })).toThrow("Stale dynamic style classifications");
    const missing = fixture({ "src/start.tsx": 'export * from "./missing";' });
    expect(() => resolve(missing)).toThrow("Unresolved local style dependency");
  });

  it("verifies local data assets exist and cannot misclassify code as data", () => {
    const root = fixture({ "src/start.tsx": 'const data = () => import("./data.json");', "src/data.json": '{"text":"Hello"}' });
    expect(resolve(root, { "src/start.tsx -> ./data.json": { phase: "data", reason: "Dictionary." } }).files).toEqual(["src/start.tsx"]);
    const code = fixture({ "src/start.tsx": 'const ui = () => import("./ui");', "src/ui.tsx": "export {};" });
    expect(() => resolve(code, { "src/start.tsx -> ./ui": { phase: "data", reason: "Not really data." } })).toThrow("Code cannot be classified as data");
  });
});
