"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  title = "Quit Game?",
  description = "Are you sure you want to quit? Your progress will be lost.",
  onQuit,
}: QuitGameDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xs bg-surface-card border-0 rounded-3xl p-6 font-fun text-center">
        <AlertDialogTitle className="text-lg font-black text-white">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-brand-slate text-sm font-semibold">
          {description}
        </AlertDialogDescription>
        <div className="flex flex-col gap-2 mt-3">
          <AlertDialogCancel
            className="w-full py-2.5 rounded-xl bg-brand-green-light border-b-[3px] border-b-[#46A302] text-white font-black text-sm hover:bg-brand-green-light active:border-b-[2px] active:translate-y-[1px] transition-all"
          >
            Keep Playing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onQuit}
            className="w-full py-2.5 rounded-xl bg-transparent border-2 border-brand-red-soft/40 text-brand-red-soft font-black text-sm hover:bg-brand-red-soft/10 active:translate-y-[1px] transition-all"
          >
            Quit Game
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
