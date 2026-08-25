'use client';

// Dev harness for the auction mode modal + its new Rules modal. No backend.
import { useState } from 'react';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { AuctionModeModal } from '@/features/auction/components/AuctionModeModal';

export default function DevAuctionRulesPage() {
  const [open, setOpen] = useState(true);
  return (
    <LocaleProvider>
      <div className="flex min-h-screen items-center justify-center bg-black">
        <button
          type="button"
          className="rounded-xl bg-white/10 px-6 py-3 font-bold text-white"
          onClick={() => setOpen(true)}
        >
          Open auction modal
        </button>
        <AuctionModeModal isOpen={open} onOpenChange={setOpen} onFindOnline={() => {}} />
      </div>
    </LocaleProvider>
  );
}
