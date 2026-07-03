import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api";
import type { DailyChallengeCompletionResult, DailyChallengeSummary } from "@/lib/domain/dailyChallenge";
import { queryKeys } from "@/lib/queries/queryKeys";
import {
  DAILY_CHALLENGE_ALREADY_COMPLETED,
  isDailyChallengeAlreadyCompletedError,
  isRetryableDailyChallengeCompletionError,
} from "@/lib/queries/dailyChallengeCompletion";

const repoMocks = vi.hoisted(() => ({
  completeDailyChallenge: vi.fn(),
}));

vi.mock("@/lib/repositories/dailyChallenges.repo", () => ({
  completeDailyChallenge: (...args: unknown[]) => repoMocks.completeDailyChallenge(...args),
  createDailyChallengeSession: vi.fn(),
  getDailyChallenges: vi.fn(),
  resetDailyChallengeDev: vi.fn(),
}));

import { useCompleteDailyChallenge } from "@/lib/queries/dailyChallenges.queries";

const completionResult: DailyChallengeCompletionResult = {
  challengeType: "moneyDrop",
  completedToday: true,
  coinsAwarded: 25,
  xpAwarded: 10,
};

const challengeSummary: DailyChallengeSummary = {
  challengeType: "moneyDrop",
  title: "Money Drop",
  description: "Drop coins",
  iconToken: "dollarSign",
  showOnHome: true,
  availableToday: true,
  completedToday: false,
  coinReward: 25,
  xpReward: 10,
};

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("daily challenge completion error policy", () => {
  it("detects the already-completed conflict and never treats it as retryable", () => {
    const error = new ApiError("Request failed", 409, {
      code: DAILY_CHALLENGE_ALREADY_COMPLETED,
      message: "Daily challenge already completed",
      request_id: null,
    });

    expect(isDailyChallengeAlreadyCompletedError(error)).toBe(true);
    expect(isRetryableDailyChallengeCompletionError(error)).toBe(false);
  });

  it("retries transient completion failures before resolving", async () => {
    repoMocks.completeDailyChallenge
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockRejectedValueOnce(new ApiError("Request failed", 503, null))
      .mockResolvedValueOnce(completionResult);
    const client = createClient();
    const { result } = renderHook(() => useCompleteDailyChallenge("moneyDrop"), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(42)).resolves.toEqual(completionResult);
    });

    expect(repoMocks.completeDailyChallenge).toHaveBeenCalledTimes(3);
  }, 5_000);

  it("keeps optimistic completion for already-completed conflicts", async () => {
    repoMocks.completeDailyChallenge.mockRejectedValueOnce(
      new ApiError("Request failed", 409, {
        code: DAILY_CHALLENGE_ALREADY_COMPLETED,
        message: "Daily challenge already completed",
        request_id: null,
      }),
    );
    const client = createClient();
    const listKey = queryKeys.dailyChallenges.list("en");
    client.setQueryData<DailyChallengeSummary[]>(listKey, [challengeSummary]);
    const { result } = renderHook(() => useCompleteDailyChallenge("moneyDrop"), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(42)).rejects.toBeInstanceOf(ApiError);
    });

    expect(repoMocks.completeDailyChallenge).toHaveBeenCalledTimes(1);
    expect(client.getQueryData<DailyChallengeSummary[]>(listKey)).toEqual([
      {
        ...challengeSummary,
        availableToday: false,
        completedToday: true,
      },
    ]);
  });

  it("rolls back optimistic completion for final non-retryable failures", async () => {
    repoMocks.completeDailyChallenge.mockRejectedValueOnce(
      new ApiError("Request failed", 404, {
        code: "DAILY_CHALLENGE_NOT_FOUND",
        message: "Challenge not found",
        request_id: null,
      }),
    );
    const client = createClient();
    const listKey = queryKeys.dailyChallenges.list("en");
    client.setQueryData<DailyChallengeSummary[]>(listKey, [challengeSummary]);
    const { result } = renderHook(() => useCompleteDailyChallenge("moneyDrop"), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(42)).rejects.toBeInstanceOf(ApiError);
    });

    expect(repoMocks.completeDailyChallenge).toHaveBeenCalledTimes(1);
    expect(client.getQueryData<DailyChallengeSummary[]>(listKey)).toEqual([challengeSummary]);
  });
});
