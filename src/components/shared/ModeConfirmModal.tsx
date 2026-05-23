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
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";

interface ModeConfirmModalProps {
  mode: "ranked" | "friendly" | "solo" | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  ticketsRemaining?: number;
}

// Per-mode visual + content. Background colour and i18n key prefixes are
// part of the config; copy is resolved via t() at render time.
const CONFIG = {
  ranked: {
    bg: "#38B60E", // vivid green
    titlePrefixKey: "modeConfirm.rankedTitlePrefix",
    titleRestKey: "modeConfirm.rankedTitleRest",
    descriptionKey: "modeConfirm.rankedDescription",
    icon: "/assets/ranked-icon.webp",
    statLeftKey: "modeConfirm.rankedStatLeft",
    statRightKey: "modeConfirm.rankedStatRight",
    entryCost: 1,
  },
  friendly: {
    bg: "#1645FF",
    titlePrefixKey: "modeConfirm.friendlyTitlePrefix",
    titleRestKey: "modeConfirm.friendlyTitleRest",
    descriptionKey: "modeConfirm.friendlyDescription",
    icon: "/assets/friendly_match-icon.webp",
    statLeftKey: "modeConfirm.friendlyStatLeft",
    statRightKey: "modeConfirm.friendlyStatRight",
    entryCost: 0,
  },
  solo: {
    bg: "#7C3AED", // violet for distinction
    titlePrefixKey: "modeConfirm.soloTitlePrefix",
    titleRestKey: "modeConfirm.soloTitleRest",
    descriptionKey: "modeConfirm.soloDescription",
    icon: "/assets/ranked-icon.webp",
    statLeftKey: "modeConfirm.soloStatLeft",
    statRightKey: "modeConfirm.soloStatRight",
    entryCost: 0,
  },
} as const satisfies Record<string, {
  bg: string;
  titlePrefixKey: MessageKey;
  titleRestKey: MessageKey;
  descriptionKey: MessageKey;
  icon: string;
  statLeftKey: MessageKey;
  statRightKey: MessageKey;
  entryCost: number;
}>;

export function ModeConfirmModal({
  mode,
  isOpen,
  onOpenChange,
  onConfirm,
  ticketsRemaining = 0,
}: ModeConfirmModalProps) {
  const { t } = useLocale();
  const isMobile = useIsMobile();

  if (!mode) return null;

  const config = CONFIG[mode];
  const hasTickets = ticketsRemaining >= config.entryCost;
  const titleRest = t(config.titleRestKey);
  const description = t(config.descriptionKey);

  const Body = (
    <div className="relative font-fun">
      {/* Title — centered, max-width keeps it from running into the
          close button on narrow viewports. The natural break after
          "RANKED" produces the Figma's two-line composition. */}
      <h2
        className="font-poppins mx-auto max-w-[80%] text-center uppercase text-white leading-[0.95]"
        style={{ fontSize: "clamp(28px, 4.6vw, 52px)" }}
      >
        <span className="text-brand-yellow">{t(config.titlePrefixKey)}</span>{" "}
        {titleRest}
      </h2>

      {/* Description */}
      <p className="mx-auto mt-4 max-w-[30rem] text-center text-sm leading-snug font-bold text-white/85 md:text-base">
        {description}
      </p>

      {/* Trophy section. Mobile gets the Figma's 3-pill composition
          (top-left entry-cost, mid-right duration, bottom-left question
          count). Desktop keeps the original 2-pill layout. */}
      <div className="relative mx-auto my-6 h-48 w-full md:my-8 md:h-60">
        <Image
          src={config.icon}
          alt=""
          fill
          priority
          className="object-contain"
        />

        {/* Mobile-only: top-left "PLAY FOR N TICKETS" pill from Figma */}
        {isMobile && config.entryCost > 0 && (
          <div
            className={cn(
              "absolute left-0 top-[6%]",
              "rounded-full px-4 py-2 text-xs font-black uppercase whitespace-nowrap",
              "bg-brand-yellow text-black shadow-sm",
            )}
          >
            {t(
              config.entryCost === 1 ? "modeConfirm.playForTicket" : "modeConfirm.playForTickets",
              { count: config.entryCost },
            )}
          </div>
        )}

        {/* Mid-right pill (e.g. "DURATION 5 MIN") — slightly higher than
            centre on desktop to match the original composition. */}
        <div
          className={cn(
            "absolute right-0 rounded-full px-4 py-2 text-xs font-black uppercase whitespace-nowrap",
            "bg-brand-yellow text-black shadow-sm md:text-sm",
            isMobile ? "top-[42%]" : "top-[28%]",
          )}
        >
          {t(config.statRightKey)}
        </div>

        {/* Left pill (e.g. "12-18 QUESTIONS"). Mobile pushes to the
            bottom-left to mirror Figma; desktop keeps it vertically
            centred next to the trophy. */}
        <div
          className={cn(
            "absolute left-0 rounded-full px-4 py-2 text-xs font-black uppercase whitespace-nowrap",
            "bg-brand-yellow text-black shadow-sm md:text-sm",
            isMobile ? "bottom-[10%]" : "top-1/2 -translate-y-1/2",
          )}
        >
          {t(config.statLeftKey)}
        </div>
      </div>

      {/* Primary CTA. Mobile = clean "PLAY" (cost shown in the top-left
          pill); desktop keeps the original "PLAY FOR N TICKETS" wording. */}
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
        {isMobile || config.entryCost === 0 ? (
          t("common.play")
        ) : (
          <span className="[&_strong]:font-inherit [&_strong]:text-brand-yellow">
            {t(
              config.entryCost === 1 ? "modeConfirm.playForTicket" : "modeConfirm.playForTickets",
              { count: config.entryCost },
            )}
          </span>
        )}
      </button>

      {/* Tickets footer */}
      {config.entryCost > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider text-white/80 md:text-xs">
          <span>
            {t(
              ticketsRemaining === 1 ? "modeConfirm.youHaveTicket" : "modeConfirm.youHaveTickets",
              { count: ticketsRemaining },
            )}
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
          <div className="absolute top-5 right-5 z-30">
            <ModalCloseButton
              onClose={() => onOpenChange(false)}
              className="!static"
            />
          </div>
          <SheetTitle className="sr-only">{titleRest}</SheetTitle>
          <SheetDescription className="sr-only">
            {description}
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
        <div className="absolute top-6 right-6 z-30">
          <ModalCloseButton
            onClose={() => onOpenChange(false)}
            className="!static"
          />
        </div>
        <DialogTitle className="sr-only">{titleRest}</DialogTitle>
        <DialogDescription className="sr-only">
          {description}
        </DialogDescription>
        {Body}
      </DialogContent>
    </Dialog>
  );
}
