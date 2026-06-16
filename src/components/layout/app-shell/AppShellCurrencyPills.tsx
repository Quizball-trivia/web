'use client';

/* eslint-disable @next/next/no-img-element -- Small navbar currency icons are static decorative assets. */

/**
 * The Coins + Tickets pair that links to /store. Desktop and mobile
 * differ only in icon sizing and pill padding, so we expose a
 * `variant` prop instead of duplicating the markup in two layout
 * files.
 */

import Image from 'next/image';
import Link from 'next/link';

interface AppShellCurrencyPillsProps {
  variant: 'desktop' | 'mobile';
  coins: number;
  tickets: number;
}

export function AppShellCurrencyPills({ variant, coins, tickets }: AppShellCurrencyPillsProps) {
  if (variant === 'desktop') {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/store"
          className="flex w-max items-center gap-1 pl-1.5 pr-3.5 py-1 rounded-full bg-brand-yellow hover:bg-brand-yellow-deep transition-all active:scale-95"
        >
          <Image src="/assets/coin-1.png" alt="Coins" width={24} height={24} className="size-6 shrink-0" />
          <span className="text-sm font-black text-black tabular-nums whitespace-nowrap">{coins.toLocaleString()}</span>
        </Link>
        <Link
          href="/store"
          className="flex items-center gap-1.5 pl-2 pr-3.5 py-1 rounded-full bg-brand-green-light hover:bg-brand-green-light transition-all active:scale-95"
        >
          <Image src="/assets/ticket-1.png" alt="Tickets" width={20} height={20} className="size-5" />
          <span className="text-sm font-black text-white">{tickets}</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/store"
        className="flex h-8 w-max min-w-[72px] shrink-0 items-center gap-1.5 rounded-full bg-brand-yellow pl-1 pr-3 transition-colors hover:bg-brand-yellow-deep active:scale-95"
      >
        <span className="flex size-6 shrink-0 items-center justify-center">
          <img src="/assets/coin-1.png" alt="Coins" className="size-6 object-contain" />
        </span>
        <span className="text-sm font-black text-black tabular-nums whitespace-nowrap">{coins.toLocaleString()}</span>
      </Link>

      <Link
        href="/store"
        className="flex h-8 min-w-[72px] items-center gap-1.5 rounded-full bg-brand-green-light pl-1 pr-3 transition-colors hover:bg-brand-green-light active:scale-95"
      >
        <span className="flex size-6 shrink-0 items-center justify-center">
          <img src="/assets/ticket-1.png" alt="Tickets" className="size-5 object-contain" />
        </span>
        <span className="text-sm font-black text-white tabular-nums">{tickets}</span>
      </Link>
    </>
  );
}
