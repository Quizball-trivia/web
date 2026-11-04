import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const call = vi.hoisted(() => vi.fn());
vi.mock("@/lib/repositories/dailyGameApi", async (importOriginal) => ({ ...(await importOriginal<object>()), createDailyGameCall: () => call }));

import { NameChainPractice } from "../NameChainPractice";

const step = (over: object) => ({ alphabet: "latin", result: null, links: [], letter: "", last: null, could: [], exhausted: false, ...over });
const link = (pid: string, game: string, given = false) => ({ pid, name: game, game, given });

afterEach(() => { cleanup(); call.mockReset(); });

describe("NameChainPractice", () => {
  it("plays an untimed chain on the practice route and shows the names that could have answered", async () => {
    call
      .mockResolvedValueOnce(step({ links: [link("p-bako", "Bako", true)], letter: "O" }))
      .mockResolvedValueOnce(step({ result: "unknown", letter: "O", last: { kind: "unknown", text: "Zzz", name: null, starts: [] } }))
      .mockResolvedValueOnce(step({ result: "ok", links: [link("p-orlen", "Orlen")], letter: "N", last: { kind: "ok", text: "orlen", name: "Orlen", starts: [] } }))
      .mockResolvedValueOnce(step({ could: ["Nurak", "Nesto"] }));
    const onBack = vi.fn();
    render(<NameChainPractice locale="en" brand={["FOOTBALL", "CHAIN"]} onBack={onBack} />);

    await screen.findByRole("textbox");
    expect(call).toHaveBeenNthCalledWith(1, "/practice", "POST", { op: "start", locale: "en", used: [] }, "en", expect.objectContaining({ identity: "player" }));
    // No clock anywhere on the practice screen, and it says it is not ranked.
    expect(screen.queryByText(/\d+\s?s$/)).toBeNull();
    expect(screen.getByText(/never counts for the leaderboard/)).toBeTruthy();

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Zzz" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(call).toHaveBeenCalledTimes(2));
    expect(call.mock.calls[1][2]).toEqual({ op: "answer", locale: "en", used: ["p-bako"], tail: "p-bako", answer: "Zzz" });

    await waitFor(() => expect(screen.getByRole("textbox")).not.toBeDisabled());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Orlen" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    await screen.findByText("1 in this chain");

    fireEvent.click(screen.getByRole("button", { name: "End chain" }));
    await screen.findByText("Nurak");
    expect(call.mock.calls[3][2]).toEqual({ op: "pass", locale: "en", used: ["p-bako", "p-orlen"], tail: "p-orlen" });
    expect(screen.getByText("Nesto")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back to the daily" }));
    expect(onBack).toHaveBeenCalled();
  });
});
