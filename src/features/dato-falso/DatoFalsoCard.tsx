"use client";

/* eslint-disable @next/next/no-img-element -- remote art goes through optimizedRemoteImageProps (resized, cached); flags are local SVGs. */
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Check, Scissors, Trophy, UserRound } from "lucide-react";
import { optimizedRemoteImageProps } from "@/lib/images/remoteImage";
import { cn } from "@/lib/utils";
import { poppins } from "@/features/wordgames/ui";
import type { DatoFalsoCopy } from "./datoFalso.copy";
import type { DfArt, DfCard, DfJoker, DfMark, DfOption } from "./datoFalso.view";

/** Storage art served resized and cacheable (storage itself answers no-cache); the raw file if the optimizer fails. */
function RemoteImg({ src, width, className, onGone }: { src: string; width: number; className?: string; onGone?: () => void }) {
  const [raw, setRaw] = useState(false);
  const props = raw ? { src } : optimizedRemoteImageProps(src, width);
  return <img {...props} alt="" decoding="async" onError={() => (raw ? onGone?.() : setRaw(true))} className={className} />;
}

function Portrait({ src, className }: { src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <span aria-hidden className={cn("grid place-items-center bg-white/10 text-white/50", className)}><UserRound className="size-1/2" /></span>;
  }
  return <RemoteImg key={src} src={src} width={72} onGone={() => setFailed(true)} className={cn("bg-white/10 object-cover object-top", className)} />;
}

/** The player (or coach) and the claim, "Played for ALL these clubs" with the ALL in red. */
export function DfClaim({ card, copy, className }: { card: DfCard; copy: DatoFalsoCopy; className?: string }) {
  const [before, key, after] = copy.claims[card.category];
  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <Portrait key={card.subject.portrait ?? ""} src={card.subject.portrait} className="size-[72px] shrink-0 rounded-2xl ring-2 ring-white/15" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-brand-yellow">{copy.eyebrow}</p>
        <p className="mt-0.5 text-xl font-black leading-tight text-white" style={poppins}>{card.subject.name}</p>
        <p className="mt-0.5 text-base font-black uppercase leading-tight tracking-tight text-white/90" style={poppins}>
          {before} <span className="text-brand-red-light">{key}</span> {after}
        </p>
      </div>
    </div>
  );
}

function Shirt({ number, className }: { number: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 56" aria-hidden className={className}>
      <path d="M22 4 12 8 2 20l8 8 6-5v29h32V23l6 5 8-8L52 8 42 4c-1.5 4-5.5 6-10 6s-8.5-2-10-6Z" className="fill-white" />
      <text x="32" y="44" textAnchor="middle" className="fill-surface-page-alt" style={{ font: "900 20px Poppins, sans-serif" }}>{number}</text>
    </svg>
  );
}

function Art({ art, className }: { art: DfArt; className?: string }) {
  if (art.kind === "shirt") return <Shirt number={art.number} className={className} />;
  if (art.kind === "text") return art.src ? <RemoteImg key={art.src} src={art.src} width={128} className={cn("object-contain opacity-80", className)} /> : <Trophy aria-hidden className={cn("p-1.5 text-brand-yellow", className)} strokeWidth={1.75} />;
  return <RemoteImg key={art.src} src={art.src} width={128} className={cn("object-contain", art.kind === "flag" && "rounded-sm shadow-sm shadow-black/40", className)} />;
}

/** Who picked an option, shown on the tile after a room reveal. */
export interface DfPicker { seat: number; avatar: ReactNode; mine: boolean; doubled: boolean }

/**
 * The five options. Phones: one row each (easy to hit); a wide container: five tiles in a row, as on the streamers' screen.
 * Before the reveal a tap selects; after it the fake gets the stamp and every true option a check.
 */
export function DfOptions({ card, copy, removed, selected, reveal, myPick, pickers, disabled, onSelect }: {
  card: DfCard; copy: DatoFalsoCopy; removed: readonly string[]; selected: string | null;
  reveal: { fake: string } | null; myPick: string | null; pickers?: (option: string) => DfPicker[]; disabled: boolean; onSelect: (option: string) => void;
}) {
  return (
    <div className="@container mt-4">
      <ul className="grid gap-2 @xl:grid-cols-5">
        {card.options.map((o, i) => (
          <OptionTile key={o.id} option={o} number={i + 1} copy={copy} gone={removed.includes(o.id)} selected={selected === o.id} mine={myPick === o.id}
            state={!reveal ? "open" : reveal.fake === o.id ? "fake" : "true"} pickers={reveal && pickers ? pickers(o.id) : []}
            disabled={disabled || removed.includes(o.id) || reveal !== null} onSelect={() => onSelect(o.id)} />
        ))}
      </ul>
    </div>
  );
}

function OptionTile({ option, number, copy, gone, selected, mine, state, pickers, disabled, onSelect }: {
  option: DfOption; number: number; copy: DatoFalsoCopy; gone: boolean; selected: boolean; mine: boolean;
  state: "open" | "fake" | "true"; pickers: DfPicker[]; disabled: boolean; onSelect: () => void;
}) {
  const revealed = state !== "open";
  return (
    <li>
      <motion.button type="button" onClick={onSelect} disabled={disabled} aria-pressed={selected} data-df-option={option.id} data-df-state={gone ? "removed" : state}
        animate={gone ? { opacity: 0.28, scale: 0.97 } : { opacity: state === "true" && !mine ? 0.7 : 1, scale: 1 }}
        className={cn(
          "relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border-2 px-3 py-2 text-left transition-colors @xl:h-full @xl:flex-col @xl:justify-start @xl:gap-0 @xl:px-2 @xl:pb-2.5 @xl:pt-2 @xl:text-center",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-default",
          state === "fake" ? "border-brand-red-soft bg-brand-red-soft/15"
            : mine && revealed ? "border-white/70 bg-transparent"
              : selected ? "border-brand-yellow bg-brand-yellow/10"
                : "border-white/15 bg-transparent enabled:hover:border-white/35",
        )}>
        <span className="absolute left-2 top-1.5 hidden text-[10px] font-black text-white/40 @xl:block" style={poppins}>{number}</span>
        {state === "true" && <Check aria-hidden className="hidden size-4 text-brand-green-light @xl:absolute @xl:right-2 @xl:top-1.5 @xl:block" strokeWidth={3} />}
        <span className="relative grid size-12 shrink-0 place-items-center @xl:mt-3 @xl:aspect-square @xl:size-auto @xl:w-full @xl:rounded-xl @xl:bg-white/[0.06] @xl:p-3">
          <Art art={option.art} className={cn("max-h-full max-w-full", option.art.kind === "flag" ? "w-11 @xl:w-full" : "size-11 @xl:size-full")} />
          {state === "fake" && (
            <motion.span initial={{ scale: 1.8, opacity: 0, rotate: -18 }} animate={{ scale: 1, opacity: 1, rotate: -12 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className="absolute inset-x-[-6px] top-1/2 -translate-y-1/2 rounded-md border-2 border-brand-red-soft bg-surface-page-alt/90 px-1 py-0.5 text-center text-[10px] font-black uppercase tracking-wider text-brand-red-light @xl:text-sm" style={poppins}>
              {copy.fakeStamp}
            </motion.span>
          )}
        </span>
        <span className={cn("min-w-0 flex-1 text-[15px] font-bold leading-tight text-white @xl:mt-2 @xl:flex-none @xl:text-sm", gone && "line-through decoration-white/50")}>
          {option.label}
        </span>
        {(mine && revealed) || pickers.length > 0 ? (
          <span className="flex shrink-0 items-center gap-2 @xl:mt-2 @xl:min-h-6 @xl:flex-wrap @xl:justify-center">
            {mine && revealed && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-black" style={poppins}>{copy.yourPick}</span>}
            {pickers.length > 0 && (
              <span className="flex -space-x-1">
                {pickers.map((p) => (
                  <span key={p.seat} className="relative">
                    {p.avatar}
                    {p.doubled && <span className="absolute -right-1 -top-1 rounded-full bg-brand-yellow px-1 text-[9px] font-black leading-tight text-black" style={poppins}>×2</span>}
                  </span>
                ))}
              </span>
            )}
          </span>
        ) : null}
        {state === "true" && <Check aria-hidden className="size-5 shrink-0 text-brand-green-light @xl:hidden" strokeWidth={3} />}
      </motion.button>
    </li>
  );
}

/** The two jokers. Spent ones stay on screen, greyed, so you can see what is left. */
export function DfJokers({ copy, used, doubled, disabled, onJoker, className }: {
  copy: DatoFalsoCopy; used: readonly DfJoker[]; doubled: boolean; disabled: boolean; onJoker: (joker: DfJoker) => void; className?: string;
}) {
  const button = (joker: DfJoker, icon: ReactNode, label: string) => {
    const spent = used.includes(joker);
    const active = joker === "double" && doubled;
    return (
      <button type="button" onClick={() => onJoker(joker)} disabled={disabled || spent} aria-label={spent ? `${label} · ${copy.used}` : label} data-df-joker={joker}
        className={cn("flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border px-3 py-1 text-center text-[13px] font-black uppercase leading-tight tracking-wide transition-colors",
          active ? "border-brand-yellow bg-brand-yellow text-black"
            : spent ? "border-white/10 text-white/30 line-through decoration-white/40"
              : "border-brand-yellow/60 text-brand-yellow enabled:hover:bg-brand-yellow/10 disabled:opacity-50")} style={poppins}>
        {icon}<span className="min-w-0 text-balance">{label}</span>
      </button>
    );
  };
  return (
    <div className={cn("flex gap-2", className)}>
      {button("cut", <Scissors aria-hidden className="size-4 shrink-0" />, copy.cut)}
      {button("double", <span aria-hidden className="shrink-0 text-sm">×2</span>, copy.double)}
    </div>
  );
}

/** One dot per card: green right, red wrong, white the card on screen. */
export function DfProgress({ marks, total, index, className }: { marks: readonly DfMark[]; total: number; index: number; className?: string }) {
  return (
    <div className={cn("flex gap-1", className)} aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const m = marks[i];
        return <span key={i} className={cn("h-1.5 flex-1 rounded-full", m ? (m.right ? "bg-brand-green-light" : "bg-brand-red-soft") : i === index ? "bg-white" : "bg-white/15")} />;
      })}
    </div>
  );
}

/** The verdict under the card: right / wrong / time up, the full truth, and the way on. */
export function DfVerdict({ copy, fakeLabel, points, pick, explain, children }: {
  copy: DatoFalsoCopy; fakeLabel: string; points: number; pick: string | null; explain: string; children?: ReactNode;
}) {
  const right = points > 0;
  const headline = right ? copy.right(points) : pick === null ? copy.timeUp(fakeLabel) : copy.wrong(fakeLabel, points);
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-live="polite" data-df-verdict={right ? "right" : "wrong"}
      className={cn("mt-5 rounded-2xl border-2 px-4 py-3", right ? "border-brand-green-light/70 bg-brand-green/15" : "border-brand-red-soft/70 bg-brand-red-soft/10")}>
      <p className={cn("text-lg font-black leading-tight", right ? "text-white" : "text-brand-red-light")} style={poppins}>{headline}</p>
      <p className="mt-1 text-sm leading-snug text-white/80">{explain}</p>
      {children}
    </motion.section>
  );
}
