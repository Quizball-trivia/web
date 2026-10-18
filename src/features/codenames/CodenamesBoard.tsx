"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Shirt, Skull, Users } from "lucide-react";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { cn } from "@/lib/utils";
import type { AvatarCustomization } from "@/types/game";
import { usePreloadCodenamesSounds, useOwnGoalSound } from "./codenames.sounds";
import { cardArt, type CardKind } from "./codenames.view";

export interface BoardCard {
  id: string;
  /** The key colour, when this viewer may see it (Scouts, or everyone once the game is over). */
  kind: CardKind | null;
  revealed: CardKind | null;
  picks?: AvatarCustomization[];
}

export type BoardMode = "guess" | "scout" | "end";

const COVER: Record<CardKind, string> = {
  mine: "bg-brand-green/85",
  theirs: "bg-brand-blue/85",
  neutral: "bg-brand-slate-light/85",
  owngoal: "bg-brand-red/90",
};
const FRAME: Record<CardKind, string> = {
  mine: "border-brand-green bg-brand-green/20",
  theirs: "border-brand-blue bg-brand-blue/25",
  neutral: "border-brand-slate-light bg-brand-slate-light/10",
  owngoal: "border-brand-red bg-brand-red/30",
};
const DOT: Record<CardKind, string> = {
  mine: "bg-brand-green",
  theirs: "bg-brand-blue",
  neutral: "bg-brand-slate-light",
  owngoal: "bg-brand-red",
};

function CoverIcon({ kind }: { kind: CardKind }) {
  if (kind === "owngoal") return <Skull className="size-7 text-white sm:size-9" strokeWidth={2.5} />;
  if (kind === "neutral") return <Users className="size-6 text-black/60 sm:size-8" strokeWidth={2.5} />;
  return <Shirt className={cn("size-7 sm:size-9", kind === "mine" ? "text-black/75" : "text-white")} strokeWidth={2.5} />;
}

const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (i % 3) * 0.2;
  const reach = 140 + (i % 4) * 45;
  return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach + 60, spin: (i % 2 ? 1 : -1) * (180 + i * 20), tone: ["bg-brand-red", "bg-brand-yellow", "bg-white"][i % 3] };
});

/** The Own Goal going off: flash, shockwaves, debris and the skull. Plays once when it mounts. */
function OwnGoalBlast({ label }: { label: string }) {
  useOwnGoalSound();
  return (
    <div data-codenames-blast className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden" aria-hidden>
      <motion.div className="absolute inset-0 bg-brand-red" initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />
      {[0, 0.12].map((delay) => (
        <motion.span key={delay} className={cn("absolute size-40 rounded-full border-[10px]", delay ? "border-white" : "border-brand-yellow")}
          initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 4.5, opacity: 0 }} transition={{ duration: 0.85, delay, ease: "easeOut" }} />
      ))}
      {SPARKS.map((p, i) => (
        <motion.span key={i} className={cn("absolute size-3.5 rounded-sm", p.tone)}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }} animate={{ x: p.x, y: p.y, rotate: p.spin, opacity: 0, scale: 0.6 }}
          transition={{ duration: 1, ease: [0.15, 0.7, 0.4, 1] }} />
      ))}
      <motion.div className="flex flex-col items-center gap-2"
        initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.35, 1, 1], opacity: [0, 1, 1, 0] }} transition={{ duration: 2, times: [0, 0.15, 0.3, 1] }}>
        <span className="flex size-28 items-center justify-center rounded-full bg-brand-red shadow-2xl shadow-black/50"><Skull className="size-16 text-white" strokeWidth={2.5} /></span>
        <span className="font-poppins rounded-full bg-black/70 px-4 py-1 text-xl font-black uppercase text-white">{label}</span>
      </motion.div>
    </div>
  );
}

export function CodenamesBoard({ cards, mode, selected, disabled, kinds, flipLabel, cardLabel, altOf, onTap, className, finale = false }: {
  cards: BoardCard[];
  mode: BoardMode;
  selected?: string | null;
  disabled?: boolean;
  kinds: Record<CardKind, string>;
  flipLabel?: string;
  onTap?: (id: string) => void;
  className?: string;
  /** Each card's accessible name by board position (the picture itself has no text). */
  cardLabel?: (position: number) => string;
  /** What a card's picture shows, for screen readers. */
  altOf?: (id: string) => string | undefined;
  /** The game just ended on this board: an Own Goal already shown still goes off. */
  finale?: boolean;
}) {
  usePreloadCodenamesSounds();
  const [goneOffBefore] = useState(() => new Set(finale ? [] : cards.filter((c) => c.revealed === "owngoal").map((c) => c.id)));
  const blast = cards.some((c) => c.revealed === "owngoal" && !goneOffBefore.has(c.id));
  return (
    <>
    {blast && <OwnGoalBlast label={kinds.owngoal} />}
    <motion.div data-codenames-board={mode} className={cn("grid grid-cols-4 gap-1.5 sm:gap-2 lg:grid-cols-5", className)}
      animate={blast ? { x: [0, -14, 12, -9, 7, -4, 2, 0], y: [0, 6, -5, 4, -2, 0] } : undefined} transition={{ duration: 0.65 }}>
      {cards.map((card, position) => {
        const shown = card.revealed ?? (mode !== "guess" ? card.kind : null);
        const tappable = mode === "guess" && !card.revealed && !disabled && !!onTap;
        const isSelected = selected === card.id && !card.revealed;
        const label = card.revealed ? kinds[card.revealed] : mode !== "guess" && card.kind ? kinds[card.kind] : undefined;
        return (
          <motion.button
            key={card.id}
            type="button"
            data-card={card.id}
            data-revealed={card.revealed ?? undefined}
            data-key={mode !== "guess" ? card.kind ?? undefined : undefined}
            aria-label={[cardLabel?.(position + 1), altOf?.(card.id), label].filter(Boolean).join(" · ") || undefined}
            aria-pressed={mode === "guess" ? isSelected : undefined}
            disabled={!tappable}
            onClick={() => tappable && onTap?.(card.id)}
            whileTap={tappable ? { scale: 0.96 } : undefined}
            className={cn(
              "relative aspect-square overflow-hidden rounded-xl bg-white/90 shadow-md shadow-black/30 transition-shadow",
              tappable && "cursor-pointer hover:ring-2 hover:ring-white/60",
              isSelected && "ring-4 ring-white",
              mode === "end" && !card.revealed && "opacity-90",
            )}
          >
            <Image src={cardArt(card.id)} alt="" fill sizes="(max-width: 480px) 25vw, 200px" className={cn("object-cover", card.revealed && "scale-90 opacity-60 saturate-50")} />
            {card.revealed && (
              <motion.span
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.35 }}
                className={cn("absolute inset-0 flex items-center justify-center", COVER[card.revealed])}
              >
                <CoverIcon kind={card.revealed} />
              </motion.span>
            )}
            {!card.revealed && shown && (
              <span className={cn("absolute inset-0 rounded-xl border-[5px]", FRAME[shown])} aria-hidden>
                {shown === "owngoal" && (
                  <span className={cn("absolute left-1 top-1 flex size-6 items-center justify-center rounded-full", DOT[shown])}><Skull className="size-4 text-white" strokeWidth={3} /></span>
                )}
              </span>
            )}
            {!card.revealed && card.picks && card.picks.length > 0 && (
              <span className="absolute right-1 top-1 flex -space-x-2" aria-hidden>
                {card.picks.slice(0, 3).map((a, i) => <DuelAvatar key={i} customization={a} size="xs" className="rounded-full bg-white/90 p-0.5 shadow" />)}
              </span>
            )}
            {isSelected && flipLabel && (
              <span className="absolute inset-x-1 bottom-1 rounded-full bg-brand-green py-1 text-center text-[11px] font-black uppercase tracking-wide text-black">
                {flipLabel}
              </span>
            )}
          </motion.button>
        );
      })}
    </motion.div>
    </>
  );
}
