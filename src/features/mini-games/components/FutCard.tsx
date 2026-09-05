'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import { useMiniT } from '../lib/i18n';
import { ClubCrest } from './Badges';
import type { FifaCardStats } from '../data/guessFifaCard';

/** Everything FutCard needs (satisfied by a FifaCard). */
export interface FutCardData {
  id: string;
  editionLabel: string;
  name: string;
  overall: number;
  position: string;
  nation: string;
  nationCode: string;
  league: string;
  club: string;
  stats: FifaCardStats;
  photoId?: number;
  photoVer?: string;
  /** Signed, app-relative face URL from the daily-challenge session; wins over photoId. */
  faceUrl?: string | null;
}

const GOLD_BG = [
  'radial-gradient(135% 85% at 50% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 40%)',
  'radial-gradient(130% 110% at 50% 104%, rgba(112,80,18,0.4) 0%, rgba(112,80,18,0) 52%)',
  'linear-gradient(180deg, #f9e6a4 0%, #f0d488 20%, #e5c164 48%, #d3ab46 76%, #c69b38 100%)',
].join(', ');

/**
 * An EA-style gold player card, recreated in CSS. The three identity slots —
 * nation, league, club — start hidden (one shown per card) and unlock on tap or
 * when the round resolves; the name + face are hidden until `revealName`.
 */
export function FutCard({
  card,
  revealed,
  revealName,
  revealFace,
  highlight = null,
  onRevealClue,
  revealable = false,
}: {
  card: FutCardData;
  /** Which identity clues are shown; the hidden ones display a lock chip. */
  revealed: { nation: boolean; league: boolean; club: boolean };
  /** Flip the name plate open + show the face (solved or timed out). */
  revealName: boolean;
  /** Show the face independently of the name (progressive-reveal modes); defaults to revealName. */
  revealFace?: boolean;
  /** Tint the frame after a result. */
  highlight?: 'correct' | 'reveal' | null;
  /** Spend a clue-reveal token to unlock a hidden clue (tap its lock). */
  onRevealClue?: (clue: 'nation' | 'league' | 'club') => void;
  /** Whether tapping a locked clue is currently allowed (tokens available). */
  revealable?: boolean;
}) {
  const s = card.stats;
  const statCols: Array<Array<[string, number]>> = [
    [['PAC', s.pac], ['SHO', s.sho], ['PAS', s.pas]],
    [['DRI', s.dri], ['DEF', s.def], ['PHY', s.phy]],
  ];

  const frame =
    highlight === 'correct'
      ? '0 0 0 2px #38B60E, 0 20px 50px rgba(56,182,14,0.4)'
      : highlight === 'reveal'
        ? '0 0 0 2px #FB3101, 0 20px 50px rgba(251,49,1,0.32)'
        : '0 18px 44px rgba(0,0,0,0.55)';

  return (
    <div className="relative mx-auto w-full max-w-[336px] select-none" style={{ aspectRatio: '300 / 424' }}>
      <div
        className="absolute inset-0 overflow-hidden rounded-[22px]"
        style={{ background: GOLD_BG, boxShadow: frame }}
      >
        {/* metallic diagonal sheen */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(116deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 24%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.32) 78%, rgba(255,255,255,0) 100%)',
            mixBlendMode: 'soft-light',
          }}
        />
        {/* inner bevel */}
        <div aria-hidden className="pointer-events-none absolute inset-[5px] rounded-[17px] border border-[#7c5e1e]/25" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }} />

        {/* edition badge — the "which FIFA" tag, shown prominently */}
        <div className="absolute right-3.5 top-3.5 z-30">
          <span className="rounded-lg bg-[#3a2c08]/85 px-3 py-1.5 font-poppins text-[15px] font-black uppercase tracking-wider text-[#f4e3a2] shadow-sm">
            {card.editionLabel}
          </span>
        </div>

        {/* upper section: portrait behind, rating column in front */}
        <div className="relative h-[264px]">
          {/* portrait / face */}
          <div className="absolute inset-x-0 bottom-0 z-0 flex items-end justify-end pr-1">
            <Portrait card={card} reveal={revealFace ?? revealName} />
          </div>

          {/* rating / identity column */}
          <div className="relative z-20 flex w-[92px] flex-col items-center pl-3.5 pt-5 text-[#33270a]">
            <span className="font-poppins text-[49px] font-black leading-[0.82] tracking-tight">{card.overall}</span>
            <span className="mt-1 font-poppins text-[18px] font-black uppercase leading-none tracking-wide">
              {card.position || '—'}
            </span>
            <span className="my-2 h-px w-10 bg-[#33270a]/40" />

            <IdentitySlot revealed={revealed.nation} kind="nation" revealable={revealable} onReveal={onRevealClue && (() => onRevealClue('nation'))}>
              <NationFlag code={card.nationCode} />
              <SlotLabel>{card.nation}</SlotLabel>
            </IdentitySlot>
            <IdentitySlot revealed={revealed.league} kind="league" revealable={revealable} onReveal={onRevealClue && (() => onRevealClue('league'))}>
              <LeagueBadge league={card.league} />
              <SlotLabel>{card.league || '—'}</SlotLabel>
            </IdentitySlot>
            <IdentitySlot revealed={revealed.club} kind="club" revealable={revealable} onReveal={onRevealClue && (() => onRevealClue('club'))}>
              <ClubCrest club={card.club} size={30} />
              <SlotLabel>{card.club}</SlotLabel>
            </IdentitySlot>
          </div>
        </div>

        {/* name plate */}
        <div className="relative z-10 mx-4 flex h-10 items-center justify-center">
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#33270a]/45 to-transparent" />
          <AnimatePresence mode="wait" initial={false}>
            {revealName ? (
              <motion.span
                key="name"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="truncate px-2 font-poppins text-[21px] font-black uppercase tracking-wide text-[#241b05]"
              >
                {card.name}
              </motion.span>
            ) : (
              <motion.span
                key="masked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-poppins text-[23px] font-black tracking-[0.5em] text-[#33270a]/45"
              >
                ? ? ?
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* stats: two columns split by a hairline */}
        <div className="relative z-10 mt-2 flex items-stretch justify-center px-4 pb-4 text-[#241b05]">
          {statCols.map((col, i) => (
            <div key={i} className={`flex flex-col gap-2 ${i === 0 ? 'pr-6' : 'border-l border-[#33270a]/25 pl-6'}`}>
              {col.map(([label, value]) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <span className="w-8 text-right font-poppins text-[23px] font-black leading-none tabular-nums">{value}</span>
                  <span className="font-poppins text-[12px] font-bold uppercase tracking-wide text-[#33270a]/85">{label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The player face on reveal, else a generic silhouette (also the fallback when
 *  a face image is missing or fails to load). */
function Portrait({ card, reveal }: { card: FutCardData; reveal: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = card.faceUrl ?? (card.photoId ? `/api/fifa-face?id=${card.photoId}&v=${card.photoVer}` : null);
  const showPhoto = reveal && src !== null && failedSrc !== src;

  return (
    <div className="relative h-[240px] w-[212px]">
      {/* Preload the face while the clues run so it's cached by the reveal. */}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" aria-hidden onError={() => setFailedSrc(src)} className="pointer-events-none absolute h-px w-px opacity-0" />
      )}
      <AnimatePresence initial={false}>
        {showPhoto ? (
          <motion.img
            key="face"
            src={src!}
            alt=""
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            onError={() => setFailedSrc(src)}
            className="absolute bottom-0 right-1 h-[236px] w-auto object-contain drop-shadow-[0_8px_10px_rgba(60,44,8,0.4)]"
            style={{ imageRendering: 'auto' }}
          />
        ) : (
          <motion.div key="sil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute bottom-0 right-2">
            <Silhouette />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One identity row (nation/league/club). Hidden = a locked, pulsing chip. */
function IdentitySlot({
  revealed,
  children,
  revealable = false,
  onReveal,
}: {
  revealed: boolean;
  kind: 'nation' | 'league' | 'club';
  children: React.ReactNode;
  revealable?: boolean;
  onReveal?: () => void;
}) {
  const mt = useMiniT();
  const tappable = !revealed && revealable && !!onReveal;
  return (
    <div className="relative mb-1.5 flex h-[42px] w-full flex-col items-center justify-center">
      {/* Content stays mounted (even while locked) so its flag/crest image is
          already cached when the slot reveals — otherwise a fast solve reveals
          before the CDN image has loaded. Visibility + pop are animated. */}
      <motion.div
        aria-hidden={!revealed}
        animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.6 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="flex flex-col items-center gap-0.5"
      >
        {children}
      </motion.div>
      {!revealed && (
        <div className="absolute inset-0 flex items-center justify-center">
          {tappable ? (
            <motion.button
              type="button"
              onClick={onReveal}
              aria-label={mt('Reveal clue')}
              animate={{ boxShadow: ['0 0 6px rgba(255,213,74,0.4)', '0 0 12px rgba(255,213,74,0.7)', '0 0 6px rgba(255,213,74,0.4)'] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="flex h-[27px] w-[36px] items-center justify-center rounded-[5px] border-2 border-brand-yellow bg-brand-yellow/25 active:scale-95"
            >
              <Lock className="size-3.5 text-[#33270a]" />
            </motion.button>
          ) : (
            <div className="flex h-[25px] w-[34px] items-center justify-center rounded-[5px] border border-dashed border-[#33270a]/40 bg-[#33270a]/12">
              <motion.span animate={{ opacity: [0.35, 0.7, 0.35] }} transition={{ duration: 1.6, repeat: Infinity }}>
                <Lock className="size-3.5 text-[#33270a]/70" aria-label={mt('Hidden clue')} />
              </motion.span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SlotLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="max-w-[86px] truncate text-center font-poppins text-[9px] font-bold uppercase leading-none tracking-wide text-[#33270a]/80">
      {children}
    </span>
  );
}

/** Country flag from a flag-icons code via the football-grid CDN. */
function NationFlag({ code }: { code: string }) {
  const src = code ? footballGridAssetUrl(`/assets/football-grid/flags/${code}.svg`) : null;
  if (!src) return null;
  return (
    <span className="block overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.35)]" style={{ width: 34, height: 23 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={68} height={46} className="block h-full w-full object-cover" />
    </span>
  );
}

/** League badge — the product's own league-logo asset, else a short text token. */
function LeagueBadge({ league }: { league: string }) {
  const src = leagueLogoUrl(league);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className="h-[28px] w-auto max-w-[50px] object-contain" />;
  }
  return (
    <span className="flex h-[20px] items-center font-poppins text-[9px] font-black uppercase leading-tight text-[#33270a]">
      {leagueShort(league)}
    </span>
  );
}

// Maps a league name to one of the product's bundled league logos (football-grid
// CDN). Substring-keyed to tolerate SoFIFA's per-edition naming.
const LEAGUE_LOGO: Array<[string, string]> = [
  ['premier league', 'premier-league'],
  ['primera division', 'la-liga'],
  ['primera división', 'la-liga'],
  ['la liga', 'la-liga'],
  ['laliga', 'la-liga'],
  ['serie a', 'serie-a'],
  ['bundesliga', 'bundesliga'],
  ['ligue 1', 'ligue-1'],
  ['eredivisie', 'eredivisie'],
  ['primeira liga', 'primeira-liga'],
  ['liga portugal', 'primeira-liga'],
  ['saudi', 'saudi-pro-league'],
  ['major league soccer', 'major-league-soccer'],
  ['süper lig', 'super-lig'],
  ['super lig', 'super-lig'],
  ['scottish', 'scottish-premiership'],
  ['premiership', 'scottish-premiership'],
  ['brasileir', 'brasileirao'],
  ['argentine', 'argentine-primera'],
  ['belgian', 'belgian-pro-league'],
  ['erovnuli', 'erovnuli-liga'],
];

function leagueLogoUrl(league: string): string | null {
  const l = (league || '').toLowerCase();
  if (!l) return null;
  for (const [key, file] of LEAGUE_LOGO) {
    if (l.includes(key)) return footballGridAssetUrl(`/assets/football-grid/leagues/${file}.png`);
  }
  return null;
}

/** Generic head-and-shoulders, the classic "no photo" card fill. */
function Silhouette() {
  return (
    <svg viewBox="0 0 120 150" className="h-[224px] w-auto" aria-hidden>
      <defs>
        <linearGradient id="fut-sil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33270a" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#33270a" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <g fill="url(#fut-sil)">
        <circle cx="60" cy="46" r="30" />
        <path d="M14 150c0-30 20-52 46-52s46 22 46 52z" />
      </g>
    </svg>
  );
}

/** Compress long league names to a short on-card token. */
function leagueShort(league: string): string {
  if (!league) return '—';
  // Keyed by substrings that appear in SoFIFA / FUTWIZ league names across
  // editions (e.g. "Spain Primera Division", "English Premier League").
  const map: Record<string, string> = {
    'Premier League': 'PREM',
    'Primera Division': 'LALIGA',
    'Primera División': 'LALIGA',
    'La Liga': 'LALIGA',
    'LaLiga': 'LALIGA',
    'Serie A': 'SERIE A',
    'Serie B': 'SERIE B',
    'Bundesliga': 'BUNDES',
    'Ligue 1': 'LIGUE 1',
    'Primeira Liga': 'LIGA PT',
    'Liga Portugal': 'LIGA PT',
    'Eredivisie': 'ERE',
    'Saudi': 'SAUDI',
    'Major League Soccer': 'MLS',
    'Süper Lig': 'SÜPER',
    'Super Lig': 'SÜPER',
  };
  for (const key of Object.keys(map)) {
    if (league.toLowerCase().includes(key.toLowerCase())) return map[key];
  }
  return league.length > 8 ? league.slice(0, 8).toUpperCase() : league.toUpperCase();
}
