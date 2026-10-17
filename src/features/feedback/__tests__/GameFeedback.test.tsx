import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GameFeedbackSlot } from "../GameFeedback";

describe("GameFeedbackSlot", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("sends the stars, the online answer and the comment, then stays hidden for that game", async () => {
    const send = vi.fn().mockResolvedValue(null);
    const { unmount } = render(<GameFeedbackSlot game="tenable" title="Football Tenable" locale="en" send={send} />);
    const sendButton = screen.getByRole("button", { name: "Send" });
    expect(sendButton).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: "4 of 5 stars" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    fireEvent.change(screen.getByPlaceholderText("Anything to tell us? (optional)"), { target: { value: "  more lists  " } });
    fireEvent.click(sendButton);
    expect(screen.getByRole("radio", { name: "5 of 5 stars" })).toBeDisabled();
    expect(screen.getByPlaceholderText("Anything to tell us? (optional)")).toBeDisabled();
    expect(send).toHaveBeenCalledWith({ rating: 4, wantsOnline: true, comment: "more lists" });
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks!");
    expect(localStorage.getItem("quizball.gameFeedback.tenable")).toBe("sent");
    unmount();
    render(<GameFeedbackSlot game="tenable" title="Football Tenable" locale="en" send={send} />);
    expect(screen.queryByText("How was Football Tenable?")).toBeNull();
  });

  it("keeps the answer on screen to retry after a failed send, and closing it hides it", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(null);
    const { unmount } = render(<GameFeedbackSlot game="tenable" title="Football Tenable" locale="en" send={send} />);
    fireEvent.click(screen.getByRole("radio", { name: "2 of 5 stars" }));
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't send");
    expect(screen.queryByRole("status")).toBeNull();
    expect(localStorage.getItem("quizball.gameFeedback.tenable")).toBeNull();
    expect(screen.getByRole("radio", { name: "2 of 5 stars" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks!");
    expect(send).toHaveBeenLastCalledWith({ rating: 2, wantsOnline: null, comment: "" });
    unmount();
    localStorage.clear();
    render(<GameFeedbackSlot game="tenable" title="Football Tenable" locale="en" send={send} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("How was Football Tenable?")).toBeNull();
    expect(localStorage.getItem("quizball.gameFeedback.tenable")).toBe("closed");
  });

  it("still shows when storage is blocked", () => {
    // Replaces the storage object itself: test setups differ in which object (and prototype) holds the methods.
    const getItem = vi.fn(() => { throw new Error("blocked"); });
    vi.stubGlobal("localStorage", { getItem, setItem: getItem, removeItem: getItem, clear: getItem });
    render(<GameFeedbackSlot game="tenable" title="Football Tenable" locale="en" send={vi.fn()} />);
    expect(getItem).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "How was Football Tenable?" })).toBeInTheDocument();
  });
});
