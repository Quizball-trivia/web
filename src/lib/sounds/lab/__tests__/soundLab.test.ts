import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ASSET_BY_ID, SOUND_ASSETS, parseAssignments } from "../catalog";
import audit from "../mode-audit.json";
import { PreviewPlayer } from "../previewPlayer";

describe("sound lab coverage and shipping assets", () => {
  it("ships playable assets for every mapping and current comparison", () => {
    expect(new Set(SOUND_ASSETS.map((asset) => asset.id)).size).toBe(
      SOUND_ASSETS.length,
    );
    for (const asset of SOUND_ASSETS) {
      expect(
        existsSync(resolve("public", asset.path.slice(1))),
        asset.path,
      ).toBe(true);
      expect(asset.duration).toBeGreaterThan(0);
      expect(asset.bars.length).toBe(48);
    }
    for (const mode of audit) {
      expect(existsSync(resolve("src", mode.source)), mode.source).toBe(true);
      expect(new Set(mode.actions.map((action) => action.id)).size).toBe(
        mode.actions.length,
      );
      for (const action of mode.actions) {
        expect(ASSET_BY_ID[action.cue], `${mode.id}/${action.id}`).toBeTruthy();
        if (action.current)
          expect(ASSET_BY_ID[`existing-${action.current}`]).toBeTruthy();
      }
      for (const step of mode.flow)
        expect(mode.actions.some((action) => action.id === step)).toBe(true);
    }
  });
  it("keeps every reachable mini-game and concept demo in the audit", () => {
    const registry = readFileSync(
      resolve("src/features/demos/demoModes.ts"),
      "utf8",
    );
    const slugs = [...registry.matchAll(/slug: "((?:mini-|lab-)[^"]+)"/g)].map(
      (match) => match[1],
    );
    const aliases: Record<string, string> = {
      "mini-football-grid": "mini-football-grid-demo",
    };
    for (const slug of slugs)
      expect(
        audit.some((mode) => mode.id === (aliases[slug] ?? slug)),
        slug,
      ).toBe(true);
  });
  it("ignores malformed and obsolete saved sound choices", () => {
    expect(parseAssignments("{")).toEqual({});
    expect(parseAssignments("null")).toEqual({});
    expect(parseAssignments("[]")).toEqual({});
    expect(
      parseAssignments(
        '{"a":"correct","b":"gone","c":7,"d":"silent","e":"toString"}',
      ),
    ).toEqual({ a: "correct", d: "silent" });
  });
});

class FakeAudio {
  static instances: FakeAudio[] = [];
  volume = 1;
  preload = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onplaying: (() => void) | null = null;
  pause = vi.fn();
  removeAttribute = vi.fn();
  load = vi.fn();
  play = vi.fn(() => Promise.resolve());
  constructor(public src: string) {
    FakeAudio.instances.push(this);
  }
}
describe("isolated preview playback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudio.instances = [];
    vi.stubGlobal("Audio", FakeAudio);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("cancels the previous audition before playing the next and releases on stop", async () => {
    const player = new PreviewPlayer();
    const first = player.play("/one.wav");
    const second = player.play("/two.wav");
    await expect(first).resolves.toBe("cancelled");
    expect(FakeAudio.instances[0].pause).toHaveBeenCalled();
    player.stop();
    await expect(second).resolves.toBe("cancelled");
    expect(vi.getTimerCount()).toBe(0);
    expect(FakeAudio.instances[1].removeAttribute).toHaveBeenCalledWith("src");
  });
  it("settles a failed file so a flow cannot hang", async () => {
    const player = new PreviewPlayer();
    const result = player.play("/missing.wav");
    FakeAudio.instances[0].onerror?.();
    await expect(result).resolves.toBe("error");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("caps long legacy audio and reports stalled loads as errors", async () => {
    const player = new PreviewPlayer();
    const stalled = player.play("/stalled.wav");
    await vi.advanceTimersByTimeAsync(10000);
    await expect(stalled).resolves.toBe("error");
    const long = player.play("/long.wav");
    FakeAudio.instances[1].onplaying?.();
    await vi.advanceTimersByTimeAsync(8000);
    await expect(long).resolves.toBe("ended");
  });
  it("clamps local volume and does not affect gameplay state", async () => {
    const player = new PreviewPlayer();
    player.setVolume(9);
    const playing = player.play("/cue.wav");
    expect(FakeAudio.instances[0].volume).toBe(1);
    player.setVolume(-1);
    expect(FakeAudio.instances[0].volume).toBe(0);
    FakeAudio.instances[0].onended?.();
    await expect(playing).resolves.toBe("ended");
  });
});
