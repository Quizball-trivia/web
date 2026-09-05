'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ClubCrest } from '@/features/mini-games/components/Badges';
import { type FifaCard, STAT_KEYS, STAT_SHORT, editionLabel } from '../lib/data';
import { Flag } from './ui';

const GOLD_BG = [
  'radial-gradient(135% 85% at 50% 0%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 40%)',
  'linear-gradient(180deg, #f9e6a4 0%, #f0d488 20%, #e5c164 48%, #d3ab46 76%, #c69b38 100%)',
].join(', ');

export type MiniCardSize = 'xs' | 'sm' | 'md' | 'lg';
// Sized so 5×xs, 4×sm and 3×md rows fit the ~398px phone play area with gaps.
const WIDTH: Record<MiniCardSize, number> = { xs: 70, sm: 88, md: 118, lg: 156 };

/**
 * Compact gold card used wherever several cards sit side by side (journeys,
 * hands, squads). Face is optional; name and identity can be masked.
 */
export function MiniFutCard({
  card,
  size = 'sm',
  showName = true,
  showFace = true,
  showIdentity = true,
  showStats = false,
  showEdition = true,
  masked = false,
  /** Show '?' instead of the rating (Hi-Lo / duels where OVR is the answer). */
  hideOverall = false,
  highlight = null,
  badge,
  dim = false,
  onClick,
  className = '',
}: {
  card: FifaCard;
  size?: MiniCardSize;
  showName?: boolean;
  showFace?: boolean;
  showIdentity?: boolean;
  showStats?: boolean;
  showEdition?: boolean;
  /** Whole card is a mystery: silhouette + ??? (position kept). */
  masked?: boolean;
  hideOverall?: boolean;
  highlight?: 'correct' | 'wrong' | 'pick' | null;
  badge?: string;
  dim?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const w = WIDTH[size];
  const s = w / 100;
  const ring =
    highlight === 'correct' ? '0 0 0 2px #38B60E, 0 8px 22px rgba(56,182,14,0.45)'
    : highlight === 'wrong' ? '0 0 0 2px #FB3101, 0 8px 22px rgba(251,49,1,0.4)'
    : highlight === 'pick' ? '0 0 0 2px #FFE500, 0 8px 22px rgba(255,229,0,0.45)'
    : '0 8px 18px rgba(0,0,0,0.45)';
  const Tag = onClick ? motion.button : motion.div;

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.96 } : undefined}
      className={`relative shrink-0 select-none overflow-hidden text-left ${dim ? 'opacity-45' : ''} ${className}`}
      style={{ width: w, height: w * 1.4, borderRadius: 10 * s + 4, background: GOLD_BG, boxShadow: ring }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(116deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.3) 80%, rgba(255,255,255,0) 100%)', mixBlendMode: 'soft-light' }} />

      {showEdition && (
        <span className="absolute right-0 top-0 z-20 rounded-bl-md bg-fut-badge/85 px-1.5 py-0.5 font-poppins font-black uppercase tracking-wider text-fut-gold-light" style={{ fontSize: 8 * s + 2 }}>
          {editionLabel(card.edition)}
        </span>
      )}
      {badge && (
        <span className="absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-full bg-brand-blue px-1.5 py-0.5 font-poppins font-black uppercase text-white" style={{ fontSize: 8 * s + 2 }}>
          {badge}
        </span>
      )}

      {/* face / silhouette */}
      <div className="absolute inset-x-0 bottom-[38%] top-[14%] z-0 flex items-end justify-end" style={{ paddingRight: 2 * s }}>
        {showFace && !masked ? <Face card={card} height={w * 0.72} /> : <Silhouette height={w * 0.66} />}
      </div>

      {/* rating column */}
      <div className="absolute z-10 flex flex-col items-center text-fut-ink" style={{ left: 6 * s, top: 8 * s }}>
        <span className="font-poppins font-black leading-none" style={{ fontSize: 26 * s, opacity: hideOverall ? 0.45 : 1 }}>{hideOverall ? '?' : card.overall}</span>
        <span className="font-poppins font-black uppercase leading-none" style={{ fontSize: 10 * s, marginTop: 2 * s }}>{card.position}</span>
        <span className="bg-fut-ink/40" style={{ width: 16 * s, height: 1, margin: `${4 * s}px 0` }} />
        {showIdentity && !masked ? (
          <>
            <Flag code={card.nationCode} width={16 * s + 4} height={11 * s + 3} />
            <span style={{ marginTop: 3 * s }}>
              <ClubCrest club={card.club} size={16 * s + 4} />
            </span>
          </>
        ) : (
          <>
            <span className="rounded-[2px] border border-dashed border-fut-ink/40" style={{ width: 16 * s + 4, height: 11 * s + 3 }} />
            <span className="rounded-full border border-dashed border-fut-ink/40" style={{ width: 16 * s + 4, height: 16 * s + 4, marginTop: 3 * s }} />
          </>
        )}
      </div>

      {/* name plate */}
      <div className="absolute inset-x-0 z-10 flex items-center justify-center text-fut-ink-deep" style={{ bottom: showStats ? '20%' : '10%', height: 18 * s + 4 }}>
        <span aria-hidden className="absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-fut-ink/45 to-transparent" />
        <span className="truncate px-1 font-poppins font-black uppercase tracking-wide" style={{ fontSize: showName && !masked ? 9.5 * s + 2 : 11 * s + 2, letterSpacing: showName && !masked ? undefined : '0.3em', opacity: showName && !masked ? 1 : 0.5 }}>
          {showName && !masked ? card.name : '???'}
        </span>
      </div>

      {showStats && (
        <div className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-3 gap-x-1 px-2 pb-1 text-fut-ink-deep" style={{ fontSize: 7 * s + 2 }}>
          {STAT_KEYS.map((k) => (
            <span key={k} className="flex items-baseline justify-center gap-0.5 font-poppins font-black leading-tight">
              <span>{card.stats[k]}</span>
              <span className="text-fut-ink/75" style={{ fontSize: 6 * s + 1 }}>{STAT_SHORT[k]}</span>
            </span>
          ))}
        </div>
      )}
    </Tag>
  );
}

export function faceUrl(card: FifaCard): string | null {
  return card.photoId ? `/api/fifa-face?id=${card.photoId}&v=${card.photoVer}` : null;
}

function Face({ card, height }: { card: FifaCard; height: number }) {
  const [failed, setFailed] = useState(false);
  const src = faceUrl(card);
  if (!src || failed) return <Silhouette height={height * 0.9} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" onError={() => setFailed(true)} className="w-auto object-contain drop-shadow-[0_4px_6px_rgba(60,44,8,0.4)]" style={{ height }} />;
}

export function Silhouette({ height }: { height: number }) {
  return (
    <svg viewBox="0 0 120 150" style={{ height }} className="w-auto" aria-hidden>
      <g fill="#33270a" fillOpacity="0.22">
        <circle cx="60" cy="46" r="30" />
        <path d="M14 150c0-30 20-52 46-52s46 22 46 52z" />
      </g>
    </svg>
  );
}

/** Six-stat strip in card colours, optionally masking / highlighting one stat. */
export function StatStrip({
  card,
  hidden = [],
  onPick,
  picked = null,
  correct = null,
  values,
}: {
  card: FifaCard;
  hidden?: string[];
  onPick?: (k: (typeof STAT_KEYS)[number]) => void;
  picked?: string | null;
  correct?: string | null;
  /** Override displayed values (e.g. the doctored stat in One Stat Is Fake). */
  values?: Partial<Record<(typeof STAT_KEYS)[number], number>>;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STAT_KEYS.map((k) => {
        const isHidden = hidden.includes(k);
        const isPick = picked === k;
        const isRight = correct !== null && correct === k;
        const isWrong = isPick && correct !== null && correct !== k;
        const bg = isRight ? '#38B60E' : isWrong ? '#FB3101' : isPick ? '#1645FF' : 'rgba(255,255,255,0.06)';
        return (
          <button
            key={k}
            type="button"
            disabled={!onPick || picked !== null}
            onClick={() => onPick?.(k)}
            className="flex flex-col items-center rounded-xl px-2 py-2 transition-colors disabled:cursor-default"
            style={{ background: bg }}
          >
            <span className="font-poppins text-[10px] font-black uppercase tracking-wider text-white/55">{STAT_SHORT[k]}</span>
            <span className="font-poppins text-2xl font-black tabular-nums text-white">{isHidden ? '?' : values?.[k] ?? card.stats[k]}</span>
          </button>
        );
      })}
    </div>
  );
}
