import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import ClubSelect from './ClubSelect';
import {
  Trophy,
  Sparkles,
  ChevronRight,
  Circle,
  CheckCircle2,
  Target,
  Zap,
  Award,
  Flame,
  Star,
  Globe,
  User,
  X,
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

interface OnboardingData {
  favoriteClub: string;
  preferredLanguage: string;
  avatar: string; // emoji or image URL
  username: string;
  quizScore: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
}

const quizQuestions: QuizQuestion[] = [
  {
    question: 'Which club won the UEFA Champions League in 2020?',
    options: ['Liverpool', 'Bayern Munich', 'Real Madrid', 'Barcelona'],
    correctAnswer: 1,
  },
  {
    question: 'Who won the 2018 FIFA World Cup?',
    options: ['Germany', 'Brazil', 'France', 'Argentina'],
    correctAnswer: 2,
  },
  {
    question: 'Which player has won the most Ballon d\'Or awards?',
    options: ['Cristiano Ronaldo', 'Lionel Messi', 'Michel Platini', 'Johan Cruyff'],
    correctAnswer: 1,
  },
  {
    question: 'What is the maximum number of players on a football pitch during a match?',
    options: ['18', '20', '22', '24'],
    correctAnswer: 2,
  },
  {
    question: 'Which country has won the most FIFA World Cups?',
    options: ['Germany', 'Argentina', 'Brazil', 'Italy'],
    correctAnswer: 2,
  },
];

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪' },
];

// Football-themed avatar seeds for DiceBear API
const avatarSeeds = [
  'striker', 'goalkeeper', 'defender', 'midfielder', 'captain', 'coach',
  'ronaldo', 'messi', 'neymar', 'mbappe', 'haaland', 'benzema',
  'liverpool', 'barcelona', 'madrid', 'bayern', 'arsenal', 'chelsea',
  'legend', 'rookie', 'veteran', 'champion', 'winner', 'pro',
];

// Generate DiceBear avatar URL
const getAvatarUrl = (seed: string) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=22c55e`;
};

type OnboardingStep =
  | 'welcome'
  | 'question1'
  | 'question3'
  | 'avatar'
  | 'quiz-intro'
  | 'quiz'
  | 'summary';

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {

  // All state hooks must be declared before any code that uses them
  const [username, setUsername] = useState('');
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('question1');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [favoriteClub, setFavoriteClub] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [avatar, setAvatar] = useState('');
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(
    new Array(quizQuestions.length).fill(null)
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [timer, setTimer] = useState(10);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentStep === 'quiz' && !showingFeedback) {
      setTimer(10);
      const interval = setInterval(() => {
        setTimer((t) => {
          if (t > 1) {
            return t - 1;
          } else {
            clearInterval(interval);
            // Auto-advance if timer runs out and no answer selected
            if (!showingFeedback && selectedAnswer === null) {
              setSelectedAnswer(null);
              setShowingFeedback(true);
              setTimeout(() => {
                setShowingFeedback(false);
                setSelectedAnswer(null);
                if (currentQuizQuestion < quizQuestions.length - 1) {
                  setCurrentQuizQuestion((q) => q + 1);
                } else {
                  setCurrentStep('summary');
                }
              }, 1200);
            }
            return 0;
          }
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentStep, currentQuizQuestion, selectedAnswer, showingFeedback]);


  const stepOrder: OnboardingStep[] = [
    'question1',
    'question3',
    'avatar',
    'quiz-intro',
    'quiz',
    'summary',
  ];

  // Cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const goToPrevStep = () => {
    setDirection('backward');
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const goToNextStep = () => {
    setDirection('forward');
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const skipToQuizIntro = () => {
    setDirection('forward');
    setCurrentStep('quiz-intro');
  };

  const handleQuizAnswer = (answerIndex: number) => {
    if (showingFeedback) return; // Prevent clicking while showing feedback

    // Clear any existing timeout before creating a new one
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    // Set selected answer and show feedback
    setSelectedAnswer(answerIndex);
    setShowingFeedback(true);

    // Save answer
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuizQuestion] = answerIndex;
    setQuizAnswers(newAnswers);

    // Auto-advance after showing feedback
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowingFeedback(false);
      setSelectedAnswer(null);

      // Move to next question or summary
      if (currentQuizQuestion < quizQuestions.length - 1) {
        setCurrentQuizQuestion(currentQuizQuestion + 1);
      } else {
        // Quiz complete - go to summary
        setCurrentStep('summary');
      }
    }, 1500);
  };

  const calculateScore = () => {
    let correct = 0;
    quizAnswers.forEach((answer, index) => {
      if (answer === quizQuestions[index].correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const handleComplete = () => {
    const data: OnboardingData = {
      favoriteClub,
      preferredLanguage,
      avatar,
      username,
      quizScore: calculateScore(),
    };
    onComplete(data);
  };


  const variants = {
    enter: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: 'forward' | 'backward') => ({
      x: direction === 'forward' ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col items-center justify-center py-12 px-4">
      <AnimatePresence mode="wait" custom={direction}>
        {/* Club selection and subsequent onboarding steps start here */}
        {currentStep === 'question1' && (
          <motion.div
            key="question1"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full max-w-xl mx-auto"
          >
            <Card className="shadow-2xl border-0 !bg-zinc-800">
              <CardContent className="py-10 px-8 flex flex-col gap-8 !bg-zinc-800 rounded-2xl">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      Step 1 of 3
                    </Badge>
                    <span className="text-xs text-muted-foreground">33%</span>
                  </div>
                  <Progress value={33} className="h-2" />
                </div>

                {/* Question Content */}
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex items-center justify-center mb-2">
                    <div className="size-16 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Trophy className="size-8 text-primary" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Select Your Favorite Football Club</h1>
                  <p className="text-muted-foreground text-base max-w-md">
                    Search and select your favorite football club to personalize your experience.
                  </p>
                  <div className="w-full max-w-md">
                    <ClubSelect
                      value={favoriteClub}
                      onChange={setFavoriteClub}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 mt-6">
                  <Button
                    onClick={goToNextStep}
                    disabled={!favoriteClub.trim()}
                    size="lg"
                    className="w-full h-14 text-lg"
                  >
                    Continue
                    <ChevronRight className="size-5 ml-2" />
                  </Button>

                  <button
                    onClick={skipToQuizIntro}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}


        {/* Question 3: Preferred Language */}
        {currentStep === 'question3' && (
                    <motion.div
                      key="question3"
                      custom={direction}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.3 }}
                      className="w-full max-w-xl mx-auto relative"
                    >
                      <button
                        type="button"
                        onClick={goToPrevStep}
                        className="absolute left-4 top-4 z-10 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ChevronRight className="rotate-180 size-5" />
                        Back
                      </button>
            <Card className="shadow-2xl border-0 !bg-zinc-800">
              <CardContent className="py-10 px-8 flex flex-col gap-8 !bg-zinc-800 rounded-2xl">
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs">
                      Step 2 of 3
                    </Badge>
                    <span className="text-xs text-muted-foreground">66%</span>
                  </div>
                  <Progress value={66} className="h-2" />
                </div>

                {/* Question Content */}
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="flex items-center justify-center mb-2">
                    <div className="size-16 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Globe className="size-8 text-primary" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Choose Your Preferred Language</h1>
                  <p className="text-muted-foreground text-base max-w-md">
                    Select the language you want to use in the app.
                  </p>
                  <div className="w-full max-w-md flex flex-col gap-3 mt-2">
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => setPreferredLanguage(language.code)}
                        className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all text-left text-lg font-medium ${
                          preferredLanguage === language.code
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="text-3xl">{language.flag}</span>
                        <span className="flex-1">{language.name}</span>
                        {preferredLanguage === language.code ? (
                          <CheckCircle2 className="size-5 text-primary" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground/30" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 mt-6">
                  <Button
                    onClick={goToNextStep}
                    disabled={!preferredLanguage}
                    size="lg"
                    className="w-full h-14 text-lg"
                  >
                    Continue
                    <ChevronRight className="size-5 ml-2" />
                  </Button>

                  <button
                    onClick={skipToQuizIntro}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Avatar Selection */}
        {currentStep === 'avatar' && (
          <motion.div
            key="avatar"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] relative"
          >
            <button
              type="button"
              onClick={goToPrevStep}
              className="absolute left-4 top-4 z-10 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronRight className="rotate-180 size-5" />
              Back
            </button>
            <Card className="w-full !bg-zinc-800">
              <CardContent className="p-10 flex flex-col items-center gap-8 !bg-zinc-800 rounded-2xl">
                <div className="flex flex-col items-center gap-3 w-full">
                  <Badge variant="outline" className="text-xs mb-2">Almost there!</Badge>
                  <div className="size-28 rounded-full bg-gradient-to-br from-primary to-green-600 flex items-center justify-center shadow-lg shadow-primary/30 relative overflow-hidden border-4 border-white">
                    {avatar ? (
                      <Image
                        src={getAvatarUrl(avatar)}
                        alt="Avatar"
                        fill
                        sizes="112px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <User className="size-14 text-primary" />
                    )}
                    {avatar && (
                      <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="size-4 text-background" />
                      </div>
                    )}
                  </div>
                  <Input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="text-center text-lg font-semibold py-3 bg-zinc-50 border-2 border-primary/20 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary mt-4"
                    maxLength={20}
                  />
                  <div className="text-xs text-muted-foreground mt-1 text-center">This will be your public display name.</div>
                </div>
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-xs text-muted-foreground">Choose an avatar</span>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {avatarSeeds.map((seed) => (
                      <button
                        key={seed}
                        onClick={() => setAvatar(seed)}
                        className={`relative aspect-square rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden ${
                          avatar === seed
                            ? 'border-primary bg-primary/10 scale-110'
                            : 'border-border hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <Image
                          src={getAvatarUrl(seed)}
                          alt={seed}
                          fill
                          sizes="80px"
                          unoptimized
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3 mt-6 w-full"
                >
                  <Button
                    onClick={goToNextStep}
                    disabled={!avatar || !username.trim()}
                    size="lg"
                    className="w-full h-14"
                  >
                    Continue
                    <ChevronRight className="size-5 ml-2" />
                  </Button>
                  <button
                    onClick={skipToQuizIntro}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quiz Intro */}
        {currentStep === 'quiz-intro' && (
          <motion.div
            key="quiz-intro"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden relative"
          >
            <button
              type="button"
              onClick={goToPrevStep}
              className="absolute left-4 top-4 z-10 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronRight className="rotate-180 size-5" />
              Back
            </button>
            <div className="w-full max-w-xl mx-auto">
              <Card className="!bg-zinc-800 border-primary/20 shadow-xl">
                <CardContent className="py-12 px-10 flex flex-col items-center gap-8 !bg-zinc-800 rounded-2xl">
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="size-24 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/30 relative mb-2">
                      <Target className="size-12 text-background" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent mb-2">Let&apos;s test your knowledge!</h1>
                    <p className="text-muted-foreground text-lg mb-2 max-w-md text-center">
                      A quick 5-question quiz to get you started. You have <span className="font-semibold text-primary">10 seconds</span> for each question!
                    </p>
                    <div className="flex items-center gap-4 justify-center text-base text-muted-foreground mb-2">
                      <Zap className="size-5 text-primary" />
                      <span>Fast-paced</span>
                      <div className="size-1 rounded-full bg-muted-foreground/30" />
                      <Trophy className="size-5 text-primary" />
                      <span>Fun trivia</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setCurrentStep('quiz');
                      setCurrentQuizQuestion(0);
                      setSelectedAnswer(null);
                    }}
                    size="lg"
                    className="w-full h-14 text-lg mt-4"
                  >
                    <Sparkles className="size-5 mr-2" />
                    Begin Quiz
                  </Button>
                  <div className="w-full flex items-center justify-center mt-6">
                    <div className="flex items-center gap-3 bg-zinc-900/80 px-6 py-3 rounded-xl border border-zinc-700">
                      <span className="text-lg font-semibold text-primary">5</span>
                      <span className="text-muted-foreground">Questions</span>
                      <span className="text-lg font-semibold text-primary">10s</span>
                      <span className="text-muted-foreground">per question</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>


        )}

        {/* Quiz Questions */}
        {currentStep === 'quiz' && (
          <motion.div
            key={`quiz-${currentQuizQuestion}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col p-6 overflow-hidden relative"
          >
            <button
              type="button"
              onClick={goToPrevStep}
              className="fixed left-8 top-8 z-30 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors bg-zinc-900/80 rounded-full px-4 py-2 shadow-lg border border-zinc-700"
              style={{ minWidth: 80 }}
            >
              <ChevronRight className="rotate-180 size-5" />
              Back
            </button>
            {/* Progress & Timer */}
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {currentQuizQuestion + 1} / {quizQuestions.length}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {Math.round(((currentQuizQuestion + 1) / quizQuestions.length) * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Time left:</span>
                <span className={`text-lg font-bold ${timer <= 3 ? 'text-red-500' : 'text-primary'}`}>{timer}s</span>
              </div>
            </div>

            {/* Question and Options */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <div>
                {/* Question */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-3"
                >
                  <Card className="!bg-zinc-800 border-primary/20">
                    <CardContent className="pt-3 pb-3 !bg-zinc-800 rounded-2xl">
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-primary">
                            {currentQuizQuestion + 1}
                          </span>
                        </div>
                        <h2 className="text-lg leading-tight">
                          <span className="block text-2xl md:text-4xl font-bold leading-snug text-white mb-2 text-shadow-lg">
                            {quizQuestions[currentQuizQuestion].question}
                          </span>
                        </h2>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Options */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  {quizQuestions[currentQuizQuestion].options.map((option, index) => {
                    const isCorrect = index === quizQuestions[currentQuizQuestion].correctAnswer;
                    const isSelected = selectedAnswer === index;
                    const showFeedback = showingFeedback && isSelected;

                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        onClick={() => handleQuizAnswer(index)}
                        disabled={showingFeedback}
                        className={`w-full py-6 px-6 rounded-2xl border-2 transition-all text-left text-xl font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-primary/30
                          ${showFeedback
                            ? isCorrect
                              ? 'border-green-500 bg-green-500/10 scale-[1.03]'
                              : 'border-red-500 bg-red-500/10 scale-[0.98]'
                            : isSelected
                            ? 'border-primary bg-primary/10 scale-[1.02]'
                            : 'border-border hover:border-primary/60 hover:bg-primary/5'}
                        `}
                        style={{ minHeight: 72, marginBottom: 18 }}
                      >
                        <div className="flex items-center gap-5">
                          <div
                            className={`size-10 rounded-lg flex items-center justify-center shrink-0 text-lg font-bold
                              ${showFeedback
                                ? isCorrect
                                  ? 'bg-green-500 text-background'
                                  : 'bg-red-500 text-background'
                                : isSelected
                                ? 'bg-primary text-background'
                                : 'bg-secondary text-muted-foreground'}
                            `}
                          >
                            {showFeedback ? (
                              isCorrect ? (
                                <CheckCircle2 className="size-5" />
                              ) : (
                                <X className="size-5" />
                              )
                            ) : (
                              <span>{String.fromCharCode(65 + index)}</span>
                            )}
                          </div>
                          <span className="flex-1 text-lg md:text-2xl font-semibold">
                            {option}
                          </span>
                          {showFeedback && (
                            isCorrect ? (
                              <CheckCircle2 className="size-6 text-green-500 shrink-0" />
                            ) : (
                              <X className="size-6 text-red-500 shrink-0" />
                            )
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Summary */}
        {currentStep === 'summary' && (
          <motion.div
            key="summary"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-4"
            >
              <div className="size-24 rounded-full bg-gradient-to-br from-primary to-green-600 flex items-center justify-center shadow-lg shadow-primary/30 relative">
                <Trophy className="size-12 text-background" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-2 -right-2 size-9 rounded-full bg-yellow-500 flex items-center justify-center shadow-lg"
                >
                  <Star className="size-4 text-background" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-5"
            >
              <h1 className="mb-2 bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
                Great Start!
              </h1>
              <p className="text-muted-foreground text-lg mb-4">
                You&apos;ve completed your introduction quiz.
              </p>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
              >
                <Card className="!bg-zinc-800 border-primary/20">
                  <CardContent className="pt-5 pb-5 !bg-zinc-800 rounded-2xl">
                    <div className="text-center">
                      <div className="text-5xl mb-2">
                        {calculateScore()}/{quizQuestions.length}
                      </div>
                      <p className="text-muted-foreground">
                        Correct Answers
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="w-full max-w-sm space-y-3"
            >
              <Button
                onClick={handleComplete}
                size="lg"
                className="w-full h-14 text-lg"
              >
                <Sparkles className="size-5 mr-2" />
                Continue to Home
              </Button>

              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                <Flame className="size-4 text-orange-500" />
                <span>Your journey begins now!</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 grid grid-cols-3 gap-4"
            >
              <div className="text-center">
                <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                  <Trophy className="size-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Play Modes</span>
              </div>
              <div className="text-center">
                <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                  <Flame className="size-5 text-orange-500" />
                </div>
                <span className="text-xs text-muted-foreground">Daily Streaks</span>
              </div>
              <div className="text-center">
                <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-1">
                  <Award className="size-5 text-yellow-500" />
                </div>
                <span className="text-xs text-muted-foreground">Achievements</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
