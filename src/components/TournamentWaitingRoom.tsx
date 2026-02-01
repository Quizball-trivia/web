import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trophy, Users, Zap, Crown } from 'lucide-react';
import { Progress } from './ui/progress';

interface TournamentWaitingRoomProps {
  tournamentName: string;
  tournamentType: 'weekly' | 'monthly' | 'seasonal';
  prizePool: string;
  onStartMatch: () => void;
  onBack: () => void;
}

// Mock participants for Round of 32
const generateParticipants = () => {
  const names = [
    'You', 'FootballKing', 'TriviaMaster', 'GoalScorer', 'TacticsGuru',
    'LegendHunter', 'ChampionAce', 'SkillMaster', 'TopStriker', 'MidfieldBoss',
    'DefenseWall', 'SpeedDemon', 'ClutchPlayer', 'MVPro', 'AllStar',
    'EliteGamer', 'ProPlayer', 'RankKing', 'PointHunter', 'VictorySeeker',
    'GameChanger', 'TriviaLord', 'QuizMaster', 'BrainBox', 'Genius10',
    'SmartPlay', 'QuickThink', 'FastAnswer', 'SharpMind', 'WiseOwl',
    'KnowItAll', 'FactMaster'
  ];
  
  return names.map((name, index) => ({
    id: `player-${index}`,
    username: name,
    avatar: index === 0 ? '🎯' : ['⚽', '🏆', '👑', '⭐', '💎', '🔥', '⚡', '🎮'][Math.floor(Math.random() * 8)],
    isCurrentUser: index === 0,
  }));
};

export function TournamentWaitingRoom({
  tournamentName,
  tournamentType,
  prizePool,
  onStartMatch,
  onBack,
}: TournamentWaitingRoomProps) {
  const [participants] = useState(generateParticipants());
  const [countdown, setCountdown] = useState(10);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate countdown to match start
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Auto-start game when ready
    if (isReady) {
      const autoStartTimer = setTimeout(() => {
        onStartMatch();
      }, 1000);
      
      return () => clearTimeout(autoStartTimer);
    }
  }, [isReady, onStartMatch]);

  const getTournamentColor = () => {
    switch (tournamentType) {
      case 'weekly':
        return 'from-blue-500/10 to-cyan-500/10 border-blue-500/30';
      case 'monthly':
        return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30';
      case 'seasonal':
        return 'from-purple-500/10 to-pink-500/10 border-purple-500/30';
    }
  };

  const getTournamentIcon = () => {
    switch (tournamentType) {
      case 'weekly':
        return <Trophy className="size-5 text-blue-500" />;
      case 'monthly':
        return <Crown className="size-5 text-yellow-600" />;
      case 'seasonal':
        return <Trophy className="size-5 text-purple-500" />;
    }
  };

  // Split participants into pairs for Round of 32
  const matchups = [];
  for (let i = 0; i < participants.length; i += 2) {
    matchups.push([participants[i], participants[i + 1]]);
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 space-y-4">
        <Card className={`border-2 bg-gradient-to-br ${getTournamentColor()}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getTournamentIcon()}
                <div>
                  <div className="text-lg">{tournamentName}</div>
                  <div className="text-xs text-muted-foreground">Round of 32</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Prize Pool</div>
                <div className="text-lg text-yellow-600">{prizePool}</div>
              </div>
            </div>

            {/* Countdown */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">
                {isReady ? 'Ready to start!' : 'Match starting in'}
              </div>
              {!isReady && (
                <div className="text-4xl mb-2">{countdown}</div>
              )}
              <Progress value={((10 - countdown) / 10) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Match Info */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-around text-center">
              <div>
                <Users className="size-5 mx-auto mb-1 text-primary" />
                <div className="text-xs text-muted-foreground">Players</div>
                <div className="text-lg">32</div>
              </div>
              <div>
                <Zap className="size-5 mx-auto mb-1 text-yellow-500" />
                <div className="text-xs text-muted-foreground">Questions</div>
                <div className="text-lg">10</div>
              </div>
              <div>
                <Trophy className="size-5 mx-auto mb-1 text-green-500" />
                <div className="text-xs text-muted-foreground">Format</div>
                <div className="text-lg">quizball</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="size-5" />
              Round of 32 Matchups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {matchups.map((matchup, index) => {
                const [player1, player2] = matchup;
                const isYourMatch = player1.isCurrentUser || player2?.isCurrentUser;
                
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 ${
                      isYourMatch
                        ? 'bg-primary/10 border-primary'
                        : 'bg-secondary border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground mb-1">
                        Match {index + 1}
                      </div>
                      {isYourMatch && (
                        <Badge className="text-xs bg-primary">Your Match</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      {/* Player 1 */}
                      <div className="flex items-center gap-2 flex-1">
                        <div className="text-xl">{player1.avatar}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm truncate ${player1.isCurrentUser ? 'font-semibold' : ''}`}>
                            {player1.username}
                          </div>
                        </div>
                      </div>

                      {/* VS */}
                      <div className="text-xs text-muted-foreground px-2">VS</div>

                      {/* Player 2 */}
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 min-w-0 text-right">
                          <div className={`text-sm truncate ${player2?.isCurrentUser ? 'font-semibold' : ''}`}>
                            {player2?.username || 'TBD'}
                          </div>
                        </div>
                        <div className="text-xl">{player2?.avatar || '❓'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isReady}
            className="flex-1"
          >
            Leave
          </Button>
          <Button
            onClick={onStartMatch}
            disabled={!isReady}
            className="flex-1"
          >
            {isReady ? (
              <>
                <Zap className="size-4 mr-2" />
                Start Match
              </>
            ) : (
              `Starting in ${countdown}s`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}