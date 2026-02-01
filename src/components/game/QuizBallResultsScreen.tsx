"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, TrendingDown, Minus, Zap, Target, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Question } from '@/types/game';

interface QuizBallResultsScreenProps {
  categoryName: string;
  categoryIcon: string;
  playerScore: number;
  opponentScore: number;
  playerUsername: string;
  opponentUsername: string;
  playerAvatar: string;
  opponentAvatar: string;
  oldRank: number;
  newRank: number;
  correctAnswers: number;
  totalQuestions: number;
  coinsEarned: number;
  questions: Question[];
  playerAnswers: (number | null)[];
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function QuizBallResultsScreen({
  categoryName,
  categoryIcon,
  playerScore,
  opponentScore,
  playerUsername,
  opponentUsername,
  playerAvatar,
  opponentAvatar,
  oldRank,
  newRank,
  correctAnswers,
  totalQuestions,
  coinsEarned,
  questions,
  playerAnswers,
  onPlayAgain,
  onMainMenu,
}: QuizBallResultsScreenProps) {
  const playerWon = playerScore > opponentScore;
  const isDraw = playerScore === opponentScore;
  const rankPointsChange = playerWon ? 5 : (isDraw ? 0 : -5);
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
  const [showHistory, setShowHistory] = useState(false);
  const [animatedRankPoints, setAnimatedRankPoints] = useState(0);

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
          playerWon 
            ? 'border-green-500/50 bg-green-500/5' 
            : isDraw 
            ? 'border-yellow-500/50 bg-yellow-500/5' 
            : 'border-red-500/50 bg-red-500/5'
        }`}>
          <CardContent className="pt-6 pb-6">
            <div className="text-center mb-5">
              <div className="text-6xl mb-3">
                {isDraw ? '🤝' : playerWon ? '🏆' : '😔'}
              </div>
              <h2 className="mb-1">
                {isDraw ? "It's a Draw!" : playerWon ? 'Victory!' : 'Defeat'}
              </h2>
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                <span className="text-xl">{categoryIcon}</span>
                <p className="text-sm">{categoryName}</p>
              </div>
            </div>

            {/* Score Comparison */}
            <div className="space-y-2.5 mb-5">
              <div className={`bg-secondary rounded-lg p-3.5 ${playerWon ? 'ring-2 ring-green-500/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{playerAvatar}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{playerUsername}</span>
                        {playerWon && <Trophy className="size-3.5 text-yellow-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">You</div>
                    </div>
                  </div>
                  <div className="text-2xl">{playerScore.toLocaleString()}</div>
                </div>
              </div>

              <div className={`bg-secondary rounded-lg p-3.5 ${!playerWon && !isDraw ? 'ring-2 ring-red-500/50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{opponentAvatar}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{opponentUsername}</span>
                        {!playerWon && !isDraw && <Trophy className="size-3.5 text-yellow-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">Opponent</div>
                    </div>
                  </div>
                  <div className="text-2xl">{opponentScore.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Rank Points Change with Animation */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-primary/10 border border-primary/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Rank Points</span>
                <span className="text-xs text-muted-foreground">{categoryName}</span>
              </div>
              
              {/* Animated Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Category Rank: #{oldRank}</span>
                  <motion.div 
                    className="flex items-center gap-1.5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
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
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Target className="size-5 mx-auto mb-1 text-blue-500" />
              <div className="text-xs text-muted-foreground mb-0.5">Accuracy</div>
              <div className="text-lg">{accuracy}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <Zap className="size-5 mx-auto mb-1 text-yellow-500" />
              <div className="text-xs text-muted-foreground mb-0.5">Correct</div>
              <div className="text-lg">{correctAnswers}/{totalQuestions}</div>
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
                <span className="text-sm">Question History</span>
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
              {questions.map((question, index) => {
                const userAnswer = playerAnswers[index];
                const isCorrect = userAnswer === question.correctAnswer;
                const wasAnswered = userAnswer !== null;

                return (
                  <motion.div
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`border ${
                      wasAnswered
                        ? isCorrect
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                        : 'border-muted'
                    }`}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-start gap-3">
                          <div className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
                            wasAnswered
                              ? isCorrect
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {wasAnswered ? (
                              isCorrect ? <Check className="size-3.5" /> : <X className="size-3.5" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <p className="text-sm">{question.question}</p>
                            <div className="space-y-1">
                              {question.options.map((option, ansIndex) => {
                                const isUserAnswer = userAnswer === ansIndex;
                                const isCorrectAnswer = question.correctAnswer === ansIndex;

                                return (
                                  <div
                                    key={ansIndex}
                                    className={`text-xs px-2 py-1 rounded ${
                                      isCorrectAnswer
                                        ? 'bg-green-500/20 text-green-700 dark:text-green-300'
                                        : isUserAnswer
                                        ? 'bg-red-500/20 text-red-700 dark:text-red-300'
                                        : 'bg-muted/50 text-muted-foreground'
                                    }`}
                                  >
                                    {option}
                                    {isCorrectAnswer && ' ✓'}
                                    {isUserAnswer && !isCorrectAnswer && ' ✗'}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Rank Badge Achievement */}
        {newRank <= 3 && (
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
                    <div className="text-sm mb-0.5">New Badge Unlocked! 🎉</div>
                    <div className="text-xs text-muted-foreground">
                      Top {newRank} in {categoryName}
                    </div>
                  </div>
                  <Badge className="bg-yellow-500">
                    {newRank === 1 ? '🥇' : newRank === 2 ? '🥈' : '🥉'}
                  </Badge>
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
