'use client';

// Dev preview: Weekend League prize card, podium frames and the wardrobe
// Frames tab, in every app language at phone and desktop widths. Static
// fixtures only — nothing here reads or writes an account.

import { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { WlPrizeCard } from '@/features/weekend-league/components/WlPrizeCard';
import { WlFrameArt, WlFrameAvatar, type WlFramePlace } from '@/features/weekend-league/rewards/WlFrame';
import type { Locale, MessageKey } from '@/lib/i18n/messages';
import type { AvatarCustomization } from '@/types/game';

const KIT_FOR: Record<WlFramePlace, string> = { 1: 'jersey_wl_retro_home', 2: 'jersey_wl_retro_away', 3: 'jersey_wl_retro_training' };
const look = (place: WlFramePlace): AvatarCustomization =>
  ({ skin: 'skin_male_white', jersey: KIT_FOR[place], hair: 'hair_boy_basic' }) as AvatarCustomization;
const PLACES: WlFramePlace[] = [1, 2, 3];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section data-section={id} className="mb-10">
      <h2 className="mb-3 font-poppins text-sm font-black uppercase tracking-wide text-white/60">{title}</h2>
      {children}
    </section>
  );
}

/** The wardrobe's Frames tab as a winner of 1st place would see it. */
function FramesTab() {
  const { t } = useLocale();
  return (
    <div className="w-full max-w-[400px] rounded-[20px] bg-surface-card-deep p-4">
      <div className="mb-3 flex gap-2 font-poppins text-[11px] font-black uppercase">
        {['avatarPicker.tabs.jersey', 'wlRewards.framesTab'].map((key, i) => (
          <span key={key} className={`rounded-full px-3 py-1.5 ${i === 1 ? 'bg-brand-purple text-white' : 'bg-white/8 text-white/60'}`}>
            {i === 0 ? 'Kit' : t(key as MessageKey)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-white/10 bg-surface-card py-3">
          <div className="flex h-[96px] items-center font-poppins text-[11px] font-black uppercase text-white/50">—</div>
          <span className="font-poppins text-[10px] font-black uppercase text-white/60">None</span>
        </div>
        {PLACES.map((place) => {
          const owned = place === 1;
          return (
            <div key={place}
              className="relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-surface-card px-1 py-3"
              style={{ borderColor: owned ? '#BA02E8' : 'rgba(255,255,255,0.1)' }}>
              {owned && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-gold px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-black">
                  {t('wlRewards.eyebrow')}
                </span>
              )}
              <div className={`relative ${owned ? '' : 'opacity-35 grayscale'}`}><WlFrameArt place={place} width={60} /></div>
              {owned ? (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand-purple"><Check className="size-3 text-white" strokeWidth={3} /></span>
              ) : (
                <Lock className="absolute top-[52px] size-5 text-white/70" />
              )}
              <span className={`text-center font-poppins text-[10px] font-black uppercase leading-tight ${owned ? 'text-brand-gold' : 'text-white/50'}`}>
                {t(`wlRewards.frameName${place}` as MessageKey)}
              </span>
              {!owned && <span className="text-center font-poppins text-[9px] leading-tight text-white/40">{t(`wlRewards.frameUnlock${place}` as MessageKey)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** How others see an equipped frame: the profile header and a friends-list row. */
function ProfileMock() {
  return (
    <div className="w-full max-w-[400px] space-y-3">
      <div className="flex items-center gap-4 rounded-[20px] bg-surface-card p-4">
        <WlFrameAvatar place={1} customization={look(1)} size="lg" />
        <div>
          <div className="font-poppins text-xl font-black text-white">BOBBIGOL</div>
          <div className="font-poppins text-xs font-semibold text-white/55">Captain · 2,140 RP</div>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-surface-card px-3 py-2">
        <WlFrameAvatar place={1} customization={look(1)} size="sm" />
        <div className="flex-1 font-poppins text-sm font-bold text-white">BOBBIGOL</div>
        <span className="font-poppins text-xs text-brand-green">Online</span>
      </div>
    </div>
  );
}

export default function WlPrizeCardPage() {
  const { locale, setLocale } = useLocale();
  const [width, setWidth] = useState<'phone' | 'desktop'>('phone');
  const card = width === 'phone' ? 'w-full max-w-[400px]' : 'w-[640px]';

  if (process.env.NODE_ENV !== 'development') {
    return <div className="flex min-h-dvh items-center justify-center bg-surface-deep font-poppins text-white">Dev only</div>;
  }
  return (
    <main className="min-h-screen bg-surface-page px-4 py-6 text-white">
      <div className="mb-6 flex flex-wrap items-center gap-2 font-poppins text-xs font-bold">
        {(['en', 'ka', 'es', 'tr'] as Locale[]).map((l) => (
          <button key={l} type="button" onClick={() => setLocale(l)}
            className={`rounded-full px-3 py-1.5 uppercase ${locale === l ? 'bg-brand-gold text-black' : 'bg-white/10'}`}>{l}</button>
        ))}
        <span className="mx-2 h-5 w-px bg-white/20" />
        {(['phone', 'desktop'] as const).map((w) => (
          <button key={w} type="button" onClick={() => setWidth(w)}
            className={`rounded-full px-3 py-1.5 ${width === w ? 'bg-brand-blue' : 'bg-white/10'}`}>{w}</button>
        ))}
      </div>

      <Section id="card" title="Prize card">
        <div className="flex flex-wrap items-start gap-6">
          {[
            { id: 'c2-blue', label: 'On the blue promo card', bg: 'bg-brand-blue', node: <WlPrizeCard surface="blue" /> },
            { id: 'c2-gold', label: 'On the gold header (entered)', bg: 'bg-brand-yellow', node: <WlPrizeCard surface="gold" /> },
            { id: 'c2-dark', label: 'On the page after the qualifier, as 2nd', bg: 'bg-surface-page', node: <WlPrizeCard surface="dark" highlightRank={2} /> },
          ].map((v) => (
            <div key={v.id} data-variant={v.id} className={card}>
              <div className="mb-2 font-poppins text-sm font-black text-white/70">{v.label}</div>
              <div className={`rounded-[24px] p-5 ${v.bg}`}>{v.node}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="frames" title="Podium frames">
        <div data-variant="frames" className="flex flex-wrap items-end gap-5">
          {PLACES.map((place) => <WlFrameAvatar key={place} place={place} customization={look(place)} size="xl" />)}
        </div>
        <div data-variant="frames-small" className="mt-5 flex flex-wrap items-end gap-4">
          {PLACES.map((place) => <WlFrameAvatar key={place} place={place} customization={look(place)} size="md" />)}
          {PLACES.map((place) => <WlFrameAvatar key={`s${place}`} place={place} customization={look(place)} size="sm" />)}
        </div>
      </Section>

      <Section id="equip" title="Wardrobe · Frames tab">
        <div data-variant="equip"><FramesTab /></div>
      </Section>

      <Section id="profile" title="How others see it">
        <div data-variant="profile"><ProfileMock /></div>
      </Section>
    </main>
  );
}
