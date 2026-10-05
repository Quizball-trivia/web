'use client';

// Dev preview: Weekend League prize card, podium frames and the wardrobe
// Frames tab, in every app language at phone and desktop widths. Static
// fixtures only — nothing here reads or writes an account.

import { useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { WlPrizeCard } from '@/features/weekend-league/components/WlPrizeCard';
import { WlFrameAvatar, type WlFramePlace } from '@/features/weekend-league/rewards/WlFrame';
import { AvatarPicker } from '@/features/profile/components/AvatarPicker';
import { RankFrameCard } from '@/features/profile/components/RankFrameCard';
import type { Locale } from '@/lib/i18n/messages';
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

/** The real wardrobe, as a player who won 1st place (frames tab open). */
function WardrobeAsWinner() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-brand-purple px-4 py-2 font-poppins text-xs font-black uppercase text-black">
        Open wardrobe as 1st-place winner
      </button>
      <AvatarPicker open={open} onOpenChange={setOpen} onSelect={() => setOpen(false)}
        currentCustomization={{ ...look(1), frame: 'frame_wl_champion' }}
        localPreview={{ ownedPartIds: ['jersey_wl_retro_home', 'frame_wl_champion'], onPurchase: () => {} }} />
    </>
  );
}

/** The real profile card and a friends-list row, frame equipped. */
function ProfileMock() {
  return (
    <div className="flex w-full max-w-[400px] items-start gap-4">
      <RankFrameCard tier="Captain" tierLabel="Captain" rpLabel="2140RP" caption="Current" rewardFrame
        customization={{ ...look(1), frame: 'frame_wl_champion' }} className="w-[140px]" />
      <div className="flex flex-1 items-center gap-3 rounded-2xl bg-surface-card px-3 py-2">
        <WlFrameAvatar place={1} customization={look(1)} size="xs" />
        <div className="flex-1 font-poppins text-sm font-bold text-white">BOBBIGOL</div>
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
        <div data-variant="equip"><WardrobeAsWinner /></div>
      </Section>

      <Section id="profile" title="How others see it">
        <div data-variant="profile"><ProfileMock /></div>
      </Section>
    </main>
  );
}
