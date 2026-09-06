'use client';

/**
 * Table Derby — frontend prototype of the online show adaptation.
 * Flow: home → matchmaking (mock) → showdown → rock-paper-scissors →
 * Round 1 "ჩამოთვალე" vs a scripted opponent. Georgian-only UI.
 * The round logic mirrors what the server state machine will own later.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { matchesName } from '@/features/mini-games/lib/matching';
import { TD, OPPONENT_NAMES } from './lib/copy';
import { TD_LIST_CATEGORIES, type TdListCategory } from './data/categories';
import {
  TD_DISPLAY,
  BetssonWordmark,
  TdLogoSticker,
  RoundIconsRow,
  MuralBackdrop,
  BoltGlyph,
  StarburstGlyph,
  TicketPill,
  TicketGlyph,
  PERF_DOTS,
} from './components/brand';
import { CategoryBand, PlayerBoard, ScorePill, TurnTimerBar } from './components/chrome';
import { DailySolo } from './components/DailySolo';
import { TdLoader } from './components/Loader';
import { AVATAR_VARIANTS, MyAvatar, TdAvatar } from './components/Avatar';
import { CardsRound } from './components/CardsRound';
import { BoxRound } from './components/BoxRound';
import { BuzzerRound, type BuzzerItem } from './components/BuzzerRound';
import { TD_CARD_CATEGORIES, type TdCardCategory } from './data/cards';
import { TD_BOX_CARDS } from './data/box';
import { TD_WHOAMI } from './data/whoami';
import { TD_CLUBS } from './data/clubs';
import {
  QP_LOSS,
  QP_TARGET,
  QP_WIN,
  addQp,
  dailyCategoryIndex,
  getDailyResult,
  getQp,
  getTickets,
  isOnboarded,
  resetOnboarding,
  resetTickets,
  setAvatarVariant,
  setFavClub,
  setOnboarded,
  setDailyResult,
  spendTicket,
} from './lib/state';

type Phase =
  | 'home'
  | 'onboarding'
  | 'daily'
  | 'dailyPlay'
  | 'wl'
  | 'leaderboard'
  | 'matchmaking'
  | 'showdown'
  | 'rps'
  | 'category'
  | 'play'
  | 'cards'
  | 'box'
  | 'buzzer'
  | 'penalties'
  | 'roundEnd'
  | 'matchEnd';

function shuffleList<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Penalties pool: box trivia flattened into flat buzzer questions. */
function buildPenaltyPool(): BuzzerItem[] {
  return shuffleList(
    TD_BOX_CARDS.flatMap((card) =>
      card.questions.map((qq, i) => ({
        id: `${card.id}-${i}`,
        display: qq.display,
        aliases: qq.aliases,
        clues: [qq.q],
      })),
    ),
  );
}
type Seat = 'me' | 'op';
type RpsPick = 'rock' | 'paper' | 'scissors';

const TURN_MS = 10_000;
const LIVES = 3;

interface RoundState {
  categoryIdx: number;
  usedCategoryIdxs: number[];
  found: { display: string; by: Seat }[];
  lives: Record<Seat, number>;
  count: Record<Seat, number>;
  turn: Seat;
  turnNo: number;
}

interface Flash {
  key: number;
  kind: 'correct' | 'wrong' | 'duplicate' | 'timeUp' | 'pool';
}

const RPS_META: Record<RpsPick, { label: string; glyph: string; beats: RpsPick }> = {
  rock: { label: TD.rpsRock, glyph: '✊', beats: 'scissors' },
  paper: { label: TD.rpsPaper, glyph: '✋', beats: 'rock' },
  scissors: { label: TD.rpsScissors, glyph: '✌️', beats: 'paper' },
};

function categoryAt(idx: number): TdListCategory {
  return TD_LIST_CATEGORIES[idx % TD_LIST_CATEGORIES.length];
}

function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex w-full items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 rounded-[10px] px-3 py-2 text-[11px]"
        style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', color: 'var(--td-white)', boxShadow: '3px 3px 0 #000' }}
      >
        ‹ {TD.back}
      </button>
      <h2 className="flex-1 text-center text-xl text-white md:text-2xl" style={TD_DISPLAY}>
        {title}
      </h2>
      <span className="w-[68px]" aria-hidden />
    </div>
  );
}

const LB_MOCK: { name: string; points: number }[] = [
  { name: 'ლუკა ბერიძე', points: 480 },
  { name: 'გიორგი წიკლაური', points: 445 },
  { name: 'ნინო გელაშვილი', points: 410 },
  { name: 'დათო ჩხეიძე', points: 360 },
  { name: 'სალომე მაისურაძე', points: 320 },
  { name: 'თორნიკე გოგოხია', points: 275 },
  { name: 'ანა ლომიძე', points: 220 },
  { name: 'ზურა კაპანაძე', points: 160 },
  { name: 'მარიამ ხუციშვილი', points: 95 },
];

function buildLeaderboard(myQp: number): { name: string; points: number; me?: boolean }[] {
  const rows = [...LB_MOCK, { name: TD.you, points: myQp, me: true }];
  return rows.sort((a, b) => b.points - a.points).slice(0, 10);
}

export function TableDerbyApp() {
  const [phase, setPhase] = useState<Phase>('home');
  const [opponentName, setOpponentName] = useState<string>(OPPONENT_NAMES[0]);
  const [roundsWon, setRoundsWon] = useState<Record<Seat, number>>({ me: 0, op: 0 });
  const [roundWinner, setRoundWinner] = useState<Seat | 'tie' | null>(null);
  const [round, setRound] = useState<RoundState | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [input, setInput] = useState('');

  // Shell state (localStorage-backed; read after mount to stay SSR-safe).
  const [tickets, setTickets] = useState<number | null>(null);
  const [qp, setQp] = useState(0);
  const [dailyScore, setDailyScore] = useState<number | null>(null);
  const [menuNotice, setMenuNotice] = useState<string | null>(null);
  const [qpEarned, setQpEarned] = useState(0); // signed match QP delta
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [booting, setBooting] = useState(true);
  const [onbStep, setOnbStep] = useState<0 | 1>(0);
  const [onbAvatar, setOnbAvatar] = useState(0);
  const [onbClub, setOnbClub] = useState<string | null>(null);

  // Boot loader (Betsson WebView/iframe entry): brand splash while key
  // assets warm up, minimum 5s so the Quizball lockup registers.
  useEffect(() => {
    // dev deep links skip the splash for fast iteration
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('round')) {
      setBooting(false);
      return;
    }
    const preload = ['/assets/table-derby/logo-paper.svg', '/assets/brand/quizball-logo.webp', '/assets/table-derby/3d/box/box_000.webp']
      .map(
        (src) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = src;
          }),
      );
    const minimum = new Promise((r) => setTimeout(r, 5000));
    void Promise.all([...preload, minimum]).then(() => {
      setBooting(false);
      // first visit (Betsson users arrive pre-authenticated; identity
      // comes from the host — this is product onboarding only)
      if (!isOnboarded()) setPhase('onboarding');
    });
  }, []);

  // Multi-round match flow.
  const [currentRound, setCurrentRound] = useState(1); // 1..4, 5 = penalties
  const [starterSeat, setStarterSeat] = useState<Seat>('me');
  const [cardCategory, setCardCategory] = useState<TdCardCategory | null>(null);
  const [buzzerItems, setBuzzerItems] = useState<BuzzerItem[]>([]);
  const [penaltyItems, setPenaltyItems] = useState<BuzzerItem[]>([]);
  const [penaltySpare, setPenaltySpare] = useState<BuzzerItem[]>([]);
  const [matchWinner, setMatchWinner] = useState<Seat | null>(null);
  const [prevQpForResults, setPrevQpForResults] = useState(0);
  const matchAwarded = useRef(false);

  // RPS
  const [myPick, setMyPick] = useState<RpsPick | null>(null);
  const [opPick, setOpPick] = useState<RpsPick | null>(null);
  const [rpsResult, setRpsResult] = useState<'me' | 'op' | 'tie' | null>(null);

  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeouts.current.push(t);
  }, []);
  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  const category = round ? categoryAt(round.categoryIdx) : null;
  const remaining = useMemo(() => {
    if (!round || !category) return [];
    const found = new Set(round.found.map((f) => f.display));
    return category.answers.filter((a) => !found.has(a.display));
  }, [round, category]);

  /* Dev deep link: /table-derby?round=1|2|3|4|penalties boots straight
     into that segment vs the scripted opponent (no ticket spent). */
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;
    const p = new URLSearchParams(window.location.search).get('round');
    if (!p) return;
    setOpponentName(OPPONENT_NAMES[0]);
    if (p === '1') beginRound('me');
    else if (p === '2') startLaterRound(2, 'me');
    else if (p === '3') startLaterRound(3, 'me');
    else if (p === '4') startLaterRound(4, 'me');
    else if (p === 'penalties') startLaterRound(5, 'me');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot-once dev hook
  }, []);

  // Dev-only e2e hook: leak the current expected answer for test scripts.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      (window as unknown as { __tdAnswer?: string }).__tdAnswer = remaining[0]?.display;
    }
  });

  /* ── shell: tickets / QP / daily state ──────────────────────── */

  useEffect(() => {
    if (phase !== 'home' && phase !== 'wl' && phase !== 'leaderboard' && phase !== 'daily') return;
    setTickets(getTickets());
    setQp(getQp());
    setDailyScore(getDailyResult());
  }, [phase]);

  /* ── flow: menu → matchmaking → showdown → rps ──────────────── */

  const startMatch = () => {
    if (getTickets() <= 0) {
      setMenuNotice(TD.noTickets);
      setPhase('home');
      return;
    }
    setTickets(spendTicket());
    setMenuNotice(null);
    setQpEarned(0);
    setOpponentName(OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)]);
    setRoundsWon({ me: 0, op: 0 });
    setRoundWinner(null);
    setMatchWinner(null);
    setCurrentRound(1);
    matchAwarded.current = false;
    setPhase('matchmaking');
    later(() => setPhase('showdown'), 2800);
    later(() => setPhase('rps'), 5400);
  };

  const beginRound = useCallback(
    (starter: Seat) => {
      const firstIdx = Math.floor(Math.random() * TD_LIST_CATEGORIES.length);
      setCurrentRound(1);
      setStarterSeat(starter);
      roundClosed.current = false;
      setRound({
        categoryIdx: firstIdx,
        usedCategoryIdxs: [firstIdx],
        found: [],
        lives: { me: LIVES, op: LIVES },
        count: { me: 0, op: 0 },
        turn: starter,
        turnNo: 1,
      });
      setInput('');
      setPhase('category');
      later(() => setPhase('play'), 3000);
    },
    [later],
  );

  /** Rounds 2-4 and penalties share the intro → play cadence. */
  const startLaterRound = useCallback(
    (roundNum: number, starter: Seat) => {
      setCurrentRound(roundNum);
      setStarterSeat(starter);
      setRoundWinner(null);
      roundClosed.current = false;
      if (roundNum === 2) {
        setCardCategory(TD_CARD_CATEGORIES[Math.floor(Math.random() * TD_CARD_CATEGORIES.length)]);
      }
      if (roundNum === 4) setBuzzerItems(shuffleList(TD_WHOAMI));
      if (roundNum === 5) {
        const pool = buildPenaltyPool();
        setPenaltyItems(pool.slice(0, 10));
        setPenaltySpare(pool.slice(10));
      }
      setPhase('category');
      later(
        () => setPhase(roundNum === 2 ? 'cards' : roundNum === 3 ? 'box' : roundNum === 4 ? 'buzzer' : 'penalties'),
        3000,
      );
    },
    [later],
  );

  const pickRps = (mine: RpsPick) => {
    if (myPick) return;
    setMyPick(mine);
    const theirs: RpsPick = (['rock', 'paper', 'scissors'] as const)[Math.floor(Math.random() * 3)];
    later(() => {
      setOpPick(theirs);
      const result = mine === theirs ? 'tie' : RPS_META[mine].beats === theirs ? 'me' : 'op';
      setRpsResult(result);
      if (result === 'tie') {
        later(() => {
          setMyPick(null);
          setOpPick(null);
          setRpsResult(null);
        }, 1500);
      } else {
        later(() => {
          setMyPick(null);
          setOpPick(null);
          setRpsResult(null);
          beginRound(result);
        }, 1800);
      }
    }, 800);
  };

  /* ── round engine ───────────────────────────────────────────── */

  const doFlash = useCallback((kind: Flash['kind']) => {
    setFlash({ key: Date.now(), kind });
  }, []);

  // Guards against a skipped round's component still firing its own onEnd.
  const roundClosed = useRef(false);

  const endRound = useCallback(
    (winner: Seat | 'tie') => {
      if (roundClosed.current) return;
      roundClosed.current = true;
      setRoundWinner(winner);
      if (winner !== 'tie') setRoundsWon((s) => ({ ...s, [winner]: s[winner] + 1 }));
      later(() => setPhase('roundEnd'), 1100);
    },
    [later],
  );

  /** Match settlement — QP like Quizball ranked: win +25, loss −10 (floor 0).
   *  Real product: server-side at settlement. */
  const finishMatch = useCallback((winner: Seat) => {
    if (!matchAwarded.current) {
      matchAwarded.current = true;
      const delta = winner === 'me' ? QP_WIN : -QP_LOSS;
      setPrevQpForResults(getQp());
      setQpEarned(delta);
      setQp(addQp(delta));
    }
    setMatchWinner(winner);
    setPhase('matchEnd');
  }, []);

  const swapCategory = useCallback(() => {
    doFlash('pool');
    later(() => {
      setRound((r) => {
        if (!r) return r;
        const unused = TD_LIST_CATEGORIES.map((_, i) => i).filter((i) => !r.usedCategoryIdxs.includes(i));
        const nextIdx = unused.length > 0 ? unused[Math.floor(Math.random() * unused.length)] : Math.floor(Math.random() * TD_LIST_CATEGORIES.length);
        return {
          ...r,
          categoryIdx: nextIdx,
          usedCategoryIdxs: [...r.usedCategoryIdxs, nextIdx],
          found: [],
          // Owner ruling: exhausted pool = tie → fresh category; lives reset
          // (SPEC assumption), correct-counts keep accumulating.
          lives: { me: LIVES, op: LIVES },
          turnNo: r.turnNo + 1,
        };
      });
      setPhase('category');
      later(() => setPhase('play'), 2600);
    }, 1400);
  }, [doFlash, later]);

  const applyCorrect = useCallback(
    (seat: Seat, display: string) => {
      let exhausted = false;
      setRound((r) => {
        if (!r) return r;
        const found = [...r.found, { display, by: seat }];
        exhausted = found.length >= categoryAt(r.categoryIdx).answers.length;
        return {
          ...r,
          found,
          count: { ...r.count, [seat]: r.count[seat] + 1 },
          turn: seat === 'me' ? 'op' : 'me',
          turnNo: r.turnNo + 1,
        };
      });
      if (seat === 'me') doFlash('correct');
      // setState is sync-queued; schedule the exhaustion check right after.
      later(() => {
        if (exhausted) swapCategory();
      }, 50);
    },
    [doFlash, later, swapCategory],
  );

  const applyMiss = useCallback(
    (seat: Seat, reason: 'wrong' | 'duplicate' | 'timeUp') => {
      let eliminated = false;
      setRound((r) => {
        if (!r) return r;
        const lives = { ...r.lives, [seat]: Math.max(0, r.lives[seat] - 1) };
        eliminated = lives[seat] === 0;
        return { ...r, lives, turn: seat === 'me' ? 'op' : 'me', turnNo: r.turnNo + 1 };
      });
      if (seat === 'me') doFlash(reason === 'wrong' ? 'wrong' : reason === 'duplicate' ? 'duplicate' : 'timeUp');
      later(() => {
        if (eliminated) endRound(seat === 'me' ? 'op' : 'me');
      }, 50);
    },
    [doFlash, endRound, later],
  );

  // Opponent (scripted): acts within the 10s window.
  useEffect(() => {
    if (phase !== 'play' || !round || round.turn !== 'op') return;
    if (roundWinner) return;
    const delay = 1600 + Math.random() * 3600;
    const t = setTimeout(() => {
      const pool = remaining;
      const successP = pool.length <= 2 ? 0.55 : 0.72;
      if (pool.length > 0 && Math.random() < successP) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        applyCorrect('op', pick.display);
      } else {
        applyMiss('op', 'wrong');
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by turnNo; `remaining` is derived from the same state snapshot
  }, [phase, round?.turn, round?.turnNo, roundWinner]);

  // My 10s turn clock.
  useEffect(() => {
    if (phase !== 'play' || !round || round.turn !== 'me') return;
    if (roundWinner) return;
    const t = setTimeout(() => applyMiss('me', 'timeUp'), TURN_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by turnNo
  }, [phase, round?.turn, round?.turnNo, roundWinner]);

  const submit = () => {
    if (!round || !category || round.turn !== 'me' || phase !== 'play') return;
    const value = input.trim();
    if (!value) return;
    setInput('');
    const foundSet = round.found.map((f) => f.display);
    // Duplicate = wrong in the show's rules — costs a life, own message.
    const dup = category.answers.some(
      (a) => foundSet.includes(a.display) && matchesName(value, a.aliases).ok,
    );
    if (dup) {
      applyMiss('me', 'duplicate');
      return;
    }
    const hit = remaining.find((a) => matchesName(value, a.aliases).ok);
    if (hit) applyCorrect('me', hit.display);
    else applyMiss('me', 'wrong');
  };

  /** After the round-end screen: next round, penalties, or results. */
  const continueAfterRound = () => {
    // Loser starts the next round; a tied round flips the previous starter.
    const nextStart: Seat =
      roundWinner === 'me' ? 'op' : roundWinner === 'op' ? 'me' : starterSeat === 'me' ? 'op' : 'me';
    if (roundsWon.me >= 3 || roundsWon.op >= 3) {
      finishMatch(roundsWon.me > roundsWon.op ? 'me' : 'op');
      return;
    }
    if (currentRound < 4) {
      startLaterRound(currentRound + 1, nextStart);
      return;
    }
    if (roundsWon.me === roundsWon.op) {
      startLaterRound(5, nextStart); // penalties
      return;
    }
    finishMatch(roundsWon.me > roundsWon.op ? 'me' : 'op');
  };

  /** Whether the match is settled once this round-end screen is confirmed. */
  const matchDecidedNow =
    roundsWon.me >= 3 || roundsWon.op >= 3 || (currentRound >= 4 && roundsWon.me !== roundsWon.op);

  /* Dev-only quick skip: force the current round's outcome. */
  const inRoundPhase = phase === 'play' || phase === 'cards' || phase === 'box' || phase === 'buzzer' || phase === 'penalties';
  const devSkip = (result: Seat | 'tie') => {
    if (phase === 'penalties') {
      finishMatch(result === 'op' ? 'op' : 'me');
      return;
    }
    endRound(result);
  };

  const resetToHome = () => {
    setRound(null);
    setRoundWinner(null);
    setPhase('home');
  };

  /* ── screens ────────────────────────────────────────────────── */

  const flashText =
    flash?.kind === 'correct'
      ? TD.correct
      : flash?.kind === 'wrong'
        ? TD.wrong
        : flash?.kind === 'duplicate'
          ? TD.duplicate
          : flash?.kind === 'timeUp'
            ? TD.timeUp
            : flash?.kind === 'pool'
              ? TD.poolExhausted
              : null;

  return (
    <div className="td-theme relative min-h-dvh overflow-hidden" style={{ background: 'var(--td-bg)' }}>
      <MuralBackdrop dim={phase === 'home' ? 1 : 0.45} />

      {/* betsson.sport — top-right like the broadcast; the in-round
          scoreboard (with avatars) owns that zone during gameplay */}
      {!inRoundPhase && (
        <div className="absolute right-4 top-4 z-20 md:right-8 md:top-6">
          <BetssonWordmark tone={phase === 'home' ? 'orange' : 'white'} size={16} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── ONBOARDING (first visit: avatar + favorite club) ── */}
        {phase === 'onboarding' && (
          <motion.main
            key={`onb-${onbStep}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-7 px-5"
          >
            <TdLogoSticker variant="blackOnWhite" scale={0.62} />
            <p className="text-center text-sm text-white/70" style={TD_DISPLAY}>
              {TD.onbWelcome}
            </p>
            <h2 className="text-center text-2xl text-white" style={TD_DISPLAY}>
              {onbStep === 0 ? TD.onbAvatarTitle : TD.onbClubTitle}
            </h2>

            {onbStep === 0 ? (
              <div className="grid grid-cols-4 gap-5">
                {AVATAR_VARIANTS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setOnbAvatar(i)}
                    className="rounded-full transition-transform hover:-translate-y-0.5"
                    style={{ outline: onbAvatar === i ? '3px solid var(--td-orange)' : '3px solid transparent', outlineOffset: 4, borderRadius: '999px' }}
                  >
                    <TdAvatar name={TD.you} variant={i} size={64} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid w-full grid-cols-2 gap-2.5">
                {TD_CLUBS.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => setOnbClub(club.id)}
                    className="flex items-center gap-2.5 rounded-[10px] px-3 py-3 text-left"
                    style={{
                      background: onbClub === club.id ? 'var(--td-orange)' : 'var(--td-charcoal)',
                      boxShadow: '3px 3px 0 rgba(0,0,0,0.5)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <span aria-hidden className="size-3.5 shrink-0 rounded-full" style={{ background: club.color, boxShadow: '0 0 0 2px rgba(0,0,0,0.35)' }} />
                    <span className="truncate text-[12px]" style={{ ...TD_DISPLAY, color: onbClub === club.id ? '#0d0d0d' : 'var(--td-white)' }}>
                      {club.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* progress + CTA */}
            <div className="flex items-center gap-2" aria-hidden>
              {[0, 1].map((i) => (
                <span key={i} className="size-2 rounded-full" style={{ background: onbStep === i ? 'var(--td-orange)' : 'rgba(255,255,255,0.25)' }} />
              ))}
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              disabled={onbStep === 1 && !onbClub}
              onClick={() => {
                if (onbStep === 0) {
                  setAvatarVariant(onbAvatar);
                  setOnbStep(1);
                } else if (onbClub) {
                  setFavClub(onbClub);
                  setOnboarded();
                  setPhase('home');
                }
              }}
              className="rounded-[12px] px-10 py-3.5 text-base disabled:opacity-40"
              style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '5px 5px 0 #000' }}
            >
              {onbStep === 0 ? TD.onbNext : TD.onbStart}
            </motion.button>
          </motion.main>
        )}

        {/* ── HOME / MENU ── */}
        {phase === 'home' && (
          <motion.main
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-5 px-4 py-16 md:gap-6"
          >
            <TdLogoSticker variant="blackOnWhite" scale={0.9} />
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setShowAvatarPicker(true)} aria-label={TD.chooseAvatar}>
                <MyAvatar size={52} />
              </button>
              <TicketPill count={tickets} label={TD.tickets} />
              {process.env.NODE_ENV !== 'production' && (
                <button
                  type="button"
                  onClick={() => setTickets(resetTickets())}
                  className="rounded-full px-2.5 py-1.5 text-[11px] opacity-60"
                  style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', color: 'var(--td-white)', boxShadow: '2px 2px 0 #000' }}
                  title="dev: reset tickets"
                >
                  ↺5
                </button>
              )}
              {process.env.NODE_ENV !== 'production' && (
                <button
                  type="button"
                  onClick={() => {
                    resetOnboarding();
                    setOnbStep(0);
                    setOnbClub(null);
                    setPhase('onboarding');
                  }}
                  className="rounded-full px-2.5 py-1.5 text-[11px] opacity-60"
                  style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', color: 'var(--td-white)', boxShadow: '2px 2px 0 #000' }}
                  title="dev: replay onboarding"
                >
                  ⟲
                </button>
              )}
            </div>

            {showAvatarPicker && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-6"
                style={{ background: 'rgba(0,0,0,0.65)' }}
                onClick={() => setShowAvatarPicker(false)}
              >
                <div
                  className="rounded-[16px] px-6 py-5"
                  style={{ background: 'var(--td-charcoal)', boxShadow: '6px 6px 0 #000' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="mb-5 text-center text-sm text-white" style={TD_DISPLAY}>
                    {TD.chooseAvatar}
                  </p>
                  <div className="grid grid-cols-4 gap-5">
                    {AVATAR_VARIANTS.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAvatarVariant(i);
                          setShowAvatarPicker(false);
                        }}
                      >
                        <TdAvatar name={TD.you} variant={i} size={52} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* hero: the main match */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={startMatch}
              className="relative w-full overflow-hidden rounded-[16px] p-5 text-left md:p-6"
              style={{ background: 'var(--td-orange)', boxShadow: '6px 6px 0 #000', transform: 'rotate(-0.8deg)' }}
            >
              <span aria-hidden className="pointer-events-none absolute inset-0" style={PERF_DOTS} />
              <div className="relative flex flex-col gap-2.5">
                <span className="text-2xl md:text-3xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
                  {TD.title}
                </span>
                <span className="text-[11px] md:text-xs" style={{ ...TD_DISPLAY, color: 'rgba(0,0,0,0.65)' }}>
                  {TD.menuMatchSub}
                </span>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <RoundIconsRow size={24} tone="black" />
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 text-[10px]"
                      style={{ ...TD_DISPLAY, color: '#0d0d0d' }}
                    >
                      <TicketGlyph size={11} />
                      {TD.ticketCost}
                    </span>
                    <span
                      className="rounded-[10px] bg-black px-5 py-2.5 text-sm text-white md:text-base"
                      style={TD_DISPLAY}
                    >
                      {TD.playNow}
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>

            {menuNotice && (
              <p
                className="rounded-[8px] px-3 py-1.5 text-[11px]"
                style={{ ...TD_DISPLAY, background: 'var(--td-steel-deep)', color: 'var(--td-white)', boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
              >
                {menuNotice}
              </p>
            )}

            {/* sections */}
            <div className="flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={() => setPhase('daily')}
                className="flex w-full items-center justify-between gap-3 rounded-[14px] px-4 py-4 text-left md:px-5"
                style={{ background: 'var(--td-charcoal)', boxShadow: '5px 5px 0 #000' }}
              >
                <div className="min-w-0">
                  <p className="text-base text-white md:text-lg" style={TD_DISPLAY}>
                    {TD.menuDaily}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-white/55 md:text-[11px]" style={TD_DISPLAY}>
                    {TD.menuDailySub}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-[9px] md:text-[10px]"
                  style={{
                    ...TD_DISPLAY,
                    background: dailyScore === null ? 'var(--td-orange)' : 'rgba(255,255,255,0.14)',
                    color: dailyScore === null ? '#0d0d0d' : 'rgba(255,255,255,0.75)',
                  }}
                >
                  {dailyScore === null ? TD.menuDailyNew : TD.menuDailyDone}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPhase('wl')}
                className="w-full rounded-[14px] px-4 py-4 text-left md:px-5"
                style={{ background: 'var(--td-charcoal)', boxShadow: '5px 5px 0 #000' }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base text-white md:text-lg" style={TD_DISPLAY}>
                      {TD.menuWl}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-white/55 md:text-[11px]" style={TD_DISPLAY}>
                      {TD.menuWlSub}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm" style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }}>
                    {Math.min(qp, QP_TARGET)}/{QP_TARGET}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ background: 'var(--td-orange)', width: `${Math.min(100, Math.round((qp / QP_TARGET) * 100))}%` }}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPhase('leaderboard')}
                className="flex w-full items-center justify-between gap-3 rounded-[14px] px-4 py-4 text-left md:px-5"
                style={{ background: 'var(--td-charcoal)', boxShadow: '5px 5px 0 #000' }}
              >
                <div className="min-w-0">
                  <p className="text-base text-white md:text-lg" style={TD_DISPLAY}>
                    {TD.menuLb}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-white/55 md:text-[11px]" style={TD_DISPLAY}>
                    {TD.menuLbSub}
                  </p>
                </div>
                <span className="shrink-0 text-xl text-white/40" style={TD_DISPLAY}>
                  ›
                </span>
              </button>
            </div>
          </motion.main>
        )}

        {/* ── DAILY HUB ── */}
        {phase === 'daily' && (
          <motion.main
            key="daily"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-6 px-4 py-16"
          >
            <SectionHeader title={TD.menuDaily} onBack={() => setPhase('home')} />
            <div
              className="flex w-full flex-col items-center gap-4 rounded-[16px] px-5 py-7"
              style={{ background: 'var(--td-charcoal)', boxShadow: '6px 6px 0 #000' }}
            >
              <StarburstGlyph size={30} />
              <p className="text-lg text-white md:text-xl" style={TD_DISPLAY}>
                {TD.dailyToday}
              </p>
              {dailyScore === null ? (
                <>
                  <p className="text-center text-[11px] text-white/60" style={TD_DISPLAY}>
                    {TD.round1Name} · {TD.menuDailySub}
                  </p>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPhase('dailyPlay')}
                    className="rounded-[12px] px-9 py-3.5 text-base"
                    style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '5px 5px 0 #000' }}
                  >
                    {TD.playNow}
                  </motion.button>
                </>
              ) : (
                <>
                  <div
                    className="flex items-center gap-3 rounded-[10px] px-6 py-3"
                    style={{ background: 'var(--td-orange)', boxShadow: '4px 4px 0 #000', transform: 'rotate(-2deg)' }}
                  >
                    <span className="text-[11px]" style={{ ...TD_DISPLAY, color: 'rgba(0,0,0,0.65)' }}>
                      {TD.dailyYourScore}
                    </span>
                    <span className="text-3xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
                      {dailyScore}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60" style={TD_DISPLAY}>
                    {TD.dailyComeBack}
                  </p>
                </>
              )}
            </div>
          </motion.main>
        )}

        {/* ── DAILY PLAY ── */}
        {phase === 'dailyPlay' && (
          <motion.main
            key="dailyPlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mx-auto flex min-h-dvh w-full flex-col justify-center px-3 py-6 md:px-8"
          >
            <DailySolo
              category={categoryAt(dailyCategoryIndex(TD_LIST_CATEGORIES.length))}
              onDone={(score) => {
                setDailyResult(score);
                setDailyScore(score);
                setPhase('daily');
              }}
            />
          </motion.main>
        )}

        {/* ── WEEKEND LEAGUE ── */}
        {phase === 'wl' && (
          <motion.main
            key="wl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-5 px-4 py-16"
          >
            <SectionHeader title={TD.menuWl} onBack={() => setPhase('home')} />
            <div
              className="w-full rounded-[16px] px-5 py-6"
              style={{ background: 'var(--td-charcoal)', boxShadow: '6px 6px 0 #000' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/60" style={TD_DISPLAY}>
                  {TD.wlQpLabel}
                </span>
                <span className="text-lg" style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }}>
                  {Math.min(qp, QP_TARGET)}/{QP_TARGET}
                </span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.round((qp / QP_TARGET) * 100))}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'var(--td-orange)' }}
                />
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {[TD.wlHowTo, TD.wlWin, TD.wlLoss, TD.wlSchedule].map((line) => (
                  <div key={line} className="flex items-center gap-2.5">
                    <BoltGlyph size={14} />
                    <span className="text-[11px] text-white/80 md:text-xs" style={TD_DISPLAY}>
                      {line}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {qp >= QP_TARGET ? (
              <div
                className="rounded-[12px] px-6 py-3.5"
                style={{ background: 'var(--td-orange)', boxShadow: '5px 5px 0 #000', transform: 'rotate(-2deg)' }}
              >
                <span className="text-base" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
                  {TD.wlQualified}
                </span>
              </div>
            ) : null}
            <div
              className="rounded-full px-5 py-2"
              style={{ ...TD_DISPLAY, background: 'var(--td-paper)', color: '#0d0d0d', boxShadow: '4px 4px 0 #000', fontSize: 12 }}
            >
              {TD.wlPrizes}
            </div>
          </motion.main>
        )}

        {/* ── LEADERBOARD ── */}
        {phase === 'leaderboard' && (
          <motion.main
            key="lb"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center gap-5 px-4 py-16"
          >
            <SectionHeader title={TD.menuLb} onBack={() => setPhase('home')} />
            <p className="text-[11px] text-white/55" style={TD_DISPLAY}>
              {TD.lbWeekly}
            </p>
            <div className="w-full overflow-hidden rounded-[16px]" style={{ background: 'var(--td-charcoal)', boxShadow: '6px 6px 0 #000' }}>
              {buildLeaderboard(qp).map((row, i) => (
                <div
                  key={row.name}
                  className="flex items-center gap-3 px-4 py-2.5 md:py-3"
                  style={{
                    background: row.me ? 'var(--td-orange)' : i % 2 ? 'rgba(255,255,255,0.03)' : 'transparent',
                  }}
                >
                  <span
                    className="w-6 text-center text-sm"
                    style={{ ...TD_DISPLAY, color: row.me ? '#0d0d0d' : 'var(--td-orange)' }}
                  >
                    {i + 1}
                  </span>
                  <span
                    className="min-w-0 flex-1 truncate text-[13px] md:text-sm"
                    style={{ ...TD_DISPLAY, color: row.me ? '#0d0d0d' : 'var(--td-white)' }}
                  >
                    {row.name}
                  </span>
                  <span className="text-sm tabular-nums" style={{ ...TD_DISPLAY, color: row.me ? '#0d0d0d' : 'rgba(255,255,255,0.7)' }}>
                    {row.points}
                  </span>
                </div>
              ))}
            </div>
          </motion.main>
        )}

        {/* ── MATCHMAKING ── */}
        {phase === 'matchmaking' && (
          <motion.main
            key="mm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-8 px-6"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 6, -6, 0] }}
              transition={{ repeat: Infinity, duration: 1.1 }}
            >
              <BoltGlyph size={90} />
            </motion.div>
            <div className="flex items-end gap-1.5">
              <span className="text-xl text-white md:text-2xl" style={TD_DISPLAY}>
                {TD.searching}
              </span>
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="text-xl text-white md:text-2xl"
                style={TD_DISPLAY}
              >
                ...
              </motion.span>
            </div>
          </motion.main>
        )}

        {/* ── SHOWDOWN ── */}
        {phase === 'showdown' && (
          <motion.main
            key="vs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-6"
          >
            <motion.div initial={{ x: -120, rotate: -6, opacity: 0 }} animate={{ x: 0, rotate: -3, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
              <div className="flex flex-col items-center gap-3">
                <MyAvatar size={72} />
                <div className="rounded-[10px] px-8 py-4" style={{ background: 'var(--td-paper)', boxShadow: '6px 6px 0 #000' }}>
                  <span className="text-2xl md:text-3xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
                    {TD.you}
                  </span>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35, type: 'spring', damping: 10 }}>
              <span
                className="block text-5xl md:text-6xl"
                style={{ ...TD_DISPLAY, color: 'var(--td-orange)', transform: 'rotate(-6deg)' }}
              >
                VS
              </span>
            </motion.div>
            <motion.div initial={{ x: 120, rotate: 6, opacity: 0 }} animate={{ x: 0, rotate: 2, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
              <div className="flex flex-col items-center gap-3">
                <TdAvatar name={opponentName} size={72} />
                <div className="rounded-[10px] px-8 py-4" style={{ background: 'var(--td-paper)', boxShadow: '6px 6px 0 #000' }}>
                  <span className="text-2xl md:text-3xl" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
                    {opponentName}
                  </span>
                </div>
              </div>
            </motion.div>
            <div
              className="mt-2 rounded-full px-4 py-1.5 text-[11px] md:text-xs"
              style={{ ...TD_DISPLAY, background: 'var(--td-white)', color: '#0d0d0d' }}
            >
              {TD.bestOfRounds}
            </div>
          </motion.main>
        )}

        {/* ── RPS ── */}
        {phase === 'rps' && (
          <motion.main
            key="rps"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-7 px-6"
          >
            <h2 className="text-2xl text-white md:text-3xl" style={TD_DISPLAY}>
              {TD.rpsTitle}
            </h2>
            <div className="flex items-center gap-3 md:gap-4">
              {(Object.keys(RPS_META) as RpsPick[]).map((k) => (
                <motion.button
                  key={k}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => pickRps(k)}
                  disabled={!!myPick}
                  className="flex flex-col items-center gap-1.5 rounded-[16px] px-5 py-4 md:px-7 md:py-5"
                  style={{
                    background: myPick === k ? 'var(--td-orange)' : 'var(--td-charcoal)',
                    boxShadow: '5px 5px 0 #000',
                    opacity: myPick && myPick !== k ? 0.45 : 1,
                    transition: 'background 0.2s, opacity 0.2s',
                  }}
                >
                  <span className="text-3xl md:text-4xl" aria-hidden>
                    {RPS_META[k].glyph}
                  </span>
                  <span className="text-[11px] text-white md:text-xs" style={TD_DISPLAY}>
                    {RPS_META[k].label}
                  </span>
                </motion.button>
              ))}
            </div>
            <div className="flex h-16 items-center justify-center">
              <AnimatePresence>
                {opPick && (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-4"
                  >
                    <span className="text-4xl" aria-hidden>
                      {myPick ? RPS_META[myPick].glyph : ''}
                    </span>
                    <span className="text-lg text-white/60" style={TD_DISPLAY}>
                      —
                    </span>
                    <span className="text-4xl" aria-hidden>
                      {RPS_META[opPick].glyph}
                    </span>
                    <span
                      className="ml-2 rounded-[8px] px-3 py-1.5 text-sm"
                      style={{
                        ...TD_DISPLAY,
                        background: rpsResult === 'tie' ? 'var(--td-white)' : 'var(--td-orange)',
                        color: '#0d0d0d',
                      }}
                    >
                      {rpsResult === 'tie' ? TD.rpsTie : rpsResult === 'me' ? TD.rpsYouStart : TD.rpsOpponentStarts}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        )}

        {/* ── ROUND INTRO ── */}
        {phase === 'category' && (
          <motion.main
            key={`cat-${currentRound}-${round?.usedCategoryIdxs.length ?? 0}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-4 md:px-10"
          >
            <div className="flex items-center gap-3">
              <StarburstGlyph size={20} />
              <span className="text-lg text-white md:text-xl" style={TD_DISPLAY}>
                {currentRound === 5
                  ? TD.penaltiesName
                  : `${TD.roundLabel} ${currentRound} · ${
                      currentRound === 1
                        ? TD.round1Name
                        : currentRound === 2
                          ? TD.round2Name
                          : currentRound === 3
                            ? TD.round3Name
                            : TD.round4Name
                    }`}
              </span>
              <StarburstGlyph size={20} rotate={20} />
            </div>
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 16 }}
              className="w-full max-w-2xl"
            >
              {currentRound === 1 && category && <CategoryBand prompt={category.prompt} />}
              {currentRound === 2 && cardCategory && <CategoryBand prompt={cardCategory.prompt} />}
              {currentRound === 3 && <CategoryBand prompt={TD.rollBox} />}
              {currentRound === 4 && <CategoryBand prompt={`${TD.buzzRules} · +10 / −10`} />}
              {currentRound === 5 && <CategoryBand prompt={TD.penaltiesIntro} />}
            </motion.div>
          </motion.main>
        )}

        {/* ── PLAY ── */}
        {phase === 'play' && round && category && (
          <motion.main
            key="play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mx-auto flex min-h-dvh w-full max-w-4xl flex-col justify-center gap-3 px-3 pb-4 pt-24 md:gap-5 md:px-8"
          >
            <div className="fixed inset-x-0 top-0 z-30 flex justify-center pb-4 pt-4" style={{ background: 'linear-gradient(to bottom, rgba(30,30,30,0.92) 55%, transparent)' }}>
              <ScorePill
                roundsMe={roundsWon.me}
                roundsOp={roundsWon.op}
                inRoundMe={round.count.me}
                inRoundOp={round.count.op}
                left={<MyAvatar size={54} active={round.turn === 'me'} />}
                right={<TdAvatar name={opponentName} size={54} active={round.turn === 'op'} />}
              />
            </div>
            <CategoryBand prompt={category.prompt} compact />

            <div className="flex items-end gap-3 md:gap-6">
              <PlayerBoard
                name={TD.you}
                side="left"
                lives={round.lives.me}
                count={round.count.me}
                answers={round.found.filter((f) => f.by === 'me').map((f) => f.display)}
                active={round.turn === 'me'}
              />
              <PlayerBoard
                name={opponentName}
                side="right"
                lives={round.lives.op}
                count={round.count.op}
                answers={round.found.filter((f) => f.by === 'op').map((f) => f.display)}
                active={round.turn === 'op'}
                thinking={round.turn === 'op' ? TD.opponentTurn : undefined}
              />
            </div>

            <TurnTimerBar turnKey={`t-${round.turnNo}`} ms={TURN_MS} running={!roundWinner} />

            <div className="relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="flex gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={round.turn !== 'me' || !!roundWinner}
                  placeholder={round.turn === 'me' ? TD.answerPlaceholder : TD.opponentTurn}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  className="h-14 min-w-0 flex-1 rounded-[10px] border-0 px-4 text-base text-white outline-none placeholder:text-white/35 disabled:opacity-50"
                  style={{ background: 'var(--td-charcoal)', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)', fontFamily: "'Noto Sans Georgian', sans-serif", fontWeight: 600 }}
                />
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.95 }}
                  disabled={round.turn !== 'me' || !!roundWinner}
                  className="h-14 shrink-0 rounded-[10px] px-6 text-base disabled:opacity-40"
                  style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
                >
                  {TD.submit}
                </motion.button>
              </form>
              <AnimatePresence>
                {flash && flashText && (
                  <motion.div
                    key={flash.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onAnimationComplete={() => later(() => setFlash((f) => (f?.key === flash.key ? null : f)), 1300)}
                    className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-[8px] px-3 py-1 text-[12px]"
                    style={{
                      ...TD_DISPLAY,
                      background: flash.kind === 'correct' ? 'var(--td-orange)' : flash.kind === 'pool' ? 'var(--td-white)' : 'var(--td-steel-deep)',
                      color: flash.kind === 'correct' || flash.kind === 'pool' ? '#0d0d0d' : 'var(--td-white)',
                      boxShadow: '3px 3px 0 rgba(0,0,0,0.5)',
                    }}
                  >
                    {flashText}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.main>
        )}

        {/* ── ROUND 2: CARDS ── */}
        {phase === 'cards' && cardCategory && (
          <motion.main
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh w-full flex-col justify-center px-3 py-4 md:px-8"
          >
            <CardsRound
              category={cardCategory}
              starter={starterSeat}
              roundsWon={roundsWon}
              opponentName={opponentName}
              onEnd={(w) => endRound(w)}
            />
          </motion.main>
        )}

        {/* ── ROUND 3: PAPA CARLO'S BOX ── */}
        {phase === 'box' && (
          <motion.main
            key="box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh w-full flex-col justify-center px-3 py-4 md:px-8"
          >
            <BoxRound starter={starterSeat} roundsWon={roundsWon} opponentName={opponentName} onEnd={(w) => endRound(w)} />
          </motion.main>
        )}

        {/* ── ROUND 4: WHO AM I (BUZZER) ── */}
        {phase === 'buzzer' && buzzerItems.length > 0 && (
          <motion.main
            key="buzzer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh w-full flex-col justify-center px-3 py-4 md:px-8"
          >
            <BuzzerRound
              items={buzzerItems}
              roundsWon={roundsWon}
              opponentName={opponentName}
              onEnd={(w) => endRound(w)}
            />
          </motion.main>
        )}

        {/* ── PENALTIES ── */}
        {phase === 'penalties' && penaltyItems.length > 0 && (
          <motion.main
            key="penalties"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh w-full flex-col justify-center px-3 py-4 md:px-8"
          >
            <BuzzerRound
              items={penaltyItems}
              extraPool={penaltySpare}
              penaltyMode
              roundsWon={roundsWon}
              opponentName={opponentName}
              onEnd={(w) => finishMatch(w === 'op' ? 'op' : 'me')}
            />
          </motion.main>
        )}

        {/* ── ROUND END ── */}
        {phase === 'roundEnd' && roundWinner && (
          <motion.main
            key="re"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-6"
          >
            <motion.div
              initial={{ scale: 0.7, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="rounded-[12px] px-10 py-6"
              style={{
                background:
                  roundWinner === 'me' ? 'var(--td-orange)' : roundWinner === 'tie' ? 'var(--td-paper)' : 'var(--td-steel-deep)',
                boxShadow: '7px 7px 0 #000',
              }}
            >
              <span
                className="text-3xl md:text-4xl"
                style={{ ...TD_DISPLAY, color: roundWinner === 'op' ? 'var(--td-white)' : '#0d0d0d' }}
              >
                {roundWinner === 'me' ? TD.roundWon : roundWinner === 'tie' ? TD.roundTie : TD.roundLost}
              </span>
            </motion.div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70" style={TD_DISPLAY}>
                {TD.matchScore}
              </span>
              <span className="text-3xl text-white" style={TD_DISPLAY}>
                {roundsWon.me} - {roundsWon.op}
              </span>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={continueAfterRound}
              className="rounded-[12px] px-8 py-3.5"
              style={{ ...TD_DISPLAY, background: 'var(--td-white)', color: '#0d0d0d', boxShadow: '5px 5px 0 #000', fontSize: 15 }}
            >
              {matchDecidedNow ? TD.seeResults : TD.nextRound}
            </motion.button>
          </motion.main>
        )}

        {/* ── MATCH END (prototype: only round 1 exists) ── */}
        {phase === 'matchEnd' && (
          <motion.main
            key="me"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-7 px-6"
          >
            <span className="text-[11px] text-white/55" style={TD_DISPLAY}>
              {TD.resultsTitle}
            </span>
            <motion.div
              initial={{ scale: 0.7, rotate: -6, opacity: 0 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="rounded-[12px] px-10 py-6"
              style={{
                background: matchWinner === 'me' ? 'var(--td-orange)' : 'var(--td-steel-deep)',
                boxShadow: '7px 7px 0 #000',
              }}
            >
              <span
                className="text-3xl md:text-4xl"
                style={{ ...TD_DISPLAY, color: matchWinner === 'me' ? '#0d0d0d' : 'var(--td-white)' }}
              >
                {matchWinner === 'me' ? TD.matchWon : TD.matchLost}
              </span>
            </motion.div>
            <div className="flex flex-col items-center gap-2.5">
              <span className="text-sm text-white/70" style={TD_DISPLAY}>
                {TD.matchScore}
              </span>
              <div className="flex items-center gap-5">
                <MyAvatar size={48} />
                <span className="text-3xl text-white" style={TD_DISPLAY}>
                  {roundsWon.me} - {roundsWon.op}
                </span>
                <TdAvatar name={opponentName} size={48} />
              </div>
            </div>

            {/* QP settlement — ranked-style results card */}
            <div
              className="w-full max-w-sm rounded-[16px] px-5 py-5"
              style={{ background: 'var(--td-charcoal)', boxShadow: '6px 6px 0 #000' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/60" style={TD_DISPLAY}>
                  {TD.wlQpLabel}
                </span>
                <motion.span
                  initial={{ scale: 1.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: 'spring', damping: 11 }}
                  className="text-2xl"
                  style={{ ...TD_DISPLAY, color: qpEarned >= 0 ? 'var(--td-orange)' : 'var(--td-steel)' }}
                >
                  {qpEarned >= 0 ? `+${qpEarned}` : `−${-qpEarned}`}
                </motion.span>
              </div>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }}>
                <motion.div
                  initial={{ width: `${Math.min(100, Math.round((prevQpForResults / QP_TARGET) * 100))}%` }}
                  animate={{ width: `${Math.min(100, Math.round((qp / QP_TARGET) * 100))}%` }}
                  transition={{ delay: 0.7, duration: 0.9, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'var(--td-orange)' }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] tabular-nums text-white/70" style={TD_DISPLAY}>
                  {Math.min(qp, QP_TARGET)}/{QP_TARGET}
                </span>
                {qp >= QP_TARGET && (
                  <span className="text-[11px]" style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }}>
                    {TD.wlQualified}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={startMatch}
                className="rounded-[12px] px-7 py-3.5 text-sm"
                style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', boxShadow: '5px 5px 0 #000' }}
              >
                {TD.playAgain}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={resetToHome}
                className="rounded-[12px] px-7 py-3.5 text-sm"
                style={{ ...TD_DISPLAY, background: 'var(--td-charcoal)', color: 'var(--td-white)', boxShadow: '5px 5px 0 #000' }}
              >
                {TD.backHome}
              </motion.button>
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Boot splash — Quizball brand lockup for the embedded context */}
      <AnimatePresence>{booting && <TdLoader />}</AnimatePresence>

      {/* Dev-only round skip — steer outcomes for quick flow testing. */}
      {process.env.NODE_ENV !== 'production' && inRoundPhase && (
        <div
          className="fixed bottom-24 right-2.5 z-50 flex flex-col gap-1 rounded-[10px] p-1.5 opacity-70"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          {(
            [
              ['✓', 'me'],
              ['✗', 'op'],
              ['=', 'tie'],
            ] as const
          ).map(([label, result]) => (
            <button
              key={label}
              type="button"
              onClick={() => devSkip(result)}
              className="flex size-8 items-center justify-center rounded-[8px] text-sm"
              style={{
                ...TD_DISPLAY,
                background: result === 'me' ? 'var(--td-orange)' : 'var(--td-charcoal)',
                color: result === 'me' ? '#0d0d0d' : 'var(--td-white)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
