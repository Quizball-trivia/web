import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, XCircle, ArrowRight, Trophy, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useRecentMatches } from '@/lib/queries/stats.queries';
import { COLLAPSED_MATCHES_COUNT, MAX_MATCHES_COUNT } from '@/lib/constants/matches';
import { formatMatchScore } from '@/utils/matchScore';

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
    <div className="rounded-2xl bg-[#1B2F36] border-b-4 border-[#0D1B21]">
      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-white flex items-center gap-2 uppercase font-fun">
            <Clock className="size-5 text-[#1CB0F6]" />
            Recent Matches
          </h3>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="flex items-center gap-1 text-xs font-bold text-[#56707A] hover:text-white transition-colors uppercase tracking-wide"
          >
            View All
            <ArrowRight className="size-3.5" />
          </button>
        </div>

        {/* Match rows */}
        <div className="space-y-2">
          {isLoading && (
            <div className="p-4 rounded-xl bg-[#243B44] text-sm font-bold text-[#56707A]">
              Loading recent matches...
            </div>
          )}
          {!isLoading && error && (
            <div
              role="alert"
              aria-live="polite"
              className="p-4 rounded-xl bg-[#FF4B4B]/10 border border-[#FF4B4B]/20 text-sm font-bold text-[#FF4B4B]"
            >
              Failed to load recent matches. Please try again later.
            </div>
          )}
          {!isLoading && !error && matches.length === 0 && (
            <div className="p-4 rounded-xl bg-[#243B44] text-sm font-bold text-[#56707A]">
              No recent matches yet.
            </div>
          )}
          {!isLoading && !error && visibleMatches.map((match) => (
            <div
              key={match.id}
              className="flex items-center justify-between p-3 md:p-3.5 rounded-xl bg-[#0D1B21]/60 border border-white/5 hover:bg-[#243B44] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                {match.result === 'win' ? (
                  <div className="size-8 rounded-xl bg-[#58CC02]/15 border border-[#58CC02]/30 flex items-center justify-center">
                    <CheckCircle2 className="size-4 text-[#58CC02]" />
                  </div>
                ) : match.result === 'loss' ? (
                  <div className="size-8 rounded-xl bg-[#FF4B4B]/15 border border-[#FF4B4B]/30 flex items-center justify-center">
                    <XCircle className="size-4 text-[#FF4B4B]" />
                  </div>
                ) : (
                  <div className="size-8 rounded-xl bg-[#56707A]/15 border border-[#56707A]/30 flex items-center justify-center">
                    <Clock className="size-4 text-[#56707A]" />
                  </div>
                )}
                <div>
                  <div className="font-black text-sm text-white truncate max-w-[140px] leading-tight">
                    vs {match.opponent}
                  </div>
                  <div className="text-[11px] font-semibold text-[#56707A] flex items-center gap-1.5 mt-0.5">
                    {match.mode === 'Ranked' ? <Trophy className="size-3" /> : <Zap className="size-3" />}
                    {match.mode} · {match.time}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {match.competition !== 'friendly' && match.rpDelta !== null && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                    match.rpDelta > 0
                      ? 'bg-[#58CC02]/15 text-[#58CC02] border border-[#58CC02]/25'
                      : match.rpDelta < 0
                        ? 'bg-[#FF4B4B]/15 text-[#FF4B4B] border border-[#FF4B4B]/25'
                        : 'bg-[#56707A]/15 text-[#56707A] border border-[#56707A]/25'
                  }`}>
                    {`${match.rpDelta >= 0 ? '+' : ''}${match.rpDelta} RP`}
                  </span>
                )}
                <span className={`text-base font-black tracking-tight ${
                  match.result === 'win'
                    ? 'text-[#58CC02]'
                    : match.result === 'loss'
                      ? 'text-[#FF4B4B]'
                      : 'text-[#56707A]'
                }`}>
                  {match.score}
                  {match.scoreSuffix && (
                    <span className="text-xs font-bold ml-1 opacity-80">{match.scoreSuffix}</span>
                  )}
                </span>
                {match.scoreBadge && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${
                    match.scoreBadgeVariant === 'red'
                      ? 'bg-[#FF4B4B]/15 text-[#FF4B4B] border border-[#FF4B4B]/25'
                      : 'bg-[#56707A]/15 text-[#56707A] border border-[#56707A]/25'
                  }`}>
                    {match.scoreBadge}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Expand/Collapse button */}
          {!isLoading && !error && canExpand && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0D1B21]/60 border border-white/5 border-b-4 border-b-[#0A1416] hover:bg-[#243B44] transition-all text-sm font-bold text-[#56707A] hover:text-white"
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
    </div>
  );
}
