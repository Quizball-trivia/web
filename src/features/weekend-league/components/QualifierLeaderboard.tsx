'use client';

import { useLocale } from '@/contexts/LocaleContext';
import { LeaderboardPodium } from '@/features/leaderboard/components/LeaderboardPodium';
import { LeaderboardTable } from '@/features/leaderboard/components/LeaderboardTable';
import type { LeaderboardEntry } from '@/lib/domain/leaderboard';
import { PLAYOFF_CUTOFF } from '../constants';
import type { LeaguePlayer } from '../types';
import { LiveBadge } from './LiveBadge';

/** Adapts the league's mock players onto the app-wide leaderboard entry shape. */
function toEntries(players: LeaguePlayer[]): LeaderboardEntry[] {
  return players.map((p, i) => ({
    id: p.id,
    rank: i + 1,
    username: p.username,
    avatar: p.avatar,
    country: p.country,
    tier: p.tier,
    rankPoints: p.score,
    isCurrentUser: Boolean(p.isYou),
    trend: 'same' as const,
    trendValue: 0,
  }));
}

/**
 * Qualifier standings, rendered with the app's own leaderboard podium + table so
 * it reads identically to /leaderboard. Scores are qualifier points, so the
 * points column is labelled QP.
 */
export function QualifierLeaderboard({
  entries,
  yourRank,
  live = false,
  limit = PLAYOFF_CUTOFF,
  title,
}: {
  entries: LeaguePlayer[];
  yourRank: number;
  live?: boolean;
  limit?: number;
  title?: string;
}) {
  const { t } = useLocale();
  const rows = toEntries(entries);
  const topThree = rows.slice(0, 3);
  const shown = rows.slice(0, limit);
  const you = rows[yourRank - 1];
  const youBelowFold = yourRank > limit;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-poppins text-lg font-black uppercase tracking-wide text-white">
          {title ?? t('weekendLeague.standings')}
        </h2>
        {live && <LiveBadge />}
      </div>

      {/* eventMode={false}: the Weekend League has its own identity — it must not
          inherit the Betsson/World Cup event skin from the region hook. */}
      <div className="mb-5">
        <LeaderboardPodium topThree={topThree} eventMode={false} medalColors />
      </div>

      {/* Only the qualifying places are shown — below the cutoff is noise. */}
      <LeaderboardTable entries={shown} pointsLabel="QP" eventMode={false} />

      <div className="mt-2 flex items-center gap-2 rounded-[10px] bg-brand-gold/10 px-4 py-1.5">
        <span className="h-px flex-1 bg-brand-gold/40" />
        <span className="font-poppins text-[10px] font-black uppercase tracking-widest text-brand-gold">
          {t('weekendLeague.topQualify', { count: PLAYOFF_CUTOFF })}
        </span>
        <span className="h-px flex-1 bg-brand-gold/40" />
      </div>

      {/* Pin the viewer's row when they're below the shown window */}
      {youBelowFold && you && (
        <>
          <div className="py-1.5 text-center font-poppins text-lg leading-none text-white/25">···</div>
          <LeaderboardTable entries={[you]} pointsLabel="QP" eventMode={false} />
        </>
      )}
    </section>
  );
}
