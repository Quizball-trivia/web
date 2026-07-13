"use client";

import { useMemo, useState } from "react";
import {
  JERSEY_PARTS,
  HAIR_PARTS,
  GLASSES_PARTS,
  FACIAL_HAIR_PARTS,
  SKIN_PARTS,
  DEFAULT_SKIN_ID,
  getSkinPart,
  type AvatarPart,
  type AvatarPartPosition,
  type AvatarSlot,
} from "@/lib/avatars/parts";

const SLOTS: { slot: AvatarSlot; label: string; parts: AvatarPart[] }[] = [
  { slot: "jersey", label: "Jerseys", parts: JERSEY_PARTS },
  { slot: "hair", label: "Hair", parts: HAIR_PARTS },
  { slot: "glasses", label: "Glasses", parts: GLASSES_PARTS },
  { slot: "facialHair", label: "Facial hair", parts: FACIAL_HAIR_PARTS },
];

const BOY_HAIR = HAIR_PARTS.find((p) => p.id === "hair_boy_basic")!;

// Store-card mannequin geometry — mirrors MannequinPreview in ItemCard.tsx.
const MANNEQUIN_FACE_POS = { top: 2, left: 28, width: 44 };
const MANNEQUIN_DEFAULT_HAIR_POS = { top: -5, left: 22, width: 52 };

type ViewMode = "body" | "card";

function Overlay({ asset, pos }: { asset: string; pos: AvatarPartPosition }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset}
      alt=""
      className="pointer-events-none absolute object-contain"
      style={{ top: `${pos.top}%`, left: `${pos.left}%`, width: `${pos.width}%` }}
    />
  );
}

// Mirrors AvatarPreview's DOM/CSS with an injectable item position.
function BodyPreview({ skinId, part, pos }: { skinId: string; part: AvatarPart; pos: AvatarPartPosition }) {
  return (
    <div className="relative w-full" style={{ aspectRatio: "495.25 / 543.03" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getSkinPart(skinId).asset} alt="" className="absolute inset-0 h-full w-full object-contain" />
      <Overlay asset={part.asset} pos={pos} />
      {part.slot !== "hair" && <Overlay asset={BOY_HAIR.asset} pos={BOY_HAIR.position} />}
    </div>
  );
}

// Mirrors MannequinPreview's DOM/CSS (head-zone card used for hair/glasses/facial hair).
function CardPreview({ part, pos }: { part: AvatarPart; pos: AvatarPartPosition }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "495.25 / 543.03" }}>
      <div className="absolute inset-0" style={{ transform: "translateY(28%)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/manequen_face.webp"
          alt=""
          className="pointer-events-none absolute object-contain"
          style={{
            top: `${MANNEQUIN_FACE_POS.top}%`,
            left: `${MANNEQUIN_FACE_POS.left}%`,
            width: `${MANNEQUIN_FACE_POS.width}%`,
          }}
        />
        {part.slot !== "hair" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/assets/manequen_hair.webp"
            alt=""
            className="pointer-events-none absolute object-contain"
            style={{
              top: `${MANNEQUIN_DEFAULT_HAIR_POS.top}%`,
              left: `${MANNEQUIN_DEFAULT_HAIR_POS.left}%`,
              width: `${MANNEQUIN_DEFAULT_HAIR_POS.width}%`,
            }}
          />
        )}
        <Overlay asset={part.asset} pos={pos} />
      </div>
    </div>
  );
}

type Overrides = Record<string, AvatarPartPosition>;

const STORAGE_KEY = "dev-part-tuner-overrides";

interface Store {
  position: Overrides;
  storePosition: Overrides;
}

function loadStore(): Store {
  if (typeof window === "undefined") return { position: {}, storePosition: {} };
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { position: raw.position ?? {}, storePosition: raw.storePosition ?? {} };
  } catch {
    return { position: {}, storePosition: {} };
  }
}

export default function DevPartTunerPage() {
  const [skin, setSkin] = useState<string>(DEFAULT_SKIN_ID);
  const [slotIdx, setSlotIdx] = useState(0);
  const [view, setView] = useState<ViewMode>("body");
  const [selected, setSelected] = useState<string | null>(null);
  const [store, setStore] = useState<Store>(loadStore);
  const [copied, setCopied] = useState(false);

  const { parts, slot } = SLOTS[slotIdx];
  const field: keyof Store = view === "card" ? "storePosition" : "position";

  const save = (next: Store) => {
    setStore(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const effectivePos = (part: AvatarPart): AvatarPartPosition => {
    if (view === "card") {
      return store.storePosition[part.id] ?? part.storePosition ?? store.position[part.id] ?? part.position;
    }
    return store.position[part.id] ?? part.position;
  };

  const overrideCount = Object.keys(store.position).length + Object.keys(store.storePosition).length;
  const exportText = useMemo(() => JSON.stringify(store, null, 2), [store]);

  if (process.env.NODE_ENV !== "development") {
    return <div className="p-8 text-white">Dev only</div>;
  }

  const selectedPart = parts.find((p) => p.id === selected) ?? null;

  const nudge = (k: keyof AvatarPartPosition, delta: number) => {
    if (!selectedPart) return;
    const cur = effectivePos(selectedPart);
    save({ ...store, [field]: { ...store[field], [selectedPart.id]: { ...cur, [k]: cur[k] + delta } } });
  };

  const resetSelected = () => {
    if (!selected) return;
    const next = { ...store, [field]: { ...store[field] } };
    delete next[field][selected];
    save(next);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = exportText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
    }
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-surface-page-alt p-6 text-white">
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 bg-surface-page-alt py-2">
        <h1 className="text-lg font-semibold">Part tuner</h1>
        <div className="flex gap-1">
          {SLOTS.map((s, i) => (
            <button
              key={s.slot}
              onClick={() => {
                setSlotIdx(i);
                setSelected(null);
                if (s.slot === "jersey") setView("body");
              }}
              className={`rounded px-2 py-1 text-xs ${i === slotIdx ? "bg-purple-600" : "bg-white/10"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {slot !== "jersey" && (
          <div className="flex gap-1">
            {(["body", "card"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-2 py-1 text-xs ${view === v ? "bg-cyan-600" : "bg-white/10"}`}
              >
                {v === "body" ? "on avatar" : "store card"}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-1">
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
            <span className="font-semibold">
              {selectedPart.id}
              {view === "card" ? " (card)" : ""}
            </span>
            <span>
              top {effectivePos(selectedPart).top} / left {effectivePos(selectedPart).left} / width{" "}
              {effectivePos(selectedPart).width}
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
            ).map(([k, delta, label]) => (
              <button key={`${k}${delta}`} onClick={() => nudge(k, delta)} className="rounded bg-purple-600 px-2 py-0.5">
                {label}
              </button>
            ))}
            <button onClick={resetSelected} className="rounded bg-white/20 px-2 py-0.5">
              reset
            </button>
          </div>
        ) : (
          <span className="text-xs text-white/50">click an item to tune it</span>
        )}
        {overrideCount > 0 && (
          <button onClick={copy} className={`rounded px-3 py-1 text-xs ${copied ? "bg-emerald-500" : "bg-emerald-700"}`}>
            {copied ? "Copied ✓" : `Copy ${overrideCount} override(s)`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 md:grid-cols-6">
        {parts.map((part) => {
          const pos = effectivePos(part);
          const changed = Boolean(store[field][part.id]);
          return (
            <button
              key={part.id}
              onClick={() => setSelected(part.id)}
              className={`rounded-lg p-2 text-left ${selected === part.id ? "bg-purple-600/30 ring-2 ring-purple-500" : "bg-white/5"}`}
            >
              {view === "card" && slot !== "jersey" ? (
                <CardPreview part={part} pos={pos} />
              ) : (
                <BodyPreview skinId={skin} part={part} pos={pos} />
              )}
              <div className="mt-1 truncate text-center text-[11px] text-white/70">
                {part.id}
                {changed ? " *" : ""}
              </div>
            </button>
          );
        })}
      </div>

      {overrideCount > 0 && (
        <pre className="mt-6 rounded bg-black/40 p-4 text-[11px] text-emerald-300">{exportText}</pre>
      )}
    </div>
  );
}
