"use client";

import { useCallback, useState } from "react";
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
  /** Word boards: the word printed on the card instead of a picture. */
  word?: string;
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

/** Largest word size, as a share of the card's width, capped: most words share it and only long ones shrink. */
const WORD_MAX_SHARE = 0.2;
const WORD_MAX_PX = 19;
const WORD_MIN_PX = 7;
/** Each side: the Scout's 3px colour frame (thinner on word cards) plus a little air. */
const WORD_INSET_PX = 5;

/**
 * A word card. The word is measured in its card and shrunk until it fits on one line: letter widths differ too much
 * between words and scripts for a size worked out from the length, and a word must never split.
 */
function WordFace({ word, covered }: { word: string; covered: boolean }) {
  const fitRef = useCallback((el: HTMLSpanElement | null) => {
    if (!el?.parentElement) return;
    const box = el.parentElement;
    const fit = () => {
      const room = box.clientWidth - 2 * WORD_INSET_PX;
      let size = Math.min(WORD_MAX_PX, Math.floor(box.clientWidth * WORD_MAX_SHARE * 2) / 2);
      el.style.fontSize = `${size}px`;
      while (el.offsetWidth > room && size > WORD_MIN_PX) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    void document.fonts?.ready.then(fit);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return (
    <span className={cn("absolute inset-0 flex items-center justify-center", covered && "opacity-0")}>
      <span ref={fitRef} className="font-poppins inline-block whitespace-nowrap font-black uppercase leading-none tracking-tight text-black">{word}</span>
    </span>
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
  const words = cards.some((c) => c.word !== undefined);
  return (
    <>
    {blast && <OwnGoalBlast label={kinds.owngoal} />}
    <motion.div data-codenames-board={mode} data-codenames-words={words || undefined} className={cn("grid sm:gap-2", words ? "grid-cols-5 gap-1" : "grid-cols-4 gap-1.5 lg:grid-cols-5", className)}
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
            aria-label={[cardLabel?.(position + 1), card.word ?? altOf?.(card.id), label].filter(Boolean).join(" · ") || undefined}
            aria-pressed={mode === "guess" ? isSelected : undefined}
            disabled={!tappable}
            onClick={() => tappable && onTap?.(card.id)}
            whileTap={tappable ? { scale: 0.96 } : undefined}
            className={cn(
              "relative overflow-hidden rounded-xl shadow-md shadow-black/30 transition-shadow",
              card.word !== undefined ? "@container aspect-[5/4] bg-white/95" : "aspect-square bg-white/90",
              tappable && "cursor-pointer hover:ring-2 hover:ring-white/60",
              isSelected && "ring-4 ring-white",
              mode === "end" && !card.revealed && "opacity-90",
            )}
          >
            {card.word !== undefined ? (
              <WordFace word={card.word} covered={!!card.revealed} />
            ) : (
              <Image src={cardArt(card.id)} alt="" fill sizes="(max-width: 480px) 25vw, 200px" className={cn("object-cover", card.revealed && "scale-90 opacity-60 saturate-50")} />
            )}
            {card.revealed && (
              <motion.span
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.35 }}
                className={cn("absolute inset-0 flex items-center justify-center", COVER[card.revealed])}
              >
                {card.word !== undefined ? (
                  <span className="flex flex-col items-center gap-0.5">
                    <CoverIcon kind={card.revealed} />
                    <span className={cn("font-poppins max-w-full truncate px-1 text-[min(11px,11cqi)] font-black uppercase", card.revealed === "mine" || card.revealed === "neutral" ? "text-black/70" : "text-white/85")}>{card.word}</span>
                  </span>
                ) : (
                  <CoverIcon kind={card.revealed} />
                )}
              </motion.span>
            )}
            {!card.revealed && shown && (
              <span className={cn("absolute inset-0 rounded-xl", card.word !== undefined ? "border-[3px]" : "border-[5px]", FRAME[shown])} aria-hidden>
                {shown === "owngoal" && (
                  <span className={cn("absolute flex items-center justify-center rounded-full", DOT[shown], card.word !== undefined ? "left-0.5 top-0.5 size-4" : "left-1 top-1 size-6")}>
                    <Skull className={card.word !== undefined ? "size-3" : "size-4"} strokeWidth={3} color="white" />
                  </span>
                )}
              </span>
            )}
            {!card.revealed && card.picks && card.picks.length > 0 && (
              <span className={cn("absolute flex -space-x-2", card.word !== undefined ? "right-0.5 top-0.5 origin-top-right scale-[0.55]" : "right-1 top-1")} aria-hidden>
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
