"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
      <AlertDialogContent className="max-w-xs bg-surface-card border-0 rounded-3xl p-6 font-fun text-center">
        <AlertDialogTitle className="text-lg font-black text-white">
          {resolvedTitle}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-brand-slate text-sm font-semibold">
          {resolvedDescription}
        </AlertDialogDescription>
        <div className="flex flex-col gap-2 mt-3">
          <AlertDialogCancel
            className="w-full py-2.5 rounded-xl bg-brand-green-light border-b-[3px] border-b-[#46A302] text-white font-black text-sm hover:bg-brand-green-light active:border-b-[2px] active:translate-y-[1px] transition-all"
          >
            {t("dailyQuit.keepPlaying")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onQuit}
            className="w-full py-2.5 rounded-xl bg-transparent border-2 border-brand-red-soft/40 text-brand-red-soft font-black text-sm hover:bg-brand-red-soft/10 active:translate-y-[1px] transition-all"
          >
            {t("dailyQuit.quitGame")}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
