import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRecentMatches } from '@/lib/queries/stats.queries';
import { COLLAPSED_MATCHES_COUNT, MAX_MATCHES_COUNT } from '@/lib/constants/matches';
import { formatMatchScore } from '@/utils/matchScore';

const rowBorder = (result: string) => {
  if (result === 'win') return 'border-[#38B60E]';
  if (result === 'loss') return 'border-[#E04B3A]';
  return 'border-[#3A4F56]';
};

interface HomeRecentMatchesProps {
  /** If true, only show collapsed count without expand option */
  collapsedOnly?: boolean;
}

export function HomeRecentMatches({ collapsedOnly = false }: HomeRecentMatchesProps) {
  const router = useRouter();
  const fetchCount = collapsedOnly ? COLLAPSED_MATCHES_COUNT : MAX_MATCHES_COUNT;
  const { data: recentMatches = [], isLoading, error } = useRecentMatches(fetchCount);
  const [isExpanded, setIsExpanded] = useState(false);

  const matches = useMemo(() =>
    recentMatches.map((match) => {
      const formatted = formatMatchScore(match);
      return {
        id: match.matchId,
        result: match.result,
        opponent: match.opponent.username,
        avatarUrl: match.opponent.avatarUrl,
        mode: match.mode === 'ranked' ? 'Ranked' : 'Friendly',
        competition: match.competition,
        rpDelta: match.rpDelta,
        score: formatted.score,
        scoreSuffix: formatted.suffix,
        scoreBadge: formatted.badge,
        scoreBadgeVariant: formatted.badgeVariant,
        time: match.timeLabel,
      };
    }),
    [recentMatches]
  );

  const { visibleMatches, hiddenCount, canExpand } = useMemo(() => {
    const visible = isExpanded || collapsedOnly
      ? matches
      : matches.slice(0, COLLAPSED_MATCHES_COUNT);
    const hidden = matches.length - visible.length;
    return {
      visibleMatches: visible,
      hiddenCount: hidden,
      canExpand: !collapsedOnly && matches.length > COLLAPSED_MATCHES_COUNT,
    };
  }, [matches, isExpanded, collapsedOnly]);

  return (
    <div className="font-fun">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-poppins text-base text-white uppercase">
          Recent Matches
        </h2>
        <button
          type="button"
          onClick={() => router.push('/profile')}
          className="font-poppins flex items-center justify-center w-[120px] h-[40px] rounded-xl border-2 border-[#58CC02] text-xs text-white uppercase tracking-wide hover:bg-[#58CC02]/10 transition-colors"
        >
          View All
        </button>
      </div>

      {/* Match rows */}
      <div className="space-y-2.5">
        {isLoading && (
          <div className="p-4 rounded-2xl bg-[#1B2F36] text-sm font-bold text-[#56707A]">
            Loading recent matches...
          </div>
        )}
        {!isLoading && error && (
          <div
            role="alert"
            aria-live="polite"
            className="p-4 rounded-2xl bg-[#FF4B4B]/10 text-sm font-bold text-[#FF4B4B]"
          >
            Failed to load recent matches. Please try again later.
          </div>
        )}
        {!isLoading && !error && matches.length === 0 && (
          <div className="p-4 rounded-2xl bg-[#1B2F36] text-sm font-bold text-[#56707A]">
            No recent matches yet.
          </div>
        )}
        {!isLoading && !error && visibleMatches.map((match) => (
          <div
            key={match.id}
            className={`flex items-center rounded-[20px] h-[72px] md:h-[100px] px-3 md:px-5 border-2 ${rowBorder(match.result)}`}
          >
            {/* Avatar */}
            <div className="relative size-10 md:size-14 shrink-0 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
              {match.avatarUrl ? (
                <Image src={match.avatarUrl} alt="" fill className="object-cover" unoptimized />
              ) : (
                <span className="text-lg font-black text-white/80">
                  {match.opponent.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="ml-3 min-w-0 flex-1">
              <div className="font-poppins text-sm md:text-lg text-white uppercase truncate">
                vs {match.opponent}
              </div>
              <div className="font-poppins text-[10px] md:text-sm text-white/70 uppercase">
                {match.mode} · {match.time}
              </div>
            </div>

            {/* Result + RP + Score */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <span className="font-poppins text-base md:text-2xl text-white uppercase italic">
                {match.result === 'win' ? 'Win' : match.result === 'loss' ? 'Lose' : 'Draw'}
              </span>
              {match.competition !== 'friendly' && match.rpDelta !== null && (
                <span className="font-poppins text-xs md:text-sm text-white/90 tabular-nums">
                  {match.rpDelta >= 0 ? '+' : ''}{match.rpDelta} RP
                </span>
              )}
              <span className="font-poppins text-base md:text-2xl text-white">
                {match.score}
              </span>
            </div>
          </div>
        ))}

        {/* Expand/Collapse button */}
        {!isLoading && !error && canExpand && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[#1B2F36] hover:bg-[#243B44] transition-all text-sm font-bold text-[#56707A] hover:text-white"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="size-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="size-4" />
                Show {hiddenCount} more
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
