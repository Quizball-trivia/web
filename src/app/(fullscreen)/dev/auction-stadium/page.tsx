'use client';

// Clean full-screen preview of the EXPERIMENTAL 3-stadium auction layout.
// The actual preview (mock data + state switcher) lives in StadiumBiddingPreview
// so /auction?stadium=1 can render the exact same thing.

import { StadiumBiddingPreview } from '@/features/auction/components/bidding/StadiumBiddingPreview';

export default function DevAuctionStadiumPage() {
  return <StadiumBiddingPreview />;
}
