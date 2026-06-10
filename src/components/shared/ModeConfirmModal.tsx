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
import { useRouter } from "next/navigation";
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
    icon: "/assets/brand/ranked-hands-trophy.svg",
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
  const router = useRouter();

  if (!mode) return null;

  const config = CONFIG[mode];
  const hasTickets = ticketsRemaining >= config.entryCost;
  const needsTickets = config.entryCost > 0 && !hasTickets;
  const titleRest = t(config.titleRestKey);
  const description = t(config.descriptionKey);
  const handlePrimaryClick = () => {
    if (needsTickets) {
      onOpenChange(false);
      router.push("/store");
      return;
    }

    onConfirm();
  };

  const Body = (
    <div className="relative font-fun">
      {/* Title — centered, max-width keeps it from running into the
          close button on narrow viewports. The natural break after
          "RANKED" produces the Figma's two-line composition. */}
      <h2
        className="font-poppins mx-auto max-w-[88%] text-center uppercase text-white leading-[0.95]"
        style={{ fontSize: "clamp(26px, 6.2vw, 46px)" }}
      >
        <span className="text-brand-yellow">{t(config.titlePrefixKey)}</span>{" "}
        {titleRest}
      </h2>

      {/* Description */}
      <p className="mx-auto mt-3 max-w-[30rem] text-center text-[13px] leading-snug font-bold text-white/85 sm:mt-4 sm:text-sm md:text-base">
        {description}
      </p>

      {/* Trophy section. Mobile gets the Figma's 3-pill composition
          (top-left entry-cost, mid-right duration, bottom-left question
          count). Desktop keeps the original 2-pill layout. */}
      <div
        className={cn(
          "relative mx-auto h-40 w-full sm:h-48 md:h-60",
          // Ranked: let the trophy box overlap the button below so the yellow
          // arms tuck behind it and read as "coming out of" the button. The
          // button sits on z-20, the trophy on z-0, so the button covers the
          // arm-ends. Other modes keep the original symmetric margins.
          mode === "ranked"
            ? "mt-5 -mb-2 sm:mt-6 sm:-mb-3 md:mt-8 md:-mb-4"
            : "my-5 sm:my-6 md:my-8",
        )}
      >
        <Image
          src={config.icon}
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 320px, 60vw"
          className={cn(
            "z-0 object-contain",
            mode === "ranked" && "translate-y-4 scale-90 sm:translate-y-5 sm:scale-95 md:translate-y-6",
          )}
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
            "z-10 bg-brand-yellow text-black shadow-sm md:text-sm",
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
            "z-10 bg-brand-yellow text-black shadow-sm md:text-sm",
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
        onClick={handlePrimaryClick}
        className={cn(
          "w-full h-14 rounded-2xl text-base font-black uppercase tracking-wide transition-all sm:h-16 sm:text-lg md:h-[72px] md:text-xl",
          "relative z-20",
          needsTickets
            ? "bg-brand-yellow text-black hover:bg-brand-yellow/90 active:translate-y-[2px]"
            : hasTickets
            ? "bg-black text-white hover:bg-black/90 active:translate-y-[2px]"
            : "bg-black/60 text-white/50 cursor-not-allowed",
        )}
      >
        {needsTickets ? (
          t("modeConfirm.buyTickets")
        ) : isMobile || config.entryCost === 0 ? (
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
            {needsTickets
              ? t("modeConfirm.notEnoughTickets")
              : t(
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
          // Fixed 600px on desktop (restores the original card size so the X
          // button and title sit right), shrinking only when the viewport is
          // genuinely narrower than that (keeps a 1rem gutter on small screens).
          "w-[600px] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-3xl border-0",
          "px-5 pt-7 pb-7 sm:px-8 sm:pt-8 sm:pb-8",
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
