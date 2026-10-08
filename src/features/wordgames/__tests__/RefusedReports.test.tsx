import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RefusedReports, useRefused } from "../ui";

describe("refused answers and their reports", () => {
  it("keeps the last two refused answers of a round, once each, and nothing of other rounds", () => {
    const { result } = renderHook(() => useRefused());
    act(() => { result.current.add(0, " Milo Vantar "); result.current.add(0, "Milo Vantar"); result.current.add(0, "Dago Ravin"); result.current.add(0, "Emir Kosel"); result.current.add(1, "  "); });
    expect(result.current.of(0)).toEqual(["Dago Ravin", "Emir Kosel"]);
    expect(result.current.of(1)).toEqual([]);
  });

  it("shows nothing without refused answers", () => {
    const { container } = render(<RefusedReports texts={[]} line={(t) => t} label="I was right" thanks="Thanks" onReport={() => Promise.resolve(true)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reports one answer and thanks for it; a failed send keeps the button", async () => {
    const onReport = vi.fn((text: string) => Promise.resolve(text === "Milo Vantar"));
    render(<RefusedReports texts={["Milo Vantar", "Dago Ravin"]} line={(t) => `“${t}” was refused`} label="I was right" thanks="Thanks" onReport={onReport} />);
    const [first, second] = screen.getAllByRole("button", { name: "I was right" });
    fireEvent.click(second);
    await waitFor(() => expect(onReport).toHaveBeenCalledWith("Dago Ravin"));
    expect(screen.getAllByRole("button", { name: "I was right" })).toHaveLength(2);
    fireEvent.click(first);
    await waitFor(() => expect(screen.getByText("Thanks")).toBeInTheDocument());
    expect(screen.getAllByRole("button", { name: "I was right" })).toHaveLength(1);
  });
});
