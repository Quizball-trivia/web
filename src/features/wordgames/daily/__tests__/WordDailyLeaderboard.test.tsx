import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import type { WordBoard, WordBoardRow } from "../wordDaily.api";

const auth = vi.hoisted(() => ({ status: "anonymous", user: null as { id: string } | null }));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (select: (state: typeof auth) => unknown) => select(auth) }));
vi.mock("../WordDailySignIn", () => ({ DailySignIn: ({ children }: { children: ReactNode }) => <button>{children}</button> }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (key: string) => key }) }));
import { WordDailyLeaderboard } from "../WordDailyLeaderboard";
import { wordLeaderboardTableCode } from "../WordDailyLeaderboardRows";
import { nameChainDailyGame } from "../wordDaily.games";
import { wordDailyCopy } from "../../copy";

type TableProps = ComponentProps<typeof import("@/features/leaderboard/components/LeaderboardTable").LeaderboardTable>;
const table = vi.fn((props: TableProps) => <div data-testid="table">{props.entries.map(e => e.username).join(",")}</div>);
const row = (id: string, rank: number): WordBoardRow => ({ userId: id, rank, username: `QA ${id}`, avatarUrl: null, avatarCustomization: null, country: null, tier: null, score: rank + 3 });
const board = (top: WordBoardRow[] = [], me: WordBoardRow | null = null): WordBoard => ({ day: "2026-10-10", players: top.length, top, me });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }

beforeEach(() => { auth.status = "anonymous"; auth.user = null; table.mockClear(); });
afterEach(() => vi.restoreAllMocks());

describe("word board conditional table loading", () => {
  it("never calls the real row-code loader while pending or empty", async () => {
    const gate = deferred<WordBoard>();
    const load = vi.fn(() => gate.promise);
    const code = vi.spyOn(wordLeaderboardTableCode, "load");
    render(<WordDailyLeaderboard game={nameChainDailyGame("en")} locale="en" day="2026-10-10" load={load} />);
    expect(load).toHaveBeenCalledWith("2026-10-10", "en");
    expect(code).not.toHaveBeenCalled();
    await act(async () => gate.resolve(board()));
    expect(await screen.findByText(wordDailyCopy("en").board.empty)).toBeInTheDocument();
    expect(code).not.toHaveBeenCalled();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("loads only nonempty rows with unchanged mapping, self row, points label and compact props", async () => {
    auth.status = "authenticated"; auth.user = { id: "qa-me" };
    const top = [row("qa-one", 1), row("qa-two", 2)];
    const mine = row("qa-me", 8);
    const load = vi.fn().mockResolvedValue(board(top, mine));
    const code = vi.spyOn(wordLeaderboardTableCode, "load").mockResolvedValue({ default: table });
    render(<WordDailyLeaderboard game={nameChainDailyGame("tr")} locale="tr" day="2026-10-10" load={load} />);
    await screen.findByTestId("table");
    expect(code).toHaveBeenCalledOnce();
    const props = table.mock.calls.at(-1)![0];
    expect(props.currentUserId).toBe("qa-me");
    expect(props.pointsLabel).toBe(wordDailyCopy("tr").points);
    expect(props.compact).toBe(true);
    expect(props.entries).toEqual([...top, mine].map(r => ({ id: r.userId, rank: r.rank, username: r.username, avatar: r.userId, avatarCustomization: null, country: null, tier: "", rankPoints: r.score, isCurrentUser: r.userId === "qa-me", trend: "same", trendValue: 0 })));
    expect(load).toHaveBeenCalledWith("2026-10-10", "tr");
  });

  it("does not duplicate an existing self row and preserves refresh and locale fetches", async () => {
    auth.status = "authenticated"; auth.user = { id: "qa-me" };
    const mine = row("qa-me", 1);
    const load = vi.fn().mockResolvedValue(board([mine], mine));
    vi.spyOn(wordLeaderboardTableCode, "load").mockResolvedValue({ default: table });
    const view = render(<WordDailyLeaderboard game={nameChainDailyGame("en")} locale="en" day="2026-10-10" load={load} />);
    await screen.findByTestId("table");
    expect(table.mock.calls.at(-1)![0].entries).toHaveLength(1);
    view.rerender(<WordDailyLeaderboard game={nameChainDailyGame("es")} locale="es" day="2026-10-10" refreshKey={1} load={load} />);
    await waitFor(() => expect(load).toHaveBeenLastCalledWith("2026-10-10", "es"));
    expect(table.mock.calls.at(-1)![0].pointsLabel).toBe(wordDailyCopy("es").points);
  });

  it("never renders the previous day's rows while a new day is pending", async () => {
    const next = deferred<WordBoard>();
    const load = vi.fn().mockResolvedValueOnce(board([row("qa-old", 1)])).mockReturnValueOnce(next.promise);
    vi.spyOn(wordLeaderboardTableCode, "load").mockResolvedValue({ default: table });
    const view = render(<WordDailyLeaderboard game={nameChainDailyGame("en")} locale="en" day="2026-10-10" load={load} />);
    await screen.findByTestId("table");
    view.rerender(<WordDailyLeaderboard game={nameChainDailyGame("en")} locale="en" day="2026-10-11" load={load} />);
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
    await act(async () => next.resolve({ ...board([row("qa-new", 1)]), day: "2026-10-11" }));
    expect(await screen.findByTestId("table")).toHaveTextContent("QA qa-new");
    expect(screen.getByTestId("table")).not.toHaveTextContent("qa-old");
  });
});
