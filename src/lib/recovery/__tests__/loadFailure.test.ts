import { describe, expect, it } from "vitest";
import { isLoadFailure, reloadRestores } from "../loadFailure";

describe("isLoadFailure", () => {
  it.each([
    ["ChunkLoadError", "Loading chunk 4821 failed.\n(error: https://x.test/_next/static/chunks/4821.js)"],
    ["Error", "Loading CSS chunk 77 failed.\n(https://x.test/_next/static/css/a.css)"],
    ["Error", "Failed to load chunk /_next/static/chunks/183971d0.js?dpl=dpl_1 from module 964893"],
    ["TypeError", "Failed to fetch dynamically imported module: https://x.test/a.js"],
    ["TypeError", "Importing a module script failed."],
  ])("recognises %s: %s", (name, message) => {
    expect(isLoadFailure(Object.assign(new Error(message), { name }))).toBe(true);
  });

  it.each([
    new TypeError("Cannot read properties of undefined (reading 'board')"),
    new Error("Request failed with status 503"),
    new TypeError("Failed to fetch"),
    null,
    "Loading chunk 1 failed",
  ])("leaves other errors alone: %s", (error) => {
    expect(isLoadFailure(error)).toBe(false);
  });
});

describe("reloadRestores", () => {
  it("is false only for the ranked quiz, whose match does not survive a reload", () => {
    expect(reloadRestores("/game")).toBe(false);
    expect(reloadRestores("/game/")).toBe(false);
    for (const path of ["/games", "/tic-tac-toe", "/daily-grid", "/auth/callback", "/", "/en/football-games/football-tic-tac-toe"]) expect(reloadRestores(path)).toBe(true);
  });
});
