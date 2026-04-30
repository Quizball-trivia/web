import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useRecentMatches } from '@/lib/queries/stats.queries';
import { COLLAPSED_MATCHES_COUNT, MAX_MATCHES_COUNT } from '@/lib/constants/matches';
import { formatMatchScore } from '@/utils/matchScore';
import { AvatarDisplay } from '@/components/AvatarDisplay';

const rowBorder = (result: string) => {
  if (result === 'win') return 'border-[#38B60E]';
  if (result === 'loss') return 'border-[#E04B3A]';
  return 'border-[#3A4F56]';
};

const rpPillTone = (result: string) => {
  if (result === 'win') return 'bg-[#348A1A] text-white';
  if (result === 'loss') return 'bg-[#B8401D] text-white';
  return 'bg-[#3A4F56] text-white';
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
        avatarCustomization: match.opponent.avatarCustomization,
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
            className={`flex items-center gap-3 rounded-[16px] min-h-[58px] md:min-h-[62px] px-4 md:px-5 border-2 bg-[#041217] ${rowBorder(match.result)}`}
          >
            {/* Avatar */}
            <div className="relative size-8 md:size-10 shrink-0 rounded-full bg-white/20 flex items-center justify-center">
              {match.avatarCustomization || match.avatarUrl ? (
                <AvatarDisplay
                  customization={match.avatarCustomization ?? { base: match.avatarUrl ?? undefined }}
                  size="xs"
                />
              ) : (
                <span className="text-sm font-black text-white/80">
                  {match.opponent.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="font-poppins text-[12px] md:text-[14px] font-semibold leading-none text-white uppercase truncate">
                vs {match.opponent}
              </div>
              <div className="mt-1 font-poppins text-[8px] md:text-[9px] font-medium leading-none tracking-[0.08em] text-white/70 uppercase">
                {match.mode} · {match.time}
              </div>
            </div>

            {/* RP + Score */}
            <div className="ml-auto flex items-center justify-end gap-3 md:gap-5 shrink-0 whitespace-nowrap">
              {match.competition !== 'friendly' && match.rpDelta !== null && (
                <span className={`rounded-[8px] px-3 py-2 font-poppins text-[10px] md:text-[11px] font-semibold leading-none tabular-nums ${rpPillTone(match.result)}`}>
                  {match.rpDelta >= 0 ? '+' : ''}{match.rpDelta} RP
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <span className="font-poppins text-[20px] md:text-[22px] font-semibold leading-none text-white tabular-nums">
                  {match.score}
                </span>
                {match.scoreSuffix && (
                  <span className="font-poppins text-[10px] md:text-[11px] font-medium text-white/70">
                    {match.scoreSuffix}
                  </span>
                )}
                {match.scoreBadge && (
                  <span className={`rounded-[8px] px-2 py-1 font-poppins text-[9px] md:text-[10px] font-semibold uppercase ${
                    match.scoreBadgeVariant === 'red'
                      ? 'bg-[#4D1C1B] text-[#FF8B7D]'
                      : 'bg-white/10 text-white/70'
                  }`}>
                    {match.scoreBadge}
                  </span>
                )}
              </div>
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
