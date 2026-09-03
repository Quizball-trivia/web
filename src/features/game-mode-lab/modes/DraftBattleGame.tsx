"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Play, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EndOverlay, type LabOutcome } from "../components/EndOverlay";
import { LabShell } from "../components/LabShell";
import {
  FORM_BONUS,
  RESPINS_ALLOWED,
  XI_SLOTS,
  cupRun,
  draftedManagers,
  legendarySquads,
  squadQuestions,
  type CupOpponent,
  type DraftedManager,
  type DraftedPlayer,
  type LegendarySquad,
  type SquadQuestion,
} from "../data/drafted";
import { thinkDelay } from "../lib/text";
import { useLabTimers } from "../lib/useLabTimers";
import { useTurnLock } from "../lib/useTurnLock";
import { getLabMode } from "../registry";

const mode = getLabMode("draft-battle")!;

type Phase = "draft" | "manager" | "cup" | "done";

interface Pick {
  slotLabel: string;
  player: DraftedPlayer;
  squadShort: string;
  /** Knowledge form: +FORM_BONUS for a correct squad question, −FORM_BONUS for a miss. */
  form: number;
}

interface ActiveQuiz {
  question: SquadQuestion;
  squadLabel: string;
  playerName: string;
}

interface MatchResult {
  opponent: CupOpponent;
  yourGoals: number;
  oppGoals: number;
  shootout: "won" | "lost" | null;
  scorers: string[];
  won: boolean;
}

export function DraftBattleGame() {
  const { schedule, clearAll } = useLabTimers();
  const { acquire, release } = useTurnLock();

  const [phase, setPhase] = useState<Phase>("draft");
  const [slotIdx, setSlotIdx] = useState(0);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [respinsLeft, setRespinsLeft] = useState(RESPINS_ALLOWED);
  const [wheelState, setWheelState] = useState<"idle" | "spinning" | "landed">("idle");
  const [wheelIndex, setWheelIndex] = useState(0);
  const [landedSquad, setLandedSquad] = useState<LegendarySquad | null>(null);
  const [options, setOptions] = useState<DraftedPlayer[]>([]);
  const [manager, setManager] = useState<DraftedManager | null>(null);
  const [cupStage, setCupStage] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [finalOutcome, setFinalOutcome] = useState<LabOutcome | null>(null);
  const [outSubline, setOutSubline] = useState("");
  const [quiz, setQuiz] = useState<ActiveQuiz | null>(null);
  const [quizSelected, setQuizSelected] = useState<number | null>(null);
  const usedQuestionsRef = useRef<Record<string, Set<number>>>({});

  const slot = XI_SLOTS[slotIdx];
  const draftedNames = new Set(picks.map((p) => p.player.name));
  const baseRating =
    picks.length > 0
      ? picks.reduce((sum, p) => sum + p.player.rating, 0) / picks.length
      : 0;
  const formTotal = picks.reduce((sum, p) => sum + p.form, 0);
  // Knowledge feeds the engine: team rating = base + form, averaged.
  const teamRating =
    picks.length > 0
      ? picks.reduce((sum, p) => sum + p.player.rating + p.form, 0) / picks.length
      : 0;

  const availableFor = (squad: LegendarySquad) =>
    squad.groups[slot?.group ?? "GK"].filter((p) => !draftedNames.has(p.name));

  /** Spin: decelerating highlight over the squad chips, lands on a valid squad. */
  const spin = (excludeId?: string) => {
    if (!slot || !acquire()) return;
    setWheelState("spinning");
    setLandedSquad(null);
    setOptions([]);
    const valid = legendarySquads.filter(
      (s) => availableFor(s).length > 0 && s.id !== excludeId,
    );
    const target = valid[Math.floor(Math.random() * valid.length)] ?? legendarySquads[0];
    const targetIdx = legendarySquads.findIndex((s) => s.id === target.id);
    const steps = 14 + ((targetIdx - wheelIndex + legendarySquads.length * 3) % legendarySquads.length);

    const tick = (step: number) => {
      setWheelIndex((i) => (i + 1) % legendarySquads.length);
      if (step >= steps) {
        setWheelState("landed");
        setLandedSquad(target);
        setOptions(availableFor(target).slice(0, 3));
        release();
        return;
      }
      // decelerate toward the end
      const delay = 50 + Math.pow(step / steps, 2) * 240;
      schedule(() => tick(step + 1), delay);
    };
    schedule(() => tick(1), 60);
  };

  const advanceSlot = () => {
    release();
    setQuiz(null);
    setQuizSelected(null);
    if (slotIdx + 1 >= XI_SLOTS.length) {
      setPhase("manager");
    } else {
      setSlotIdx((i) => i + 1);
    }
  };

  const handlePick = (player: DraftedPlayer) => {
    if (wheelState !== "landed" || !landedSquad || !acquire()) return;
    setPicks((prev) => [
      ...prev,
      { slotLabel: slot.label, player, squadShort: landedSquad.short, form: 0 },
    ]);
    setWheelState("idle");
    setLandedSquad(null);
    setOptions([]);
    release();

    // Pull an unused trivia question about the squad the wheel gave you.
    const bank = squadQuestions[landedSquad.id] ?? [];
    const used = (usedQuestionsRef.current[landedSquad.id] ??= new Set());
    const nextIdx = bank.findIndex((_, i) => !used.has(i));
    if (nextIdx === -1) {
      advanceSlot(); // bank exhausted — free pass, form stays 0
      return;
    }
    used.add(nextIdx);
    setQuiz({ question: bank[nextIdx], squadLabel: landedSquad.label, playerName: player.name });
    setQuizSelected(null);
  };

  const answerQuiz = (optionIdx: number) => {
    if (!quiz || quizSelected !== null || !acquire()) return;
    setQuizSelected(optionIdx);
    const correct = optionIdx === quiz.question.correctIndex;
    const delta = correct ? FORM_BONUS : -FORM_BONUS;
    setPicks((prev) =>
      prev.map((p, i) => (i === prev.length - 1 ? { ...p, form: delta } : p)),
    );
  };

  const handleRespin = () => {
    if (wheelState !== "landed" || respinsLeft <= 0) return;
    setRespinsLeft((r) => r - 1);
    spin(landedSquad?.id);
  };

  const playMatch = () => {
    const opponent = cupRun[cupStage];
    if (!opponent || !manager || simulating || !acquire()) return;
    setSimulating(true);
    setLastResult(null);

    schedule(() => {
      const diff = teamRating - opponent.strength + manager.attackBonus;
      const yourGoals = Math.min(
        4,
        Math.max(0, Math.round(1.3 + diff * 0.13 + (Math.random() - 0.35) * 2)),
      );
      const oppGoals = Math.min(
        4,
        Math.max(
          0,
          Math.round(1.1 - diff * 0.1 - manager.defenseBonus * 0.35 + (Math.random() - 0.35) * 2),
        ),
      );
      let shootout: MatchResult["shootout"] = null;
      let won = yourGoals > oppGoals;
      if (yourGoals === oppGoals) {
        const winChance = 0.5 + manager.shootoutBonus + (teamRating - opponent.strength) * 0.015;
        shootout = Math.random() < winChance ? "won" : "lost";
        won = shootout === "won";
      }
      const attackers = picks.filter((p) => ["RW", "LW", "ST", "CM"].includes(p.slotLabel));
      const scorers = Array.from({ length: yourGoals }, () => {
        const scorer = attackers[Math.floor(Math.random() * attackers.length)];
        return `${Math.ceil(Math.random() * 90)}' ${scorer?.player.name ?? "Own goal"}`;
      }).sort((a, b) => parseInt(a) - parseInt(b));

      setSimulating(false);
      setLastResult({ opponent, yourGoals, oppGoals, shootout, scorers, won });
      release();
    }, thinkDelay(1400, 2200));
  };

  const continueCup = () => {
    if (!lastResult) return;
    if (!lastResult.won) {
      setOutSubline(`Knocked out at the ${lastResult.opponent.stage.toLowerCase()} by ${lastResult.opponent.name}.`);
      setFinalOutcome("lose");
      setPhase("done");
      return;
    }
    if (cupStage + 1 >= cupRun.length) {
      setOutSubline(`Your XI (rated ${teamRating.toFixed(1)}, knowledge form ${formTotal >= 0 ? "+" : ""}${formTotal}) conquered Europe.`);
      setFinalOutcome("win");
      setPhase("done");
      return;
    }
    setCupStage((s) => s + 1);
    setLastResult(null);
  };

  const reset = () => {
    clearAll();
    release();
    setPhase("draft");
    setSlotIdx(0);
    setPicks([]);
    setRespinsLeft(RESPINS_ALLOWED);
    setWheelState("idle");
    setLandedSquad(null);
    setOptions([]);
    setManager(null);
    setCupStage(0);
    setSimulating(false);
    setLastResult(null);
    setFinalOutcome(null);
    setQuiz(null);
    setQuizSelected(null);
    usedQuestionsRef.current = {};
  };

  return (
    <LabShell mode={mode}>
      {/* Status strip */}
      <div className="mb-3 flex items-center justify-between rounded-2xl bg-surface-card px-4 py-2.5 text-xs font-bold">
        <span className="text-white">
          {phase === "draft"
            ? `Drafting ${slot?.label} · ${picks.length}/11 · Form ${formTotal >= 0 ? "+" : ""}${formTotal}`
            : `XI ${baseRating.toFixed(1)} + form → ${teamRating.toFixed(1)}`}
        </span>
        {phase === "draft" ? (
          <span className="text-brand-slate-light">
            Re-spins: <span className="text-brand-blue">{respinsLeft}</span>
          </span>
        ) : manager ? (
          <span className="text-brand-cyan">{manager.name} · {manager.trait}</span>
        ) : null}
      </div>

      {phase === "draft" && !quiz ? (
        <>
          {/* The wheel */}
          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {legendarySquads.map((squad, i) => (
              <div
                key={squad.id}
                className={cn(
                  "rounded-xl border px-1 py-2 text-center text-[11px] font-extrabold transition-all",
                  landedSquad?.id === squad.id
                    ? "scale-105 border-brand-blue bg-brand-blue/25 text-white"
                    : wheelState === "spinning" && wheelIndex === i
                      ? "border-brand-cyan bg-brand-cyan/20 text-white"
                      : "border-border bg-surface-card-deeper text-brand-slate-light",
                )}
              >
                {squad.short}
              </div>
            ))}
          </div>

          {wheelState === "idle" ? (
            <Button size="lg" className="mb-3 w-full" onClick={() => spin()}>
              <RotateCw className="size-4" /> Spin for your {slot?.label}
            </Button>
          ) : null}
          {wheelState === "spinning" ? (
            <div className="mb-3 flex h-12 items-center justify-center text-sm font-bold text-brand-cyan">
              Spinning…
            </div>
          ) : null}

          {wheelState === "landed" && landedSquad ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
              <div className="mb-2 text-center text-sm font-bold text-white">
                {landedSquad.label} — pick your {slot?.label}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {options.map((player) => (
                  <button
                    key={player.name}
                    type="button"
                    onClick={() => handlePick(player)}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-card px-4 py-3 text-left transition-all hover:border-brand-blue/60 hover:bg-surface-card-tint active:scale-[0.97] sm:flex-col sm:gap-1 sm:text-center"
                  >
                    <span className="text-sm font-extrabold text-white">{player.name}</span>
                    <span className="rounded bg-brand-blue/20 px-1.5 py-0.5 text-xs font-bold text-brand-cyan">
                      {player.rating}
                    </span>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={handleRespin}
                disabled={respinsLeft <= 0}
              >
                <RotateCw className="size-4" /> Re-spin ({respinsLeft} left)
              </Button>
            </motion.div>
          ) : null}
        </>
      ) : null}

      {phase === "draft" && quiz ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
          <div className="mb-2 rounded-2xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-gold">
              Prove you know {quiz.squadLabel} — form on the line
            </div>
            <div className="mt-0.5 text-sm font-bold text-white">{quiz.question.prompt}</div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {quiz.question.options.map((option, i) => {
              const isCorrect = i === quiz.question.correctIndex;
              const isSelected = quizSelected === i;
              const revealed = quizSelected !== null;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={revealed}
                  onClick={() => answerQuiz(i)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition-all",
                    !revealed && "border-border bg-surface-card text-white hover:bg-surface-card-tint active:scale-[0.98]",
                    revealed && isCorrect && "border-brand-green/60 bg-brand-green/15 text-brand-green-light",
                    revealed && isSelected && !isCorrect && "border-brand-red-soft/60 bg-brand-red-soft/15 text-brand-red-soft",
                    revealed && !isSelected && !isCorrect && "border-border bg-surface-card text-brand-slate opacity-60",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {quizSelected !== null ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center">
              <div
                className={cn(
                  "text-sm font-bold",
                  quizSelected === quiz.question.correctIndex ? "text-brand-green-light" : "text-brand-red-soft",
                )}
              >
                {quizSelected === quiz.question.correctIndex
                  ? `${quiz.playerName} is in form: +${FORM_BONUS} rating`
                  : `${quiz.playerName} is out of form: −${FORM_BONUS} rating`}
              </div>
              <Button className="mt-2" onClick={advanceSlot}>
                {slotIdx + 1 >= XI_SLOTS.length ? "Draft your manager" : "Next position"}
              </Button>
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}

      {phase === "manager" ? (
        <>
          <div className="mb-3 rounded-2xl border border-brand-blue/40 bg-brand-blue/10 px-4 py-3 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-cyan">
              XI complete — now draft your manager
            </div>
            <div className="text-sm font-bold text-white">Their trait bends the match engine</div>
          </div>
          <div className="mb-3 grid grid-cols-1 gap-2">
            {draftedManagers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setManager(m);
                  setPhase("cup");
                }}
                className="rounded-2xl border border-border bg-surface-card p-4 text-left transition-all hover:border-brand-blue/60 hover:bg-surface-card-tint active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-white">{m.name}</span>
                  <span className="rounded bg-brand-blue/20 px-2 py-0.5 text-[11px] font-bold text-brand-cyan">
                    {m.trait}
                  </span>
                </div>
                <div className="mt-1 text-xs text-brand-slate-light">{m.description}</div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {phase === "cup" ? (
        <>
          <div className="mb-3 rounded-2xl border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-gold">
              {cupRun[cupStage].stage}
            </div>
            <div className="text-base font-extrabold text-white">
              Your XI vs {cupRun[cupStage].name}
            </div>
            <div className="text-[11px] font-semibold text-brand-slate-light">
              Their strength: {cupRun[cupStage].strength} · Yours: {teamRating.toFixed(1)}
              {manager && manager.attackBonus + manager.defenseBonus > 0 ? ` (+${manager.trait})` : ""}
            </div>
            <div className="mt-0.5 text-xs font-bold text-brand-gold">
              ~
              {Math.min(
                90,
                Math.max(
                  10,
                  Math.round(
                    50 +
                      (teamRating - cupRun[cupStage].strength + (manager?.attackBonus ?? 0)) * 5.5 +
                      (manager?.defenseBonus ?? 0) * 6 +
                      (manager?.shootoutBonus ?? 0) * 20,
                  ),
                ),
              )}
              % to go through
            </div>
          </div>

          {lastResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "mb-3 rounded-2xl border p-4 text-center",
                lastResult.won ? "border-brand-green/40 bg-brand-green/10" : "border-brand-red-soft/40 bg-brand-red-soft/10",
              )}
            >
              <div className="text-2xl font-extrabold tabular-nums text-white">
                {lastResult.yourGoals} – {lastResult.oppGoals}
              </div>
              {lastResult.shootout ? (
                <div className={cn("text-xs font-bold", lastResult.won ? "text-brand-green-light" : "text-brand-red-soft")}>
                  {lastResult.shootout === "won" ? "Won on penalties!" : "Lost on penalties."}
                </div>
              ) : null}
              <div className="mt-1 space-y-0.5 text-xs text-brand-slate-light">
                {lastResult.scorers.map((line) => (
                  <div key={line}>⚽ {line}</div>
                ))}
              </div>
              <Button className="mt-3" onClick={continueCup}>
                {lastResult.won
                  ? cupStage + 1 >= cupRun.length
                    ? "Lift the trophy"
                    : "Next round"
                  : "Full time"}
              </Button>
            </motion.div>
          ) : (
            <Button size="lg" className="mb-3 w-full" onClick={playMatch} disabled={simulating}>
              {simulating ? "Playing…" : (<><Play className="size-4" /> Kick off</>)}
            </Button>
          )}
        </>
      ) : null}

      {/* The XI so far */}
      <div className="mt-auto">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-2xl bg-surface-card-deeper p-3 text-xs sm:grid-cols-3">
          {XI_SLOTS.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 font-bold text-brand-slate">{s.label}</span>
              {picks[i] ? (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate font-semibold text-white">
                  {picks[i].player.name}
                  <span className="ml-1 text-[9px] text-brand-slate">{picks[i].squadShort}</span>
                </motion.span>
              ) : (
                <span className={cn("tracking-widest", i === slotIdx && phase === "draft" ? "text-brand-blue" : "text-brand-slate/40")}>
                  ———
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {phase === "done" && finalOutcome ? (
        <EndOverlay
          outcome={finalOutcome}
          heading={finalOutcome === "win" ? "CHAMPIONS!" : undefined}
          subline={outSubline}
          stats={[
            { label: "Base rating", you: baseRating.toFixed(1), opp: "—" },
            { label: "Knowledge form", you: `${formTotal >= 0 ? "+" : ""}${formTotal}`, opp: "—" },
            { label: "Final rating", you: teamRating.toFixed(1), opp: "—" },
          ]}
          onPlayAgain={reset}
        />
      ) : null}
    </LabShell>
  );
}
