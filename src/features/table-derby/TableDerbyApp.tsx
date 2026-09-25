'use client';

/**
 * Table Derby — frontend prototype of the online show adaptation.
 * Flow: home → matchmaking (mock) → showdown → rock-paper-scissors →
 * Round 1 "ჩამოთვალე" vs a scripted opponent. Georgian-only UI.
 * The round logic mirrors what the server state machine will own later.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TD, OPPONENT_NAMES } from './lib/copy';
import { TD_DISPLAY, BetssonWordmark, TdLogoSticker, MuralBackdrop, BoltGlyph, StarburstGlyph } from './components/brand';
import { CategoryBand } from './components/chrome';
import { TdDailyGame, type TdDailyType } from './components/DailyGames';
import { TdLoader } from './components/Loader';
import { ElapsedTimer } from './components/ElapsedTimer';
import { ClubCrest } from './components/ClubCrest';
import { MyAvatar, TdAvatar, TD_AVATAR_COLORS, tdAvatarCustomization } from './components/Avatar';
import { AvatarPreview } from '@/components/AvatarPreview';
import { TdClubSelect } from './components/ClubSelect';
import { TdProfileCard, opponentProfile } from './components/ProfileCard';
import { getClub } from '@/lib/clubs';

import { MOCK_USER } from './lib/mockUser';
import { Shell } from './shell/Shell';
import type { ShellTab } from './shell/nav';
import { readNavFromUrl, useShellHistory } from './shell/useShellHistory';
import { HomeScreen } from './shell/HomeScreen';
import { DailyScreen } from './shell/DailyScreen';
import { PracticeScreen } from './streak/PracticeScreen';
import { StreakGame } from './streak/StreakGame';
import { LeaderboardScreen } from './shell/LeaderboardScreen';
import { ProfileScreen } from './shell/ProfileScreen';
import { NoTicketsModal } from './shell/NoTicketsModal';
import { BsButton } from './shell/ui';
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
  recordMatch,
  setOnboarded,
  spendTicket,
} from './lib/state';

type Phase =
  | 'home' // the shell (tabs)
  | 'onboarding'
  | 'dailyGame'
  | 'streak' // practice: streak tournament
  | 'matchmaking'
  | 'showdown'
  | 'category'
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


/** Betsson format (2026-09-16): three rounds worth 1, 1 and 2 points;
 *  equal points after the last round go to penalties. A tied round scores
 *  nobody (pending Betsson's ruling). */
type RoundGame = 'cards' | 'buzzer' | 'box';
type MatchStage = RoundGame | 'penalties';
const MATCH_ROUNDS: { game: RoundGame; points: number }[] = [
  { game: 'cards', points: 1 },
  { game: 'buzzer', points: 1 },
  { game: 'box', points: 2 },
];
const PENALTIES = 'penalties' as const;
const ROUND_NAMES: Record<MatchStage, string> = {
  cards: TD.roundCardsName,
  buzzer: TD.roundBuzzerName,
  box: TD.round3Name,
  penalties: TD.penaltiesName,
};
/** Prefer a photo-backed category — the show's cards carry pictures. */
function pickCardCategory(): TdCardCategory {
  const photoCats = TD_CARD_CATEGORIES.filter((cat) => cat.cards.some((card) => card.photo));
  const pool = photoCats.length > 0 ? photoCats : TD_CARD_CATEGORIES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function roundIndex(stage: MatchStage): number {
  return MATCH_ROUNDS.findIndex((r) => r.game === stage);
}
function roundPoints(stage: MatchStage): number {
  return MATCH_ROUNDS.find((r) => r.game === stage)?.points ?? 0;
}

const RPS_META: Record<RpsPick, { label: string; glyph: string; beats: RpsPick }> = {
  rock: { label: TD.rpsRock, glyph: '✊', beats: 'scissors' },
  paper: { label: TD.rpsPaper, glyph: '✋', beats: 'rock' },
  scissors: { label: TD.rpsScissors, glyph: '✌️', beats: 'paper' },
};

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

const DAILY_KEYS = ['putInOrder', 'careerPath', 'footballLogic'] as const;
function isDailyKey(v: string | null | undefined): v is TdDailyType {
  return !!v && DAILY_KEYS.some((k) => k === v);
}

export function TableDerbyApp() {
  const [phase, setPhase] = useState<Phase>('home');
  const [opponentName, setOpponentName] = useState<string>(OPPONENT_NAMES[0]);
  const [roundsWon, setRoundsWon] = useState<Record<Seat, number>>({ me: 0, op: 0 });
  const [roundWinner, setRoundWinner] = useState<Seat | 'tie' | null>(null);

  // Shell state (localStorage-backed; read after mount to stay SSR-safe).
  const [tickets, setTickets] = useState<number | null>(null);
  const [qp, setQp] = useState(0);
  const [dailyGame, setDailyGame] = useState<TdDailyType | null>(null);
  const [favClub, setFavClubState] = useState<string | null>(null);
  const [tab, setTab] = useState<ShellTab>('home');
  const devRoundLink = useRef(false);
  const [devDailyResult, setDevDailyResult] = useState<{ score: number; reward: boolean } | null>(null);
  const [devStreakResult, setDevStreakResult] = useState<{ score: number; best: number; isRecord: boolean } | null>(null);
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
    // restore the tab from the URL (reload / shared link keeps the screen)
    const urlNav = typeof window !== 'undefined' ? readNavFromUrl(window.location.search) : null;
    if (urlNav) {
      setTab(urlNav.tab);
      if (isDailyKey(urlNav.game)) {
        setDailyGame(urlNav.game);
        setPhase('dailyGame');
      } else if (urlNav.game === 'streak') {
        setPhase('streak');
      }
    }
    // dev deep links skip the splash for fast iteration
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.has('round') || q.has('scene')) {
        devRoundLink.current = true;
        if (q.get('scene') !== 'loader') setBooting(false);
        return;
      }
      if (urlNav) {
        const preset = q.get('result');
        if (preset !== null) setDevDailyResult({ score: Number(preset) || 0, reward: q.get('reward') === '1' });
        const streak = q.get('streak');
        if (streak !== null) {
          const n = Number(streak) || 0;
          setDevStreakResult({ score: n, best: q.get('record') === '1' ? n : Math.max(n, 12), isRecord: q.get('record') === '1' });
        }
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
  const [currentRound, setCurrentRound] = useState<MatchStage>('cards');
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

  /* Dev deep links (see /table-derby/dev for the playground):
     ?round=1|2|3|penalties|sudden[&starter=op] boots straight into a live
     round vs the scripted opponent (no ticket spent);
     ?scene=<name> freezes a single screen so it can be iterated on. */
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;
    const q = new URLSearchParams(window.location.search);
    const starter: Seat = q.get('starter') === 'op' ? 'op' : 'me';
    setOpponentName(OPPONENT_NAMES[0]);
    const p = q.get('round');
    if (p) {
      if (p === 'sudden') startLaterRound(PENALTIES, starter, { suddenDeath: true });
      const game = p === 'penalties' ? PENALTIES : MATCH_ROUNDS[Number(p) - 1]?.game;
      if (game) startLaterRound(game, starter);
      return;
    }
    const scene = q.get('scene');
    if (!scene) return;
    const intro = (stage: MatchStage, sudden = false) => {
      setCurrentRound(stage);
      if (stage === 'cards') setCardCategory(pickCardCategory());
      setSuddenDeath(sudden);
      setPhase('category');
    };
    const roundEnd = (stage: MatchStage, winner: Seat | 'tie', score: Record<Seat, number>) => {
      setCurrentRound(stage);
      setRoundsWon(score);
      setRoundWinner(winner);
      setPhase('roundEnd');
    };
    const matchEnd = (mode: 'ranked' | 'solo', winner: Seat, score: Record<Seat, number>) => {
      matchAwarded.current = true;
      setMatchMode(mode);
      setRoundsWon(score);
      setMatchWinner(winner);
      setQpEarned(mode === 'solo' ? 0 : winner === 'me' ? QP_WIN : -QP_LOSS);
      setPhase('matchEnd');
    };
    const scenes: Record<string, () => void> = {
      onboarding: () => setPhase('onboarding'),
      'no-tickets': () => setNoTickets(true),
      matchmaking: () => setPhase('matchmaking'),
      showdown: () => {
        setRpsReady(true);
        setPhase('showdown');
      },
      'intro-1': () => intro('cards'),
      'intro-2': () => intro('buzzer'),
      'intro-3': () => intro('box'),
      'intro-penalties': () => intro(PENALTIES),
      'intro-sudden': () => intro(PENALTIES, true),
      'round-end-win': () => roundEnd('cards', 'me', { me: 1, op: 0 }),
      'round-end-lose': () => roundEnd('buzzer', 'op', { me: 1, op: 1 }),
      'round-end-tie-last': () => roundEnd('box', 'tie', { me: 1, op: 1 }),
      'round-end-decider': () => roundEnd('box', 'me', { me: 3, op: 1 }),
      'match-end-win': () => matchEnd('ranked', 'me', { me: 3, op: 1 }),
      'match-end-lose': () => matchEnd('ranked', 'op', { me: 1, op: 3 }),
      'match-end-solo': () => matchEnd('solo', 'me', { me: 2, op: 2 }),
    };
    scenes[scene]?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- boot-once dev hook
  }, []);

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
    roundInstance.current += 1; // callbacks from any previous match are now stale
    setQpEarned(0);
    setOpponentName(OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)]);
    setRoundsWon({ me: 0, op: 0 });
    setRoundWinner(null);
    setMatchWinner(null);
    setCurrentRound('cards');
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

  /** Every round and the penalties share the intro → play cadence. */
  const startLaterRound = useCallback(
    (stage: MatchStage, starter: Seat, opts: { suddenDeath?: boolean } = {}) => {
      roundInstance.current += 1;
      setActiveInstance(roundInstance.current);
      setCurrentRound(stage);
      setStarterSeat(starter);
      setRoundWinner(null);
      if (stage === 'cards') setCardCategory(pickCardCategory());
      if (stage === 'buzzer') setBuzzerItems(shuffleList(TD_WHOAMI));
      if (stage === 'penalties') {
        // Regulation is 10 questions; after a tied set, one question at a time.
        const pool = buildPenaltyPool();
        const first = opts.suddenDeath ? 1 : 10;
        setSuddenDeath(!!opts.suddenDeath);
        setPenaltyItems(pool.slice(0, first));
        setPenaltySpare(pool.slice(first));
      }
      setPhase('category');
      later(() => setPhase(stage), 3000);
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
          startLaterRound(MATCH_ROUNDS[0].game, result);
        }, 1800);
      }
    }, 800);
  };

  /* ── round engine ───────────────────────────────────────────── */

  /* Each started round/penalty set gets an instance number. Round components
     keep timers after a dev skip or unmount, so their onEnd is bound to the
     instance they were mounted for; stale or repeated calls are ignored. */
  const roundInstance = useRef(0);
  const [activeInstance, setActiveInstance] = useState(0);
  const settledInstance = useRef(-1);
  const [suddenDeath, setSuddenDeath] = useState(false);

  const endRound = useCallback(
    (winner: Seat | 'tie', instance: number, stage: MatchStage) => {
      if (instance !== roundInstance.current || settledInstance.current === instance) return;
      settledInstance.current = instance;
      setRoundWinner(winner);
      const pts = roundPoints(stage);
      if (winner !== 'tie') setRoundsWon((s) => ({ ...s, [winner]: s[winner] + pts }));
      later(() => setPhase('roundEnd'), 1100);
    },
    [later],
  );

  /** Match settlement — QP like Quizball ranked: win +25, loss −10 (floor 0).
   *  Real product: server-side at settlement. */
  // latest score/opponent for settlement without re-creating finishMatch
  const settleCtx = useRef({ score: roundsWon, opponent: opponentName, stage: currentRound });
  useEffect(() => {
    settleCtx.current = { score: roundsWon, opponent: opponentName, stage: currentRound };
  });

  const finishMatch = useCallback((winner: Seat) => {
    if (matchAwarded.current) return; // a match settles exactly once
    matchAwarded.current = true;
    const delta = matchMode === 'ranked' ? (winner === 'me' ? QP_WIN : -QP_LOSS) : 0;
    if (matchMode === 'ranked') {
      setQpEarned(delta);
      setQp(addQp(delta));
    }
    const ctx = settleCtx.current;
    recordMatch({
      at: Date.now(),
      mode: matchMode,
      won: winner === 'me',
      me: ctx.score.me,
      op: ctx.score.op,
      opponent: ctx.opponent,
      rpDelta: delta,
      penalties: ctx.stage === PENALTIES,
    });
    setMatchWinner(winner);
    setPhase('matchEnd');
  }, [matchMode]);

  /** Penalties end: a winner settles the match; running out of questions
   *  with scores level starts another sudden-death set (never a default win). */
  const settlePenalties = (winner: Seat | 'tie', instance: number) => {
    if (instance !== roundInstance.current || settledInstance.current === instance) return;
    settledInstance.current = instance;
    if (winner === 'tie') {
      startLaterRound(PENALTIES, starterSeat === 'me' ? 'op' : 'me', { suddenDeath: true });
      return;
    }
    finishMatch(winner);
  };

  /** After the round-end screen: next round, penalties, or results. */
  const continueAfterRound = () => {
    // Loser starts the next round; a tied round flips the previous starter.
    const nextStart: Seat =
      roundWinner === 'me' ? 'op' : roundWinner === 'op' ? 'me' : starterSeat === 'me' ? 'op' : 'me';
    const next = MATCH_ROUNDS[roundIndex(currentRound) + 1];
    if (next) {
      startLaterRound(next.game, nextStart);
      return;
    }
    if (roundsWon.me === roundsWon.op) {
      startLaterRound(PENALTIES, nextStart);
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

  useShellHistory({
    active: !booting && phase !== 'onboarding' && !devRoundLink.current,
    nav: useMemo(
      () => ({ tab, game: phase === 'dailyGame' ? dailyGame : phase === 'streak' ? 'streak' : phase === 'home' ? null : 'match' }),
      [tab, phase, dailyGame],
    ),
    onPop: (target) => {
      timeouts.current.forEach(clearTimeout);
      setTab(target.tab);
      if (isDailyKey(target.game)) {
        setDailyGame(target.game);
        setPhase('dailyGame');
        return { tab: target.tab, game: target.game };
      }
      if (target.game === 'streak') {
        setPhase('streak');
        return { tab: target.tab, game: 'streak' };
      }
      // A match can't be resumed from history; land on the shell instead.
      roundInstance.current += 1;
      setRoundWinner(null);
      setPhase('home');
      return { tab: target.tab, game: null };
    },
  });

  /** Whether the match is settled once this round-end screen is confirmed. */
  const matchDecidedNow = roundIndex(currentRound) === MATCH_ROUNDS.length - 1 && roundsWon.me !== roundsWon.op;

  /* Dev-only quick skip: force the current round's outcome. */
  const inRoundPhase = phase === 'cards' || phase === 'box' || phase === 'buzzer' || phase === 'penalties';
  const devSkip = (result: Seat | 'tie') => {
    if (phase === 'penalties') {
      settlePenalties(result, roundInstance.current);
      return;
    }
    endRound(result, roundInstance.current, currentRound);
  };

  const resetToHome = () => {
    roundInstance.current += 1;
    setRoundWinner(null);
    setPhase('home');
  };

  /* ── screens ────────────────────────────────────────────────── */

  return (
    <div className="td-theme relative min-h-dvh overflow-x-clip" style={{ background: phase === 'home' || phase === 'streak' ? 'var(--bs-page)' : 'var(--td-bg)' }}>
      {phase !== 'home' && phase !== 'streak' && <MuralBackdrop dim={0.45} />}

      {/* betsson.sport — top-right like the broadcast; the in-round
          scoreboard (with avatars) owns that zone during gameplay */}
      {!inRoundPhase && phase !== 'home' && phase !== 'streak' && (
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
            <BsButton
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
              className="max-w-xs"
            >
              {onbStep === 0 ? TD.onbNext : TD.onbStart}
            </BsButton>
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
                  dailyDone={{}}
                />
              )}
              {tab === 'leaderboard' && <LeaderboardScreen rows={leaderboardRows} />}
              {tab === 'daily' && <DailyScreen onOpen={openDaily} done={{}} />}
              {tab === 'solo' && <PracticeScreen onStart={() => setPhase('streak')} />}
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
                  setTab('solo');
                }}
              />
            )}
          </motion.div>
        )}


        {/* ── PRACTICE: streak tournament (Betsson REQ.1.8–1.10) ── */}
        {phase === 'streak' && (
          <motion.main key="streak" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10">
            <StreakGame onExit={() => window.history.back()} preset={devStreakResult} />
          </motion.main>
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
            <TdDailyGame type={dailyGame} onExit={() => window.history.back()} presetResult={devDailyResult} />
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
            <ElapsedTimer
              className="rounded-full px-5 py-2 font-[Poppins] text-[22px] font-bold tabular-nums text-white md:text-[26px]"
              style={{ background: 'var(--bs-surface)', boxShadow: 'inset 0 0 0 1.5px var(--bs-border)' }}
            />
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
            key={`cat-${currentRound}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-6 px-4 md:px-10"
          >
            <div className="flex items-center gap-3">
              <StarburstGlyph size={20} />
              <span className="text-lg text-white md:text-xl" style={TD_DISPLAY}>
                {currentRound === PENALTIES
                  ? TD.penaltiesName
                  : `${TD.roundLabel} ${roundIndex(currentRound) + 1} · ${ROUND_NAMES[currentRound]}`}
              </span>
              <StarburstGlyph size={20} rotate={20} />
            </div>
            {currentRound !== PENALTIES && (
              <span
                className="rounded-full px-4 py-1.5 text-[12px]"
                style={{ ...TD_DISPLAY, background: 'var(--td-orange)', color: '#0d0d0d', lineHeight: 1.2 }}
              >
                {TD.roundWorth(roundPoints(currentRound))}
              </span>
            )}
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 16 }}
              className="w-full max-w-2xl"
            >
              {currentRound === 'cards' && cardCategory && <CategoryBand prompt={cardCategory.prompt} />}
              {currentRound === 'box' && <CategoryBand prompt={TD.rollBox} />}
              {currentRound === 'buzzer' && <CategoryBand prompt={`${TD.buzzRules} · +10 / −10`} />}
              {currentRound === PENALTIES && <CategoryBand prompt={suddenDeath ? TD.suddenDeath : TD.penaltiesIntro} />}
            </motion.div>
          </motion.main>
        )}

        {/* ── ROUND I: CARDS (1 point) ── */}
        {phase === 'cards' && cardCategory && (
          <motion.main
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh w-full flex-col justify-center px-3 py-4 md:px-8"
          >
            <CardsRound
              key={activeInstance}
              category={cardCategory}
              starter={starterSeat}
              roundsWon={roundsWon}
              opponentName={opponentName}
              onEnd={(w) => endRound(w, activeInstance, 'cards')}
            />
          </motion.main>
        )}

        {/* ── ROUND III: PAPA CARLO'S BOX (2 points) ── */}
        {phase === 'box' && (
          <motion.main
            key="box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh w-full flex-col justify-center px-3 py-4 md:px-8"
          >
            <BoxRound
              key={activeInstance}
              starter={starterSeat}
              roundsWon={roundsWon}
              opponentName={opponentName}
              onEnd={(w) => endRound(w, activeInstance, 'box')}
            />
          </motion.main>
        )}

        {/* ── ROUND II: HELLO, MY NAME IS (BUZZER, 1 point) ── */}
        {phase === 'buzzer' && buzzerItems.length > 0 && (
          <motion.main
            key="buzzer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex min-h-dvh w-full flex-col justify-center px-3 py-4 md:px-8"
          >
            <BuzzerRound
              key={activeInstance}
              items={buzzerItems}
              roundsWon={roundsWon}
              opponentName={opponentName}
              onEnd={(w) => endRound(w, activeInstance, 'buzzer')}
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
              key={activeInstance}
              items={penaltyItems}
              extraPool={penaltySpare}
              penaltyMode
              roundsWon={roundsWon}
              opponentName={opponentName}
              onEnd={(w) => settlePenalties(w, activeInstance)}
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
            {roundWinner !== 'tie' && (
              <span className="text-[13px] text-white/80" style={{ ...TD_DISPLAY, lineHeight: 1.3 }}>
                {roundWinner === 'me' ? TD.pointsYou(roundPoints(currentRound)) : TD.pointsOpponent(roundPoints(currentRound))}
              </span>
            )}
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70" style={TD_DISPLAY}>
                {TD.matchScore}
              </span>
              <span className="text-3xl text-white" style={TD_DISPLAY}>
                {roundsWon.me} - {roundsWon.op}
              </span>
            </div>
            <BsButton onClick={continueAfterRound} className="max-w-xs">
              {matchDecidedNow
                ? TD.seeResults
                : roundIndex(currentRound) === MATCH_ROUNDS.length - 1
                  ? TD.penaltiesName
                  : TD.nextRound}
            </BsButton>
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
                    {getClub(displayClub) && <ClubCrest src={getClub(displayClub)!.logo} size={22} />}
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
                      return club ? <ClubCrest src={club.logo} size={22} /> : null;
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
            <div className="flex w-full max-w-sm flex-col gap-3">
              <BsButton onClick={() => startMatch(matchMode)}>{TD.playAgain}</BsButton>
              <BsButton variant="ghost" onClick={resetToHome}>
                {TD.backHome}
              </BsButton>
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
