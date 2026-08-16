'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info, X, Zap } from 'lucide-react';
import { findClubByName } from '@/lib/clubs';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import {
  CLUB_CHEM_THRESHOLDS,
  LEAGUE_CHEM_THRESHOLDS,
  NATION_CHEM_THRESHOLDS,
  MAX_SQUAD_CHEMISTRY,
  getSquadChemistryBreakdown,
  type ChemDimension,
  type ChemLink,
} from '../../data';
import { getLeague } from '../../data/leagues';
import type { MessageKey } from '@/lib/i18n/messages';
import type { AuctionTeam } from '../../types';
import { poppins, withAlpha } from '../../constants/auction.constants';
import { ClubCrest } from './ClubCrest';
import { LeagueLogo } from './LeagueLogo';
import { FlagChip } from './FlagChip';

/** Colour + label for a chemistry total, out of MAX_SQUAD_CHEMISTRY (21). */
export function chemistryTier(total: number): { label: string; color: string } {
  if (total >= 17) return { label: 'Elite', color: '#58CC02' };
  if (total >= 11) return { label: 'Strong', color: '#85E000' };
  if (total >= 5) return { label: 'Building', color: '#FFE500' };
  return { label: 'Low', color: '#8A97A5' };
}

const DIMENSION_COLOR: Record<ChemDimension, string> = {
  club: '#1CB0F6',
  league: '#C77DFF',
  nation: '#FF9600',
};

const DIMENSION_LABEL_KEY: Record<ChemDimension, MessageKey> = {
  club: 'auctionGame.chemClub',
  league: 'auctionGame.chemLeague',
  nation: 'auctionGame.chemNation',
};

/** Three dots filled up to `tier` (0…3). */
function TierDots({ tier, color }: { tier: number; color: string }) {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-[6px] rounded-full"
          style={{ backgroundColor: i < tier ? color : 'rgba(255,255,255,0.16)' }}
        />
      ))}
    </span>
  );
}

/** The icon for a link: crest / league badge / flag. */
function LinkIcon({ link }: { link: ChemLink }) {
  if (link.dimension === 'club') return <ClubCrest club={link.key} size={18} />;
  if (link.dimension === 'league') return <LeagueLogo league={link.key} size={18} />;
  return <FlagChip country={link.key} width={20} height={14} />;
}

/** The human-facing label for a link key. */
function linkLabel(link: ChemLink): string {
  if (link.dimension === 'club') return findClubByName(link.key)?.label ?? link.key;
  if (link.dimension === 'league') return getLeague(link.key)?.abbr ?? link.key;
  return link.key;
}

/** Compact "⚡ 24/33 · ×2.4" badge with a strength colour. */
export function ChemistryBadge({
  total,
  multiplier,
  className = '',
}: {
  total: number;
  multiplier: number;
  className?: string;
}) {
  const tier = chemistryTier(total);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black uppercase tabular-nums',
        className,
      )}
      style={{ ...poppins, backgroundColor: withAlpha(tier.color, 0.15), color: tier.color }}
    >
      <Zap className="size-3" fill="currentColor" />
      {total}/{MAX_SQUAD_CHEMISTRY}
      <span className="opacity-60">·</span>×{multiplier.toFixed(1)}
    </span>
  );
}

/** One link row: icon, label, "×count", tier dots. */
function ChemLinkRow({ link }: { link: ChemLink }) {
  const color = DIMENSION_COLOR[link.dimension];
  const active = link.tier > 0;
  return (
    <div
      className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5', active ? '' : 'opacity-55')}
      style={{ backgroundColor: active ? withAlpha(color, 0.1) : 'rgba(255,255,255,0.03)' }}
    >
      <span className="flex size-5 shrink-0 items-center justify-center">
        <LinkIcon link={link} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-white/85" style={poppins}>
        {linkLabel(link)}
      </span>
      <span className="shrink-0 text-[10px] font-black tabular-nums text-white/45" style={poppins}>
        ×{link.count}
      </span>
      <TierDots tier={link.tier} color={color} />
    </div>
  );
}

/**
 * Full chemistry breakdown for a squad: the total/multiplier header plus every
 * club / league / nation link that's forming, each with its crest / badge /
 * flag, squad count and tier. This is the "understand where my chemistry comes
 * from" view, reused on the results screen and the squad detail.
 */
export function ChemistryBreakdown({
  team,
  showInfo = true,
  className = '',
}: {
  team: AuctionTeam;
  showInfo?: boolean;
  className?: string;
}) {
  const { total, multiplier, links } = getSquadChemistryBreakdown(team);
  const tier = chemistryTier(total);

  return (
    <div className={cn('rounded-[14px] border border-white/10 bg-white/[0.03] p-3', className)}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="size-4" style={{ color: tier.color }} fill="currentColor" />
          <span className="text-[11px] font-black uppercase tracking-wide text-white/50" style={poppins}>
            Chemistry
          </span>
          {showInfo && <ChemistryInfoButton />}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-black tabular-nums" style={{ ...poppins, color: tier.color }}>
            {total}
          </span>
          <span className="text-[10px] font-bold tabular-nums text-white/40">/{MAX_SQUAD_CHEMISTRY}</span>
          <span
            className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-black tabular-nums"
            style={{ backgroundColor: withAlpha(tier.color, 0.15), color: tier.color }}
          >
            ×{multiplier.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Links */}
      {links.length === 0 ? (
        <p className="px-1 py-2 text-center text-[11px] text-white/35" style={poppins}>
          No links yet — sign players from the same club, league or nation.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {links.map((link) => (
            <ChemLinkRow key={`${link.dimension}:${link.key}`} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Small (i) button that opens the "how chemistry works" explainer. */
export function ChemistryInfoButton({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How chemistry works"
        className={cn(
          'flex size-4 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white/80',
          className,
        )}
      >
        <Info className="size-3.5" />
      </button>
      <ChemistryHelpModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const RULE_ROWS: { dim: ChemDimension; thresholds: number[] }[] = [
  { dim: 'club', thresholds: CLUB_CHEM_THRESHOLDS },
  { dim: 'league', thresholds: LEAGUE_CHEM_THRESHOLDS },
  { dim: 'nation', thresholds: NATION_CHEM_THRESHOLDS },
];

/** Modal explaining the FC-style tier thresholds. */
export function ChemistryHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLocale();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[20px] border-2 border-white/20 bg-brand-blue p-5 shadow-[0_16px_48px_rgba(0,0,0,0.5)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-brand-yellow" fill="currentColor" />
                <h2 className="text-base font-black uppercase text-white" style={poppins}>
                  {t('auctionGame.chemHelpTitle')}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('auctionGame.chemClose')}
                className="flex size-7 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mb-4 text-[13px] font-semibold leading-relaxed text-white" style={poppins}>
              {t('auctionGame.chemHelpBody', { max: 3, squadMax: MAX_SQUAD_CHEMISTRY })}
            </p>

            <div className="space-y-2">
              {RULE_ROWS.map(({ dim, thresholds }) => (
                <div
                  key={dim}
                  className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2"
                >
                  <span
                    className="text-[12px] font-black uppercase"
                    style={{ ...poppins, color: DIMENSION_COLOR[dim] }}
                  >
                    {t(DIMENSION_LABEL_KEY[dim])}
                  </span>
                  <span className="flex items-center gap-2 text-[11px] font-bold tabular-nums text-white">
                    {thresholds.map((threshold, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className="text-white/80">{threshold}+</span>
                        <span className="flex items-center gap-[2px]">
                          {[0, 1, 2].map((d) => (
                            <span
                              key={d}
                              className="size-[6px] rounded-full"
                              style={{
                                backgroundColor:
                                  d <= i ? DIMENSION_COLOR[dim] : 'rgba(255,255,255,0.16)',
                              }}
                            />
                          ))}
                        </span>
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[11px] font-semibold leading-relaxed text-white/80" style={poppins}>
              {t('auctionGame.chemHelpFooter')}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
