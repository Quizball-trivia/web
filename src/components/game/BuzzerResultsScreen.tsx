"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, TrendingDown, Zap, Target, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '@/types/game';

interface PlayerResult {
  id: string;
  username: string;
  avatar: string;
  score: number;
  position: number;
}

interface BuzzerResultsScreenProps {
  players: PlayerResult[];
  currentPlayerId: string;
  questions: Question[];
  matchType: 'ranked' | 'friendly';
  rankPointsChange: number;
  coinsEarned: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function BuzzerResultsScreen({
  players,
  currentPlayerId,
  questions,
  matchType,
  rankPointsChange,
  coinsEarned,
  onPlayAgain,
  onMainMenu,
}: BuzzerResultsScreenProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [animatedRankPoints, setAnimatedRankPoints] = useState(0);

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const position = currentPlayer?.position || 4;
  const isWinner = position === 1;
  
  const getPositionEmoji = (pos: number) => {
    switch(pos) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '4️⃣';
    }
  };

  const getResultEmoji = () => {
    if (position === 1) return '🏆';
    if (position === 2) return '😊';
    if (position === 3) return '😐';
    return '😔';
  };

  const getResultText = () => {
    if (position === 1) return 'Victory!';
    if (position === 2) return '2nd Place!';
    if (position === 3) return '3rd Place!';
    return '4th Place';
  };

  // Animate rank points
  useEffect(() => {
    if (rankPointsChange === 0) return;
    
    const duration = 1500;
    const steps = 30;
    const increment = rankPointsChange / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setAnimatedRankPoints(rankPointsChange);
        clearInterval(timer);
      } else {
        setAnimatedRankPoints(Math.round(increment * currentStep));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [rankPointsChange]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full space-y-3"
      >
        {/* Match Result Header */}
        <Card className={`border-2 ${
          position === 1
            ? 'border-green-500/50 bg-green-500/5' 
            : position === 2
            ? 'border-blue-500/50 bg-blue-500/5'
            : position === 3
            ? 'border-yellow-500/50 bg-yellow-500/5'
            : 'border-red-500/50 bg-red-500/5'
        }`}>
          <CardContent className="pt-6 pb-6">
            <div className="text-center mb-5">
              <div className="text-6xl mb-3">
                {getResultEmoji()}
              </div>
              <h2 className="mb-1">{getResultText()}</h2>
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <span className="text-xl">⚡</span>
                <p className="text-sm">Buzzer Battle - 4 Players</p>
              </div>
            </div>

            {/* Player Rankings */}
            <div className="space-y-2 mb-5">
              {players.map((player) => {
                const isCurrentPlayer = player.id === currentPlayerId;
                
                return (
                  <motion.div
                    key={player.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: player.position * 0.1 }}
                    className={`bg-secondary rounded-lg p-3 ${
                      isCurrentPlayer 
                        ? player.position === 1
                          ? 'ring-2 ring-green-500/50'
                          : 'ring-2 ring-primary/50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{getPositionEmoji(player.position)}</span>
                        <span className="text-2xl">{player.avatar}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{player.username}</span>
                            {isCurrentPlayer && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {player.position === 1 ? 'Winner' : `${player.position}${player.position === 2 ? 'nd' : player.position === 3 ? 'rd' : 'th'} Place`}
                          </div>
                        </div>
                      </div>
                      <div className="text-xl">{player.score}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Rank Points Change (Only for Ranked) */}
            {matchType === 'ranked' && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Rank Points</span>
                  <span className="text-xs text-muted-foreground">Buzzer Battle</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Global Rank</span>
                    <motion.div 
                      className="flex items-center gap-1.5"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.7, type: "spring" }}
                    >
                      {rankPointsChange > 0 ? (
                        <>
                          <TrendingUp className="size-5 text-green-500" />
                          <motion.span 
                            className="text-lg text-green-500"
                            key={animatedRankPoints}
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                          >
                            +{Math.abs(animatedRankPoints)}
                          </motion.span>
                        </>
                      ) : rankPointsChange < 0 ? (
                        <>
                          <TrendingDown className="size-5 text-red-500" />
                          <motion.span 
                            className="text-lg text-red-500"
                            key={animatedRankPoints}
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                          >
                            {animatedRankPoints}
                          </motion.span>
                        </>
                      ) : (
                        <>
                          <Minus className="size-5 text-muted-foreground" />
                          <span className="text-lg text-muted-foreground">0</span>
                        </>
                      )}
                    </motion.div>
                  </div>
                  
                  {/* Progress bar visualization */}
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "50%" }}
                      animate={{ 
                        width: rankPointsChange > 0 ? "100%" : rankPointsChange < 0 ? "0%" : "50%"
                      }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className={`h-full ${
                        rankPointsChange > 0 
                          ? 'bg-green-500' 
                          : rankPointsChange < 0 
                          ? 'bg-red-500' 
                          : 'bg-muted-foreground'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Target className="size-5 mx-auto mb-1 text-blue-500" />
              <div className="text-xs text-muted-foreground mb-0.5">Position</div>
              <div className="text-lg">{getPositionEmoji(position)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Zap className="size-5 mx-auto mb-1 text-yellow-500" />
              <div className="text-xs text-muted-foreground mb-0.5">Score</div>
              <div className="text-lg">{currentPlayer?.score || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Trophy className="size-5 mx-auto mb-1 text-primary" />
              <div className="text-xs text-muted-foreground mb-0.5">Coins</div>
              <div className="text-lg">+{coinsEarned}</div>
            </CardContent>
          </Card>
        </div>

        {/* Question History Toggle */}
        <Card>
          <CardContent className="pt-3 pb-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                <span className="text-sm">Question History ({questions.length} questions)</span>
              </div>
              {showHistory ? (
                <ChevronUp className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
            </button>
          </CardContent>
        </Card>

        {/* Question History */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {questions.map((question, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border border-muted">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <p className="text-sm">{question.question}</p>
                          <div className="bg-green-500/20 text-green-700 dark:text-green-300 text-xs px-2 py-1 rounded inline-block">
                            ✓ {question.options[question.correctAnswer]}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Winner Badge */}
        {isWinner && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-yellow-500/50 bg-yellow-500/10">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-yellow-500/20">
                    <Trophy className="size-6 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm mb-0.5">Buzzer Champion! 🎉</div>
                    <div className="text-xs text-muted-foreground">
                      You outbuzzed 3 opponents
                    </div>
                  </div>
                  <Badge className="bg-yellow-500 text-yellow-950">🥇 Winner</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
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
