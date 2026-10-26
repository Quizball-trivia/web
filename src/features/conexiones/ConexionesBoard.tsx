"use client";

/* eslint-disable @next/next/no-img-element -- portraits go through optimizedRemoteImageProps (resized, cached). */
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, MotionConfig, motion, useAnimationControls } from "motion/react";
import { optimizedRemoteImageProps } from "@/lib/images/remoteImage";
import { cn } from "@/lib/utils";
import { poppins } from "@/features/wordgames/ui";
import { textIn, tileName, type CxBoard, type CxSolved, type CxTier, type CxTile } from "./conexiones.logic";

/** Solo bands follow difficulty; duel bands follow who found the group (you green, rival blue). */
export const TIER_BG: Record<CxTier, string> = { 1: "bg-brand-yellow", 2: "bg-brand-orange", 3: "bg-brand-red-soft", 4: "bg-brand-purple" };

function Portrait({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  const [raw, setRaw] = useState(false);
  if (failed) return null;
  const props = raw ? { src } : optimizedRemoteImageProps(src, 64);
  return <img {...props} alt="" decoding="async" onError={() => (raw ? setFailed(true) : setRaw(true))} className="size-9 max-w-full shrink-0 rounded-full bg-white/10 object-cover object-top sm:size-11" />;
}

const PARTICLES = new Set(["de", "da", "di", "do", "dos", "del", "van", "von", "der", "le", "la"]);

/**
 * The largest size (up to `max` rem, never under half a rem) at which the name's longest word fits the tile's width on
 * one line. A browser font larger than 16 px adds its difference on top (the name may then wrap, never shrink).
 */
const fitSize = (text: string, max: number) => {
  const longest = Math.max(1, ...text.split(/[\s-]+/).map((w) => [...w].length));
  return { fontSize: `clamp(0.5rem, calc(100cqw / ${(longest * 0.82).toFixed(2)} + 1rem - 16px), ${max}rem)` };
};

/** "Lionel Messi" → small "Lionel", bold "Messi"; "Rodrigo De Paul" keeps "De Paul" together; one word is all bold. */
function TileName({ name }: { name: string }) {
  const words = name.split(" ");
  let cut = words.length - 1;
  while (cut > 1 && PARTICLES.has(words[cut - 1].toLowerCase())) cut--;
  const first = words.slice(0, cut).join(" ");
  const last = words.slice(cut).join(" ");
  return (
    <span className="flex w-full min-w-0 flex-col items-center leading-tight">
      {first && <span className="w-full font-semibold opacity-70 [overflow-wrap:anywhere]" style={fitSize(first, 0.6875)}>{first}</span>}
      {/* Sized to the tile so a long surname stays whole; only one too long even at 8 px wraps, and the tile grows to hold it. */}
      <span className="w-full font-black uppercase [overflow-wrap:anywhere]" style={{ ...poppins, ...fitSize(last, 0.8125) }}>{last}</span>
    </span>
  );
}

function Tile({ tile, locale, selected, flagged, disabled, onToggle }: { tile: CxTile; locale: string; selected: boolean; flagged: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} disabled={disabled} aria-pressed={selected} data-cx-tile={tile.id}
      className={cn("flex aspect-[4/5] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-center transition-colors [container-type:inline-size]",
        selected ? "bg-white text-black" : flagged ? "bg-brand-blue/35 text-white ring-2 ring-brand-blue" : "bg-white/[0.09] text-white hover:bg-white/[0.14]",
        disabled && !selected && "cursor-default hover:bg-white/[0.09]")}>
      {tile.portrait && <Portrait src={tile.portrait} />}
      <TileName name={tileName(tile, locale)} />
    </button>
  );
}

const REDUCE = "(prefers-reduced-motion: reduce)";
const onReduceChange = (cb: () => void) => {
  const q = window.matchMedia?.(REDUCE);
  q?.addEventListener("change", cb);
  return () => q?.removeEventListener("change", cb);
};

const INSTANT = { duration: 0 } as const;

/** Live, unlike motion's useReducedMotion and MotionConfig reducedMotion, which each element reads once when it mounts;
 * so the board turns motion off through props motion re-reads on every render (transition, initial). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(onReduceChange, () => Boolean(window.matchMedia?.(REDUCE).matches), () => false);
}

export function SolvedBand({ solved, board, locale, tone, label }: { solved: CxSolved; board: CxBoard; locale: string; tone: "tier" | "you" | "rival" | "none"; label?: string }) {
  const names = solved.members.map((id) => board.tiles.find((t) => t.id === id)).filter((t): t is CxTile => Boolean(t)).map((t) => tileName(t, locale));
  const bg = tone === "tier" ? TIER_BG[solved.tier] : tone === "you" ? "bg-brand-green" : tone === "rival" ? "bg-brand-blue" : "bg-white/[0.12]";
  const dark = tone === "tier" || tone === "you";
  const still = usePrefersReducedMotion();
  return (
    <motion.div layout initial={still ? false : { scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={still ? INSTANT : { type: "spring", stiffness: 420, damping: 30 }}
      className={cn("col-span-4 flex min-h-[64px] flex-col items-center justify-center rounded-2xl px-3 py-2 text-center", bg, dark ? "text-black" : "text-white", solved.missed && tone === "tier" && "opacity-80")}
      data-cx-solved={solved.groupId}>
      {label && <span className={cn("mb-0.5 rounded-full px-2 text-[10px] font-black uppercase tracking-wide", dark ? "bg-black/15" : "bg-white/20")} style={poppins}>{label}</span>}
      <p className="text-[13px] font-black uppercase leading-tight tracking-wide sm:text-sm" style={poppins}>{textIn(solved.link, locale)}</p>
      <p className="mt-0.5 text-[11px] font-semibold leading-snug opacity-80 sm:text-xs">{names.join(" · ")}</p>
      {solved.note && <p className="mt-0.5 text-[10px] font-semibold opacity-70">{solved.note}</p>}
    </motion.div>
  );
}

export function ConexionesGrid({ board, order, solved, selected, locale, disabled, flagged = [], shakeKey, bandTone, bandLabel, onToggle }: {
  board: CxBoard; order: readonly string[]; solved: readonly CxSolved[]; selected: readonly string[]; locale: string; disabled: boolean;
  /** Tiles of the rival's last try, outlined so you can read what they picked. */
  flagged?: readonly string[];
  /** A new value shakes the selected tiles (a wrong try). */
  shakeKey?: number;
  bandTone: (s: CxSolved) => "tier" | "you" | "rival" | "none"; bandLabel?: (s: CxSolved) => string | undefined; onToggle: (id: string) => void;
}) {
  const tiles = order.map((id) => board.tiles.find((t) => t.id === id)).filter((t): t is CxTile => Boolean(t));
  // One control for every tile: a new shakeKey shakes the selected ones without remounting any (keyboard focus stays).
  const shake = useAnimationControls();
  const still = usePrefersReducedMotion();
  useEffect(() => {
    if (shakeKey && !still) void shake.start((isSelected: boolean) => (isSelected ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.35 } } : { x: 0 }));
  }, [shakeKey, shake]); // eslint-disable-line react-hooks/exhaustive-deps -- a preference change alone must not replay the shake
  useEffect(() => {
    if (!still) return;
    shake.stop();
    shake.set({ x: 0 });
  }, [still, shake]);
  return (
    // "never" overrides the room shell's reducedMotion="user", which would freeze the setting a tile mounted with.
    <MotionConfig reducedMotion="never">
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2" data-cx-grid>
      {/* A group someone finds is read out (its link and players); bands already there on a reload are not, nor the
          groups shown unfound when a board ends (they always come last). */}
      <div className="contents" aria-live="polite" aria-relevant="additions">
        <AnimatePresence initial={false}>
          {solved.filter((s) => !s.missed).map((s) => <SolvedBand key={s.groupId} solved={s} board={board} locale={locale} tone={bandTone(s)} label={bandLabel?.(s)} />)}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {solved.filter((s) => s.missed).map((s) => <SolvedBand key={s.groupId} solved={s} board={board} locale={locale} tone={bandTone(s)} label={bandLabel?.(s)} />)}
      </AnimatePresence>
      {tiles.map((t) => {
        const isSelected = selected.includes(t.id);
        return (
          <motion.div key={t.id} layout className="min-w-0" transition={still ? INSTANT : { type: "spring", stiffness: 500, damping: 38 }}>
            <motion.div custom={isSelected} animate={shake}>
              <Tile tile={t} locale={locale} selected={isSelected} flagged={flagged.includes(t.id)} disabled={disabled || (!isSelected && selected.length >= 4)} onToggle={() => onToggle(t.id)} />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
    </MotionConfig>
  );
}

export function MistakeDots({ left, total, label }: { left: number; total: number; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-xs font-bold text-white/70">
      <span>{label}</span>
      <span className="flex gap-1.5" aria-label={`${left}/${total}`}>
        {Array.from({ length: total }, (_, i) => <span key={i} className={cn("size-2.5 rounded-full transition-colors", i < left ? "bg-white" : "bg-white/20")} />)}
      </span>
    </div>
  );
}
