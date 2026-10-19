"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Share2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { useIsGuest } from "@/lib/auth/useIsGuest";
import { useGeoEligibility } from "@/lib/geo/useGeoEligibility";
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import {
  trackCampaignQuizAbandon,
  trackCampaignQuizComplete,
  trackCampaignQuizCta,
  trackCampaignQuizShare,
  trackCampaignQuizStart,
  trackCampaignQuizView,
} from "@/lib/analytics/campaign-quiz.analytics";
import {
  QUIZ_COPY,
  TRABZONSPOR_CAMPAIGN_ENDS_AT,
  TRABZONSPOR_CAMPAIGN_ID,
  TRABZONSPOR_CAMPAIGN_PARAM,
  TRABZONSPOR_QUESTIONS,
  campaignQuizLang,
  correctMaskOf,
  type CampaignQuizLang,
  type CampaignTrigger,
  resolveCampaignTrigger,
  scoreOf,
} from "./trabzonsporQuiz";

const CLARET = "#7A1F3D";
const SKY = "#3FA9E0";
const TOTAL = TRABZONSPOR_QUESTIONS.length;
const STORAGE_KEY = `qb_campaign_${TRABZONSPOR_CAMPAIGN_ID}`;
const LINK_KEY = `qb_campaign_link_${TRABZONSPOR_CAMPAIGN_ID}`;

type Stored = { best: number | null; plays: number; starts: number };

function readStored(): Stored {
  const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Stored> | null;
    const plays = num(parsed?.plays) ?? 0;
    return { best: num(parsed?.best), plays, starts: Math.max(num(parsed?.starts) ?? 0, plays) };
  } catch {
    return { best: null, plays: 0, starts: 0 };
  }
}

function writeStored(value: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch { /* storage blocked: the quiz still works, it just forgets the best score */ }
}

const subscribeNever = () => () => {};

/** Client-only snapshots: the server and the hydration pass see `serverValue`, so the card never mismatches. */
const useClientValue = <T,>(read: () => T, serverValue: T): T => useSyncExternalStore(subscribeNever, read, () => serverValue);

const readLinkFlag = () => {
  try {
    return window.sessionStorage.getItem(LINK_KEY) === "1";
  } catch {
    return false;
  }
};

/** The link survives navigating away from the landing URL within the visit. */
function useCampaignLink(): boolean {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("campaign") === TRABZONSPOR_CAMPAIGN_PARAM;
  useEffect(() => {
    try {
      if (fromUrl) window.sessionStorage.setItem(LINK_KEY, "1");
    } catch { /* sessionStorage blocked */ }
  }, [fromUrl]);
  return useClientValue(readLinkFlag, false) || fromUrl;
}

/** An attempt keeps the language and attribution it started with, even if geo resolves mid-quiz. */
type Attempt = { id: string; number: number; lang: CampaignQuizLang; trigger: CampaignTrigger; startedAt: number };
type Phase =
  | { kind: "idle" }
  | { kind: "playing"; attempt: Attempt; index: number; answers: number[] }
  | { kind: "done"; attempt: Attempt; answers: number[] };

const contextOf = (attempt: Attempt) => ({ campaignId: TRABZONSPOR_CAMPAIGN_ID, trigger: attempt.trigger, lang: attempt.lang, attemptId: attempt.id });

// `number` is per browser and two tabs can race on it; the id is what joins one attempt's events.
function newAttemptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function TrabzonsporQuizCard({ onMoreGames }: { onMoreGames?: () => void }) {
  const { locale } = useLocale();
  const isGuest = useIsGuest();
  const openAuthPrompt = useAuthPromptStore((state) => state.open);
  const profileCountry = useAuthStore((state) => state.user?.country ?? null);
  const geo = useGeoEligibility();
  const hasLink = useCampaignLink();
  const live = useClientValue(() => Date.now() < TRABZONSPOR_CAMPAIGN_ENDS_AT, false);
  // Nothing renders until `live` is true on the client, so reading storage here cannot cause a hydration mismatch.
  const [stored, setStoredState] = useState<Stored>(readStored);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const endedAttemptsRef = useRef(new Set<string>());

  const trigger = resolveCampaignTrigger({ live, geoCountry: geo.countryCode, profileCountry, locale, hasLink });
  const lang = phase.kind === "idle" ? (trigger ? campaignQuizLang(locale, trigger) : "tr") : phase.attempt.lang;
  const copy = QUIZ_COPY[lang];

  const viewContextRef = useRef<{ campaignId: string; trigger: CampaignTrigger; lang: CampaignQuizLang } | null>(null);
  const storedRef = useRef(stored);
  const phaseRef = useRef(phase);
  // Layout phase, so the context is in place before the observer's first (async) callback.
  useLayoutEffect(() => {
    viewContextRef.current = trigger ? { campaignId: TRABZONSPOR_CAMPAIGN_ID, trigger, lang } : null;
    storedRef.current = stored;
    phaseRef.current = phase;
  });

  const viewedRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node || viewedRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const current = viewContextRef.current;
      if (!current || viewedRef.current) return;
      if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return;
      viewedRef.current = true;
      trackCampaignQuizView({ ...current, previousBest: storedRef.current.best });
      observer.disconnect();
    }, { threshold: 0.5 });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => {
    const reportAbandon = (resetCard: boolean) => {
      const current = phaseRef.current;
      if (current.kind !== "playing" || endedAttemptsRef.current.has(current.attempt.id)) return;
      endedAttemptsRef.current.add(current.attempt.id);
      trackCampaignQuizAbandon({
        ...contextOf(current.attempt),
        attempt: current.attempt.number,
        answered: current.answers.length,
        correctMask: correctMaskOf(current.answers),
        durationMs: Date.now() - current.attempt.startedAt,
      });
      // A page restored from the back/forward cache starts a fresh attempt instead of finishing an abandoned one.
      if (resetCard) setPhase({ kind: "idle" });
    };
    const onPageHide = () => reportAbandon(true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      reportAbandon(false);
    };
  }, []);

  if (phase.kind === "idle" && !trigger) return null;

  const start = () => {
    if (!trigger) return;
    const latest = readStored();
    const next = { ...latest, starts: latest.starts + 1 };
    writeStored(next);
    setStoredState(next);
    const attempt: Attempt = { id: newAttemptId(), number: next.starts, lang: campaignQuizLang(locale, trigger), trigger, startedAt: Date.now() };
    trackCampaignQuizStart({ ...contextOf(attempt), attempt: attempt.number });
    setPhase({ kind: "playing", attempt, index: 0, answers: [] });
  };

  const pick = (optionIndex: number) => {
    if (phase.kind !== "playing" || phase.answers.length > phase.index) return;
    setPhase({ ...phase, answers: [...phase.answers, optionIndex] });
  };

  const advance = () => {
    if (phase.kind !== "playing") return;
    if (phase.index + 1 < TOTAL) {
      setPhase({ ...phase, index: phase.index + 1 });
      return;
    }
    const { attempt, answers } = phase;
    if (endedAttemptsRef.current.has(attempt.id)) return;
    endedAttemptsRef.current.add(attempt.id);
    const score = scoreOf(answers);
    trackCampaignQuizComplete({
      ...contextOf(attempt),
      attempt: attempt.number,
      score,
      total: TOTAL,
      correctMask: correctMaskOf(answers),
      durationMs: Date.now() - attempt.startedAt,
    });
    const latest = readStored();
    const next = { ...latest, best: Math.max(latest.best ?? 0, score), plays: latest.plays + 1 };
    writeStored(next);
    setStoredState(next);
    setPhase({ kind: "done", attempt, answers });
  };

  const share = async (score: number, ctx: ReturnType<typeof contextOf>) => {
    const url = `${window.location.origin}/${locale}?campaign=${TRABZONSPOR_CAMPAIGN_PARAM}`;
    const text = copy.shareText(score, TOTAL);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text, url });
        trackCampaignQuizShare({ ...ctx, score, method: "native" });
      } catch { /* the visitor closed the share sheet */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success(copy.copied);
      trackCampaignQuizShare({ ...ctx, score, method: "clipboard" });
    } catch { /* clipboard blocked */ }
  };

  return (
    <section ref={cardRef} lang={lang} aria-label={copy.section}>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-poppins text-base uppercase text-white">{copy.section}</h2>
        <span className="rounded-full px-2 py-0.5 font-poppins text-[10px] font-bold uppercase tracking-wide text-white" style={{ backgroundColor: SKY }}>
          {copy.live}
        </span>
      </div>
      <div className="relative overflow-hidden rounded-[10px] text-white" style={{ backgroundColor: CLARET }}>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -right-16 top-0 h-full w-40 skew-x-[-20deg] opacity-90 md:block md:w-56",
            phase.kind === "idle" ? "block" : "hidden",
          )}
          style={{ backgroundColor: SKY }}
        />
        <div
          aria-hidden
          className={cn("pointer-events-none absolute -right-2 top-0 h-full w-6 skew-x-[-20deg] bg-white/15 md:right-20 md:block", phase.kind === "idle" ? "block" : "hidden")}
        />
        <div className="relative z-10 p-4 md:p-6">
          {phase.kind === "idle" && (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-poppins text-lg font-semibold uppercase leading-tight md:text-2xl">{copy.title}</h3>
                <p className="mt-1 font-poppins text-xs uppercase tracking-wide text-white/80 md:text-sm">{copy.subtitle}</p>
                {stored.best !== null && (
                  <p className="mt-2 font-poppins text-xs uppercase text-brand-yellow">{copy.best(stored.best, TOTAL)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={start}
                className="flex h-[44px] w-[120px] shrink-0 items-center justify-center rounded-[8px] bg-surface-page font-poppins text-[15px] uppercase tracking-wide text-white transition-transform active:translate-y-[2px]"
              >
                {stored.plays > 0 ? copy.playAgain : copy.play}
              </button>
            </div>
          )}

          {phase.kind === "playing" && (() => {
            const question = TRABZONSPOR_QUESTIONS[phase.index]!;
            const picked = phase.answers[phase.index];
            const revealed = picked !== undefined;
            const isLast = phase.index + 1 === TOTAL;
            return (
              <div className="md:max-w-[75%]">
                <div className="flex items-center justify-between font-poppins text-[11px] uppercase tracking-wide text-white/80">
                  <span>{copy.question(phase.index + 1, TOTAL)}</span>
                  <span className="rounded-full bg-black/25 px-2 py-0.5">{copy.difficulty[question.difficulty]}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/25">
                  <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${((phase.index + (revealed ? 1 : 0)) / TOTAL) * 100}%` }} />
                </div>
                <h3 className="mt-4 font-poppins text-base font-semibold leading-snug md:text-xl">{question.prompt[lang]}</h3>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {question.options.map((option, i) => {
                    const isAnswer = i === question.answerIndex;
                    const isPicked = i === picked;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={revealed}
                        onClick={() => pick(i)}
                        className={cn(
                          "flex min-h-[48px] items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-left font-poppins text-sm transition-colors",
                          !revealed && "bg-black/30 hover:bg-black/45",
                          revealed && isAnswer && "bg-brand-green",
                          revealed && isPicked && !isAnswer && "bg-red-600",
                          revealed && !isAnswer && !isPicked && "bg-black/30 opacity-60",
                        )}
                      >
                        <span>{option[lang]}</span>
                        {revealed && isAnswer && <CheckCircle2 className="size-5 shrink-0" />}
                        {revealed && isPicked && !isAnswer && <XCircle className="size-5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                {revealed && (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-poppins text-sm text-white/90">
                      <span className="font-semibold">{picked === question.answerIndex ? copy.correct : copy.wrong}</span>{" "}
                      {question.fact[lang]}
                    </p>
                    <button
                      type="button"
                      onClick={advance}
                      className="flex h-[44px] shrink-0 items-center justify-center rounded-[8px] bg-surface-page px-5 font-poppins text-sm uppercase tracking-wide"
                    >
                      {isLast ? copy.finish : copy.next}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {phase.kind === "done" && (() => {
            const score = scoreOf(phase.answers);
            return (
              <div className="md:max-w-[75%]">
                <p className="font-poppins text-5xl font-bold md:text-6xl">
                  {score}<span className="text-2xl text-white/70 md:text-3xl">/{TOTAL}</span>
                </p>
                <h3 className="mt-1 font-poppins text-lg font-semibold uppercase md:text-xl">{copy.resultTitle(score)}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void share(score, contextOf(phase.attempt))}
                    className="flex h-[44px] items-center gap-2 rounded-[8px] bg-white px-4 font-poppins text-sm uppercase tracking-wide"
                    style={{ color: CLARET }}
                  >
                    <Share2 className="size-4" /> {copy.share}
                  </button>
                  <button type="button" onClick={start} className="flex h-[44px] items-center rounded-[8px] bg-surface-page px-4 font-poppins text-sm uppercase tracking-wide">
                    {copy.playAgain}
                  </button>
                  {isGuest && (
                    <button
                      type="button"
                      onClick={() => { trackCampaignQuizCta({ ...contextOf(phase.attempt), score, target: "signup" }); openAuthPrompt(); }}
                      className="flex h-[44px] items-center rounded-[8px] bg-brand-green px-4 font-poppins text-sm uppercase tracking-wide"
                    >
                      {copy.signup}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { trackCampaignQuizCta({ ...contextOf(phase.attempt), score, target: "more_games" }); onMoreGames?.(); }}
                    className={cn(
                      "flex h-[44px] items-center rounded-[8px] px-4 font-poppins text-sm uppercase tracking-wide",
                      isGuest ? "border border-white/40" : "bg-brand-green",
                    )}
                  >
                    {copy.moreGames}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
