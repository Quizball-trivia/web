'use client';

/**
 * Thin wrapper over QuitMatchModal with the party-quiz copy + the
 * "close modal first, then call the parent handler" sequencing that
 * the screen previously did inline.
 */

import { QuitMatchModal } from '@/components/match/QuitMatchModal';

interface PartyQuizQuitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuit: () => void;
  onForfeit: () => void;
}

export function PartyQuizQuitModal({ open, onOpenChange, onQuit, onForfeit }: PartyQuizQuitModalProps) {
  return (
    <QuitMatchModal
      open={open}
      onOpenChange={onOpenChange}
      description="Leave temporarily and rejoin before the timer ends, or forfeit the party quiz now."
      secondaryConfirmLabel="Leave Temporarily"
      onSecondaryConfirm={() => {
        onOpenChange(false);
        onQuit();
      }}
      confirmLabel="Forfeit Match"
      onConfirm={() => {
        onOpenChange(false);
        onForfeit();
      }}
    />
  );
}
