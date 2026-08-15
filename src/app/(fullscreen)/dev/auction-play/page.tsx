'use client';

// Playable mock auction (vs bots) for testing the full 7-a-side flow end to end:
// matchmaking → formation → clue reveal (scouting snapshots, snapshot-by-snapshot)
// → bidding → reveal → results. No backend needed.
import { LocaleProvider } from '@/contexts/LocaleContext';
import { AuctionFlowScreen } from '@/features/auction/AuctionFlowScreen';

export default function DevAuctionPlayPage() {
  return (
    <LocaleProvider>
      <AuctionFlowScreen username="You" avatarSeed="avatar-1" mode="mock" />
    </LocaleProvider>
  );
}
