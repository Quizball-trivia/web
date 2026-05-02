"use client";

// FriendPlayModal — "Play with a Friend" dialog.
//
// Pinned to Figma node 620-7831. Visual spec:
//
//   • Royal-blue card (#1645FF), large 24px radius, generous padding.
//   • Red X close button at top-right (shared <ModalCloseButton />).
//   • Title: "PLAY WITH A FRIEND" — left-aligned, wraps if needed,
//     "PLAY WITH" white + "A FRIEND" yellow. Designed to span the
//     content width comfortably without crashing into the X.
//   • Two-figures friends illustration to the right of the description.
//   • Black "+ CREATE NEW ROOM" primary CTA full-width.
//   • "OR JOIN" caption + 2:1 (Room Code | Join) row + "Browse Public
//     Lobbies" secondary CTA — all in a lighter periwinkle blue
//     (#5C6BFF) so they read as secondary actions against the bg.
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useMobile";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ModalCloseButton } from "./ModalCloseButton";

interface FriendPlayModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Pinned colors from Figma. Hard-coded rather than tokenised because
// these modals have a brand identity that's intentionally distinct
// from the rest of the design system; centralising them in tokens
// would muddy `bg-primary` etc. with one-off uses.
const MODAL_BG = "#1645FF"; // royal blue
const SECONDARY_BG = "#5C6BFF"; // periwinkle (room code + join + browse)
const SECONDARY_BG_HOVER = "#4A5AF0";

export function FriendPlayModal({ isOpen, onOpenChange }: FriendPlayModalProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateRoom = () => {
    onOpenChange(false);
    router.push("/play/friend?tab=create");
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return;
    setIsJoining(true);

    if (roomCode.length < 3) {
      toast.error("Invalid Room Code");
      setIsJoining(false);
      return;
    }

    onOpenChange(false);
    router.push(`/friend/room/${roomCode.toUpperCase()}`);
  };

  const Body = (
    <div className="relative font-fun">
      {/* Shared close button — pinned to top-right of the modal. */}
      <ModalCloseButton onClose={() => onOpenChange(false)} />

      {/* Title row — left-aligned, reserves a 64px right margin so the
          text never crashes into the close button on narrower viewports. */}
      <h2
        className="font-poppins pr-16 text-left uppercase text-white leading-[0.95]"
        style={{ fontSize: "clamp(28px, 4.5vw, 48px)" }}
      >
        Play with <span className="text-[#FFE500]">a Friend</span>
      </h2>

      {/* Description + friends illustration. The illustration is the
          existing friendly_match icon recoloured to white via a CSS
          filter — quick win until the dedicated two-figures asset
          ships from design. */}
      <div className="mt-6 flex items-center justify-between gap-4 md:mt-8">
        <p
          className="flex-1 text-sm leading-snug font-bold text-white/85 md:text-base"
        >
          Create a private room to host a match, or enter a code to join a
          friend&apos;s lobby.
        </p>
        <Image
          src="/assets/friendly_match-icon.webp"
          alt=""
          width={140}
          height={140}
          className="h-24 w-24 shrink-0 object-contain md:h-28 md:w-28"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </div>

      {/* Primary CTA — black pill button with a yellow "+" glyph. */}
      <button
        type="button"
        onClick={handleCreateRoom}
        className={cn(
          "font-poppins mt-7 flex h-16 w-full items-center justify-center gap-3",
          "rounded-2xl bg-black uppercase leading-none text-white",
          "transition-all hover:bg-black/90 active:translate-y-[2px]",
          "md:mt-8 md:h-20",
        )}
        style={{ fontSize: "clamp(20px, 2.6vw, 28px)" }}
      >
        <span
          aria-hidden
          className="font-poppins leading-none text-[#FFE500]"
          style={{ fontSize: "clamp(36px, 4.5vw, 52px)" }}
        >
          +
        </span>
        Create New Room
      </button>

      {/* "OR JOIN" caption */}
      <div className="mt-5 text-center text-[11px] font-black uppercase tracking-[0.18em] text-white/70 md:text-xs">
        Or Join
      </div>

      {/* Room Code (input, span 2 cols) + Join (button, span 1 col) */}
      <div className="mt-3 grid w-full grid-cols-3 gap-3">
        <input
          placeholder="ROOM CODE"
          className={cn(
            "col-span-2 h-14 rounded-2xl px-5 text-center text-base font-black uppercase",
            "tracking-[0.15em] text-white placeholder:text-white/55",
            "transition-all focus:ring-2 focus:ring-white/40 focus:outline-none",
            "md:h-16 md:text-lg",
          )}
          style={{ backgroundColor: SECONDARY_BG }}
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={8}
        />
        <button
          type="button"
          disabled={!roomCode.trim() || isJoining}
          onClick={handleJoinRoom}
          className={cn(
            "col-span-1 h-14 rounded-2xl text-base font-black uppercase tracking-wide text-white",
            "transition-all md:h-16 md:text-lg",
            roomCode.trim()
              ? "hover:brightness-95 active:translate-y-[2px]"
              : "opacity-60 cursor-not-allowed",
          )}
          style={{ backgroundColor: SECONDARY_BG }}
          onMouseEnter={(e) => {
            if (roomCode.trim())
              (e.currentTarget.style.backgroundColor = SECONDARY_BG_HOVER);
          }}
          onMouseLeave={(e) => {
            (e.currentTarget.style.backgroundColor = SECONDARY_BG);
          }}
        >
          Join
        </button>
      </div>

      {/* Secondary CTA — full-width Browse Public Lobbies */}
      <button
        type="button"
        onClick={() => {
          onOpenChange(false);
          router.push("/play/friend?tab=browse");
        }}
        className={cn(
          "mt-3 h-14 w-full rounded-2xl text-sm font-black uppercase tracking-wide text-white",
          "transition-all hover:brightness-95 active:translate-y-[2px]",
          "md:h-16 md:text-base",
        )}
        style={{ backgroundColor: SECONDARY_BG }}
      >
        Browse Public Lobbies
      </button>
    </div>
  );

  // ── Mobile = bottom sheet ────────────────────────────────────────
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 px-6 pt-6 pb-8 [&>button]:hidden"
          style={{ backgroundColor: MODAL_BG }}
        >
          <SheetTitle className="sr-only">Play with a Friend</SheetTitle>
          <SheetDescription className="sr-only">
            Create a room or join an existing room with an invite code.
          </SheetDescription>
          {Body}
        </SheetContent>
      </Sheet>
    );
  }

  // ── Desktop / tablet = centered dialog ───────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[600px] max-h-[95vh] rounded-3xl border-0",
          "px-8 pt-8 pb-8 sm:max-w-[600px]",
          "[&>button]:hidden", // hide shadcn's default close — we render our own
        )}
        style={{ backgroundColor: MODAL_BG }}
      >
        <DialogTitle className="sr-only">Play with a Friend</DialogTitle>
        <DialogDescription className="sr-only">
          Create a room or join an existing room with an invite code.
        </DialogDescription>
        {Body}
      </DialogContent>
    </Dialog>
  );
}
