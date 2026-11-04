import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

vi.mock("@/lib/analytics/public-games.analytics", () => ({ trackGameStart: () => {}, trackGameReplay: () => {}, trackGameComplete: () => {} }));
const load = vi.fn();
vi.mock("../codenames.practice", async (orig) => ({
  ...(await orig<typeof import("../codenames.practice")>()),
  loadPicturePractice: (...a: unknown[]) => load(...a),
}));

import { CodenamesPicturePractice } from "../CodenamesPicturePractice";

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe("Picture practice under Strict Mode", () => {
  it("still deals the first board after the mount effects replay", async () => {
    load.mockResolvedValue(null);
    render(
      <StrictMode>
        <CodenamesPicturePractice locale="en" days={["2026-10-01", "2026-10-02"]} today="2026-10-02" playedDay={null} onExit={() => {}} />
      </StrictMode>,
    );
    await flush();
    // The first request is dropped by the replay's cleanup; the replayed effect must ask again rather than wait forever.
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
