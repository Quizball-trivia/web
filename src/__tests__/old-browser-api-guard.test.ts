import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Browser APIs our older visitors lack (iOS 15 Safari, old Android Chrome): calling them throws.
// AbortSignal.timeout: Safari < 16, Chrome < 103 — browser code uses timeoutSignal().
// crypto.randomUUID: Safari < 15.4, Chrome < 92 — browser code feature-detects it or uses createRealtimeCommandId().
const SRC = join(__dirname, "..");
const SERVER_ONLY = [/^app\/api\//, /^middleware\.ts$/, /^lib\/timeoutSignal\.ts$/, /__tests__\//];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("AbortSignal.timeout in browser code", () => {
  it("is only called from server code", () => {
    const offenders = sourceFiles(SRC)
      .map((file) => relative(SRC, file))
      .filter((file) => !SERVER_ONLY.some((rule) => rule.test(file)))
      .filter((file) => readFileSync(join(SRC, file), "utf8").includes("AbortSignal.timeout("));
    expect(offenders).toEqual([]);
  });
});

// Calls wrapped in try/catch that already fall back safely.
const RANDOM_UUID_WRAPPED = [/^features\/campaign-quiz\/campaignAttribution\.ts$/];
const FEATURE_DETECTED = /typeof [\w.?]*randomUUID|["']randomUUID["'] in |randomUUID\?\.\(/;

describe("crypto.randomUUID in browser code", () => {
  it("is only called where it is feature-detected", () => {
    const offenders = sourceFiles(SRC)
      .map((file) => relative(SRC, file))
      .filter((file) => !SERVER_ONLY.some((rule) => rule.test(file)) && !RANDOM_UUID_WRAPPED.some((rule) => rule.test(file)))
      .filter((file) => {
        const text = readFileSync(join(SRC, file), "utf8");
        return /\brandomUUID\(\)/.test(text) && !FEATURE_DETECTED.test(text);
      });
    expect(offenders).toEqual([]);
  });
});
