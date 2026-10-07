import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PartnerGameScreenProps } from "../types";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: locale.value, t: (key: string) => key }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../../hooks/usePartnerGames", () => ({
  partnerGamesQueryKey: ["partner", "me", "games"],
  usePartnerGames: () => ({ isFetchedAfterMount: true, data: { games: [] } }),
}));
vi.mock("../../PartnerSessionProvider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../PartnerSessionProvider")>()),
  usePartnerSession: () => ({ api: { game: vi.fn() } }),
}));

import { PartnerGameHost } from "../PartnerGameHost";
import { FREECROCO_HOME_PATH } from "../../partnerGames";

function finishingScreen(options?: { ownResultScreen?: boolean }) {
  return function Screen({ onFinished }: PartnerGameScreenProps) {
    return (
      <button type="button" onClick={() => onFinished({ playId: "play-1", score: 80 }, options)}>
        finish
      </button>
    );
  };
}

function renderHost(Screen: ReturnType<typeof finishingScreen>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <PartnerGameHost gameId="true-false" registry={{ "true-false": Screen }} />
    </QueryClientProvider>,
  );
  return { invalidate };
}

async function advance(ms: number) {
  for (let left = ms; left >= 0; left -= 100) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(100, left));
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  locale.value = "en";
});

describe("Partner game kit result", () => {
  it("counts the points up to the server score, then offers the way back", async () => {
    const { invalidate } = renderHost(finishingScreen());
    fireEvent.click(screen.getByText("finish"));
    expect(invalidate).toHaveBeenCalled();

    const points = screen.getByTestId("partner-result-points");
    expect(points.dataset.points).toBe("80");
    expect(points.dataset.counting).toBe("true");
    expect(points.textContent).toBe("+0");

    await advance(2_000);
    expect(points.textContent).toBe("+80");
    expect(points.dataset.counting).toBe("false");
    expect(screen.getByText("points earned")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to games" }).getAttribute("href")).toBe(FREECROCO_HOME_PATH);
  });

  it("keeps a game's own result screen on when it asks to", async () => {
    const { invalidate } = renderHost(finishingScreen({ ownResultScreen: true }));
    fireEvent.click(screen.getByText("finish"));
    expect(invalidate).toHaveBeenCalled();
    expect(screen.getByText("finish")).toBeTruthy();
    expect(screen.queryByTestId("partner-result-points")).toBeNull();
  });
});
