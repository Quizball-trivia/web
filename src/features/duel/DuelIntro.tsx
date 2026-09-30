"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DuelStatePayload } from "@/lib/realtime/socket.types";
import type { DuelCopy } from "./duel.copy";
import type { AvatarCustomization } from "@/types/game";
import { SEAT_LABEL } from "./duel.seats";
import { DuelAvatar, seatAvatar } from "./DuelAvatar";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/**
 * The versus screen every duel opens with: both players, the game's three rules, then the countdown the server
 * runs (status "countdown"). At the ready gate it waits for the rival's screen instead.
 */
export function DuelIntro({ snapshot, names, copy, secondsLeft }: {
  snapshot: DuelStatePayload; names: [string, string]; copy: DuelCopy; secondsLeft: number | null;
}) {
  const me = snapshot.mySeat;
  const rival = me === 0 ? 1 : 0;
  const seat = (s: 0 | 1) => snapshot.seats.find((x) => x.seat === s);
  const counting = snapshot.status === "countdown";
  const avatarOf = (s: 0 | 1) => {
    const found = seat(s);
    return seatAvatar(found ?? { userId: `seat-${s}`, avatarCustomization: null, avatarUrl: null, isGuest: true });
  };
  const number = counting && secondsLeft !== null && secondsLeft <= 3 ? secondsLeft : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="flex w-full items-center justify-between gap-2">
        <Player name={copy.you} avatar={avatarOf(me)} side="me" ready={seat(me)?.ready ?? false} showReady={!counting} />
        <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="shrink-0 text-4xl font-black italic text-brand-yellow" style={poppins}>{copy.intro.vs}</motion.span>
        <Player name={names[rival]} avatar={avatarOf(rival)} side="rival" ready={seat(rival)?.ready ?? false} showReady={!counting} />
      </div>

      <ul className="mt-8 w-full space-y-2 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-left">
        {copy.intro.rules[snapshot.game].map((line) => (
          <li key={line} className="flex gap-2.5 text-sm leading-snug text-white/85"><span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-green" />{line}</li>
        ))}
      </ul>

      <div className="mt-8 flex h-24 items-center justify-center">
        {counting ? (
          <AnimatePresence mode="popLayout">
            <motion.span key={number ?? "starts"} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
              className={cn("font-black tabular-nums", number === null ? "text-lg uppercase text-white/70" : "text-7xl text-white")} style={poppins}>
              {number === null ? copy.intro.startsIn : number === 0 ? copy.intro.go : number}
            </motion.span>
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/70">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-sm font-semibold">{copy.waitingRival(names[rival])}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Player({ name, avatar, side, ready, showReady }: { name: string; avatar: AvatarCustomization; side: "me" | "rival"; ready: boolean; showReady: boolean }) {
  return (
    <motion.div initial={{ x: side === "me" ? -24 : 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <span className="relative">
        <DuelAvatar customization={avatar} size="lg" />
        {showReady && ready && (
          <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-brand-green text-black ring-2 ring-surface-page-alt"><Check className="size-4" strokeWidth={3} /></span>
        )}
      </span>
      <span className={cn("max-w-full truncate text-sm font-bold", SEAT_LABEL[side])}>{name}</span>
    </motion.div>
  );
}
