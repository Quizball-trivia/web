"use client";

import { useEffect, useMemo, useState } from "react";
import { RaceFrame } from "@/features/football-race/RaceRoom";
import { SoloBoard, SoloIntro, SoloResult, toSoloView } from "@/features/football-race/RaceSolo";
import { compare, type RacePack } from "@/features/football-race/race.rules";
import { dailyRace, soloPick, startSolo, type SoloConfig, type SoloState } from "@/features/football-race/race.solo";
import { toWording } from "@/features/football-race/race.views";
import { raceCopy } from "@/features/football-race/race.copy";
import { avatarFor } from "./fixtures/aproximado";
import { inventedRacePack } from "./fixtures/football-race";

/**
 * The daily race on this device on the real rules (race.solo.ts). `script` jumps to an end state for screenshots:
 * "won" (one wrong pick), "perfect" (5 of 5), "lost" (feeding one rival). The real pack is the local private file.
 */
export interface RaceSoloConfig { data: "real" | "invented"; day: string; script: "play" | "won" | "perfect" | "lost" }

const today = () => new Date().toISOString().slice(0, 10);

function scripted(cfg: SoloConfig, script: RaceSoloConfig["script"]): SoloState {
  let s = startSolo(cfg);
  if (script === "play") return s;
  const leaders = (id: string) => { const st = cfg.pack.stats.find((x) => x.id === id)!; return compare(st, cfg.pack.metrics.find((m) => m.id === st.metric)!, cfg.racers)?.leaders ?? []; };
  const mine = cfg.statIds.filter((id) => { const l = leaders(id); return l.length === 1 && l[0] === 0; });
  const rival = [1, 2, 3].map((r) => cfg.statIds.filter((id) => { const l = leaders(id); return l.length === 1 && l[0] === r; })).sort((a, b) => b.length - a.length)[0];
  const plan = script === "perfect" ? mine.slice(0, 5) : script === "won" ? [mine[0], rival[0], ...mine.slice(1, 5)] : [mine[0], rival[0], rival[1], rival[2]];
  for (const id of plan) if (id && !s.result) s = soloPick(s, cfg, id).state;
  return s;
}

export function FootballRaceSoloSim({ config, locale, log }: { config: RaceSoloConfig; locale: string; log: (action: string, ...args: unknown[]) => void }) {
  const [pack, setPack] = useState<RacePack | null>(config.data === "invented" ? inventedRacePack : null);
  useEffect(() => {
    if (config.data === "invented") return;
    let alive = true;
    fetch("/dev-data/football-race.json").then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((p: RacePack) => { if (alive) setPack(p); }).catch(() => { if (alive) setPack(inventedRacePack()); });
    return () => { alive = false; };
  }, [config.data]);
  if (!pack) return <RaceFrame><p className="m-auto text-sm text-white/60">…</p></RaceFrame>;
  return <Daily key={`${pack.version}-${config.day}-${config.script}`} pack={pack} config={config} locale={locale} log={log} />;
}

function Daily({ pack, config, locale, log }: { pack: RacePack; config: RaceSoloConfig; locale: string; log: (action: string, ...args: unknown[]) => void }) {
  const day = config.day === "today" || !config.day ? today() : config.day;
  const race = useMemo(() => dailyRace(pack, day), [pack, day]);
  const wording = useMemo(() => toWording(pack), [pack]);
  const me = useMemo(() => ({ name: raceCopy(locale).you, avatar: avatarFor(0) }), [locale]);
  const [state, setState] = useState<SoloState>(() => scripted(race, config.script));
  const [stage, setStage] = useState<"intro" | "play" | "reveal">(config.script === "play" ? "intro" : "play");
  const tournament = pack.tournaments?.find((t) => t.id === race.tournament)?.label ?? null;
  const view = toSoloView(state, race, race.scopes, tournament, me, stage === "reveal", locale);
  useEffect(() => { log("dailyRace", { day, tournament: race.tournament, racers: race.racers, stats: race.statIds.length }); }, [log, day, race]);
  const pick = (statId: string) => {
    const res = soloPick(state, race, statId);
    log("onPick", statId, res.error ?? res.state.picks.at(-1)?.leaders);
    if (res.error) return;
    setState(res.state); setStage("reveal");
  };
  const share = async (text: string) => { log("onShare", text); try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };
  if (state.result && stage !== "reveal") {
    return <RaceFrame><SoloResult view={view} state={state} wording={wording} locale={locale} avatar={me.avatar} onShare={share} onFriends={() => log("onFriends")} /></RaceFrame>;
  }
  return (
    <RaceFrame wide={stage !== "intro"}>
      {stage === "intro"
        ? <SoloIntro view={view} wording={wording} locale={locale} day={day} onStart={() => { log("onStart"); setStage("play"); }} />
        : <SoloBoard view={view} wording={wording} locale={locale} onPick={pick} onNext={() => setStage("play")} onExit={() => log("onExit")} />}
    </RaceFrame>
  );
}
