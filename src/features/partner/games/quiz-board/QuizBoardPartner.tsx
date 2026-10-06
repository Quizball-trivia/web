"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import { DailyChallengeHeader } from "@/features/daily/components/DailyChallengeHeader";
import { DailyGameStage } from "@/features/daily/components/DailyGameStage";
import { QuizBoardBanner, QuizBoardGrid, QuizBoardQuestionCard } from "@/features/mini-games/components/quizBoardUi";
import { createRealtimeCommandId } from "@/lib/realtime/command-id";
import { money } from "@/features/mini-games/lib/odds";
import { PartnerApiError } from "../../api/partnerApiClient";
import { PARTNER_GAME_DEMO_SLUG, partnerGameTitle } from "../../partnerGames";
import { partnerCopy, toPartnerLocale } from "../../partnerCopy";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import {
  isStale,
  QUIZ_BOARD_GRACE_MS,
  serverOffset,
  shownOwners,
  shownScore,
  type QuizBoardQuestion,
  type QuizBoardResponse,
  type QuizBoardView,
} from "./quizBoardApi";
import { dailyCopy } from "../dailies/dailyCopy";
import { quizBoardCopy } from "./quizBoardCopy";

/** How long an answered question stays on screen showing right / wrong before the board takes picks again. */
const REVEAL_MS = 1_400;

type Reveal = { question: QuizBoardQuestion; choice: number | null; correctIndex: number };

type Screen = "loading" | "intro" | "starting" | "board" | "no-plays";

export function QuizBoardPartner({ gameId, api, onFinished, onExit }: PartnerGameScreenProps) {
  const { locale } = useLocale();
  const partnerLocale = toPartnerLocale(locale);
  const copy = quizBoardCopy(partnerLocale);
  const shellCopy = partnerCopy(partnerLocale);
  // The same leave dialog copy as the Freecroco dailies, so every partner game asks the same way.
  const quitCopy = dailyCopy(partnerLocale);
  const copyRef = useRef(copy);
  copyRef.current = copy;

  const [screen, setScreen] = useState<Screen>("loading");
  const [view, setView] = useState<QuizBoardView | null>(null);
  const viewRef = useRef<QuizBoardView | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [shownSeq, setShownSeq] = useState(0);
  const shownSeqRef = useRef(0);
  const lastQuestionRef = useRef<QuizBoardQuestion | null>(null);
  const [pendingChoice, setPendingChoice] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const clockOffsetRef = useRef<number | null>(null);
  const startIdRef = useRef<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const markShown = (seq: number) => {
    shownSeqRef.current = seq;
    setShownSeq(seq);
  };

  const receive = useCallback((next: QuizBoardView | null, opts: { resume?: boolean; sentAt?: number } = {}) => {
    if (!next || isStale(viewRef.current, next)) return;
    viewRef.current = next;
    const receivedAt = Date.now();
    clockOffsetRef.current = serverOffset(clockOffsetRef.current, next.serverNow, opts.sentAt ?? receivedAt, receivedAt);
    if (opts.resume) markShown(next.events.at(-1)?.seq ?? 0);
    setPendingChoice(null);
    setView(next);
    setScreen("board");
  }, []);

  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof PartnerApiError && err.code === "quota_exhausted") {
        setScreen("no-plays");
        return;
      }
      setError(copyRef.current.error);
    },
    [],
  );

  const request = useCallback(
    async (run: () => Promise<QuizBoardResponse>, opts: { resume?: boolean } = {}) => {
      setBusy(true);
      setError(null);
      try {
        const sentAt = Date.now();
        const res = await run();
        receive(res.board, { ...opts, sentAt });
        return res.board;
      } catch (err) {
        fail(err);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [receive, fail],
  );

  // Resume an unfinished board (a reload or a dropped connection), else the intro.
  useEffect(() => {
    let cancelled = false;
    const sentAt = Date.now();
    api
      .get<QuizBoardResponse>("current")
      .then((res) => {
        if (cancelled) return;
        if (res.board) receive(res.board, { resume: true, sentAt });
        else setScreen("intro");
      })
      .catch((err) => {
        if (cancelled) return;
        setScreen("intro");
        fail(err);
      });
    return () => {
      cancelled = true;
    };
  }, [api, receive, fail]);

  // Show the outcome of each newly answered (or timed-out) question before the board takes picks again.
  useEffect(() => {
    if (!view) return;
    const answered = lastQuestionRef.current;
    if (view.question) lastQuestionRef.current = view.question;
    const fresh = view.events.filter((e) => e.seq > shownSeqRef.current);
    const shown = fresh.find((e) => (e.kind === "answer" || e.kind === "timeout") && answered?.tile === e.tile);
    if (!shown || !answered) {
      if (fresh.length > 0) markShown(fresh[fresh.length - 1].seq);
      setReveal(null);
      return;
    }
    setReveal({ question: answered, choice: shown.choice, correctIndex: shown.correctIndex ?? -1 });
    const id = window.setTimeout(() => {
      markShown(fresh[fresh.length - 1].seq);
      setReveal(null);
    }, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [view]);

  // Countdown, and a refresh just after a deadline so the server's timeout (and what follows) shows up.
  const deadline = view?.deadlineAt ? new Date(view.deadlineAt).getTime() : null;
  useEffect(() => {
    if (!deadline || view?.phase === "finished") return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [deadline, view?.phase]);
  const serverNow = now + (clockOffsetRef.current ?? 0);
  const overdue = deadline !== null && serverNow > deadline + QUIZ_BOARD_GRACE_MS + 300;
  const refreshing = useRef(false);
  const lastRefreshAt = useRef(0);
  useEffect(() => {
    if (!overdue || refreshing.current || busy || reveal) return;
    if (now - lastRefreshAt.current < 1_000) return;
    lastRefreshAt.current = now;
    refreshing.current = true;
    const playId = viewRef.current?.playId;
    void request(() => api.get<QuizBoardResponse>(playId ? `current?playId=${playId}` : "current")).finally(() => {
      refreshing.current = false;
    });
  }, [overdue, busy, reveal, api, request, now]);

  const start = () => {
    startIdRef.current ??= createRealtimeCommandId();
    const startId = startIdRef.current;
    setScreen("starting");
    void request(() => api.post<QuizBoardResponse>("start", { startId })).then((board) => {
      if (!board) setScreen((s) => (s === "starting" ? "intro" : s));
    });
  };

  const pick = (tile: number) => {
    if (!view || busy) return;
    void request(() => api.post<QuizBoardResponse>("pick", { playId: view.playId, turn: view.turn, tile }));
  };

  const answer = (choice: number) => {
    if (!view || busy || pendingChoice !== null) return;
    setPendingChoice(choice);
    void request(() => api.post<QuizBoardResponse>("answer", { playId: view.playId, turn: view.turn, choice })).then(
      (board) => {
        if (!board) setPendingChoice(null);
      },
    );
  };

  const leave = () => {
    if (!view) return;
    setConfirmLeave(false);
    void request(() => api.post<QuizBoardResponse>("leave", { playId: view.playId })).then((board) => {
      if (board?.result && board.result.endReason !== "cancelled") onFinished({ playId: board.playId, score: board.result.score });
    });
  };

  const inPlay = view !== null && view.phase !== "finished";
  const onBack = () => (inPlay ? setConfirmLeave(true) : onExit());

  const title = partnerGameTitle(gameId, partnerLocale);
  const score = view ? shownScore(view, shownSeq) : 0;
  const owners = view ? shownOwners(view, shownSeq) : new Map();
  const activeTile = reveal ? reveal.question.tile : (view?.activeTile ?? null);
  const canPick = !!view && !reveal && !busy && view.phase === "pick";
  const secondsLeft =
    deadline !== null && view?.phase === "answer" ? Math.max(0, Math.ceil((deadline - serverNow) / 1000)) : null;

  const errorRow = error ? (
    <div className="flex items-center justify-center gap-3 font-poppins text-xs text-brand-red-soft" role="alert">
      <span>{error}</span>
      {screen === "board" ? (
        <button
          type="button"
          className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white"
          onClick={() => void request(() => api.get<QuizBoardResponse>(view ? `current?playId=${view.playId}` : "current"))}
        >
          {copy.retry}
        </button>
      ) : null}
    </div>
  ) : null;

  if (screen === "board" && view) {
    return (
      <div
        className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white"
        data-testid="quiz-board-partner"
        data-screen="board"
      >
        <DailyGameStage
          contentClassName="max-w-[560px]"
          header={
            <DailyChallengeHeader
              onQuit={onBack}
              currentIndex={0}
              total={view.tiles.length}
              centerLabel={title}
              rightSlot={
                <span className="text-brand-yellow" data-testid="quiz-board-score" aria-label={`${copy.pointsLabel}: ${money(score)}`}>
                  {money(score)}
                </span>
              }
              className="px-0 pt-0"
            />
          }
        >
          <QuizBoardGrid
            variant="partner"
            categories={view.categories}
            tiles={view.tiles.map((tile) => ({ tile: tile.tile, value: tile.value, owner: owners.get(tile.tile) ?? null }))}
            activeTile={activeTile}
            canPick={canPick}
            onPick={pick}
          />
          <AnimatePresence mode="wait">
            {reveal ? (
              <motion.div key={`question-${reveal.question.tile}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <QuizBoardQuestionCard
                  variant="partner"
                  value={reveal.question.value}
                  steal={false}
                  prompt={reveal.question.prompt}
                  image={reveal.question.image}
                  options={reveal.question.options}
                  selected={reveal.choice}
                  correctIndex={reveal.correctIndex}
                  onAnswer={() => undefined}
                  footer={
                    reveal.choice === null ? (
                      <p className="mt-3 text-center font-poppins text-xs font-semibold uppercase text-brand-orange">{copy.timesUp}</p>
                    ) : null
                  }
                />
              </motion.div>
            ) : view.phase === "pick" ? (
              <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <QuizBoardBanner variant="partner" tone="player">
                  {copy.pickTile}
                </QuizBoardBanner>
              </motion.div>
            ) : view.phase === "answer" && view.question ? (
              // Same key as the reveal: the card stays put while it turns right / wrong.
              <motion.div key={`question-${view.question.tile}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <QuizBoardQuestionCard
                  variant="partner"
                  value={view.question.value}
                  steal={false}
                  prompt={view.question.prompt}
                  image={view.question.image}
                  options={view.question.options}
                  selected={pendingChoice}
                  correctIndex={null}
                  onAnswer={answer}
                  footer={
                    secondsLeft !== null ? (
                      <div className="mt-2.5 flex items-center gap-2" data-testid="quiz-board-timer">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full transition-[width] duration-200 ${secondsLeft <= 5 ? "bg-brand-red-soft" : "bg-brand-yellow"}`}
                            style={{ width: `${Math.min(100, (secondsLeft / 20) * 100)}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-poppins text-xs font-semibold tabular-nums text-white/70">
                          {copy.timeLeft(secondsLeft)}
                        </span>
                      </div>
                    ) : null
                  }
                />
              </motion.div>
            ) : view.result?.endReason === "cancelled" ? (
              <div
                key="cancelled"
                className="flex flex-col items-center gap-2 rounded-[24px] border border-white/10 bg-white/5 p-5 text-center"
                data-testid="quiz-board-cancelled"
              >
                <p className="font-poppins text-base font-semibold text-white">{copy.cancelledTitle}</p>
                <p className="font-poppins text-sm text-white/70">{copy.cancelledBody}</p>
                <button
                  type="button"
                  onClick={onExit}
                  className="mt-2 h-11 rounded-full bg-white px-6 font-poppins text-sm font-semibold text-black transition-colors hover:bg-white/90"
                >
                  {copy.back}
                </button>
              </div>
            ) : view.phase === "finished" && view.result ? (
              <motion.div
                key="over"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 rounded-[24px] border border-white/10 bg-white/5 p-5 text-center"
                data-testid="quiz-board-over"
              >
                <p className="font-poppins text-xl font-semibold uppercase text-white">
                  {view.result.endReason === "completed" ? copy.completedTitle : copy.endedTitle}
                </p>
                <p className="font-poppins text-sm font-semibold text-brand-yellow" data-testid="quiz-board-final-score">
                  {copy.finalScore(money(view.result.score))}
                </p>
                <button
                  type="button"
                  onClick={() => onFinished({ playId: view.playId, score: view.result!.score })}
                  data-testid="quiz-board-see-points"
                  className="mt-2 h-11 rounded-full bg-brand-yellow px-6 font-poppins text-sm font-semibold text-black transition-colors hover:bg-brand-yellow/90"
                >
                  {copy.seePoints}
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
          {errorRow}
        </DailyGameStage>

        <QuitGameDialog
          open={confirmLeave && inPlay}
          onOpenChange={setConfirmLeave}
          title={quitCopy.quitTitle}
          description={quitCopy.quitBody}
          onQuit={leave}
        />
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-5" data-testid="quiz-board-partner" data-screen={screen}>
      {screen === "intro" ? (
        <>
          <button
            type="button"
            onClick={onExit}
            data-testid="quiz-board-intro-back"
            className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-white/[0.08] px-3 font-poppins text-xs font-semibold text-white transition-colors hover:bg-white/[0.14]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {shellCopy.backToGames}
          </button>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl bg-brand-blue">
            <div className="aspect-video w-full overflow-hidden">
              <DemoModeArt slug={PARTNER_GAME_DEMO_SLUG[gameId]} className="size-full" />
            </div>
            <div className="flex flex-col gap-2 p-4">
              <h1 className="font-poppins text-lg font-semibold uppercase text-white">{title}</h1>
              <p className="font-poppins text-sm text-white/70">{copy.subtitle}</p>
              <p className="font-poppins text-sm font-semibold text-brand-yellow">{copy.rules}</p>
              <p className="font-poppins text-xs text-white/50">{quitCopy.usesPlay}</p>
              <button
                type="button"
                onClick={start}
                disabled={busy}
                data-testid="quiz-board-start"
                className="mt-2 inline-flex h-11 w-fit items-center gap-1.5 rounded-full bg-brand-yellow px-6 font-poppins text-sm font-semibold text-black transition-colors hover:bg-brand-yellow/90 disabled:opacity-60"
              >
                <Play className="size-4" aria-hidden />
                {copy.start}
              </button>
            </div>
          </motion.div>
        </>
      ) : screen === "no-plays" ? (
        <div className="mt-6 flex flex-col items-center gap-3 text-center" data-testid="quiz-board-no-plays">
          <p className="font-poppins text-lg font-semibold text-white">{copy.noPlaysTitle}</p>
          <p className="font-poppins text-sm text-white/70">{copy.noPlaysBody}</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-2 h-10 rounded-full bg-white/[0.08] px-5 font-poppins text-sm font-semibold text-white transition-colors hover:bg-white/[0.14]"
          >
            {shellCopy.backToGames}
          </button>
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center gap-3 text-white/70">
          <Loader2 className="size-8 animate-spin text-brand-yellow" aria-hidden />
          {screen === "starting" ? <p className="font-poppins text-sm">{copy.starting}</p> : null}
        </div>
      )}
      {errorRow}
    </div>
  );
}
