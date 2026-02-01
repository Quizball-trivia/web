import React from 'react';
import { ArrowLeft, Globe, Volume2, Bell, Shield, HelpCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { LanguageSelector } from './LanguageSelector';
import { useLocale } from './LocaleContext';
import { storage, STORAGE_KEYS } from '@/utils/storage';

interface SettingsScreenProps {
  onBack: () => void;
  onReplayTutorial?: () => void;
}

export function SettingsScreen({ onBack, onReplayTutorial }: SettingsScreenProps) {
  const { locale } = useLocale();
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [vibrationEnabled, setVibrationEnabled] = React.useState(true);

  const labels = {
    en: {
      settings: 'Settings',
      language: 'Language',
      sound: 'Sound & Audio',
      soundEffects: 'Sound Effects',
      soundDesc: 'Enable sound effects during gameplay',
      music: 'Background Music',
      musicDesc: 'Play background music',
      notifications: 'Notifications',
      pushNotifications: 'Push Notifications',
      pushDesc: 'Receive notifications for challenges and events',
      dailyReminders: 'Daily Reminders',
      dailyDesc: 'Get reminded to complete daily challenges',
      gameplay: 'Gameplay',
      vibration: 'Vibration',
      vibrationDesc: 'Haptic feedback during gameplay',
      autoplay: 'Auto-play Next',
      autoplayDesc: 'Automatically start next question',
      privacy: 'Privacy & Data',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      about: 'About quizball',
      version: 'Version 1.0.0',
      resetOnboarding: 'Reset Onboarding',
      resetOnboardingDesc: 'Clear onboarding progress and start fresh',
      replayTutorial: 'Replay Tutorial',
      replayTutorialDesc: 'Show the tutorial guide again',
    },
    ka: {
      settings: 'პარამეტრები',
      language: 'ენა',
      sound: 'ხმა და აუდიო',
      soundEffects: 'ხმოვანი ეფექტები',
      soundDesc: 'ჩართე ხმოვანი ეფექტები თამაშის დროს',
      music: 'ფონური მუსიკა',
      musicDesc: 'დაუკარი ფონური მუსიკა',
      notifications: 'შეტყობინებები',
      pushNotifications: 'პუშ შეტყობინებები',
      pushDesc: 'მიიღე შეტყობინებები გამოწვევებისა და მოვლენებისთვის',
      dailyReminders: 'ყოველდღიური შეხსენებები',
      dailyDesc: 'მიიღე შეხსენება ყოველდღიური გამოწვევების შესასრულებლად',
      gameplay: 'თამაში',
      vibration: 'ვიბრაცია',
      vibrationDesc: 'ჰაპტიკური უკუკავშირი თამაშის დროს',
      autoplay: 'ავტომატური გაგრძელება',
      autoplayDesc: 'ავტომატურად დაიწყოს შემდეგი კითხვა',
      privacy: 'კონფიდენციალურობა და მონაცემები',
      privacyPolicy: 'კონფიდენციალურობის პოლიტიკა',
      termsOfService: 'მომსახურების პირობები',
      about: 'ნოუბოლის შესახებ',
      version: 'ვერსია 1.0.0',
      resetOnboarding: 'ონბორდინგის გადატვირთვა',
      resetOnboardingDesc: 'გაასუფთავე ონბორდინგის პროგრესი და დაიწყე თავიდან',
      replayTutorial: 'ტუტორიალის გადახედვა',
      replayTutorialDesc: 'ხელახლა ნახე ტუტორიალის გზამკვლევი',
    },
  };

  const t = labels[locale];

  const handleResetOnboarding = () => {
    storage.remove(STORAGE_KEYS.ONBOARDING_COMPLETE);
    storage.remove(STORAGE_KEYS.WALKTHROUGH_COMPLETE);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center justify-center size-9 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-lg">{t.settings}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Language Section */}
        <LanguageSelector />

        {/* Sound & Audio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Volume2 className="size-5 text-primary" />
              {t.sound}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm">{t.soundEffects}</div>
                <div className="text-xs text-muted-foreground">{t.soundDesc}</div>
              </div>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm">{t.music}</div>
                <div className="text-xs text-muted-foreground">{t.musicDesc}</div>
              </div>
              <Switch defaultChecked={false} />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="size-5 text-primary" />
              {t.notifications}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm">{t.pushNotifications}</div>
                <div className="text-xs text-muted-foreground">{t.pushDesc}</div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm">{t.dailyReminders}</div>
                <div className="text-xs text-muted-foreground">{t.dailyDesc}</div>
              </div>
              <Switch defaultChecked={true} />
            </div>
          </CardContent>
        </Card>

        {/* Gameplay */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="size-5 text-primary" />
              {t.gameplay}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm">{t.vibration}</div>
                <div className="text-xs text-muted-foreground">{t.vibrationDesc}</div>
              </div>
              <Switch
                checked={vibrationEnabled}
                onCheckedChange={setVibrationEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm">{t.autoplay}</div>
                <div className="text-xs text-muted-foreground">{t.autoplayDesc}</div>
              </div>
              <Switch defaultChecked={false} />
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="size-5 text-primary" />
              {t.privacy}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="ghost" className="w-full justify-start h-auto py-3">
              <div className="text-left">
                <div className="text-sm">{t.privacyPolicy}</div>
              </div>
            </Button>
            <Button variant="ghost" className="w-full justify-start h-auto py-3">
              <div className="text-left">
                <div className="text-sm">{t.termsOfService}</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="size-5 text-primary" />
              {t.about}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-2">
              <div className="text-4xl mb-2">⚽</div>
              <div className="text-sm mb-1">quizball</div>
              <div className="text-xs text-muted-foreground">{t.version}</div>
            </div>
          </CardContent>
        </Card>

        {/* Reset Onboarding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RotateCcw className="size-5 text-primary" />
              {t.resetOnboarding}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {onReplayTutorial && (
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-3"
                onClick={onReplayTutorial}
              >
                <div className="text-left">
                  <div className="text-sm font-medium">{t.replayTutorial}</div>
                  <div className="text-xs text-muted-foreground">{t.replayTutorialDesc}</div>
                </div>
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-3"
              onClick={handleResetOnboarding}
            >
              <div className="text-left">
                <div className="text-sm">{t.resetOnboardingDesc}</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}