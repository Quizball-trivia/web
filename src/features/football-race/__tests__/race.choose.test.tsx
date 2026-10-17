import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const calls: Array<{ path: string; body: unknown }> = [];
vi.mock("@/lib/repositories/dailyGameApi", async (original) => ({
  ...(await original<typeof import("@/lib/repositories/dailyGameApi")>()),
  createDailyGameCall: () => async (path: string, _method: string, body: unknown) => {
    calls.push({ path, body });
    // An older server: no nation, no rivalTarget.
    return { run: { id: "r1", version: 2 }, state: { target: 5, positions: [0, 2, 2, 2] } };
  },
}));

const { asNation, footballRaceDailyApi, toDailyView, toDailyWording } = await import("../race.daily");
const { ChooseNation, LanesTrack } = await import("../RaceSolo");
type State = import("../race.daily").RaceDailyState;

// INVENTED nations (public repo).
const L = (en: string) => ({ en, es: en });
const state: State = {
  day: "2031-01-02", open: false, deadline: null, serverNow: "2031-01-02T12:00:00.000Z", done: false, score: 0, ranked: true,
  release: "t", cutoff: "2031-01-01", source: L("Invented"), tournament: { id: "TT", label: L("Test Cup") },
  racers: ["AAA", "BBB", "CCC", "DDD"].map((id) => ({ id, code: id, flag: "xx", name: L(`Nation ${id}`) })),
  nation: null, target: 5, rivalTarget: 3, positions: [0, 2, 2, 2],
  eras: [], families: [], metrics: [], stats: [], results: [], result: null, picks: 0,
};
const view = (s: State) => toDailyView(s, toDailyWording(s, "en"), { name: "You", avatar: {} as never }, false, "en");

afterEach(cleanup);

describe("choosing a nation", () => {
  it("sends the choice to /choose and a pick to /pick", async () => {
    calls.length = 0;
    const run = { run: { id: "r1", version: 1 }, state };
    const chosen = await footballRaceDailyApi.answer(run, "BBB", "en", { move: "choose" });
    await footballRaceDailyApi.answer(run, "TT.all:wins", "en");
    expect(calls).toEqual([
      { path: "/choose", body: { runId: "r1", version: 1, nation: "BBB" } },
      { path: "/pick", body: { runId: "r1", version: 1, stat: "TT.all:wins" } },
    ]);
    expect(chosen.result).toBe("choose");
  });

  it("an older server's run keeps playing as before: no choice, rivals 2 ahead", async () => {
    const r = await footballRaceDailyApi.answer({ run: { id: "r1", version: 1 }, state }, "TT.all:wins", "en");
    expect(r.state.nation).toBeUndefined();
    expect(r.state.rivalTarget).toBe(3);
  });

  it("racing as a nation puts it in seat 0 and keeps the rest in the day's order", () => {
    expect(asNation(state, "CCC").racers.map((r) => r.id)).toEqual(["CCC", "AAA", "BBB", "DDD"]);
    expect(asNation(state, "ZZZ")).toBe(state);
  });

  it("everyone starts on the line: you need 5, each rival 3", () => {
    render(<LanesTrack view={view(state)} locale="en" rivalTarget={3} />);
    expect(screen.getByText("You need 5 · each rival needs 3")).toBeTruthy();
    expect(screen.getByLabelText("Nation AAA: 5 to go")).toBeTruthy();
    expect(screen.getByLabelText("Nation DDD: 3 to go")).toBeTruthy();
  });

  it("Start waits for a nation; the lanes appear once one is tapped", () => {
    const onChoose = vi.fn(), onStart = vi.fn();
    const nations = toDailyWording(state, "en").nations;
    const { rerender } = render(<ChooseNation view={view(state)} nations={nations} chosen={null} locale="en" rivalTarget={3} onChoose={onChoose} onStart={onStart} onExit={() => {}} />);
    const start = screen.getByRole("button", { name: "Tap a nation" }) as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    expect(screen.queryByText("You need 5 · each rival needs 3")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Nation CCC/ }));
    expect(onChoose).toHaveBeenCalledWith("CCC");
    rerender(<ChooseNation view={view(asNation(state, "CCC"))} nations={nations} chosen="CCC" locale="en" rivalTarget={3} onChoose={onChoose} onStart={onStart} onExit={() => {}} />);
    expect(screen.getByRole("button", { name: /Nation CCC/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Nation CCC: 5 to go")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
