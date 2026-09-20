import { describe, expect, it } from "vitest";
import { MARGIN_BP, MAX_SAFE_PICKS, cashoutValue, createTriviaMinesSample, fairPotAfterPick, fairStepBp } from "../engines/triviaMines";
import type { SampleQuestion } from "../types";

const q = (i: number): SampleQuestion => ({ id: `q${i}`, difficulty: "easy", category: { en: "c", ka: "c", es: "c", tr: "c" }, prompt: { en: `p${i}`, ka: "", es: "", tr: "" }, options: [0, 1, 2, 3].map((o) => ({ id: `o${o}`, text: { en: `${o}`, ka: "", es: "", tr: "" } })), correctOptionId: "o1" });
const wallet = (coins: number) => { const w = { coins, debit: (a: number) => { if (w.coins < a) return false; w.coins -= a; return true; }, credit: (a: number) => { w.coins += Math.floor(a); } }; return w; };

describe("Trivia Mines sample engine (live rules)", () => {
  it("prices a pick like the backend: fair step unknown/(unknown−hidden) in bp, milli-coin pots, 97% at cash-out", () => {
    expect(fairStepBp(25, 4)).toBe(Math.round((10_000 * 25) / 21));
    const afterOne = fairPotAfterPick(100 * 1_000, 25, 4);
    expect(afterOne).toBe(Math.floor((100_000 * 11_905) / 10_000));
    expect(cashoutValue(afterOne)).toBe(Math.floor((afterOne * MARGIN_BP) / 10_000 / 1_000));
    // scouting lowers the step: 24 unknown with 3 hidden
    expect(fairStepBp(24, 3)).toBeLessThan(fairStepBp(25, 4));
  });

  it("debits the stake at start, banks once at cash-out, and never pays on a bust", async () => {
    const w = wallet(1_000); const settled: unknown[] = [];
    const client = createTriviaMinesSample({ questions: [q(1), q(2), q(3)], wallet: w, seed: 42, onSettled: (r) => settled.push(r) });
    const s = await client.start(100, "n");
    expect(w.coins).toBe(900);
    const defenders = new Set<number>();
    // find a safe tile by trying tiles until the engine reports one (deterministic seed)
    let state = s; let picked = 0;
    for (let tile = 0; tile < 25 && picked < 1; tile += 1) {
      const r = await client.pick(state.round_id, tile, state.state_version);
      state = r.state;
      if (!r.safe) { defenders.add(tile); expect(state.status).toBe("lost"); expect(w.coins).toBe(900); expect(settled).toEqual([{ stake: 100, payout: 0, status: "lost" }]); return; }
      picked += 1;
    }
    expect(state.pot_coins).toBe(cashoutValue(fairPotAfterPick(100_000, 25, 4)));
    const cashed = await client.cashout(state.round_id, state.state_version);
    expect(cashed.status).toBe("cashed");
    expect(w.coins).toBe(900 + (cashed.payout_coins ?? 0));
    expect(settled).toEqual([{ stake: 100, payout: cashed.payout_coins, status: "cashed" }]);
    expect(await client.current()).toBeNull();
    expect((await client.latest())?.round_id).toBe(cashed.round_id);
  });

  it("a wrong or late scout burns a scout without ending the run; a correct one flags a defender and leaves the pot alone", async () => {
    let clock = 1_000_000; const w = wallet(1_000);
    const client = createTriviaMinesSample({ questions: [q(1), q(2), q(3)], wallet: w, seed: 7, now: () => clock });
    let s = await client.start(50, "n");
    s = await client.deal(s.round_id, s.state_version);
    expect(s.phase).toBe("question");
    const potBefore = s.pot_coins;
    const wrong = await client.answer(s.round_id, s.question!.question_id, "o0", s.state_version);
    expect(wrong.outcome).toBe("wrong"); expect(wrong.state.scouts_left).toBe(2); expect(wrong.state.status).toBe("active");
    s = await client.deal(wrong.state.round_id, wrong.state.state_version);
    const right = await client.answer(s.round_id, s.question!.question_id, "o1", s.state_version);
    expect(right.outcome).toBe("correct"); expect(right.flagged_tile).not.toBeNull(); expect(right.state.flagged).toHaveLength(1); expect(right.state.pot_coins).toBe(potBefore);
    s = await client.deal(right.state.round_id, right.state.state_version);
    clock += 13_000; // past the 12 s window
    const late = await client.answer(s.round_id, s.question!.question_id, "o1", s.state_version);
    expect(late.outcome).toBe("late"); expect(late.state.scouts_left).toBe(0);
    await expect(client.deal(late.state.round_id, late.state.state_version)).rejects.toMatchObject({ status: 409 });
  });

  it("auto-banks after every safe tile is open", async () => {
    // First pass learns the board: the reveal lists the defenders once the round settles, and the same seed deals the same board again.
    const learn = createTriviaMinesSample({ questions: [q(1)], wallet: wallet(1_000), seed: 3 });
    let s = await learn.start(10, "n");
    for (let tile = 0; tile < 25 && s.status === "active"; tile += 1) {
      const r = await learn.pick(s.round_id, tile, s.state_version).catch(() => null);
      if (r) s = r.state;
    }
    expect(s.status).toBe("lost");
    const defenders = new Set(s.reveal!.defenders);
    expect(defenders.size).toBe(4);

    const client = createTriviaMinesSample({ questions: [q(1)], wallet: wallet(1_000), seed: 3 });
    s = await client.start(10, "n");
    let safe = 0;
    for (let tile = 0; tile < 25 && s.status === "active"; tile += 1) {
      if (defenders.has(tile)) continue;
      const r = await client.pick(s.round_id, tile, s.state_version);
      expect(r.safe).toBe(true);
      s = r.state; safe += 1;
    }
    expect(safe).toBe(MAX_SAFE_PICKS);
    expect(s.status).toBe("cashed");
    expect(s.payout_coins).toBeGreaterThan(10);
  });
});
