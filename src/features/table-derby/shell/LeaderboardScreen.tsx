'use client';

/** Leaderboard in the style of Quizball's Betsson World Cup event board
 *  (Jun–Jul 2026): points headline, orange-bordered rank strip, orange
 *  pill periods, and an orange-rimmed rankings table whose first row is
 *  filled orange. */

import { useState } from 'react';
import { MyAvatar, TdAvatar } from '../components/Avatar';
import { TD_DISPLAY } from '../components/brand';
import { TD } from '../lib/copy';

export interface LbRow {
  name: string;
  points: number;
  me?: boolean;
}

const PERIODS = [TD.lbWeek, TD.lbMonthly, TD.lbAllTime] as const;
const EVENT_ORANGE = 'var(--bs-primary)';
const NUM = 'font-[Poppins] font-bold tabular-nums';

function RowAvatar({ row, size }: { row: LbRow; size: number }) {
  return row.me ? <MyAvatar size={size} /> : <TdAvatar name={row.name} size={size} />;
}

function MyRankStrip({ row, rank }: { row: LbRow; rank: number }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-3 rounded-[10px] border-2 px-3 py-3 md:px-4" style={{ borderColor: EVENT_ORANGE }}>
        <div className={`${NUM} w-[52px] shrink-0 text-center text-2xl text-white md:w-[72px] md:text-3xl`}>#{rank}</div>
        <RowAvatar row={row} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] text-white md:text-[18px]" style={{ ...TD_DISPLAY, lineHeight: 1.3 }}>
            {row.name}
          </div>
          <div className={`${NUM} mt-0.5 text-[12px] text-white/70`}>
            {row.points} {TD.qpShort}
          </div>
        </div>
      </div>
    </div>
  );
}

function RankingsTable({ rows }: { rows: LbRow[] }) {
  return (
    <div className="overflow-hidden rounded-[10px] border-2" style={{ borderColor: EVENT_ORANGE }}>
        <div className="divide-y divide-white/5">
          {rows.map((row, i) => {
            const rank = i + 1;
            const first = rank === 1;
            return (
              <div
                key={row.name}
                className="grid grid-cols-[52px_1fr_auto] items-center gap-2 px-3 py-3 md:grid-cols-[72px_1fr_auto] md:px-4"
                style={first ? { background: EVENT_ORANGE } : row.me ? { background: 'rgba(241,90,34,0.16)' } : undefined}
              >
                <span className={`${NUM} text-center text-[18px] text-white md:text-[22px]`}>#{rank}</span>
                <span className="flex min-w-0 items-center gap-2.5">
                  <RowAvatar row={row} size={36} />
                  <span className="truncate text-[13px] text-white md:text-[15px]" style={{ ...TD_DISPLAY, lineHeight: 1.3 }}>
                    {row.name}
                  </span>
                  {row.me && (
                    <span className="bs-text shrink-0 rounded-full bg-black/30 px-1.5 py-px text-[9px] text-white">{TD.lbYou}</span>
                  )}
                </span>
                <span className={`${NUM} pr-1 text-[15px] text-white md:text-[18px]`}>{row.points}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export function LeaderboardScreen({ rows }: { rows: LbRow[] }) {
  const [period, setPeriod] = useState(0);
  const myIdx = rows.findIndex((r) => r.me);
  const me = myIdx >= 0 ? rows[myIdx] : null;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h1 className="text-[28px] text-white md:text-[48px]" style={{ ...TD_DISPLAY, lineHeight: 1.1 }}>
            {TD.menuLb}
          </h1>
          <p className="bs-text mt-1 text-[12px] text-[var(--bs-text-2)]">{TD.menuLbSub}</p>
        </div>
        {me && (
          <span className={`${NUM} shrink-0 text-[22px] md:text-[34px]`} style={{ color: EVENT_ORANGE }}>
            {me.points} {TD.qpShort}
          </span>
        )}
      </div>

      {me && <MyRankStrip row={me} rank={myIdx + 1} />}

      <div className="flex justify-center gap-2 md:gap-3" role="tablist">
        {PERIODS.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={period === i}
            onClick={() => setPeriod(i)}
            className="bs-text h-9 min-w-[92px] rounded-full px-4 text-[12px] font-bold text-white transition-colors md:min-w-[130px] md:text-[13px]"
            style={period === i ? { background: EVENT_ORANGE } : { border: `2px solid ${EVENT_ORANGE}` }}
          >
            {label}
          </button>
        ))}
      </div>

      <h2 className="text-[22px] text-white md:text-[28px]" style={{ ...TD_DISPLAY, lineHeight: 1.2 }}>
        {TD.lbRankings}
      </h2>
      <RankingsTable rows={rows} />
    </>
  );
}
