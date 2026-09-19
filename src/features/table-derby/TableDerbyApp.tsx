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
import { TD_DISPLAY, BetssonWordmark, TdLogoSticker, MuralBackdrop, BoltGlyph, StarburstGlyph } from './components/brand';
import { CategoryBand, PlayerBoard, ScorePill, TurnTimerBar } from './components/chrome';
import { TdDailyGame, type TdDailyType } from './components/DailyGames';
import { TdLoader } from './components/Loader';
import { MyAvatar, TdAvatar, TD_AVATAR_COLORS, tdAvatarCustomization } from './components/Avatar';
import { AvatarPreview } from '@/components/AvatarPreview';
import { TdClubSelect } from './components/ClubSelect';
import { TdProfileCard, opponentProfile } from './components/ProfileCard';
import { getClub } from '@/lib/clubs';

import { MOCK_USER } from './lib/mockUser';
import { Shell } from './shell/Shell';
import type { ShellTab } from './shell/nav';
import { HomeScreen } from './shell/HomeScreen';
import { DailyScreen } from './shell/DailyScreen';
import { SoloScreen } from './shell/SoloScreen';
import { LeaderboardScreen } from './shell/LeaderboardScreen';
import { ProfileScreen } from './shell/ProfileScreen';
import { NoTicketsModal } from './shell/NoTicketsModal';
import { CardsRound } from './components/CardsRound';
import { BoxRound } from './components/BoxRound';
import { BuzzerRound, type BuzzerItem } from './components/BuzzerRound';
import { TD_CARD_CATEGORIES, type TdCardCategory } from './data/cards';
import { TD_BOX_CARDS } from './data/box';
import { TD_WHOAMI } from './data/whoami';

import {
  QP_LOSS,
  QP_WIN,
  addQp,
  getQp,
  clearFavClub,
  getAvatarColor,
  getFavClub,
  getTickets,
  isOnboarded,
  resetOnboarding,
  resetTickets,
  setAvatarColor,
  type TdAvatarColor,
  setFavClub,
  setOnboarded,
  spendTicket,
} from './lib/state';

type Phase =
  | 'home' // the shell (tabs)
  | 'onboarding'
  | 'dailyGame'
  | 'matchmaking'
  | 'showdown'
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
  const rows = [...LB_MOCK, { name: MOCK_USER.name, points: myQp, me: true }];
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
  const [dailyGame, setDailyGame] = useState<TdDailyType | null>(null);
  const [favClub, setFavClubState] = useState<string | null>(null);
  const [tab, setTab] = useState<ShellTab>('home');
  const [matchMode, setMatchMode] = useState<'ranked' | 'solo'>('ranked');
  const [noTickets, setNoTickets] = useState(false);
  const [qpEarned, setQpEarned] = useState(0); // signed match QP delta
  const [booting, setBooting] = useState(true);
  const [onbStep, setOnbStep] = useState<0 | 1>(0);
  const [onbAvatar, setOnbAvatar] = useState<TdAvatarColor>('green');
  const [onbClub, setOnbClub] = useState<string | null>(null);

  // Boot loader (Betsson WebView/iframe entry): brand splash while key
  // assets warm up, minimum 5s so the Quizball lockup registers.
  useEffect(() => {
    // dev deep links skip the splash for fast iteration
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.has('round')) {
        setBooting(false);
        return;
      }
      const t = q.get('tab');
      if (t && (['home', 'ranked', 'daily', 'solo', 'profile'] as const).some((k) => k === t)) {
        setTab(t as ShellTab);
        setBooting(false);
        return;
      }
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
  const matchAwarded = useRef(false);

  // RPS (played on the showdown screen; picks badge onto the cards)
  const [rpsReady, setRpsReady] = useState(false);
  const [myPick, setMyPick] = useState<RpsPick | null>(null);
  const [opPick, setOpPick] = useState<RpsPick | null>(null);
  const [rpsResult, setRpsResult] = useState<'me' | 'op' | 'tie' | null>(null);

  // Match-intro stinger: matched -> showdown -> into round 1.
  const introAudioRef = useRef<HTMLAudioElement | null>(null);
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
    if (phase !== 'home') return;
    setTickets(getTickets());
    setQp(getQp());
    setFavClubState(getFavClub());
  }, [phase]);

  /* ── flow: menu → matchmaking → showdown → rps ──────────────── */

  const startMatch = (mode: 'ranked' | 'solo' = matchMode) => {
    if (mode === 'ranked') {
      if (getTickets() <= 0) {
        setNoTickets(true);
        setPhase('home');
        return;
      }
      setTickets(spendTicket());
    }
    setMatchMode(mode);
    setQpEarned(0);
    setOpponentName(OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)]);
    setRoundsWon({ me: 0, op: 0 });
    setRoundWinner(null);
    setMatchWinner(null);
    setCurrentRound(1);
    matchAwarded.current = false;
    setPhase('matchmaking');
    // Created on the click (user gesture) so the delayed play is allowed.
    try {
      introAudioRef.current ??= new Audio('/assets/betsson/table-derby-intro-sound.m4a');
      introAudioRef.current.load();
    } catch {
      /* audio unsupported/blocked — silent fallback */
    }
    later(() => {
      setPhase('showdown');
      const a = introAudioRef.current;
      if (a) {
        a.currentTime = 0;
        a.volume = 0.9;
        void a.play().catch(() => {});
      }
    }, 2800);
    setMyPick(null);
    setOpPick(null);
    setRpsResult(null);
    setRpsReady(false);
    later(() => setRpsReady(true), 4400);
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
        // Prefer a photo-backed category — the show's cards carry pictures.
        const photoCats = TD_CARD_CATEGORIES.filter((cat) => cat.cards.some((card) => card.photo));
        const pool = photoCats.length > 0 ? photoCats : TD_CARD_CATEGORIES;
        setCardCategory(pool[Math.floor(Math.random() * pool.length)]);
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
      if (matchMode === 'ranked') {
        const delta = winner === 'me' ? QP_WIN : -QP_LOSS;
        setQpEarned(delta);
        setQp(addQp(delta));
      }
    }
    setMatchWinner(winner);
    setPhase('matchEnd');
  }, [matchMode]);

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

  /* TEMP identity until the Betsson handoff: fall back to mock data so
     every profile surface shows real-looking content in testing. */
  const displayName = MOCK_USER.name;
  const displayQp = qp;
  const displayClub = favClub;

  const leaderboardRows = useMemo(() => buildLeaderboard(displayQp), [displayQp]);
  const myRank = leaderboardRows.findIndex((r) => r.me) + 1;
  const openDaily = (key: TdDailyType) => {
    setDailyGame(key);
    setPhase('dailyGame');
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
    <div className="td-theme relative min-h-dvh overflow-x-clip" style={{ background: phase === 'home' ? 'var(--bs-page)' : 'var(--td-bg)' }}>
      {phase !== 'home' && <MuralBackdrop dim={0.45} />}

      {/* betsson.sport — top-right like the broadcast; the in-round
          scoreboard (with avatars) owns that zone during gameplay */}
      {!inRoundPhase && phase !== 'home' && (
        <div className="absolute inset-x-0 bottom-4 z-20 flex items-center justify-center gap-2 md:bottom-6">
          <BetssonWordmark tone="white" size={16} />
          <span className="text-sm" style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }} aria-hidden>
            ✕
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element -- local brand asset */}
          <img src="/assets/brand/quizball-logo.webp" alt="Quizball" className="h-6 w-auto" />
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
              <div className="grid grid-cols-3 gap-4">
                {TD_AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setOnbAvatar(color)}
                    aria-pressed={onbAvatar === color}
                    className="relative flex size-[76px] items-center justify-center overflow-hidden rounded-full transition-transform hover:-translate-y-0.5"
                    style={{
                      background: 'var(--td-charcoal)',
                      boxShadow: '3px 4px 0 rgba(0,0,0,0.5)',
                      outline: onbAvatar === color ? '3px solid var(--td-orange)' : '3px solid transparent',
                      outlineOffset: 3,
                    }}
                  >
                    <AvatarPreview customization={tdAvatarCustomization(color)} width={56} className="translate-y-[6%]" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="w-full">
                <TdClubSelect value={onbClub ?? ''} onChange={(v) => setOnbClub(v || null)} />
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
                  setAvatarColor(onbAvatar);
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

        {/* ── SHELL (Betsson-style chrome: tabs on phones, top bar on desktop) ── */}
        {phase === 'home' && (
          <motion.div key="shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Shell tab={tab} onTab={setTab} name={displayName} points={displayQp} tickets={tickets}>
              {tab === 'home' && (
                <HomeScreen
                  onPlayRanked={() => startMatch('ranked')}
                  onDaily={openDaily}
                  onSolo={() => setTab('solo')}
                  onLeaderboard={() => setTab('ranked')}
                  myRank={myRank}
                  dailyDone={{}}
                />
              )}
              {tab === 'ranked' && <LeaderboardScreen rows={leaderboardRows} />}
              {tab === 'daily' && <DailyScreen onOpen={openDaily} done={{}} />}
              {tab === 'solo' && <SoloScreen onStart={() => startMatch('solo')} />}
              {tab === 'profile' && (
                <ProfileScreen
                  name={displayName}
                  points={displayQp}
                  rank={myRank}
                  tickets={tickets}
                  favClub={favClub}
                  onFavClub={(v) => {
                    if (v) setFavClub(v);
                    else clearFavClub();
                    setFavClubState(v);
                  }}
                  onAvatar={setAvatarColor}
                  onResetTickets={() => setTickets(resetTickets())}
                  onReplayOnboarding={() => {
                    resetOnboarding();
                    setOnbStep(0);
                    setOnbClub(null);
                    setPhase('onboarding');
                  }}
                />
              )}
            </Shell>
            {noTickets && (
              <NoTicketsModal
                onClose={() => setNoTickets(false)}
                onSolo={() => {
                  setNoTickets(false);
                  startMatch('solo');
                }}
              />
            )}
          </motion.div>
        )}


        {/* ── DAILY GAME (Quizball challenges in the TD shell) ── */}
        {phase === 'dailyGame' && dailyGame && (
          <motion.main
            key={`dg-${dailyGame}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10"
          >
            <TdDailyGame type={dailyGame} onExit={() => setPhase('home')} />
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

        {/* ── SHOWDOWN + rock-paper-scissors on the cards ── */}
        {phase === 'showdown' && (
          <motion.main
            key="vs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-4 px-6"
          >
            <div className="relative">
              <TdProfileCard name={displayName} color={getAvatarColor()} clubValue={displayClub} points={displayQp} delay={0.15} />
              <AnimatePresence>
                {myPick && (
                  <motion.div
                    key={`me-${myPick}`}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: -6 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', damping: 11 }}
                    className="absolute left-1/2 top-4 z-10 flex size-16 -translate-x-1/2 items-center justify-center rounded-full"
                    style={{ background: 'var(--td-paper)', boxShadow: '4px 4px 0 rgba(0,0,0,0.55)' }}
                  >
                    <span className="text-3xl" aria-hidden>
                      {RPS_META[myPick].glyph}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35, type: 'spring', damping: 10 }}>
              <span className="block text-5xl md:text-6xl" style={{ ...TD_DISPLAY, color: 'var(--td-orange)', transform: 'rotate(-6deg)' }}>
                VS
              </span>
            </motion.div>

            <div className="relative">
              <TdProfileCard
                name={opponentName}
                color={opponentProfile(opponentName).color}
                clubValue={opponentProfile(opponentName).clubValue}
                points={opponentProfile(opponentName).points}
                mirror
                delay={0.35}
              />
              <AnimatePresence>
                {rpsReady && (
                  <motion.div
                    key={opPick ? `op-${opPick}` : 'op-waiting'}
                    initial={{ scale: 0, rotate: 16 }}
                    animate={{ scale: 1, rotate: 5 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', damping: 11 }}
                    className="absolute left-1/2 top-4 z-10 flex size-16 -translate-x-1/2 items-center justify-center rounded-full"
                    style={{ background: 'var(--td-paper)', boxShadow: '4px 4px 0 rgba(0,0,0,0.55)' }}
                  >
                    {opPick ? (
                      <span className="text-3xl" aria-hidden>
                        {RPS_META[opPick].glyph}
                      </span>
                    ) : (
                      <motion.span
                        animate={{ opacity: [0.35, 1, 0.35] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        className="text-2xl"
                        style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }}
                        aria-hidden
                      >
                        ?
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* prompt / result + picks */}
            <div className="flex h-24 flex-col items-center justify-center gap-2.5">
              {rpsResult ? (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-[10px] px-4 py-2 text-base"
                  style={{
                    ...TD_DISPLAY,
                    background: rpsResult === 'tie' ? 'var(--td-white)' : 'var(--td-orange)',
                    color: '#0d0d0d',
                    boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
                  }}
                >
                  {rpsResult === 'tie' ? TD.rpsTie : rpsResult === 'me' ? TD.rpsYouStart : TD.rpsOpponentStarts}
                </motion.span>
              ) : rpsReady ? (
                <>
                  <span className="text-[13px] text-white/75" style={TD_DISPLAY}>
                    {TD.rpsTitle}
                  </span>
                  <div className="flex items-center gap-2.5">
                    {(Object.keys(RPS_META) as RpsPick[]).map((k) => (
                      <motion.button
                        key={k}
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => pickRps(k)}
                        disabled={!!myPick}
                        className="flex flex-col items-center gap-1 rounded-[12px] px-4 py-2.5"
                        style={{
                          background: myPick === k ? 'var(--td-orange)' : 'var(--td-charcoal)',
                          boxShadow: '3px 3px 0 #000',
                          opacity: myPick && myPick !== k ? 0.45 : 1,
                          transition: 'background 0.2s, opacity 0.2s',
                        }}
                      >
                        <span className="text-2xl" aria-hidden>
                          {RPS_META[k].glyph}
                        </span>
                        <span className="text-[10px] text-white" style={TD_DISPLAY}>
                          {RPS_META[k].label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : (
                <span className="rounded-full px-4 py-1.5 text-[11px] md:text-xs" style={{ ...TD_DISPLAY, background: 'var(--td-white)', color: '#0d0d0d' }}>
                  {TD.bestOfRounds}
                </span>
              )}
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
                name={displayName}
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
              <div className="flex items-start gap-5">
                <div className="flex flex-col items-center gap-1.5">
                  <MyAvatar size={48} />
                  <span className="flex items-center gap-1 text-[11px] text-white/85" style={TD_DISPLAY}>
                    {displayName}
                    {getClub(displayClub) && (
                      // eslint-disable-next-line @next/next/no-img-element -- crest from the club registry
                      <img src={getClub(displayClub)!.logo} alt="" className="h-4 w-4 object-contain" />
                    )}
                  </span>
                </div>
                <span className="mt-2 text-3xl text-white" style={TD_DISPLAY}>
                  {roundsWon.me} - {roundsWon.op}
                </span>
                <div className="flex flex-col items-center gap-1.5">
                  <TdAvatar name={opponentName} size={48} />
                  <span className="flex items-center gap-1 text-[11px] text-white/85" style={TD_DISPLAY}>
                    {opponentName}
                    {(() => {
                      const club = opponentProfile(opponentName).clubValue ? getClub(opponentProfile(opponentName).clubValue!) : null;
                      return club ? (
                        // eslint-disable-next-line @next/next/no-img-element -- crest from the club registry
                        <img src={club.logo} alt="" className="h-4 w-4 object-contain" />
                      ) : null;
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* RP settlement — Betsson-style results card */}
            <div className="w-full max-w-sm rounded-[12px] px-5 py-4" style={{ background: 'var(--bs-surface)' }}>
              <div className="flex items-center justify-between">
                <span className="bs-text text-[12px] text-[var(--bs-text-3)]">{matchMode === 'solo' ? TD.soloNoRp : TD.rpDelta}</span>
                {matchMode === 'ranked' && (
                  <motion.span
                    initial={{ scale: 1.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring', damping: 11 }}
                    className="text-2xl"
                    style={{ ...TD_DISPLAY, color: qpEarned >= 0 ? 'var(--bs-primary)' : 'var(--bs-text-2)' }}
                  >
                    {qpEarned >= 0 ? `+${qpEarned}` : `−${-qpEarned}`}
                  </motion.span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="bs-text text-[12px] text-[var(--bs-text-3)]">{TD.rpTotal}</span>
                <span className="font-[Poppins] text-[15px] font-bold tabular-nums text-[var(--bs-text)]">{qp} {TD.qpShort}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => startMatch(matchMode)}
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
