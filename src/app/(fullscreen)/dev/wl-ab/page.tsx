'use client';

// A/B test UI lab for the Weekend League acquisition funnel — mock-only,
// reachable without login (/dev/* bypasses AppAuthGate), no analytics, no API.
// Three experiments proposed 2026-08-29 off the banner-funnel numbers:
//   A. QP toast on the ranked results screen (the moment QP is earned)
//   B. Rail copy variants for the not-yet-qualified majority
//   E. Milestone interstitials at 100 QP and 200 QP
// Toggle variants per section; the RIGHT column always shows control.

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Clock3, PartyPopper, Trophy, X } from 'lucide-react';
import { WeekendLeaguePromoCard } from '@/features/weekend-league/components/WeekendLeaguePromoCard';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

type Lang = 'ka' | 'en';

const COPY = {
  labTitle: { ka: 'WL A/B ლაბი', en: 'WL A/B Lab' },
  testA: { ka: 'ტესტი A — QP ტოსტი მატჩის შედეგზე', en: 'Test A — QP toast on ranked results' },
  testB: { ka: 'ტესტი B — ბანერის ტექსტი არაკვალიფიცირებულებისთვის', en: 'Test B — rail copy for unqualified players' },
  testE: { ka: 'ტესტი E — ეტაპის ეკრანები (100 / 200 QP)', en: 'Test E — milestone interstitials (100 / 200 QP)' },
  victory: { ka: 'გამარჯვება!', en: 'Victory!' },
  rpGain: { ka: '+18 RP', en: '+18 RP' },
  coins: { ka: '+120 მონეტა', en: '+120 coins' },
  playAgain: { ka: 'კიდევ თამაში', en: 'Play again' },
  mainMenu: { ka: 'მთავარი მენიუ', en: 'Main menu' },
  toastQp: { ka: '+25 QP', en: '+25 QP' },
  toastLeft: { ka: 'უიქენდის ლიგამდე 97 ქულა', en: '97 QP to Weekend League' },
  control: { ka: 'კონტროლი', en: 'Control' },
  variant: { ka: 'ვარიანტი', en: 'Variant' },
  replay: { ka: 'თავიდან', en: 'Replay' },
  wlTitle: { ka: 'უიქენდის ლიგა', en: 'Weekend League' },
  copyProgress: { ka: '53/200 QP', en: '53/200 QP' },
  copyReward: { ka: 'მოიგე ₾200 — 6 მოგება გაშორებს', en: 'Win ₾200 — 6 wins away' },
  copySocial: { ka: '118 მოთამაშე უკვე დარეგისტრირდა', en: '118 players already registered' },
  labelProgress: { ka: 'პროგრესი (კონტროლი)', en: 'Progress (control)' },
  labelReward: { ka: 'ჯილდო', en: 'Reward' },
  labelSocial: { ka: 'სოციალური', en: 'Social proof' },
  closesIn: { ka: '2d 4h', en: '2d 4h' },
  show100: { ka: '100 QP ეკრანი', en: 'Show 100 QP' },
  show200: { ka: '200 QP ეკრანი', en: 'Show 200 QP' },
  halfway: { ka: 'ნახევარი გზა გავლილია!', en: 'Halfway there!' },
  halfwayBody: {
    ka: '100/200 QP — განაგრძე რეიტინგული თამაში და შაბათს უიქენდის ლიგაში ითამაშებ',
    en: '100/200 QP — keep playing ranked and you’ll be in Saturday’s league',
  },
  qualifiedTitle: { ka: 'შენ კვალიფიცირებული ხარ!', en: 'You’re qualified!' },
  qualifiedBody: {
    ka: '200 QP დაგროვდა — დაიკავე ადგილი შაბათის ტურნირზე. რეგისტრაცია პარასკევს 24:00-მდე',
    en: '200 QP earned — claim your spot for Saturday. Entry closes Friday 24:00',
  },
  register: { ka: 'დარეგისტრირდი', en: 'Register' },
  later: { ka: 'მოგვიანებით', en: 'Later' },
  keepPlaying: { ka: 'განაგრძე თამაში', en: 'Keep playing' },
  hint: {
    ka: 'ყველა ელემენტი მოკი — ღილაკები არსად მიდის',
    en: 'Everything is a mock — buttons go nowhere',
  },
} as const;

function T({ k, lang }: { k: keyof typeof COPY; lang: Lang }) {
  return <>{COPY[k][lang]}</>;
}

/* ── shared chrome ────────────────────────────────────────────────────── */

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-[13px] uppercase tracking-widest text-white/50" style={poppins}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ── Test B: rail copy variants ───────────────────────────────────────── */

function RailMock({ lang, copyKey }: { lang: Lang; copyKey: 'copyProgress' | 'copyReward' | 'copySocial' }) {
  const pct = copyKey === 'copyProgress' ? 27 : copyKey === 'copyReward' ? 27 : 27;
  return (
    <div
      className="group relative block cursor-pointer overflow-hidden rounded-[10px] transition-transform hover:-translate-y-px"
      style={{ backgroundImage: 'linear-gradient(90deg, #101B33 0%, #16264A 60%, #101B33 100%)' }}
    >
      <div className="absolute inset-y-0 left-0 w-[3px] bg-brand-green" />
      <div className="relative z-10 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <h3 className="min-w-0 truncate text-[15px] uppercase italic leading-none text-white" style={poppins}>
            <T k="wlTitle" lang={lang} />
          </h3>
          <div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-white/10 sm:block">
            <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} />
          </div>
          <span className="whitespace-nowrap text-[13px] uppercase text-brand-green-light" style={poppins}>
            <T k={copyKey} lang={lang} />
          </span>
          <span className="flex items-center gap-1 text-[12px] uppercase text-white/40" style={poppins}>
            <Clock3 className="size-3.5" />
            <T k="closesIn" lang={lang} />
          </span>
          <ArrowRight className="size-4 text-white/40 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </div>
  );
}

/* ── Test E: milestone interstitials ──────────────────────────────────── */

function MilestoneOverlay({
  kind, lang, onClose,
}: { kind: 100 | 200; lang: Lang; onClose: () => void }) {
  const qualified = kind === 200;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative w-full max-w-md rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-white/30 hover:text-white"
          aria-label="close"
        >
          <X className="size-5" />
        </button>

        <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${qualified ? 'bg-brand-yellow/15' : 'bg-brand-green/15'}`}>
          {qualified
            ? <Trophy className="size-8 text-brand-yellow" />
            : <PartyPopper className="size-8 text-brand-green-light" />}
        </div>

        <div className="mt-4 text-2xl uppercase italic text-white" style={poppins}>
          <T k={qualified ? 'qualifiedTitle' : 'halfway'} lang={lang} />
        </div>
        <p className="mx-auto mt-2 max-w-xs text-[13px] leading-snug text-white/60" style={poppins}>
          <T k={qualified ? 'qualifiedBody' : 'halfwayBody'} lang={lang} />
        </p>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: qualified ? '55%' : '25%' }}
            animate={{ width: qualified ? '100%' : '50%' }}
            transition={{ delay: 0.35, duration: 0.7, ease: 'easeOut' }}
            className={`h-full rounded-full ${qualified ? 'bg-brand-yellow' : 'bg-brand-green'}`}
          />
        </div>
        <div className="mt-1 text-right text-[11px] tabular-nums text-white/40" style={poppins}>
          {qualified ? '200/200 QP' : '100/200 QP'}
        </div>

        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-[10px] px-6 py-2.5 text-[13px] uppercase text-white ${qualified ? 'bg-brand-green' : 'bg-brand-green'}`}
            style={poppins}
          >
            <T k={qualified ? 'register' : 'keepPlaying'} lang={lang} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] bg-white/[0.07] px-6 py-2.5 text-[13px] uppercase text-white/60"
            style={poppins}
          >
            <T k="later" lang={lang} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── page ─────────────────────────────────────────────────────────────── */

export default function DevWlAbPage() {
  const [kickoffMs] = useState(() => Date.now() + ((6 - new Date().getDay() + 7) % 7 || 7) * 86_400_000);
  const [lang, setLang] = useState<Lang>('ka');
  const [overlay, setOverlay] = useState<100 | 200 | null>(null);

  return (
    <div className="min-h-screen bg-surface-page-alt px-4 py-8 font-fun">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-xl uppercase italic text-white" style={poppins}>
            <T k="labTitle" lang={lang} />
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase text-white/30" style={poppins}>
              <T k="hint" lang={lang} />
            </span>
            <button
              type="button"
              onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}
              className="rounded-full bg-white/[0.07] px-3 py-1 text-[12px] uppercase text-white/70 hover:text-white"
              style={poppins}
            >
              {lang === 'ka' ? 'EN' : 'ᲥᲐ'}
            </button>
          </div>
        </div>

        <Section title={lang === 'ka' ? 'პრომო ბარათი (Figma 1722:253)' : 'Promo card (Figma 1722:253)'}>
          <div className="flex justify-center">
            <WeekendLeaguePromoCard
              registeredCount={600}
              kickoffMs={kickoffMs}
              onStart={() => {}}
              onClose={() => {}}
            />
          </div>
        </Section>

        <Section title={<T k="testA" lang={lang} />}>
          <Link
            href="/dev/results?qpToast=1"
            className="inline-flex items-center gap-2 rounded-[10px] bg-brand-green px-5 py-2.5 text-[13px] uppercase text-white"
            style={poppins}
          >
            {lang === 'ka' ? 'ნახე რეალურ შედეგების ეკრანზე' : 'Open on the REAL results screen'}
            <ArrowRight className="size-4" />
          </Link>
          <p className="mt-2 text-[12px] text-white/40" style={poppins}>
            {lang === 'ka'
              ? '/dev/results — ნამდვილი RealtimeResultsScreen, გვერდით პანელში "WL QP toast (A/B)" გადამრთველი'
              : '/dev/results — the production RealtimeResultsScreen; toggle "WL QP toast (A/B)" in the side panel'}
          </p>
        </Section>

        <Section title={<T k="testB" lang={lang} />}>
          <div className="space-y-3">
            {([
              ['labelProgress', 'copyProgress'],
              ['labelReward', 'copyReward'],
              ['labelSocial', 'copySocial'],
            ] as const).map(([label, copyKey]) => (
              <div key={copyKey}>
                <div className="mb-1 text-[11px] uppercase tracking-widest text-white/35" style={poppins}>
                  <T k={label} lang={lang} />
                </div>
                <RailMock lang={lang} copyKey={copyKey} />
              </div>
            ))}
          </div>
        </Section>

        <Section title={<T k="testE" lang={lang} />}>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setOverlay(100)}
              className="rounded-[10px] bg-white/[0.07] px-5 py-2.5 text-[13px] uppercase text-white/70 hover:text-white"
              style={poppins}
            >
              <T k="show100" lang={lang} />
            </button>
            <button
              type="button"
              onClick={() => setOverlay(200)}
              className="rounded-[10px] bg-brand-yellow/90 px-5 py-2.5 text-[13px] uppercase text-black"
              style={poppins}
            >
              <T k="show200" lang={lang} />
            </button>
          </div>
        </Section>
      </div>

      <AnimatePresence>
        {overlay != null && (
          <MilestoneOverlay kind={overlay} lang={lang} onClose={() => setOverlay(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
