import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export type PlayerStatus = 'waiting' | 'playing' | 'won' | 'eliminated';
export type MatchStatus = 'upcoming' | 'live' | 'completed';

export interface TournamentPlayer {
  id: string;
  username: string;
  avatar: string;
  status: PlayerStatus;
  isCurrentUser: boolean;
}

export interface TournamentMatch {
  id: string;
  player1: TournamentPlayer;
  player2: TournamentPlayer;
  winner?: string; // player id
  status: MatchStatus;
  round: number;
}

interface LiveTournamentBracketProps {
  matches: TournamentMatch[];
  currentRound: number;
  totalRounds: number;
}

export function LiveTournamentBracket({
  matches,
  currentRound,
  totalRounds,
}: LiveTournamentBracketProps) {
  // Group matches by round
  const matchesByRound = matches.reduce<{ [key: number]: TournamentMatch[] }>(
    (acc, match) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    },
    {}
  );

  const getRoundName = (round: number) => {
    const playersInRound = Math.pow(2, totalRounds - round + 1);
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semi-Finals';
    if (round === totalRounds - 2) return 'Quarter-Finals';
    return `Round of ${playersInRound}`;
  };

  const getStatusColor = (status: PlayerStatus) => {
    switch (status) {
      case 'playing':
        return 'text-primary';
      case 'won':
        return 'text-green-500';
      case 'eliminated':
        return 'text-muted-foreground line-through opacity-50';
      default:
        return 'text-foreground';
    }
  };

  const getStatusBadge = (status: PlayerStatus) => {
    switch (status) {
      case 'playing':
        return <Badge className="text-xs bg-primary">Playing</Badge>;
      case 'won':
        return <Badge className="text-xs bg-green-500">Won</Badge>;
      case 'eliminated':
        return <Badge variant="outline" className="text-xs">Eliminated</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tournament Status Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-green-500/10 border-2 border-primary/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Current Round</div>
                <div className="text-lg">{getRoundName(currentRound)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Matches</div>
              <div className="text-lg">
                {matchesByRound[currentRound]?.filter(m => m.status === 'completed').length || 0}/
                {matchesByRound[currentRound]?.length || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rounds */}
      {Object.keys(matchesByRound)
        .map(Number)
        .sort((a, b) => a - b)
        .map((round) => {
          const roundMatches = matchesByRound[round];
          const isCurrentRound = round === currentRound;

          return (
            <Card key={round} className={isCurrentRound ? 'border-2 border-primary' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {isCurrentRound && <Zap className="size-4 text-primary" />}
                    {getRoundName(round)}
                  </span>
                  {isCurrentRound && (
                    <Badge className="text-xs bg-primary">Live</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roundMatches.map((match, matchIndex) => {
                    const isUserMatch = match.player1.isCurrentUser || match.player2.isCurrentUser;

                    return (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-lg border-2 ${
                          isUserMatch && match.status === 'live'
                            ? 'bg-primary/10 border-primary animate-pulse'
                            : isUserMatch
                              ? 'bg-primary/5 border-primary/30'
                              : 'bg-secondary border-transparent'
                        }`}
                      >
                        {/* Match Status */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-muted-foreground">
                            Match {matchIndex + 1}
                          </div>
                          {match.status === 'live' && (
                            <div className="flex items-center gap-1.5 text-xs text-primary">
                              <div className="size-2 rounded-full bg-primary animate-pulse" />
                              Live Now
                            </div>
                          )}
                          {match.status === 'upcoming' && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="size-3" />
                              Upcoming
                            </div>
                          )}
                          {isUserMatch && (
                            <Badge className="text-xs bg-primary">You</Badge>
                          )}
                        </div>

                        {/* Players */}
                        <div className="space-y-2">
                          {/* Player 1 */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="text-xl">{match.player1.avatar}</div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm truncate ${getStatusColor(match.player1.status)}`}>
                                  {match.player1.username}
                                </div>
                              </div>
                            </div>
                            <div>
                              {getStatusBadge(match.player1.status)}
                              {match.winner === match.player1.id && (
                                <Trophy className="size-4 text-yellow-500 inline ml-1" />
                              )}
                            </div>
                          </div>

                          {/* VS Divider */}
                          <div className="flex items-center gap-2">
                            <div className="h-px bg-border flex-1" />
                            <div className="text-xs text-muted-foreground px-2">VS</div>
                            <div className="h-px bg-border flex-1" />
                          </div>

                          {/* Player 2 */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1">
                              <div className="text-xl">{match.player2.avatar}</div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm truncate ${getStatusColor(match.player2.status)}`}>
                                  {match.player2.username}
                                </div>
                              </div>
                            </div>
                            <div>
                              {getStatusBadge(match.player2.status)}
                              {match.winner === match.player2.id && (
                                <Trophy className="size-4 text-yellow-500 inline ml-1" />
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
