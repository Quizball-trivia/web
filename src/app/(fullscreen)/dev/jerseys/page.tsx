"use client";

import { useMemo, useState } from "react";
import {
  JERSEY_PARTS,
  HAIR_PARTS,
  SKIN_PARTS,
  DEFAULT_SKIN_ID,
  getSkinPart,
  type AvatarPart,
  type AvatarPartPosition,
} from "@/lib/avatars/parts";

const BOY_HAIR = HAIR_PARTS.find((p) => p.id === "hair_boy_basic")!;

// Mirrors AvatarPreview's exact DOM/CSS but takes the jersey position directly,
// so localStorage overrides render live without touching the registry.
function TunerPreview({ skinId, part }: { skinId: string; part: AvatarPart }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: "495.25 / 543.03" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getSkinPart(skinId).asset} alt="" className="absolute inset-0 h-full w-full object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={part.asset}
        alt=""
        className="pointer-events-none absolute object-contain"
        style={{
          top: `${part.position.top}%`,
          left: `${part.position.left}%`,
          width: `${part.position.width}%`,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BOY_HAIR.asset}
        alt=""
        className="pointer-events-none absolute object-contain"
        style={{
          top: `${BOY_HAIR.position.top}%`,
          left: `${BOY_HAIR.position.left}%`,
          width: `${BOY_HAIR.position.width}%`,
        }}
      />
    </div>
  );
}

type Overrides = Record<string, AvatarPartPosition>;

const STORAGE_KEY = "dev-jersey-overrides";

function loadOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function DevJerseysPage() {
  const [skin, setSkin] = useState<string>(DEFAULT_SKIN_ID);
  const [selected, setSelected] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides);

  const save = (next: Overrides) => {
    setOverrides(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const patched = useMemo(
    () =>
      JERSEY_PARTS.map((part) =>
        overrides[part.id] ? { ...part, position: overrides[part.id] } : part,
      ),
    [overrides],
  );

  if (process.env.NODE_ENV !== "development") {
    return <div className="p-8 text-white">Dev only</div>;
  }

  const selectedPart = patched.find((p) => p.id === selected);

  const nudge = (field: keyof AvatarPartPosition, delta: number) => {
    if (!selectedPart) return;
    const cur = overrides[selectedPart.id] ?? selectedPart.position;
    save({ ...overrides, [selectedPart.id]: { ...cur, [field]: cur[field] + delta } });
  };

  const resetSelected = () => {
    if (!selected) return;
    const next = { ...overrides };
    delete next[selected];
    save(next);
  };

  const exportText = JSON.stringify(overrides, null, 2);

  return (
    <div className="min-h-screen bg-[#10121e] p-6 text-white">
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 bg-[#10121e] py-2">
        <h1 className="text-lg font-semibold">Jersey tuner</h1>
        <div className="flex gap-2">
          {SKIN_PARTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSkin(s.id)}
              className={`rounded px-2 py-1 text-xs ${skin === s.id ? "bg-purple-600" : "bg-white/10"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
        {selectedPart ? (
          <div className="flex items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-xs">
            <span className="font-semibold">{selectedPart.id}</span>
            <span>
              top {selectedPart.position.top} / left {selectedPart.position.left} / width{" "}
              {selectedPart.position.width}
            </span>
            {(
              [
                ["top", -1, "▲"],
                ["top", 1, "▼"],
                ["left", -1, "◀"],
                ["left", 1, "▶"],
                ["width", 1, "W+"],
                ["width", -1, "W-"],
              ] as const
            ).map(([field, delta, label]) => (
              <button
                key={`${field}${delta}`}
                onClick={() => nudge(field, delta)}
                className="rounded bg-purple-600 px-2 py-0.5"
              >
                {label}
              </button>
            ))}
            <button onClick={resetSelected} className="rounded bg-white/20 px-2 py-0.5">
              reset
            </button>
          </div>
        ) : (
          <span className="text-xs text-white/50">click a jersey to tune it</span>
        )}
        {Object.keys(overrides).length > 0 && (
          <button
            onClick={() => navigator.clipboard.writeText(exportText)}
            className="rounded bg-emerald-600 px-3 py-1 text-xs"
          >
            Copy {Object.keys(overrides).length} override(s)
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
        {patched.map((part) => (
          <button
            key={part.id}
            onClick={() => setSelected(part.id)}
            className={`rounded-lg p-2 text-left ${selected === part.id ? "bg-purple-600/30 ring-2 ring-purple-500" : "bg-white/5"}`}
          >
            <TunerPreview skinId={skin} part={part} />
            <div className="mt-1 truncate text-center text-[11px] text-white/70">
              {part.id}
              {overrides[part.id] ? " *" : ""}
            </div>
          </button>
        ))}
      </div>

      {Object.keys(overrides).length > 0 && (
        <pre className="mt-6 rounded bg-black/40 p-4 text-[11px] text-emerald-300">{exportText}</pre>
      )}
    </div>
  );
}
