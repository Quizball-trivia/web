import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Clock, List } from 'lucide-react';
import { TournamentLiveTracker } from './components/TournamentLiveTracker';

interface TournamentGameScreenProps {
  opponentName: string;
  opponentAvatar: string;
  currentPlayerAvatar: string;
  onGameEnd: (won: boolean, score: number, opponentScore: number) => void;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

const categories = [
  { id: 'premier-league', name: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'la-liga', name: 'La Liga', icon: '🇪🇸' },
  { id: 'serie-a', name: 'Serie A', icon: '🇮🇹' },
  { id: 'bundesliga', name: 'Bundesliga', icon: '🇩🇪' },
  { id: 'champions-league', name: 'Champions League', icon: '🏆' },
  { id: 'world-cup', name: 'World Cup', icon: '🌍' },
  { id: 'legends', name: 'Legends', icon: '👑' },
];

// Mock questions generator
const generateQuestions = (count: number): Question[] => {
  const questionTemplates = [
    { q: "Who won the Golden Boot in 2023?", options: ["Haaland", "Mbappe", "Kane", "Lewandowski"], correct: 0 },
    { q: "Which club has won the most Champions League titles?", options: ["Barcelona", "Bayern Munich", "Real Madrid", "AC Milan"], correct: 2 },
    { q: "Who scored the fastest hat-trick in Premier League?", options: ["Sadio Mane", "Aguero", "Salah", "Vardy"], correct: 0 },
    { q: "Which country won the first World Cup?", options: ["Brazil", "Uruguay", "Argentina", "Italy"], correct: 1 },
    { q: "Who has the most Ballon d'Or awards?", options: ["Messi", "Ronaldo", "Cruyff", "Platini"], correct: 0 },
    { q: "Which team is known as 'The Gunners'?", options: ["Arsenal", "Manchester United", "Chelsea", "Liverpool"], correct: 0 },
    { q: "Who is the all-time top scorer in World Cups?", options: ["Pele", "Ronaldo", "Klose", "Muller"], correct: 2 },
    { q: "Which player transferred for the highest fee?", options: ["Ronaldo", "Neymar", "Mbappe", "Bale"], correct: 1 },
    { q: "Who won the 2022 World Cup?", options: ["France", "Argentina", "Brazil", "Germany"], correct: 1 },
    { q: "Which club plays at Camp Nou?", options: ["Real Madrid", "Barcelona", "Atletico Madrid", "Valencia"], correct: 1 },
  ];

  return questionTemplates.slice(0, count).map((q, index) => ({
    id: `q-${index}`,
    question: q.q,
    options: q.options,
    correctAnswer: q.correct,
  }));
};

export function TournamentGameScreen({
  opponentName,
  opponentAvatar,
  currentPlayerAvatar,
  onGameEnd,
}: TournamentGameScreenProps) {
  const [selectedCategory] = useState(() => {
    return categories[Math.floor(Math.random() * categories.length)];
  });
  const [questions] = useState(generateQuestions(10));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const playerScoreRef = useRef(0);
  const opponentScoreRef = useRef(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(6);
  const [answeredAt, setAnsweredAt] = useState<number | null>(null);
  const [showLiveTracker, setShowLiveTracker] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  // Timer countdown - resets when question changes
  useEffect(() => {
    if (showResult || selectedAnswer !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Handle timeout inline
          const opponentAnswered = Math.random() > 0.3;
          if (opponentAnswered) {
            const opponentCorrect = Math.random() > 0.4;
            if (opponentCorrect) {
              const opponentPoints = Math.floor(Math.random() * 300) + 500;
              setOpponentScore((prevScore) => prevScore + opponentPoints);
            }
          }
          setShowResult(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showResult, selectedAnswer, currentQuestion?.id]);

  const handleAnswer = (answerIndex: number) => {
    if (selectedAnswer !== null || showResult) return;

    const timeElapsed = 6 - timeLeft;
    setSelectedAnswer(answerIndex);
    setAnsweredAt(timeElapsed);

    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    
    if (isCorrect) {
      // Speed-based scoring: 500-1000 points
      const speedBonus = Math.max(500, 1000 - (timeElapsed * 83));
      const newPlayerScore = playerScoreRef.current + Math.floor(speedBonus);
      playerScoreRef.current = newPlayerScore;
      setPlayerScore(newPlayerScore);
    }

    // Simulate opponent answer
    // eslint-disable-next-line react-hooks/purity
    const opponentAnswered = Math.random() > 0.2; // 80% chance
    if (opponentAnswered) {
      // eslint-disable-next-line react-hooks/purity
      const opponentCorrect = Math.random() > 0.35; // 65% chance correct
      if (opponentCorrect) {
        // eslint-disable-next-line react-hooks/purity
        const opponentTimeElapsed = Math.random() * 5 + 1;
        const opponentPoints = Math.max(500, 1000 - (opponentTimeElapsed * 83));
        const newOpponentScore = opponentScoreRef.current + Math.floor(opponentPoints);
        opponentScoreRef.current = newOpponentScore;
        setOpponentScore(newOpponentScore);
      }
    }

    setShowResult(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(6);
      setSelectedAnswer(null);
      setShowResult(false);
      setAnsweredAt(null);
    } else {
      // Game over - use refs for latest scores
      const finalPlayerScore = playerScoreRef.current;
      const finalOpponentScore = opponentScoreRef.current;
      const won = finalPlayerScore > finalOpponentScore;
      onGameEnd(won, finalPlayerScore, finalOpponentScore);
    }
  };

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  if (showLiveTracker) {
    return <TournamentLiveTracker onClose={() => setShowLiveTracker(false)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 space-y-4">
        {/* Category */}
        <Card className="bg-gradient-to-br from-primary/10 to-green-500/10 border-2 border-primary/30">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedCategory.icon}</span>
                <div>
                  <div className="text-sm text-muted-foreground">Category</div>
                  <div className="text-lg">{selectedCategory.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLiveTracker(true)}
                  className="h-8 px-2"
                >
                  <List className="size-4 mr-1" />
                  <span className="text-xs">Bracket</span>
                </Button>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Question</div>
                  <div className="text-lg">{currentQuestionIndex + 1}/10</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scoreboard */}
        <div className="grid grid-cols-2 gap-3">
          {/* Player */}
          <Card className="border-2 border-primary/30">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <div className="text-3xl mb-1">{currentPlayerAvatar}</div>
                <div className="text-sm mb-1 truncate">You</div>
                <div className="text-2xl text-primary">{playerScore}</div>
              </div>
            </CardContent>
          </Card>

          {/* Opponent */}
          <Card className="border-2 border-muted">
            <CardContent className="pt-4 pb-4">
              <div className="text-center">
                <div className="text-3xl mb-1">{opponentAvatar}</div>
                <div className="text-sm mb-1 truncate">{opponentName}</div>
                <div className="text-2xl">{opponentScore}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timer */}
        {!showResult && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-sm">Time remaining</span>
                </div>
                <Badge variant={timeLeft <= 2 ? "destructive" : "outline"} className="text-lg px-3">
                  {timeLeft}s
                </Badge>
              </div>
              <Progress value={(timeLeft / 6) * 100} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Question */}
        <Card>
          <CardContent className="pt-6 pb-6">
            <h2 className="text-xl text-center mb-6">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                let buttonClass = "w-full p-4 text-left transition-all border-2 rounded-lg ";
                
                if (showResult) {
                  if (index === currentQuestion.correctAnswer) {
                    buttonClass += "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400";
                  } else if (index === selectedAnswer) {
                    buttonClass += "bg-red-500/20 border-red-500 text-red-700 dark:text-red-400";
                  } else {
                    buttonClass += "bg-secondary border-transparent opacity-50";
                  }
                } else if (selectedAnswer === index) {
                  buttonClass += "bg-primary/20 border-primary";
                } else {
                  buttonClass += "bg-secondary border-transparent hover:border-primary/30 hover:bg-primary/5";
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={showResult || selectedAnswer !== null}
                    className={buttonClass}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-background text-sm">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div className="flex-1">{option}</div>
                      {showResult && index === currentQuestion.correctAnswer && (
                        <div className="text-lg">✓</div>
                      )}
                      {showResult && index === selectedAnswer && index !== currentQuestion.correctAnswer && (
                        <div className="text-lg">✗</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Result Message */}
            {showResult && (
              <div className="mt-4 text-center">
                {selectedAnswer === null ? (
                  <div className="text-sm text-muted-foreground">
                    Time&apos;s up! ⏰
                  </div>
                ) : isCorrect ? (
                  <div className="text-sm text-green-600 dark:text-green-400">
                    <Zap className="size-4 inline mr-1" />
                    Correct! +{Math.floor(Math.max(500, 1000 - ((answeredAt || 6) * 83)))} points
                  </div>
                ) : (
                  <div className="text-sm text-red-600 dark:text-red-400">
                    Wrong answer
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Button */}
      {showResult && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t">
          <Button onClick={handleNext} className="w-full" size="lg">
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Match'}
          </Button>
        </div>
      )}
    </div>
  );
}
