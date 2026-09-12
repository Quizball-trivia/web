"use client";

// TrainingOfferModal — shown when a new player (0 placement matches) taps the
// ranked card for the first time: play a guided training match vs CoachBot
// first, or skip straight into the ranked qualifier flow.

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
import { ModalCloseButton } from "@/components/shared/ModalCloseButton";
import { useLocale } from "@/contexts/LocaleContext";
import { AUCTION_PURPLE } from "@/features/auction/constants/auction.constants";
import { footballGridAssetUrl } from "@/lib/football-grid/assets";
import type { TrainingGame } from "../hooks/useTrainingCompletion";

const OFFER_BY_GAME = {
  ranked: { art: "/assets/ranked-icon.webp", titleRest: "training.offerTitleRest", description: "training.offerDescription", playCta: "training.offerPlayCta", skipCta: "training.offerSkipCta", background: "#38B60E" },
  auction: { art: "/assets/auction-card-icon.webp", titleRest: "training.offerAuctionTitleRest", description: "training.offerAuctionDescription", playCta: "training.offerAuctionPlayCta", skipCta: "training.offerAuctionSkipCta", background: AUCTION_PURPLE },
  // Same deeper red as the Tic Tac Toe dialog so white text keeps contrast.
  grid: { art: footballGridAssetUrl("/assets/football-grid/card-icon.png") ?? "/assets/football-grid/card-icon.png", titleRest: "training.offerGridTitleRest", description: "training.offerGridDescription", playCta: "training.offerGridPlayCta", skipCta: "training.offerGridSkipCta", background: "#C13333" },
} as const;

interface TrainingOfferModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayTraining: () => void;
  onSkip: () => void;
  /** Which tutorial is offered — art, copy and colour follow the game. */
  game?: TrainingGame;
}

export function TrainingOfferModal({
  isOpen,
  onOpenChange,
  onPlayTraining,
  onSkip,
  game = "ranked",
}: TrainingOfferModalProps) {
  const { t } = useLocale();
  const isMobile = useIsMobile();
  const offer = OFFER_BY_GAME[game];

  const Body = (
    <div className="relative font-poppins">
      <h2
        className="font-poppins mx-auto max-w-[calc(100%-112px)] text-center uppercase text-white leading-[0.95]"
        style={{ fontSize: "clamp(24px, 5.4vw, 38px)" }}
      >
        <span className="text-brand-yellow">{t("training.offerTitlePrefix")}</span>{" "}
        {t(offer.titleRest)}
      </h2>

      <p className="mx-auto mt-3 max-w-[30rem] text-center text-[13px] leading-snug font-bold text-white/85 sm:mt-4 sm:text-sm md:text-base">
        {t(offer.description)}
      </p>

      <div className="relative mx-auto mt-4 h-32 w-full sm:h-40">
        <Image
          src={offer.art}
          alt=""
          fill
          className="object-contain opacity-90"
        />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onPlayTraining}
          className="w-full rounded-2xl bg-black py-3.5 text-center text-sm font-black uppercase tracking-wide text-white transition-transform active:scale-[0.98] sm:text-base"
        >
          {t(offer.playCta)}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-2xl bg-white/15 py-3 text-center text-[13px] font-black uppercase tracking-wide text-white/90 transition-transform active:scale-[0.98] sm:text-sm"
        >
          {t(offer.skipCta)}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-0 px-6 pt-8 pb-8 [&>button]:hidden"
          style={{ backgroundColor: offer.background }}
        >
          <div className="absolute top-5 right-5 z-30">
            <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
          </div>
          <SheetTitle className="sr-only">{t(offer.titleRest)}</SheetTitle>
          <SheetDescription className="sr-only">{t(offer.description)}</SheetDescription>
          {Body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[600px] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-3xl border-0 px-5 pt-7 pb-7 sm:px-8 sm:pt-8 sm:pb-8 [&>button]:hidden"
        style={{ backgroundColor: offer.background }}
      >
        <div className="absolute top-6 right-6 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
        </div>
        <DialogTitle className="sr-only">{t(offer.titleRest)}</DialogTitle>
        <DialogDescription className="sr-only">{t(offer.description)}</DialogDescription>
        {Body}
      </DialogContent>
    </Dialog>
  );
}
