import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuizBoardPartner } from "../QuizBoardPartner";
import type { QuizBoardEvent, QuizBoardView } from "../quizBoardApi";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: locale.value, t: (key: string) => key }) }));

afterEach(() => {
  cleanup();
  locale.value = "en";
});

const tiles = (owners: Record<number, "player" | "none"> = {}) =>
  Array.from({ length: 9 }, (_, tile) => ({
    tile, category: Math.floor(tile / 3), row: tile % 3, value: (tile % 3 + 1) * 100, owner: owners[tile] ?? null,
  }));

const board = (over: Partial<QuizBoardView> = {}): QuizBoardView => ({
  playId: "play-1", phase: "pick", turn: 0, serverNow: new Date().toISOString(),
  deadlineAt: new Date(Date.now() + 90_000).toISOString(), playerScore: 0,
  categories: ["Legends", "Clubs", "Cups"], tiles: tiles(), activeTile: null, question: null, events: [], result: null,
  ...over,
});

const question = { tile: 2, value: 300, prompt: "Who won the 2005 final?", image: null, options: ["A", "B", "C", "D"] };
const ev = (seq: number, e: Partial<QuizBoardEvent>): QuizBoardEvent => ({
  seq, actor: "player", kind: "pick", tile: null, correct: null, choice: null, points: 0, ...e,
});

function renderWith(current: QuizBoardView | null, posts: Record<string, QuizBoardView> = {}) {
  const onFinished = vi.fn();
  const onExit = vi.fn();
  const api = {
    get: vi.fn().mockResolvedValue({ board: current }),
    post: vi.fn().mockImplementation((path: string) => Promise.resolve({ board: posts[path] ?? null })),
  };
  const utils = render(<QuizBoardPartner gameId="quiz-board" api={api} onFinished={onFinished} onExit={onExit} />);
  return { ...utils, api, onFinished, onExit };
}

describe("Quiz Board partner screen (solo)", () => {
  it("shows the title and one points chip in the header and never mentions an AI", async () => {
    const { container } = renderWith(board());
    await screen.findByTestId("quiz-board-grid");
    expect(screen.getByText("Quiz Board")).toBeTruthy();
    expect(screen.getByTestId("quiz-board-score").textContent).toBe("0");
    expect(screen.getByText("Pick a tile")).toBeTruthy();
    expect(container.textContent).not.toMatch(/\bAI\b|steal/i);
  });

  it("the Georgian intro explains solo play", async () => {
    locale.value = "ka";
    const { container } = renderWith(null);
    await screen.findByTestId("quiz-board-start");
    expect(screen.getByText("აირჩიე უჯრები და უპასუხე — სწორი პასუხი უჯრის ქულას მოგიტანს")).toBeTruthy();
    expect(screen.getByText("9 უჯრა · თითო კითხვაზე 20 წამი · სწორ პასუხზე 100, 200 ან 300 ქულა")).toBeTruthy();
    expect(container.textContent).not.toMatch(/\bAI\b|მოიპარ/);
  });

  it("uses the blue / yellow partner look, nothing purple", async () => {
    const picked = board({
      phase: "answer", turn: 1, activeTile: 2, question, events: [ev(1, { tile: 2 })],
      deadlineAt: new Date(Date.now() + 20_000).toISOString(),
    });
    renderWith(picked);
    await screen.findByTestId("quiz-board-option-0");
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/purple|#CE82FF/i);
    expect(screen.getByTestId("quiz-board-option-0").className).toContain("border-brand-yellow");
    expect(html).toContain("bg-brand-blue");
  });

  it("pick → question → right answer: the tile turns +value and the points go up after the reveal", async () => {
    const picked = board({
      phase: "answer", turn: 1, activeTile: 2, question, events: [ev(1, { tile: 2 })],
      deadlineAt: new Date(Date.now() + 20_000).toISOString(),
    });
    const answered = board({
      turn: 2, playerScore: 300, tiles: tiles({ 2: "player" }),
      events: [ev(1, { tile: 2 }), ev(2, { kind: "answer", tile: 2, correct: true, choice: 1, correctIndex: 1, points: 300 })],
    });
    const { api } = renderWith(board(), { pick: picked, answer: answered });
    fireEvent.click(await screen.findByTestId("quiz-board-tile-2"));
    expect(api.post).toHaveBeenCalledWith("pick", { playId: "play-1", turn: 0, tile: 2 });
    await screen.findByText("Who won the 2005 final?");
    expect(screen.getByTestId("quiz-board-timer")).toBeTruthy();
    // act flushes the answer response, so the 1.4 s reveal is checked before its timer can end it.
    await act(async () => {
      fireEvent.click(screen.getByTestId("quiz-board-option-1"));
    });
    expect(api.post).toHaveBeenCalledWith("answer", { playId: "play-1", turn: 1, choice: 1 });
    expect(screen.getByTestId("quiz-board-option-1").dataset.state).toBe("correct");
    // The tile stays disabled while the answer is shown.
    expect((screen.getByTestId("quiz-board-tile-0") as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(screen.getByTestId("quiz-board-tile-2").dataset.owner).toBe("player"), { timeout: 3_000 });
    expect(screen.getByTestId("quiz-board-tile-2").textContent).toBe("+300");
    expect(screen.getByTestId("quiz-board-score").textContent).toBe("300");
    expect((screen.getByTestId("quiz-board-tile-0") as HTMLButtonElement).disabled).toBe(false);
  });

  it("a wrong answer shows the right option and leaves the tile used for 0", async () => {
    const picked = board({ phase: "answer", turn: 1, activeTile: 2, question, events: [ev(1, { tile: 2 })] });
    const answered = board({
      turn: 2, tiles: tiles({ 2: "none" }),
      events: [ev(1, { tile: 2 }), ev(2, { kind: "answer", tile: 2, correct: false, choice: 0, correctIndex: 3 })],
    });
    renderWith(picked, { answer: answered });
    const option = await screen.findByTestId("quiz-board-option-0");
    await act(async () => {
      fireEvent.click(option);
    });
    expect(screen.getByTestId("quiz-board-option-0").dataset.state).toBe("wrong");
    expect(screen.getByTestId("quiz-board-option-3").dataset.state).toBe("correct");
    await waitFor(() => expect(screen.getByTestId("quiz-board-tile-2").dataset.owner).toBe("none"), { timeout: 3_000 });
    expect(screen.getByTestId("quiz-board-score").textContent).toBe("0");
  });

  it("a finished board shows the points and reports them to the host", async () => {
    const { onFinished } = renderWith(
      board({ phase: "finished", turn: 18, deadlineAt: null, playerScore: 1200, result: { score: 1200, endReason: "completed" } }),
    );
    expect((await screen.findByTestId("quiz-board-over")).textContent).toContain("Board complete");
    expect(screen.getByTestId("quiz-board-final-score").textContent).toBe(`You earned ${(1200).toLocaleString()} of 1,800 points.`);
    fireEvent.click(screen.getByTestId("quiz-board-see-points"));
    expect(onFinished).toHaveBeenCalledWith({ playId: "play-1", score: 1200 });
  });

  it("back mid-play opens the partner leave dialog; continue keeps the play going", async () => {
    const { api, onExit } = renderWith(board({ playerScore: 300, tiles: tiles({ 2: "player" }) }));
    fireEvent.click(await screen.findByRole("button", { name: "common.back" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("Leave this game?");
    expect(dialog.textContent).toContain("You keep the points earned so far, and today's play counts as used.");
    fireEvent.click(screen.getByRole("button", { name: "dailyQuit.keepPlaying" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(api.post).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
    expect(screen.getByTestId("quiz-board-grid")).toBeTruthy();
  });

  it("leaving from the dialog ends the play with the points earned so far", async () => {
    const left = board({ phase: "finished", turn: 5, deadlineAt: null, playerScore: 300, result: { score: 300, endReason: "left" } });
    const { api, onFinished } = renderWith(board({ playerScore: 300, tiles: tiles({ 2: "player" }) }), { leave: left });
    fireEvent.click(await screen.findByRole("button", { name: "common.back" }));
    fireEvent.click(await screen.findByRole("button", { name: "dailyQuit.quitGame" }));
    await waitFor(() => expect(onFinished).toHaveBeenCalledWith({ playId: "play-1", score: 300 }));
    expect(api.post).toHaveBeenCalledWith("leave", { playId: "play-1" });
  });

  it("uses the Georgian leave copy of the other partner games", async () => {
    locale.value = "ka";
    renderWith(board());
    fireEvent.click(await screen.findByRole("button", { name: "common.back" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain("დატოვებ თამაშს?");
    expect(dialog.textContent).toContain("აქამდე მოპოვებული ქულები შენ რჩება, დღევანდელი თამაში კი გამოყენებულად ჩაითვლება.");
  });

  it("back before a play has started goes straight back, without the dialog", async () => {
    const { onExit, api } = renderWith(null);
    fireEvent.click(await screen.findByTestId("quiz-board-intro-back"));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("back on a finished board goes straight back, without the dialog", async () => {
    const { onExit } = renderWith(
      board({ phase: "finished", turn: 18, deadlineAt: null, playerScore: 1200, result: { score: 1200, endReason: "completed" } }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "common.back" }));
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("a cancelled play (block) reports nothing", async () => {
    const { onFinished } = renderWith(
      board({ phase: "finished", deadlineAt: null, result: { score: 0, endReason: "cancelled" } }),
    );
    expect(await screen.findByTestId("quiz-board-cancelled")).toBeTruthy();
    expect(screen.queryByTestId("quiz-board-over")).toBeNull();
    expect(onFinished).not.toHaveBeenCalled();
  });
});
