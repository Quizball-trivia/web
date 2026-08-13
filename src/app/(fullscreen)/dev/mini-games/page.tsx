'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Disc3, Ticket, Goal, Trophy, ChevronRight,
  Link2, Layers, IdCard, TrendingUp, Rocket, Radio, BarChart3,
} from 'lucide-react';

const ARCADE = [
  { href: '/dev/mini-games/squad-spin', title: 'Squad Spin', blurb: '3–5 reels — club, position, nation (+era, +trophy). Name a player who fits. Rarer answers pay more.', icon: Disc3, color: '#FFE500' },
  { href: '/dev/mini-games/trivia-spin', title: 'Trivia Spin', blurb: 'Answer to earn spins, then let the weighted wheel decide your payout.', icon: Ticket, color: '#1CB0F6' },
  { href: '/dev/mini-games/penalty-shootout', title: 'Penalty Shootout', blurb: 'Answer to earn a shot, pick your corner vs the keeper. Five rounds vs the AI.', icon: Goal, color: '#58CC02' },
  { href: '/dev/mini-games/daily-jackpot', title: 'Daily Jackpot', blurb: 'One hard question a day. A pot that climbs and rolls over until someone cracks it.', icon: Trophy, color: '#FFD700' },
  { href: '/dev/mini-games/pass-chain', title: 'Pass Chain', blurb: 'Link two players through shared clubs, naming each intermediate. Fewer links score higher.', icon: Link2, color: '#1CB0F6' },
];

const BETTING = [
  { href: '/dev/mini-games/accumulator', title: 'Accumulator', blurb: 'Pick 5 legs, one stake, all must land. Odds multiply — cash out at leg four.', icon: Layers, color: '#58CC02' },
  { href: '/dev/mini-games/squad-collection', title: 'Squad Collection', blurb: 'Answer to pull player cards. Fill a formation; complete the XI to redeem. Pack-opening reveal.', icon: IdCard, color: '#CE82FF' },
  { href: '/dev/mini-games/cash-out-ladder', title: 'Cash Out Ladder', blurb: '1x→32x. Bank or climb after each answer. Wrong wipes it — then see how far it would’ve gone.', icon: TrendingUp, color: '#FF9600' },
  { href: '/dev/mini-games/bet-slip-booster', title: 'Bet Slip Booster', blurb: 'A 3-leg slip. Answer club questions to boost each leg’s odds, base → boosted.', icon: Rocket, color: '#FFD700' },
  { href: '/dev/mini-games/half-time-trivia', title: 'Half-Time Trivia', blurb: 'A live match at HT — a 60-second quiz sits inline above the markets. Win a 2nd-half free bet.', icon: Radio, color: '#FF4B4B' },
  { href: '/dev/mini-games/odds-board', title: 'Odds Board', blurb: 'Every answer is priced like a market. Stake points on your call — obvious pays 1.2x, contrarian 6x.', icon: BarChart3, color: '#1CB0F6' },
];

function GameCard({ g, i }: { g: (typeof ARCADE)[number]; i: number }) {
  const Icon = g.icon;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
      <Link href={g.href} className="group flex items-center gap-4 rounded-2xl border-2 border-white/[0.08] bg-surface-card/50 p-4 transition-colors hover:border-white/20">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${g.color}22`, color: g.color }}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-poppins text-lg font-black uppercase leading-tight" style={{ color: g.color }}>{g.title}</div>
          <p className="mt-0.5 font-poppins text-xs font-semibold leading-snug text-white/50">{g.blurb}</p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

export default function MiniGamesHub() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-surface-page text-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-40 blur-3xl" style={{ background: 'radial-gradient(60% 100% at 50% 0%, #1CB0F633, transparent 70%)' }} />
      <main className="relative z-10 mx-auto w-full max-w-lg px-4 py-8 sm:px-6">
        <div className="mb-1 font-poppins text-[11px] font-black uppercase tracking-[0.24em] text-brand-cyan">Prototype</div>
        <h1 className="font-poppins text-3xl font-black uppercase tracking-wide text-white">Mini-games</h1>
        <p className="mt-1 font-poppins text-sm font-semibold text-white/45">Daily challenges to test. Placement in the app is TBD.</p>

        <h2 className="mb-2 mt-7 font-poppins text-xs font-black uppercase tracking-[0.18em] text-white/40">Arcade</h2>
        <div className="space-y-3">
          {ARCADE.map((g, i) => <GameCard key={g.href} g={g} i={i} />)}
        </div>

        <h2 className="mb-2 mt-7 font-poppins text-xs font-black uppercase tracking-[0.18em] text-white/40">Bet-native</h2>
        <div className="space-y-3">
          {BETTING.map((g, i) => <GameCard key={g.href} g={g} i={i} />)}
        </div>
      </main>
    </div>
  );
}
