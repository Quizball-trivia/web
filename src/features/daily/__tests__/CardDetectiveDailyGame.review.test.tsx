import type React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sounds/gameSounds", () => ({ playSfx: vi.fn() }));
// Reduced motion: the deal reel hands over quickly instead of waiting on an animation jsdom never runs.
// AnimatePresence "wait" holds the next card behind an exit animation jsdom never finishes: render children directly.
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useReducedMotion: () => true,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { LocaleProvider } from "@/contexts/LocaleContext";
import { buildDemoDailySession } from "@/features/demos/data/demoDailySessions";
import type { CardDetectiveSession } from "@/lib/domain/dailyChallenge";
import { CardDetectiveDailyGame } from "../CardDetectiveDailyGame";

const full = buildDemoDailySession("cardDetective", "en") as CardDetectiveSession;
const session: CardDetectiveSession = { ...full, cards: full.cards.slice(0, 2), cardCount: 2 };

async function dealt() {
  await act(async () => { await new Promise((r) => setTimeout(r, 1_500)); });
}

function guess(text: string) {
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("CardDetectiveDailyGame", () => {
  it("labels the hint budget as points, reviews each card and waits for the player before the next", async () => {
    const onComplete = vi.fn();
    render(<LocaleProvider initialLocale="en"><CardDetectiveDailyGame session={session} onBack={vi.fn()} onComplete={onComplete} practice /></LocaleProvider>);
    await dealt();
    const budget = document.querySelector("[data-card-detective-budget]")!;
    expect(budget.getAttribute("aria-label")).toBe(`Hint budget: ${session.startCoins} pts`);
    expect(screen.getByText(/separate from your coins/)).toBeTruthy();

    // Solved with no hints bought: the whole budget is saved by deduction.
    guess(session.cards[0].acceptedAnswers[0]);
    const review = document.querySelector("[data-card-detective-review]")!;
    expect(review.getAttribute("data-card-detective-review")).toBe("solved");
    expect(screen.getByText("No hints bought")).toBeTruthy();
    // The review replaces the name input: keyboard focus lands on the way forward.
    expect(document.activeElement).toBe(document.querySelector("[data-card-detective-next]"));
    expect(Number(document.querySelector("[data-card-detective-saved]")!.getAttribute("data-card-detective-saved"))).toBeGreaterThan(0);
    // No auto-advance: the review stays until the player moves on.
    await act(async () => { await new Promise((r) => setTimeout(r, 2_600)); });
    expect(document.querySelector("[data-card-detective-review]")).not.toBeNull();

    fireEvent.click(screen.getByText("Next card"));
    await dealt();
    fireEvent.click(screen.getByText("Give up"));
    expect(document.querySelector("[data-card-detective-review]")!.getAttribute("data-card-detective-review")).toBe("missed");
    expect(screen.getByText("No points on a surrendered card")).toBeTruthy();
    expect(document.querySelector("[data-card-detective-saved]")).toBeNull();
    fireEvent.click(screen.getByText("See results"));
    expect(onComplete).toHaveBeenCalledWith(session.startCoins, undefined, [
      expect.objectContaining({ cardId: session.cards[0].id, solved: true, coinsLeft: session.startCoins, cluesRevealed: 0 }),
      expect.objectContaining({ cardId: session.cards[1].id, solved: false }),
    ]);
  }, 15_000);
});
