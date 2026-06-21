'use client';

import { motion } from 'motion/react';
import type { AuctionPlayer, Formation, PositionGroup } from '../../types';
import { getRemainingSlots, lastName } from '../../data';
import { POS_COLORS, poppins } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { PlayerPhoto } from '../shared/PlayerPhoto';

/** Vertical stadium pitch — lays out the formation rows + filled/empty slots. */
export function SquadPitch({
  player,
  formation,
  highlightId,
  size = 'md',
  activePosition,
  showYouBadge,
  needGlow,
  isHuman,
}: {
  player: AuctionPlayer;
  formation: Formation;
  highlightId?: string;
  size?: 'sm' | 'md' | 'lg';
  activePosition?: PositionGroup;
  showYouBadge?: boolean;
  needGlow?: boolean;
  isHuman?: boolean;
}) {
  const { t } = useLocale();
  const circle = size === 'lg' ? 48 : size === 'md' ? 36 : 28;
  const nameFs = size === 'lg' ? 'text-[11px]' : size === 'md' ? 'text-[9px]' : 'text-[8px]';
  const remaining = getRemainingSlots(player.team);

  return (
    <motion.div
      className="relative overflow-hidden rounded-[12px]"
      style={{ aspectRatio: '4/5' }}
      animate={
        needGlow
          ? {
              boxShadow: isHuman
                ? '0 0 0 3px rgba(255,229,0,0.9), 0 0 18px rgba(255,229,0,0.35)'
                : '0 0 0 3px rgba(255,255,255,0.5), 0 0 14px rgba(255,255,255,0.18)',
            }
          : { boxShadow: '0 0 0 0px rgba(255,229,0,0)' }
      }
      transition={{ duration: 0.3 }}
    >
      {/* Real stadium turf — same asset as the ranked possession pitch. The
          source image is landscape (goal lines left/right); rotate it 90° so
          the goal areas sit at top & bottom, matching the vertical formation.
          The img's CSS width = container HEIGHT and CSS height = container WIDTH
          (because rotation swaps axes); object-fill stretches it edge-to-edge so
          both goal areas stay fully visible. */}
      <img
        src="/assets/stadium-green.webp"
        alt=""
        aria-hidden
        draggable={false}
        className="absolute left-1/2 top-1/2 h-[80%] w-[125%] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 object-fill"
      />
      <div aria-hidden className="absolute inset-0 bg-black/15" />

      {/* "YOU" badge — top-right corner of the pitch */}
      {showYouBadge && (
        <span
          className="absolute right-2 top-2 z-30 rounded-full bg-brand-yellow px-3 py-1 text-sm font-black uppercase text-surface-page shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
          style={poppins}
        >
          {t('auctionGame.youBadge')}
        </span>
      )}

      {(() => {
        // Display rows top→bottom. y is spread evenly between the FWD band (top)
        // and the GK band (bottom) so multi-band formations (e.g. 4-2-3-1) sit
        // correctly. A per-position offset keeps slot indexing continuous when a
        // group spans two rows (MID 3 then MID 2).
        const rows = formation.rows;
        const TOP = 19;
        const BOTTOM = 93;
        const step = rows.length > 1 ? (BOTTOM - TOP) / (rows.length - 1) : 0;
        const posOffset: Record<PositionGroup, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
        return rows.map((row, rowIdx) => {
          const { pos, count } = row;
          const yPct = TOP + step * rowIdx;
          const startIndex = posOffset[pos];
          posOffset[pos] += count;
          const filled = player.team.slots[pos];
          const needsMore = remaining[pos] > 0;
          const isActiveRow = activePosition === pos && needsMore;

          return (
            <div
              key={`${pos}-${rowIdx}`}
              className="absolute left-0 right-0 flex justify-center"
              style={{ top: `${yPct}%`, transform: 'translateY(-50%)' }}
            >
              <div
                className="flex items-start justify-center"
                style={{ gap: size === 'lg' ? 10 : size === 'md' ? 6 : 4, padding: '0 4px' }}
              >
                {Array.from({ length: count }).map((_, slot) => {
                  const i = startIndex + slot;
                  const f = filled[i];
                  const isNew = f && highlightId === f.id;
                  const isEmpty = !f;
                  const isPulsing = isEmpty && isActiveRow;

                  return (
                    <div key={`${rowIdx}-${slot}`} className={`flex items-center gap-0.5 ${pos === 'GK' ? 'flex-col-reverse' : 'flex-col'}`}>
                      <motion.div
                        initial={isNew ? { scale: 0, rotate: -180 } : false}
                        animate={
                          isNew
                            ? { scale: 1, rotate: 0 }
                            : isPulsing
                              ? { boxShadow: [`0 0 0px ${POS_COLORS[pos]}00`, `0 0 12px ${POS_COLORS[pos]}60`, `0 0 0px ${POS_COLORS[pos]}00`] }
                              : {}
                        }
                        transition={
                          isNew
                            ? { type: 'spring', stiffness: 260, damping: 14 }
                            : isPulsing
                              ? { duration: 1.5, repeat: Infinity }
                              : undefined
                        }
                        className="rounded-full flex items-center justify-center overflow-hidden"
                        style={{
                          width: circle,
                          height: circle,
                          border: f
                            ? isNew
                              ? `2.5px solid ${POS_COLORS[pos]}`
                              : '2.5px solid rgba(255,255,255,0.55)'
                            : isPulsing
                              ? `2px dashed ${POS_COLORS[pos]}`
                              : '2px dashed rgba(255,255,255,0.45)',
                          backgroundColor: f
                            ? 'rgba(0,0,0,0.35)'
                            : isPulsing
                              ? `${POS_COLORS[pos]}22`
                              : 'rgba(0,0,0,0.35)',
                          boxShadow: isNew
                            ? `0 0 14px ${POS_COLORS[pos]}60`
                            : '0 2px 6px rgba(0,0,0,0.45)',
                        }}
                      >
                        {f ? (
                          <PlayerPhoto footballer={f} size={circle - 4} />
                        ) : (
                          <span
                            className="font-black"
                            style={{
                              fontSize: circle * 0.3,
                              ...poppins,
                              color: isPulsing ? POS_COLORS[pos] : 'rgba(255,255,255,0.7)',
                            }}
                          >
                            {pos}
                          </span>
                        )}
                      </motion.div>
                      {f && (
                        <motion.span
                          initial={isNew ? { opacity: 0, y: 4 } : false}
                          animate={isNew ? { opacity: 1, y: 0 } : {}}
                          transition={isNew ? { delay: 0.3 } : undefined}
                          className={`${nameFs} text-white/90 text-center leading-tight font-semibold`}
                          style={{ maxWidth: circle + 16, ...poppins, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                        >
                          {lastName(f.name)}
                        </motion.span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        });
      })()}
    </motion.div>
  );
}
