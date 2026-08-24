'use client';

import { useEffect } from 'react';
import { AudioLines, Music2, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { setUserPreferences, useUserPreferences } from '@/lib/preferences/userPreferences';
import { isMuted, setMuted } from '@/lib/sounds/gameSounds';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/components/ui/utils';

interface AudioPreferenceRowProps {
  checked: boolean;
  description: string;
  icon: typeof Music2;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}

function AudioPreferenceRow({ checked, description, icon: Icon, label, onCheckedChange }: AudioPreferenceRowProps) {
  const { t } = useLocale();
  const status = checked ? t('auctionGame.audioOn') : t('auctionGame.audioOff');

  return (
    <div
      className={cn(
        'flex min-h-16 items-center gap-3 rounded-[14px] border px-3 py-2.5 transition-colors',
        checked ? 'border-white/20 bg-white/10' : 'border-white/10 bg-black/15',
      )}
    >
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
          checked ? 'bg-brand-yellow text-surface-page' : 'bg-black/25 text-white/45',
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 font-poppins">
        <div className="text-[13px] font-black leading-4 text-white">{label}</div>
        <div className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-4 text-white/55">{description}</div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-label={`${label}: ${status}`}
          className="h-7 w-12 border-2 border-white/15 bg-black/30 data-[state=checked]:bg-brand-yellow"
        />
        <span
          className={cn(
            'font-poppins text-[9px] font-black uppercase tracking-[0.14em]',
            checked ? 'text-brand-yellow' : 'text-white/35',
          )}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

/**
 * Compact in-match audio controls. Mobile uses a split HUD (leave on the left,
 * audio on the right) so the controls never crowd the auction ribbon. Desktop
 * keeps the familiar side-by-side controls on the left.
 */
export function AuctionAudioControl() {
  const { t } = useLocale();
  const { soundEnabled, musicEnabled } = useUserPreferences();
  const enabledCount = Number(soundEnabled) + Number(musicEnabled);
  const TriggerIcon = enabledCount === 0 ? VolumeX : enabledCount === 1 ? Volume1 : Volume2;

  // Older screens used one global mute flag. Preferences are now the source of
  // truth in Auction, so clear a stale legacy mute whenever either channel is
  // enabled. Disabling both remains scoped to Auction and does not unexpectedly
  // mute the rest of the app.
  useEffect(() => {
    if ((soundEnabled || musicEnabled) && isMuted()) {
      setMuted(false, { resumeBgm: musicEnabled });
    }
  }, [musicEnabled, soundEnabled]);

  const updatePreference = (key: 'soundEnabled' | 'musicEnabled', checked: boolean) => {
    const nextMusicEnabled = key === 'musicEnabled' ? checked : musicEnabled;
    if (checked && isMuted()) setMuted(false, { resumeBgm: nextMusicEnabled });
    setUserPreferences({ [key]: checked });
  };

  return (
    <div
      data-testid="auction-audio-control"
      className="fixed right-[calc(env(safe-area-inset-right)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[60] sm:left-[calc(env(safe-area-inset-left)+3.75rem)] sm:right-auto sm:top-[calc(env(safe-area-inset-top)+0.75rem)]"
    >
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t('auctionGame.audioControls')}
            className="group flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-brand-yellow/60 hover:bg-black/65 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow data-[state=open]:border-brand-yellow data-[state=open]:bg-brand-yellow data-[state=open]:text-surface-page"
          >
            <TriggerIcon className="size-5" aria-hidden="true" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[75] w-[min(18rem,calc(100vw-1.5rem))] rounded-[18px] border-white/15 bg-brand-blue p-3 text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        >
          <div className="mb-3 px-1 font-poppins">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-brand-yellow">
              {t('auctionGame.audioControls')}
            </div>
            <div className="mt-1 text-xs font-semibold leading-4 text-white/60">
              {t('auctionGame.audioControlsDescription')}
            </div>
          </div>

          <div className="space-y-2">
            <AudioPreferenceRow
              checked={musicEnabled}
              description={t('auctionGame.backgroundMusicDescription')}
              icon={Music2}
              label={t('auctionGame.backgroundMusic')}
              onCheckedChange={(checked) => updatePreference('musicEnabled', checked)}
            />
            <AudioPreferenceRow
              checked={soundEnabled}
              description={t('auctionGame.soundEffectsDescription')}
              icon={AudioLines}
              label={t('auctionGame.soundEffects')}
              onCheckedChange={(checked) => updatePreference('soundEnabled', checked)}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
