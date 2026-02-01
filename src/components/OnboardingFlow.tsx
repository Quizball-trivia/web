import Image from 'next/image';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
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
  Upload,
  X,
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

interface OnboardingData {
  favoriteClub: string;
  age: string;
  preferredLanguage: string;
  avatar: string; // emoji or image URL
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
  {
    question: 'In which year was the first FIFA World Cup held?',
    options: ['1926', '1930', '1934', '1938'],
    correctAnswer: 1,
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
  | 'question2'
  | 'question3'
  | 'avatar'
  | 'quiz-intro'
  | 'quiz'
  | 'summary';

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Preference data
  const [favoriteClub, setFavoriteClub] = useState('');
  const [age, setAge] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [avatar, setAvatar] = useState('');

  // Quiz data
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(
    new Array(quizQuestions.length).fill(null)
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);

  const goToNextStep = () => {
    setDirection('forward');
    
    const stepOrder: OnboardingStep[] = [
      'welcome',
      'question1',
      'question2',
      'question3',
      'avatar',
      'quiz-intro',
      'quiz',
      'summary',
    ];
    
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

    // Set selected answer and show feedback
    setSelectedAnswer(answerIndex);
    setShowingFeedback(true);

    // Save answer
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuizQuestion] = answerIndex;
    setQuizAnswers(newAnswers);

    // Auto-advance after showing feedback
    setTimeout(() => {
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
      age,
      preferredLanguage,
      avatar,
      quizScore: calculateScore(),
    };
    onComplete(data);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
    <div className="h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        {/* Welcome Screen */}
        {currentStep === 'welcome' && (
          <motion.div
            key="welcome"
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
              <div className="size-20 rounded-full bg-gradient-to-br from-primary to-green-600 flex items-center justify-center shadow-lg shadow-primary/30">
                <Trophy className="size-10 text-background" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-6"
            >
              <h1 className="mb-3 bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
                Welcome to the Trivia Arena!
              </h1>
              <p className="text-muted-foreground text-lg">
                Let&apos;s personalize your experience.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-sm space-y-4"
            >
              <Button
                onClick={goToNextStep}
                size="lg"
                className="w-full h-14 text-lg"
              >
                <Sparkles className="size-5 mr-2" />
                Start
              </Button>

              <div className="flex items-center gap-3 justify-center text-muted-foreground text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>4 quick questions</span>
                </div>
                <div className="size-1 rounded-full bg-muted-foreground/30" />
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>Mini quiz</span>
                </div>
              </div>

              <button
                onClick={() => onComplete({
                  favoriteClub: '',
                  age: '',
                  preferredLanguage: '',
                  avatar: '',
                  quizScore: 0,
                })}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Skip for now
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 flex items-center gap-2"
            >
              <Flame className="size-5 text-orange-500" />
              <Star className="size-5 text-yellow-500" />
              <Trophy className="size-5 text-primary" />
            </motion.div>
          </motion.div>
        )}

        {/* Question 1: Favorite Club */}
        {currentStep === 'question1' && (
          <motion.div
            key="question1"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col p-6 overflow-hidden"
          >
            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  Question 1 of 3
                </Badge>
                <span className="text-xs text-muted-foreground">33%</span>
              </div>
              <Progress value={33} className="h-2" />
            </div>

            {/* Question Content */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Trophy className="size-6 text-primary" />
                    </div>
                    <h2 className="flex-1">Who is your favorite football club?</h2>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Tell us which team you support so we can personalize your experience.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Input
                    value={favoriteClub}
                    onChange={(e) => setFavoriteClub(e.target.value)}
                    placeholder="e.g., Manchester United, Barcelona..."
                    className="h-14 text-lg"
                    autoFocus
                  />
                </motion.div>
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 mt-4"
              >
                <Button
                  onClick={goToNextStep}
                  disabled={!favoriteClub.trim()}
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
            </div>
          </motion.div>
        )}

        {/* Question 2: Age */}
        {currentStep === 'question2' && (
          <motion.div
            key="question2"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col p-6 overflow-hidden"
          >
            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  Question 2 of 3
                </Badge>
                <span className="text-xs text-muted-foreground">66%</span>
              </div>
              <Progress value={66} className="h-2" />
            </div>

            {/* Question Content */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Target className="size-6 text-primary" />
                    </div>
                    <h2 className="flex-1">How old are you?</h2>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    This helps us tailor trivia difficulty to your experience level.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Enter your age"
                    className="h-14 text-lg"
                    min="1"
                    max="120"
                    autoFocus
                  />
                </motion.div>
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 mt-4"
              >
                <Button
                  onClick={goToNextStep}
                  disabled={!age || parseInt(age) < 1}
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
            </div>
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
            className="flex-1 flex flex-col p-6 overflow-hidden"
          >
            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  Question 3 of 3
                </Badge>
                <span className="text-xs text-muted-foreground">100%</span>
              </div>
              <Progress value={100} className="h-2" />
            </div>

            {/* Question Content */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-3"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Globe className="size-6 text-primary" />
                    </div>
                    <h2 className="flex-1">Choose your preferred language</h2>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Select the language you want to use in the app.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  {languages.map((language, index) => (
                    <motion.button
                      key={language.code}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                      onClick={() => setPreferredLanguage(language.code)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        preferredLanguage === language.code
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{language.flag}</span>
                        <div className="flex-1">
                          <div className="text-lg">{language.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {language.nativeName}
                          </div>
                        </div>
                        {preferredLanguage === language.code ? (
                          <CheckCircle2 className="size-5 text-primary" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground/30" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 mt-4"
              >
                <Button
                  onClick={goToNextStep}
                  disabled={!preferredLanguage}
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
            </div>
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
            className="flex-1 flex flex-col p-6 overflow-hidden"
          >
            {/* Progress indicator removed since this is after question 3 */}
            <div className="mb-4">
              <Badge variant="outline" className="text-xs">
                Almost there!
              </Badge>
            </div>

            {/* Question Content */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              <div className="flex-1 min-h-0 flex flex-col">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-3"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <User className="size-6 text-primary" />
                    </div>
                    <h2 className="flex-1">Choose Your Avatar</h2>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Select an emoji or upload your own image.
                  </p>
                </motion.div>

                {/* Selected Avatar Preview */}
                {avatar && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="flex justify-center mb-3"
                  >
                    <div className="size-20 rounded-full bg-gradient-to-br from-primary to-green-600 flex items-center justify-center shadow-lg shadow-primary/30 relative overflow-hidden">
                      {avatar.startsWith('data:') ? (
                        <Image
                          src={avatar}
                          alt="Avatar"
                          fill
                          sizes="80px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <Image
                          src={getAvatarUrl(avatar)}
                          alt="Avatar"
                          fill
                          sizes="80px"
                          unoptimized
                          className="object-cover"
                        />
                      )}
                      <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="size-3.5 text-background" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Upload Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-3"
                >
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="w-full p-3 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <Upload className="size-5 text-primary" />
                    <span className="text-primary">Upload Your Photo</span>
                  </label>
                </motion.div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs text-muted-foreground">or choose an avatar</span>
                  <div className="h-px bg-border flex-1" />
                </div>

                {/* Emoji Grid */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex-1 min-h-0"
                  style={{ maxHeight: '100%', overflowY: 'auto' }}
                >
                  <div className="grid grid-cols-6 gap-2">
                    {avatarSeeds.map((seed, index) => (
                      <motion.button
                        key={seed}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.02 }}
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
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3 mt-4"
              >
                <Button
                  onClick={goToNextStep}
                  disabled={!avatar}
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
            </div>
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
            className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
              className="mb-4"
            >
              <div className="size-20 rounded-full bg-gradient-to-br from-primary via-green-500 to-blue-500 flex items-center justify-center shadow-lg shadow-primary/30 relative">
                <Target className="size-10 text-background" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-background/30"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center mb-6"
            >
              <h1 className="mb-3 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                Let&apos;s test your knowledge!
              </h1>
              <p className="text-muted-foreground text-lg mb-4">
                A quick 6-question quiz to get you started.
              </p>
              <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                <Zap className="size-4 text-primary" />
                <span>Fast-paced</span>
                <div className="size-1 rounded-full bg-muted-foreground/30" />
                <Trophy className="size-4 text-primary" />
                <span>Fun trivia</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-sm"
            >
              <Button
                onClick={() => {
                  setCurrentStep('quiz');
                  setCurrentQuizQuestion(0);
                  setSelectedAnswer(null);
                }}
                size="lg"
                className="w-full h-14 text-lg"
              >
                <Sparkles className="size-5 mr-2" />
                Begin Quiz
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6"
            >
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4 pb-4 px-6">
                  <div className="flex items-center gap-3">
                    <Trophy className="size-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      6 questions • Multiple choice
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
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
            className="flex-1 flex flex-col p-6 overflow-hidden"
          >
            {/* Progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  {currentQuizQuestion + 1} / {quizQuestions.length}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {Math.round(((currentQuizQuestion + 1) / quizQuestions.length) * 100)}%
                </span>
              </div>
              <Progress
                value={((currentQuizQuestion + 1) / quizQuestions.length) * 100}
                className="h-2"
              />
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
                  <Card className="bg-gradient-to-br from-primary/10 to-blue-500/5 border-primary/20">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-primary">
                            {currentQuizQuestion + 1}
                          </span>
                        </div>
                        <h2 className="text-lg leading-tight">
                          {quizQuestions[currentQuizQuestion].question}
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
                        className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                          showFeedback
                            ? isCorrect
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-red-500 bg-red-500/10'
                            : isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                              showFeedback
                                ? isCorrect
                                  ? 'bg-green-500 text-background'
                                  : 'bg-red-500 text-background'
                                : isSelected
                                ? 'bg-primary text-background'
                                : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {showFeedback ? (
                              isCorrect ? (
                                <CheckCircle2 className="size-4" />
                              ) : (
                                <X className="size-4" />
                              )
                            ) : (
                              <span>{String.fromCharCode(65 + index)}</span>
                            )}
                          </div>
                          <span className="flex-1">{option}</span>
                          {showFeedback && (
                            isCorrect ? (
                              <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                            ) : (
                              <X className="size-5 text-red-500 shrink-0" />
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
                <Card className="bg-gradient-to-br from-primary/10 to-green-500/5 border-primary/20">
                  <CardContent className="pt-5 pb-5">
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
