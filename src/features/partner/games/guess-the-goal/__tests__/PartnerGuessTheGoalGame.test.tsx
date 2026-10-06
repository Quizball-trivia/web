import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { PartnerApiError } from "../../../api/partnerApiClient";
import { PartnerGuessTheGoalGame } from "../PartnerGuessTheGoalGame";

const text = (en: string) => ({ en });
const now = Date.now();
/** A goal answered right whose bonus deadline has just passed (still inside the server's 1 s grace). */
const session = {
  session_id: "11111111-1111-4111-8111-111111111111",
  play_id: "play-1",
  state: "guessed",
  server_now: new Date(now).toISOString(),
  started_at: new Date(now - 40_000).toISOString(),
  grace_ms: 2500,
  full_points_seconds: 10,
  max_points: 100,
  min_points: 40,
  bonus_deadline: new Date(now - 200).toISOString(),
  goal: {
    difficulty: "easy",
    players: [{ id: "p1", team: "attack", at: [50, 50] }],
    steps: [{ kind: "shot", player: "p1", to: [100, 50], duration: 1 }],
    options: [{ id: "o1", text: text("Goal one") }, { id: "o2", text: text("Goal two") }],
    main_moves: 1,
    duration_seconds: 1,
  },
  bonus: { question: text("Which foot?"), options: [{ id: "b1", text: text("Left") }, { id: "b2", text: text("Right") }] },
  outcome: {
    correct: true, timed_out: false, correct_option_id: "o1", points: 100, revealed_moves: 1, title: text("Goal one"),
    fun_fact: null, video_url: null, clip_start_s: null, clip_end_s: null,
    bonus: { question: text("Which foot?"), options: [{ id: "b1", text: text("Left") }, { id: "b2", text: text("Right") }] },
    bonus_deadline: new Date(now - 200).toISOString(),
    awards: { first_solve: false, coins: 0, xp: 0, daily_cap_reached: false, wallet_coins: null, total_xp: null },
    session_state: "guessed", finished: null,
  },
  guess_option_id: "o1",
  progress: { solved: 0, total: 0 },
};

describe("PartnerGuessTheGoalGame", () => {
  it("an accepted bonus answer cancels the pending expiry retry instead of reloading the screen", async () => {
    const expire = vi.fn(async () => { throw new PartnerApiError(400, "invalid_request", "not yet"); });
    const api = {
      get: vi.fn(async () => ({ session, finished: null })),
      post: vi.fn(async (path: string) => {
        if (path.endsWith("/expire")) return expire();
        if (path.endsWith("/bonus")) {
          return { correct: true, timed_out: false, correct_option_id: "b1", bonus_points: 40, awards: session.outcome.awards,
            finished: { play_id: "play-1", score: 140, sent: true }, fun_fact: null, video_url: null, clip_start_s: null, clip_end_s: null };
        }
        throw new Error(`unexpected ${path}`);
      }),
    };
    const onFinished = vi.fn();
    render(
      <LocaleProvider>
        <PartnerGuessTheGoalGame gameId="guess-the-goal" api={api as never} onFinished={onFinished} onExit={vi.fn()} />
      </LocaleProvider>,
    );
    fireEvent.click(await screen.findByTestId("ggt-kickoff"));
    await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
    fireEvent.click((await screen.findAllByTestId("ggt-bonus-option"))[0]);
    await screen.findByTestId("ggt-bonus-next");
    // The retry that was scheduled a second later never fires, and the screen is not reloaded.
    await act(async () => { await new Promise((r) => setTimeout(r, 1_500)); });
    expect(expire).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("ggt-bonus-next"));
    expect(onFinished).toHaveBeenCalledWith({ playId: "play-1", score: 140 });
  }, 15_000);

  it("a lost expiry response is recovered through the play itself: the result shows instead of the start screen", async () => {
    const finished = { play_id: "play-1", score: 100, sent: true };
    const api = {
      get: vi.fn(async (path: string) => {
        if (path === "current") return { session, finished: null };
        if (path === `sessions/${session.session_id}`) {
          return {
            session: null,
            finished,
            outcome: { ...session.outcome, session_state: "complete", bonus: undefined, finished },
            bonus: { correct: false, timed_out: true, correct_option_id: "b1", bonus_points: 0, awards: session.outcome.awards, finished,
              fun_fact: null, video_url: null, clip_start_s: null, clip_end_s: null },
          };
        }
        throw new Error(`unexpected ${path}`);
      }),
      // The expiry committed on the server, but its response was lost.
      post: vi.fn(async () => { throw new TypeError("Failed to fetch"); }),
    };
    const onFinished = vi.fn();
    render(
      <LocaleProvider>
        <PartnerGuessTheGoalGame gameId="guess-the-goal" api={api as never} onFinished={onFinished} onExit={vi.fn()} />
      </LocaleProvider>,
    );
    fireEvent.click(await screen.findByTestId("ggt-kickoff"));
    fireEvent.click(await screen.findByTestId("ggt-bonus-next"));
    expect(onFinished).toHaveBeenCalledWith({ playId: "play-1", score: 100 });
    expect(api.get).toHaveBeenCalledWith(`sessions/${session.session_id}`);
    expect(api.get.mock.calls.filter(([p]) => p === "current")).toHaveLength(1);
  }, 15_000);
});
