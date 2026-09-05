"use client";

import Link from "next/link";

import { AvatarPreview } from "@/components/AvatarPreview";
import { MannequinPreview } from "@/features/store/components/ItemCard";
import { usePartTuning, savePartTuning, tunedPosition, tunedTransform, type PartTransform, type PartTuning } from "@/lib/avatars/usePartTuning";
import type { AvatarCustomization } from "@/types/game";
import { useMemo, useState } from "react";
import {
  JERSEY_PARTS,
  HAIR_PARTS,
  GLASSES_PARTS,
  FACIAL_HAIR_PARTS,
  SKIN_PARTS,
  DEFAULT_SKIN_ID,
  EXTRA_PARTS,
  EXTRA_SLOTS,
  type AvatarPart,
  type AvatarPartPosition,
  type AvatarSlot,
} from "@/lib/avatars/parts";

const SLOTS: { slot: AvatarSlot; label: string; parts: AvatarPart[] }[] = [
  { slot: "jersey", label: "Jerseys", parts: JERSEY_PARTS },
  { slot: "hair", label: "Hair", parts: HAIR_PARTS },
  { slot: "glasses", label: "Glasses", parts: GLASSES_PARTS },
  { slot: "facialHair", label: "Facial hair", parts: FACIAL_HAIR_PARTS },
  ...EXTRA_SLOTS.filter(slot => EXTRA_PARTS.some(p => p.slot === slot)).map(slot => ({ slot, label: ({headwear:"Headwear", earwear:"Earrings", armwear:"Armbands", wristwear:"Wristbands", facePaint:"Face paint"})[slot], parts: EXTRA_PARTS.filter(p => p.slot === slot) })),
];

type ViewMode = "body" | "card";
type Store = PartTuning;

function BodyPreview({ skinId, part }: { skinId: string; part: AvatarPart }) {
  const customization = { skin: skinId, jersey: "jersey_green", hair: "hair_boy_basic", [part.slot]: part.id } as AvatarCustomization;
  return <AvatarPreview customization={customization} width="100%" />;
}

export default function DevPartTunerPage() {
  const [skin, setSkin] = useState<string>(DEFAULT_SKIN_ID);
  const [slotIdx, setSlotIdx] = useState(0);
  const [view, setView] = useState<ViewMode>("body");
  const [selected, setSelected] = useState<string | null>(null);
  const store = usePartTuning();
  const [search, setSearch] = useState("");
  const [onlyNew, setOnlyNew] = useState(true);
  const [step, setStep] = useState(0.25);
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);

  const { parts, slot } = SLOTS[slotIdx];
  const field: "position" | "storePosition" = view === "card" ? "storePosition" : "position";

  const save = (next: Store) => {
    try { savePartTuning(next); setSaveError(""); }
    catch { setSaveError("Could not save adjustments. Check browser storage and try again."); }
  };

  const effectivePos = (part: AvatarPart) => tunedPosition(part, store, view === "card");

  const overrideCount = Object.keys(store.position).length + Object.keys(store.storePosition).length + Object.keys(store.hairBehindFace ?? {}).length + Object.keys(store.hairFrontPercent ?? {}).length + Object.keys(store.transform ?? {}).length + Object.keys(store.storeTransform ?? {}).length;
  const exportText = useMemo(() => JSON.stringify(store, null, 2), [store]);

  if (process.env.NODE_ENV !== "development") {
    return <div className="p-8 text-white">Dev only</div>;
  }

  const selectedPart = parts.find((p) => p.id === selected) ?? null;

  const nudge = (k: keyof AvatarPartPosition, delta: number) => {
    if (!selectedPart) return;
    const cur = effectivePos(selectedPart);
    save({ ...store, [field]: { ...store[field], [selectedPart.id]: { ...cur, [k]: k === "width" ? Math.max(0.25, cur[k] + delta * step) : Math.round((cur[k] + delta * step) * 100) / 100 } } });
  };

  const transformField = view === "card" ? "storeTransform" : "transform";
  const updateTransform = (key: keyof PartTransform, value: number) => {
    if (!selectedPart || !Number.isFinite(value)) return;
    save({ ...store, [transformField]: { ...store[transformField], [selectedPart.id]: { ...tunedTransform(selectedPart, store, view === "card"), [key]: value } } });
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
        <Link href="/dev/store-examples" className="text-sm underline">Open store preview</Link>
        <p className="w-full text-sm text-white/60">Adjustments save automatically in this browser and update the store, try-on and equipped avatar. Store cards use a separate mannequin fit. Copy the overrides when you’re ready to keep them in the app.</p>
        {saveError && <p role="alert">{saveError}</p>}
        <input aria-label="Find item" placeholder="Search player, team or item" value={search} onChange={e => setSearch(e.target.value)} className="rounded bg-white/10 p-2" />
        <label className="text-sm"><input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)} /> New collection only</label>
        <label className="text-sm">Adjustment step <select aria-label="Adjustment step" className="bg-slate-800 p-1" value={step} onChange={e => setStep(Number(e.target.value))}><option value={0.25}>Fine · 0.25</option><option value={1}>Normal · 1</option><option value={5}>Large · 5</option></select></label>
        <div className="flex max-w-full flex-wrap gap-1">
          {SLOTS.map((s, i) => (
            <button
              key={s.slot}
              onClick={() => {
                setSlotIdx(i);
                setSelected(null);
                if (!["hair", "glasses", "facialHair"].includes(s.slot)) setView("body");
              }}
              className={`rounded px-2 py-1 text-xs ${i === slotIdx ? "bg-purple-600" : "bg-white/10"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {["hair", "glasses", "facialHair"].includes(slot) && (
          <div className="flex max-w-full flex-wrap gap-1">
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
        <div className="flex max-w-full flex-wrap gap-1">
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
          <div className="flex flex-wrap items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-xs">
            {selectedPart.slot === "hair" && <div className="flex flex-wrap items-center gap-2 rounded bg-cyan-950 px-2 py-1">
              <label>Hair layers <select aria-label="Hair layers" className="rounded bg-slate-800 p-1" value={store.hairFrontPercent?.[selectedPart.id] !== undefined ? "split" : store.hairBehindFace?.[selectedPart.id] ? "back" : "front"} onChange={e => {
                const hairBehindFace = { ...store.hairBehindFace };
                const hairFrontPercent = { ...store.hairFrontPercent };
                delete hairBehindFace[selectedPart.id];
                delete hairFrontPercent[selectedPart.id];
                if (e.target.value === "back") hairBehindFace[selectedPart.id] = true;
                if (e.target.value === "split") hairFrontPercent[selectedPart.id] = 48;
                save({ ...store, hairBehindFace, hairFrontPercent });
              }}>
                <option value="front">All hair in front</option>
                <option value="back">Face in front of hair</option>
                <option value="split">Curls in front · sides behind</option>
              </select></label>
              {store.hairFrontPercent?.[selectedPart.id] !== undefined && <label className="flex items-center gap-2">Front curls depth
                <input aria-label="Front curls depth" type="range" min="0" max="100" step="0.5" value={store.hairFrontPercent[selectedPart.id]} onChange={e => save({ ...store, hairFrontPercent: { ...store.hairFrontPercent, [selectedPart.id]: Number(e.target.value) } })} />
                <span>{store.hairFrontPercent[selectedPart.id]}%</span>
              </label>}
            </div>}
            {selectedPart.slot === "glasses" && <div className="flex flex-wrap items-center gap-2 rounded bg-cyan-950 px-2 py-1">
              <label className="flex items-center gap-2">Tilt
                <input aria-label="Glasses tilt" type="range" min="-45" max="45" step="0.5" value={tunedTransform(selectedPart, store, view === "card").rotation} onChange={e => updateTransform("rotation", Number(e.target.value))} />
                <span>{tunedTransform(selectedPart, store, view === "card").rotation}°</span>
              </label>
              <label className="flex items-center gap-2">Lens height
                <input aria-label="Glasses lens height" type="range" min="0.5" max="1.5" step="0.025" value={tunedTransform(selectedPart, store, view === "card").scaleY} onChange={e => updateTransform("scaleY", Number(e.target.value))} />
                <span>{Math.round(tunedTransform(selectedPart, store, view === "card").scaleY * 100)}%</span>
              </label>
              <button className="rounded bg-white/20 px-2 py-1" onClick={() => save({ ...store, [transformField]: { ...store[transformField], [selectedPart.id]: { rotation: 0, scaleY: 1 } } })}>Reset tilt & height</button>
              <span className="w-full text-white/60">Use ▼ or increase top to lower the glasses. Tilt and height affect the whole frame, including its arms.</span>
            </div>}
            <span className="break-all font-semibold">
              {selectedPart.id}
              {view === "card" ? " (card)" : ""}
            </span>
            {(["top", "left", "width"] as const).map(k => <label key={k}>{k} <input aria-label={k} type="number" step={step} value={effectivePos(selectedPart)[k]} className="w-20 rounded bg-black/40 p-1" onChange={e => {
              const value = e.target.valueAsNumber;
              if (!Number.isFinite(value) || (k === "width" && value <= 0)) return;
              save({ ...store, [field]: { ...store[field], [selectedPart.id]: { ...effectivePos(selectedPart), [k]: value } } });
            }} /></label>)}
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {parts.filter(p => (!onlyNew || p.localOnly) && `${p.name} ${p.id}`.toLowerCase().includes(search.toLowerCase())).map((part) => {
          const changed = Boolean(store[field][part.id] || store.hairBehindFace?.[part.id] || store.hairFrontPercent?.[part.id] !== undefined || store[transformField]?.[part.id]);
          return (
            <button
              key={part.id}
              onClick={() => setSelected(part.id)}
              className={`rounded-lg p-2 text-left ${selected === part.id ? "bg-purple-600/30 ring-2 ring-purple-500" : "bg-white/5"}`}
            >
              {view === "card" && slot !== "jersey" ? (
                <div className="h-52 flex justify-center"><MannequinPreview part={part} /></div>
              ) : (
                <BodyPreview skinId={skin} part={part} />
              )}
              <div className="mt-1 truncate text-center text-[11px] text-white/70">
                {part.name}
                {changed ? " *" : ""}
              </div>
            </button>
          );
        })}
      </div>

      {overrideCount > 0 && (
        <pre className="mt-6 max-w-full overflow-auto rounded bg-black/40 p-4 text-[11px] text-emerald-300">{exportText}</pre>
      )}
    </div>
  );
}
