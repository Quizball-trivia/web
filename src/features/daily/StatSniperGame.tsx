"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Crosshair, Minus, Play, Plus, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n/locale";
import { DailyGameStage } from "@/features/daily/components/DailyGameStage";
import { DailyChallengeHeader } from "@/features/daily/components/DailyChallengeHeader";
import { DailyChallengeCompleteModal } from "@/features/daily/components/DailyChallengeCompleteModal";
import { PlayRoomWithFriendsButton } from "@/features/aproximado/PlayRoomWithFriendsButton";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import { PersonalBestNote } from "@/features/daily/components/PersonalBestNote";
import { StatSniperLeaderboard } from "@/features/daily/StatSniperLeaderboard";
import { playSfx } from "@/lib/sounds/gameSounds";
import type { StatSniperLeaderboard as StatSniperLeaderboardData, StatSniperQuestion, StatSniperSession } from "@/lib/domain/dailyChallenge";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** Proximity points 0–100: full marks on the exact value, nothing beyond a quarter of the slider span. */
export function sniperPoints(guess: number, q: StatSniperQuestion): number {
  if (guess === q.value) return 100;
  const closeness = Math.abs(guess - q.value) / (q.max - q.min);
  return Math.max(0, Math.round(100 * (1 - closeness * 4)));
}

/** How far off a guess was, as a share of the slider range — the number the points are computed from. */
export function sniperOffPercent(guess: number, q: StatSniperQuestion): number {
  const span = q.max - q.min;
  return span > 0 ? Math.round((Math.abs(guess - q.value) / span) * 1000) / 10 : 0;
}

const midpoint = (q: StatSniperQuestion) => Math.round((q.min + q.max) / 2 / q.step) * q.step;

/** Stat Sniper daily: ten numbers, slide to your guess. The completion score is the
 *  average proximity (0–100), which is what the day's accuracy leaderboard ranks. */
export function StatSniperGame({
  session,
  onBack,
  onComplete,
  practice = false,
  onSaveResult,
  demo = false,
  leaderboardFetcher,
  boardSlot,
  confirmQuit = true,
}: {
  session: StatSniperSession;
  onBack: () => void;
  onComplete: (score: number, nextPath?: string) => void;
  /** Sample rounds: skip the member completion modal. */
  practice?: boolean;
  /** Persists the completion BEFORE the results show, so the leaderboard can include this run. */
  onSaveResult?: (score: number) => Promise<void>;
  /** Demos: no leaderboard fetch. */
  demo?: boolean;
  /** Guest play: read the board from the public endpoint. */
  leaderboardFetcher?: () => Promise<StatSniperLeaderboardData>;
  /** Shown where the leaderboard sits (guests on the public page get a sign-up card instead of the board). */
  boardSlot?: ReactNode;
  /** false = the back arrow leaves at once (public page: the quit dialog would open beneath its layer). */
  confirmQuit?: boolean;
}) {
  const { t, locale } = useLocale();
  const numberLocale = locale === "ka" ? "ka-GE" : locale === "es" ? "es-ES" : locale === "tr" ? "tr-TR" : locale === "ru" ? "ru-RU" : locale === "pt" ? "pt-BR" : locale === "de" ? "de-DE" : "en-GB";
  const questions = session.questions;
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState(() => (questions[0] ? midpoint(questions[0]) : 0));
  const [phase, setPhase] = useState<"guessing" | "reveal">("guessing");
  const [timeLeft, setTimeLeft] = useState(session.secondsPerQuestion);
  const [total, setTotal] = useState(0);
  const [last, setLast] = useState<{ points: number; diff: number; guess: number; offPercent: number } | null>(null);
  // Explicit start: nothing ticks until the player has read the rules and tapped Start.
  const [started, setStarted] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const [done, setDone] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  const q = questions[index];
  const accuracy = Math.round(total / questions.length);

  // The countdown reads the latest guess through a ref: moving the slider must never restart the clock.
  const guessRef = useRef(guess);
  useEffect(() => { guessRef.current = guess; }, [guess]);
  const lockIn = useCallback(() => {
    if (!q || phase !== "guessing") return;
    const current = guessRef.current;
    const points = sniperPoints(current, q);
    playSfx(points >= 60 ? "dailyCorrect" : "wrongAnswer");
    setLast({ points, diff: Math.abs(current - q.value), guess: current, offPercent: sniperOffPercent(current, q) });
    setTotal((s) => s + points);
    setPhase("reveal");
  }, [phase, q]);
  const lockInRef = useRef(lockIn);
  useEffect(() => { lockInRef.current = lockIn; }, [lockIn]);

  useEffect(() => {
    if (!started || phase !== "guessing" || done) return;
    const id = window.setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          window.setTimeout(() => lockInRef.current(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, phase, done, index]);

  const [saving, setSaving] = useState(false);
  const advance = () => {
    if (index + 1 >= questions.length) {
      if (saving) return;
      // Save first, then refresh the board and open the results with the fresh rank on it.
      setSaving(true);
      void (async () => {
        try { await onSaveResult?.(accuracy); } catch { /* the page surfaced the failure; results still show */ }
        setBoardKey((k) => k + 1);
        setSaving(false);
        setDone(true);
      })();
      return;
    }
    const next = questions[index + 1];
    setIndex((i) => i + 1);
    setGuess(midpoint(next));
    setPhase("guessing");
    setLast(null);
    setTimeLeft(session.secondsPerQuestion);
  };

  if (!q) return null;
  const nudge = (dir: -1 | 1) => setGuess((g) => Math.min(q.max, Math.max(q.min, g + dir * q.step)));

  return (
    <>
      <DailyGameStage contentClassName="lg:max-w-[1080px]">
        {/* The header heads the game column (not the game + board pair), so it lines up with the question. */}
        <div className="w-full lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-6">
          <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <div className="mb-[clamp(14px,2.4vh,28px)]">
              <DailyChallengeHeader
                onQuit={() => (confirmQuit ? setShowQuit(true) : onBack())}
                currentIndex={index}
                total={questions.length}
                timeLeft={Math.max(0, timeLeft)}
                centerLabel={t("statSniper.target", { current: String(index + 1), total: String(questions.length) })}
                className="px-0 pt-0"
              />
            </div>
            {!started ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-center text-white backdrop-blur-sm" data-testid="stat-sniper-start">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-cyan" style={poppins}>{t("statSniper.startHeading")}</p>
                <p className="mt-1 text-xl font-black" style={poppins}>{session.title}</p>
                <p className="mt-0.5 text-xs font-semibold text-white/55" style={poppins}>
                  {t("statSniper.startMeta", { count: String(questions.length), seconds: String(session.secondsPerQuestion) })}
                </p>
                <p className="mt-4 text-sm font-semibold leading-snug text-white/85" style={poppins}>{t("statSniper.startRule")}</p>
                <p className="mt-2 text-xs font-medium leading-snug text-white/65" style={poppins}>{t("statSniper.scoringRule")}</p>
                {session.personalBest !== undefined && (
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-yellow/15 px-3 py-1.5 text-xs font-bold text-brand-yellow" style={poppins}>
                    <Target className="size-3.5" aria-hidden />
                    {session.personalBest === null
                      ? t("dailyGames.personalBestFirstPill")
                      : t("dailyGames.personalBestBeat", { value: `${session.personalBest}%` })}
                  </p>
                )}
                <button
                  type="button"
                  autoFocus
                  onClick={() => setStarted(true)}
                  className="font-poppins mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-brand-green uppercase text-white outline-none transition-colors hover:bg-brand-green-deep focus-visible:ring-2 focus-visible:ring-white/70"
                  style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)" }}
                >
                  <Play className="size-4 fill-current" aria-hidden /> {t("statSniper.start")}
                </button>
                <p className="mt-2 text-[11px] font-medium text-white/45" style={poppins}>{t("statSniper.timerNote")}</p>
              </motion.div>
            ) : (
            <>
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-white backdrop-blur-sm" style={{ ...poppins, fontWeight: 700, fontSize: "clamp(15px, 1.9vw, 22px)" }}>
              <p className="leading-snug">{q.prompt}</p>
            </div>

            {/* Guess readout — brand blue */}
            <motion.div key={`${index}-${phase}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-[20px] bg-brand-blue p-4 text-center" style={{ boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }}>
              <div className="text-4xl font-black tabular-nums text-white" style={poppins}>{guess.toLocaleString(numberLocale)}</div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-white/70" style={poppins}>{q.unit}</div>
            </motion.div>

            {phase === "guessing" ? (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => nudge(-1)} aria-label="-" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/70"><Minus className="size-4" /></button>
                  <input
                    type="range"
                    min={q.min}
                    max={q.max}
                    step={q.step}
                    value={guess}
                    onChange={(e) => setGuess(Number(e.target.value))}
                    className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-brand-blue"
                  />
                  <button type="button" onClick={() => nudge(1)} aria-label="+" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/70"><Plus className="size-4" /></button>
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-bold tabular-nums text-white/35" style={poppins}>
                  <span>{q.min.toLocaleString(numberLocale)}</span>
                  <span>{q.max.toLocaleString(numberLocale)}</span>
                </div>
                <button
                  type="button"
                  onClick={lockIn}
                  className="font-poppins mt-4 h-14 w-full rounded-[20px] bg-brand-green uppercase text-white outline-none transition-colors hover:bg-brand-green-deep"
                  style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)" }}
                >
                  {t("statSniper.lockIn")}
                </button>
              </>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
                {/* You · Answer · Off by (share of the range) → points: the scoring made explicit. */}
                <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1" style={poppins}>
                  {last && <span className="text-sm font-bold text-white/70">{t("statSniper.yourGuess", { value: last.guess.toLocaleString(numberLocale) })}</span>}
                  <span className="text-lg font-black text-white">{t("statSniper.answer", { value: q.value.toLocaleString(numberLocale), unit: q.unit })}</span>
                </div>
                {last && (
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm font-bold" style={poppins}>
                    {last.points < 100 && (
                      <>
                        <span className="text-white/65">
                          {t("statSniper.offBy", { diff: last.diff.toLocaleString(numberLocale), pct: last.offPercent.toLocaleString(numberLocale) })}
                        </span>
                        <span aria-hidden className="text-white/35">→</span>
                      </>
                    )}
                    <span className={cn("rounded-full px-3 py-1", last.points >= 100 ? "bg-brand-yellow/15 text-brand-yellow" : last.points >= 60 ? "bg-brand-green/15 text-brand-green-light" : last.points > 0 ? "bg-brand-orange/15 text-brand-orange" : "bg-brand-red-soft/15 text-brand-red-soft")}>
                      {last.points >= 100
                        ? <span className="inline-flex items-center gap-1"><Crosshair className="size-3.5" />{t("statSniper.bullseye")} · {t("statSniper.pointsEarned", { points: "100" })}</span>
                        : t("statSniper.pointsEarned", { points: String(last.points) })}
                    </span>
                  </div>
                )}
                <p className="mt-2 text-[11px] font-medium text-white/45" style={poppins}>{t("statSniper.scoringShort")}</p>
                <button
                  type="button"
                  onClick={advance}
                  className="font-poppins mt-4 h-12 w-full rounded-[20px] bg-brand-blue uppercase text-white outline-none transition-colors hover:bg-brand-blue/90"
                  style={{ fontWeight: 600, fontSize: 15, letterSpacing: "0.06em" }}
                >
                  {index + 1 >= questions.length ? t("passChain.seeResults") : t("common.next")}
                </button>
              </motion.div>
            )}
            </>
            )}
          </div>

          {boardSlot ?? (!demo && <StatSniperLeaderboard refreshKey={boardKey} fetcher={leaderboardFetcher} className="mt-6 lg:mt-0" />)}
        </div>
      </DailyGameStage>

      <QuitGameDialog open={showQuit} onOpenChange={setShowQuit} onQuit={onBack} />
      <DailyChallengeCompleteModal
        practice={practice}
        open={done}
        title={t("play.statSniperTitle")}
        correct={accuracy}
        total={100}
        challengeType={session.challengeType}
        scoreLabel={t("statSniper.avgAccuracy")}
        scoreValue={`${accuracy}%`}
        details={session.personalBest !== undefined
          ? <PersonalBestNote score={accuracy} previous={session.personalBest} format={(value) => `${value}%`} />
          : undefined}
        friendAction={(
          <PlayRoomWithFriendsButton locale={locale as Locale} tone="white" showHint
            onNavigate={(href) => { setBoardKey((k) => k + 1); onComplete(accuracy, href); }} />
        )}
        onDone={(next) => { setBoardKey((k) => k + 1); onComplete(accuracy, next); }}
      />
    </>
  );
}
