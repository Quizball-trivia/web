"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';

interface QuitMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onSecondaryConfirm?: () => void;
  confirmLabel?: string;
  secondaryConfirmLabel?: string;
  description?: string;
}

export function QuitMatchModal({
  open,
  onOpenChange,
  onConfirm,
  onSecondaryConfirm,
  confirmLabel = "Leave Match",
  secondaryConfirmLabel = "Leave Temporarily",
  description = "You'll lose this match if you leave now.",
}: QuitMatchModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xs bg-[#1a1f2e] border-0 border-b-4 border-b-white/10 rounded-3xl p-6 font-fun text-center">
        {/* Game-themed illustration: exit door with ball */}
        <div className="flex justify-center mb-2">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-white/60">
            {/* Door frame */}
            <rect x="22" y="12" width="36" height="52" rx="4" stroke="currentColor" strokeWidth="2.5" fill="none" />
            {/* Open door */}
            <path d="M22 14 L10 22 L10 58 L22 64" stroke="currentColor" strokeWidth="2.5" fill="rgba(255,255,255,0.03)" />
            {/* Door handle */}
            <circle cx="48" cy="40" r="2.5" fill="currentColor" />
            {/* Football rolling away */}
            <circle cx="8" cy="62" r="6" stroke="#22c55e" strokeWidth="2" fill="none" />
            <path d="M4 59 L8 62 L12 59" stroke="#22c55e" strokeWidth="1.5" />
            <path d="M5 65 L8 62 L11 65" stroke="#22c55e" strokeWidth="1.5" />
            {/* Motion lines */}
            <line x1="18" y1="62" x2="22" y2="62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            <line x1="16" y1="58" x2="20" y2="58" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
          </svg>
        </div>

        <AlertDialogTitle className="text-xl font-black text-white">
          Are you sure?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-white/50 text-sm font-semibold">
          {description}
        </AlertDialogDescription>

        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 rounded-2xl bg-emerald-500 border-b-4 border-b-emerald-600 text-white font-extrabold text-sm hover:bg-emerald-400 active:border-b-2 active:translate-y-[2px] transition-all"
          >
            Keep Playing
          </button>
          {onSecondaryConfirm ? (
            <button
              onClick={onSecondaryConfirm}
              className="w-full py-3 rounded-2xl bg-transparent border-2 border-amber-500/40 text-amber-300 font-extrabold text-sm hover:bg-amber-500/10 active:translate-y-[1px] transition-all"
            >
              {secondaryConfirmLabel}
            </button>
          ) : null}
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-2xl bg-transparent border-2 border-red-500/40 text-red-400 font-extrabold text-sm hover:bg-red-500/10 active:translate-y-[1px] transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
