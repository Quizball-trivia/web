'use client';

import { X } from 'lucide-react';
import { TD } from '../lib/copy';
import { BsButton, BsDialog } from './ui';

export function NoTicketsModal({ onSolo, onClose }: { onSolo: () => void; onClose: () => void }) {
  return (
    <BsDialog title={TD.noTicketsTitle} onClose={onClose} className="flex flex-col gap-2.5 pt-6 text-center">
      <button type="button" onClick={onClose} className="absolute right-3 top-3 text-white" aria-label={TD.close}>
        <X size={16} />
      </button>
      <h4 className="bs-headline">{TD.noTicketsTitle}</h4>
      <p className="bs-text mb-1 text-[12.5px] leading-relaxed text-[var(--bs-text-2)]">{TD.noTicketsBody}</p>
      <BsButton onClick={onSolo}>{TD.noTicketsSolo}</BsButton>
      <BsButton disabled>{TD.noTicketsRanked}</BsButton>
      <span className="bs-text text-[11px] text-[var(--bs-text-3)]">{TD.noTicketsFoot}</span>
    </BsDialog>
  );
}
