'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import AppAuthGate from '@/components/auth/AppAuthGate';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/stores/auth.store';
import { useLocale } from '@/contexts/LocaleContext';
import { normalizeFriendInviteCode } from '@/lib/friend/inviteCode';
import { inviteEnvironment, mobileInviteUrl, QUIZBALL_APP_STORE_URL } from '@/lib/friend/mobileInvite';
import { FriendLobbyScreen } from './FriendLobbyScreen';
import { parseFriendLobbyInviteSource } from '../hooks/useFriendLobbyLogic';
import { inviteLandingCopy } from '../inviteLandingCopy';

export function FriendInviteEntry() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const { locale, t } = useLocale();
  const status = useAuthStore(state => state.status);
  const [playOnWeb, setPlayOnWeb] = useState(false);
  const raw = params.code?.trim() ?? '';
  const isHost = raw.toLowerCase() === 'new';
  const code = isHost ? 'new' : normalizeFriendInviteCode(raw);
  const copy = inviteLandingCopy[locale] ?? inviteLandingCopy.en;

  if (!code) return <main className="min-h-dvh grid place-items-center p-6"><p role="alert">{t('inviteCode.invalid')}</p></main>;
  if (isHost || playOnWeb || status === 'authenticated' || status === 'banned') {
    return <AppAuthGate><AppShell><FriendLobbyScreen roomCode={code} isHost={isHost}
      inviteSource={parseFriendLobbyInviteSource(search.get('source'))} /></AppShell></AppAuthGate>;
  }

  return <main className="min-h-dvh flex items-center justify-center bg-surface-deep px-5 py-12">
    <section className="w-full max-w-lg rounded-[32px] bg-brand-blue p-7 sm:p-10 text-white shadow-2xl">
      <p className="text-sm font-black tracking-[0.18em] text-brand-yellow">QUIZBALL</p>
      <h1 className="mt-8 text-4xl sm:text-5xl font-black leading-tight">{copy.title}</h1>
      <p className="mt-4 text-lg text-white/80">{copy.subtitle}</p>
      <div className="my-8 rounded-2xl border border-white/25 p-5">
        <p className="text-xs font-bold tracking-widest text-white/70">{copy.code}</p>
        <p className="mt-2 break-all text-4xl font-black tracking-[0.12em] select-all">{code}</p>
      </div>
      <a href={mobileInviteUrl(code)!} className="flex min-h-14 items-center justify-center rounded-2xl bg-brand-yellow px-5 py-4 text-center font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-4">{copy.open}</a>
      {inviteEnvironment() === 'production'
        ? <a href={QUIZBALL_APP_STORE_URL} className="mt-3 flex min-h-14 items-center justify-center rounded-2xl bg-black px-5 py-4 text-center font-bold">{copy.store}</a>
        : <p className="mt-4 text-sm text-white/80">{copy.staging}</p>}
      <button type="button" onClick={() => setPlayOnWeb(true)} className="mt-4 w-full min-h-12 rounded-2xl border border-white/40 px-5 py-3 font-semibold">{copy.web}</button>
      <p className="mt-6 text-sm leading-relaxed text-white/80">{copy.hint}</p>
      <p className="mt-3 text-xs leading-relaxed text-white/65">{copy.embedded}</p>
      <Link href="/" className="mt-6 inline-block text-sm underline underline-offset-4">Quizball</Link>
    </section>
  </main>;
}
