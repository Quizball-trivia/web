'use client';

import { useState } from 'react';
import { MyAvatar, TdAvatar } from '../components/Avatar';
import { TD } from '../lib/copy';
import { AvatarRing, BsGroup, SectionTitle } from './ui';

export interface LbRow {
  name: string;
  points: number;
  me?: boolean;
}

const PERIODS = [TD.lbWeekly, TD.lbMonthly, TD.lbAllTime] as const;

function Row({ rank, row }: { rank: number; row: LbRow }) {
  return (
    <div className="bs-row" style={row.me ? { background: 'rgba(241,90,34,0.08)' } : undefined}>
      <span className="w-6 text-center font-[Poppins] text-[13px] font-bold" style={{ color: rank <= 3 ? 'var(--bs-primary)' : 'var(--bs-text-3)' }}>
        {rank}
      </span>
      <AvatarRing size={32} ring={!!row.me}>
        {row.me ? <MyAvatar size={32} /> : <TdAvatar name={row.name} size={32} />}
      </AvatarRing>
      <span className="bs-text min-w-0 flex-1 truncate text-[14px] font-bold text-[var(--bs-text)]">
        {row.name}
        {row.me && (
          <span className="ml-1.5 rounded-full px-1.5 py-px align-[1px] text-[9px] text-white" style={{ background: 'var(--bs-primary)' }}>
            {TD.lbYou}
          </span>
        )}
      </span>
      <span className="font-[Poppins] text-[14px] font-bold tabular-nums" style={{ color: 'var(--bs-primary)' }}>
        {row.points}
      </span>
    </div>
  );
}

export function LeaderboardScreen({ rows }: { rows: LbRow[] }) {
  const [period, setPeriod] = useState(0);
  const myIdx = rows.findIndex((r) => r.me);
  return (
    <>
      <SectionTitle>{TD.menuLb}</SectionTitle>
      <div className="-mt-1 flex gap-5 border-b px-1" style={{ borderColor: 'var(--bs-border)' }}>
        {PERIODS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setPeriod(i)}
            className="bs-text -mb-px pb-2 text-[13px]"
            style={{
              color: period === i ? 'var(--bs-text)' : 'var(--bs-text-3)',
              fontWeight: period === i ? 700 : 500,
              borderBottom: period === i ? '2px solid #fff' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <BsGroup>
        {rows.map((row, i) => (
          <Row key={row.name} rank={i + 1} row={row} />
        ))}
      </BsGroup>
      {myIdx >= 0 && (
        <BsGroup className="sticky bottom-[88px] md:bottom-4" >
          <div style={{ boxShadow: 'inset 0 0 0 1.5px var(--bs-primary)', borderRadius: 12 }}>
            <Row rank={myIdx + 1} row={rows[myIdx]} />
          </div>
        </BsGroup>
      )}
    </>
  );
}
