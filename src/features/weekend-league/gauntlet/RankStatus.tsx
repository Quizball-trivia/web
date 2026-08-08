'use client';

// Placement awareness — the player must ALWAYS know three things without
// opening a board: their rank, whether the last answer moved them, and
// whether they are inside the qualification cut. Three pieces:
//
//   RankPill         — minimal zone-colored pill beside the score line.
//   RankDeltaMoment  — the post-reveal beat: old rank → new rank, who was
//                      passed, and the in/out verdict for the cut.
//   CutlineBoard     — standings with the qualification line drawn where the
//                      cut actually falls, window centered on YOU.
//
// Prototyped in /dev/wl → Component gallery ("Rank" group).

import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, Check, Minus, TriangleAlert } from 'lucide-react';
import { poppins } from '../constants';
import { cn } from '@/lib/utils';

export interface RankInfo {
  rank: number;
  field: number;
  /** How many advance from this game (the cut). */
  cut: number;
  /** Rank change since the previous question; 0/undefined = no move. */
  delta?: number;
}

type ZoneTone = 'safe' | 'bubble' | 'out';

function zoneOf({ rank, cut }: RankInfo): ZoneTone {
  if (rank > cut) return 'out';
  // Within ~10% of the line (min 3 places) = the bubble: qualified, but one
  // bad question can flip it — amber, not green.
  const bubble = Math.max(3, Math.round(cut * 0.1));
  return cut - rank < bubble ? 'bubble' : 'safe';
}

const ZONE_STYLE: Record<ZoneTone, { wrap: string; chip: string }> = {
  safe: { wrap: 'border-brand-green bg-brand-green/15', chip: 'text-brand-green-light' },
  bubble: { wrap: 'border-brand-yellow bg-brand-yellow/15', chip: 'text-brand-yellow' },
  out: { wrap: 'border-brand-red-soft bg-brand-red-soft/15', chip: 'text-brand-red-soft' },
};

function DeltaChip({ delta }: { delta?: number }) {
  if (!delta) {
    return <Minus className="size-4 text-white/40" strokeWidth={3} />;
  }
  const up = delta > 0;
  return (
    <motion.span
      key={delta}
      initial={{ y: up ? 6 : -6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'flex items-center font-poppins text-[11px] font-black tabular-nums',
        up ? 'text-brand-green-light' : 'text-brand-red-soft',
      )}
    >
      {up ? <ArrowUp className="size-3" strokeWidth={3.5} /> : <ArrowDown className="size-3" strokeWidth={3.5} />}
      {Math.abs(delta)}
    </motion.span>
  );
}

/** Minimal placement pill, fully filled like the kind badges: solid green
 *  inside the cut, solid yellow on the bubble, solid red outside. */
const PILL_FILL: Record<ZoneTone, { bg: string; main: string; dim: string; delta: string }> = {
  safe: { bg: 'bg-brand-green', main: 'text-white', dim: 'text-white/70', delta: 'text-white' },
  bubble: { bg: 'bg-brand-yellow', main: 'text-black', dim: 'text-black/60', delta: 'text-black' },
  out: { bg: 'bg-brand-red-soft', main: 'text-white', dim: 'text-white/70', delta: 'text-white' },
};

export function RankPill(info: RankInfo) {
  const zone = zoneOf(info);
  const f = PILL_FILL[zone];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 shadow-[0_1px_6px_rgba(0,0,0,0.35)]', f.bg)}>
      <span className={cn('font-poppins text-[13px] font-black tabular-nums', f.main)} style={poppins}>
        #{info.rank}
      </span>
      <span className={cn('font-poppins text-[10px] font-bold tabular-nums', f.dim)}>/{info.field}</span>
      {info.delta != null && info.delta !== 0 ? (
        <motion.span
          key={info.delta}
          initial={{ y: info.delta > 0 ? 6 : -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn('flex items-center font-poppins text-[11px] font-black tabular-nums', f.delta)}
        >
          {info.delta > 0
            ? <ArrowUp className="size-3" strokeWidth={3.5} />
            : <ArrowDown className="size-3" strokeWidth={3.5} />}
          {Math.abs(info.delta)}
        </motion.span>
      ) : (
        <Minus className={cn('size-3', f.dim)} strokeWidth={3} />
      )}
    </span>
  );
}

/** Post-reveal movement beat: rendered with the verdict, before standings. */
export function RankDeltaMoment({
  fromRank, toRank, info, passedNames = [],
}: {
  fromRank: number;
  toRank: number;
  info: RankInfo;
  /** Nicknames overtaken this question (display max 2 + count). */
  passedNames?: string[];
}) {
  const delta = fromRank - toRank;
  const zone = zoneOf({ ...info, rank: toRank });
  const s = ZONE_STYLE[zone];
  const shown = passedNames.slice(0, 2);
  const more = Math.max(0, passedNames.length - shown.length);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={cn('mx-auto mt-4 w-full max-w-sm rounded-[16px] border px-4 py-3 text-center', s.wrap)}
    >
      <div className="flex items-center justify-center gap-2 font-poppins font-black text-white">
        <span className="text-[20px] tabular-nums text-white/45" style={poppins}>#{fromRank}</span>
        <motion.span
          initial={{ x: -6, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className={delta > 0 ? 'text-brand-green-light' : delta < 0 ? 'text-brand-red-soft' : 'text-white/40'}
        >
          {delta > 0 ? <ArrowUp className="size-6" strokeWidth={3} /> : delta < 0 ? <ArrowDown className="size-6" strokeWidth={3} /> : <Minus className="size-6" />}
        </motion.span>
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 400, damping: 18 }}
          className="text-[30px] tabular-nums"
          style={poppins}
        >
          #{toRank}
        </motion.span>
      </div>
      {delta !== 0 && (
        <div className="mt-0.5 font-poppins text-[12px] font-bold uppercase tracking-wide text-white/60">
          {delta > 0 ? (
            <>+{delta} ადგილი{shown.length > 0 && (
              <span className="text-white/45"> · გაუსწარი: {shown.join(', ')}{more > 0 ? ` +${more}` : ''}</span>
            )}</>
          ) : (
            <>{delta} ადგილი{shown.length > 0 && (
              <span className="text-white/45"> · გაგისწრო: {shown.join(', ')}{more > 0 ? ` +${more}` : ''}</span>
            )}</>
          )}
        </div>
      )}
      <div className={cn('mt-1 flex items-center justify-center gap-1 font-poppins text-[11px] font-black uppercase tracking-wide', s.chip)}>
        {zone === 'out'
          ? (<><TriangleAlert className="size-3.5" /> TOP {info.cut} · გჭირდება {toRank - info.cut}</>)
          : (<><Check className="size-3.5" strokeWidth={3.5} /> TOP {info.cut}</>)}
      </div>
    </motion.div>
  );
}


/** Your identity card pinned above the side board — the events-hub "#1 card"
 *  language: bordered card, name + points left, big rank right. Border color
 *  is the zone. */
export function YourRankCard({
  nickname, points, info,
}: {
  nickname: string;
  points: number;
  info: RankInfo;
}) {
  const zone = zoneOf(info);
  const s = ZONE_STYLE[zone];
  return (
    <div className={cn('flex items-center gap-3 rounded-[18px] border-2 px-4 py-3', s.wrap)}>
      <div className="min-w-0 flex-1">
        <div className="truncate font-poppins text-[15px] font-black uppercase text-white">{nickname}</div>
        <div className="font-poppins text-[12px] font-bold tabular-nums text-white/60">{points} ქულა</div>
      </div>
      <DeltaChip delta={info.delta} />
      <motion.div
        key={info.rank}
        initial={{ scale: 0.75, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 20 }}
        className="font-poppins text-[30px] font-black tabular-nums text-white"
        style={poppins}
      >
        #{info.rank}
      </motion.div>
    </div>
  );
}

/**
 * Web-only docked leaderboard: the FULL field, scrollable, cut line drawn,
 * rows layout-animate as ranks change so movement is visible in realtime.
 */
export function SideLeaderboard({
  board, selfUserId, cut, className,
}: {
  board: CutBoardRow[];
  selfUserId: string;
  cut: number;
  className?: string;
}) {
  return (
    <div className={cn('overflow-y-auto overscroll-contain rounded-[10px] border-2 border-brand-green bg-black/30', className)}>
      {board.map((r) => (
        <motion.div layout key={r.user_id} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
          {r.rank === cut + 1 && (
            <div className="flex items-center gap-2 bg-brand-red-soft/15 px-3 py-1">
              <span className="h-px flex-1 bg-brand-red-soft/60" />
              <span className="font-poppins text-[9px] font-black uppercase tracking-[0.18em] text-brand-red-soft">
                TOP {cut} გადადის
              </span>
              <span className="h-px flex-1 bg-brand-red-soft/60" />
            </div>
          )}
          <div className="border-t border-brand-green/25 first:border-t-0">
            <CutRow row={r} isYou={r.user_id === selfUserId} out={r.rank > cut} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export interface CutBoardRow {
  user_id: string;
  nickname: string;
  points: number;
  rank: number;
}

const MEDALS: Record<number, string> = { 1: '#FFD700', 2: '#C7CBD1', 3: '#CD7F32' };

function CutRow({ row, isYou, out }: { row: CutBoardRow; isYou: boolean; out: boolean }) {
  const medal = MEDALS[row.rank] ?? null;
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 transition-colors',
      isYou ? 'bg-brand-green text-white' : 'text-white',
      !isYou && out && 'opacity-60',
    )}>
      {medal ? (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full font-poppins text-sm font-black tabular-nums text-black shadow-[0_0_12px_rgba(0,0,0,0.35)]"
          style={{ ...poppins, backgroundColor: medal }}
        >
          {row.rank}
        </span>
      ) : (
        <span className="min-w-[2.1rem] text-center font-poppins text-base font-black tabular-nums" style={poppins}>
          #{row.rank}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-fun text-sm font-black uppercase">
        {row.nickname}
      </span>
      <span className="shrink-0 font-poppins text-base font-black tabular-nums" style={poppins}>
        {row.points}
      </span>
    </div>
  );
}

/**
 * Standings with the qualification line DRAWN. Shows the top 3, then a
 * window centered on you, with the cut divider exactly where it falls.
 */
export function CutlineBoard({
  board, selfUserId, cut, window: win = 3,
}: {
  board: CutBoardRow[];
  selfUserId: string;
  cut: number;
  /** Rows shown on each side of you. */
  window?: number;
}) {
  const you = board.find((r) => r.user_id === selfUserId);
  if (!you) return null;
  const lo = Math.max(1, Math.min(you.rank - win, cut - 1));
  const hi = Math.min(board.length, Math.max(you.rank + win, cut + 2));
  const windowRows = board.filter((r) => r.rank >= lo && r.rank <= hi);
  const topRows = lo > 1 ? board.filter((r) => r.rank <= Math.min(3, lo - 1)) : [];
  const gap = topRows.length > 0 && lo > topRows.length + 1;

  const renderRows = (rows: CutBoardRow[]) => rows.map((r, i) => (
    <div key={r.user_id}>
      {r.rank === cut + 1 && (
        <div className="relative flex items-center gap-2 bg-brand-red-soft/15 px-3 py-1">
          <span className="h-px flex-1 bg-brand-red-soft/60" />
          <span className="font-poppins text-[10px] font-black uppercase tracking-[0.18em] text-brand-red-soft">
            TOP {cut} გადადის
          </span>
          <span className="h-px flex-1 bg-brand-red-soft/60" />
        </div>
      )}
      <div className={i > 0 || r.rank === cut + 1 ? 'border-t border-white/5' : ''}>
        <CutRow row={r} isYou={r.user_id === selfUserId} out={r.rank > cut} />
      </div>
    </div>
  ));

  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[12px] border-2 border-brand-green/70">
      {renderRows(topRows)}
      {gap && <div className="bg-black/40 py-0.5 text-center font-poppins text-[11px] font-bold text-white/30">⋯</div>}
      {renderRows(windowRows)}
    </div>
  );
}
