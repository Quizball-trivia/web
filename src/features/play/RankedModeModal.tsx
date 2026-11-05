"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Dumbbell, Swords } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ModalCloseButton } from "@/components/shared/ModalCloseButton";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { colors } from "@/lib/colors";

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

interface RankedModeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Members queue for a real opponent; guests get the sign-in dialog. */
  onFindOpponents: () => void;
  /** Members start the training match in place; guests go to the public Ranked page. */
  onTraining: () => void;
}

/** Ranked mode dialog: same shape as the Auction one — hero, title, one-line rules, primary CTA, training. */
export function RankedModeModal({ isOpen, onOpenChange, onFindOpponents, onTraining }: RankedModeModalProps) {
  const { t } = useLocale();
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-w-md w-[92vw] rounded-[24px] border-0", "!flex flex-col !gap-0 px-6 pt-8 pb-6 sm:px-8", "[&>button]:hidden")}
        style={{ backgroundColor: colors.green.base }}
      >
        <div className="absolute top-5 right-5 z-30">
          <ModalCloseButton onClose={() => onOpenChange(false)} className="!static" />
        </div>
        <div className="mb-2 flex justify-center">
          <Image src="/assets/brand/ranked-hands-trophy.svg" alt="" width={257} height={294} className="h-28 w-auto object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)] sm:h-32" />
        </div>
        <DialogTitle className="text-center text-3xl sm:text-4xl uppercase text-brand-yellow leading-[0.95]" style={poppins}>
          {t("play.rankedMatch")}
        </DialogTitle>
        <DialogDescription className="mx-auto mt-3 mb-5 max-w-[22rem] text-center text-[13px] sm:text-sm font-medium leading-snug text-white/90">
          {t("play.rankedModalDescription")}
        </DialogDescription>
        <div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onFindOpponents}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand-yellow uppercase text-black transition-colors hover:bg-brand-yellow-deep"
            style={{ fontSize: "clamp(15px, 2.4vw, 18px)", ...poppins }}
          >
            <Swords className="size-5" strokeWidth={2.5} />
            {t("play.rankedFindOpponents")}
          </motion.button>
          <button
            type="button"
            onClick={onTraining}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-black/25 uppercase text-white transition-colors hover:bg-black/35"
            style={{ fontSize: "clamp(14px, 2.2vw, 16px)", ...poppins }}
          >
            <Dumbbell className="size-5" strokeWidth={2.5} />
            {t("play.guestDemoCta")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
