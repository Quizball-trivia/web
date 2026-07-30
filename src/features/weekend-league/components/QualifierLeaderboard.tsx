'use client';

import { TierFrameAvatar } from '@/components/TierFrameAvatar';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins, PLAYOFF_CUTOFF } from '../constants';
import { prizeForRank } from '../mock-data';
import type { LeaguePlayer } from '../types';
import { LiveBadge } from './LiveBadge';

const MEDAL = ['🥇', '🥈', '🥉'];

function ScoreRow({ player, rank, isYou }: { player: LeaguePlayer; rank: number; isYou: boolean }) {
  const { t } = useLocale();
  const prize = prizeForRank(rank);
  return (
    <div
      className={`grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-3 py-2.5 sm:px-4 ${
        isYou ? 'bg-brand-green/12' : ''
      }`}
    >
      <div className="flex items-center justify-center">
        {rank <= 3 ? (
          <span className="text-xl leading-none">{MEDAL[rank - 1]}</span>
        ) : (
          <span className="font-poppins text-base font-black tabular-nums text-white/70" style={poppins}>{rank}</span>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <TierFrameAvatar
          tier={player.tier}
          avatarCustomization={{ base: player.avatar }}
          avatarFallback={player.avatar}
          countryCode={player.country}
          size="sm"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-poppins text-sm font-black uppercase text-white">{player.username}</span>
            {isYou && (
              <span className="shrink-0 rounded bg-brand-green px-1.5 py-0.5 font-poppins text-[9px] font-black uppercase text-white">You</span>
            )}
          </div>
          <div className="truncate font-poppins text-[10px] font-bold uppercase tracking-wide text-white/40">{player.tier}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {prize && <span className="text-base leading-none" title={t(prize.prizeKey)}>{prize.icon}</span>}
        <span className="font-poppins text-base font-black tabular-nums text-brand-yellow" style={poppins}>
          {player.score.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/** Qualifier standings: podium, ranked rows, the top-24 cutoff, your pinned row. */
export function QualifierLeaderboard({
  entries,
  yourRank,
  live = false,
  limit = 26,
  title = 'Qualifier standings',
}: {
  entries: LeaguePlayer[];
  yourRank: number;
  live?: boolean;
  limit?: number;
  title?: string;
}) {
  const [first, second, third] = entries;
  const podium = [second, first, third]; // visual order: 2 · 1 · 3
  const rows = entries.slice(0, limit);
  const youBelowFold = yourRank > limit;
  const you = entries[yourRank - 1];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-poppins text-lg font-black uppercase tracking-wide text-white">{title}</h2>
        {live && <LiveBadge />}
      </div>

      {/* Podium */}
      <div className="mb-4 grid grid-cols-3 items-end gap-2">
        {podium.map((p, i) => {
          const rank = p === first ? 1 : p === second ? 2 : 3;
          const isFirst = rank === 1;
          return (
            <div
              key={p.id}
              className={`flex flex-col items-center rounded-2xl border-2 px-2 pb-3 pt-4 ${
                isFirst ? 'border-brand-gold/50 bg-brand-gold/10' : 'border-white/10 bg-surface-card-deep'
              } ${i === 0 ? 'mt-4' : i === 2 ? 'mt-6' : ''}`}
            >
              <span className="mb-1 text-xl leading-none">{MEDAL[rank - 1]}</span>
              <TierFrameAvatar
                tier={p.tier}
                avatarCustomization={{ base: p.avatar }}
                avatarFallback={p.avatar}
                countryCode={p.country}
                size={isFirst ? 'md' : 'sm'}
              />
              <span className="mt-2 w-full truncate text-center font-poppins text-[11px] font-black uppercase text-white">{p.username}</span>
              <span className="font-poppins text-lg font-black tabular-nums text-brand-yellow" style={poppins}>{p.score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      {/* Rows */}
      <div className="overflow-hidden rounded-2xl border-2 border-white/10 bg-surface-card">
        <div className="divide-y divide-white/5">
          {rows.map((p, i) => {
            const rank = i + 1;
            return (
              <div key={p.id}>
                <ScoreRow player={p} rank={rank} isYou={Boolean(p.isYou)} />
                {rank === PLAYOFF_CUTOFF && (
                  <div className="flex items-center gap-2 bg-brand-gold/10 px-4 py-1.5">
                    <span className="h-px flex-1 bg-brand-gold/40" />
                    <span className="font-poppins text-[10px] font-black uppercase tracking-widest text-brand-gold">
                      Top {PLAYOFF_CUTOFF} qualify for playoffs
                    </span>
                    <span className="h-px flex-1 bg-brand-gold/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pin the viewer's row when they're below the shown window */}
        {youBelowFold && you && (
          <>
            <div className="py-1.5 text-center font-poppins text-lg leading-none text-white/25">···</div>
            <div className="border-t-2 border-brand-green/30">
              <ScoreRow player={you} rank={yourRank} isYou />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
