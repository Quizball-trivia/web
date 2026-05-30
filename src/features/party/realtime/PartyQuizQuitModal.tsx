'use client';

/**
 * Thin wrapper over QuitMatchModal with the party-quiz copy + the
 * "close modal first, then call the parent handler" sequencing that
 * the screen previously did inline.
 */

import { QuitMatchModal } from '@/components/match/QuitMatchModal';
import { useLocale } from '@/contexts/LocaleContext';

interface PartyQuizQuitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuit: () => void;
  onForfeit: () => void;
}

export function PartyQuizQuitModal({ open, onOpenChange, onQuit, onForfeit }: PartyQuizQuitModalProps) {
  const { t } = useLocale();
  return (
    <QuitMatchModal
      open={open}
      onOpenChange={onOpenChange}
      description={t('quitMatch.partyDescription')}
      onSecondaryConfirm={() => {
        onOpenChange(false);
        onQuit();
      }}
      onConfirm={() => {
        onOpenChange(false);
        onForfeit();
      }}
    />
  );
}
