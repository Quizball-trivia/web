"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Flag as FlagIcon, Loader2, Send, X } from "lucide-react";
import { CardDealReel } from "@/features/fifa-universe/components/CardDealReel";
import { DetectiveCard, type ClueKey, type DetectiveCardData } from "@/features/fifa-universe/components/DetectiveCard";
import { ResultSplash } from "@/features/daily/components/ResultSplash";
import { useResultSplash } from "@/features/daily/components/useResultSplash";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import { useMiniT } from "@/features/mini-games/lib/i18n";
import { PartnerApiError } from "../../api/partnerApiClient";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import type { CdPlayState } from "./cardDetectivePartner.types";
import { useCardDetectiveCopy } from "./cardDetectivePartnerCopy";

type Phase = "loading" | "intro" | "deal" | "play" | "result" | "error";

/** A resolved card held on screen before the next one is dealt. */
interface Shown {
  card: DetectiveCardData;
  solved: boolean;
  points: number;
}

function newNonce(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "")
    : `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

/** The board for the card being played: only what the server has opened, inert placeholders elsewhere. */
function boardCard(current: NonNullable<CdPlayState["current"]>): DetectiveCardData {
  const c = current.clues;
  return {
    editionLabel: "",
    name: "",
    overall: c.rating ?? 0,
    position: c.position ?? "",
    nation: c.nation?.name ?? "",
    nationCode: c.nation?.code ?? "",
    league: c.league ?? "",
    club: c.club ?? "",
    stats: { pac: c.pac ?? 0, sho: c.sho ?? 0, pas: c.pas ?? 0, dri: c.dri ?? 0, def: c.def ?? 0, phy: c.phy ?? 0 },
    faceUrl: null,
  };
}

/**
 * FIFA Card Detective for Freecroco: the quizball.io board (DetectiveCard) driven by the server. Every clue purchase,
 * guess and give-up is a request; the browser never holds a card's identity before the server resolves it.
 */
export function PartnerCardDetectiveGame({ api, onFinished, onExit }: PartnerGameScreenProps) {
  const t = useMiniT();
  const copy = useCardDetectiveCopy();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("loading");
  const [play, setPlay] = useState<CdPlayState | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guessText, setGuessText] = useState("");
  const [showQuit, setShowQuit] = useState(false);
  const { splashProps, fire } = useResultSplash();
  const nonceRef = useRef<string | null>(null);
  const advanceRef = useRef<number | null>(null);
  const reportedRef = useRef(false);

  const report = useCallback(
    (state: CdPlayState) => {
      if (!state.finished || reportedRef.current) return;
      reportedRef.current = true;
      // A play cancelled by a block (sent: false) has no points to show.
      if (state.finished.sent) onFinished({ playId: state.finished.playId, score: state.finished.score });
      else onExit();
    },
    [onExit, onFinished],
  );

  useEffect(() => () => { if (advanceRef.current) window.clearTimeout(advanceRef.current); }, []);

  const adopt = useCallback(
    (state: CdPlayState, dealNext: boolean) => {
      setPlay(state);
      setWrong(null);
      // Already over (a retried start, or the idle deadline passed): straight to the host's result.
      if (state.finished) {
        report(state);
        return;
      }
      if (dealNext) setPhase(state.current ? "deal" : "result");
    },
    [report],
  );

  const reload = useCallback(async () => {
    try {
      const { play: open } = await api.get<{ play: CdPlayState | null }>("current");
      setShown(null);
      if (open) adopt(open, true);
      else setPhase("intro");
    } catch {
      setPhase("error");
    }
  }, [adopt, api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** After a refused or lost action the play itself (finished included) is the truth: show it, or its result. */
  const reconcile = useCallback(
    async (playId: string, shownRef: string | undefined): Promise<boolean> => {
      try {
        const state = await api.get<CdPlayState>(`plays/${playId}`);
        setShown(null);
        adopt(state, state.current?.ref !== shownRef);
        return true;
      } catch {
        return false;
      }
    },
    [adopt, api],
  );

  const fail = useCallback(
    async (err: unknown, playing?: CdPlayState) => {
      if (playing && !(err instanceof PartnerApiError && err.status < 500 && err.code === "invalid_request")) {
        // stale_version / play_not_active, or no answer at all (it may have committed): ask the play.
        if (await reconcile(playing.playId, playing.current?.ref)) return;
      }
      setError(err instanceof PartnerApiError && err.code === "quota_exhausted" ? copy.noPlaysLeft : copy.somethingWrong);
    },
    [copy, reconcile],
  );

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (!nonceRef.current) nonceRef.current = newNonce();
    try {
      adopt(await api.post<CdPlayState>("start", { clientNonce: nonceRef.current }), true);
    } catch (err) {
      if (err instanceof PartnerApiError && err.status < 500) nonceRef.current = null;
      await fail(err);
    } finally {
      setBusy(false);
    }
  };

  /** Shows the card that just resolved, then deals the next one (or ends the play). */
  const resolve = useCallback(
    (state: CdPlayState, solved: boolean) => {
      const done = state.resolved[state.resolved.length - 1];
      setPlay(state);
      setWrong(null);
      if (done) {
        setShown({ card: done.card, solved, points: done.points });
        if (solved) fire("correct", "right", { points: done.points, forcePoints: true });
        else fire("wrong", "right");
      }
      setPhase("result");
      if (advanceRef.current) window.clearTimeout(advanceRef.current);
      advanceRef.current = window.setTimeout(() => {
        advanceRef.current = null;
        if (state.finished) {
          report(state);
          return;
        }
        setShown(null);
        setPhase("deal");
      }, solved ? 1600 : 2400);
    },
    [fire, report],
  );

  const act = async <T,>(path: string, body: Record<string, unknown>, then: (result: T) => void) => {
    if (!play?.current || busy) return;
    setBusy(true);
    setError(null);
    try {
      then(await api.post<T>(`plays/${play.playId}/${path}`, { ref: play.current.ref, version: play.version, ...body }));
    } catch (err) {
      await fail(err, play);
    } finally {
      setBusy(false);
    }
  };

  const reveal = (clue: ClueKey) => {
    if (phase !== "play") return;
    void act<CdPlayState>("reveal", { clue }, (state) => adopt(state, false));
  };

  const guess = (name: string) => {
    if (phase !== "play" || !name.trim()) return;
    setGuessText("");
    void act<{ correct: boolean; state: CdPlayState }>("guess", { name: name.trim() }, ({ correct, state }) => {
      if (correct) resolve(state, true);
      else {
        adopt(state, false);
        setWrong(name.trim());
      }
    });
  };

  const giveUp = () => {
    if (phase !== "play") return;
    void act<CdPlayState>("skip", {}, (state) => resolve(state, false));
  };

  const quit = async () => {
    setShowQuit(false);
    if (!play || play.state === "finished") return onExit();
    try {
      report(await api.post<CdPlayState>(`plays/${play.playId}/finish`, {}));
    } catch {
      onExit();
    }
  };

  const current = play?.current ?? null;
  const open = useMemo(() => new Set<ClueKey>(current?.open ?? []), [current]);
  const index = play ? Math.min(play.index + (phase === "result" ? 0 : 1), play.cardCount) : 0;
  const cardNumber = shown ? (play?.resolved.length ?? 1) : index;

  if (phase === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-white/50" aria-hidden />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="font-poppins text-sm text-white/70">{copy.somethingWrong}</p>
        <button type="button" onClick={() => { setPhase("loading"); void reload(); }} className="h-11 rounded-full bg-white px-5 font-poppins text-sm font-semibold text-black">
          {copy.tryAgain}
        </button>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto mt-4 flex max-w-md flex-col gap-4">
        <div className="rounded-2xl bg-white/[0.06] p-5">
          <h1 className="font-poppins text-xl font-semibold uppercase text-white">{copy.title}</h1>
          <ul className="mt-3 space-y-1.5 font-poppins text-sm text-white/75">
            {copy.rules.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        {error && <p className="font-poppins text-sm text-brand-red-soft">{error}</p>}
        <button
          type="button"
          onClick={start}
          disabled={busy}
          data-testid="cd-start"
          className="h-12 rounded-full bg-brand-yellow font-poppins text-base font-semibold uppercase text-black transition-opacity disabled:opacity-60"
        >
          {busy ? <Loader2 className="mx-auto size-5 animate-spin" aria-hidden /> : copy.start}
        </button>
        <button type="button" onClick={onExit} className="h-10 font-poppins text-sm text-white/60 underline-offset-2 hover:underline">
          {copy.back}
        </button>
      </div>
    );
  }

  const boardData = shown?.card ?? (current ? boardCard(current) : null);

  return (
    <div className="mx-auto flex max-w-md flex-col pb-6">
      <div className="mb-2 mt-2 flex items-center justify-between gap-3">
        <button type="button" aria-label={copy.quit} onClick={() => setShowQuit(true)} className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <X className="size-5" aria-hidden />
        </button>
        <span className="font-poppins text-xs font-semibold uppercase tracking-wider text-white/70">
          {t("Card {n}/{total}", { n: Math.max(1, cardNumber), total: play?.cardCount ?? 10 })}
        </span>
        <span className="font-poppins text-sm font-semibold text-brand-yellow" data-testid="cd-score">
          {copy.pointsTotal(play?.score ?? 0)}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {phase === "deal" && current ? (
          <motion.div key={`deal-${current.ref}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-[420px] flex-col justify-center">
            <CardDealReel cardNumber={play?.index ?? 0} hint={copy.dealHint} onDone={() => setPhase((p) => (p === "deal" ? "play" : p))} />
          </motion.div>
        ) : boardData ? (
          <motion.div
            key={`card-${shown ? "shown" : current?.ref}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: 90, scale: 0.9 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            style={{ transformPerspective: 900 }}
          >
            <div className="mb-2 flex items-center justify-between font-poppins text-[11px] font-semibold uppercase tracking-wider text-white/55">
              <span>{shown ? (shown.solved ? t("Solved") : t("Revealed")) : t("Tap a lock to buy that clue")}</span>
              {!shown && current && <span className="text-brand-yellow" data-testid="cd-card-points">{copy.cardPoints(current.points)}</span>}
            </div>
            <DetectiveCard
              card={boardData}
              costs={play?.clueCosts}
              open={open}
              coins={shown ? 0 : (current?.points ?? 0)}
              over={Boolean(shown)}
              solved={shown?.solved ?? false}
              onReveal={reveal}
            />
            <div className="mt-4">
              {shown ? (
                <p className="text-center font-poppins text-sm font-semibold text-white/75">
                  {shown.solved ? copy.solvedFor(shown.points) : t("It was {name}", { name: shown.card.name })}
                </p>
              ) : (
                <div className="space-y-2.5">
                  <form
                    className="relative"
                    onSubmit={(e) => {
                      e.preventDefault();
                      guess(guessText);
                    }}
                  >
                    <input
                      value={guessText}
                      onChange={(e) => setGuessText(e.target.value)}
                      disabled={busy || phase !== "play"}
                      placeholder={t("Name the player…")}
                      aria-label={t("Name the player…")}
                      autoComplete="off"
                      spellCheck={false}
                      data-testid="cd-guess-input"
                      className="h-14 w-full rounded-[14px] bg-brand-blue px-5 pr-14 text-center font-poppins text-base font-semibold uppercase text-white outline-none placeholder:normal-case placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-brand-yellow disabled:opacity-50"
                    />
                    <button type="submit" aria-label={copy.send} disabled={busy || !guessText.trim()} className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/85 hover:bg-white/10 disabled:opacity-40">
                      <Send className="size-4" aria-hidden />
                    </button>
                  </form>
                  <div className="flex items-center justify-between">
                    <span className={`font-poppins text-[11px] font-semibold uppercase tracking-wider ${wrong ? "text-brand-red" : "text-white/40"}`}>
                      {wrong ? copy.wrongGuess(wrong, play?.wrongGuessCost ?? 15) : copy.correctNow(current?.points ?? 0)}
                    </span>
                    <button type="button" onClick={giveUp} disabled={busy || phase !== "play"} data-testid="cd-give-up" className="inline-flex items-center gap-1 font-poppins text-[11px] font-semibold uppercase tracking-wider text-white/50 underline-offset-2 hover:underline disabled:opacity-40">
                      <FlagIcon className="size-3.5" aria-hidden /> {t("Give up")}
                    </button>
                  </div>
                  {error && <p className="font-poppins text-xs text-brand-red-soft">{error}</p>}
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ResultSplash {...splashProps} />
      <QuitGameDialog open={showQuit} onOpenChange={setShowQuit} description={copy.quitBody} onQuit={() => void quit()} />
    </div>
  );
}
