"use client";

import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, ChevronLeft, Globe, KeyRound, LogOut, Phone, Shield, Trash2, Volume2, HelpCircle, RotateCcw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { SettingsSection } from "./components/SettingsSection";
import { SettingsToggle } from "./components/SettingsToggle";
import { PasswordForm } from "@/features/auth/PasswordForm";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { useLocale } from "@/contexts/LocaleContext";
import { trackSettingsOpened } from "@/lib/analytics/game-events";
import { resetOwnOnboarding, updateMe } from "@/lib/api/endpoints";
import { startGeorgianPhoneLink, resetPassword, verifyGeorgianPhoneLink } from "@/lib/auth/auth.service";
import { normalizeGeorgianPhone, validateGeorgianPhone, validateOtp } from "@/lib/auth/validation";
import { useGeorgianPhoneAuthAvailability } from "@/lib/auth/useGeorgianPhoneAuthAvailability";
import { ApiError } from "@/lib/api/api";
import { requestAccountDeletion } from "@/lib/repositories/users.repo";
import { type Locale } from "@/lib/i18n/messages";
import { trackLanguageSwitched } from "@/lib/analytics/game-events";

interface UserPreferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
  invitesEnabled: boolean;
  questAlertsEnabled: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  soundEnabled: true,
  musicEnabled: true,
  invitesEnabled: true,
  questAlertsEnabled: true,
};

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { logout, user, setAuthenticated } = useAuthStore();
  const { locale, setLocale, t } = useLocale();
  const phoneAuthAvailability = useGeorgianPhoneAuthAvailability();

  // Analytics: fire once per mount so re-renders don't double-count.
  const settingsOpenedTrackedRef = useRef(false);
  useEffect(() => {
    if (settingsOpenedTrackedRef.current) return;
    settingsOpenedTrackedRef.current = true;
    try { trackSettingsOpened(); } catch { /* best-effort */ }
  }, []);

  // Preferences state - initialized from storage
  const [soundEnabled, setSoundEnabled] = useState(DEFAULT_PREFERENCES.soundEnabled);
  const [musicEnabled, setMusicEnabled] = useState(DEFAULT_PREFERENCES.musicEnabled);
  const [invitesEnabled, setInvitesEnabled] = useState(DEFAULT_PREFERENCES.invitesEnabled);
  const [questAlertsEnabled, setQuestAlertsEnabled] = useState(DEFAULT_PREFERENCES.questAlertsEnabled);
  const [isLanguageSaving, setIsLanguageSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"phone" | "otp">("phone");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneNotice, setPhoneNotice] = useState<string | null>(null);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  const isInitialMount = useRef(true);
  const deletionConfirmWord = t("settings.deleteAccountConfirmWord");
  const normalizedDeleteConfirmation = deleteConfirmation.trim().toLocaleUpperCase("en-US");
  const normalizedDeletionConfirmWord = deletionConfirmWord.trim().toLocaleUpperCase("en-US");
  const canConfirmDeletion = normalizedDeleteConfirmation === normalizedDeletionConfirmWord && !isDeletingAccount;
  const canUseDevReset = user?.role === "admin";
  const currentPhone = user?.phone_number ?? null;
  const canUseGeorgianPhoneAuth = phoneAuthAvailability.isAvailable;

  // Load preferences from storage on mount - intentional initialization pattern
  useEffect(() => {
    const savedPrefs = storage.get<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_PREFERENCES);
    queueMicrotask(() => {
      setSoundEnabled(savedPrefs.soundEnabled ?? DEFAULT_PREFERENCES.soundEnabled);
      setMusicEnabled(savedPrefs.musicEnabled ?? DEFAULT_PREFERENCES.musicEnabled);
      setInvitesEnabled(savedPrefs.invitesEnabled ?? DEFAULT_PREFERENCES.invitesEnabled);
      setQuestAlertsEnabled(savedPrefs.questAlertsEnabled ?? DEFAULT_PREFERENCES.questAlertsEnabled);
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
      invitesEnabled,
      questAlertsEnabled,
    };
    storage.set(STORAGE_KEYS.USER_PREFERENCES, prefs);
  }, [soundEnabled, musicEnabled, invitesEnabled, questAlertsEnabled]);

  useEffect(() => {
    if (!canUseGeorgianPhoneAuth && phoneDialogOpen) {
      setPhoneDialogOpen(false);
    }
  }, [canUseGeorgianPhoneAuth, phoneDialogOpen]);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/"; // Force full reload/redirect
  };

  // Add or change the password on the current Supabase account. Works for
  // Google-created users too — it effectively adds a password to the same
  // account (uses the logged-in user's token via the api client).
  const handleUpdatePassword = async (newPassword: string) => {
    setIsUpdatingPassword(true);
    try {
      await resetPassword(newPassword);
      toast.success(t("settings.changePasswordSuccess"));
      setPasswordDialogOpen(false);
    } catch {
      toast.error(t("settings.changePasswordFailed"));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const resetPhoneDialogState = () => {
    setPhoneStep("phone");
    setPhoneInput(currentPhone ?? "");
    setPhoneOtp("");
    setPhoneError(null);
    setPhoneNotice(null);
  };

  const openPhoneDialog = () => {
    if (!canUseGeorgianPhoneAuth) {
      return;
    }
    resetPhoneDialogState();
    setPhoneDialogOpen(true);
  };

  const handlePhoneSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPhoneError(null);
    setPhoneNotice(null);

    const normalizedPhone = normalizeGeorgianPhone(phoneInput);
    const errorKey = phoneStep === "phone"
      ? validateGeorgianPhone(phoneInput)
      : validateOtp(phoneOtp);
    if (errorKey) {
      setPhoneError(t(errorKey));
      return;
    }

    setIsUpdatingPhone(true);
    try {
      if (phoneStep === "phone") {
        const result = await startGeorgianPhoneLink(normalizedPhone);
        setPhoneInput(result.phone);
        if (!result.otp_required) {
          toast.success(t("settings.phoneAlreadyLinked"));
          setPhoneDialogOpen(false);
          return;
        }
        setPhoneStep("otp");
        setPhoneNotice(t("settings.phoneCodeSent", { phone: result.phone }));
        return;
      }

      const updated = await verifyGeorgianPhoneLink(normalizedPhone, phoneOtp);
      setAuthenticated(updated);
      toast.success(t("settings.phoneLinkSuccess"));
      setPhoneDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setPhoneError(t("settings.phoneLinkedElsewhere"));
      } else if (phoneStep === "otp") {
        setPhoneError(t("settings.phoneOtpFailed"));
      } else {
        setPhoneError(t("settings.phoneLinkFailed"));
      }
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!canConfirmDeletion) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      await requestAccountDeletion();
      toast.success(t("settings.deleteAccountScheduled"));
      await logout();
      window.location.href = "/";
    } catch {
      toast.error(t("settings.deleteAccountFailed"));
      setIsDeletingAccount(false);
    }
  };

  const handleResetOnboarding = async () => {
    try {
      const updated = await resetOwnOnboarding();
      setAuthenticated(updated);
      storage.remove(STORAGE_KEYS.ONBOARDING_COMPLETE);
      storage.remove(STORAGE_KEYS.WALKTHROUGH_COMPLETE);
      window.location.href = "/onboarding";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reset onboarding";
      toast.error(message);
    }
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
    trackLanguageSwitched(locale, newLocale);
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
            <div className="p-4 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={toggleLanguage}>
               <div className="flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-xl shadow-sm border border-blue-500/20">
                     {locale === 'en' ? '🇺🇸' : '🇬🇪'}
                  </div>
                  <div>
                     <div className="font-medium text-white">
                       {locale === 'en' ? t("settings.languageCurrentEnglish") : t("settings.languageCurrentGeorgian")}
                     </div>
                     <div className="text-xs text-white/55">
                       {locale === 'en' ? t("settings.switchToGeorgian") : t("settings.switchToEnglish")}
                     </div>
                  </div>
               </div>
               <Button variant="ghost" size="sm" className="font-semibold text-brand-green hover:text-brand-green hover:bg-brand-green/10" disabled={isLanguageSaving}>
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
         </SettingsSection>

         {/* Account & Safety */}
         <SettingsSection title={t("settings.accountAndSafety")} icon={<Shield className="size-5" />}>
            {canUseGeorgianPhoneAuth ? (
              <div
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                className="group flex items-center justify-between p-3 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={openPhoneDialog}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPhoneDialog();
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                    <Phone className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{t("settings.addOrChangePhone")}</div>
                    <div className="text-xs text-muted-foreground">
                      {currentPhone
                        ? t("settings.phoneCurrentDescription", { phone: currentPhone })
                        : t("settings.phoneNotLinkedDescription")}
                    </div>
                  </div>
                </div>
                <ChevronLeft className="size-4 rotate-180 text-muted-foreground" />
              </div>
            ) : null}

            <div
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              className="group flex items-center justify-between p-3 hover:bg-muted/30 transition-colors cursor-pointer border-b border-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              onClick={() => setPasswordDialogOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setPasswordDialogOpen(true);
                }
              }}
            >
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                     <KeyRound className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{t("settings.addOrChangePassword")}</div>
                    <div className="text-xs text-muted-foreground">{t("settings.addOrChangePasswordDescription")}</div>
                  </div>
               </div>
               <ChevronLeft className="size-4 rotate-180 text-muted-foreground" />
            </div>

            <div
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              className="group flex items-center justify-between p-3 hover:bg-destructive/10 transition-colors cursor-pointer border-b border-border/40 last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
              onClick={() => {
                setDeleteConfirmation("");
                setDeleteDialogOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setDeleteConfirmation("");
                  setDeleteDialogOpen(true);
                }
              }}
            >
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10 text-destructive group-hover:bg-destructive/15 transition-colors">
                     <Trash2 className="size-4" />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-destructive">{t("settings.deleteAccount")}</div>
                    <div className="text-xs text-muted-foreground">{t("settings.deleteAccountDescription")}</div>
                  </div>
               </div>
               <ChevronLeft className="size-4 rotate-180 text-muted-foreground" />
            </div>

             {canUseDevReset && (
               <>
                 <button
                   type="button"
                   className="group flex w-full items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                   onClick={() => { void handleResetOnboarding(); }}
                 >
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                         <RotateCcw className="size-4" />
                      </div>
                      <div className="font-medium text-sm">
                        {t("settings.resetOnboarding")} <span className="text-xs text-muted-foreground">({t("settings.dev")})</span>
                      </div>
                   </div>
                 </button>
                 <button
                   type="button"
                   className="group flex w-full items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                   onClick={handleResetTraining}
                 >
                   <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                         <RotateCcw className="size-4" />
                      </div>
                      <div className="font-medium text-sm">
                        {t("settings.resetTrainingMatch")} <span className="text-xs text-muted-foreground">({t("settings.dev")})</span>
                      </div>
                   </div>
                 </button>
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

      <Dialog
        open={canUseGeorgianPhoneAuth && phoneDialogOpen}
        onOpenChange={(open) => {
          if (isUpdatingPhone) return;
          if (open) {
            resetPhoneDialogState();
          }
          setPhoneDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md rounded-[24px] border-0 bg-brand-blue p-8 sm:p-10">
          <DialogHeader>
            <DialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
              {t("settings.changePhoneTitle")}
            </DialogTitle>
            <DialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
              {phoneStep === "otp"
                ? t("settings.changePhoneOtpDescription", { phone: normalizeGeorgianPhone(phoneInput) })
                : t("settings.changePhoneModalDescription")}
            </DialogDescription>
          </DialogHeader>

          <form className="mt-6 space-y-4" onSubmit={handlePhoneSubmit}>
            <label className="block">
              <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                {t("welcome.phoneLabel")}
              </span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                <Input
                  type="tel"
                  value={phoneInput}
                  onChange={(event) => {
                    setPhoneInput(event.target.value);
                    setPhoneError(null);
                    setPhoneNotice(null);
                  }}
                  placeholder={t("welcome.phonePlaceholder")}
                  className="h-[54px] rounded-[18px] border-2 border-white/15 bg-white/10 pl-11 font-poppins text-base font-semibold text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isUpdatingPhone || phoneStep === "otp"}
                />
              </div>
            </label>

            {phoneStep === "otp" ? (
              <label className="block">
                <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                  {t("welcome.otpLabel")}
                </span>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={phoneOtp}
                  onChange={(event) => {
                    setPhoneOtp(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setPhoneError(null);
                  }}
                  placeholder={t("welcome.otpPlaceholder")}
                  className="h-[54px] rounded-[18px] border-2 border-white/15 bg-white/10 text-center font-poppins text-lg font-bold tracking-[0.5em] text-white placeholder:tracking-normal placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isUpdatingPhone}
                />
              </label>
            ) : null}

            {phoneError ? (
              <p className="font-poppins text-xs font-bold text-brand-red-light" role="alert">
                {phoneError}
              </p>
            ) : null}
            {phoneNotice ? (
              <p className="rounded-[16px] bg-white/10 px-4 py-3 text-center font-poppins text-xs font-semibold leading-snug text-white/85">
                {phoneNotice}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={isUpdatingPhone || !phoneInput || (phoneStep === "otp" && phoneOtp.length === 0)}
              className="h-[54px] w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-60"
            >
              {isUpdatingPhone
                ? t("resetPassword.submitting")
                : phoneStep === "otp"
                  ? t("settings.phoneVerifyCode")
                  : t("settings.phoneSendCode")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          if (isUpdatingPassword) return;
          setPasswordDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-md rounded-[24px] border-0 bg-brand-blue p-8 sm:p-10">
          <DialogHeader>
            <DialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
              {t("settings.changePasswordTitle")}
            </DialogTitle>
            <DialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
              {t("settings.changePasswordModalDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <PasswordForm
              onSubmit={handleUpdatePassword}
              submitting={isUpdatingPassword}
              submitLabel={t("settings.changePasswordSubmit")}
              submittingLabel={t("resetPassword.submitting")}
            />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeletingAccount) return;
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteConfirmation("");
          }
        }}
      >
        <AlertDialogContent
          className="max-w-md w-[92vw] rounded-[24px] border-0 bg-brand-blue p-8 font-poppins shadow-none sm:p-10"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
              {t("settings.deleteAccountTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
              {t("settings.deleteAccountModalDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-5 space-y-2">
            <label htmlFor="delete-account-confirmation" className="block font-poppins text-xs font-semibold text-white/85">
              {t("settings.deleteAccountConfirmLabel", { confirmWord: deletionConfirmWord })}
            </label>
            <Input
              id="delete-account-confirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              disabled={isDeletingAccount}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder={deletionConfirmWord}
              className="h-[58px] w-full rounded-[20px] border-2 border-white/20 bg-transparent px-4 text-center font-poppins text-base font-semibold uppercase tracking-wide text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction
              disabled={!canConfirmDeletion}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
              className="w-full rounded-[16px] border-0 bg-brand-red-soft from-brand-red-soft to-brand-red-soft px-3 py-3 font-poppins text-sm font-semibold uppercase tracking-wide text-white shadow-none hover:bg-brand-red-soft/90 hover:from-brand-red-soft/90 hover:to-brand-red-soft/90 hover:shadow-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50"
            >
              {isDeletingAccount ? t("settings.deleteAccountDeleting") : t("settings.deleteAccount")}
            </AlertDialogAction>
            <AlertDialogCancel
              disabled={isDeletingAccount}
              className="mt-0 w-full rounded-[16px] border-0 bg-white/15 px-3 py-3 font-poppins text-sm font-semibold uppercase tracking-wide text-white shadow-none hover:bg-white/25 hover:text-white focus-visible:ring-0"
            >
              {t("common.cancel")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
