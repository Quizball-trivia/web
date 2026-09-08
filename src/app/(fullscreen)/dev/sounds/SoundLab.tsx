"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronRight,
  CircleHelp,
  Headphones,
  Play,
  RotateCcw,
  Search,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import audit from "@/lib/sounds/lab/mode-audit.json";
import {
  ASSET_BY_ID,
  SOUND_ASSETS,
  SOURCE_LABELS,
  STORAGE_KEY,
  parseAssignments,
  type SoundAsset,
  type SoundAssignments,
} from "@/lib/sounds/lab/catalog";
import { PreviewPlayer } from "@/lib/sounds/lab/previewPlayer";
import styles from "./sounds.module.css";

type Action = (typeof audit)[number]["actions"][number];
type Mode = (typeof audit)[number];
const groups = ["Match modes", "Daily games", "Mini-games", "Concept lab"];
const count = audit.reduce((sum, mode) => sum + mode.actions.length, 0);
const sourceNames = ["original", "kenney", "existing", "quizup"];
const quizupCount = SOUND_ASSETS.filter(
  (asset) => asset.source === "quizup",
).length;

function Waveform({
  asset,
  playing = false,
}: {
  asset?: SoundAsset;
  playing?: boolean;
}) {
  return (
    <div
      className={`${styles.waveform} ${playing ? styles.wavePlaying : ""}`}
      aria-hidden="true"
    >
      {(
        asset?.bars ??
        Array.from(
          { length: 48 },
          (_, i) => 0.12 + Math.abs(Math.sin(i * 0.7)) * 0.6,
        )
      ).map((bar, i) => (
        <span
          key={i}
          style={{
            height: `${Math.max(5, bar * 100)}%`,
            animationDelay: `${i * 19}ms`,
          }}
        />
      ))}
    </div>
  );
}

export default function SoundLab() {
  const [view, setView] = useState<"modes" | "library" | "audit">("modes");
  const [modeId, setModeId] = useState("ranked");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [volume, setVolume] = useState(35);
  const [muted, setMuted] = useState(false);
  const [assignments, setAssignments] = useState<SoundAssignments>({});
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [lastAsset, setLastAsset] = useState("correct");
  const [lastAction, setLastAction] = useState(
    "Pick an action to hear its sound.",
  );
  const [notice, setNotice] = useState("");
  const [running, setRunning] = useState(false);
  const [player] = useState(() => new PreviewPlayer());
  const runId = useRef(0);
  const mode = audit.find((item) => item.id === modeId)!;
  const currentAsset = ASSET_BY_ID[lastAsset];

  useEffect(() => {
    let cancelled = false;
    // Hydrate browser-only preferences after the identical server/client first render.
    queueMicrotask(() => {
      if (cancelled) return;
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "library") setView("library");
      const requestedSource = params.get("source");
      if (requestedSource && sourceNames.includes(requestedSource))
        setSource(requestedSource);
      try {
        setAssignments(parseAssignments(localStorage.getItem(STORAGE_KEY)));
      } catch {
        setNotice(
          "Browser storage is unavailable. You can still export your choices.",
        );
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    } catch {
      /* Export remains available when browser storage is blocked. */
    }
  }, [assignments, loaded]);
  useEffect(() => {
    player.setVolume(muted ? 0 : volume / 100);
  }, [muted, player, volume]);
  useEffect(() => {
    const playbackRun = runId;
    const stopHidden = () => {
      if (document.hidden) {
        runId.current++;
        player.stop();
        setActive(null);
        setRunning(false);
      }
    };
    document.addEventListener("visibilitychange", stopHidden);
    return () => {
      playbackRun.current++;
      player.stop();
      document.removeEventListener("visibilitychange", stopHidden);
    };
  }, [player]);

  function stop() {
    runId.current++;
    player.stop();
    setActive(null);
    setRunning(false);
  }
  function assigned(target: Mode, action: Action) {
    return assignments[`${target.id}/${action.id}`] ?? action.cue;
  }
  async function audition(id: string, label: string, token: number) {
    if (muted || volume === 0) {
      setNotice("Turn on preview sound and raise the volume to audition.");
      return false;
    }
    setLastAction(label);
    if (id === "silent") {
      setActive(null);
      setNotice("This action is intentionally silent.");
      return true;
    }
    const asset = ASSET_BY_ID[id];
    if (!asset) return false;
    setNotice("");
    setLastAsset(id);
    setActive(id);
    const result = await player.play(asset.path, asset.previewSeconds ?? 8);
    if (runId.current !== token) return false;
    setActive(null);
    if (result === "error")
      setNotice(
        "Audio could not play. Try the button again or download the file.",
      );
    return result === "ended";
  }
  function play(id: string, label: string) {
    stop();
    void audition(id, label, runId.current);
  }
  async function playFlow() {
    stop();
    const token = runId.current;
    if (muted || volume === 0) {
      setNotice("Turn on preview sound and raise the volume to audition.");
      return;
    }
    setRunning(true);
    for (const step of mode.flow) {
      if (token !== runId.current) return;
      const action = mode.actions.find((item) => item.id === step)!;
      if (!(await audition(assigned(mode, action), action.label, token))) break;
    }
    if (token === runId.current) {
      setRunning(false);
      setActive(null);
    }
  }
  function setAssignment(action: Action, value: string) {
    setAssignments((previous) => ({
      ...previous,
      [`${mode.id}/${action.id}`]: value,
    }));
  }
  function exportPreset() {
    const data = {
      version: 1,
      createdAt: new Date().toISOString(),
      purpose: "Sound lab proposal; not applied to live gameplay",
      modes: audit.map((target) => ({
        id: target.id,
        name: target.name,
        source: target.source,
        actions: target.actions.map((action) => {
          const id = assigned(target, action);
          const asset = ASSET_BY_ID[id];
          return {
            event: action.id,
            label: action.label,
            sound: id,
            path: asset?.path ?? null,
            source: asset?.source ?? "silent",
            trigger: action.when,
          };
        }),
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "quizball-sound-preset.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Preset exported with every action, sound file and timing rule.");
  }
  const filteredModes = audit.filter((item) =>
    `${item.name} ${item.group}`.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredAssets = SOUND_ASSETS.filter(
    (item) =>
      (source === "all" || item.source === source) &&
      `${item.label} ${item.description}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  return (
    <main className={styles.lab}>
      <header className={styles.topbar}>
        <Link href="/dev/sounds" className={styles.brand}>
          <span className={styles.brandIcon}>
            <AudioLines size={21} />
          </span>
          quizball<span className={styles.devTag}>DEV / AUDIO</span>
        </Link>
        <div className={styles.topActions}>
          <Link href="/dev/sounds/play" className={styles.outlineButton}>Play with QuizUp sounds ↗</Link>
          <span className={styles.saved}>
            {loaded ? "Choices saved on this device" : "Loading choices…"}
          </span>
          <button onClick={exportPreset} className={styles.outlineButton}>
            <ArrowDownToLine size={15} /> Export preset
          </button>
        </div>
      </header>

      <section className={styles.intro}>
        <div>
          <div className={styles.eyebrow}>
            <span /> THE SOUND OF PLAY
          </div>
          <h1>
            Small sounds.
            <br />
            <em>Big game energy.</em>
          </h1>
          <p>
            Audition every moment. Find the right feeling.
            <br />
            One reusable sound language for every Quizball mode.
          </p>
        </div>
        <div className={styles.stats}>
          <div>
            <strong>{SOUND_ASSETS.length}</strong>
            <span>playable sounds</span>
          </div>
          <div>
            <strong>{audit.length}</strong>
            <span>modes & variants</span>
          </div>
          <div>
            <strong>{count}</strong>
            <span>mapped moments</span>
          </div>
        </div>
      </section>

      <div className={styles.toolbar}>
        <nav className={styles.tabs} aria-label="Sound lab views">
          {(
            [
              ["modes", "By game mode"],
              ["library", "Sound library"],
              ["audit", "Audit & sources"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={view === id}
              className={view === id ? styles.tabActive : ""}
              onClick={() => {
                stop();
                setView(id);
                setQuery("");
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className={styles.volume}>
          <button
            aria-label={muted ? "Unmute preview" : "Mute preview"}
            aria-pressed={muted}
            onClick={() => {
              stop();
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            aria-label="Preview volume"
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
          <span>{volume}%</span>
          <button onClick={stop} className={styles.stopButton}>
            <Square size={12} /> Stop
          </button>
        </div>
      </div>
      <div className={styles.previewNotice}>
        <Headphones size={14} /> Preview workspace · New assignments stay here
        until integrated into gameplay. Preview volume is independent of game
        settings.
      </div>
      {notice && (
        <div role="status" className={styles.notice}>
          {notice}
        </div>
      )}

      {view === "modes" && (
        <div className={styles.workspace}>
          <aside className={styles.sidebar}>
            <label className={styles.search}>
              <Search size={16} />
              <input
                aria-label="Find a game mode"
                placeholder="Find a game mode…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className={styles.modeList}>
              {groups.map((group) => (
                <section key={group}>
                  <h2>
                    {group}
                    <span>
                      {
                        filteredModes.filter((item) => item.group === group)
                          .length
                      }
                    </span>
                  </h2>
                  {filteredModes
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <button
                        key={item.id}
                        className={item.id === modeId ? styles.modeActive : ""}
                        aria-pressed={item.id === modeId}
                        onClick={() => {
                          stop();
                          setModeId(item.id);
                          setLastAction("Pick an action to hear its sound.");
                        }}
                      >
                        <span>{item.name}</span>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                </section>
              ))}
              {!filteredModes.length && (
                <p className={styles.empty}>No modes found.</p>
              )}
            </div>
          </aside>
          <div className={styles.modeMain}>
            <div className={styles.modeHeading}>
              <div>
                <span className={styles.kicker}>
                  {mode.group} / {mode.actions.length} MOMENTS
                </span>
                <h2>{mode.name}</h2>
              </div>
              <span className={styles.statusBadge}>
                {mode.status === "gap"
                  ? "Currently silent"
                  : "Partial audio coverage"}
              </span>
            </div>
            <div className={styles.simulator}>
              <div className={styles.simulatorCopy}>
                <span className={styles.kicker}>ACTION PREVIEW</span>
                <h3>{lastAction}</h3>
                <p>
                  {currentAsset?.label}{" "}
                  <span>· {currentAsset?.duration.toFixed(2)}s</span>
                </p>
                <div className={styles.quickButtons}>
                  {mode.actions
                    .filter((action) =>
                      [
                        "correct",
                        "wrong",
                        "timeout",
                        "goal",
                        "bid",
                        "reveal",
                        "spin",
                      ].includes(action.id),
                    )
                    .slice(0, 5)
                    .map((action) => (
                      <button
                        key={action.id}
                        onClick={() =>
                          play(assigned(mode, action), action.label)
                        }
                        className={
                          action.id === "correct"
                            ? styles.correctButton
                            : action.id === "wrong"
                              ? styles.wrongButton
                              : ""
                        }
                      >
                        <Play size={12} fill="currentColor" />
                        {action.label}
                      </button>
                    ))}
                </div>
              </div>
              <div className={styles.monitor}>
                <div className={styles.monitorTop}>
                  <span className={active ? styles.liveDot : styles.idleDot} />
                  {active ? "PLAYING" : "READY TO AUDITION"}
                  <span>01 / SFX</span>
                </div>
                <Waveform asset={currentAsset} playing={Boolean(active)} />
                <button
                  className={styles.flowButton}
                  onClick={running ? stop : () => void playFlow()}
                >
                  {running ? (
                    <Square size={13} />
                  ) : (
                    <Play size={13} fill="currentColor" />
                  )}
                  {running ? "Stop flow" : "Play a sample flow"}
                </button>
                <small>Illustrative sequence · Stop cancels playback</small>
              </div>
            </div>
            <div className={styles.sequence} aria-label="Sample flow">
              {mode.flow.map((id, i) => {
                const action = mode.actions.find((item) => item.id === id)!;
                return (
                  <span key={`${id}-${i}`}>
                    <button
                      onClick={() => play(assigned(mode, action), action.label)}
                    >
                      {action.label}
                    </button>
                    {i < mode.flow.length - 1 && <ChevronRight size={12} />}
                  </span>
                );
              })}
            </div>
            <div className={styles.sectionHeading}>
              <div>
                <h3>What plays, and when</h3>
                <p>
                  Press an action. Swap its sound. Your choices save
                  automatically.
                </p>
              </div>
              <button
                className={styles.textButton}
                onClick={() => {
                  stop();
                  setAssignments((previous) =>
                    Object.fromEntries(
                      Object.entries(previous).filter(
                        ([key]) => !key.startsWith(`${mode.id}/`),
                      ),
                    ),
                  );
                }}
              >
                <RotateCcw size={13} />
                Reset mode
              </button>
            </div>
            <div className={styles.actionTable}>
              {mode.actions.map((action, index) => {
                const id = assigned(mode, action);
                const asset = ASSET_BY_ID[id];
                return (
                  <div className={styles.actionRow} key={action.id}>
                    <span className={styles.rowNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className={styles.actionDescription}>
                      <button
                        className={styles.actionPlay}
                        onClick={() => play(id, action.label)}
                      >
                        <Play size={12} fill="currentColor" />
                        {action.label}
                      </button>
                      <p>{action.when}</p>
                      <span
                        className={
                          action.current ? styles.currentTag : styles.newTag
                        }
                      >
                        {action.current
                          ? `Existing cue: ${action.current}`
                          : "New cue point"}
                      </span>
                    </div>
                    <div className={styles.soundChoice}>
                      <label
                        className={styles.srOnly}
                        htmlFor={`${mode.id}-${action.id}`}
                      >
                        Sound for {action.label}
                      </label>
                      <select
                        id={`${mode.id}-${action.id}`}
                        value={id}
                        onChange={(event) =>
                          setAssignment(action, event.target.value)
                        }
                      >
                        <option value="silent">Intentionally silent</option>
                        {sourceNames.map((name) => (
                          <optgroup key={name} label={SOURCE_LABELS[name]}>
                            {SOUND_ASSETS.filter(
                              (item) => item.source === name,
                            ).map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <div>
                        <span>
                          {asset
                            ? `${SOURCE_LABELS[asset.source]} · ${asset.duration.toFixed(2)}s`
                            : "No audio"}
                        </span>
                        {action.current && (
                          <button
                            onClick={() =>
                              play(
                                `existing-${action.current}`,
                                `Current: ${action.label}`,
                              )
                            }
                          >
                            Compare current
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <details className={styles.evidence}>
              <summary>
                <CircleHelp size={15} /> Audit evidence & integration notes
              </summary>
              <p>{mode.summary}</p>
              <code>src/{mode.source}</code>
              <p>
                Bind cues to confirmed actions or visible state transitions.
                Reuse event IDs, deduplicate network redelivery, respect sound
                preferences and pause timers when the page is hidden. These
                mappings are proposals; the lab does not alter live gameplay.
              </p>
            </details>
          </div>
        </div>
      )}

      {view === "library" && (
        <section className={styles.library}>
          <div className={styles.libraryHeader}>
            <div>
              <span className={styles.kicker}>THE COLLECTION</span>
              <h2>Find your signature sound.</h2>
              <p>
                29 originals, 8 CC0 alternatives, 17 current game effects, and{" "}
                {quizupCount} QuizUp references.
              </p>
            </div>
            <a
              href="/sounds/lab/quizball-sound-pack.zip"
              download
              className={styles.outlineButton}
            >
              <ArrowDownToLine size={15} /> Download new pack
            </a>
          </div>
          <div className={styles.libraryFilters}>
            <label className={styles.search}>
              <Search size={16} />
              <input
                aria-label="Search sounds"
                placeholder="Search sounds…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className={styles.sourceFilters}>
              {["all", ...sourceNames].map((name) => (
                <button
                  key={name}
                  aria-pressed={source === name}
                  className={source === name ? styles.sourceActive : ""}
                  onClick={() => setSource(name)}
                >
                  {name === "all" ? "All sounds" : SOURCE_LABELS[name]}
                </button>
              ))}
            </div>
          </div>
          {source === "quizup" && (
            <div className={styles.notice}>
              <strong>QuizUp comparison collection</strong>
              <p>
                Clips from the QuizUp-labelled recording already in the project.
                Numbered by source timestamp because the original action names
                are unverified. These references are separate from the free
                sound pack.
              </p>
              <div className={styles.sourceFilters}>
                <button
                  onClick={() =>
                    play("quizup-full-recording", "QuizUp · Full recording")
                  }
                >
                  <Play size={12} /> Play full recording
                </button>
                <a
                  href="https://www.youtube.com/watch?v=hIRYE-FJucg"
                  target="_blank"
                  rel="noreferrer"
                >
                  Matching upload ↗
                </a>
                <a
                  href="https://www.youtube.com/watch?v=mrBTA9_ysBQ&t=195s"
                  target="_blank"
                  rel="noreferrer"
                >
                  1.0 archive ↗
                </a>
                <a
                  href="https://www.youtube.com/watch?v=mrBTA9_ysBQ&t=1257s"
                  target="_blank"
                  rel="noreferrer"
                >
                  2.0 archive ↗
                </a>
              </div>
            </div>
          )}
          <div className={styles.assetGrid}>
            {filteredAssets.map((asset) => (
              <article
                key={asset.id}
                className={`${styles.assetCard} ${active === asset.id ? styles.assetActive : ""}`}
              >
                <div className={styles.cardMeta}>
                  <span>{SOURCE_LABELS[asset.source]}</span>
                  <span>{asset.duration.toFixed(2)}s</span>
                </div>
                <button
                  className={styles.assetPlay}
                  aria-label={`Play ${asset.label}`}
                  onClick={() => play(asset.id, asset.label)}
                >
                  <Waveform asset={asset} playing={active === asset.id} />
                  <span className={styles.playCircle}>
                    <Play size={17} fill="currentColor" />
                  </span>
                </button>
                <h3>{asset.label}</h3>
                <p>{asset.description}</p>
                <div className={styles.cardFooter}>
                  <span>
                    {asset.source === "original"
                      ? "Made for Quizball"
                      : asset.source === "kenney"
                        ? "CC0 · no attribution required"
                        : asset.source === "quizup"
                          ? "Comparison reference · license unverified"
                          : "Existing licensing applies"}
                  </span>
                  <a
                    href={asset.path}
                    download
                    aria-label={`Download ${asset.label}`}
                  >
                    <ArrowDownToLine size={15} />
                  </a>
                </div>
              </article>
            ))}
          </div>
          {!filteredAssets.length && (
            <p className={styles.empty}>No sounds match this search.</p>
          )}
        </section>
      )}

      {view === "audit" && (
        <section className={styles.auditView}>
          <span className={styles.kicker}>AUDIT / SEPTEMBER 2026</span>
          <h2>A shared language, with room for personality.</h2>
          <p className={styles.auditLead}>
            52 entries cover live modes, shared variants, daily challenges,
            reachable mini-game demos and all nine concept-lab modes. Shared
            variants are counted separately so their action maps are easy to
            audition.
          </p>
          <div className={styles.auditGrid}>
            <article>
              <h3>
                <Check size={18} /> Already in the game
              </h3>
              <p>
                Possession has answer, kick, pass and phase cues. Daily games
                share verdict sounds. Auction has a dedicated conductor. Live
                Football Grid has answer and kickoff cues. Free Kicks has crowd,
                kick and cashout audio.
              </p>
            </article>
            <article>
              <h3>
                <AudioLines size={18} /> Main gaps
              </h3>
              <p>
                Party Quiz, training, campaign quizzes and most mini-games have
                no explicit SFX wiring in their controllers. Selection, timer
                expiry, progression and terminal results need consistent
                treatment. Weekend League verdict coverage varies by board.
              </p>
            </article>
            <article>
              <h3>
                <Headphones size={18} /> The mix
              </h3>
              <p>
                Quiet selections, clear result notes, restrained urgency. No
                typing or hover sounds. One cue per confirmed event. A goal,
                correct answer and victory flourish should play in sequence
                rather than pile up.
              </p>
            </article>
          </div>
          <h3 className={styles.auditSubheading}>
            Sources you can actually use
          </h3>
          <div className={styles.sourceRow}>
            <strong>01 / Quizball originals</strong>
            <p>
              29 deterministic synthesized WAV effects. No third-party samples
              or paid services. Source generator and regeneration instructions
              are included.
            </p>
            <a href="/sounds/lab/README.md" target="_blank" rel="noreferrer">
              Pack notes <ArrowUpRight size={15} />
            </a>
          </div>
          <div className={styles.sourceRow}>
            <strong>02 / Kenney Interface Sounds</strong>
            <p>
              8 imported alternatives from the official CC0 pack, converted to
              mono WAV with a short fade and peak limiter. Original license and
              filename mappings are included.
            </p>
            <a
              href="https://kenney.nl/assets/interface-sounds"
              target="_blank"
              rel="noreferrer"
            >
              Official source <ArrowUpRight size={15} />
            </a>
          </div>
          <div className={styles.sourceRow}>
            <strong>03 / Current game audio</strong>
            <p>
              17 existing files included for A/B comparison. These keep their
              existing provenance and license obligations; they are not part of
              the new downloadable pack.
            </p>
            <a href="/sounds/lab/AUDIT.md" target="_blank" rel="noreferrer">
              Full mode audit <ArrowUpRight size={15} />
            </a>
          </div>
          <div className={styles.sourceRow}>
            <strong>04 / QuizUp references</strong>
            <p>
              {quizupCount - 1} trimmed clips and the full local montage. The
              matching upload is titled “Quizup - Sound Effects” by Mr. Noronha
              - VGM, whose description credits Glu. Exact clip/action identities
              and reuse rights are unverified. Reference files are excluded from
              the free pack.
            </p>
            <a
              href="/sounds/quizup-reference/provenance.json"
              target="_blank"
              rel="noreferrer"
            >
              Source & timestamps <ArrowUpRight size={15} />
            </a>
          </div>
          <div className={styles.auditCallout}>
            <strong>Ready for your listening pass.</strong>
            <p>
              Use the mode buttons to test each action, export your choices, and
              download the 37 new files. Presets carry the exact file path and
              trigger timing for implementation. This audit targets the active
              web checkout; native mobile integration is a separate step.
            </p>
            <button className={styles.flowButton} onClick={exportPreset}>
              <ArrowDownToLine size={15} />
              Export all mappings
            </button>
          </div>
        </section>
      )}
      <footer className={styles.footer}>
        <span>QUIZBALL / SOUND LAB v1</span>
        <span aria-live="polite">
          {active
            ? `Playing: ${ASSET_BY_ID[active]?.label}`
            : "No audio playing"}
        </span>
        <span>Built to be reused.</span>
      </footer>
    </main>
  );
}
