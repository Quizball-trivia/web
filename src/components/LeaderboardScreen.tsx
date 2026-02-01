import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Trophy, Medal, Globe, Flag, Users, TrendingUp, TrendingDown, Minus, Target, Zap, Award } from 'lucide-react';
import { PlayerStats } from '../types/game';

interface LeaderboardScreenProps {
  globalPlayers: PlayerStats[];
  countryPlayers: PlayerStats[];
  friendsPlayers: PlayerStats[];
  currentPlayerId?: string;
}

// Mock QuizBall category stats for the current user
const mockQuizBallStats = [
  { id: 'premier-league', name: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', globalRank: 247, countryRank: 12, friendsRank: 2, gamesPlayed: 15 },
  { id: 'la-liga', name: 'La Liga', icon: '🇪🇸', globalRank: 412, countryRank: 18, friendsRank: 3, gamesPlayed: 8 },
  { id: 'champions-league', name: 'Champions League', icon: '🏆', globalRank: 145, countryRank: 7, friendsRank: 1, gamesPlayed: 22 },
  { id: 'world-cup', name: 'World Cup', icon: '🌍', globalRank: 89, countryRank: 4, friendsRank: 1, gamesPlayed: 28 },
  { id: 'serie-a', name: 'Serie A', icon: '🇮🇹', globalRank: 523, countryRank: 24, friendsRank: 4, gamesPlayed: 5 },
  { id: 'legends', name: 'Legends', icon: '👑', globalRank: 318, countryRank: 15, friendsRank: 2, gamesPlayed: 12 },
];

export function LeaderboardScreen({ 
  globalPlayers, 
  countryPlayers, 
  friendsPlayers, 
  currentPlayerId 
}: LeaderboardScreenProps) {
  const [activeTab, setActiveTab] = useState('global');
  const [showQuizBallStats, setShowQuizBallStats] = useState(false);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="size-6 text-yellow-500" />;
      case 2:
        return <Medal className="size-6 text-gray-400" />;
      case 3:
        return <Medal className="size-6 text-orange-600" />;
      default:
        return null;
    }
  };

  const getRankChange = (playerId: string) => {
    // Mock rank changes - in real app, this would compare with previous rankings
    const changes: Record<string, number> = {
      '1': 0,
      '2': 1,
      '3': -1,
      '4': 2,
      '5': -2,
      'current': 3,
    };
    return changes[playerId] || 0;
  };

  const renderRankChange = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-0.5 text-xs text-green-600 dark:text-green-400">
          <TrendingUp className="size-3" />
          {change}
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-0.5 text-xs text-red-600 dark:text-red-400">
          <TrendingDown className="size-3" />
          {Math.abs(change)}
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
          <Minus className="size-3" />
        </div>
      );
    }
  };

  const renderPlayerCard = (player: PlayerStats, displayRank: number) => {
    const isCurrentPlayer = player.id === currentPlayerId;
    const rankChange = getRankChange(player.id);
    const winRate = Math.round((player.correctAnswers / (player.gamesPlayed * 10)) * 100);
    const rankIcon = getRankIcon(displayRank);

    return (
      <div
        key={player.id}
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
          isCurrentPlayer
            ? 'bg-primary/10 border-2 border-primary'
            : 'bg-secondary'
        }`}
      >
        {/* Rank */}
        <div className="flex flex-col items-center justify-center size-10 shrink-0">
          {rankIcon ? (
            rankIcon
          ) : (
            <div className="text-lg">#{displayRank}</div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center justify-center size-10 rounded-full bg-primary/10">
          {player.avatar && typeof player.avatar === 'string' && /\p{Emoji}/u.test(player.avatar) ? (
            <Trophy className="size-5 text-primary" />
          ) : (
            <Trophy className="size-5 text-primary" />
          )}
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm truncate">{player.username}</span>
            {isCurrentPlayer && (
              <Badge variant="outline" className="text-xs shrink-0">You</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Level {player.level}</span>
            <span>•</span>
            <span>{winRate}% win rate</span>
          </div>
        </div>

        {/* Stats */}
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1.5 mb-0.5">
            <div className="text-sm flex items-center gap-1">
              <span>{player.totalScore.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">RP</span>
            </div>
            {renderRankChange(rankChange)}
          </div>
          <div className="text-xs text-muted-foreground">
            {player.gamesPlayed} games
          </div>
        </div>
      </div>
    );
  };

  const getCurrentPlayerRank = (players: PlayerStats[]) => {
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentPlayer) return null;
    
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 mb-4">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Your Rank</div>
              <div className="text-2xl">#{currentPlayer.rank}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Total RP</div>
              <div className="text-2xl text-primary">{currentPlayer.totalScore.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">RP to #{currentPlayer.rank - 1}</div>
              <div className="text-lg">
                {currentPlayer.rank > 1 
                  ? (players[currentPlayer.rank - 2].totalScore - currentPlayer.totalScore).toLocaleString()
                  : '-'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header Stats */}
      <Card>
        <CardContent className="pt-6 pb-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Globe className="size-5 mx-auto mb-1 text-blue-500" />
              <div className="text-xs text-muted-foreground mb-0.5">Global</div>
              <div className="text-lg">#{globalPlayers.find(p => p.id === currentPlayerId)?.rank || 156}</div>
            </div>
            <div className="text-center">
              <Flag className="size-5 mx-auto mb-1 text-green-500" />
              <div className="text-xs text-muted-foreground mb-0.5">Country</div>
              <div className="text-lg">#{countryPlayers.find(p => p.id === currentPlayerId)?.rank || 5}</div>
            </div>
            <div className="text-center">
              <Users className="size-5 mx-auto mb-1 text-purple-500" />
              <div className="text-xs text-muted-foreground mb-0.5">Friends</div>
              <div className="text-lg">#{friendsPlayers.find(p => p.id === currentPlayerId)?.rank || 3}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RP System Info */}
      <Card className="bg-gradient-to-br from-primary/5 to-green-500/5 border-primary/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3 mb-3">
            <Award className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm mb-1">Rank Points (RP) System</div>
              <div className="text-xs text-muted-foreground">
                Win ranked matches to earn RP and climb the leaderboard!
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Target className="size-3.5 text-primary" />
                <span className="text-xs">quizball</span>
              </div>
              <div className="text-xs text-muted-foreground">±5 RP</div>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Zap className="size-3.5 text-yellow-600" />
                <span className="text-xs">Buzzer</span>
              </div>
              <div className="text-xs text-muted-foreground">±15 RP</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global" className="text-xs">
            <Globe className="size-3 mr-1" />
            Global
          </TabsTrigger>
          <TabsTrigger value="country" className="text-xs">
            <Flag className="size-3 mr-1" />
            Country
          </TabsTrigger>
          <TabsTrigger value="friends" className="text-xs">
            <Users className="size-3 mr-1" />
            Friends
          </TabsTrigger>
        </TabsList>

        {/* Global Leaderboard */}
        <TabsContent value="global" className="space-y-4 mt-4">
          {getCurrentPlayerRank(globalPlayers)}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="size-5 text-yellow-500" />
                Top Players Worldwide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {globalPlayers.slice(0, 10).map((player, index) => {
                  // Transform usernames to be more realistic for football trivia lovers
                  const footballUsernames = [
                    'MessiMagician', 'CR7Fanatic', 'TikiTakaMaster', 'BluesPride',
                    'YankeeGooner', 'SerieAExpert', 'Bundesliga_King', 'LaLigaLegend',
                    'UCL_Historian', 'PremierLeagueGeek'
                  ];
                  const transformedPlayer = {
                    ...player,
                    username: footballUsernames[index] || player.username
                  };
                  return renderPlayerCard(transformedPlayer, index + 1);
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Country Leaderboard */}
        <TabsContent value="country" className="space-y-4 mt-4">
          {getCurrentPlayerRank(countryPlayers)}
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flag className="size-5 text-green-500" />
                Top Players in Your Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {countryPlayers.map((player, index) => 
                  renderPlayerCard(player, index + 1)
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-sm text-muted-foreground">
                Compete with players from your region! 🌍
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Friends Leaderboard */}
        <TabsContent value="friends" className="space-y-4 mt-4">
          {friendsPlayers.length > 0 ? (
            <>
              {getCurrentPlayerRank(friendsPlayers)}
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="size-5 text-purple-500" />
                    Your Friends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {friendsPlayers.map((player, index) => 
                      renderPlayerCard(player, index + 1)
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Challenge your friends to climb higher! 🚀
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6 pb-6 text-center space-y-3">
                <Users className="size-12 mx-auto text-muted-foreground opacity-50" />
                <div>
                  <h3 className="mb-2">No Friends Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Add friends to compete and see who&apos;s the trivia master!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* quizball Category Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="size-5 text-primary" />
              quizball Category Rankings
            </CardTitle>
            <button
              onClick={() => setShowQuizBallStats(!showQuizBallStats)}
              className="text-xs text-primary hover:underline"
            >
              {showQuizBallStats ? 'Hide' : 'Show'}
            </button>
          </div>
        </CardHeader>
        {showQuizBallStats && (
          <CardContent>
            <div className="space-y-3">
              {mockQuizBallStats.map((category) => (
                <div
                  key={category.id}
                  className="p-3 rounded-lg bg-secondary"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{category.icon}</span>
                    <span className="text-sm">{category.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {category.gamesPlayed} games
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded bg-background">
                      <div className="text-xs text-muted-foreground mb-0.5">Global</div>
                      <div className="text-sm">#{category.globalRank}</div>
                    </div>
                    <div className="text-center p-2 rounded bg-background">
                      <div className="text-xs text-muted-foreground mb-0.5">Country</div>
                      <div className="text-sm">#{category.countryRank}</div>
                    </div>
                    <div className="text-center p-2 rounded bg-background">
                      <div className="text-xs text-muted-foreground mb-0.5">Friends</div>
                      <div className="text-sm">#{category.friendsRank}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Bottom Info */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Trophy className="size-8 text-yellow-500 shrink-0" />
            <div className="text-sm">
              <div className="mb-1">Season 1 ends in 14 days</div>
              <div className="text-xs text-muted-foreground">
                Top 100 players earn exclusive rewards!
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
