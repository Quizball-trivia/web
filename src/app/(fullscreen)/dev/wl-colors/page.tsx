'use client';

// Weekend League rail — color options. Same layout every time; only the color
// treatment changes. Each is shown above a stand-in for the green Ranked card,
// since that adjacency is what the color has to survive.

import {
  RailBlack,
  RailBlackOrange,
  RailBlue,
  RailCharcoal,
  RailGold,
  RailLime,
  RailNavyGradient,
  RailOrange,
  RailOrangeDeep,
  RailPurple,
} from '@/features/weekend-league/components/RailColorVariants';
import { poppins } from '@/features/weekend-league/constants';

const OPTIONS = [
  { key: '8', name: 'Event orange', note: 'The #FF6C0A token already used for event modes. Dark text.', render: () => <RailOrange /> },
  { key: '9', name: 'Burnt orange', note: 'Deeper and warmer, white text, yellow QP fill.', render: () => <RailOrangeDeep /> },
  { key: '10', name: 'Near-black + orange edge', note: 'Status rail with an event accent instead of a full orange slab.', render: () => <RailBlackOrange /> },
  { key: '1', name: 'Brand blue', note: 'Current. Ties to the navbar / score pill.', render: () => <RailBlue /> },
  { key: '2', name: 'Purple', note: 'Auction-card purple. Premium, distinct from ranked green.', render: () => <RailPurple /> },
  { key: '3', name: 'Near-black + lime edge', note: 'Reads as a status rail rather than another mode card.', render: () => <RailBlack /> },
  { key: '4', name: 'Lime', note: 'Qualification color as the surface. Loudest option.', render: () => <RailLime /> },
  { key: '5', name: 'Navy → blue gradient', note: 'Quieter blue; depth without a flat slab.', render: () => <RailNavyGradient /> },
  { key: '6', name: 'Gold', note: 'Frames the league as the prize event.', render: () => <RailGold /> },
  { key: '7', name: 'Charcoal + blue glow', note: 'Most restrained. Lets Ranked dominate.', render: () => <RailCharcoal /> },
];

export default function DevRailColorsPage() {
  return (
    <div className="min-h-screen bg-surface-page pb-24 font-fun">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl uppercase text-white" style={poppins}>
          Weekend League rail — colors
        </h1>
        <p className="mt-2 text-sm text-white/55" style={poppins}>
          Same layout throughout; only the color changes.
        </p>
      </div>

      <div className="mx-auto max-w-5xl space-y-12 px-4">
        {OPTIONS.map((option) => (
          <section key={option.key}>
            <div className="pb-3">
              <div className="text-sm uppercase tracking-wide text-brand-green-light" style={poppins}>
                {option.key} — {option.name}
              </div>
              <p className="mt-1 text-[13px] text-white/45" style={poppins}>
                {option.note}
              </p>
            </div>
            {option.render()}
          </section>
        ))}
      </div>
    </div>
  );
}
