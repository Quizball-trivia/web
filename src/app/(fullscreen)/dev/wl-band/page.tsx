'use client';

// Weekend League band — design options. Each variant is shown in page context
// (band, then a stand-in for the Ranked card below it) so the hierarchy is
// judgeable. All of them link to the Weekend League tab inside Events.

import { WeekendLeagueStatusBand } from '@/features/weekend-league/components/WeekendLeagueStatusBand';
import {
  LEAGUE_TAB_HREF,
  VariantBigNumber,
  VariantMinimalRail,
  VariantMinimalRailNavy,
  VariantProgressStrip,
  VariantTicketLedge,
} from '@/features/weekend-league/components/StatusBandVariants';
import { poppins } from '@/features/weekend-league/constants';
import { colors } from '@/lib/colors';

const OPTIONS = [
  {
    key: 'D',
    name: 'Minimal rail — solid brand blue',
    note: 'The rail is brand blue (#1645FF). QP stays lime, kickoff stays yellow.',
    render: () => <VariantMinimalRail />,
  },
  {
    key: 'D2',
    name: 'Minimal rail — navy with blue edge',
    note: 'Same row, quieter: brand blue as the left marker and glow instead of the fill.',
    render: () => <VariantMinimalRailNavy />,
  },
  {
    key: 'A',
    name: 'Progress strip',
    note: 'Identity + one bar + one action. No step diagram, no QP-to-go caption.',
    render: () => <VariantProgressStrip />,
  },
  {
    key: 'B',
    name: 'Ticket ledge',
    note: 'Framed as a ticket you are filling up. Leads with what is missing.',
    render: () => <VariantTicketLedge />,
  },
  {
    key: 'C',
    name: 'Big number',
    note: 'The QP gap is the hero; everything else is caption-sized.',
    render: () => <VariantBigNumber />,
  },
  {
    key: 'E',
    name: 'Current (full journey)',
    note: 'The three-step version — most explanatory, most text.',
    render: () => <WeekendLeagueStatusBand leagueHref={LEAGUE_TAB_HREF} />,
  },
];

function RankedStandIn() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <div
        className="flex h-[120px] items-center justify-between rounded-[10px] px-6"
        style={{ backgroundColor: colors.green.base }}
      >
        <span className="text-2xl uppercase text-white" style={poppins}>
          Ranked match
        </span>
        <span className="text-sm uppercase text-white/70" style={poppins}>
          (unchanged card below the band)
        </span>
      </div>
    </div>
  );
}

export default function DevWeekendLeagueBandPage() {
  return (
    <div className="min-h-screen bg-surface-page pb-24 font-fun">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl uppercase text-white" style={poppins}>
          Weekend League band — options
        </h1>
        <p className="mt-2 text-sm text-white/55" style={poppins}>
          Each option is clickable and goes to the Weekend League tab in Events.
          Resize to ~430px to check mobile.
        </p>
      </div>

      <div className="space-y-14">
        {OPTIONS.map((option) => (
          <section key={option.key}>
            <div className="mx-auto max-w-5xl px-4 pb-3">
              <div className="text-sm uppercase tracking-wide text-brand-green-light" style={poppins}>
                Option {option.key} — {option.name}
              </div>
              <p className="mt-1 text-[13px] text-white/45" style={poppins}>
                {option.note}
              </p>
            </div>
            <div className="mx-auto max-w-5xl px-4">{option.render()}</div>
            <RankedStandIn />
          </section>
        ))}
      </div>
    </div>
  );
}
