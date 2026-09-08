import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { roadToGoalMock } = vi.hoisted(() => ({
  roadToGoalMock: vi.fn(({ newRunsEnabled }: { newRunsEnabled: boolean }) => (
    <div>{newRunsEnabled ? "new-runs-enabled" : "resume-only"}</div>
  )),
}));

vi.mock("@/features/mini-games/components/RoadToGoal", () => ({
  RoadToGoal: roadToGoalMock,
}));
// The route wraps the game in the shared intro screen (router + resume probe); the flag test only cares about the game props.
vi.mock("@/features/mini-games/components/MiniGameIntro", () => ({
  MiniGameIntro: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/lib/repositories/roadToGoal.repo", () => ({
  roadToGoalApi: { current: vi.fn(async () => null) },
}));

describe("Road to Goal route flag", () => {
  beforeEach(() => {
    vi.resetModules();
    roadToGoalMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the route available for active-liability recovery while new runs are disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ROAD_TO_GOAL_ENABLED", "false");
    const { default: Page } = await import("../page");

    render(<Page />);
    expect(screen.getByText("resume-only")).toBeInTheDocument();
  });

  it("renders the authenticated game only when explicitly enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ROAD_TO_GOAL_ENABLED", "true");
    const { default: Page } = await import("../page");

    render(<Page />);
    expect(screen.getByText("new-runs-enabled")).toBeInTheDocument();
  });
});
