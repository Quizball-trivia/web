"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, Clock, Trophy, ArrowRight, ArrowLeft } from "lucide-react";

interface AnswerGroup {
  display: string;
  accepted: string[];
}

interface CountdownQuestion {
  id: string;
  category: string;
  prompt: string;
  answerGroups: AnswerGroup[];
}

interface CountdownGameProps {
  onBack: () => void;
  onComplete: (score: number) => void;
}

const TIME_PER_ROUND = 30;

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  const distance = matrix[s1.length][s2.length];

  return 1 - distance / maxLength;
}

// Mock questions for testing
const MOCK_QUESTIONS: CountdownQuestion[] = [
  {
    id: "cd-1",
    category: "Premier League",
    prompt: "Name the current Premier League clubs (20)",
    answerGroups: [
      { display: "Arsenal", accepted: ["arsenal", "arsenal fc"] },
      { display: "Aston Villa", accepted: ["aston villa", "villa"] },
      { display: "Bournemouth", accepted: ["bournemouth", "afc bournemouth"] },
      { display: "Brentford", accepted: ["brentford", "brentford fc"] },
      { display: "Brighton", accepted: ["brighton", "brighton and hove albion"] },
      { display: "Chelsea", accepted: ["chelsea", "chelsea fc"] },
      { display: "Crystal Palace", accepted: ["crystal palace", "palace"] },
      { display: "Everton", accepted: ["everton", "everton fc"] },
      { display: "Fulham", accepted: ["fulham", "fulham fc"] },
      { display: "Ipswich Town", accepted: ["ipswich", "ipswich town"] },
      { display: "Leicester City", accepted: ["leicester", "leicester city"] },
      { display: "Liverpool", accepted: ["liverpool", "liverpool fc"] },
      { display: "Manchester City", accepted: ["man city", "manchester city"] },
      { display: "Manchester United", accepted: ["man united", "manchester united", "man utd"] },
      { display: "Newcastle United", accepted: ["newcastle", "newcastle united"] },
      { display: "Nottingham Forest", accepted: ["nottingham forest", "forest"] },
      { display: "Southampton", accepted: ["southampton", "saints"] },
      { display: "Tottenham", accepted: ["tottenham", "spurs", "tottenham hotspur"] },
      { display: "West Ham", accepted: ["west ham", "west ham united"] },
      { display: "Wolves", accepted: ["wolves", "wolverhampton", "wolverhampton wanderers"] },
    ],
  },
  {
    id: "cd-2",
    category: "World Cup Winners",
    prompt: "Name the countries that have won the FIFA World Cup",
    answerGroups: [
      { display: "Brazil", accepted: ["brazil"] },
      { display: "Germany", accepted: ["germany", "west germany"] },
      { display: "Italy", accepted: ["italy"] },
      { display: "Argentina", accepted: ["argentina"] },
      { display: "France", accepted: ["france"] },
      { display: "Uruguay", accepted: ["uruguay"] },
      { display: "England", accepted: ["england"] },
      { display: "Spain", accepted: ["spain"] },
    ],
  },
];

export function CountdownGame({ onBack, onComplete }: CountdownGameProps) {
  const [questions] = useState<CountdownQuestion[]>(MOCK_QUESTIONS);
  const [currentRound, setCurrentRound] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIME_PER_ROUND);
  const [inputValue, setInputValue] = useState("");
  const [foundAnswers, setFoundAnswers] = useState<string[]>([]);
  const [recentAnswer, setRecentAnswer] = useState<string | null>(null);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [allRoundAnswers, setAllRoundAnswers] = useState<string[][]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentRound];
  const isGameActive =
    questions.length > 0 && currentRound < questions.length && timeRemaining > 0;
  const totalRounds = questions.length;

  const handleRoundEnd = useCallback(() => {
    if (questions.length === 0) return;

    if (currentRound < questions.length - 1) {
      setAllRoundAnswers((prev) => [...prev, foundAnswers]);

      setShowRoundTransition(true);
      setTimeout(() => {
        setCurrentRound((prev) => prev + 1);
        setTimeRemaining(TIME_PER_ROUND);
        setFoundAnswers([]);
        setInputValue("");
        setRecentAnswer(null);
        setShowRoundTransition(false);
      }, 2000);
    } else {
      const totalAnswers = [...allRoundAnswers, foundAnswers].reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      const score = totalAnswers * 100;
      onComplete(score);
    }
  }, [currentRound, foundAnswers, questions, allRoundAnswers, onComplete]);

  useEffect(() => {
    if (!isGameActive || showRoundTransition) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimeout(() => handleRoundEnd(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameActive, showRoundTransition, handleRoundEnd]);

  useEffect(() => {
    if (inputRef.current && !showRoundTransition) {
      inputRef.current.focus();
    }
  }, [currentRound, showRoundTransition]);

  const checkAnswer = useCallback(
    (answer: string) => {
      const normalizedInput = answer.toLowerCase().trim();

      if (!normalizedInput) return false;
      if (!currentQuestion || !currentQuestion.answerGroups) {
        return false;
      }

      for (const answerGroup of currentQuestion.answerGroups) {
        if (foundAnswers.includes(answerGroup.display)) {
          continue;
        }

        for (const acceptedAnswer of answerGroup.accepted) {
          const similarity = calculateSimilarity(normalizedInput, acceptedAnswer);

          if (similarity >= 0.85) {
            setFoundAnswers((prev) => [...prev, answerGroup.display]);
            setRecentAnswer(answerGroup.display);
            setTimeout(() => setRecentAnswer(null), 1500);
            return true;
          }
        }
      }

      return false;
    },
    [currentQuestion, foundAnswers]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      checkAnswer(inputValue);
      setInputValue("");
    }
  };

  const handleSkipRound = () => {
    handleRoundEnd();
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading questions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showRoundTransition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold">Round {currentRound + 1} Complete!</h2>
            <div className="space-y-2">
              <p className="text-muted-foreground">You found</p>
              <div className="text-4xl text-primary font-bold">{foundAnswers.length}</div>
              <p className="text-muted-foreground">answers</p>
            </div>
            {currentRound < questions.length - 1 && (
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">Next round starting...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuitDialog(true)}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-secondary active:scale-95 transition-all"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="text-2xl">⏱️</div>
                <h1 className="text-xl font-bold">Countdown</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Round {currentRound + 1}/{totalRounds}
              </Badge>
              <Badge variant="outline" className="bg-primary/10">
                <Trophy className="size-3 mr-1" />
                {allRoundAnswers.reduce((sum, arr) => sum + arr.length, 0) +
                  foundAnswers.length}
              </Badge>
            </div>
          </div>

          <Progress value={((currentRound + 1) / totalRounds) * 100} className="h-1.5" />
        </div>
      </div>

      {/* Quit Dialog */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quit Game?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to quit? Your progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onBack}>Quit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Timer */}
        <Card
          className={`border-2 ${timeRemaining <= 5 ? "border-red-500 animate-pulse" : "border-primary/30"}`}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock
                  className={`size-5 ${timeRemaining <= 5 ? "text-red-500" : "text-primary"}`}
                />
                <span className="text-sm text-muted-foreground">Time Remaining</span>
              </div>
              <div
                className={`text-3xl font-bold ${timeRemaining <= 5 ? "text-red-500" : "text-primary"}`}
              >
                {timeRemaining}s
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <div className="space-y-2">
              <Badge className="bg-primary text-primary-foreground">
                {currentQuestion.category}
              </Badge>
              <CardTitle className="text-2xl">{currentQuestion.prompt}</CardTitle>
            </div>
          </CardHeader>
        </Card>

        {/* Input */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Type your answer</label>
              <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder="Press Enter to submit..."
                className="text-lg h-12"
                autoComplete="off"
                autoCapitalize="off"
              />
              <p className="text-xs text-muted-foreground">
                💡 Tip: Don&apos;t worry about exact spelling - close matches count!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Answer Feedback */}
        {recentAnswer && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
            <Card className="border-2 border-green-500 bg-green-500/10">
              <CardContent className="pt-6 px-8">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="size-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Correct!</div>
                    <div className="text-xl font-bold">{recentAnswer}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Found Answers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Answers Found</span>
              <Badge variant="outline" className="bg-primary/10">
                {foundAnswers.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {foundAnswers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No answers found yet. Start typing!
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {foundAnswers.map((answer, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30"
                  >
                    <Check className="size-4 text-green-600 shrink-0" />
                    <span className="text-sm truncate">{answer}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skip Button */}
        <Button onClick={handleSkipRound} variant="outline" className="w-full" size="lg">
          <ArrowRight className="size-4 mr-2" />
          Skip to Next Round
        </Button>
      </div>
    </div>
  );
}
