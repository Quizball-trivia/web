'use client';

/** Shell layout: Betsson-style chrome around the Table Derby screens.
 *  Phones get a compact header + bottom tab bar; desktop gets a top bar
 *  with the same sections and no bottom tabs. */

import type { ReactNode } from 'react';
import { TicketGlyph } from '../components/brand';
import { MyAvatar } from '../components/Avatar';
import { TD } from '../lib/copy';
import { type ShellTab, TabBar, TopBar } from './nav';
import { AvatarRing, Pill } from './ui';

function ProfileCluster({
  name,
  points,
  tickets,
  onClick,
}: {
  name: string;
  points: number;
  tickets: number | null;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2.5 text-right" aria-label={TD.tabProfile}>
      <span className="flex flex-col items-end gap-1">
        <span className="bs-text text-[13px] font-bold text-[var(--bs-text)]">{name}</span>
        <span className="flex items-center gap-1">
          <Pill tone="orange">
            {points} {TD.qpShort}
          </Pill>
          <Pill>
            <TicketGlyph size={12} color="var(--bs-primary)" />
            {tickets ?? '·'}
          </Pill>
        </span>
      </span>
      <AvatarRing size={40}>
        <MyAvatar size={40} />
      </AvatarRing>
    </button>
  );
}

export function Shell({
  tab,
  onTab,
  name,
  points,
  tickets,
  children,
}: {
  tab: ShellTab;
  onTab: (t: ShellTab) => void;
  name: string;
  points: number;
  tickets: number | null;
  children: ReactNode;
}) {
  const logo = (
    // eslint-disable-next-line @next/next/no-img-element -- local brand SVG
    <img src="/assets/table-derby/logo-paper.svg" alt={TD.title} className="h-[52px] w-auto md:h-[40px]" />
  );
  const profile = <ProfileCluster name={name} points={points} tickets={tickets} onClick={() => onTab('profile')} />;
  return (
    <div className="relative z-10 flex min-h-dvh flex-col" style={{ background: 'var(--bs-page)' }}>
      <TopBar tab={tab} onTab={onTab} logo={logo} profile={profile} />
      <header className="flex items-center justify-between px-4 pb-1 pt-3 md:hidden">
        <button type="button" onClick={() => onTab('home')} aria-label={TD.tabHome}>
          {logo}
        </button>
        {profile}
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-28 pt-3 md:max-w-3xl md:gap-5 md:px-6 md:pb-12 md:pt-8">
        {children}
      </main>
      <TabBar tab={tab} onTab={onTab} />
    </div>
  );
}
