'use client';

import { useCallback, useEffect, useState } from 'react';
import { Settings2, X } from 'lucide-react';
import { CheckInPanel } from '../components/CheckInPanel';
import { QUESTIONS, ROUNDS } from './gauntlet.data';
import type { GauntletExit } from './gauntlet.types';
import { useGauntlet } from './useGauntlet';
import {
  CareerPathRound,
  HigherLowerRound,
  MultipleChoiceRound,
  TrueFalseRound,
  WhoAmIRound,
} from './RoundScreens';
import {
  AnswerReveal,
  BreakScreen,
  EliminationReveal,
  GameIntro,
  GameResult,
  GauntletLobby,
} from './GauntletScreens';
import { RoundIntroOverlay } from './RoundChrome';

/**
 * Full-screen Saturday gauntlet: lobby → (game intro → 5×(question → reveal →
 * standings) → elimination → result → break) × 3. Prototype-only — mock
 * questions, deterministic field sim, local state.
 */
export function GauntletFlow({
  registered,
  kickoffMs,
  canPlay = true,
  startAtCheckIn = false,
  singleGame = false,
  onExit,
  onWatch,
}: {
  registered: number;
  kickoffMs: number | null;
  /** Sunday's final: one game, one champion — no elimination ladder. */
  singleGame?: boolean;
  /** Registered players can enter; everyone else can only watch. */
  canPlay?: boolean;
  /** Entering from the league card goes straight to check-in — no second lobby. */
  startAtCheckIn?: boolean;
  onExit: (exit: GauntletExit) => void;
  onWatch: () => void;
}) {
  const g = useGauntlet(
    onExit,
    startAtCheckIn && canPlay ? 'checkin' : 'lobby',
    registered,
    singleGame,
  );
  const [devOpen, setDevOpen] = useState(false);

  const question = QUESTIONS[g.gameIndex][g.roundIndex];

  const roundProps = {
    game: g.game,
    gameIndex: g.gameIndex,
    round: g.round,
    score: g.score,
    rank: g.rank,
    fastTimers: g.dev.fastTimers,
    onQuit: g.leave,
    onResolved: g.answer,
  };

  return (
    <div className="min-h-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-fun">
      {g.screen !== 'question' && (
        <button
          type="button"
          onClick={g.leave}
          aria-label="Leave"
          className="fixed left-3 top-3 z-50 flex size-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:bg-black/60 hover:text-white"
        >
          <X className="size-5" />
        </button>
      )}

      {/* Dev panel toggle */}
      <button
        type="button"
        onClick={() => setDevOpen((o) => !o)}
        aria-label="Prototype controls"
        className="fixed right-3 top-3 z-50 flex size-10 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur transition hover:text-white"
      >
        <Settings2 className="size-5" />
      </button>
      {devOpen && <PrototypeControls g={g} />}

      {g.screen === 'lobby' && (
        <GauntletLobby
          games={g.games}
          registered={registered}
          kickoffMs={kickoffMs}
          canPlay={canPlay}
          onEnter={g.start}
          onWatch={onWatch}
        />
      )}

      {g.screen === 'checkin' && (
        <CheckInStep registered={registered} fast={g.dev.fastTimers} onStart={g.beginGames} />
      )}

      {g.screen === 'intro' && <GameIntro game={g.game} isLastGame={g.isLastGame} onDone={g.introDone} />}

      {g.screen === 'roundIntro' && <RoundIntroOverlay round={g.round} onDone={g.roundIntroDone} />}

      {g.screen === 'question' && (
        <div key={`${g.gameIndex}-${g.roundIndex}`}>
          {question.type === 'trueFalse' && <TrueFalseRound {...roundProps} question={question} />}
          {question.type === 'higherLower' && <HigherLowerRound {...roundProps} question={question} />}
          {question.type === 'mcq' && <MultipleChoiceRound {...roundProps} question={question} />}
          {question.type === 'careerPath' && <CareerPathRound {...roundProps} question={question} />}
          {question.type === 'whoAmI' && <WhoAmIRound {...roundProps} question={question} />}
        </div>
      )}

      {g.screen === 'reveal' && g.lastResult && (
        <AnswerReveal
          question={question}
          result={g.lastResult}
          score={g.score}
          gameIndex={g.gameIndex}
          round={g.round}
          onContinue={g.revealDone}
        />
      )}

      {g.screen === 'elimination' && (
        <EliminationReveal game={g.game} isLastGame={g.isLastGame} onDone={g.eliminationDone} />
      )}

      {g.screen === 'result' && (
        <GameResult
          game={g.game}
          isLastGame={g.isLastGame}
          survived={g.survived}
          finalRank={g.finalRank}
          score={g.score}
          bestRound={g.bestRound}
          onContinue={g.resultContinue}
          onKeepWatching={onWatch}
          onExit={g.resultContinue}
        />
      )}

      {g.screen === 'break' && (
        <BreakScreen
          games={g.games}
          game={g.game}
          finalRank={g.finalRank}
          score={g.score}
          bestRound={g.bestRound}
          fast={g.dev.fastTimers}
          onDone={g.breakDone}
        />
      )}
    </div>
  );
}

/**
 * The pre-kickoff ready window, shown right after Enter game. The ready count
 * climbs as the rest of the field checks in; kickoff begins when the window
 * closes (auto if you're ready) or via the prototype skip.
 */
function CheckInStep({
  registered,
  fast,
  onStart,
}: {
  registered: number;
  fast: boolean;
  onStart: () => void;
}) {
  const windowSeconds = fast ? 15 : 5 * 60;
  const [closesAt] = useState(() => Date.now() + windowSeconds * 1000);
  const [checkedIn, setCheckedIn] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1200);
    return () => clearInterval(id);
  }, []);

  // Kickoff when the window closes, but only for players who marked ready.
  useEffect(() => {
    if (!checkedIn) return;
    const id = setTimeout(onStart, Math.max(0, closesAt - Date.now()));
    return () => clearTimeout(id);
  }, [checkedIn, closesAt, onStart]);

  const ready = Math.min(
    registered,
    Math.round(registered * 0.04) +
      Math.round(registered * 0.9 * (1 - Math.exp(-tick / 22))) +
      (checkedIn ? 1 : 0),
  );

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col justify-center px-4">
      <CheckInPanel
        checkedIn={checkedIn}
        ready={ready}
        registered={registered}
        closesAtMs={closesAt}
        onCheckIn={() => setCheckedIn(true)}
        onStart={onStart}
      />
    </div>
  );
}

/** Hideable developer panel — prototype navigation and outcome overrides. */
function PrototypeControls({ g }: { g: ReturnType<typeof useGauntlet> }) {
  const chip =
    'rounded-lg px-2.5 py-1.5 font-poppins text-[11px] font-black uppercase tracking-wide transition-colors';
  const on = 'bg-brand-purple text-white';
  const off = 'bg-white/8 text-white/60 hover:bg-white/15';

  const setOutcome = useCallback(
    (v: 'auto' | 'survive' | 'eliminate') => g.setDev({ ...g.dev, forceOutcome: v }),
    [g],
  );

  return (
    <div className="fixed right-3 top-14 z-50 w-64 rounded-2xl border-2 border-brand-purple/40 bg-black/85 p-3 backdrop-blur">
      <div className="font-poppins text-[10px] font-black uppercase tracking-widest text-brand-purple">
        Prototype controls
      </div>

      <div className="mt-2 text-[10px] font-bold uppercase text-white/40">Jump to</div>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((game) => (
          <button key={game} type="button" className={`${chip} ${g.gameIndex === game ? on : off}`} onClick={() => g.jumpTo(game, 0)}>
            G{game + 1}
          </button>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5">
        {ROUNDS.map((r) => (
          <button
            key={r.index}
            type="button"
            className={`${chip} ${g.roundIndex === r.index ? on : off}`}
            onClick={() => g.jumpTo(g.gameIndex, r.index)}
          >
            R{r.index + 1}
          </button>
        ))}
      </div>

      <div className="mt-2 text-[10px] font-bold uppercase text-white/40">Outcome</div>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        {(['auto', 'survive', 'eliminate'] as const).map((v) => (
          <button key={v} type="button" className={`${chip} ${g.dev.forceOutcome === v ? on : off}`} onClick={() => setOutcome(v)}>
            {v === 'auto' ? 'Auto' : v === 'survive' ? 'Live' : 'Out'}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className={`${chip} ${g.dev.fastTimers ? on : off}`}
          onClick={() => g.setDev({ ...g.dev, fastTimers: !g.dev.fastTimers })}
        >
          Fast timers
        </button>
        <button type="button" className={`${chip} ${off}`} onClick={g.reset}>
          Reset flow
        </button>
      </div>
    </div>
  );
}
