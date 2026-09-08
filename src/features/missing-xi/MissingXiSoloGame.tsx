"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { DailyGameStage } from "@/features/daily/components/DailyGameStage";
import { DailyChallengeHeader } from "@/features/daily/components/DailyChallengeHeader";
import { DailyAnswerInput } from "@/features/daily/components/DailyAnswerInput";
import { DailyChallengeCompleteModal } from "@/features/daily/components/DailyChallengeCompleteModal";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import { fuzzyMatchesAnswer } from "@/lib/answerMatching";
import { footballGridAssetUrl } from "@/lib/football-grid/assets";
import { optimizeSupabaseImage } from "@/lib/images/optimizeSupabaseImage";
import type { MissingXiSession } from "@/lib/domain/dailyChallenge";

type XiSquad = MissingXiSession["squads"][number];
type XiSlot = XiSquad["slots"][number];

const MAX_MISSES = 3;
const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** Face served from the Grid bucket, resized at the storage edge like the
 *  Grid portraits; null (silhouette-free disc) when there is no photo. */
function faceSrc(imageUrl: string | null): string | null {
  // Sources are 320×320; both dimensions are required or the edge resizer
  // returns a 128×320 strip (see the resize note in optimizeSupabaseImage).
  return optimizeSupabaseImage(footballGridAssetUrl(imageUrl), { width: 128, height: 128, quality: 75, format: "webp", resize: "cover" });
}

/** "Rodrigo De Paul" → "De Paul", "Lionel Messi" → "Messi". */
function shortName(name: string): string {
  const tokens = name.split(" ");
  return tokens.length > 2 ? tokens.slice(-2).join(" ") : tokens[tokens.length - 1];
}

/** Solo Missing XI: one squad at a time, tap a shirt, type the starter. */
export function MissingXiSoloGame({
  session,
  onBack,
  onComplete,
}: {
  session: MissingXiSession;
  onBack: () => void;
  onComplete: (score: number, nextPath?: string) => void;
}) {
  const { t } = useLocale();
  const squads = session.squads;
  const SECONDS_PER_SQUAD = session.secondsPerSquad;
  const [index, setIndex] = useState(0);
  const [claimed, setClaimed] = useState<Record<string, true>>({});
  const [revealed, setRevealed] = useState(false);
  const [misses, setMisses] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_SQUAD);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "miss"; text: string } | null>(null);
  const [totalNamed, setTotalNamed] = useState(0);
  const [showQuit, setShowQuit] = useState(false);
  const [done, setDone] = useState(false);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const squad = squads[index];
  const named = Object.keys(claimed).length;
  const selectedSlot = squad?.slots.find((slot) => slot.id === selected) ?? null;

  const advance = () => {
    if (index + 1 >= squads.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setClaimed({});
    setRevealed(false);
    setMisses(0);
    setFeedback(null);
    setTimeLeft(SECONDS_PER_SQUAD);
  };

  // A solved squad rolls on by itself; a skipped, timed-out or missed-out one
  // stays revealed until the player has looked at the line-up and taps Next.
  const finishSquad = (solved: boolean) => {
    setRevealed(true);
    setSelected(null);
    setAnswer("");
    if (solved) advanceRef.current = setTimeout(advance, 2200);
  };

  // Countdown per squad; the tick itself ends the squad at zero so no
  // effect has to react to state (which would set state inside an effect).
  const finishRef = useRef(finishSquad);
  useEffect(() => {
    finishRef.current = finishSquad;
  });
  useEffect(() => {
    if (revealed || done) return;
    const id = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setTimeout(() => finishRef.current(false), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [revealed, done, index]);
  useEffect(() => () => { if (advanceRef.current) clearTimeout(advanceRef.current); }, []);

  // Warm the 11 faces while the squad is being played so the reveal flip
  // shows photos, not loading gaps.
  useEffect(() => {
    if (!squad) return;
    for (const slot of squad.slots) {
      const src = faceSrc(slot.imageUrl);
      if (src) new Image().src = src;
    }
  }, [squad]);

  const submit = () => {
    if (!squad || !selectedSlot || revealed || !answer.trim()) return;
    const ok = fuzzyMatchesAnswer(answer, selectedSlot.acceptedAnswers);
    setAnswer("");
    if (ok) {
      const next = { ...claimed, [selectedSlot.id]: true as const };
      setClaimed(next);
      setTotalNamed((n) => n + 1);
      setFeedback({ kind: "ok", text: `${selectedSlot.name} · ${selectedSlot.position}` });
      setSelected(null);
      if (Object.keys(next).length === squad.slots.length) finishSquad(true);
    } else {
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      setFeedback({ kind: "miss", text: t("missingXi.wrongGuess") });
      if (nextMisses >= MAX_MISSES) finishSquad(false);
    }
  };

  if (!squad) return null;

  return (
    <>
      <DailyGameStage
        header={
          <DailyChallengeHeader
            onQuit={() => setShowQuit(true)}
            currentIndex={index}
            total={squads.length}
            timeLeft={Math.max(0, timeLeft)}
            className="px-0 pt-0"
          />
        }
      >
        <div className="w-full">
          <div className="text-center">
            <p className="text-lg font-bold text-white md:text-xl" style={poppins}>{squad.team}</p>
            <p className="text-[13px] text-white/55 md:text-sm" style={poppins}>vs {squad.opponent} · {squad.matchLabel} · {squad.formation}</p>
          </div>

          {/* Progress — centred above the pitch, brand yellow. */}
          <div className="mt-3 flex items-center justify-center gap-4">
            <span className="rounded-full bg-brand-yellow px-3.5 py-1 text-[13px] font-black tabular-nums text-black" style={poppins}>
              {named}/{squad.slots.length}
            </span>
            <span className="flex items-center gap-1" aria-label={t("missingXi.misses")}>
              {Array.from({ length: MAX_MISSES }).map((_, i) => (
                <span key={i} className={cn("size-2.5 rounded-full", i < misses ? "bg-brand-red-soft" : "bg-white/20")} />
              ))}
            </span>
          </div>

          {/* The pitch: vertical, drawn in CSS in the ranked turf green so the
              markings match the formation (the stadium photo is landscape). */}
          <div
            className="relative mx-auto mt-3 aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border border-white/10"
            style={{ background: "repeating-linear-gradient(180deg, #3f8f2f 0px, #3f8f2f 12.5%, #46992f 12.5%, #46992f 25%)" }}
          >
            {/* Markings: touchlines, halfway line, centre circle + spot, both boxes. */}
            <div className="pointer-events-none absolute inset-3 rounded-sm border-2 border-white/70" />
            <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-0.5 -translate-y-1/2 bg-white/70" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
            <div className="pointer-events-none absolute left-1/2 top-3 h-[18%] w-[58%] -translate-x-1/2 border-2 border-t-0 border-white/70" />
            <div className="pointer-events-none absolute left-1/2 top-3 h-[7%] w-[28%] -translate-x-1/2 border-2 border-t-0 border-white/70" />
            <div className="pointer-events-none absolute bottom-3 left-1/2 h-[18%] w-[58%] -translate-x-1/2 border-2 border-b-0 border-white/70" />
            <div className="pointer-events-none absolute bottom-3 left-1/2 h-[7%] w-[28%] -translate-x-1/2 border-2 border-b-0 border-white/70" />
            {squad.slots.map((slot: XiSlot, slotIndex: number) => {
              const isClaimed = Boolean(claimed[slot.id]);
              const isSelected = selected === slot.id;
              const showName = isClaimed || revealed;
              const face = showName ? faceSrc(slot.imageUrl) : null;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={isClaimed || revealed}
                  onClick={() => { setSelected(slot.id); setFeedback(null); }}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  aria-label={`${slot.position} #${slot.number}`}
                >
                  <motion.div
                    animate={
                      revealed && !isClaimed
                        ? { rotateY: [0, 90, 0], scale: 1 }
                        : isSelected ? { scale: [1, 1.12, 1] } : { scale: 1 }
                    }
                    transition={
                      revealed && !isClaimed
                        ? { duration: 0.5, delay: slotIndex * 0.06 }
                        : isSelected ? { repeat: Infinity, duration: 1.1 } : undefined
                    }
                    className={cn(
                      "relative flex size-11 flex-col items-center justify-center overflow-hidden rounded-full border-2 text-white shadow-lg",
                      !showName && !isSelected && "border-white/60 bg-black/60",
                      isSelected && "border-brand-yellow bg-black/70",
                      isClaimed && "border-brand-blue bg-brand-blue",
                      revealed && !isClaimed && "border-brand-red-soft/80 bg-brand-red-soft/70",
                    )}
                  >
                    {face ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={face} alt="" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <>
                        <span className="text-[9px] font-bold leading-none opacity-80" style={poppins}>{slot.position}</span>
                        <span className="text-xs font-extrabold leading-tight" style={poppins}>{slot.number}</span>
                      </>
                    )}
                  </motion.div>
                  <div className="mt-0.5 flex h-4 items-center justify-center">
                    {showName && (
                      <motion.span
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={revealed && !isClaimed ? { delay: slotIndex * 0.06 + 0.25 } : undefined}
                        className="whitespace-nowrap rounded bg-black/60 px-1 text-[9px] font-bold text-white"
                        style={poppins}
                      >
                        {shortName(slot.name)}
                      </motion.span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {feedback && (
            <p className={cn("mt-3 text-center text-sm font-semibold", feedback.kind === "ok" ? "text-brand-green-light" : "text-brand-red-soft")} style={poppins}>
              {feedback.text}
            </p>
          )}

          {!revealed && (
            selectedSlot ? (
              <DailyAnswerInput
                value={answer}
                onChange={setAnswer}
                onSubmit={submit}
                placeholder={t("missingXi.whoStarted", { position: selectedSlot.position, number: String(selectedSlot.number) })}
                submitLabel={t("common.submit")}
              />
            ) : (
              <p className="mt-4 text-center text-sm text-white/55" style={poppins}>{t("missingXi.tapShirt")}</p>
            )
          )}

          {!revealed && (
            <button
              type="button"
              onClick={() => finishSquad(false)}
              className="mx-auto mt-3 block text-sm font-semibold text-white/45 underline-offset-4 transition-colors hover:text-white/80 hover:underline"
              style={poppins}
            >
              {t("missingXi.skipSquad")}
            </button>
          )}

          {revealed && named < squad.slots.length && (
            <button
              type="button"
              onClick={advance}
              className="font-poppins mt-4 h-14 w-full rounded-[20px] bg-brand-blue uppercase text-white outline-none transition-colors hover:bg-brand-blue/90"
              style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }}
            >
              {index + 1 >= squads.length ? t("missingXi.seeResults") : t("missingXi.nextSquad")}
            </button>
          )}
        </div>
      </DailyGameStage>

      <QuitGameDialog open={showQuit} onOpenChange={setShowQuit} onQuit={onBack} />
      <DailyChallengeCompleteModal
        open={done}
        title={t("play.missingXiTitle")}
        correct={totalNamed}
        total={squads.reduce((n, s) => n + s.slots.length, 0)}
        onDone={(next) => onComplete(totalNamed, next)}
      />
    </>
  );
}
