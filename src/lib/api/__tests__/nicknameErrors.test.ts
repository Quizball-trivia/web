import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/api";
import {
  getNicknameCooldown,
  getNicknameRejection,
  isNicknameTakenError,
} from "@/lib/api/nicknameErrors";

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

describe("getNicknameRejection", () => {
  it("classifies a plain uniqueness clash", () => {
    expect(getNicknameRejection(apiError(409, { details: { field: "nickname" } }))).toBe("taken");
  });

  it("distinguishes a name another player recently vacated", () => {
    const error = apiError(409, {
      details: { field: "nickname", reason: "recently_released" },
    });
    expect(getNicknameRejection(error)).toBe("recently_released");
  });

  it("classifies profanity and empty rejections", () => {
    expect(
      getNicknameRejection(apiError(400, { details: { field: "nickname", reason: "prohibited_content" } })),
    ).toBe("prohibited_content");
    expect(
      getNicknameRejection(apiError(400, { details: { field: "nickname", reason: "empty" } })),
    ).toBe("empty");
  });

  it("classifies the cooldown by code, not status", () => {
    const error = apiError(400, {
      code: "NICKNAME_CHANGE_COOLDOWN",
      details: { field: "nickname", nextAvailableAt: "2026-08-25T07:26:42.672Z" },
    });
    expect(getNicknameRejection(error)).toBe("cooldown");
  });

  it("returns null for unrelated failures so they fall back to generic copy", () => {
    expect(getNicknameRejection(apiError(409, { details: { field: "phone_number" } }))).toBeNull();
    expect(getNicknameRejection(apiError(500, { code: "INTERNAL" }))).toBeNull();
    expect(getNicknameRejection(new Error("network"))).toBeNull();
  });
});
