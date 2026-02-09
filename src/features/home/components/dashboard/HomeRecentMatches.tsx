import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, ArrowRight, Trophy, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useRecentMatches } from '@/lib/queries/stats.queries';
import { COLLAPSED_MATCHES_COUNT, MAX_MATCHES_COUNT } from '@/lib/constants/matches';

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
    recentMatches.map((match) => ({
      id: match.matchId,
      result: match.result,
      opponent: match.opponent.username,
      mode: match.mode === 'ranked' ? 'Ranked' : 'Friendly',
      score: `${match.playerScore}-${match.opponentScore}`,
      time: match.timeLabel,
    })),
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
    <Card className="h-full border-border/40 bg-card/40 backdrop-blur-sm relative overflow-hidden">
      <div className="p-6 h-full flex flex-col justify-between relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
               <Clock className="size-4" />
            </div>
            Recent Matches
          </h3>
          <Button variant="ghost" size="sm" className="h-8 shrink-0 text-muted-foreground hover:text-foreground font-semibold -mr-2" onClick={() => router.push('/profile')}>
            View All
            <ArrowRight className="ml-1 size-3.5" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-3 mt-4">
          {isLoading && (
            <div className="p-3.5 rounded-xl bg-background/40 border border-border/40 text-sm font-semibold text-muted-foreground">
              Loading recent matches...
            </div>
          )}
          {!isLoading && error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-semibold text-red-500">
              Failed to load recent matches. Please try again later.
            </div>
          )}
          {!isLoading && !error && matches.length === 0 && (
            <div className="p-3.5 rounded-xl bg-background/40 border border-border/40 text-sm font-semibold text-muted-foreground">
              No recent matches yet.
            </div>
          )}
          {!isLoading && !error && visibleMatches.map((match) => (
              <div key={match.id} className="flex items-center justify-between p-3.5 rounded-xl bg-background/40 border border-border/40 hover:bg-background/60 hover:border-border/60 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3.5">
                    {match.result === 'win' ? (
                      <div className="p-1.5 rounded-full bg-green-500/10 text-green-500 ring-1 ring-green-500/20">
                         <CheckCircle2 className="size-4 shrink-0" />
                      </div>
                    ) : match.result === 'loss' ? (
                      <div className="p-1.5 rounded-full bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
                         <XCircle className="size-4 shrink-0" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-full bg-muted text-muted-foreground ring-1 ring-border">
                         <Clock className="size-4 shrink-0" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-sm truncate max-w-[140px] leading-tight">
                         vs {match.opponent}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                         {match.mode === 'Ranked' ? <Trophy className="size-3" /> : <Zap className="size-3" />}
                         {match.mode} · {match.time}
                      </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`text-base font-black tracking-tight ${
                      match.result === 'win'
                        ? 'text-green-500'
                        : match.result === 'loss'
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                    }`}>
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
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-background/30 border border-border/40 hover:bg-background/50 hover:border-border/60 transition-all text-sm font-semibold text-muted-foreground hover:text-foreground"
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
    </Card>
  );
}
