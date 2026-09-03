"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DuelHud } from "../components/DuelHud";
import { EndOverlay, type LabOutcome } from "../components/EndOverlay";
import { FeedbackBanner, useFeedback } from "../components/FeedbackBanner";
import { LabShell } from "../components/LabShell";
import { PlayerSearchInput } from "../components/PlayerSearchInput";
import { rareAnswerQuestions, rarityLabel, type RareAnswer } from "../data/ballKnowledge";
import { matchesName, thinkDelay } from "../lib/text";
import { useLabTimers } from "../lib/useLabTimers";
import { getLabMode } from "../registry";

const mode = getLabMode("ball-knowledge")!;

// Extra invalid-but-plausible names so the autocomplete doesn't leak answers.
const decoyNames = [
  "Lionel Messi",
  "Xavi",
  "Andrés Iniesta",
  "Steven Gerrard",
  "Francesco Totti",
  "Gareth Bale",
  "Luka Modrić",
  "Sergio Ramos",
  "Manuel Neuer",
  "Robert Lewandowski",
  "Eden Hazard",
  "Antoine Griezmann",
  "David Beckham",
  "Michael Essien",
  "Clarence Seedorf",
];

interface RoundOutcome {
  you: { name: string; answer: RareAnswer | null };
  opp: RareAnswer;
}

export function BallKnowledgeGame() {
  const { schedule, clearAll } = useLabTimers();
  const [roundIdx, setRoundIdx] = useState(0);
  const [youTotal, setYouTotal] = useState(0);
  const [oppTotal, setOppTotal] = useState(0);
  const [round, setRound] = useState<RoundOutcome | null>(null);
  const [oppRevealed, setOppRevealed] = useState(false);
  const [oppThinking, setOppThinking] = useState(false);
  const { feedback, flash, clearFeedback } = useFeedback();
  const [gameOver, setGameOver] = useState(false);

  const question = rareAnswerQuestions[roundIdx];

  const candidates = useMemo(() => {
    const all = new Set<string>(decoyNames);
    for (const q of rareAnswerQuestions) for (const a of q.answers) all.add(a.name);
    return [...all].sort();
  }, []);

  const handleAnswer = (input: string) => {
    if (round || gameOver) return;
    const answer = question.answers.find((a) => matchesName(input, a.name, a.aliases)) ?? null;
    const youPoints = answer?.points ?? 0;
    setYouTotal((t) => t + youPoints);
    if (!answer) {
      flash("wrong", `${input} isn't on our list for this one — 0 points.`);
    } else {
      clearFeedback();
    }

    const oppAnswer = question.answers.find((a) => a.name === question.opponentAnswer)!;
    setRound({ you: { name: input, answer }, opp: oppAnswer });
    setOppThinking(true);
    schedule(() => {
      setOppThinking(false);
      setOppRevealed(true);
      setOppTotal((t) => t + oppAnswer.points);
    }, thinkDelay(1300, 2100));
  };

  const nextRound = () => {
    if (roundIdx + 1 >= rareAnswerQuestions.length) {
      setGameOver(true);
      return;
    }
    setRoundIdx((i) => i + 1);
    setRound(null);
    setOppRevealed(false);
    clearFeedback();
  };

  const reset = () => {
    clearAll();
    setRoundIdx(0);
    setYouTotal(0);
    setOppTotal(0);
    setRound(null);
    setOppRevealed(false);
    setOppThinking(false);
    clearFeedback();
    setGameOver(false);
  };

  const outcome: LabOutcome = youTotal > oppTotal ? "win" : youTotal < oppTotal ? "lose" : "draw";

  return (
    <LabShell mode={mode}>
      <DuelHud
        accent={mode.accent}
        turn={null}
        oppThinking={oppThinking}
        youValue={`${youTotal} pts`}
        oppValue={`${oppTotal} pts`}
        centerLabel={
          <span className="text-[11px] font-bold text-brand-slate-light">
            {Math.min(roundIdx + 1, rareAnswerQuestions.length)}/{rareAnswerQuestions.length}
          </span>
        }
      />

      <div className="mb-3 rounded-2xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-gold">
          Open question — rare answers score big
        </div>
        <div className="mt-0.5 text-sm font-bold text-white">{question.prompt}</div>
      </div>

      {round ? (
        <div className="mb-3 space-y-2">
          <RevealCard
            who="You"
            name={round.you.answer?.name ?? round.you.name}
            answer={round.you.answer}
            highlight
          />
          {oppRevealed ? (
            <RevealCard who="Rival" name={round.opp.name} answer={round.opp} />
          ) : (
            <div className="flex h-16 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-brand-slate-light">
              Rival is choosing…
            </div>
          )}
          {oppRevealed ? (
            <div className="flex justify-center pt-1">
              <Button onClick={nextRound}>
                {roundIdx + 1 >= rareAnswerQuestions.length ? "See final score" : "Next question"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto space-y-2">
        <FeedbackBanner feedback={feedback} />
        {!round ? (
          <PlayerSearchInput
            candidates={candidates}
            onSubmit={handleAnswer}
            placeholder="Name your player…"
            accentBgClass={mode.accent.bg}
          />
        ) : null}
      </div>

      {gameOver ? (
        <EndOverlay
          outcome={outcome}
          subline="Deep cuts win games."
          stats={[{ label: "Knowledge points", you: youTotal, opp: oppTotal }]}
          onPlayAgain={reset}
        />
      ) : null}
    </LabShell>
  );
}

function RevealCard({
  who,
  name,
  answer,
  highlight = false,
}: {
  who: string;
  name: string;
  answer: RareAnswer | null;
  highlight?: boolean;
}) {
  const isRare = (answer?.pct ?? 100) < 4;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border p-3.5",
        answer
          ? isRare
            ? "border-brand-gold/50 bg-brand-gold/10"
            : "border-border bg-surface-card"
          : "border-brand-red-soft/40 bg-brand-red-soft/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate-light">
            {who}
          </div>
          <div className="truncate text-base font-extrabold text-white">{name}</div>
          {answer ? (
            <div className={cn("text-xs font-semibold", isRare ? "text-brand-gold" : "text-brand-slate-light")}>
              {isRare ? (
                <span className="inline-flex items-center gap-1">
                  <Gem className="size-3" /> Only {answer.pct}% chose this — {rarityLabel(answer.pct)}
                </span>
              ) : (
                <>
                  {answer.pct}% of players chose this — {rarityLabel(answer.pct)}
                </>
              )}
            </div>
          ) : (
            <div className="text-xs font-semibold text-brand-red-soft">Not a valid answer</div>
          )}
        </div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 16 }}
          className={cn(
            "shrink-0 rounded-xl px-3 py-2 text-center",
            answer ? (isRare ? "bg-brand-gold text-brand-gold-ink" : "bg-surface-card-tint text-white") : "bg-surface-card-tint text-brand-red-soft",
          )}
        >
          <div className="text-lg font-extrabold leading-none">+{answer?.points ?? 0}</div>
          <div className={cn("text-[10px] font-bold", highlight ? "opacity-70" : "opacity-70")}>pts</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
