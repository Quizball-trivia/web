'use client';

import { useState } from 'react';
import { BookOpen, FileText, ListChecks, Lock, Moon, Pencil, Smartphone, Volume2, X } from 'lucide-react';
import { AvatarPreview } from '@/components/AvatarPreview';
import { getClub } from '@/lib/clubs';
import { MyAvatar, TD_AVATAR_COLORS, tdAvatarCustomization } from '../components/Avatar';
import { TdClubSelect } from '../components/ClubSelect';
import { TD } from '../lib/copy';
import type { TdAvatarColor } from '../lib/state';
import { AvatarRing, BsButton, BsDialog, BsGroup, BsRow, BsToggle, GroupLabel, SectionTitle } from './ui';

export function ProfileScreen({
  name,
  points,
  rank,
  tickets,
  favClub,
  onFavClub,
  onAvatar,
  onResetTickets,
  onReplayOnboarding,
}: {
  name: string;
  points: number;
  rank: number;
  tickets: number | null;
  favClub: string | null;
  onFavClub: (v: string | null) => void;
  onAvatar: (c: TdAvatarColor) => void;
  onResetTickets: () => void;
  onReplayOnboarding: () => void;
}) {
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(false);
  const [dark, setDark] = useState(true); // placeholder until the host passes its theme
  const [avatarPicker, setAvatarPicker] = useState(false);
  const [clubPicker, setClubPicker] = useState(false);
  const club = getClub(favClub);

  return (
    <>
      <SectionTitle>{TD.profileTitle}</SectionTitle>
      {/* hero card — Betsson's profile band with the show mural behind */}
      <div
        className="relative flex items-center gap-4 overflow-hidden rounded-[14px] p-4"
        style={{ background: 'var(--bs-surface)' }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{ backgroundImage: 'url(/assets/table-derby/bg-mural-dark.png)', backgroundSize: '520px auto', backgroundPosition: 'right center' }}
        />
        <div aria-hidden className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(13,14,15,0.92), rgba(13,14,15,0.6))' }} />
        <button type="button" onClick={() => setAvatarPicker(true)} className="relative" aria-label={TD.chooseAvatar}>
          <AvatarRing size={64}>
            <MyAvatar size={64} />
          </AvatarRing>
        </button>
        <div className="relative flex min-w-0 flex-1 flex-col">
          <span className="bs-display text-[18px] text-[var(--bs-text)]">{name}</span>
          <span className="bs-text text-[11.5px] text-[var(--bs-text-2)]">
            {points} {TD.qpShort} · #{rank} · {tickets ?? '·'} {TD.tickets.toLowerCase()}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAvatarPicker(true)}
          className="relative flex size-10 items-center justify-center rounded-full bg-black text-white"
          aria-label={TD.chooseAvatar}
        >
          <Pencil size={16} />
        </button>
      </div>

      <SectionTitle>{TD.profileFavClub}</SectionTitle>
      <div className="flex items-start gap-4">
        <button type="button" onClick={() => setClubPicker(true)} className="flex w-16 flex-col items-center gap-1.5">
          <span
            className="flex size-14 items-center justify-center rounded-full text-white"
            style={{ background: 'var(--bs-surface)', boxShadow: '0 0 0 1.5px var(--bs-toggle-off)' }}
          >
            +
          </span>
          <span className="bs-text text-center text-[10.5px] leading-tight text-[var(--bs-text-2)]">{TD.profileChangeClub}</span>
        </button>
        {club && (
          <div className="relative flex w-16 flex-col items-center gap-1.5">
            <span
              className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-white"
              style={{ boxShadow: '0 0 0 2px var(--bs-page), 0 0 0 4px var(--bs-primary)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- club crest */}
              <img src={club.logo} alt="" className="size-10 object-contain" />
            </span>
            <button
              type="button"
              onClick={() => onFavClub(null)}
              className="absolute -top-1 right-1 flex size-[18px] items-center justify-center rounded-full text-white"
              style={{ background: 'var(--bs-primary)', border: '2px solid var(--bs-page)' }}
              aria-label={TD.close}
            >
              <X size={10} strokeWidth={3} />
            </button>
            <span className="bs-text line-clamp-2 text-center text-[10.5px] leading-tight text-[var(--bs-text-2)]">{club.label}</span>
          </div>
        )}
      </div>

      <GroupLabel>{TD.profileSettings}</GroupLabel>
      <BsGroup>
        <BsRow icon={<Volume2 size={20} />} label={TD.settingSound} trailing={<BsToggle on={sound} onChange={setSound} label={TD.settingSound} />} />
        <BsRow icon={<Smartphone size={20} />} label={TD.settingVibration} trailing={<BsToggle on={vibration} onChange={setVibration} label={TD.settingVibration} />} />
        <BsRow icon={<Moon size={20} />} label={TD.settingDark} trailing={<BsToggle on={dark} onChange={setDark} label={TD.settingDark} />} />
        <BsRow icon={<ListChecks size={20} />} label={TD.profileMatches} onClick={() => {}} />
        <BsRow icon={<BookOpen size={20} />} label={TD.profileRules} onClick={() => {}} />
      </BsGroup>

      <GroupLabel>{TD.profileBetsson}</GroupLabel>
      <BsGroup>
        <BsRow icon={<Lock size={20} />} label={TD.profilePrivacy} onClick={() => {}} />
        <BsRow icon={<FileText size={20} />} label={TD.profileTerms} onClick={() => {}} />
      </BsGroup>

      {process.env.NODE_ENV !== 'production' && (
        <>
          <GroupLabel>{TD.devTools}</GroupLabel>
          <BsGroup>
            <BsRow label={TD.devResetTickets} onClick={onResetTickets} chevron={false} />
            <BsRow label={TD.devReplayOnboarding} onClick={onReplayOnboarding} chevron={false} />
          </BsGroup>
        </>
      )}

      <BsButton variant="danger" onClick={() => {}} className="mt-2">
        {TD.logout}
      </BsButton>

      {avatarPicker && (
        <BsDialog title={TD.chooseAvatar} onClose={() => setAvatarPicker(false)} className="max-w-[300px]">
          <p className="bs-display mb-5 text-center text-[15px] text-[var(--bs-text)]">{TD.chooseAvatar}</p>
          <div className="grid grid-cols-3 gap-4">
            {TD_AVATAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                onClick={() => {
                  onAvatar(color);
                  setAvatarPicker(false);
                }}
                className="flex size-16 items-center justify-center overflow-hidden rounded-full"
                style={{ background: 'var(--bs-page)' }}
              >
                <AvatarPreview customization={tdAvatarCustomization(color)} width={48} className="translate-y-[6%]" />
              </button>
            ))}
          </div>
        </BsDialog>
      )}
      {clubPicker && (
        <BsDialog title={TD.onbClubTitle} onClose={() => setClubPicker(false)}>
          <p className="bs-display mb-4 text-center text-[15px] text-[var(--bs-text)]">{TD.onbClubTitle}</p>
          <TdClubSelect
            value={favClub ?? ''}
            onChange={(v) => {
              onFavClub(v || null);
              setClubPicker(false);
            }}
          />
        </BsDialog>
      )}
    </>
  );
}
