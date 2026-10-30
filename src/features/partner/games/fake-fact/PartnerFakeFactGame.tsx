"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { datoFalsoCopy } from "@/features/dato-falso/datoFalso.copy";
import { localCard } from "@/features/dato-falso/datoFalso.daily";
import { DfClaim, DfOptions, DfVerdict } from "@/features/dato-falso/DatoFalsoCard";
import { GreenButton, TopBar, poppins } from "@/features/wordgames/ui";
import { PartnerApiError } from "../../api/partnerApiClient";
import { serverOffset } from "../quiz-board/quizBoardApi";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import type { FakeFactState } from "./fakeFactPartner.types";
import { useFakeFactCopy } from "./fakeFactPartnerCopy";

type Phase = "loading" | "intro" | "play" | "error";

const STEP_RANK: Record<FakeFactState["step"], number> = { card1: 0, between: 1, card2: 2, done: 3 };
/** How far a play has got: a play only moves forward, so a lower rank is an older response. An ended play is final
 *  (a cancelled one carries no results). */
const progress = (state: FakeFactState) => (state.finished ? 1_000 : state.results.length * 10 + STEP_RANK[state.step]);

function newNonce(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replaceAll("-", "")
    : `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

/** Seconds left to `deadline` on the server's clock (`offset` = server minus this device), ticking. */
function useSecondsLeft(deadline: string | null, offset: number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setNow(Date.now() + offset);
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [deadline, offset]);
  return deadline && now !== null ? Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)) : null;
}

/**
 * Fake Fact for Freecroco: Dato falso's card (claim, five facts, verdict) driven by the server. Card 1 is worth 100;
 * a right card 1 opens a bonus card worth 40. The browser never holds a card's fake before the server settles it.
 */
export function PartnerFakeFactGame({ api, onFinished, onExit }: PartnerGameScreenProps) {
  const { locale } = useLocale();
  const copy = useFakeFactCopy();
  const df = datoFalsoCopy(locale);
  const [phase, setPhase] = useState<Phase>("loading");
  const [play, setPlay] = useState<FakeFactState | null>(null);
  const [offset, setOffset] = useState(0);
  const [selection, setSelection] = useState<{ card: string; option: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nonceRef = useRef<string | null>(null);
  const reportedRef = useRef(false);
  const playRef = useRef<FakeFactState | null>(null);
  // Today's latest ended play: shown when a start finds no plays left (the sweeper settled it while we were away).
  const lastRef = useRef<FakeFactState | null>(null);

  const offsetRef = useRef<number | null>(null);

  /** `sentAt`: when the request left, so a slow response never makes the countdown show time the server has not got. */
  const adopt = useCallback((state: FakeFactState, sentAt: number) => {
    offsetRef.current = serverOffset(offsetRef.current, state.serverNow, sentAt, Date.now());
    const shown = playRef.current;
    // A slow response from before a newer one (e.g. an expiry read overtaken by opening the bonus) is dropped.
    if (shown && shown.playId === state.playId && progress(state) < progress(shown)) return;
    playRef.current = state;
    setOffset(offsetRef.current);
    setPlay(state);
    setPhase("play");
  }, []);

  const report = useCallback(() => {
    if (!play?.finished || reportedRef.current) return;
    reportedRef.current = true;
    // A play cancelled by a block (sent: false) has no points to show.
    if (play.finished.sent) onFinished({ playId: play.finished.playId, score: play.finished.score });
    else onExit();
  }, [onExit, onFinished, play]);

  const reload = useCallback(async () => {
    const sentAt = Date.now();
    try {
      const { play: open, last } = await api.get<{ play: FakeFactState | null; last?: FakeFactState | null }>("current");
      lastRef.current = last ?? null;
      if (open) adopt(open, sentAt);
      else setPhase("intro");
    } catch {
      setPhase("error");
    }
  }, [adopt, api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** After a refused or lost request the play itself is the truth. */
  const reconcile = useCallback(
    async (playId: string): Promise<FakeFactState | null> => {
      const sentAt = Date.now();
      try {
        const state = await api.get<FakeFactState>(`plays/${playId}`);
        adopt(state, sentAt);
        return state;
      } catch {
        setError(copy.somethingWrong);
        return null;
      }
    },
    [adopt, api, copy.somethingWrong],
  );

  const send = async (path: string, body?: unknown) => {
    if (!play || busy) return;
    setBusy(true);
    setError(null);
    const sentAt = Date.now();
    try {
      adopt(await api.post<FakeFactState>(`plays/${play.playId}/${path}`, body), sentAt);
    } catch (err) {
      if (err instanceof PartnerApiError && err.status < 500 && err.code === "invalid_request") setError(copy.somethingWrong);
      else await reconcile(play.playId);
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    if (!nonceRef.current) nonceRef.current = newNonce();
    const sentAt = Date.now();
    try {
      adopt(await api.post<FakeFactState>("start", { client_nonce: nonceRef.current }), sentAt);
    } catch (err) {
      if (err instanceof PartnerApiError && err.status < 500) nonceRef.current = null;
      if (err instanceof PartnerApiError && err.code === "quota_exhausted" && lastRef.current) {
        adopt(lastRef.current, sentAt);
        return;
      }
      setError(err instanceof PartnerApiError && err.code === "quota_exhausted" ? copy.noPlaysLeft : copy.somethingWrong);
    } finally {
      setBusy(false);
    }
  };

  const seconds = useSecondsLeft(play?.deadline ?? null, offset);
  const playId = play?.playId;
  const deadline = play?.deadline;
  // Failed asks for the same deadline; a new deadline starts again from 0.
  const [expiryMisses, setExpiryMisses] = useState<{ deadline: string | null; n: number }>({ deadline: null, n: 0 });
  const misses = expiryMisses.deadline === deadline ? expiryMisses.n : 0;
  // At 0 the server settles the card (after its 1 s grace): ask for the play then, and again (slower) if that fails.
  useEffect(() => {
    if (!playId || !deadline || seconds !== 0 || misses >= 6) return;
    const id = window.setTimeout(async () => {
      const state = await reconcile(playId);
      // Failed, or answered before the server's own deadline passed (the card is still open): ask again.
      if (!state || (!state.finished && state.deadline === deadline)) setExpiryMisses({ deadline, n: misses + 1 });
    }, 1_300 * (misses + 1));
    return () => window.clearTimeout(id);
  }, [deadline, misses, playId, reconcile, seconds]);

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

  if (phase === "intro" || !play) {
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
          data-testid="ff-start"
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

  // A pick belongs to the card it was made on: a new card starts with none.
  const selected = selection && selection.card === play.card?.id ? selection.option : null;
  const settled = play.results[play.results.length - 1];
  const onCard = play.card !== null;
  const cardIndex: 0 | 1 = play.step === "card2" || (!onCard && play.results.length === 2) ? 1 : 0;
  const card = onCard ? localCard(play.card!, locale) : settled ? localCard(settled.card, locale) : null;
  const reveal = !onCard && settled ? { fake: String(settled.fake), explain: settled.explain[locale as keyof typeof settled.explain] ?? settled.explain.en } : null;
  const pick = settled?.pick == null ? null : String(settled.pick);
  const fakeLabel = reveal && card ? card.options.find((o) => o.id === reveal.fake)?.label ?? "" : "";
  const verdictCopy = { ...df, right: copy.right };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col pb-6 pt-2">
      <TopBar
        wrap
        brand={df.brand}
        seconds={onCard ? seconds : null}
        exitLabel={copy.back}
        onExit={onExit}
        right={
          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-black tabular-nums text-white" style={poppins} data-testid="ff-score">
            {copy.pointsTotal(play.score)}
          </span>
        }
      />
      <p className="mt-3 text-xs font-black uppercase tracking-wide text-brand-yellow" style={poppins}>
        {cardIndex === 0 ? copy.mainCard : copy.bonusCard}
      </p>
      {card && (
        <>
          <DfClaim card={card} copy={df} className="mt-3" />
          <DfOptions
            card={card}
            copy={df}
            removed={[]}
            selected={onCard ? selected : null}
            reveal={reveal}
            myPick={reveal ? pick : null}
            disabled={busy || !onCard}
            onSelect={(option) => play.card && setSelection({ card: play.card.id, option })}
          />
        </>
      )}
      {onCard ? (
        <>
          <div className="flex-1" />
          <div className="sticky bottom-0 mt-5 bg-surface-page/95 pb-1 pt-2">
            {error && <p className="mb-2 font-poppins text-xs text-brand-red-soft">{error}</p>}
            {seconds === 0 && misses >= 6 && (
              <button
                type="button"
                onClick={() => setExpiryMisses({ deadline: deadline ?? null, n: 0 })}
                className="mb-2 h-10 w-full rounded-full bg-white/10 font-poppins text-sm font-semibold text-white hover:bg-white/20"
              >
                {copy.tryAgain}
              </button>
            )}
            <GreenButton
              disabled={!selected || busy || seconds === 0}
              onClick={() => selected && void send("answer", { card: cardIndex, option: Number(selected) })}
            >
              {busy ? df.sending : selected ? df.lockIn : df.pickHint}
            </GreenButton>
          </div>
        </>
      ) : settled && reveal ? (
        <DfVerdict copy={verdictCopy} fakeLabel={fakeLabel} points={settled.points} pick={pick} explain={reveal.explain}>
          {play.step === "between" ? (
            <>
              <GreenButton className="mt-3 h-12 text-sm" disabled={busy} onClick={() => void send("next")}>
                {copy.openBonus} · +40
              </GreenButton>
              {seconds !== null && <p className="mt-2 text-center text-xs text-white/55">{copy.bonusWaits(seconds)}</p>}
            </>
          ) : (
            <GreenButton className="mt-3 h-12 text-sm" onClick={report}>
              {copy.seeResult}
            </GreenButton>
          )}
        </DfVerdict>
      ) : (
        <GreenButton className="mt-6" onClick={report}>
          {copy.seeResult}
        </GreenButton>
      )}
    </div>
  );
}
