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
      <AlertDialogContent className="max-w-xs bg-[#1B2F36] border-0 rounded-3xl p-6 font-fun text-center">
        <AlertDialogTitle className="text-lg font-black text-white">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-[#56707A] text-sm font-semibold">
          {description}
        </AlertDialogDescription>
        <div className="flex flex-col gap-2 mt-3">
          <AlertDialogCancel
            className="w-full py-2.5 rounded-xl bg-[#58CC02] border-b-[3px] border-b-[#46A302] text-white font-black text-sm hover:bg-[#61D806] active:border-b-[2px] active:translate-y-[1px] transition-all"
          >
            Keep Playing
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onQuit}
            className="w-full py-2.5 rounded-xl bg-transparent border-2 border-[#FF4B4B]/40 text-[#FF4B4B] font-black text-sm hover:bg-[#FF4B4B]/10 active:translate-y-[1px] transition-all"
          >
            Quit Game
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
