import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Flame, Star, TrendingUp, Award } from 'lucide-react';
import { Achievement, MultiplayerMatch } from '@/types/game';
import { motion } from 'motion/react';

interface ResultsScreenProps {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  streak: number;
  finalMoney?: number;
  newAchievements: Achievement[];
  xpGained: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  multiplayerMatch?: MultiplayerMatch;
  rankPointsChange?: number;
}

export function ResultsScreen({
  score,
  correctAnswers,
  totalQuestions,
  streak,
  finalMoney,
  newAchievements,
  xpGained,
  onPlayAgain,
  onMainMenu,
  multiplayerMatch,
  rankPointsChange,
}: ResultsScreenProps) {
  const isMoneyDropMode = finalMoney !== undefined;
  const isMultiplayer = multiplayerMatch !== undefined;
  
  const accuracy = isMoneyDropMode ? 0 : Math.round((correctAnswers / totalQuestions) * 100);
  const getRankText = () => {
    if (isMoneyDropMode) {
      const percentage = (finalMoney / 1000000) * 100;
      if (percentage >= 80) return { text: 'Money Master!', color: 'text-green-500' };
      if (percentage >= 50) return { text: 'Smart Bettor!', color: 'text-blue-500' };
      if (percentage >= 25) return { text: 'Keep Learning!', color: 'text-yellow-500' };
      return { text: 'Better Luck Next Time!', color: 'text-muted-foreground' };
    }
    if (accuracy === 100) return { text: 'Perfect!', color: 'text-yellow-500' };
    if (accuracy >= 80) return { text: 'Excellent!', color: 'text-green-500' };
    if (accuracy >= 60) return { text: 'Good Job!', color: 'text-blue-500' };
    return { text: 'Keep Practicing!', color: 'text-muted-foreground' };
  };

  const rank = getRankText();

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // If multiplayer, show multiplayer-specific results
  if (isMultiplayer && multiplayerMatch) {
    const playerWon = multiplayerMatch.winner === 'player1';
    const isDraw = multiplayerMatch.player1.roundsWon === multiplayerMatch.player2.roundsWon;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full space-y-4"
        >
          {/* Match Result Header */}
          <Card className={`border-2 ${playerWon ? 'border-green-500/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5' : isDraw ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5' : 'border-red-500/50 bg-gradient-to-br from-red-500/5 to-orange-500/5'}`}>
            <CardContent className="pt-6 pb-6">
              <div className="text-center mb-6">
                <div className="text-6xl mb-3">
                  {isDraw ? '🤝' : playerWon ? '🏆' : '😔'}
                </div>
                <h2 className="mb-2">
                  {isDraw ? "It's a Draw!" : playerWon ? 'Victory!' : 'Defeat'}
                </h2>
                <p className="text-muted-foreground">
                  Ranked Match
                </p>
              </div>

              {/* Final Score */}
              <div className="space-y-3 mb-6">
                <div className={`bg-secondary rounded-lg p-4 ${playerWon ? 'ring-2 ring-green-500/50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{multiplayerMatch.player1.avatar}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{multiplayerMatch.player1.username}</span>
                          {playerWon && <Trophy className="size-4 text-yellow-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Rounds: {multiplayerMatch.player1.roundsWon}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl">{multiplayerMatch.player1.score}</div>
                  </div>
                </div>

                <div className={`bg-secondary rounded-lg p-4 ${!playerWon && !isDraw ? 'ring-2 ring-red-500/50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{multiplayerMatch.player2.avatar}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{multiplayerMatch.player2.username}</span>
                          {!playerWon && !isDraw && <Trophy className="size-4 text-yellow-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Rounds: {multiplayerMatch.player2.roundsWon}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl">{multiplayerMatch.player2.score}</div>
                  </div>
                </div>
              </div>

              {/* Rank Points Change (if ranked) */}
              {multiplayerMatch.matchType === 'ranked' && rankPointsChange !== undefined && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-primary mb-2">
                    <Award className="size-5" />
                    <span>Rank Points</span>
                  </div>
                  <div className="text-2xl flex items-center justify-center gap-2">
                    <TrendingUp className={`size-6 ${rankPointsChange >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={rankPointsChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {rankPointsChange >= 0 ? '+' : ''}{rankPointsChange}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Round Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Round Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {multiplayerMatch.roundResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Round {result.roundNumber}</span>
                      <Badge variant="outline" className="text-xs">
                        {result.mode === 'timeAttack' ? 'Time Attack' : 
                         result.mode === 'countdown' ? 'Countdown' : 
                         result.mode === 'clues' ? 'Clue Game' :
                         result.mode === 'moneyDrop' ? 'Money Drop' :
                         'Categories'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${result.winner === 'player1' ? 'text-green-500' : result.winner === 'tie' ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                        {result.player1Score}
                      </span>
                      <span className="text-xs text-muted-foreground">-</span>
                      <span className={`text-sm ${result.winner === 'player2' ? 'text-green-500' : result.winner === 'tie' ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                        {result.player2Score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button onClick={onPlayAgain} size="lg" className="w-full">
              Play Again
            </Button>
            <Button onClick={onMainMenu} size="lg" variant="outline" className="w-full">
              Main Menu
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Solo mode results
  return (
    <div className="space-y-4 p-4">
      {/* Main Result Card */}
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="flex size-20 items-center justify-center rounded-full bg-yellow-500/20">
              <Trophy className="size-10 text-yellow-500" />
            </div>
          </div>
          <CardTitle className={`${rank.color}`}>{rank.text}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isMoneyDropMode ? (
              <div>
                <div className="text-muted-foreground">Final Balance</div>
                <div className="text-3xl text-green-600 dark:text-green-400">{formatMoney(finalMoney)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {((finalMoney / 1000000) * 100).toFixed(1)}% retained
                </div>
              </div>
            ) : (
              <div>
                <div className="text-muted-foreground">Final Score</div>
                <div className="text-4xl">{score}</div>
              </div>
            )}
            
            <div className="flex justify-center gap-2">
              <Badge variant="outline" className="text-lg px-4 py-2">
                +{xpGained} XP
              </Badge>
              {rankPointsChange !== undefined && (
                <Badge variant="outline" className={`text-lg px-4 py-2 ${rankPointsChange >= 0 ? 'border-green-500/50 text-green-500' : 'border-red-500/50 text-red-500'}`}>
                  {rankPointsChange >= 0 ? '+' : ''}{rankPointsChange} RP
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {!isMoneyDropMode ? (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Target className="size-6 mx-auto mb-1 text-blue-500" />
              <div className="text-xs text-muted-foreground mb-1">Accuracy</div>
              <div className="text-xl">{accuracy}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Star className="size-6 mx-auto mb-1 text-green-500" />
              <div className="text-xs text-muted-foreground mb-1">Correct</div>
              <div className="text-xl">{correctAnswers}/{totalQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Flame className="size-6 mx-auto mb-1 text-orange-500" />
              <div className="text-xs text-muted-foreground mb-1">Streak</div>
              <div className="text-xl">{streak}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <TrendingUp className="size-6 mx-auto mb-1 text-purple-500" />
              <div className="text-xs text-muted-foreground mb-1">XP Gained</div>
              <div className="text-xl">{xpGained}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Trophy className="size-6 mx-auto mb-1 text-yellow-500" />
              <div className="text-xs text-muted-foreground mb-1">Started With</div>
              <div className="text-xl">$1M</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <TrendingUp className="size-6 mx-auto mb-1 text-green-500" />
              <div className="text-xs text-muted-foreground mb-1">Retained</div>
              <div className="text-xl">{formatMoney(finalMoney)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Target className="size-6 mx-auto mb-1 text-blue-500" />
              <div className="text-xs text-muted-foreground mb-1">Questions</div>
              <div className="text-xl">10</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Star className="size-6 mx-auto mb-1 text-purple-500" />
              <div className="text-xs text-muted-foreground mb-1">XP Gained</div>
              <div className="text-xl">{xpGained}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Achievements */}
      {newAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>New Achievements Unlocked! 🎉</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {newAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-yellow-500/20">
                    <Trophy className="size-6 text-yellow-500" />
                  </div>
                  <div>
                    <div>{achievement.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {achievement.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <Button onClick={onPlayAgain} size="lg" className="w-full">
          Play Again
        </Button>
        <Button onClick={onMainMenu} size="lg" variant="outline" className="w-full">
          Main Menu
        </Button>
      </div>
    </div>
  );
}
