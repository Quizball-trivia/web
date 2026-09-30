import { describe, expect, it } from "vitest";
import { MAX_SPINS_PER_RUN, SAMPLE_STEPS, cashoutValue, createSquadSpinSample, fairPotAfterSpin, resolveSampleAnswer, runPotCap } from "../engines/squadSpin";
import type { SampleSquadSpinCombo } from "../types";

const combo = (i: number, tier: "t3e" | "t3m" = "t3e"): SampleSquadSpinCombo => ({
  id: `c${i}`, tier,
  reels: [{ family: "club", id: "club", key: "club", label_en: "Club", label_ka: "კლუბი", asset_key: null }, { family: "position", id: "MID", key: "MID", label_en: "Midfielder", label_ka: "ნახევარმცველი", asset_key: null }, { family: "country", id: "es", key: "es", label_en: "Spain", label_ka: "ესპანეთი", asset_key: null }],
  answers: [{ id: "p1", name_en: "Andrés Iniesta", name_ka: "ანდრეს ინიესტა", image_url: null }],
  aliases: [{ player_id: "p1", alias: "andres iniesta", locale: "en", policy: "exact" }, { player_id: "p1", alias: "iniesta", locale: "en", policy: "safe_typo" }, { player_id: "p1", alias: "ინიესტა", locale: "ka", policy: "exact" }],
});
const wallet = (coins: number) => { const w = { coins, debit: (a: number) => { if (w.coins < a) return false; w.coins -= a; return true; }, credit: (a: number) => { w.coins += Math.floor(a); } }; return w; };

describe("Squad Spin sample engine (frozen pricing snapshot)", () => {
  it("prices tiers from the priors + skill gap and takes the launch-haircut margin at cash-out", () => {
    expect(SAMPLE_STEPS.t3e).toBe(Math.round((10_000 * 10_000) / 8_000));
    expect(SAMPLE_STEPS.t3m).toBe(Math.round((10_000 * 10_000) / 6_500));
    expect(SAMPLE_STEPS.margin).toBe(8_730);
    expect(runPotCap(100)).toBe(4_000);
    expect(runPotCap(5_000)).toBe(50_000);
    expect(fairPotAfterSpin(100_000, SAMPLE_STEPS.t3e, 100)).toBe(Math.floor((100_000 * SAMPLE_STEPS.t3e) / 10_000));
    expect(cashoutValue(125_000, SAMPLE_STEPS.margin)).toBe(Math.floor((125_000 * 8_730) / 10_000 / 1_000));
  });

  it("resolves answers like live: aliases and name forms in any script, with typo tolerance", () => {
    const c = combo(1);
    expect(resolveSampleAnswer("Andrés Iniesta", c.aliases, c.answers)).toBe("p1");
    expect(resolveSampleAnswer("ინიესტა", c.aliases, c.answers)).toBe("p1");
    expect(resolveSampleAnswer("inesta", c.aliases, c.answers)).toBe("p1"); // one edit
    expect(resolveSampleAnswer("andres inesta", c.aliases, c.answers)).toBe("p1"); // typos count against every form now
    expect(resolveSampleAnswer("xavi", c.aliases, c.answers)).toBeNull();
  });

  it("accepts a typed surname even when the alias release lacks a surname alias", () => {
    const c = combo(1);
    const sparse: SampleSquadSpinCombo = {
      ...c,
      answers: [{ id: "p2", name_en: "Ramiro Funes Mori", name_ka: null, image_url: null }],
      aliases: [{ player_id: "p2", alias: "ramiro funes mori", locale: "en", policy: "exact" }],
    };
    expect(resolveSampleAnswer("funes mori", sparse.aliases, sparse.answers)).toBe("p2");
    expect(resolveSampleAnswer("FUNES MORI", sparse.aliases, sparse.answers)).toBe("p2");
    expect(resolveSampleAnswer("mori", sparse.aliases, sparse.answers)).toBe("p2");
  });

  it("debits at start, decides before the next reveal, banks once on cash-out", async () => {
    const w = wallet(1_000); const settled: unknown[] = [];
    const client = createSquadSpinSample({ combos: [combo(1), combo(2), combo(3)], wallet: w, seed: 5, onSettled: (r) => settled.push(r) });
    let s = await client.start(100, 3, "n");
    expect(w.coins).toBe(900); expect(s.phase).toBe("question"); expect(s.spin?.reels).toHaveLength(3);
    const r = await client.answer(s.round_id, "iniesta", s.state_version);
    expect(r.outcome).toBe("correct"); expect(r.state.phase).toBe("decision"); expect(r.state.spins_cleared).toBe(1);
    s = await client.continue(r.state.round_id, r.state.state_version);
    expect(s.phase).toBe("question"); expect(s.spin?.index).toBe(2);
    const r2 = await client.answer(s.round_id, "iniesta", s.state_version);
    const cashed = await client.cashout(r2.state.round_id, r2.state.state_version);
    expect(cashed.status).toBe("cashed");
    expect(cashed.payout_coins).toBe(cashoutValue(fairPotAfterSpin(fairPotAfterSpin(100_000, SAMPLE_STEPS.t3e, 100), SAMPLE_STEPS.t3e, 100), SAMPLE_STEPS.margin));
    expect(w.coins).toBe(900 + (cashed.payout_coins ?? 0));
    expect(settled).toHaveLength(1);
  });

  it("a wrong or late answer loses the run and reveals an answer; ten correct answers auto-bank", async () => {
    let clock = 5_000_000; const w = wallet(1_000);
    const client = createSquadSpinSample({ combos: [combo(1), combo(2)], wallet: w, seed: 9, now: () => clock });
    let s = await client.start(20, 3, "n");
    clock += 16_000;
    const late = await client.answer(s.round_id, "iniesta", s.state_version);
    expect(late.outcome).toBe("late"); expect(late.state.status).toBe("lost"); expect(late.state.reveal?.answers[0].name_en).toBe("Andrés Iniesta");
    expect(w.coins).toBe(980);
    s = await client.start(5, 3, "n");
    for (let i = 0; i < MAX_SPINS_PER_RUN; i += 1) {
      const r = await client.answer(s.round_id, "andres iniesta", s.state_version);
      if (r.state.status === "cashed") { expect(r.state.spins_cleared).toBeLessThanOrEqual(MAX_SPINS_PER_RUN); s = r.state; break; }
      s = await client.continue(r.state.round_id, r.state.state_version);
    }
    expect(s.status).toBe("cashed");
  });
});
