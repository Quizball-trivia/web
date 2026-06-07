import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { CountryFlag } from '@/components/CountryFlag';
import ClubSelect from './ClubSelect';
import { AvatarPreview } from '@/components/AvatarPreview';
import type { AvatarCustomization } from '@/types/game';
import { AVATAR_COLORS } from '@/lib/avatars';
import { DEFAULT_HAIR_ID, DEFAULT_JERSEY_ID, DEFAULT_SKIN_ID } from '@/lib/avatars/parts';
import { trackOnboardingStarted, trackOnboardingStepCompleted } from '@/lib/analytics/game-events';
import { useLocale } from '@/contexts/LocaleContext';
import type { Locale } from '@/lib/i18n/messages';

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  isSubmitting?: boolean;
}

interface OnboardingData {
  favoriteClub: string;
  preferredLanguage: string;
  avatar: string;
  username: string;
  quizScore: number;
}

const LANGUAGES = [
  { code: 'en', name: 'ENGLISH', nativeName: 'English', countryCode: 'gb' },
  { code: 'ka', name: 'GEORGIAN', nativeName: 'ქართული', countryCode: 'ge' },
] as const satisfies readonly { code: Locale; name: string; nativeName: string; countryCode: string }[];

function getAvatarCustomization(color: string | null | undefined): AvatarCustomization {
  return {
    skin: DEFAULT_SKIN_ID,
    jersey: color ? `jersey_${color}` as AvatarCustomization['jersey'] : DEFAULT_JERSEY_ID,
    hair: DEFAULT_HAIR_ID,
  };
}

const PRIMARY_CTA_CLASS =
  'w-full h-[56px] md:h-[64px] rounded-[18px] bg-brand-green text-white font-poppins text-[20px] md:text-[24px] font-semibold uppercase hover:brightness-110 transition-all disabled:opacity-40 disabled:pointer-events-none';

const OPTION_PILL_CLASS =
  'flex h-[56px] md:h-[64px] w-full items-center gap-3 rounded-[18px] bg-brand-blue px-3 text-left transition-all hover:brightness-110';

type OnboardingStep = 'language' | 'club' | 'profile';
const STEP_ORDER: OnboardingStep[] = ['language', 'club', 'profile'];

export function OnboardingFlow({ onComplete, isSubmitting = false }: OnboardingFlowProps) {
  const { locale, setLocale, t } = useLocale();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('language');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [preferredLanguage, setPreferredLanguage] = useState<Locale>(locale);
  const [favoriteClub, setFavoriteClub] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const languageTouchedRef = useRef(false);
  // Analytics — fire once on mount + once per forward step transition.
  // useRef avoids double-firing in React Strict Mode dev double-mount.
  const trackedStartRef = useRef(false);
  useEffect(() => {
    if (trackedStartRef.current) return;
    trackedStartRef.current = true;
    trackOnboardingStarted();
  }, []);

  useEffect(() => {
    if (languageTouchedRef.current) return;
    queueMicrotask(() => setPreferredLanguage(locale));
  }, [locale]);

  const handleLanguageSelect = (language: Locale) => {
    languageTouchedRef.current = true;
    setPreferredLanguage(language);
    setLocale(language);
  };

  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const progress = ((currentIndex + 1) / STEP_ORDER.length) * 100;

  const goBack = () => {
    if (currentIndex === 0) return;
    setDirection('backward');
    setCurrentStep(STEP_ORDER[currentIndex - 1]);
  };

  const goNext = () => {
    if (currentIndex >= STEP_ORDER.length - 1) return;
    // Track completion of the step the user is leaving, before advancing.
    trackOnboardingStepCompleted(currentStep);
    setDirection('forward');
    setCurrentStep(STEP_ORDER[currentIndex + 1]);
  };

  const handleComplete = () => {
    // Track final step completion before invoking the parent handler.
    trackOnboardingStepCompleted(currentStep);
    onComplete({
      favoriteClub: favoriteClub.trim(),
      preferredLanguage: preferredLanguage.trim(),
      avatar: avatar.trim(),
      username: username.trim(),
      quizScore: 0,
    });
  };

  const variants = {
    enter: (dir: 'forward' | 'backward') => ({ x: dir === 'forward' ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: 'forward' | 'backward') => ({ x: dir === 'forward' ? -200 : 200, opacity: 0 }),
  };

  const canAdvance =
    (currentStep === 'language' && !!preferredLanguage) ||
    (currentStep === 'club' && !!favoriteClub.trim()) ||
    (currentStep === 'profile' && !!avatar && !!username.trim());

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <header className="px-5 pt-5 md:px-12 md:pt-6">
        <AppLogo size="md" iconOnly className="!justify-start" />
      </header>

      <div className="mx-auto w-full max-w-[440px] md:max-w-[520px] px-5 pb-10 pt-6 md:pt-8">
        <p className="text-center font-poppins text-[20px] md:text-[24px] font-semibold uppercase text-white/50">
          {currentIndex + 1}/{STEP_ORDER.length}
        </p>

        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label={t("onboarding.goBack")}
            className={`flex size-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/5 transition-colors ${
              currentIndex > 0 ? '' : 'invisible'
            }`}
          >
            <ChevronLeft className="size-5" />
          </button>

          <div
            role="progressbar"
            aria-label={t("onboarding.progress")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="h-[18px] md:h-[22px] flex-1 overflow-hidden bg-brand-green-deep"
          >
            <motion.div
              className="h-full bg-brand-green"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          <div className="size-9 shrink-0" aria-hidden />
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 'language' && (
            <motion.div
              key="language"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h1 className="mt-8 md:mt-10 text-center font-poppins text-[28px] md:text-[40px] font-semibold uppercase leading-none">
                {t("onboarding.chooseLanguage")}
              </h1>
              <p className="mt-2 md:mt-3 text-center font-poppins text-[12px] md:text-[14px] font-semibold uppercase text-white/50">
                {t("onboarding.chooseLanguageHint")}
              </p>

              <div className="mt-7 md:mt-9 space-y-2.5 md:space-y-3">
                {LANGUAGES.map((language) => {
                  const isSelected = preferredLanguage === language.code;
                  return (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => handleLanguageSelect(language.code)}
                      aria-pressed={isSelected}
                      className={`${OPTION_PILL_CLASS} ${isSelected ? 'ring-2 ring-white' : ''}`}
                    >
                      <CountryFlag
                        code={language.countryCode}
                        className="shrink-0 overflow-hidden rounded-md text-[36px] md:text-[42px]"
                      />
                      <div className="flex flex-col leading-none">
                        <span className="font-poppins text-[18px] md:text-[24px] font-semibold uppercase text-white">
                          {language.name}
                        </span>
                        <span className="mt-1 font-poppins text-[12px] md:text-[14px] font-semibold uppercase text-white/50">
                          {language.nativeName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance}
                className={`mt-8 md:mt-10 ${PRIMARY_CTA_CLASS}`}
              >
                {t("onboarding.letsGo")}
              </button>
            </motion.div>
          )}

          {currentStep === 'club' && (
            <motion.div
              key="club"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h1 className="mt-8 md:mt-10 text-center font-poppins text-[28px] md:text-[40px] font-semibold uppercase leading-none">
                {t("onboarding.pickYourClub")}
              </h1>

              <div className="mt-7 md:mt-9">
                <ClubSelect value={favoriteClub} onChange={setFavoriteClub} />
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance}
                className={`mt-8 md:mt-10 ${PRIMARY_CTA_CLASS}`}
              >
                {t("onboarding.letsGo")}
              </button>
            </motion.div>
          )}

          {currentStep === 'profile' && (
            <motion.div
              key="profile"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <h1 className="mt-8 md:mt-10 text-center font-poppins text-[28px] md:text-[40px] font-semibold uppercase leading-none">
                {t("onboarding.createYourProfile")}
              </h1>
              <p className="mt-2 md:mt-3 text-center font-poppins text-[12px] md:text-[14px] font-semibold uppercase text-white/50">
                {t("onboarding.pickUsernameAvatar")}
              </p>

              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("onboarding.enterUsername")}
                maxLength={20}
                className="mt-7 md:mt-9 h-[56px] md:h-[64px] w-full rounded-[18px] bg-brand-blue px-5 text-center font-poppins text-[18px] md:text-[24px] font-semibold uppercase text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white"
              />

              <p className="mt-6 md:mt-8 text-center font-poppins text-[12px] md:text-[14px] font-semibold uppercase text-white/50">
                {t("onboarding.chooseAvatar")}
              </p>

              <div className="mt-3 md:mt-4 flex justify-between gap-2">
                {AVATAR_COLORS.map((color) => {
                  const isSelected = avatar === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatar(color)}
                      aria-label={t("onboarding.selectAvatar", { color })}
                      aria-pressed={isSelected}
                      className={`relative flex size-14 md:size-[78px] items-center justify-center overflow-hidden rounded-full bg-brand-blue transition-transform ${
                        isSelected ? 'ring-2 ring-white scale-[1.06]' : 'hover:brightness-110'
                      }`}
                    >
                      <AvatarPreview
                        customization={getAvatarCustomization(color)}
                        width={42}
                        className="md:hidden translate-y-[2px]"
                      />
                      <AvatarPreview
                        customization={getAvatarCustomization(color)}
                        width={58}
                        className="hidden md:block translate-y-[2px]"
                      />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleComplete}
                disabled={!canAdvance || isSubmitting}
                className={`mt-8 md:mt-10 ${PRIMARY_CTA_CLASS}`}
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-5 animate-spin" />
                    {t("onboarding.saving")}
                  </span>
                ) : (
                  <>Let&apos;s Go</>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
