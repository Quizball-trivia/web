import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/api";
import { getNicknameCooldown, isNicknameTakenError } from "@/lib/api/nicknameErrors";

function apiError(status: number, data: unknown) {
  return new ApiError("boom", status, data);
}

describe("isNicknameTakenError", () => {
  it("matches a 409 whose details name the nickname field", () => {
    expect(isNicknameTakenError(apiError(409, { details: { field: "nickname" } }))).toBe(true);
  });

  it("ignores a 409 about a different field", () => {
    expect(isNicknameTakenError(apiError(409, { details: { field: "phone_number" } }))).toBe(false);
  });

  it("ignores non-409s and non-ApiErrors", () => {
    expect(isNicknameTakenError(apiError(400, { details: { field: "nickname" } }))).toBe(false);
    expect(isNicknameTakenError(new Error("nope"))).toBe(false);
    expect(isNicknameTakenError(null)).toBe(false);
  });
});

describe("getNicknameCooldown", () => {
  it("extracts the unlock timestamp from a cooldown rejection", () => {
    const error = apiError(400, {
      code: "NICKNAME_CHANGE_COOLDOWN",
      details: { nextAvailableAt: "2026-08-25T07:26:42.672Z" },
    });
    expect(getNicknameCooldown(error)).toEqual({
      nextAvailableAt: "2026-08-25T07:26:42.672Z",
    });
  });

  it("still reports the cooldown when no timestamp is supplied", () => {
    const error = apiError(400, { code: "NICKNAME_CHANGE_COOLDOWN", details: {} });
    expect(getNicknameCooldown(error)).toEqual({ nextAvailableAt: null });
  });

  it("returns null for unrelated errors", () => {
    expect(getNicknameCooldown(apiError(409, { code: "CONFLICT" }))).toBeNull();
    expect(getNicknameCooldown(new Error("nope"))).toBeNull();
  });
});
