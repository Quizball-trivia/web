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

interface TrainingOfferModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPlayTraining: () => void;
  onSkip: () => void;
}

export function TrainingOfferModal({
  isOpen,
  onOpenChange,
  onPlayTraining,
  onSkip,
}: TrainingOfferModalProps) {
  const { t } = useLocale();
  const isMobile = useIsMobile();

  const Body = (
    <div className="relative font-poppins">
      <h2
        className="font-poppins mx-auto max-w-[calc(100%-112px)] text-center uppercase text-white leading-[0.95]"
        style={{ fontSize: "clamp(24px, 5.4vw, 38px)" }}
      >
        <span className="text-brand-yellow">{t("training.offerTitlePrefix")}</span>{" "}
        {t("training.offerTitleRest")}
      </h2>

      <p className="mx-auto mt-3 max-w-[30rem] text-center text-[13px] leading-snug font-bold text-white/85 sm:mt-4 sm:text-sm md:text-base">
        {t("training.offerDescription")}
      </p>

      <div className="relative mx-auto mt-4 h-32 w-full sm:h-40">
        <Image
          src="/assets/ranked-icon.webp"
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
          {t("training.offerPlayCta")}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-2xl bg-white/15 py-3 text-center text-[13px] font-black uppercase tracking-wide text-white/90 transition-transform active:scale-[0.98] sm:text-sm"
        >
          {t("training.offerSkipCta")}
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
          style={{ backgroundColor: "#38B60E" }}
        >
          <div className="absolute top-5 right-5 z-30">
            <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
          </div>
          <SheetTitle className="sr-only">{t("training.offerTitleRest")}</SheetTitle>
          <SheetDescription className="sr-only">{t("training.offerDescription")}</SheetDescription>
          {Body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[600px] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-3xl border-0 px-5 pt-7 pb-7 sm:px-8 sm:pt-8 sm:pb-8 [&>button]:hidden"
        style={{ backgroundColor: "#38B60E" }}
      >
        <div className="absolute top-6 right-6 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
        </div>
        <DialogTitle className="sr-only">{t("training.offerTitleRest")}</DialogTitle>
        <DialogDescription className="sr-only">{t("training.offerDescription")}</DialogDescription>
        {Body}
      </DialogContent>
    </Dialog>
  );
}
