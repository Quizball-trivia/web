'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Bot,
  Check,
  Clock3,
  EyeOff,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { PenaltyHUD } from '@/features/possession/components/PenaltyHUD';
import { PitchVisualization } from '@/features/possession/components/PitchVisualization';

type ReplayMode = 'current' | 'proposed';
type ReplayPhase = 'answering' | 'opponent-answered' | 'result';

const SNAPSHOT = {
  playerName: 'KIGAN',
  opponentName: 'Nikushaka',
  playerTimeMs: 3584,
  opponentTimeMs: 1585,
  playerScore: 0,
  opponentScore: 2,
  playerAttemptsBefore: ['miss', 'miss'] as Array<'goal' | 'miss'>,
  opponentAttempts: ['goal', 'goal'] as Array<'goal' | 'miss'>,
};

const formatSeconds = (timeMs: number) => `${(timeMs / 1000).toFixed(3)} წმ`;

function ResultFact({
  side,
  name,
  role,
  timeMs,
  revealTime,
}: {
  side: 'player' | 'opponent';
  name: string;
  role: string;
  timeMs: number;
  revealTime: boolean;
}) {
  const playerSide = side === 'player';
  return (
    <div className={`relative overflow-hidden border p-4 ${
      playerSide
        ? 'border-brand-blue/45 bg-brand-blue/[0.08]'
        : 'border-brand-red-soft/45 bg-brand-red-soft/[0.07]'
    }`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${playerSide ? 'bg-brand-blue' : 'bg-brand-red-soft'}`} />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
            playerSide ? 'bg-brand-blue/20 text-brand-blue' : 'bg-brand-red-soft/20 text-brand-red-soft'
          }`}>
            {playerSide ? <UserRound className="size-5" /> : <Bot className="size-5" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-white">{name}</div>
            <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{role}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs font-black text-brand-green-light">
            <Check className="size-3.5" /> სწორი
          </div>
          <div className={`mt-1 font-mono text-sm font-black ${revealTime ? 'text-white' : 'text-white/28'}`}>
            {revealTime ? formatSeconds(timeMs) : 'დრო არ ჩანს'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreDidNotMove() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border border-brand-green-light/35 bg-brand-green-light/[0.06] p-4">
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">დარტყმამდე</div>
        <div className="mt-1 font-fun text-3xl font-black text-white">0 : 2</div>
      </div>
      <ArrowRight className="size-5 text-brand-green-light" />
      <div className="text-right">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-green-light">მოგერიების შემდეგ</div>
        <div className="mt-1 font-fun text-3xl font-black text-white">0 : 2</div>
      </div>
    </div>
  );
}

function OutcomeOverlay({ mode }: { mode: ReplayMode }) {
  const proposed = mode === 'proposed';
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="absolute inset-x-2 top-[17%] z-40 mx-auto max-w-sm sm:inset-x-3 sm:top-[29%]"
    >
      <div className={`border-2 bg-surface-darkest/95 px-3 py-3 text-center shadow-[0_24px_70px_rgba(0,0,0,.72)] backdrop-blur-md sm:px-4 sm:py-5 ${
        proposed ? 'border-brand-yellow' : 'border-brand-red-soft'
      }`}>
        <div className={`mx-auto flex size-8 items-center justify-center rounded-full sm:size-12 ${
          proposed ? 'bg-brand-yellow/15 text-brand-yellow' : 'bg-brand-red-soft/15 text-brand-red-soft'
        }`}>
          <ShieldCheck className="size-4 sm:size-7" />
        </div>
        <div className="mt-1 font-fun text-xl font-black uppercase text-white sm:mt-3 sm:text-3xl">მოგერიება!</div>
        {proposed ? (
          <>
            <div className="mt-1 text-[10px] font-black text-brand-yellow sm:mt-2 sm:text-sm">ორივემ სწორად უპასუხეთ</div>
            <div className="mt-0.5 text-[9px] font-bold text-white/55 sm:hidden">მეკარე უფრო სწრაფი იყო · ანგარიში ისევ 0:2</div>
            <div className="mt-1 hidden text-xs font-bold leading-5 text-white/60 sm:block">
              მეკარე იყო <span className="text-white">1.999 წამით სწრაფი</span>, ამიტომ შენი დარტყმა მოიგერია.
            </div>
            <div className="mt-3 hidden border-t border-white/10 pt-3 text-[11px] font-black uppercase tracking-[0.08em] text-brand-green-light sm:block">
              მეტოქეს გოლი არ დამატებია · ანგარიში ისევ 0:2
            </div>
          </>
        ) : (
          <div className="mt-1 text-[10px] font-bold text-white/55 sm:mt-2 sm:text-sm">მეკარემ მოიგერია!</div>
        )}
      </div>
    </motion.div>
  );
}

function ReplayStage({ mode, runKey }: { mode: ReplayMode; runKey: number }) {
  const [phase, setPhase] = useState<ReplayPhase>('answering');
  const proposed = mode === 'proposed';
  const resultVisible = phase === 'result';

  useEffect(() => {
    const opponentTimer = window.setTimeout(() => setPhase('opponent-answered'), 1100);
    const resultTimer = window.setTimeout(() => setPhase('result'), 2900);
    return () => {
      window.clearTimeout(opponentTimer);
      window.clearTimeout(resultTimer);
    };
  }, [runKey]);

  const playerAttempts = resultVisible
    ? [...SNAPSHOT.playerAttemptsBefore, 'miss' as const]
    : SNAPSHOT.playerAttemptsBefore;

  return (
    <motion.section
      key={`${mode}-${runKey}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid overflow-hidden border border-white/12 bg-surface-darkest shadow-[0_32px_100px_rgba(0,0,0,.48)] lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,.92fr)]"
    >
      <div className="relative overflow-hidden border-b border-white/10 bg-[#07131b] lg:min-h-[620px] lg:border-b-0 lg:border-r">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="relative z-10 border-b border-white/10 bg-black/20 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-white/35">რეალური მატჩის replay · q16</div>
              <div className="mt-1 text-sm font-black text-white">KIGAN ურტყამს პენალტს</div>
            </div>
            <div className="font-mono text-[10px] text-white/35">match 62bd1eb0</div>
          </div>
        </div>

        <div className="relative z-10 px-3 pt-4 sm:px-5">
          <PenaltyHUD
            penaltyPlayerScore={SNAPSHOT.playerScore}
            penaltyOpponentScore={SNAPSHOT.opponentScore}
            penaltyPlayerAttempts={playerAttempts}
            penaltyOpponentAttempts={SNAPSHOT.opponentAttempts}
            playerPoints={100}
            opponentPoints={resultVisible ? 100 : 0}
            penaltyRound={3}
            isPenaltySuddenDeath={false}
            isPlayerShooter
            playerName={SNAPSHOT.playerName}
            opponentName={SNAPSHOT.opponentName}
            playerAvatarUrl=""
            opponentAvatarUrl=""
            playerRankPoints={455}
            opponentRankPoints={410}
            timeRemaining={resultVisible ? 0 : phase === 'answering' ? 4 : 2}
            phase={resultVisible ? 'penalty-question' : 'penalty-playing'}
          />
        </div>

        <div className="relative z-10 mx-auto mt-1 w-[min(94%,650px)] overflow-hidden border border-white/10 bg-black/30">
          <PitchVisualization
            playerPosition={50}
            playerAvatarUrl=""
            opponentAvatarUrl=""
            playerName={SNAPSHOT.playerName}
            opponentName={SNAPSHOT.opponentName}
            penaltyMode={{
              isPlayerShooter: true,
              result: resultVisible ? 'saved' : null,
              phase: resultVisible ? 'result' : 'playing',
            }}
            zoomToGoal
            targetGoal="right"
            orientation="landscape"
            ballOnPlayer
            ambientPulses={false}
            svgIdPrefix={`penalty-debug-${mode}-${runKey}`}
          />
          <AnimatePresence>{resultVisible ? <OutcomeOverlay mode={mode} /> : null}</AnimatePresence>
        </div>

        <div className="relative z-10 flex justify-center py-4">
          <div className="border border-brand-orange/35 bg-brand-orange/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-orange">
            შენ ურტყამ
          </div>
        </div>
      </div>

      <div className="relative flex flex-col bg-[#090d16] lg:min-h-[620px]">
        <div className={`border-b px-5 py-4 sm:px-7 ${
          proposed ? 'border-brand-green-light/25 bg-brand-green-light/[0.055]' : 'border-brand-red-soft/25 bg-brand-red-soft/[0.045]'
        }`}>
          <div className="flex items-center gap-3">
            {proposed ? <ShieldCheck className="size-5 text-brand-green-light" /> : <TriangleAlert className="size-5 text-brand-red-soft" />}
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{proposed ? 'შემოთავაზებული' : 'დღევანდელი UI'}</div>
              <div className="mt-0.5 text-sm font-black text-white">{proposed ? 'შედეგი მიზეზსაც ხსნის' : 'შედეგი ჩანს, მიზეზი — არა'}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 p-5 sm:p-7">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">რას ხედავს მოთამაშე</div>

          <ResultFact
            side="player"
            name={SNAPSHOT.playerName}
            role="დამრტყმელი"
            timeMs={SNAPSHOT.playerTimeMs}
            revealTime={proposed && resultVisible}
          />

          <AnimatePresence mode="wait">
            {phase === 'answering' || (!proposed && phase === 'opponent-answered') ? (
              <motion.div
                key="hidden-answer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[78px] items-center gap-3 border border-dashed border-white/15 bg-white/[0.02] px-4 text-white/35"
              >
                <EyeOff className="size-5 shrink-0" />
                <div>
                  <div className="text-xs font-black">მეტოქის პასუხი არ ჩანს</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/25">ამიტომ იქმნება შთაბეჭდილება, რომ ბოტმა ვერ უპასუხა.</div>
                </div>
              </motion.div>
            ) : phase === 'opponent-answered' ? (
              <motion.div
                key="answered-safe"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[78px] items-center gap-3 border border-brand-yellow/40 bg-brand-yellow/[0.06] px-4"
              >
                <Clock3 className="size-5 shrink-0 text-brand-yellow" />
                <div>
                  <div className="text-xs font-black text-white">მეტოქემ უპასუხა</div>
                  <div className="mt-1 text-[11px] font-semibold text-white/40">სისწორე და არჩეული პასუხი ჯერ არ ჩანს.</div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="result-fact" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <ResultFact
                  side="opponent"
                  name={SNAPSHOT.opponentName}
                  role="მეკარე"
                  timeMs={SNAPSHOT.opponentTimeMs}
                  revealTime={proposed}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {resultVisible ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
              {proposed ? (
                <>
                  <div className="border-l-4 border-brand-yellow bg-brand-yellow/[0.065] p-4">
                    <div className="text-xs font-black text-brand-yellow">რატომ მოიგერია?</div>
                    <div className="mt-1.5 text-xs font-semibold leading-5 text-white/58">
                      ორივე პასუხი სწორი იყო. პენალტის წესით უფრო სწრაფი იგებს დუელს: მეკარე — 1.585 წმ, დამრტყმელი — 3.584 წმ.
                    </div>
                  </div>
                  <ScoreDidNotMove />
                </>
              ) : (
                <div className="border-l-4 border-brand-red-soft bg-brand-red-soft/[0.055] p-4">
                  <div className="text-xs font-black text-brand-red-soft">რატომ ჰგავს ბაგს?</div>
                  <div className="mt-1.5 text-xs font-semibold leading-5 text-white/55">
                    UI მხოლოდ „მოგერიებას“ ამბობს. არ აჩვენებს, რომ ბოტმაც სწორად უპასუხა, უფრო სწრაფი იყო და ანგარიში საერთოდ არ შეცვლილა.
                  </div>
                </div>
              )}
            </motion.div>
          ) : null}
        </div>
      </div>
    </motion.section>
  );
}

function PenaltyScoreBugContent() {
  const [mode, setMode] = useState<ReplayMode>('current');
  const [runKey, setRunKey] = useState(0);

  const replay = (nextMode: ReplayMode) => {
    setMode(nextMode);
    setRunKey((key) => key + 1);
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-surface-page text-white [background-image:radial-gradient(circle_at_8%_0%,rgba(255,194,26,.12),transparent_26%),radial-gradient(circle_at_95%_80%,rgba(28,176,246,.09),transparent_30%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-7 sm:py-12">
        <header className="grid gap-7 border-b border-white/10 pb-8 lg:grid-cols-[1fr_430px] lg:items-end">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.34em] text-brand-yellow">Quizball · penalty VAR lab</div>
            <h1 className="mt-3 max-w-4xl font-fun text-4xl font-black uppercase leading-[0.92] sm:text-6xl">
              გოლი არ გასულა.<br />UI-მ ვერ ახსნა რატომ.
            </h1>
            <p className="mt-5 max-w-3xl text-sm font-semibold leading-6 text-white/55 sm:text-base">
              KIGAN-ის რეალური შემთხვევა: ის ურტყამდა, ორივემ სწორად უპასუხა, მაგრამ ბოტი-მეკარე უფრო სწრაფი იყო. ამიტომ დარტყმა მოიგერია და მეტოქეს გოლი არ დამატებია.
            </p>
          </div>
          <div className="border-l-4 border-brand-yellow bg-brand-yellow/[0.06] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-yellow">სერვერის ფაქტი</div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-x-5 gap-y-2 font-mono text-xs text-white/55">
              <span>KIGAN · დამრტყმელი</span><span className="text-white">სწორი · 3.584 წმ</span>
              <span>Nikushaka · მეკარე</span><span className="text-white">სწორი · 1.585 წმ</span>
              <span>შედეგი</span><span className="text-brand-red-soft">მოგერიება · 0:2 დარჩა</span>
            </div>
          </div>
        </header>

        <div className="my-7 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => replay('current')}
            className={`border px-4 py-3 text-xs font-black uppercase tracking-wider transition ${
              mode === 'current'
                ? 'border-brand-red-soft bg-brand-red-soft text-black'
                : 'border-white/15 bg-white/5 text-white/55 hover:border-white/30 hover:text-white'
            }`}
          >
            ახლანდელი UI
          </button>
          <button
            type="button"
            onClick={() => replay('proposed')}
            className={`border px-4 py-3 text-xs font-black uppercase tracking-wider transition ${
              mode === 'proposed'
                ? 'border-brand-green-light bg-brand-green-light text-black'
                : 'border-white/15 bg-white/5 text-white/55 hover:border-white/30 hover:text-white'
            }`}
          >
            გასაგები UI
          </button>
          <button
            type="button"
            onClick={() => replay(mode)}
            className="ml-auto flex items-center gap-2 border border-white/15 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-wider text-white/65 transition hover:border-brand-yellow/60 hover:text-brand-yellow"
          >
            <RotateCcw className="size-4" /> თავიდან გაშვება
          </button>
        </div>

        <ReplayStage key={`${mode}-${runKey}`} mode={mode} runKey={runKey} />

        <div className="mt-5 grid gap-3 text-xs font-semibold leading-5 text-white/45 md:grid-cols-3">
          <div className="border border-white/10 bg-white/[0.025] p-4"><strong className="text-white/80">1 · პასუხისას</strong><br />ვაჩვენოთ მხოლოდ „მეტოქემ უპასუხა“, პასუხის გამჟღავნების გარეშე.</div>
          <div className="border border-white/10 bg-white/[0.025] p-4"><strong className="text-white/80">2 · შედეგისას</strong><br />ვაჩვენოთ ორივეს სისწორე, დრო და კონკრეტული მიზეზი.</div>
          <div className="border border-white/10 bg-white/[0.025] p-4"><strong className="text-white/80">3 · ანგარიშზე</strong><br />პირდაპირ დავწეროთ: „შენი დარტყმა აიღო — მეტოქეს გოლი არ დამატებია“.</div>
        </div>
      </div>
    </main>
  );
}

export default function PenaltyScoreBugPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="min-h-dvh bg-surface-deep p-8 text-white">Dev only</div>;
  }
  return <PenaltyScoreBugContent />;
}
