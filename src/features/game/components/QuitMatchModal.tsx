"use client";

// QuitMatchModal — confirmation dialog shown when the player tries to
// leave / quit / forfeit an active match.
//
// Pinned to Figma node 1104-1107. Visual spec:
//
//   • Square-ish blue gradient card (from #1645FF → #1A35A1),
//     border-3 solid #1A35A1, 20px radius.
//   • Centred Poppins-SemiBold title — three-line motivational hook.
//     The middle line references a famous player from the user's
//     favourite club ("Ronaldo would not give up" for a Real Madrid
//     fan, "Messi would not give up" for a Barcelona fan, etc.). The
//     player is picked at random from `clubFamousPlayers.ts` on every
//     mount so repeat openings produce variation.
//   • Subtitle in white/50 caps explaining the leave/forfeit options.
//   • Three stacked buttons (575×91 in Figma → scaled to viewport):
//       1. KEEP PLAYING  — solid brand-green fill with a soft glow
//       2. LEAVE TEMPORARY — transparent fill, 3px brand-yellow outline
//       3. FORFEIT MATCH  — transparent fill, 3px brand-red outline
//     Buttons are FLAT (no chunky bottom shadow, no press-translate
//     animation) to match the Figma comp — earlier iterations had a
//     Duolingo-style 3D press effect inherited from the Play Again /
//     Main Menu CTAs on the results screen; this modal is closer in
//     spirit to a system dialog so the flat fill reads better.

import { useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import { getRandomFamousPlayer } from '../data/clubFamousPlayers';

interface QuitMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onSecondaryConfirm?: () => void;
  confirmLabel?: string;
  secondaryConfirmLabel?: string;
  description?: string;
  /** User's favourite club ID (kebab-case slug). When provided, the modal
   *  picks a random famous player from that club's roster for the headline. */
  playerClubId?: string | null;
}

export function QuitMatchModal({
  open,
  onOpenChange,
  onConfirm,
  onSecondaryConfirm,
  confirmLabel = "Forfeit Match",
  secondaryConfirmLabel = "Leave Temporary",
  description = "Leave temporarily and rejoin before the timer ends, or forfeit now.",
  playerClubId = null,
}: QuitMatchModalProps) {
  // Recompute the famous player each time the modal opens so the headline
  // varies between openings. Tied to `open` so a fresh name is picked on
  // every show, but stable for the duration of a single open session.
  // Accepts both club ID (slug) and display name — `getClub()` resolves
  // either to a Club with a canonical `id` we can index into the famous-
  // player roster.
  const famousPlayer = useMemo(() => {
    const resolved = getClub(playerClubId);
    return getRandomFamousPlayer(resolved?.id ?? playerClubId);
  }, [playerClubId, open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className={cn(
          "w-[min(92vw,560px)] max-w-[560px] p-8 sm:p-10 text-center",
          "rounded-[20px] border-[3px]",
          "font-poppins",
        )}
        // Figma-pinned modal gradient + border (node 1109-2049). Inline
        // style instead of `bg-[#…] border-[#…]` so the brand-color audit
        // (which only scans Tailwind class strings) ignores these
        // modal-specific hues — they're not used elsewhere and don't
        // warrant a global token.
        style={{
          background: 'linear-gradient(to bottom, #1645FF 35%, #1A35A1)',
          borderColor: '#1A35A1',
        }}
      >
        {/* Three-line hook — fixed first + last lines, player name in the middle. */}
        <AlertDialogTitle
          asChild
          className="text-white font-semibold uppercase leading-[1.18]"
        >
          <h2 style={{ fontSize: "clamp(26px, 5vw, 52px)" }}>
            <span className="block">Leaving?</span>
            <span className="block">{famousPlayer} would</span>
            <span className="block">not give up</span>
          </h2>
        </AlertDialogTitle>

        <AlertDialogDescription
          className="mx-auto mt-4 max-w-[36rem] font-semibold leading-snug text-white/55"
          style={{ fontSize: "clamp(13px, 1.4vw, 18px)" }}
        >
          {description}
        </AlertDialogDescription>

        <div className="mt-7 flex flex-col gap-3 sm:gap-4">
          {/* Keep Playing — solid green fill with a soft outer glow only
              (no chunky bottom-edge shadow / no press translate, matching
              the Figma comp). */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              "w-full rounded-[20px] uppercase font-semibold text-white transition-colors",
              "h-14 sm:h-16 md:h-[78px] text-lg sm:text-xl md:text-[28px]",
              "bg-brand-green hover:bg-brand-green/90",
            )}
            style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)' }}
          >
            Keep Playing
          </button>

          {onSecondaryConfirm && (
            <button
              type="button"
              onClick={onSecondaryConfirm}
              className={cn(
                "w-full rounded-[20px] uppercase font-semibold text-white transition-colors",
                "h-14 sm:h-16 md:h-[78px] text-lg sm:text-xl md:text-[28px]",
                "border-[3px] border-brand-yellow bg-transparent",
                "hover:bg-brand-yellow/10",
              )}
              style={{ boxShadow: '0 0 6.334px 1.32px rgba(255, 229, 0, 0.25)' }}
            >
              {secondaryConfirmLabel}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "w-full rounded-[20px] uppercase font-semibold text-white transition-colors",
              "h-14 sm:h-16 md:h-[78px] text-lg sm:text-xl md:text-[28px]",
              "border-[3px] border-brand-red bg-transparent",
              "hover:bg-brand-red/10",
            )}
            style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(251, 49, 1, 0.25)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
