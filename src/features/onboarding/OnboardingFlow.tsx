import Image from 'next/image';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import ClubSelect from './ClubSelect';
import {
  Trophy,
  ChevronLeft,
  CheckCircle2,
  Globe,
  User,
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

interface OnboardingData {
  favoriteClub: string;
  preferredLanguage: string;
  avatar: string;
  username: string;
  quizScore: number;
}

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪' },
];

const avatarSeeds = [
  'striker', 'goalkeeper', 'defender', 'midfielder', 'captain', 'coach',
  'ronaldo', 'messi', 'neymar', 'mbappe', 'haaland', 'benzema',
  'liverpool', 'barcelona', 'madrid', 'bayern', 'arsenal', 'chelsea',
  'legend', 'rookie', 'veteran', 'champion', 'winner', 'pro',
];

const getAvatarUrl = (seed: string) => {
  return `https://api.dicebear.com/7.x/big-smile/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9&size=128`;
};

const CONTINUE_BUTTON_CLASS = "w-full h-14 rounded-2xl text-lg font-black uppercase tracking-wide bg-green-500 text-[#131F24] hover:bg-green-400 border-b-[5px] border-green-700 active:border-b-0 active:translate-y-[5px] transition-all disabled:opacity-40 disabled:pointer-events-none";
const SKIP_BUTTON_CLASS = "w-full mt-4 text-sm font-bold text-[#56707A] hover:text-foreground transition-colors uppercase tracking-wide";

type OnboardingStep = 'question1' | 'question3' | 'avatar';

const stepOrder: OnboardingStep[] = ['question1', 'question3', 'avatar'];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [username, setUsername] = useState('');
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('question1');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [favoriteClub, setFavoriteClub] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [avatar, setAvatar] = useState('');

  const currentIndex = stepOrder.indexOf(currentStep);
  const progress = Math.round(((currentIndex + 1) / stepOrder.length) * 100);

  const goToPrevStep = () => {
    setDirection('backward');
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const goToNextStep = () => {
    setDirection('forward');
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleComplete = () => {
    const data: OnboardingData = {
      favoriteClub,
      preferredLanguage,
      avatar,
      username,
      quizScore: 0,
    };
    onComplete(data);
  };

  const variants = {
    enter: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen w-full bg-[#131F24] flex flex-col items-center justify-center py-12 px-4">
      {/* Progress bar */}
      <div className="w-full max-w-xl mx-auto mb-8 flex items-center gap-3">
        {currentIndex > 0 && (
          <button
            onClick={goToPrevStep}
            className="p-2 rounded-xl text-[#56707A] hover:text-foreground hover:bg-[#1B2F36] transition-colors"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}
        <div className="flex-1 h-4 bg-[#1B2F36] rounded-full overflow-hidden border-2 border-[#0D1B21]">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <span className="text-xs font-black uppercase tracking-wide text-[#56707A] min-w-[3ch] text-right">
          {currentIndex + 1}/{stepOrder.length}
        </span>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {/* Step 1: Club Selection */}
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
            <div className="bg-[#1B2F36] rounded-2xl border-2 border-[#0D1B21] border-b-4 p-8 shadow-xl">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="size-20 rounded-2xl bg-[#FF9600]/10 border-2 border-[#FF9600]/30 border-b-4 flex items-center justify-center">
                  <Trophy className="size-10 text-[#FF9600]" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-black uppercase tracking-wide text-center text-foreground mb-2">
                Pick Your Club
              </h1>
              <p className="text-[#56707A] text-center font-medium mb-8">
                Search and select your favorite football club.
              </p>

              {/* Club Select */}
              <div className="w-full mb-8">
                <ClubSelect
                  value={favoriteClub}
                  onChange={setFavoriteClub}
                />
              </div>

              {/* Continue Button */}
              <button
                onClick={goToNextStep}
                disabled={!favoriteClub.trim()}
                className={CONTINUE_BUTTON_CLASS}
              >
                Continue
              </button>

              {/* Skip */}
              <button
                onClick={goToNextStep}
                className={SKIP_BUTTON_CLASS}
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Language */}
        {currentStep === 'question3' && (
          <motion.div
            key="question3"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full max-w-xl mx-auto"
          >
            <div className="bg-[#1B2F36] rounded-2xl border-2 border-[#0D1B21] border-b-4 p-8 shadow-xl">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="size-20 rounded-2xl bg-[#1CB0F6]/10 border-2 border-[#1CB0F6]/30 border-b-4 flex items-center justify-center">
                  <Globe className="size-10 text-[#1CB0F6]" />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-black uppercase tracking-wide text-center text-foreground mb-2">
                Choose Language
              </h1>
              <p className="text-[#56707A] text-center font-medium mb-8">
                Select the language for your QuizBall experience.
              </p>

              {/* Language Options */}
              <div className="flex flex-col gap-3 mb-8">
                {languages.map((language) => {
                  const isSelected = preferredLanguage === language.code;
                  return (
                    <button
                      key={language.code}
                      onClick={() => setPreferredLanguage(language.code)}
                      className={`
                        w-full p-4 rounded-2xl border-2 border-b-4 flex items-center gap-4 transition-all text-left
                        ${isSelected
                          ? 'border-[#1CB0F6] bg-[#1CB0F6]/10'
                          : 'border-[#0D1B21] hover:border-[#56707A] bg-[#131F24]'
                        }
                      `}
                    >
                      <span className="text-3xl">{language.flag}</span>
                      <div className="flex-1">
                        <div className="font-black text-foreground">{language.name}</div>
                        <div className="text-xs text-[#56707A] font-medium">{language.nativeName}</div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="size-6 text-[#1CB0F6]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Continue Button */}
              <button
                onClick={goToNextStep}
                disabled={!preferredLanguage}
                className={CONTINUE_BUTTON_CLASS}
              >
                Continue
              </button>

              <button
                onClick={goToNextStep}
                className={SKIP_BUTTON_CLASS}
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Avatar + Username */}
        {currentStep === 'avatar' && (
          <motion.div
            key="avatar"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full max-w-xl mx-auto"
          >
            <div className="bg-[#1B2F36] rounded-2xl border-2 border-[#0D1B21] border-b-4 p-8 shadow-xl">
              {/* Avatar Preview */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="size-28 rounded-full bg-[#131F24] border-4 border-green-500 flex items-center justify-center overflow-hidden shadow-lg shadow-green-500/20">
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
                      <User className="size-14 text-[#56707A]" />
                    )}
                  </div>
                  {avatar && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -bottom-1 -right-1 size-8 rounded-full bg-green-500 border-2 border-[#1B2F36] flex items-center justify-center"
                    >
                      <CheckCircle2 className="size-4 text-[#131F24]" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Title */}
              <h1 className="text-2xl font-black uppercase tracking-wide text-center text-foreground mb-2">
                Create Your Profile
              </h1>
              <p className="text-[#56707A] text-center font-medium mb-6">
                Pick an avatar and choose your display name.
              </p>

              {/* Username Input */}
              <div className="mb-6">
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="
                    text-center text-lg font-bold py-3 h-14
                    bg-[#131F24] border-2 border-[#0D1B21] border-b-4 rounded-2xl
                    text-foreground placeholder:text-[#56707A]
                    focus:border-green-500 focus:ring-0
                  "
                  maxLength={20}
                />
                <div className="text-xs text-[#56707A] mt-2 text-center font-medium">
                  This will be your public display name.
                </div>
              </div>

              {/* Avatar Grid */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px bg-[#0D1B21] flex-1" />
                  <span className="text-xs font-black uppercase tracking-wide text-[#56707A]">Choose Avatar</span>
                  <div className="h-px bg-[#0D1B21] flex-1" />
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {avatarSeeds.map((seed) => {
                    const isSelected = avatar === seed;
                    return (
                      <button
                        key={seed}
                        onClick={() => setAvatar(seed)}
                        className={`
                          relative aspect-square rounded-xl border-2 border-b-4 transition-all flex items-center justify-center overflow-hidden
                          ${isSelected
                            ? 'border-green-500 bg-green-500/10 scale-110 z-10'
                            : 'border-[#0D1B21] hover:border-[#56707A] bg-[#131F24]'
                          }
                        `}
                      >
                        <Image
                          src={getAvatarUrl(seed)}
                          alt={seed}
                          fill
                          loading="lazy"
                          sizes="80px"
                          unoptimized
                          className="object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Complete Button */}
              <button
                onClick={handleComplete}
                disabled={!avatar || !username.trim()}
                className={CONTINUE_BUTTON_CLASS}
              >
                Let&apos;s Go!
              </button>

              <button
                onClick={handleComplete}
                className={SKIP_BUTTON_CLASS}
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
