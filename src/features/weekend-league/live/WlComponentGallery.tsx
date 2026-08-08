'use client';

// /dev/wl → GALLERY: every Weekend League UI piece isolated on its own, so a
// single component can be styled without walking a whole match to reach it.
// These are the SAME components live play renders — edit one and both the
// gallery and the real game change.

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { CheckInPanel } from '../components/CheckInPanel';
import { MoneyDropBoard } from '../gauntlet/MoneyDropBoard';
import { PutInOrderBoard } from '../gauntlet/PutInOrderBoard';
import { CutlineBoard, RankDeltaMoment, RankPill, SideLeaderboard, YourRankCard, type CutBoardRow } from '../gauntlet/RankStatus';
import { QuestionKindBadge } from '@/features/possession/components/live-special/shared';
import { LeagueCountdown } from '../components/LeagueCountdown';
import { LiveBadge } from '../components/LiveBadge';
import { poppins } from '../constants';
import {
  AnswerBtn,
  GauntletHeader,
  QuestionCard,
  RoundIntroOverlay,
} from '../gauntlet/RoundChrome';
import {
  AnswerOptionList,
  CareerPathCard,
  GauntletBackdrop,
  HigherLowerCard,
  PairAnswers,
  RoundScreenShell,
  TypedAnswerPanel,
  WhoAmIClueLadder,
} from '../gauntlet/RoundViews';
import {
  AnswerReveal,
  BreakScreen,
  ChampionScreen,
  EliminationReveal,
  GameIntro,
  GameResult,
  GauntletLobby,
} from '../gauntlet/GauntletScreens';
import { buildGames, ROUNDS } from '../gauntlet/gauntlet.data';

const FIELD = 600;
const GAMES = buildGames(FIELD);
const ROUND = ROUNDS[0];
const noop = () => {};

/** Demo board rows in the live payload shape. */
const BOARD = [
  { user_id: 'sim-you', nickname: 'You', points: 350, time_ms_total: 28_000, rank: 1 },
  { user_id: 'b1', nickname: 'zaqoo', points: 203, time_ms_total: 30_000, rank: 2 },
  { user_id: 'b2', nickname: 'Totti10', points: 201, time_ms_total: 31_000, rank: 3 },
  { user_id: 'b3', nickname: 'Nika77', points: 178, time_ms_total: 32_000, rank: 4 },
  { user_id: 'b4', nickname: 'gio_beqa', points: 176, time_ms_total: 33_000, rank: 5 },
];

type Entry = { id: string; label: string; group: string; render: () => React.ReactNode };

const CUT_FIELD = 120;
const CUT = 60;

function cutBoard(): CutBoardRow[] {
  const names = ['BOBBIGOL', 'ZAQOO', 'TOTTI10', 'NIKA77', 'GIO_BEQA', 'TALAKHA', 'RAMOS248', 'ELOSHA69', 'GRANDIOZA', 'SILVIO'];
  return Array.from({ length: CUT_FIELD - 1 }, (_, i) => {
    const rank = i + 1;
    return {
      user_id: `p${rank}`,
      nickname: `${names[rank % names.length]}${rank}`,
      points: Math.max(0, 640 - rank * 5 - (rank % 7)),
      rank,
    };
  });
}

function boardWithYou(yourRank: number): CutBoardRow[] {
  const others = cutBoard();
  const rows = [...others.map((r) => ({ ...r }))];
  rows.splice(yourRank - 1, 0, { user_id: 'sim-you', nickname: 'შენ', points: 641 - yourRank * 5, rank: 0 });
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Shared sim state: your points move the board; ranks recompute; the side
 *  board layout-animates so movement is visible the moment you answer. */
function useRankSim() {
  const [you, setYou] = useState({ points: 312, prevRank: 0, picked: null as null | 'a' | 'b' });
  const others = cutBoard();
  const rows = [
    ...others.filter((r) => r.user_id !== 'sim-you'),
    { user_id: 'sim-you', nickname: 'შენ', points: you.points, rank: 0 },
  ]
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const yourRank = rows.find((r) => r.user_id === 'sim-you')!.rank;
  const answer = (key: 'a' | 'b') => {
    if (you.picked) return;
    setYou({ points: you.points + (key === 'a' ? 30 : 0), prevRank: yourRank, picked: key });
  };
  const reset = () => setYou({ points: 312, prevRank: 0, picked: null });
  const revealed = you.picked != null;
  const delta = revealed ? you.prevRank - yourRank : 0;
  return { rows, yourRank, yourPoints: you.points, revealed, correct: you.picked === 'a', delta, answer, reset };
}

function SimQuestion({ sim, pillTopLeft }: { sim: ReturnType<typeof useRankSim>; pillTopLeft: boolean }) {
  const info = { rank: sim.yourRank, field: CUT_FIELD, cut: CUT, delta: sim.delta };
  return (
    <div>
      <GauntletHeader
        gameIndex={0} round={ROUND} score={sim.yourPoints} rank={sim.yourRank}
        secondsLeft={sim.revealed ? 0 : 7} step="3/5" onQuit={noop}
      />
      {pillTopLeft && (
        <div className="mx-auto -mt-1 flex max-w-3xl items-center justify-start px-4">
          <RankPill {...info} />
        </div>
      )}
      <div className="mx-auto mt-2 w-full max-w-3xl px-4">
        <QuestionCard>ზიდანმა 2006 წლის ფინალში წითელი ბარათი მიიღო.</QuestionCard>
        <PairAnswers
          choices={[
            { key: 'a', label: 'მართალია', state: sim.revealed ? (sim.correct ? 'correct' : 'faded') : 'idle' },
            { key: 'b', label: 'მცდარია', state: sim.revealed ? (sim.correct ? 'faded' : 'wrong') : 'idle' },
          ]}
          disabled={sim.revealed}
          onPick={(key) => sim.answer(key as 'a' | 'b')}
        />
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={sim.reset}
            className="flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 font-poppins text-[11px] font-black uppercase tracking-wide text-white hover:opacity-90">
            <RotateCcw className="size-3.5" /> Replay
          </button>
        </div>
      </div>
    </div>
  );
}

/** WEB: question left, docked realtime board right — your card pinned on
 *  top, full field scrollable underneath with the cut line drawn. */
function RankSimWeb() {
  const sim = useRankSim();
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_300px] gap-5 px-4 py-6">
      <SimQuestion sim={sim} pillTopLeft={false} />
      <div className="flex flex-col gap-2.5">
        <YourRankCard nickname="შენ" points={sim.yourPoints}
          info={{ rank: sim.yourRank, field: CUT_FIELD, cut: CUT, delta: sim.delta }} />
        <SideLeaderboard board={sim.rows} selfUserId="sim-you" cut={CUT} className="h-[480px]" />
      </div>
    </div>
  );
}

/** MOBILE: no side board — the always-on pill top-left carries rank + move. */
function RankSimMobile() {
  const sim = useRankSim();
  return (
    <div className="mx-auto w-[375px] rounded-[28px] border border-white/15 py-3">
      <SimQuestion sim={sim} pillTopLeft />
    </div>
  );
}


const PIO_ITEMS = [
  { id: 'p1', label: 'ჰაკიმ ზიეში', emoji: null },
  { id: 'p2', label: 'ბენ ჩილუელი', emoji: null },
  { id: 'p3', label: 'ტიმო ვერნერი', emoji: null },
  { id: 'p4', label: 'რაჰიმ სტერლინგი', emoji: null },
];

/** The live sequence in miniature: arrange → submit → a server-ish beat →
 *  the ranked comparison reveal, replayable. Reveal skips straight there. */
function PutInOrderRevealDemo() {
  const [run, setRun] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const scheduleReveal = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(true), 1_200);
  };
  return (
    <div key={run}>
      <Frame>
        <div className="relative z-10 flex min-h-[42px] items-center justify-start pl-3">
          <div className="translate-y-4">
            <QuestionKindBadge kind="putInOrder" />
          </div>
        </div>
        <QuestionCard>დაალაგე ეს გადასვლები ტრანსფერის თანხის მიხედვით (მაღლიდან დაბლისკენ)</QuestionCard>
        <PutInOrderBoard
          items={PIO_ITEMS}
          instruction={null}
          locked={false}
          correctOrder={revealed ? ['p4', 'p3', 'p1', 'p2'] : null}
          onSubmit={scheduleReveal}
        />
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="rounded-lg bg-brand-green px-3 py-2 font-poppins text-[11px] font-black uppercase tracking-wide text-white hover:opacity-90"
          >
            Reveal now
          </button>
          <button
            type="button"
            onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setRun((n) => n + 1); setRevealed(false); }}
            className="flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 font-poppins text-[11px] font-black uppercase tracking-wide text-white hover:opacity-90"
          >
            <RotateCcw className="size-3.5" /> Replay
          </button>
        </div>
      </Frame>
    </div>
  );
}


/** A full question screen (header + body) — what the overlay hands off to. */
function TrueFalseDemo({ overlay }: { overlay?: React.ReactNode }) {
  return (
    <RoundScreenShell
      header={{
        gameIndex: 0, round: ROUND, score: 350, rank: 3,
        secondsLeft: 9, step: '1/5', onQuit: noop,
      }}
      overlay={overlay}
    >
      <QuestionCard>ზიდანმა 1998 წლის მუნდიალის ფინალში ორი გოლი გაიტანა.</QuestionCard>
      <PairAnswers
        choices={[
          { key: 'a', label: 'მართალია', state: 'idle' },
          { key: 'b', label: 'მცდარია', state: 'idle' },
        ]}
        disabled={false}
        onPick={noop}
      />
    </RoundScreenShell>
  );
}

/** Games 2/3 open with the full-screen GAME N card, then the question screen
 *  replaces it entirely — same shape as the live flow. */
function GameIntroSequence() {
  const [run, setRun] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  return (
    <div key={run}>
      {showIntro ? (
        <div className="fixed inset-0 z-50 bg-surface-page-alt">
          <GameIntro game={GAMES[1]} isLastGame={false} onDone={() => setShowIntro(false)} />
        </div>
      ) : (
        <TrueFalseDemo />
      )}
      <button
        type="button"
        onClick={() => { setRun((n) => n + 1); setShowIntro(true); }}
        className="fixed right-3 top-3 z-[70] flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 font-poppins text-[11px] font-black uppercase tracking-wide text-white hover:opacity-90"
      >
        <RotateCcw className="size-3.5" /> Replay
      </button>
    </div>
  );
}

/**
 * Overlay → content, exactly as live play sequences them: the overlay plays,
 * calls back when its beat ends, and the screen underneath takes over. Replay
 * remounts the pair so the animation can be watched repeatedly.
 */
function SequencedDemo({
  overlay,
  screen,
}: {
  overlay: (done: () => void) => React.ReactNode;
  screen: (overlayNode: React.ReactNode) => React.ReactNode;
}) {
  const [run, setRun] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);
  return (
    <div key={run}>
      {screen(showOverlay ? overlay(() => setShowOverlay(false)) : null)}
      <button
        type="button"
        onClick={() => { setRun((n) => n + 1); setShowOverlay(true); }}
        className="fixed right-3 top-3 z-[70] flex items-center gap-1.5 rounded-lg bg-brand-purple px-3 py-2 font-poppins text-[11px] font-black uppercase tracking-wide text-white hover:opacity-90"
      >
        <RotateCcw className="size-3.5" /> Replay
      </button>
    </div>
  );
}

function Frame({ children, pad = true }: { children: React.ReactNode; pad?: boolean }) {
  return (
    <div className={`mx-auto w-full max-w-2xl ${pad ? 'px-4 py-10' : ''}`}>{children}</div>
  );
}

export function WlComponentGallery({
  onExit,
  boardStrip,
}: {
  onExit: () => void;
  /** The live flow's board strip, injected so the gallery shows the real one. */
  boardStrip: (rows: typeof BOARD, selfId: string, count: number) => React.ReactNode;
}) {
  const [typedGuess, setTypedGuess] = useState('');
  // Single mount-time clock: demo deadlines must not be re-read every render.
  const [mountedAt] = useState(() => Date.now());

  const ENTRIES: Entry[] = [
    // ── Chrome ──────────────────────────────────────────────────────────────
    {
      id: 'header', label: 'Question header', group: 'Chrome',
      render: () => (
        <GauntletHeader
          gameIndex={0}
          round={ROUND}
          score={350}
          rank={3}
          secondsLeft={7}
          step="2/5"
          onQuit={noop}
        />
      ),
    },
    {
      id: 'header-spectator', label: 'Header (spectator)', group: 'Chrome',
      render: () => (
        <GauntletHeader
          gameIndex={1}
          round={ROUNDS[2]}
          score={0}
          rank={null}
          secondsLeft={3}
          spectator
          step="4/5"
          onQuit={noop}
        />
      ),
    },
    {
      id: 'question-card', label: 'Question card', group: 'Chrome',
      render: () => (
        <Frame>
          <QuestionCard>ზიდანმა 1998 წლის მუნდიალის ფინალში ორი გოლი გაიტანა.</QuestionCard>
        </Frame>
      ),
    },
    {
      id: 'answer-buttons', label: 'Answer buttons', group: 'Chrome',
      render: () => (
        <Frame>
          <div className="grid grid-cols-2 gap-2.5">
            <AnswerBtn label="idle" state="idle" onClick={noop} tall />
            <AnswerBtn label="correct" state="correct" onClick={noop} tall />
            <AnswerBtn label="wrong" state="wrong" onClick={noop} tall />
            <AnswerBtn label="faded" state="faded" onClick={noop} tall />
          </div>
        </Frame>
      ),
    },
    {
      id: 'countdown', label: 'Countdown timer', group: 'Chrome',
      render: () => (
        <Frame>
          <div className="space-y-8 text-center">
            <div>
              <div className="mb-2 font-poppins text-[11px] font-black uppercase tracking-widest text-white/45">size md</div>
              <div className="flex justify-center"><LeagueCountdown targetMs={mountedAt + 86_400_000 + 3_723_000} /></div>
            </div>
            <div>
              <div className="mb-2 font-poppins text-[11px] font-black uppercase tracking-widest text-white/45">size sm</div>
              <div className="flex justify-center"><LeagueCountdown targetMs={mountedAt + 125_000} size="sm" /></div>
            </div>
          </div>
        </Frame>
      ),
    },
    {
      id: 'live-badge', label: 'LIVE badge', group: 'Chrome',
      render: () => <Frame><div className="flex justify-center"><LiveBadge /></div></Frame>,
    },

    // ── Transitions ─────────────────────────────────────────────────────────
    {
      id: 'round-intro', label: 'Round transition', group: 'Transitions',
      render: () => <RoundIntroOverlay round={ROUND} onDone={noop} />,
    },
    {
      id: 'round-into-question', label: 'Transition → question', group: 'Transitions',
      render: () => (
        <SequencedDemo
          overlay={(done) => <RoundIntroOverlay round={ROUND} onDone={done} />}
          screen={(o) => <TrueFalseDemo overlay={o} />}
        />
      ),
    },
    {
      id: 'game-intro', label: 'Game intro card', group: 'Transitions',
      render: () => <GameIntro game={GAMES[1]} isLastGame={false} onDone={noop} />,
    },
    {
      id: 'game-into-question', label: 'Game intro → question', group: 'Transitions',
      render: () => <GameIntroSequence />,
    },
    {
      id: 'elimination', label: 'Elimination reveal', group: 'Transitions',
      render: () => <EliminationReveal game={GAMES[0]} isLastGame={false} onDone={noop} />,
    },
    {
      id: 'elimination-nocut', label: 'Elimination (no cut)', group: 'Transitions',
      render: () => (
        // Small field: the ladder never cuts below 24, so games 2-3 eliminate
        // nobody (e.g. a 54-player event: 54 → 24, then 24 → 24 → 24).
        <EliminationReveal game={{ index: 1, players: 24, advance: 24 }} isLastGame={false} onDone={noop} />
      ),
    },

    // ── Question bodies ─────────────────────────────────────────────────────
    {
      id: 'pair', label: 'True / False pair', group: 'Question bodies',
      render: () => <TrueFalseDemo />,
    },
    {
      id: 'hilo', label: 'Higher / lower', group: 'Question bodies',
      render: () => (
        <Frame>
          <HigherLowerCard statLabel="კარიერული გოლები" prompt="ვის აქვს მეტი?" />
          <PairAnswers
            choices={[
              { key: 'l', label: 'კრიშტიანუ რონალდუ', state: 'idle' },
              { key: 'r', label: 'ლიონელ მესი', state: 'idle' },
            ]}
            disabled={false}
            onPick={noop}
          />
        </Frame>
      ),
    },
    {
      id: 'mcq', label: 'MCQ options', group: 'Question bodies',
      render: () => (
        <Frame>
          <QuestionCard>რომელ კლუბს აქვს ყველაზე მეტი ჩემპიონთა ლიგის ტიტული?</QuestionCard>
          <AnswerOptionList
            options={[
              { key: 'a', label: 'რეალ მადრიდი', state: 'idle' },
              { key: 'b', label: 'მილანი', state: 'idle' },
              { key: 'c', label: 'ბავარია', state: 'idle' },
              { key: 'd', label: 'ლივერპული', state: 'idle' },
            ]}
            disabled={false}
            onPick={noop}
          />
        </Frame>
      ),
    },
    {
      id: 'career', label: 'Career path', group: 'Question bodies',
      render: () => (
        <Frame>
          <CareerPathCard
            heading="ვისი კარიერაა?"
            // matchName is the English name the crest registry is keyed on;
            // label is what the player sees (localized).
            items={[
              { label: 'სპორტინგი', matchName: 'Sporting CP' },
              { label: 'მან იუნაიტედი', matchName: 'Man United' },
              { label: 'რეალ მადრიდი', matchName: 'Real Madrid' },
              { label: 'იუვენტუსი', matchName: 'Juventus' },
              { label: 'ჩელსი', matchName: 'Chelsea' },
            ]}
          />
          <TypedAnswerPanel
            locked={false}
            outcome={null}
            answerText=""
            guess={typedGuess}
            onGuessChange={setTypedGuess}
            onSubmit={noop}
          />
        </Frame>
      ),
    },
    {
      id: 'whoami', label: 'Who am I ladder', group: 'Question bodies',
      render: () => (
        <Frame>
          <div className="relative z-10 flex min-h-[42px] items-center justify-start pl-3">
            <div className="translate-y-7">
              <QuestionKindBadge kind="clues" />
            </div>
          </div>
          <WhoAmIClueLadder
            clues={[
              { text: 'დავიბადე როსარიოში 1987 წელს.', revealed: true, points: 300 },
              { text: '13 წლის ასაკში ლა მასიაში გადავედი.', revealed: true, points: 240 },
              { text: 'მოგებული მაქვს 8 ოქროს ბურთი.', revealed: true, points: 180 },
              { text: '2022 წლის მუნდიალი მოვიგე.', revealed: false, points: 120 },
              { text: 'ახლა ინტერ მაიამიში ვთამაშობ.', revealed: false, points: 60 },
            ]}
          />
          <TypedAnswerPanel
            locked={false}
            outcome={null}
            answerText=""
            guess={typedGuess}
            onGuessChange={setTypedGuess}
            onSubmit={noop}
          />
        </Frame>
      ),
    },
    {
      id: 'put-in-order', label: 'Put in order (sim)', group: 'Question bodies',
      render: () => <PutInOrderRevealDemo />,
    },
    {
      id: 'money-drop', label: 'Money drop board', group: 'Question bodies',
      render: () => (
        <Frame>
          <MoneyDropBoard
            options={[
              { id: 'a', label: 'საფრანგეთი' },
              { id: 'b', label: 'არგენტინა' },
              { id: 'c', label: 'ბრაზილია' },
              { id: 'd', label: 'გერმანია' },
            ]}
            budget={300}
            locked={false}
            correctId={null}
            onSubmit={noop}
          />
        </Frame>
      ),
    },
    {
      id: 'typed-verdict', label: 'Typed answer verdict', group: 'Question bodies',
      render: () => (
        <Frame>
          <div className="space-y-4">
            <TypedAnswerPanel locked outcome="correct" answerText="" guess="" onGuessChange={noop} onSubmit={noop} />
            <TypedAnswerPanel locked outcome="wrong" answerText="ლიონელ მესი" guess="" onGuessChange={noop} onSubmit={noop} />
          </div>
        </Frame>
      ),
    },

    // ── Boards & results ────────────────────────────────────────────────────
    {
      id: 'rank-pill', label: 'Rank pill (states)', group: 'Rank',
      render: () => (
        <Frame>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <RankPill rank={12} field={120} cut={60} delta={3} />
            <RankPill rank={55} field={120} cut={60} delta={-2} />
            <RankPill rank={66} field={120} cut={60} />
          </div>
        </Frame>
      ),
    },
    {
      id: 'rank-moment', label: 'Rank move (reveal beat)', group: 'Rank',
      render: () => (
        <Frame>
          <div className="space-y-4">
            <RankDeltaMoment fromRank={27} toRank={24} info={{ rank: 24, field: 120, cut: 60 }} passedNames={['NIKA77', 'ZAQOO', 'TALAKHA']} />
            <RankDeltaMoment fromRank={58} toRank={63} info={{ rank: 63, field: 120, cut: 60 }} passedNames={['GIO_BEQA', 'RAMOS248']} />
          </div>
        </Frame>
      ),
    },
    {
      id: 'rank-cutline', label: 'Board with cut line', group: 'Rank',
      render: () => (
        <Frame>
          <div className="flex flex-wrap items-start justify-center gap-6">
            <div><p className="mb-2 text-center font-poppins text-[11px] font-black uppercase text-white/50">ზონაში (#57)</p>
              <CutlineBoard board={boardWithYou(57)} selfUserId="sim-you" cut={60} /></div>
            <div><p className="mb-2 text-center font-poppins text-[11px] font-black uppercase text-white/50">ზონის მიღმა (#63)</p>
              <CutlineBoard board={boardWithYou(63)} selfUserId="sim-you" cut={60} /></div>
          </div>
        </Frame>
      ),
    },
    {
      id: 'rank-sim-mobile', label: 'Full sim (mobile)', group: 'Rank',
      render: () => <RankSimMobile />,
    },
    {
      id: 'rank-sim-web', label: 'Full sim (web)', group: 'Rank',
      render: () => <RankSimWeb />,
    },
    {
      id: 'board', label: 'Standings board', group: 'Boards & results',
      render: () => <Frame>{boardStrip(BOARD, 'sim-you', 5)}</Frame>,
    },
    {
      id: 'board-long', label: 'Standings (10 rows)', group: 'Boards & results',
      render: () => (
        <Frame>
          {boardStrip(
            [...BOARD, ...BOARD.map((r, i) => ({ ...r, user_id: `x${i}`, rank: r.rank + 5, points: r.points - 40 }))],
            'sim-you',
            10,
          )}
        </Frame>
      ),
    },
    {
      id: 'answer-reveal', label: 'Answer reveal', group: 'Boards & results',
      render: () => (
        <AnswerReveal
          question={null}
          result={{ correct: true, points: 150, timeFrac: 0.7 }}
          score={350}
          gameIndex={0}
          round={ROUND}
          onContinue={noop}
          answerTextOverride="მართალია"
          correctPct={62}
        />
      ),
    },
    {
      id: 'game-result-survived', label: 'Game result (survived)', group: 'Boards & results',
      render: () => (
        <GameResult
          game={GAMES[0]} isLastGame={false} survived finalRank={12} score={350}
          bestRound={{ round: 2, points: 200 }}
          onContinue={noop} onKeepWatching={noop} onExit={noop}
        />
      ),
    },
    {
      id: 'game-result-out', label: 'Game result (eliminated)', group: 'Boards & results',
      render: () => (
        <GameResult
          game={GAMES[0]} isLastGame={false} survived={false} finalRank={318} score={120}
          bestRound={{ round: 1, points: 90 }}
          onContinue={noop} onKeepWatching={noop} onExit={noop}
        />
      ),
    },
    {
      id: 'spectator-result', label: 'Game result (spectator)', group: 'Boards & results',
      render: () => (
        <Frame pad={false}>
          <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-6 text-center">
            <div className="font-poppins text-3xl font-black uppercase text-brand-green-light">
              თამაში 1 დასრულდა
            </div>
            <p className="mt-1 font-poppins text-[13px] font-black uppercase tracking-wide text-white/70">112 გადადის</p>
            <div className="mt-3">
              <div className="mb-1 font-poppins text-[11px] font-black uppercase tracking-widest text-white/60">თამაში 2 დაიწყება</div>
              <div className="font-poppins text-4xl font-black tabular-nums text-brand-yellow">01:47</div>
            </div>
            <div className="mt-2 max-h-[58vh] w-full overflow-y-auto overscroll-contain">
              {boardStrip(BOARD, 'sim-you', 24)}
            </div>
          </div>
        </Frame>
      ),
    },
    {
      id: 'break', label: 'Break screen', group: 'Boards & results',
      render: () => (
        <BreakScreen
          games={GAMES} game={GAMES[0]} finalRank={12} score={350}
          bestRound={{ round: 2, points: 200 }} deadlineMs={mountedAt + 120_000}
        />
      ),
    },
    {
      id: 'champion', label: 'Champion screen', group: 'Boards & results',
      render: () => (
        <ChampionScreen champion finalRank={1} score={1240} onExit={noop}>
          {boardStrip(BOARD, 'sim-you', 5)}
        </ChampionScreen>
      ),
    },
    {
      id: 'final-placed', label: 'Final (not champion)', group: 'Boards & results',
      render: () => (
        <ChampionScreen champion={false} finalRank={7} score={880} onExit={noop}>
          {boardStrip(BOARD, 'sim-you', 5)}
        </ChampionScreen>
      ),
    },

    // ── Pre-game ────────────────────────────────────────────────────────────
    {
      id: 'lobby', label: 'Lobby card', group: 'Pre-game',
      render: () => (
        <GauntletLobby
          games={GAMES} registered={FIELD} kickoffMs={mountedAt + 3_600_000}
          canPlay onEnter={noop} onWatch={noop}
        />
      ),
    },
    {
      id: 'checkin', label: 'Check-in panel', group: 'Pre-game',
      render: () => (
        <Frame>
          <CheckInPanel
            checkedIn={false} ready={512} registered={FIELD}
            closesAtMs={mountedAt + 180_000} onCheckIn={noop}
          />
        </Frame>
      ),
    },
    {
      id: 'checkin-done', label: 'Check-in (checked in)', group: 'Pre-game',
      render: () => (
        <Frame>
          <CheckInPanel
            checkedIn ready={513} registered={FIELD}
            closesAtMs={mountedAt + 180_000} onCheckIn={noop}
          />
        </Frame>
      ),
    },
  ];

  const [activeId, setActiveId] = useState(ENTRIES[0].id);
  const active = ENTRIES.find((e) => e.id === activeId) ?? ENTRIES[0];
  const groups = [...new Set(ENTRIES.map((e) => e.group))];
  const [railOpen, setRailOpen] = useState(true);

  return (
    <GauntletBackdrop>
      <div className="min-h-screen pb-[44vh]">
        {/* Isolated component under study */}
        <div key={activeId}>{active.render()}</div>
      </div>

      <button
        type="button"
        onClick={onExit}
        aria-label="Exit gallery"
        className="fixed left-3 top-3 z-[70] flex size-10 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur hover:bg-black/70"
      >
        <X className="size-5" />
      </button>

      {/* Picker rail — collapsible: full-height demos (put-in-order, money
          drop) have their submit buttons down where the rail sits. */}
      <div className="fixed inset-x-0 bottom-0 z-[65] border-t-2 border-brand-purple/40 bg-black/90 backdrop-blur">
        <button
          type="button"
          onClick={() => setRailOpen((v) => !v)}
          className="mx-auto flex w-full items-center justify-center gap-2 py-1.5 font-poppins text-[10px] font-black uppercase tracking-widest text-brand-purple hover:text-white"
        >
          {railOpen ? '▾ hide components' : '▴ show components'}
        </button>
        {railOpen && (
        <div className="max-h-[34vh] overflow-y-auto px-3 pb-2.5">
        <div className="mx-auto max-w-4xl space-y-2">
          {groups.map((group) => (
            <div key={group} className="flex flex-wrap items-center gap-1.5">
              <span className="min-w-[7rem] font-poppins text-[10px] font-black uppercase tracking-widest text-brand-purple">
                {group}
              </span>
              {ENTRIES.filter((e) => e.group === group).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setActiveId(e.id)}
                  className={`rounded-lg px-2.5 py-1.5 font-poppins text-[11px] font-black uppercase tracking-wide transition-colors ${
                    e.id === activeId ? 'bg-brand-purple text-white' : 'bg-white/8 text-white/55 hover:bg-white/15'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          ))}
          <div className="pt-1 font-poppins text-[10px] font-semibold text-white/35" style={poppins}>
            Same components live play renders — edit the file, this and the real game both change.
          </div>
        </div>
        </div>
        )}
      </div>
    </GauntletBackdrop>
  );
}
