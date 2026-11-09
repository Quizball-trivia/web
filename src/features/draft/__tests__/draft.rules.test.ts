import { describe, expect, it } from "vitest";
import { botPick, finish, newDraft, optionsFor, pick, respin, signAcademy, slotsOf, type DraftUniverse } from "../draft.engine";
import {
  BUDGET, FORMATIONS, FREE_RESPINS, RESPIN_COST, SEASON_PACE, coinsFor, destination, inXi, lines, matchDay, matchDayGoals, matchGoals, matchMs, openSlotsFor, pickOrder, pickSeconds, pickable, place, priceOf, spentOn, wallet, playMatch, playSeason, rateSeason, fixtureLuck, fitPenalty, predictSeason, seasonStats,
  type ClubSeason, type DraftPlayer, type Opponent, type Pick,
} from "../draft.rules";
import { LEAGUES, opponents, otherClubOf, otherSeasonOf, spinFrom } from "@/features/playground/fixtures/draft";


const u: DraftUniverse = { leagues: LEAGUES, spin: spinFrom, otherClub: otherClubOf, otherSeason: otherSeasonOf, opponents };
const solo = (seed: string, mode: "daily" | "free" = "daily", coins = 0) =>
  newDraft(u, { mode, variant: "classic", leagueId: "sol", era: "all", formation: "4-3-3", seed, seats: [{ name: "Vos", avatar: null, bot: false }], coins });
const run = (seed: string, skill: number) => { let s = solo(seed); while (s.phase === "picking") s = botPick(u, s, skill); return finish(u, s); };

const player = (id: string, pos: DraftPlayer["pos"], rating: number, alt?: DraftPlayer["pos"][]): DraftPlayer => ({ id, name: `Invented ${id}`, pos, alt, rating, apps: 30, goals: 0, assists: 0, cleanSheets: 0, minutesShare: 0.8 });
const from: ClubSeason = { id: "x", clubId: "x", club: "Atlético Aurora", season: "2011/12", leagueId: "sol", legend: false, finish: 1, players: [] };
const xi = (rating: number): Pick[] => FORMATIONS["4-3-3"].map((slot, i) => ({ slotId: slot.id, player: player(`p${i}`, slot.pos, rating), club: from.club, season: from.season, offPosition: false }));

describe("ratings", () => {
  it("rises with minutes, club finish and output", () => {
    const base = { pos: "FWD" as const, minutesShare: 0.5, apps: 30, goals: 5, assists: 2, cleanSheets: 0, finish: 10, teams: 20 };
    const r = rateSeason(base).total;
    expect(rateSeason({ ...base, minutesShare: 0.95 }).total).toBeGreaterThan(r);
    expect(rateSeason({ ...base, finish: 1 }).total).toBeGreaterThan(r);
    expect(rateSeason({ ...base, goals: 25 }).total).toBeGreaterThan(r);
  });
  it("its parts add up to the rating", () => {
    const w = rateSeason({ pos: "GK", minutesShare: 0.9, apps: 34, goals: 0, assists: 0, cleanSheets: 12, finish: 3, teams: 20 });
    expect(w.base + w.minutes + w.club + w.output).toBe(w.total);
  });
});

describe("placing picks", () => {
  const slots = FORMATIONS["4-3-3"];
  it("prefers natural slots and allows listed alternative positions", () => {
    const empty = Array(11).fill(null);
    expect(openSlotsFor(player("a", "DEF", 80), slots, empty).every((s) => s.pos === "DEF")).toBe(true);
    const defFull = slots.map((s, i) => (s.pos === "DEF" ? xi(70)[i] : null));
    expect(openSlotsFor(player("b", "DEF", 80, ["MID"]), slots, defFull).every((s) => s.pos === "MID")).toBe(true);
    expect(openSlotsFor(player("c", "DEF", 80), slots, defFull)).toHaveLength(0);
  });
  it("hides taken players and players with no open slot", () => {
    const squad = [player("g", "GK", 80), player("d", "DEF", 80)];
    const gkTaken = slots.map((s, i) => (s.pos === "GK" ? xi(70)[i] : null));
    expect(pickable(squad, slots, gkTaken).map((p) => p.id)).toEqual(["d"]);
    expect(pickable(squad, slots, Array(11).fill(null), ["d"]).map((p) => p.id)).toEqual(["g"]);
  });
});

describe("legends", () => {
  it("a legend's bonus is part of the rating and is shown", () => {
    const base = { pos: "MID" as const, minutesShare: 0.7, apps: 28, goals: 5, assists: 4, cleanSheets: 8, finish: 2, teams: 20 };
    const plain = rateSeason(base), great = rateSeason({ ...base, legend: true });
    expect(great.total - plain.total).toBe(5);
    expect(great.base + great.minutes + great.club + great.output + great.legend).toBe(great.total);
  });
});

describe("placing the same person", () => {
  const slots = FORMATIONS["4-3-3"];
  const first = { ...player("a-2010", "DEF", 80), personId: "kim" };
  const again = { ...player("b-2014", "DEF", 85), personId: "kim" };
  it("allows one version of a person per XI, across clubs and seasons", () => {
    const picks = place(Array(11).fill(null), slots, "lb", first, from);
    expect(inXi(again, picks)).toBe(true);
    expect(openSlotsFor(again, slots, picks)).toHaveLength(0);
    expect(pickable([again, player("c", "DEF", 70)], slots, picks).map((p) => p.id)).toEqual(["c"]);
  });
});

describe("where a tap sends a player", () => {
  const slots = FORMATIONS["4-3-3"];
  it("names the first open slot, or the slot the player tapped", () => {
    expect(destination(player("a", "DEF", 80), slots, Array(11).fill(null))?.slot.id).toBe("lb");
    expect(destination(player("a", "DEF", 80), slots, Array(11).fill(null), "rb")?.slot.id).toBe("rb");
  });
  it("shows the rating he will really play at", () => {
    const defFull = slots.map((s, i) => (s.pos === "DEF" ? xi(70)[i] : null));
    const dest = destination(player("b", "DEF", 57, ["MID"]), slots, defFull);
    expect(dest).toMatchObject({ offPosition: true, rating: 53 });
  });
});

describe("a match", () => {
  const level = { gk: 80, def: 80, mid: 80, att: 80 };
  const lucks = Array.from({ length: 200 }, (_, i) => fixtureLuck("m", i));
  const line = ["gk", "def", "mid", "att"] as const;
  it("a better line never makes a result worse", () => {
    for (const luck of lucks) for (const home of [1.5, -1.5]) for (const l of line) {
      const base = playMatch(level, level, luck, home);
      const lifted = playMatch({ ...level, [l]: 86 }, level, luck, home);
      expect(lifted.gf - lifted.ga).toBeGreaterThanOrEqual(base.gf - base.ga);
    }
  });
  it("every line changes results, keeper included", () => {
    for (const l of line) {
      const moved = lucks.some((luck) => { const a = playMatch(level, level, luck, 0), b = playMatch({ ...level, [l]: 92 }, level, luck, 0); return a.gf !== b.gf || a.ga !== b.ga; });
      expect(moved, l).toBe(true);
    }
  });
});

describe("season", () => {
  const opps: Opponent[] = Array.from({ length: 19 }, (_, i) => { const strength = 84 - i * 0.75; return { id: `o${i}`, name: `Invented FC ${i}`, strength, gk: strength, def: strength, mid: strength, att: strength }; });
  const league = LEAGUES[1];
  const slots = FORMATIONS["4-3-3"];
  it("swapping two players between equal slots changes nothing", () => {
    const a = xi(80).map((p, i) => (i === 2 ? { ...p, player: { ...p.player, id: "cb1", rating: 90 } } : i === 3 ? { ...p, player: { ...p.player, id: "cb2", rating: 70 } } : p));
    const b = a.map((p, i) => (i === 2 ? { ...p, player: a[3].player } : i === 3 ? { ...p, player: a[2].player } : p));
    expect(playSeason(slots, b, league, opps, "swap").matches.map((m) => [m.gf, m.ga])).toEqual(playSeason(slots, a, league, opps, "swap").matches.map((m) => [m.gf, m.ga]));
  });
  it("a better keeper never costs points, and a different line mix changes the scorelines", () => {
    for (let k = 0; k < 20; k++) {
      const base = xi(78);
      const better = base.map((p, i) => (i === 0 ? { ...p, player: { ...p.player, id: "new-keeper", rating: 79 } } : p));
      expect(playSeason(slots, better, league, opps, `gk${k}`).points).toBeGreaterThanOrEqual(playSeason(slots, base, league, opps, `gk${k}`).points);
    }
    const lopsided = xi(80).map((p, i) => (i === 0 ? { ...p, player: { ...p.player, rating: 50 } } : p));
    const score = (picks: Pick[]) => playSeason(slots, picks, league, opps, "mix").matches.map((m) => `${m.gf}-${m.ga}`).join();
    expect(score(lopsided)).not.toEqual(score(xi(80)));
  });
  it("every explanation is true: re-playing the lost game with the named line better saves it", () => {
    const season = playSeason(slots, xi(76), league, opps, "why");
    const lost = season.matches.filter((m) => m.gf < m.ga);
    expect(lost.length).toBeGreaterThan(0);
    const team = lines(slots, xi(76));
    for (const m of lost) {
      const luck = fixtureLuck(`why|${league.id}`, m.round);
      const edge = m.home ? 1.5 : -1.5;
      if (m.reason?.kind === "line") {
        const saved = playMatch({ ...team, [m.reason.line]: team[m.reason.line] + 8 }, m.opponent, luck, edge);
        expect(saved.gf).toBeGreaterThanOrEqual(saved.ga);
      } else if (m.reason?.kind === "day") {
        const neutral = playMatch(team, m.opponent, { mine: 0, theirs: 0, swing: 0 }, edge);
        expect(neutral.gf).toBeGreaterThanOrEqual(neutral.ga);
      }
    }
  });
  it("the weak link is measured, and a perfect season blames nobody", () => {
    const picks = xi(84).map((p, i) => (i === 5 ? { ...p, player: { ...p.player, name: "Invented Weak", rating: 52 } } : p));
    const season = playSeason(slots, picks, league, opps, "weak");
    if (season.weak) {
      expect(season.weak.name).toBe("Invented Weak");
      expect(season.weak.pointsLost).toBeGreaterThan(0);
    }
    const weakOpps = opps.map((o) => ({ ...o, gk: 55, def: 55, mid: 55, att: 55, strength: 55 }));
    const perfect = playSeason(slots, xi(97), league, weakOpps, "p");
    expect(perfect.finish).toBe("perfect");
    expect(perfect.weak).toBeNull();
  });
  it("the table is a real league: every result counts for both sides, and rivals' games do not depend on my XI", () => {
    const league = LEAGUES[0];
    const opp = opponents(league.id, "table");
    const slots = FORMATIONS["4-3-3"];
    const a = playSeason(slots, xi(80), league, opp, "table"), b = playSeason(slots, xi(70), league, opp, "table");
    for (const season of [a, b]) {
      expect(season.table).toHaveLength(opp.length + 1);
      const sum = (f: (r: (typeof season.table)[number]) => number) => season.table.reduce((x, r) => x + f(r), 0);
      expect(sum((r) => r.w)).toBe(sum((r) => r.l));
      expect(sum((r) => r.gf)).toBe(sum((r) => r.ga));
      for (const r of season.table) expect(r.p).toBe(season.games);
      expect(season.table[season.position - 1].me).toBe(true);
      expect(season.race).toHaveLength(season.games);
      expect(season.race[season.games - 1].position).toBe(season.position);
    }
    // Take away each rival's games against me: what is left must be the same in both seasons.
    const others = (s: typeof a, id: string) => { const r = s.table.find((x) => x.id === id)!; const mine = s.matches.filter((m) => m.opponent.id === id); return r.gf - mine.reduce((x, m) => x + m.ga, 0); };
    for (const o of opp) expect(others(a, o.id)).toBe(others(b, o.id));
  });

  it("plays every game of the league and is the same for the same XI", () => {
    const a = playSeason(FORMATIONS["4-3-3"], xi(85), league, opps, "s");
    expect(a.w + a.d + a.l).toBe(league.games);
    expect(playSeason(FORMATIONS["4-3-3"], xi(85), league, opps, "s")).toEqual(a);
  });
  it("a stronger XI never finishes with fewer points over many seeds", () => {
    for (let k = 0; k < 20; k++) {
      expect(playSeason(FORMATIONS["4-3-3"], xi(90), league, opps, `k${k}`).points).toBeGreaterThan(playSeason(FORMATIONS["4-3-3"], xi(76), league, opps, `k${k}`).points);
    }
  });
  it("an elite XI wins nearly everything and every loss carries a reason", () => {
    const elite = playSeason(FORMATIONS["4-3-3"], xi(97), league, opps, "e");
    expect(elite.l).toBeLessThanOrEqual(1);
    const mid = playSeason(FORMATIONS["4-3-3"], xi(80), league, opps, "m");
    expect(mid.matches.filter((m) => m.gf < m.ga).every((m) => m.reason)).toBe(true);
  });
  it("picks matter: sharp drafting beats random drafting", () => {
    const sharp = run("calib", 1).seasons![0].points;
    let s = solo("calib");
    while (s.phase === "picking") { const opts = pickable(s.spin.players, slotsOf(s), s.seats[0].picks); s = pick(u, s, opts[opts.length - 1].id); }
    expect(sharp).toBeGreaterThan(finish(u, s).seasons![0].points);
  });
});

describe("the draw", () => {
  const seats = [{ name: "Vos", avatar: null, bot: false }];
  const opts = { mode: "challenge" as const, variant: "classic" as const, leagueId: "sol", era: "all" as const, formation: "4-3-3" as const, seed: "same", seats };
  const spins = (s: ReturnType<typeof newDraft>) => { const out: string[] = []; let x = s; while (x.phase === "picking") { out.push(x.spin.id); x = botPick(u, x, 1); } return out; };
  it("the same seed deals the same eleven spins, whatever is picked or re-spun", () => {
    const a = spins(newDraft(u, opts));
    expect(a).toHaveLength(11);
    let b = newDraft(u, opts);
    const seen: string[] = [];
    while (b.phase === "picking") { seen.push(b.spin.id); const opts2 = pickable(b.spin.players, slotsOf(b), b.seats[0].picks); b = pick(u, b, opts2[opts2.length - 1].id); }
    expect(seen).toEqual(a);
    const c = respin(u, newDraft(u, opts));
    expect(c.spin.id).not.toBe(a[0]);
    expect(c.deal.map((x) => x.id)).toEqual(a);
    expect(new Set([...a, c.spin.id]).size).toBe(12);
  });
  it("a re-spin can change the club or only the season, from the same budget", () => {
    const start = newDraft(u, opts);
    const season = respin(u, start, "season");
    expect(season.spin.clubId).toBe(start.spin.clubId);
    expect(season.spin.season).not.toBe(start.spin.season);
    expect(season.respins).toBe(start.respins - 1);
    const club = respin(u, season, "club");
    expect(club.spin.clubId).not.toBe(start.spin.clubId);
    expect(club.spin.season).toBe(season.spin.season);
    expect(club.respins).toBe(start.respins - 2);
  });
  it("a season re-spin with no other season costs nothing", () => {
    const none: DraftUniverse = { ...u, otherSeason: () => null };
    const s = newDraft(none, opts);
    const after = respin(none, s, "season");
    expect(after.respins).toBe(s.respins);
    expect(after.notice).toBe("no_other_season");
  });
  it("the reveal compares a pick with the best on offer for that line", () => {
    const squad: ClubSeason = { ...from, id: "lines", players: [player("fwd", "FWD", 95), player("mid1", "MID", 70), player("mid2", "MID", 80)] };
    const lineU: DraftUniverse = { ...u, spin: () => squad };
    let s = newDraft(lineU, { ...opts, seed: "lines" });
    s = pick(lineU, s, "mid1");
    const signed = s.seats[0].picks.find((p) => p?.player.id === "mid1");
    expect(signed?.best).toEqual({ name: "Invented mid2", rating: 80 });
  });
  it("a club re-spin with nothing left in the era costs nothing", () => {
    const none: DraftUniverse = { ...u, otherClub: () => null };
    const s = newDraft(none, opts);
    const after = respin(none, s, "club");
    expect(after.respins).toBe(s.respins);
    expect(after.spin.id).toBe(s.spin.id);
  });
  it("a friend gets as many re-spins as the challenger used", () => {
    let s = newDraft(u, { ...opts, respins: 4 });
    for (let i = 0; i < 4; i++) s = respin(u, s);
    expect(s.respinsUsed).toBe(4);
    expect(s.respins).toBe(0);
  });
  it("a challenge has the free re-spins but never charges coins and pays none", () => {
    let s = newDraft(u, { ...opts, coins: 100 });
    for (let i = 0; i < FREE_RESPINS; i++) s = respin(u, s);
    expect(respin(u, s)).toBe(s);
    while (s.phase === "picking") s = botPick(u, s, 1);
    expect(finish(u, s).coinsEarned).toBe(0);
  });
});

describe("re-spins and coins", () => {
  it("gives the free re-spins, then charges coins only in free play", () => {
    let d = solo("r");
    for (let i = 0; i < FREE_RESPINS; i++) d = respin(u, d);
    expect(d.respins).toBe(0);
    expect(respin(u, d)).toBe(d);
    let f = solo("r", "free", RESPIN_COST + 5);
    for (let i = 0; i < FREE_RESPINS; i++) f = respin(u, f);
    f = respin(u, f);
    expect(f.coins).toBe(5);
    expect(respin(u, f).notice).toBe("no_coins");
  });
  it("never repeats a club in one draft", () => {
    let s = solo("clubs");
    while (s.phase === "picking") s = botPick(u, s, 0.8);
    expect(new Set(s.usedClubs).size).toBe(s.usedClubs.length);
  });
  it("pays more in Ball Knowledge and nothing for a poor season", () => {
    const season = playSeason(FORMATIONS["4-3-3"], xi(90), LEAGUES[1], opponents("sol", "c"), "c");
    expect(coinsFor(season, "knowledge")).toBeGreaterThanOrEqual(coinsFor(season, "classic"));
    expect(coinsFor({ ...season, w: 10, finish: "mid" }, "classic")).toBe(0);
  });
});

describe("shared drafts", () => {
  const seats = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `s${i}`, avatar: null, bot: true }));
  const fewKeepers: DraftUniverse = {
    ...u,
    spin: (l, e, seed, used) => { const c = spinFrom(l, e, seed, used); const keepers = c.players.filter((p) => p.pos === "GK").slice(0, 1); return { ...c, players: [...keepers, ...c.players.filter((p) => p.pos !== "GK")] }; },
  };
  it("a seat nobody fits gets an academy kid and the turn moves on, in rooms of every size", () => {
    for (const n of [2, 3, 6]) for (let k = 0; k < 15; k++) {
      let s = newDraft(fewKeepers, { mode: n === 2 ? "duel" : "room", variant: "classic", leagueId: "sol", era: "all", formation: "4-3-3", seed: `crash-${n}-${k}`, seats: seats(n) });
      let guard = 0;
      while (s.phase === "picking" && guard++ < 200) s = botPick(fewKeepers, s, 1);
      expect(s.phase).toBe("ready");
      for (const seat of s.seats) expect(seat.picks.filter(Boolean)).toHaveLength(11);
    }
  });
  it("has no re-spins, whatever the mode's free count says", () => {
    const s = newDraft(u, { mode: "duel", variant: "classic", leagueId: "sol", era: "all", formation: "4-3-3", seed: "nr", seats: seats(2) });
    expect(respin(u, s)).toBe(s);
  });
  it("big rooms pick faster", () => {
    expect(pickSeconds(2)).toBe(15);
    expect(pickSeconds(3)).toBe(15);
    expect(pickSeconds(4)).toBe(10);
    expect(pickSeconds(6)).toBe(10);
  });
  it("everyone in a room plays the same fixtures: a better XI cannot finish below a worse one", () => {
    const opps = opponents("sol", "r");
    const strong = playSeason(FORMATIONS["4-3-3"], xi(84), LEAGUES[1], opps, "room");
    const weak = playSeason(FORMATIONS["4-3-3"], xi(80), LEAGUES[1], opps, "room");
    expect(strong.points).toBeGreaterThanOrEqual(weak.points);
  });
});

describe("duel", () => {
  it("first choice goes round the table evenly", () => {
    expect(pickOrder(0, 2)).toEqual([0, 1]);
    expect(pickOrder(1, 2)).toEqual([1, 0]);
    expect(pickOrder(1, 4)).toEqual([1, 2, 3, 0]);
    for (const n of [2, 3, 4, 5, 6]) {
      const firsts = Array.from({ length: n * 2 }, (_, r) => pickOrder(r, n)[0]);
      for (let seat = 0; seat < n; seat++) expect(firsts.filter((f) => f === seat)).toHaveLength(2);
    }
  });
  it("who starts is drawn per game, across all seats", () => {
    const seats = [0, 1, 2, 3].map((i) => ({ name: `s${i}`, avatar: null, bot: true }));
    const starts = new Set(Array.from({ length: 60 }, (_, k) => newDraft(u, { mode: "room", variant: "classic", leagueId: "sol", era: "all", formation: "4-3-3", seed: `start${k}`, seats }).firstSeat));
    expect(starts.size).toBe(4);
  });
  it("two equal teams have an even match day", () => {
    const same = lines(FORMATIONS["4-3-3"], xi(80));
    let a = 0;
    const n = 4000;
    for (let k = 0; k < n; k++) if (matchDay(same, same, `even${k}`).winner === 0) a++;
    expect(a / n).toBeGreaterThan(0.46);
    expect(a / n).toBeLessThan(0.54);
  });
  it("a player taken by one seat is gone for the other in that round", () => {
    let s = newDraft(u, { mode: "duel", variant: "classic", leagueId: "sol", era: "all", formation: "4-3-3", seed: "d", seats: [{ name: "A", avatar: null, bot: false }, { name: "B", avatar: null, bot: true }] });
    const first = s.spin.players[0].id;
    s = pick(u, s, first);
    expect(pick(u, s, first)).toBe(s);
  });
  it("match day: the better side wins, and in a shootout the better keeper has an edge, not a certainty", () => {
    const strong = lines(FORMATIONS["4-3-3"], xi(92)), weak = lines(FORMATIONS["4-3-3"], xi(72));
    expect(matchDay(strong, weak, "m").winner).toBe(0);
    const same = lines(FORMATIONS["4-3-3"], xi(80));
    let pens = 0, keeperWon = 0;
    const scores = new Set<string>();
    for (let k = 0; k < 400; k++) {
      const md = matchDay(same, { ...same, gk: same.gk + 8 }, `p${k}`);
      if (!md.penalties) continue;
      pens++;
      scores.add(md.penalties.join("-"));
      expect(md.penalties[0]).not.toBe(md.penalties[1]);
      if (md.winner === 1) keeperWon++;
    }
    expect(pens).toBeGreaterThan(30);
    expect(keeperWon / pens).toBeGreaterThan(0.5);
    expect(keeperWon).toBeLessThan(pens);
    expect(scores.size).toBeGreaterThan(2);
  });
});

describe("the season on screen", () => {
  const slots = FORMATIONS["4-3-3"];
  const season = (seed: string) => playSeason(slots, xi(80), LEAGUES[0], opponents(LEAGUES[0].id, seed), seed);

  it("plays every rival home and away, without long home or away runs", () => {
    const s = season("calendar");
    const half = s.matches.length / 2;
    for (const m of s.matches.slice(0, half)) {
      const back = s.matches.filter((x) => x.opponent.name === m.opponent.name);
      expect(back).toHaveLength(2);
      expect(back[0].home).not.toBe(back[1].home);
    }
    expect(s.matches.filter((m) => m.home)).toHaveLength(half);
    const longest = s.matches.reduce((a, m, i) => { const run = i && s.matches[i - 1].home === m.home ? a.run + 1 : 1; return { run, max: Math.max(a.max, run) }; }, { run: 0, max: 0 }).max;
    expect(longest).toBeLessThanOrEqual(2);
  });

  it("the goals shown add up to the score, in time order, and the keeper never scores", () => {
    const picks = xi(80);
    for (const m of season("goals").matches) {
      const g = matchGoals("goals", m, slots, picks);
      expect(g.filter((x) => x.mine)).toHaveLength(m.gf);
      expect(g.filter((x) => !x.mine)).toHaveLength(m.ga);
      expect(g.map((x) => x.minute)).toEqual(g.map((x) => x.minute).slice().sort((a, b) => a - b));
      expect(new Set(g.map((x) => x.minute)).size).toBe(g.length);
      expect(g.every((x) => x.minute >= 1 && x.minute <= 90)).toBe(true);
      expect(g.filter((x) => x.mine).every((x) => x.slotId && x.slotId !== "gk" && slots.find((s) => s.id === x.slotId)?.pos !== "GK")).toBe(true);
      expect(matchGoals("goals", m, slots, picks)).toEqual(g);
    }
  });

  it("a player with more goals scores more often", () => {
    const picks = xi(80);
    const nine = slots.findIndex((s) => s.pos === "FWD");
    picks[nine] = { ...picks[nine], player: { ...picks[nine].player, goals: 30 } };
    const count: Record<string, number> = {};
    for (let round = 1; round <= 400; round++) for (const g of matchGoals("scorers", { round, gf: 3, ga: 0 }, slots, picks)) count[g.slotId!] = (count[g.slotId!] ?? 0) + 1;
    expect(count[slots[nine].id]).toBeGreaterThan(Math.max(...slots.filter((_, i) => i !== nine).map((s) => count[s.id] ?? 0)));
  });

  it("drawing goals does not change the season", () => {
    const before = season("stable");
    before.matches.forEach((m) => matchGoals("stable", m, slots, xi(80)));
    expect(season("stable")).toEqual(before);
  });

  it("a season takes about as long as watching 38 matches, longer only on a late perfect run", () => {
    const total = (s: { games: number; matches: { gf: number; ga: number }[] }) => s.matches.reduce((a, _, i) => a + matchMs(s as never, i), 0);
    const base = season("pace");
    const lost = { ...base, games: 38, matches: Array.from({ length: 38 }, (_, i) => ({ ...base.matches[0], round: i + 1, gf: 0, ga: 1 })) };
    const won = { ...lost, matches: lost.matches.map((m) => ({ ...m, gf: 2, ga: 0 })) };
    expect(total(lost)).toBe(38 * SEASON_PACE.match);
    expect(total(won)).toBe(30 * SEASON_PACE.match + 8 * SEASON_PACE.tense);
    expect(total(won)).toBeLessThan(45_000);
  });
});

describe("transfer budget", () => {
  const budget = (seed: string) => newDraft(u, { mode: "daily", variant: "budget", leagueId: "sol", era: "all", formation: "4-3-3", seed, seats: [{ name: "Vos", avatar: null, bot: false }] });
  const bought = (picks: (Pick | null)[]) => picks.filter((p) => p && !p.academy);

  it("prices climb with the rating, stay the same for a player, and are never free", () => {
    expect(priceOf(player("a", "FWD", 90))).toBeGreaterThan(priceOf(player("a", "FWD", 80)));
    expect(priceOf(player("a", "FWD", 80))).toBeGreaterThan(priceOf(player("a", "FWD", 70)));
    expect(priceOf(player("a", "FWD", 80))).toBe(priceOf(player("a", "FWD", 80)));
    expect(priceOf(player("a", "FWD", 40))).toBeGreaterThanOrEqual(1);
  });

  it("refuses a signing it cannot afford and leaves the draft unchanged", () => {
    let s = budget("poor");
    const spend = slotsOf(s).slice(0, 10).map((slot) => ({ slotId: slot.id, player: player(`p${slot.id}`, slot.pos, 80), club: "x", season: "y", offPosition: false, price: 29 }));
    s = { ...s, seats: s.seats.map((seat) => ({ ...seat, picks: seat.picks.map((_, i) => spend[i] ?? null) })) };
    expect(wallet(s.seats[0].picks).left).toBe(BUDGET.total - 290);
    const dear = { ...player("star", "FWD", 95) };
    const shop = { ...s, spin: { ...s.spin, players: [dear] } };
    expect(pick(u, shop, "star")).toBe(shop);
  });

  it("every draft ends with eleven places filled, never overspends, and charges the price paid", () => {
    for (let i = 0; i < 40; i++) {
      let s = budget(`full-${i}`);
      for (let g = 0; g < 80 && s.phase === "picking"; g++) {
        const options = optionsFor(s, 0);
        s = options.length ? pick(u, s, options.slice().sort((a, b) => b.rating - a.rating)[0].id) : botPick(u, s, 1);
      }
      expect(s.phase).toBe("ready");
      expect(s.seats[0].picks.every(Boolean)).toBe(true);
      expect(spentOn(s.seats[0].picks)).toBeLessThanOrEqual(BUDGET.total);
      for (const p of bought(s.seats[0].picks)) expect(p!.price).toBe(priceOf(p!.player));
    }
  });

  it("buying only the highest rating you can afford loses to spending evenly", () => {
    const total = { top: 0, even: 0 };
    for (let i = 0; i < 60; i++) {
      for (const how of ["top", "even"] as const) {
        let s = budget(`plan-${i}`);
        for (let g = 0; g < 80 && s.phase === "picking"; g++) {
          const options = optionsFor(s, 0).slice().sort((a, b) => b.rating - a.rating);
          if (!options.length) { s = botPick(u, s, 1); continue; }
          const w = wallet(s.seats[0].picks);
          const share = options.find((p) => priceOf(p) <= w.left / w.open) ?? options[options.length - 1];
          s = pick(u, s, how === "top" ? options[0].id : share.id);
        }
        total[how] += finish(u, s).seasons![0].points;
      }
    }
    expect(total.even).toBeGreaterThan(total.top);
  });

  it("the classic game has no prices and no limit", () => {
    let s = solo("no-budget");
    for (let g = 0; g < 80 && s.phase === "picking"; g++) s = botPick(u, s, 1);
    expect(s.seats[0].picks.every((p) => p?.price === undefined)).toBe(true);
  });
});

describe("team against team", () => {
  const slots = FORMATIONS["4-3-3"];
  const team = (r: number) => lines(slots, xi(r));

  it("the total is the two legs added up, penalties only when it is level, and the same pairing is always the same tie", () => {
    for (let i = 0; i < 400; i++) {
      const seed = `vs-${i}`;
      const m = matchDay(team(82), team(78), seed);
      expect(m.goals).toEqual([m.legs[0][0] + m.legs[1][0], m.legs[0][1] + m.legs[1][1]]);
      expect(m.penalties !== null).toBe(m.goals[0] === m.goals[1]);
      if (m.penalties) expect(m.winner === 0).toBe(m.penalties[0] > m.penalties[1]);
      else expect(m.winner === 0).toBe(m.goals[0] > m.goals[1]);
      expect(matchDay(team(82), team(78), seed)).toEqual(m);
    }
  });

  it("the goals shown add up to each leg's score", () => {
    for (let i = 0; i < 200; i++) {
      const seed = `shown-${i}`;
      const m = matchDay(team(82), team(78), seed);
      m.legs.forEach((score, leg) => {
        const g = matchDayGoals(`${seed}|${leg}`, score, slots, xi(82), xi(78));
        expect(g.filter((x) => x.side === 0)).toHaveLength(score[0]);
        expect(g.filter((x) => x.side === 1)).toHaveLength(score[1]);
        expect(new Set(g.map((x) => x.minute)).size).toBe(g.length);
      });
    }
  });

  it("a better team never scores fewer or concedes more on the same luck", () => {
    for (let i = 0; i < 2000; i++) {
      const seed = `up-${i}`;
      const low = matchDay(team(78), team(80), seed), high = matchDay(team(84), team(80), seed);
      for (const leg of [0, 1] as const) {
        expect(high.legs[leg][0]).toBeGreaterThanOrEqual(low.legs[leg][0]);
        expect(high.legs[leg][1]).toBeLessThanOrEqual(low.legs[leg][1]);
      }
    }
  });

  it("equal teams split evenly, whoever is at home first", () => {
    const wins = Array.from({ length: 6000 }, (_, i) => matchDay(team(80), team(80), `even-tie-${i}`).winner === 0).filter(Boolean).length;
    expect(Math.abs(wins - 3000)).toBeLessThan(200);
  });

  it("the stronger team usually wins, upsets still happen, and penalties are the exception", () => {
    const run = (a: number, b: number) => {
      const all = Array.from({ length: 4000 }, (_, i) => matchDay(team(a), team(b), `gap-${a}-${b}-${i}`));
      return { win: all.filter((m) => m.winner === 0).length / all.length, pens: all.filter((m) => m.penalties).length / all.length };
    };
    const close = run(81, 79), clear = run(86, 80);
    expect(close.win).toBeGreaterThan(0.55);
    expect(close.win).toBeLessThan(0.8);
    expect(clear.win).toBeGreaterThan(0.75);
    expect(clear.win).toBeLessThan(0.97);
    expect(close.pens).toBeLessThan(0.2);
  });
});

describe("real positions", () => {
  const slots = FORMATIONS["4-3-3"];
  const slot = (id: string) => slots.find((x) => x.id === id)!;
  const withRole = (pos: DraftPlayer["pos"], role: NonNullable<DraftPlayer["role"]>) => ({ ...player("r", pos, 80), role });

  it("a player is natural in his own place, loses a little next to it, more far from it", () => {
    expect(fitPenalty(withRole("DEF", "RB"), slot("rb"))).toBe(0);
    expect(fitPenalty(withRole("DEF", "RB"), slot("lcb"))).toBe(2);
    expect(fitPenalty(withRole("DEF", "RB"), slot("lb"))).toBe(2);
    expect(fitPenalty(withRole("FWD", "LW"), slot("lw"))).toBe(0);
    expect(fitPenalty(withRole("MID", "LM"), slot("lw"))).toBe(0);
    expect(fitPenalty(withRole("FWD", "CF"), slot("lw"))).toBe(2);
    expect(fitPenalty(withRole("FWD", "CF"), slot("lb"))).toBe(null);
    expect(fitPenalty(withRole("GK", "GK"), slot("lb"))).toBe(null);
  });

  it("a real wing-back fits the wing-back place", () => {
    const wing = FORMATIONS["3-5-2"].find((x) => x.label === "RWB")!;
    expect(fitPenalty(withRole("DEF", "RB"), wing)).toBe(0);
    expect(fitPenalty(withRole("MID", "RM"), wing)).toBe(0);
  });

  it("the place changes the rating he plays at, and so the team", () => {
    const empty = Array(11).fill(null);
    const p = withRole("DEF", "RB");
    expect(destination(p, slots, empty)?.slot.id).toBe("rb");
    expect(destination(p, slots, empty, "lcb")).toMatchObject({ penalty: 2, rating: 78 });
    const inPlace = place(empty, slots, "rb", p, from), outOfPlace = place(empty, slots, "lcb", p, from);
    expect(lines(slots, inPlace).def).toBeGreaterThan(lines(slots, outOfPlace).def);
  });

  it("a squad without position detail stays natural anywhere in its line", () => {
    expect(fitPenalty(player("x", "DEF", 80), slot("lb"))).toBe(0);
    expect(fitPenalty(player("x", "DEF", 80), slot("rcb"))).toBe(0);
  });
});

describe("missing data", () => {
  it("unknown assists are not treated as none", () => {
    const base = { pos: "MID" as const, minutesShare: 0.9, apps: 34, goals: 10, cleanSheets: 0, finish: 1, teams: 20 };
    expect(rateSeason({ ...base, assists: null }).total).toBeGreaterThan(rateSeason({ ...base, assists: 0 }).total);
  });
});

describe("the academy is the player's choice", () => {
  const budget = (seed: string) => newDraft(u, { mode: "daily", variant: "budget", leagueId: "sol", era: "all", formation: "4-3-3", seed, seats: [{ name: "Vos", avatar: null, bot: false }] });
  it("a free kid goes into the place chosen, costs nothing and leaves the money", () => {
    const s = budget("kid");
    const next = signAcademy(u, s, "lb");
    const i = slotsOf(s).findIndex((x) => x.id === "lb");
    expect(next.seats[0].picks[i]?.academy).toBe(true);
    expect(wallet(next.seats[0].picks).left).toBe(BUDGET.total);
    expect(next.round).toBe(s.round + 1);
  });
  it("cannot go into a filled place, and does not exist outside the budget game", () => {
    const s = signAcademy(u, budget("kid2"), "lb");
    expect(signAcademy(u, s, "lb")).toBe(s);
    const classic = solo("kid3");
    expect(signAcademy(u, classic, "lb")).toBe(classic);
  });
  it("all the money can be spent: no hidden reserve", () => {
    const s = budget("all-in");
    const dear = { ...player("all", "FWD", 70) };
    const price = priceOf(dear);
    const spend = slotsOf(s).slice(0, 10).map((slot, i) => ({ slotId: slot.id, player: player(`q${i}`, slot.pos, 60), club: "x", season: "y", offPosition: false, price: i === 0 ? BUDGET.total - price : 0 }));
    const shop = { ...s, seats: s.seats.map((seat) => ({ ...seat, picks: seat.picks.map((_, i) => spend[i] ?? null) })), spin: { ...s.spin, players: [dear] } };
    expect(optionsFor(shop, 0).map((p) => p.id)).toContain("all");
  });
  it("stuck for money: the draft waits for the player's choice instead of choosing for him", () => {
    const s = budget("broke");
    const spend = slotsOf(s).slice(0, 5).map((slot, i) => ({ slotId: slot.id, player: player(`z${i}`, slot.pos, 60), club: "x", season: "y", offPosition: false, price: 60 }));
    const broke = { ...s, seats: s.seats.map((seat) => ({ ...seat, picks: seat.picks.map((_, i) => spend[i] ?? null) })) };
    expect(wallet(broke.seats[0].picks).left).toBe(0);
    const shop = { ...broke, spin: { ...broke.spin, players: [player("star", "FWD", 90)] } };
    expect(optionsFor(shop, 0)).toHaveLength(0);
    expect(shop.seats[0].picks.filter(Boolean)).toHaveLength(5);
  });
});

describe("forecast and awards", () => {
  const slots = FORMATIONS["4-3-3"];
  const league = LEAGUES[0];
  it("a better XI is forecast higher, the same XI gets the same forecast, and it does not change the season", () => {
    const opp = opponents(league.id, "f");
    const before = playSeason(slots, xi(82), league, opp, "f");
    const strong = predictSeason(slots, xi(88), league, opp, "f"), weak = predictSeason(slots, xi(68), league, opp, "f");
    expect(strong.points).toBeGreaterThan(weak.points);
    expect(strong.position).toBeLessThan(weak.position);
    expect(strong.titlePct).toBeGreaterThanOrEqual(weak.titlePct);
    expect(predictSeason(slots, xi(88), league, opp, "f")).toEqual(strong);
    expect(playSeason(slots, xi(82), league, opp, "f")).toEqual(before);
  });
  it("the season's goals add up to the record, and the awards go to the leaders", () => {
    const opp = opponents(league.id, "aw");
    const picks = xi(84);
    const season = playSeason(slots, picks, league, opp, "aw");
    const stats = seasonStats("aw", season, slots, picks);
    expect(stats.players.reduce((a, p) => a + p.goals, 0)).toBe(season.gf);
    expect(stats.players.find((p) => p.slotId === "gk")?.goals).toBe(0);
    expect(stats.players.every((p) => p.goals <= stats.topScorer!.goals)).toBe(true);
    expect(stats.cleanSheets).toBe(season.matches.filter((m) => m.ga === 0).length);
    for (const m of season.matches) for (const g of matchGoals("aw", m, slots, picks)) expect(g.assistSlotId).not.toBe(g.slotId ?? "none");
  });
});
