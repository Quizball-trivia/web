import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (key: string) => ({ "common.loading": "Loading", "common.tryAgain": "Try again", "errors.EXTERNAL_SERVICE_ERROR": "Service temporarily unavailable" })[key] ?? key }) }));
import { WordDailyLeaderboardRows, wordLeaderboardTableCode } from "../WordDailyLeaderboardRows";

const entry: LeaderboardEntry = { id: "qa-one", rank: 1, username: "QA fixture", avatar: "avatar-1", tier: "Academy", rankPoints: 3, isCurrentUser: false, trend: "same", trendValue: 0 };
const props = { entries: [entry], currentUserId: "qa-me", pointsLabel: "PTS", compact: true as const };
const rendered = vi.fn();
let mounts = 0;
type TableProps = ComponentProps<typeof import("@/features/leaderboard/components/LeaderboardTable").LeaderboardTable>;
function MockTable(p: TableProps) {
  const [instance] = useState(() => ++mounts);
  rendered(p);
  return <div data-testid="rows" data-instance={instance}>{p.entries.map(e => e.username).join(",")}</div>;
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }

beforeEach(() => { rendered.mockClear(); mounts = 0; });
afterEach(() => vi.restoreAllMocks());

describe("on-demand word leaderboard rows", () => {
  it("reserves compact row geometry while loading, forwards exact props, and does not remount on normal data updates", async () => {
    const gate = deferred<{ default: typeof MockTable }>();
    const load = vi.spyOn(wordLeaderboardTableCode, "load").mockReturnValue(gate.promise);
    const view = render(<WordDailyLeaderboardRows {...props} />);
    expect(load).toHaveBeenCalledOnce();
    expect(screen.getByRole("status", { name: "Loading" }).querySelector('[style]')).toHaveStyle({ height: "86px" });
    expect(screen.queryByTestId("rows")).not.toBeInTheDocument();
    await act(async () => gate.resolve({ default: MockTable }));
    expect(await screen.findByTestId("rows")).toHaveAttribute("data-instance", "1");
    expect(rendered).toHaveBeenLastCalledWith(props);
    const next = { ...props, currentUserId: "qa-one", entries: [{ ...entry, rankPoints: 5 }] };
    view.rerender(<WordDailyLeaderboardRows {...next} />);
    expect(rendered).toHaveBeenLastCalledWith(next);
    expect(screen.getByTestId("rows")).toHaveAttribute("data-instance", "1");
    expect(load).toHaveBeenCalledOnce();
  });

  it("contains a failed chunk, keeps unrelated navigation/form state and retries only the rows", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // Expected caught React error.
    const load = vi.spyOn(wordLeaderboardTableCode, "load")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ default: MockTable });
    const user = userEvent.setup();
    render(<><nav>Current navigation</nav><input aria-label="Unrelated form" defaultValue="keep" /><WordDailyLeaderboardRows {...props} /></>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Service temporarily unavailable");
    expect(screen.getByRole("navigation")).toHaveTextContent("Current navigation");
    expect(screen.getByRole("textbox", { name: "Unrelated form" })).toHaveValue("keep");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByTestId("rows")).toBeInTheDocument());
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Unrelated form" })).toHaveValue("keep");
  });
});
