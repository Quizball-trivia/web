"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

interface QuitGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuit: () => void;
  title?: string;
  description?: string;
}

export function QuitGameDialog({
  open,
  onOpenChange,
  title,
  description,
  onQuit,
}: QuitGameDialogProps) {
  const { t } = useLocale();
  const resolvedTitle = title ?? t("dailyQuit.title");
  const resolvedDescription = description ?? t("dailyQuit.description");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="w-[min(92vw,440px)] max-w-[440px] p-8 sm:p-10 text-center rounded-[20px] border-[3px] font-poppins shadow-none"
        style={{
          background: 'linear-gradient(to bottom, #1645FF 35%, #1A35A1)',
          borderColor: '#1A35A1',
        }}
      >
        <AlertDialogTitle className="text-white font-semibold uppercase text-2xl sm:text-3xl">
          {resolvedTitle}
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-3 text-white/60 text-sm sm:text-base font-medium">
          {resolvedDescription}
        </AlertDialogDescription>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)' }}
            className={cn(
              "w-full h-14 rounded-[20px] uppercase font-poppins font-semibold text-white text-base transition-colors",
              "bg-brand-green hover:bg-brand-green-deep",
            )}
          >
            {t("dailyQuit.keepPlaying")}
          </button>
          <button
            type="button"
            onClick={onQuit}
            className={cn(
              "w-full h-14 rounded-[20px] uppercase font-poppins font-semibold text-white text-base transition-colors",
              "border-[3px] border-brand-red bg-transparent hover:bg-brand-red/10",
            )}
          >
            {t("dailyQuit.quitGame")}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
