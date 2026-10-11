// @vitest-environment node
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("word landing stylesheet delivery", () => {
  it("covers every route and the shell/auth/board dependency closure without losing utility declarations", () => {
    const output = execFileSync(process.execPath, ["scripts/check-word-landing-styles.mjs"], {
      cwd: process.cwd(), encoding: "utf8", timeout: 160_000,
    });
    const result = JSON.parse(output.trim().split("\n").at(-1)!);
    expect(result.checkedPages).toBeGreaterThan(100);
    expect(result.manifestFresh).toBe(true);
    expect(result.identicalCriticalOutput).toBe(true);
    expect(result.dynamicBoundaries).toBeGreaterThan(20);
    expect(result.contextualDeclarations).toBeGreaterThan(6_000);
    expect(result.missing).toBe(0);
    expect(result.missingBeforePlay).toBe(0);
  }, 180_000);
});
