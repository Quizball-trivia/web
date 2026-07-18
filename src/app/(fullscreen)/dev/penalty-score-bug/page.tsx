'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, RotateCcw, TriangleAlert, X } from 'lucide-react';
import Image from 'next/image';

type ReplayMode = 'before' | 'after';

const SERVER_TRUTH = {
  nikaPoints: 100,
  botPoints: 100,
  nikaTimeMs: 1104,
  botTimeMs: 800,
};

function ScoreSide({
  name,
  points,
  timeMs,
  side,
}: {
  name: string;
  points: number;
  timeMs: number;
  side: 'nika' | 'bot';
}) {
  return (
    <div className={`relative overflow-hidden border-2 p-4 sm:p-6 ${
      side === 'nika'
        ? 'border-brand-green-light/60 bg-brand-green-light/[0.08]'
        : 'border-brand-red-soft/60 bg-brand-red-soft/[0.08]'
    }`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${side === 'nika' ? 'bg-brand-green-light' : 'bg-brand-red-soft'}`} />
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">{name}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-fun text-6xl font-black leading-none text-white sm:text-7xl">{points}</span>
        <span className="mb-1 text-xs font-black uppercase tracking-widest text-white/40">pts</span>
      </div>
      <div className="mt-3 font-mono text-xs text-white/55">answer time · {timeMs.toLocaleString('en-US')} ms</div>
    </div>
  );
}

function ReplayStage({ mode, runKey }: { mode: ReplayMode; runKey: number }) {
  const [goalVisible, setGoalVisible] = useState(false);
  const displayedBotPoints = mode === 'before' ? 0 : SERVER_TRUTH.botPoints;

  useEffect(() => {
    const timer = window.setTimeout(() => setGoalVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <motion.div
      key={`${mode}-${runKey}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden border border-white/15 bg-[#080d19] shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
    >
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(115deg,transparent_0%,transparent_47%,rgba(255,255,255,.08)_47%,rgba(255,255,255,.08)_52%,transparent_52%)]" />
      <div className="relative border-b border-white/10 px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.26em] text-brand-yellow">
              Penalty 6 · bot shoots
            </div>
            <h2 className="mt-1 font-fun text-2xl font-black uppercase text-white sm:text-3xl">
              {mode === 'before' ? 'Legacy client state' : 'Fixed client state'}
            </h2>
          </div>
          <div className={`flex items-center gap-2 border px-3 py-2 text-[10px] font-black uppercase tracking-wider ${
            mode === 'before'
              ? 'border-brand-red-soft/60 bg-brand-red-soft/10 text-brand-red-soft'
              : 'border-brand-green-light/60 bg-brand-green-light/10 text-brand-green-light'
          }`}>
            {mode === 'before' ? <TriangleAlert className="size-4" /> : <Check className="size-4" />}
            {mode === 'before' ? 'stale bot score' : 'authoritative score'}
          </div>
        </div>
      </div>

      <div className="relative grid gap-3 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:p-7">
        <ScoreSide name="Nika903 · keeper" points={100} timeMs={SERVER_TRUTH.nikaTimeMs} side="nika" />
        <div className="flex items-center justify-center px-2 font-fun text-xl font-black text-white/30">VS</div>
        <ScoreSide name="Bot · shooter" points={displayedBotPoints} timeMs={SERVER_TRUTH.botTimeMs} side="bot" />
      </div>

      <div className="relative min-h-52 overflow-hidden border-t border-white/10 bg-[radial-gradient(circle_at_50%_100%,rgba(62,214,85,.22),transparent_50%)] px-5 py-7 sm:px-7">
        <div className="mx-auto h-24 max-w-lg border-x-4 border-t-4 border-white/20" />
        <motion.div
          initial={{ y: -32, scale: 0.55, opacity: 0 }}
          animate={goalVisible ? { y: 22, scale: 1, opacity: 1 } : { y: -32, scale: 0.55, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 230, damping: 17 }}
          className="absolute inset-x-0 top-12 flex flex-col items-center"
        >
          <Image
            src="/assets/goal.webp"
            alt="Goal"
            width={260}
            height={120}
            priority
            className="h-auto w-44 drop-shadow-[0_10px_0_rgba(0,0,0,.55)] sm:w-52"
          />
          <div className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-brand-red-soft">Opponent scored</div>
        </motion.div>
      </div>

      <div className={`relative flex items-start gap-3 border-t px-5 py-4 text-sm sm:px-7 ${
        mode === 'before'
          ? 'border-brand-red-soft/30 bg-brand-red-soft/[0.07] text-brand-red-soft'
          : 'border-brand-green-light/30 bg-brand-green-light/[0.07] text-brand-green-light'
      }`}>
        {mode === 'before' ? <X className="mt-0.5 size-5 shrink-0" /> : <Check className="mt-0.5 size-5 shrink-0" />}
        <p className="font-bold leading-relaxed">
          {mode === 'before'
            ? 'What Nika could see: 100–0, followed by a bot goal. The 0 is stale UI state—not the score used by the server.'
            : 'What the fixed UI shows: 100–100, followed by a valid bot goal because 800 ms beats 1,104 ms.'}
        </p>
      </div>
    </motion.div>
  );
}

function PenaltyScoreBugContent() {
  const [mode, setMode] = useState<ReplayMode>('before');
  const [runKey, setRunKey] = useState(0);

  const replay = (nextMode: ReplayMode) => {
    setMode(nextMode);
    setRunKey((key) => key + 1);
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-[#050913] text-white [background-image:radial-gradient(circle_at_12%_5%,rgba(255,194,26,.11),transparent_24%),radial-gradient(circle_at_90%_85%,rgba(55,211,85,.10),transparent_28%)]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
        <header className="grid gap-7 border-b border-white/10 pb-8 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.32em] text-brand-yellow">Quizball · bug lab</div>
            <h1 className="mt-3 max-w-3xl font-fun text-4xl font-black uppercase leading-[0.95] sm:text-6xl">
              One goal.<br />Two realities.
            </h1>
            <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/58 sm:text-base">
              A frozen replay of Nika903’s latest deciding penalty. The server recorded 100–100 and a faster bot answer. The legacy client could keep showing the bot’s reset value—0.
            </p>
          </div>
          <div className="border-l-4 border-brand-yellow bg-brand-yellow/[0.07] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-yellow">Server truth · immutable</div>
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 font-mono text-xs text-white/65">
              <span>Nika</span><span className="text-right text-white">100 · 1,104 ms</span>
              <span>Bot</span><span className="text-right text-white">100 · 800 ms</span>
              <span>Outcome</span><span className="text-right text-brand-red-soft">BOT GOAL</span>
            </div>
          </div>
        </header>

        <div className="my-7 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => replay('before')}
            className={`border px-4 py-3 text-xs font-black uppercase tracking-wider transition ${
              mode === 'before'
                ? 'border-brand-red-soft bg-brand-red-soft text-black'
                : 'border-white/15 bg-white/5 text-white/55 hover:border-white/30 hover:text-white'
            }`}
          >
            Before fix · stale 0
          </button>
          <button
            type="button"
            onClick={() => replay('after')}
            className={`border px-4 py-3 text-xs font-black uppercase tracking-wider transition ${
              mode === 'after'
                ? 'border-brand-green-light bg-brand-green-light text-black'
                : 'border-white/15 bg-white/5 text-white/55 hover:border-white/30 hover:text-white'
            }`}
          >
            After fix · real 100
          </button>
          <button
            type="button"
            onClick={() => replay(mode)}
            className="ml-auto flex items-center gap-2 border border-white/15 bg-white/5 px-4 py-3 text-xs font-black uppercase tracking-wider text-white/65 transition hover:border-brand-yellow/60 hover:text-brand-yellow"
          >
            <RotateCcw className="size-4" /> Replay goal
          </button>
        </div>

        <ReplayStage key={`${mode}-${runKey}`} mode={mode} runKey={runKey} />

        <div className="mt-6 grid gap-3 text-xs font-semibold leading-5 text-white/45 md:grid-cols-3">
          <div className="border border-white/10 bg-white/[0.025] p-4"><strong className="text-white/80">1 · Bot answers</strong><br />Penalty bots skip the early opponent-answer event.</div>
          <div className="border border-white/10 bg-white/[0.025] p-4"><strong className="text-white/80">2 · Round resolves</strong><br />The server sends the real 100 points and goal outcome.</div>
          <div className="border border-white/10 bg-white/[0.025] p-4"><strong className="text-white/80">3 · Fix reconciles</strong><br />The client replaces stale 0 before presenting the goal.</div>
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
