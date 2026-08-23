"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModeConfirmModal } from "@/components/shared/ModeConfirmModal";
import {
  DailyChallengeCompleteModalContent,
  type DailyChallengeWeekendLeagueCta,
} from "@/features/daily/components/DailyChallengeCompleteModal";
import { resolveDailyWeekendLeagueCta } from "@/lib/experiments/dailyWeekendLeagueCta";

type PreviewState = "control" | "qualifying" | "qualified" | "entered";

const PREVIEW = {
  qualifying: { points: 120, qualified: false, entered: false, status: "entry_open" },
  qualified: { points: 200, qualified: true, entered: false, status: "entry_open" },
  entered: { points: 200, qualified: true, entered: true, status: "entry_open" },
} as const;

export default function DailyWeekendLeagueExperimentPreview() {
  const router = useRouter();
  const [state, setState] = useState<PreviewState>("qualifying");
  const [rankedConfirmOpen, setRankedConfirmOpen] = useState(false);
  const treatmentState = state === "control" ? "qualifying" : state;
  const decision = resolveDailyWeekendLeagueCta({
    ...PREVIEW[treatmentState],
    target: 200,
    tournamentStatus: PREVIEW[treatmentState].status,
  });
  const weekendLeagueCta: DailyChallengeWeekendLeagueCta = {
    state: decision.state,
    action: decision.action,
    currentQp: decision.currentQp,
    targetQp: decision.targetQp,
    onClick: () => {
      if (decision.action === "play_ranked") {
        setRankedConfirmOpen(true);
        return;
      }
      router.push(decision.nextPath);
    },
  };

  return (
    <main className="min-h-dvh bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center px-4 py-8 text-white">
      <div className="fixed inset-x-0 top-4 z-[80] mx-auto flex max-w-3xl flex-wrap justify-center gap-2 px-4">
        {(["control", "qualifying", "qualified", "entered"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setState(option)}
            className={`rounded-full px-4 py-2 font-poppins text-xs font-semibold uppercase ${
              state === option ? "bg-brand-yellow text-black" : "bg-white/10 text-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <DailyChallengeCompleteModalContent
        title="Football Knowledge"
        correct={8}
        total={10}
        onDone={(nextPath) => router.push(nextPath ?? "/daily/challenges")}
        weekendLeagueCta={state === "control" ? undefined : weekendLeagueCta}
      />

      <ModeConfirmModal
        mode="ranked"
        isOpen={rankedConfirmOpen}
        onOpenChange={setRankedConfirmOpen}
        onConfirm={() => router.push(decision.nextPath)}
        ticketsRemaining={5}
      />
    </main>
  );
}
