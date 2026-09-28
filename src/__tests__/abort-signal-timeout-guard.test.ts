import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// AbortSignal.timeout is missing on Safari < 16 and Chrome < 103: calling it there throws before
// the request is sent. Browser code uses timeoutSignal(); only server code may call it directly.
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
