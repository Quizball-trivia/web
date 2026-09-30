"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { SOUND_FILES } from "@/lib/sounds/gameSounds";
import { PreviewPlayer } from "@/lib/sounds/lab/previewPlayer";
import type { Locale } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { GAMES } from "./registry";
import { SOUND_EVENTS } from "./sounds";
import { isPlaygroundMessage, PLAYGROUND, type FromPreview } from "./protocol";
import type { GameId, PlayMode } from "./types";

const LOCALES: Locale[] = ["es", "en", "ka", "tr"];
const DEVICES = { phone: { w: 390, h: 844, label: "Phone 390×844" }, tablet: { w: 768, h: 1024, label: "Tablet 768" }, desktop: { w: 1280, h: 800, label: "Desktop 1280" } } as const;
type Device = keyof typeof DEVICES;
type Tab = "state" | "actions" | "sounds";

interface LogLine { at: string; text: string }

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

/**
 * The games dev playground: every screen of every solo + duel game, rendered by the games' own components (in an iframe at the
 * device's real viewport), with live-editable state, a log of what each button would do, and the sounds each moment plays.
 */
export function GamesPlayground() {
  const [gameId, setGameId] = useState<GameId>("ultimo");
  const [mode, setMode] = useState<PlayMode>("solo");
  const game = GAMES.find((g) => g.id === gameId) ?? GAMES[0];
  const scenarios = useMemo(() => game.scenarios[mode] ?? [], [game, mode]);
  const [scenarioId, setScenarioId] = useState<string>(scenarios[0]?.id ?? "");
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
  const [locale, setLocale] = useState<Locale>("es");
  const [device, setDevice] = useState<Device>("phone");
  const [tab, setTab] = useState<Tab>("state");
  // Edits are kept per scenario (switching screens and back keeps them); Reset drops them.
  const scenarioKey = `${game.id}/${mode}/${scenario?.id ?? ""}`;
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [resets, setResets] = useState(0);
  const data = scenarioKey in overrides ? overrides[scenarioKey] : scenario?.data;
  const draft = drafts[scenarioKey] ?? pretty(data);
  const draftError = errors[scenarioKey] ?? null;
  const setDraft = (text: string) => setDrafts((d) => ({ ...d, [scenarioKey]: text }));
  const [log, setLog] = useState<LogLine[]>([]);
  const renderKey = `${scenarioKey}#${resets}`;
  /** Bumps on every "ready" from the preview (a reload included), which re-sends the current screen. */
  const [previewReady, setPreviewReady] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const player = useMemo(() => (typeof window === "undefined" ? null : new PreviewPlayer()), []);
  const [playing, setPlaying] = useState<string | null>(null);

  const send = useCallback(() => {
    if (!scenario || previewReady === 0) return;
    frame.current?.contentWindow?.postMessage(
      { source: PLAYGROUND, type: "render", game: game.id, mode, scenario: scenario.id, data, locale, key: renderKey },
      window.location.origin,
    );
  }, [scenario, previewReady, game.id, mode, data, locale, renderKey]);
  useEffect(() => { send(); }, [send]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isPlaygroundMessage(event)) return;
      const message = event.data as FromPreview;
      if (message.type === "ready") setPreviewReady((n) => n + 1);
      if (message.type === "action") setLog((l) => [{ at: new Date().toLocaleTimeString(), text: `${message.action}(${message.args.map((a) => JSON.stringify(a)).join(", ")})` }, ...l].slice(0, 50));
      if (message.type === "error") setLog((l) => [{ at: new Date().toLocaleTimeString(), text: `render error: ${message.message}` }, ...l].slice(0, 50));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // The device keeps its real size; it is only scaled down to fit the stage.
  const { w, h } = DEVICES[device];
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, (el.clientWidth - 32) / w, (el.clientHeight - 32) / h));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [w, h]);

  const apply = () => {
    try {
      const parsed: unknown = JSON.parse(draft);
      // A screen's state is always an object shaped like its fixture: anything else is refused, the last valid state stays.
      const expected = scenario?.data as Record<string, unknown> | undefined;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("The state must be a JSON object");
      const missing = expected ? Object.keys(expected).filter((k) => !(k in parsed)) : [];
      if (missing.length) throw new Error(`Missing field(s): ${missing.join(", ")}`);
      setOverrides((o) => ({ ...o, [scenarioKey]: parsed }));
      setErrors((e) => ({ ...e, [scenarioKey]: null }));
    } catch (error) {
      setErrors((e) => ({ ...e, [scenarioKey]: (error as Error).message }));
    }
  };
  const reset = () => {
    const drop = <T,>(record: Record<string, T>) => Object.fromEntries(Object.entries(record).filter(([k]) => k !== scenarioKey)) as Record<string, T>;
    setOverrides(drop);
    setDrafts(drop);
    setErrors(drop);
    setResets((n) => n + 1);
  };
  const audition = async (name: string) => {
    if (!player) return;
    if (playing === name) { player.stop(); setPlaying(null); return; }
    setPlaying(name);
    await player.play(SOUND_FILES[name as keyof typeof SOUND_FILES]);
    setPlaying((p) => (p === name ? null : p));
  };
  useEffect(() => () => player?.stop(), [player]);

  const events = SOUND_EVENTS[game.id][mode] ?? [];

  return (
    <div className="flex h-dvh bg-surface-page-deep text-white">
      <aside className="flex w-60 shrink-0 flex-col border-r border-white/10">
        <p className="px-4 pb-2 pt-4 text-xs font-black uppercase tracking-widest text-white/50">Games playground</p>
        <nav className="space-y-1 px-2">
          {GAMES.map((g) => (
            <button key={g.id} type="button" onClick={() => { setGameId(g.id); setScenarioId(""); }}
              className={cn("w-full rounded-lg px-3 py-2 text-left text-sm font-bold", g.id === game.id ? "bg-brand-blue" : "hover:bg-white/5")}>{g.name}</button>
          ))}
        </nav>
        <div className="mx-2 mt-4 grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1">
          {(["solo", "duel"] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setScenarioId(""); }}
              className={cn("rounded-md py-1.5 text-xs font-black uppercase", mode === m ? "bg-brand-green" : "text-white/60")}>{m}</button>
          ))}
        </div>
        <p className="px-4 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wide text-white/40">Screens</p>
        <ul className="flex-1 overflow-y-auto px-2 pb-4">
          {scenarios.length === 0 && <li className="px-3 py-2 text-xs text-white/50">Solo screens for this game come next (its view split, like Último).</li>}
          {scenarios.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setScenarioId(s.id)}
                className={cn("w-full rounded-lg px-3 py-1.5 text-left text-[13px]", s.id === scenario?.id ? "bg-white/10 font-bold" : "text-white/75 hover:bg-white/5")}>{s.name}</button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-2 text-xs">
          <label className="flex items-center gap-2">Language
            <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className="rounded-md bg-white/10 px-2 py-1">
              {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2">Device
            <select value={device} onChange={(e) => setDevice(e.target.value as Device)} className="rounded-md bg-white/10 px-2 py-1">
              {(Object.keys(DEVICES) as Device[]).map((d) => <option key={d} value={d}>{DEVICES[d].label}</option>)}
            </select>
          </label>
          <span className="text-white/40">{scenario?.note ?? `${game.name} · ${mode} · ${scenario?.name ?? ""}`}</span>
        </div>
        <div ref={stage} className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <div style={{ width: w * scale, height: h * scale }}>
            <iframe ref={frame} title="Game preview" src="/dev/games/preview" onLoad={() => frame.current?.contentWindow?.postMessage({ source: PLAYGROUND, type: "hello" }, window.location.origin)}
              style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}
              className="rounded-[28px] border border-white/15 bg-black shadow-2xl" />
          </div>
        </div>
      </main>

      <aside className="flex w-[380px] shrink-0 flex-col border-l border-white/10">
        <div className="grid grid-cols-3 gap-1 p-2">
          {(["state", "actions", "sounds"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={cn("rounded-md py-1.5 text-xs font-black uppercase", tab === t ? "bg-white/15" : "text-white/60 hover:bg-white/5")}>{t}{t === "actions" && log.length > 0 ? ` (${log.length})` : ""}</button>
          ))}
        </div>
        {tab === "state" && (
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false}
              className="min-h-0 flex-1 resize-none rounded-lg bg-black/40 p-3 font-mono text-[11.5px] leading-snug text-white/90 outline-none" />
            {draftError && <p className="rounded-md bg-brand-red-soft/20 px-2 py-1 text-xs">{draftError} — the last valid state stays on screen.</p>}
            <div className="flex gap-2">
              <button type="button" onClick={apply} className="flex-1 rounded-full bg-brand-green py-2 text-xs font-black uppercase">Apply</button>
              <button type="button" onClick={reset} className="flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase"><RotateCcw className="size-3.5" />Reset</button>
            </div>
          </div>
        )}
        {tab === "actions" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {log.length === 0 ? <p className="p-2 text-xs text-white/50">Click buttons or type in the preview: what the real game would receive shows here.</p> : (
              <ul className="space-y-1">
                {log.map((line, i) => <li key={i} className="rounded-md bg-white/5 px-2 py-1 font-mono text-[11.5px]"><span className="text-white/40">{line.at}</span> {line.text}</li>)}
              </ul>
            )}
          </div>
        )}
        {tab === "sounds" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
            <p className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-white/40">{game.name} · {mode}: which moment plays what</p>
            <ul className="space-y-1">
              {events.map((e) => (
                <li key={e.moment} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">{e.moment}</p>
                    <p className="text-[11px] text-white/50">{e.sound ?? "silent"} · {e.where}</p>
                  </div>
                  {e.sound && (
                    <button type="button" onClick={() => void audition(e.sound!)} aria-label={`Play ${e.sound}`} className="flex size-8 items-center justify-center rounded-full bg-brand-blue">
                      {playing === e.sound ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className="px-1 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wide text-white/40">Every sound we have (audition)</p>
            <ul className="grid grid-cols-2 gap-1">
              {Object.keys(SOUND_FILES).map((name) => (
                <li key={name}>
                  <button type="button" onClick={() => void audition(name)} className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs", playing === name ? "bg-brand-blue" : "bg-white/5 hover:bg-white/10")}>
                    <Volume2 className="size-3.5 shrink-0" /><span className="truncate">{name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="px-1 pt-3 text-[11px] text-white/40">Auditions play here only: your in-game sound setting is untouched.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
