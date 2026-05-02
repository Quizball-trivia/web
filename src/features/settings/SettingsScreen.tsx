"use client";

import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Bell, ChevronLeft, Globe, LogOut, Shield, User, Volume2, HelpCircle, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { SettingsSection } from "./components/SettingsSection";
import { SettingsToggle } from "./components/SettingsToggle";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { useLocale } from "@/contexts/LocaleContext";
import { updateMe } from "@/lib/api/endpoints";
import { type Locale } from "@/lib/i18n/messages";

interface UserPreferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  invitesEnabled: boolean;
  questAlertsEnabled: boolean;
  streakAlertsEnabled: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  invitesEnabled: true,
  questAlertsEnabled: true,
  streakAlertsEnabled: true,
};

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { logout, user, setAuthenticated } = useAuthStore();
  const { locale, setLocale, t } = useLocale();

  // Preferences state - initialized from storage
  const [soundEnabled, setSoundEnabled] = useState(DEFAULT_PREFERENCES.soundEnabled);
  const [musicEnabled, setMusicEnabled] = useState(DEFAULT_PREFERENCES.musicEnabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(DEFAULT_PREFERENCES.hapticsEnabled);
  const [invitesEnabled, setInvitesEnabled] = useState(DEFAULT_PREFERENCES.invitesEnabled);
  const [questAlertsEnabled, setQuestAlertsEnabled] = useState(DEFAULT_PREFERENCES.questAlertsEnabled);
  const [streakAlertsEnabled, setStreakAlertsEnabled] = useState(DEFAULT_PREFERENCES.streakAlertsEnabled);
  const [isLanguageSaving, setIsLanguageSaving] = useState(false);

  const isInitialMount = useRef(true);

  // Load preferences from storage on mount - intentional initialization pattern
  useEffect(() => {
    const savedPrefs = storage.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
    queueMicrotask(() => {
      setSoundEnabled(savedPrefs.soundEnabled ?? DEFAULT_PREFERENCES.soundEnabled);
      setMusicEnabled(savedPrefs.musicEnabled ?? DEFAULT_PREFERENCES.musicEnabled);
      setHapticsEnabled(savedPrefs.hapticsEnabled ?? DEFAULT_PREFERENCES.hapticsEnabled);
      setInvitesEnabled(savedPrefs.invitesEnabled ?? DEFAULT_PREFERENCES.invitesEnabled);
      setQuestAlertsEnabled(savedPrefs.questAlertsEnabled ?? DEFAULT_PREFERENCES.questAlertsEnabled);
      setStreakAlertsEnabled(savedPrefs.streakAlertsEnabled ?? DEFAULT_PREFERENCES.streakAlertsEnabled);
    });
  }, []);

  // Save preferences to storage when any toggle changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const prefs: UserPreferences = {
      soundEnabled,
      musicEnabled,
      hapticsEnabled,
      invitesEnabled,
      questAlertsEnabled,
      streakAlertsEnabled,
    };
    storage.set(STORAGE_KEYS.USER_PREFERENCES, prefs);
  }, [soundEnabled, musicEnabled, hapticsEnabled, invitesEnabled, questAlertsEnabled, streakAlertsEnabled]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/"; // Force full reload/redirect
  };

  const handleResetOnboarding = () => {
    storage.remove(STORAGE_KEYS.ONBOARDING_COMPLETE);
    storage.remove(STORAGE_KEYS.WALKTHROUGH_COMPLETE);
    window.location.href = "/onboarding";
  };

  const handleResetTraining = () => {
    storage.remove(STORAGE_KEYS.TRAINING_COMPLETE);
    toast.success(t("settings.resetTrainingSuccess"));
  };

  const toggleLanguage = async () => {
    if (isLanguageSaving) {
      return;
    }

    const newLocale = locale === 'en' ? 'ka' : 'en';
    setLocale(newLocale);
    setIsLanguageSaving(true);

    try {
      if (user) {
        const updated = await updateMe({ preferred_language: newLocale });
        setAuthenticated({ ...user, preferred_language: updated.preferred_language ?? newLocale });
      }
      toast.success(
        newLocale === 'en'
          ? t("settings.languageSwitchedEnglish")
          : t("settings.languageSwitchedGeorgian")
      );
    } catch {
      setLocale(locale as Locale);
      toast.error(t("settings.languageUpdateFailed"));
    } finally {
      setIsLanguageSaving(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-6 pb-20 animate-in fade-in duration-500">
      {/* Nav */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-muted/50">
          <ChevronLeft className="size-6" />
        </Button>
        <span className="text-xl font-bold">{t("settings.title")}</span>
      </div>

      <div className="space-y-8">
         {/* Language & Experience */}
         <SettingsSection title={t("settings.languageAndExperience")} icon={<Globe className="size-5" />}>
            <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer" onClick={toggleLanguage}>
               <div className="flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-xl shadow-sm border border-blue-500/20">
                     {locale === 'en' ? '🇺🇸' : '🇬🇪'}
                  </div>
                  <div>
                     <div className="font-medium">
                       {locale === 'en' ? t("settings.languageCurrentEnglish") : t("settings.languageCurrentGeorgian")}
                     </div>
                     <div className="text-xs text-muted-foreground">
                       {locale === 'en' ? t("settings.switchToGeorgian") : t("settings.switchToEnglish")}
                     </div>
                  </div>
               </div>
               <Button variant="ghost" size="sm" className="font-semibold text-primary" disabled={isLanguageSaving}>
                 {t("common.change")}
               </Button>
            </div>
         </SettingsSection>

         {/* Match Atmosphere */}
         <SettingsSection title={t("settings.matchAtmosphere")} icon={<Volume2 className="size-5" />}>
            <SettingsToggle
               label={t("settings.matchSounds")}
               description={t("settings.matchSoundsDescription")}
               checked={soundEnabled}
               onCheckedChange={setSoundEnabled}
               toastMessage={soundEnabled ? t("settings.matchSoundsMuted") : t("settings.matchSoundsEnabled")}
            />
            <SettingsToggle
               label={t("settings.stadiumMusic")}
               description={t("settings.stadiumMusicDescription")}
               checked={musicEnabled}
               onCheckedChange={setMusicEnabled}
               toastMessage={musicEnabled ? t("settings.stadiumMusicMuted") : t("settings.stadiumMusicEnabled")}
            />
             <SettingsToggle
               label={t("settings.haptics")}
               description={t("settings.hapticsDescription")}
               checked={hapticsEnabled}
               onCheckedChange={setHapticsEnabled}
            />
         </SettingsSection>

         {/* Game Alerts */}
         <SettingsSection title={t("settings.gameAlerts")} icon={<Bell className="size-5" />}>
            <SettingsToggle
               label={t("settings.matchInvites")}
               description={t("settings.matchInvitesDescription")}
               checked={invitesEnabled}
               onCheckedChange={setInvitesEnabled}
            />
            <SettingsToggle
               label={t("settings.dailyQuestReminders")}
               description={t("settings.dailyQuestRemindersDescription")}
               checked={questAlertsEnabled}
               onCheckedChange={setQuestAlertsEnabled}
            />
            <SettingsToggle
               label={t("settings.streakProtection")}
               description={t("settings.streakProtectionDescription")}
               checked={streakAlertsEnabled}
               onCheckedChange={setStreakAlertsEnabled}
            />
         </SettingsSection>

         {/* Account & Safety */}
         <SettingsSection title={t("settings.accountAndSafety")} icon={<Shield className="size-5" />}>
            <div className="group flex items-center justify-between p-3 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/40 last:border-0">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                     <User className="size-4" />
                  </div>
                  <div className="font-medium text-sm">{t("settings.manageAccount")}</div>
               </div>
               <ChevronLeft className="size-4 rotate-180 text-muted-foreground" />
            </div>

             {process.env.NODE_ENV !== "production" && (
               <>
                 <div className="group flex items-center justify-between p-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={handleResetOnboarding}>
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                         <RotateCcw className="size-4" />
                      </div>
                      <div className="font-medium text-sm">
                        {t("settings.resetOnboarding")} <span className="text-xs text-muted-foreground">({t("settings.dev")})</span>
                      </div>
                   </div>
                 </div>
                 <div className="group flex items-center justify-between p-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={handleResetTraining}>
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                         <RotateCcw className="size-4" />
                      </div>
                      <div className="font-medium text-sm">
                        {t("settings.resetTrainingMatch")} <span className="text-xs text-muted-foreground">({t("settings.dev")})</span>
                      </div>
                   </div>
                 </div>
               </>
             )}

            <div className="p-3 border-t border-border/40">
               <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto text-xs h-8 gap-2"
                  onClick={handleLogout}
               >
                  <LogOut className="size-3" />
                  {t("settings.logOut")}
               </Button>
            </div>
         </SettingsSection>

         {/* About */}
         <SettingsSection title={t("settings.about")} icon={<HelpCircle className="size-5" />}>
             <div className="p-4 text-center">
                <p className="font-bold text-lg">QuizBall</p>
                <p className="text-sm text-muted-foreground">{t("settings.version")}</p>
                <p className="text-xs text-muted-foreground mt-1">ID: {user?.id?.slice(0, 8) ?? t("settings.guest")}</p>
             </div>
         </SettingsSection>
      </div>
    </div>
  );
}
