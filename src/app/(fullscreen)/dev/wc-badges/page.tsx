"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { WorldCupMedal, type MedalPlace } from "@/components/shared/WorldCupMedal";
import { WorldCupWinnerCard } from "@/components/shared/WorldCupWinnerCard";
import { WorldCupAchievementCard } from "@/components/shared/WorldCupAchievementCard";
import { WorldCupUnlockOverlay } from "@/components/shared/WorldCupUnlockOverlay";

const FIXTURES: {
  place: MedalPlace;
  tier: string;
  tierLabel: string;
  rp: string;
  nickname: string;
}[] = [
  { place: 1, tier: "Legend", tierLabel: "LEGEND", rp: "1450RP", nickname: "kikna77" },
  { place: 2, tier: "World-Class", tierLabel: "WORLD-CLASS", rp: "1310RP", nickname: "DAVE8" },
  { place: 3, tier: "Captain", tierLabel: "CAPTAIN", rp: "1240RP", nickname: "Totti10" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-poppins text-sm font-bold uppercase tracking-[0.18em] text-white/40">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function WcBadgesDevPage() {
  return (
    <Suspense>
      <WcBadgesContent />
    </Suspense>
  );
}

function WcBadgesContent() {
  const autoParam = useSearchParams().get("unlock");
  const autoPlace =
    autoParam === "1" || autoParam === "2" || autoParam === "3"
      ? (Number(autoParam) as MedalPlace)
      : null;
  const [manualPlace, setManualPlace] = useState<MedalPlace | null>(null);
  const [autoDismissed, setAutoDismissed] = useState(false);
  const unlockPlace = manualPlace ?? (autoDismissed ? null : autoPlace);
  const setUnlockPlace = (place: MedalPlace | null) => {
    setManualPlace(place);
    if (place === null) setAutoDismissed(true);
  };

  return (
    <main className="min-h-screen bg-surface-page px-6 py-10 font-fun text-white">
      <div className="mx-auto max-w-3xl space-y-12">
        <header>
          <h1 className="font-poppins text-2xl font-bold uppercase text-white">
            World Cup podium badges
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Prototype — medal, winner card, profile achievement. Fixtures only, no backend.
          </p>
        </header>

        <Section title="Medal — gold / silver / bronze">
          <div className="flex items-end gap-8">
            {([1, 2, 3] as const).map((place) => (
              <div key={place} className="flex flex-col items-center gap-3">
                <WorldCupMedal place={place} className="w-24" />
                <WorldCupMedal place={place} className="w-12" />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Winner card — tier shield + medal">
          <div className="flex flex-wrap items-start gap-6">
            {FIXTURES.map((f) => (
              <div key={f.place} className="flex flex-col items-center gap-2">
                <WorldCupWinnerCard
                  place={f.place}
                  tier={f.tier}
                  tierLabel={f.tierLabel}
                  rpLabel={f.rp}
                  customization={{}}
                />
                <span className="font-poppins text-xs font-semibold uppercase text-white/60">
                  {f.nickname}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Unlock ceremony — plays once on the winner's next login">
          <div className="flex gap-3">
            {([1, 2, 3] as const).map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => setUnlockPlace(place)}
                className="h-11 rounded-[12px] bg-brand-green px-5 font-poppins text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep"
              >
                Play {place === 1 ? "1st" : place === 2 ? "2nd" : "3rd"}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Profile achievement">
          <div className="space-y-3">
            {([1, 2, 3] as const).map((place) => (
              <WorldCupAchievementCard key={place} place={place} />
            ))}
          </div>
        </Section>
      </div>

      {unlockPlace !== null && (
        <WorldCupUnlockOverlay
          place={unlockPlace}
          open
          onClose={() => setUnlockPlace(null)}
        />
      )}
    </main>
  );
}
