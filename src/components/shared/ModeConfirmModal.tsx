// ModeConfirmModal — confirmation dialog before starting a match.
//
// Pinned to Figma node 620-6334 (ranked variant). Shape is reused for
// `friendly` and `solo` via the CONFIG dictionary at the top.
//
// Visual spec (ranked):
//
//   • Vivid green card (#38B60E), 24px radius, 32px padding.
//   • Red X close button at top-right (shared <ModalCloseButton />).
//   • Centered title: "1V1 RANKED MATCH" — "1V1" yellow, rest white.
//     Naturally wraps after "RANKED".
//   • Centered description, 1–2 lines, white/85 bold.
//   • Large black trophy silhouette in the middle.
//   • Two yellow pills floating to the LEFT and RIGHT of the trophy
//     — "12-18 QUESTIONS" mid-left, "DURATION 5 MIN" upper-right.
//   • Black full-width primary CTA: "PLAY FOR <N> TICKET(S)" with
//     the cost in yellow.
//   • Footer: "YOU HAVE <N> TICKETS 🎫" small caps, white/80.
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
import { cn } from "@/lib/utils";
import { ModalCloseButton } from "./ModalCloseButton";

interface ModeConfirmModalProps {
  mode: "ranked" | "friendly" | "solo" | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  ticketsRemaining?: number;
}

// Per-mode visual + content. Background colour is part of the config
// because friendly/solo modes use different brand fills.
const CONFIG = {
  ranked: {
    bg: "#38B60E", // vivid green
    titlePrefix: "1V1",
    titleRest: "Ranked Match",
    description:
      "3 Random categories appear - each player blocks 1, then compete in the remaining one",
    icon: "/assets/ranked-icon.webp",
    statLeft: "12–18 Questions",
    statRight: "Duration 5 Min",
    entryCost: 1,
  },
  friendly: {
    bg: "#1645FF",
    titlePrefix: "1V1",
    titleRest: "Friendly Match",
    description: "Play against a friend. No RP at stake.",
    icon: "/assets/friendly_match-icon.webp",
    statLeft: "Custom Rules",
    statRight: "Variable Length",
    entryCost: 0,
  },
  solo: {
    bg: "#7C3AED", // violet for distinction
    titlePrefix: "Solo",
    titleRest: "Practice",
    description: "Practice your skills against the AI.",
    icon: "/assets/ranked-icon.webp",
    statLeft: "Self-Paced",
    statRight: "XP Earned",
    entryCost: 0,
  },
} as const;

export function ModeConfirmModal({
  mode,
  isOpen,
  onOpenChange,
  onConfirm,
  ticketsRemaining = 0,
}: ModeConfirmModalProps) {
  const isMobile = useIsMobile();

  if (!mode) return null;

  const config = CONFIG[mode];
  const hasTickets = ticketsRemaining >= config.entryCost;

  const Body = (
    <div className="relative font-fun">
      {/* Shared close button */}
      <ModalCloseButton onClose={() => onOpenChange(false)} />

      {/* Title — centered, max-width keeps it from running into the
          close button on narrow viewports. The natural break after
          "RANKED" produces the Figma's two-line composition. */}
      <h2
        className="font-poppins mx-auto max-w-[80%] text-center uppercase text-white leading-[0.95]"
        style={{ fontSize: "clamp(28px, 4.6vw, 52px)" }}
      >
        <span className="text-brand-yellow">{config.titlePrefix}</span>{" "}
        {config.titleRest}
      </h2>

      {/* Description */}
      <p className="mx-auto mt-4 max-w-[30rem] text-center text-sm leading-snug font-bold text-white/85 md:text-base">
        {config.description}
      </p>

      {/* Trophy section. Trophy is a large fixed-aspect art piece;
          the two yellow stat pills float on the LEFT and RIGHT around
          the trophy's vertical centre. Pills are absolutely
          positioned so the trophy stays centered regardless of pill
          text length. */}
      <div className="relative mx-auto my-6 h-48 w-full md:my-8 md:h-60">
        <Image
          src={config.icon}
          alt=""
          fill
          priority
          className="object-contain"
        />

        {/* Mid-left pill (e.g. "12-18 QUESTIONS") */}
        <div
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2",
            "rounded-full px-4 py-2 text-xs font-black uppercase whitespace-nowrap",
            "bg-brand-yellow text-black shadow-sm md:text-sm",
          )}
        >
          {config.statLeft}
        </div>

        {/* Upper-right pill (e.g. "DURATION 5 MIN") — slightly higher
            than centre to mirror the Figma composition. */}
        <div
          className={cn(
            "absolute right-0 top-[28%]",
            "rounded-full px-4 py-2 text-xs font-black uppercase whitespace-nowrap",
            "bg-brand-yellow text-black shadow-sm md:text-sm",
          )}
        >
          {config.statRight}
        </div>
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        onClick={() => {
          if (!hasTickets) return;
          onConfirm();
        }}
        disabled={!hasTickets}
        className={cn(
          "w-full h-16 rounded-2xl text-lg font-black uppercase tracking-wide transition-all md:h-[72px] md:text-xl",
          hasTickets
            ? "bg-black text-white hover:bg-black/90 active:translate-y-[2px]"
            : "bg-black/60 text-white/50 cursor-not-allowed",
        )}
      >
        {config.entryCost > 0 ? (
          <>
            Play for{" "}
            <span className="text-brand-yellow">
              {config.entryCost} Ticket{config.entryCost === 1 ? "" : "s"}
            </span>
          </>
        ) : (
          "Play"
        )}
      </button>

      {/* Tickets footer */}
      {config.entryCost > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/80 md:text-xs">
          <span>
            You have {ticketsRemaining} Ticket{ticketsRemaining === 1 ? "" : "s"}
          </span>
          <Image
            src="/assets/ticket-1.png"
            alt=""
            width={20}
            height={20}
            className="size-5 object-contain"
          />
        </div>
      )}
    </div>
  );

  // ── Mobile = bottom sheet ────────────────────────────────────────
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 px-6 pt-8 pb-8 [&>button]:hidden"
          style={{ backgroundColor: config.bg }}
        >
          <SheetTitle className="sr-only">{config.titleRest}</SheetTitle>
          <SheetDescription className="sr-only">
            {config.description}
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
          "[&>button]:hidden",
        )}
        style={{ backgroundColor: config.bg }}
      >
        <DialogTitle className="sr-only">{config.titleRest}</DialogTitle>
        <DialogDescription className="sr-only">
          {config.description}
        </DialogDescription>
        {Body}
      </DialogContent>
    </Dialog>
  );
}
