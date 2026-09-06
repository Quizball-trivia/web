"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Eye, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { CoinIcon } from "@/features/store/components/CoinIcon";
import { useStoreWallet } from "@/lib/queries/store.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { playCash } from "@/features/mini-games/lib/crowdAudio";
import { LiveActivityStrip } from "@/features/mini-games/components/LiveActivityStrip";
import { RunsBoard } from "@/features/mini-games/components/RunsBoard";
import { MoneyFlight, flightFrom, type MoneyFlightSpec } from "@/features/mini-games/components/MoneyFlight";
import { settleOnce, trackMiniGameError, trackMiniGameRoundStarted } from "@/features/mini-games/analytics/coinGames.analytics";
import { triviaMinesApi, TriviaMinesApiError, type TriviaMinesState } from "@/lib/repositories/triviaMines.repo";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
const STAKES = [50, 100, 250];
const MIN_STAKE = 5;
const MAX_STAKE = 500;
const HEARTBEAT_MS = 10_000;

type Locale = ReturnType<typeof useLocale>["locale"];
const text = (value: { en: string; ka: string; es?: string }, locale: Locale) => (locale === "ka" ? value.ka : locale === "es" ? value.es ?? value.en : value.en) || value.en;

/** Trivia Mines, live: the board is held server-side; every pick, scout and cash-out is a request. */
export function TriviaMinesLive({ backHref = "/play" }: { backHref?: string }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: wallet } = useStoreWallet();
  const [state, setState] = useState<TriviaMinesState | null>(null);
  const [resumed, setResumed] = useState(false);
  const [stake, setStake] = useState(100);
  const [stakeText, setStakeText] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{ outcome: string; correct: string; flagged: number | null } | null>(null);
  const [topRuns, setTopRuns] = useState<Array<{ nickname: string; run_mult: number }>>([]);
  const [flight, setFlight] = useState<MoneyFlightSpec | null>(null);
  const fetchStats = useCallback(async () => { const s = await triviaMinesApi.stats(); setTopRuns(s.top_runs ?? []); return s; }, []);
  const [qLeft, setQLeft] = useState(0);
  const nonceRef = useRef<string | null>(null);
  const settledTrackedRef = useRef<string | null>(null);
  useEffect(() => { settleOnce(settledTrackedRef, "trivia_mines", state, state?.opened.length); }, [state]);

  // Resume an open round (refresh, second tab) before offering a new stake.
  useEffect(() => {
    let cancelled = false;
    triviaMinesApi.current().then((s) => { if (!cancelled) { if (s) setState(s); setResumed(true); } }).catch(() => { if (!cancelled) setResumed(true); });
    return () => { cancelled = true; };
  }, []);

  const active = state?.status === "active";
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => { void triviaMinesApi.heartbeat().catch(() => undefined); }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [active]);

  // Question countdown, from the server deadline.
  useEffect(() => {
    if (state?.phase !== "question" || !state.question) return;
    const deadline = new Date(state.question.deadline_at).getTime() - (new Date(state.server_now).getTime() - Date.now());
    let asked = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setQLeft(left);
      // The server burns the scout after its grace; one re-sync picks the board back up.
      if (left <= 0 && !asked) { asked = true; window.setTimeout(() => void reconcile(), 2_200); }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.question?.question_id]);

  const fail = (e: unknown) => { setError(e instanceof TriviaMinesApiError ? e.message : t("common.error")); trackMiniGameError("trivia_mines", "request", e instanceof TriviaMinesApiError ? e.status : null); };
  const refreshWallet = useCallback(() => void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() }), [queryClient]);
  const stateRef = useRef<TriviaMinesState | null>(null);
  useEffect(() => { stateRef.current = state; }, [state]);
  /** Re-sync with the server; when our round is no longer active (sweeper, lost response), fetch it in its settled form. */
  const reconcile = useCallback(async () => {
    try {
      const cur = await triviaMinesApi.current();
      if (cur) { setState(cur); return; }
      const mine = stateRef.current;
      if (!mine) return;
      const last = await triviaMinesApi.latest();
      if (last && last.round_id === mine.round_id) { setState(last); if (last.status !== "active") refreshWallet(); }
    } catch { /* keep current state */ }
  }, [refreshWallet]);
  const recover = async (e: unknown) => { if (e instanceof TriviaMinesApiError && (e.status === 409 || e.status === 404)) await reconcile(); };

  const applyStake = (v: number) => { const next = Math.min(MAX_STAKE, Math.max(MIN_STAKE, Math.floor(v || MIN_STAKE))); setStake(next); setStakeText(String(next)); };

  const start = async () => {
    if (busy || !resumed) return;
    setBusy(true); setError(null); setAnswerResult(null);
    const nonce = nonceRef.current ?? (nonceRef.current = crypto.randomUUID());
    try {
      const s = await triviaMinesApi.start(stake, nonce);
      nonceRef.current = null; setState(s); refreshWallet();
      trackMiniGameRoundStarted("trivia_mines", { roundId: s.round_id, stake: s.stake_coins });
    } catch (e) {
      await recover(e);
      if (e instanceof TriviaMinesApiError && e.status < 500) nonceRef.current = null;
      fail(e);
    } finally { setBusy(false); }
  };

  const pick = async (tile: number) => {
    if (!state || busy || state.phase !== "picking" || state.opened.includes(tile) || state.flagged.includes(tile)) return;
    setBusy(true); setError(null);
    try { const r = await triviaMinesApi.pick(state.round_id, tile, state.state_version); if (r.state.status === "cashed") playCash(); setState(r.state); if (!r.safe || r.state.status !== "active") refreshWallet(); }
    catch (e) { await recover(e); fail(e); }
    finally { setBusy(false); }
  };

  const scout = async () => {
    if (!state || busy || state.phase !== "picking" || state.scouts_left <= 0) return;
    setBusy(true); setError(null); setSelected(null); setAnswerResult(null);
    try { setState(await triviaMinesApi.deal(state.round_id, state.state_version)); }
    catch (e) { await recover(e); fail(e); }
    finally { setBusy(false); }
  };

  const answer = async (optionId: string) => {
    if (!state?.question || busy || selected) return;
    setSelected(optionId); setBusy(true);
    try {
      const r = await triviaMinesApi.answer(state.round_id, state.question.question_id, optionId, state.state_version);
      setAnswerResult({ outcome: r.outcome, correct: r.correct_option_id, flagged: r.flagged_tile });
      window.setTimeout(() => { setState(r.state); setSelected(null); setAnswerResult(null); }, 1400);
    } catch (e) { setSelected(null); await recover(e); fail(e); }
    finally { setBusy(false); }
  };

  const cashout = async (event: { currentTarget: HTMLElement }) => {
    if (!state || busy || state.phase !== "picking" || state.opened.length === 0) return;
    const origin = event.currentTarget;
    setBusy(true); setError(null);
    try {
      const s = await triviaMinesApi.cashout(state.round_id, state.state_version);
      playCash();
      setFlight(flightFrom(origin, (s.payout_coins ?? 0) * 17 + 3));
      window.setTimeout(() => setFlight(null), 1200);
      setState(s); refreshWallet();
    }
    catch (e) { await recover(e); fail(e); }
    finally { setBusy(false); }
  };

  const balance = wallet?.coins ?? 0;
  const settled = state && state.status !== "active";

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white">
      <MoneyFlight flight={flight} />
      <div className={cn("mx-auto flex w-full flex-1 flex-col px-4 pb-28 pt-4 md:pb-8", state ? "max-w-md lg:max-w-4xl" : "max-w-md")}>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => router.push(backHref)} aria-label={t("common.back")} className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white"><ArrowLeft className="size-5" /></button>
        </div>

        {/* Start card — same family as the Guess the Goal card, in brand blue */}
        {!state && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 rounded-[20px] bg-brand-blue p-4 text-center text-white md:p-5">
            <p className="text-[11px] font-black uppercase tracking-wide text-white/75" style={poppins}>{t("triviaMines.stake")}</p>
            <div className="flex w-full items-center justify-center gap-2">
              {STAKES.map((s) => (
                <button key={s} type="button" onClick={() => applyStake(s)} className={cn("h-11 flex-1 rounded-xl border-2 text-sm font-black tabular-nums transition-colors", stake === s ? "border-brand-yellow bg-brand-yellow text-black" : "border-white/30 bg-white/10 text-white")} style={poppins}>{s}</button>
              ))}
              <input
                inputMode="numeric"
                value={stakeText}
                onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ""); setStakeText(raw); const v = Number(raw); if (v >= MIN_STAKE) setStake(Math.min(MAX_STAKE, v)); }}
                onBlur={() => applyStake(Number(stakeText))}
                aria-label={t("triviaMines.customStake")}
                placeholder={t("triviaMines.customStake")}
                className="h-11 w-24 rounded-xl border-2 border-white/40 bg-white/10 text-center text-sm font-black tabular-nums text-white outline-none placeholder:text-[10px] placeholder:font-bold placeholder:text-white/50 focus:border-white"
                style={poppins}
              />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/60" style={poppins}>{t("triviaMines.stakeRange", { min: String(MIN_STAKE), max: String(MAX_STAKE) })}</p>
            {error && <p className="text-xs font-bold text-white" style={poppins}>{error}</p>}
            <button
              type="button"
              onClick={start}
              disabled={busy || !resumed || stake < MIN_STAKE || stake > balance}
              className="font-poppins inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-[20px] bg-brand-green text-[18px] uppercase tracking-wide text-white transition-all hover:brightness-110 active:translate-y-[2px] disabled:opacity-60"
            >
              {stake > balance ? t("triviaMines.notEnough") : t("triviaMines.stakeAndPlay", { stake: String(stake) })}
            </button>
          </motion.div>
        )}

        <div className="mb-1 flex items-center gap-3">
          <LiveActivityStrip fetchStats={fetchStats} className="min-w-0 flex-1" />
          <span data-money-stack className="flex shrink-0 items-center gap-1 text-sm font-black tabular-nums text-white" style={poppins}><CoinIcon size={14} />{balance.toLocaleString()}</span>
        </div>

        {!state && <RunsBoard runs={topRuns} className="mt-4" />}

        {/* Board */}
        {state && (
          <div className={cn("mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6", (!settled) ? "" : "opacity-90")}>
          <div>
            <div className="mb-3 grid grid-cols-3 text-center">
              <div>
                <div className="text-[9px] font-black uppercase tracking-wide text-white/45" style={poppins}>{t("triviaMines.stake")}</div>
                <div className="flex items-center justify-center gap-1 text-lg font-black tabular-nums text-white" style={poppins}><CoinIcon size={14} />{state.stake_coins.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-wide text-white/45" style={poppins}>{settled ? (state.status === "cashed" ? t("triviaMines.banked") : t("triviaMines.tackled")) : t("triviaMines.pot")}</div>
                <div className={cn("flex items-center justify-center gap-1 text-lg font-black tabular-nums", state.status === "lost" ? "text-brand-red-soft" : "text-brand-green-light")} style={poppins}><CoinIcon size={14} />{(state.status === "lost" ? 0 : state.status === "cashed" ? state.payout_coins ?? state.pot_coins : state.pot_coins).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-wide text-white/45" style={poppins}>{t("triviaMines.multiplier")}</div>
                <div className="text-lg font-black tabular-nums text-white" style={poppins}>{(state.mult_bp / 10000).toFixed(2)}×</div>
                {!settled && <div className="text-[9px] font-bold text-white/40" style={poppins}>→ {state.next_pot_coins.toLocaleString()}</div>}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: state.board_size }).map((_, i) => {
                const opened = state.opened.includes(i);
                const flagged = state.flagged.includes(i);
                const revealed = state.reveal?.defenders.includes(i) ?? false;
                const bust = state.bust_tile === i;
                const locked = settled || state.phase !== "picking" || busy;
                return (
                  <motion.button
                    key={i}
                    type="button"
                    whileTap={!locked && !opened && !flagged ? { scale: 0.92 } : undefined}
                    disabled={locked || opened || flagged}
                    onClick={() => pick(i)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-xl border-2 text-lg font-black transition-colors",
                      bust ? "border-brand-red-soft bg-brand-red-soft text-white"
                        : revealed ? "border-brand-red-soft/60 bg-brand-red-soft/25 text-brand-red-soft"
                        : opened ? "border-brand-green bg-brand-green/25 text-brand-green-light"
                        : flagged ? "border-brand-orange/70 bg-brand-orange/20 text-brand-orange"
                        : "border-white/10 bg-white/[0.06] text-white/25 hover:border-brand-blue/60 hover:bg-brand-blue/15",
                    )}
                    style={poppins}
                  >
                    {bust || revealed ? <X className="size-5" /> : opened ? <Check className="size-5" /> : flagged ? <Shield className="size-5" /> : "?"}
                  </motion.button>
                );
              })}
            </div>

            {!settled && state.phase === "picking" && (
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={scout} disabled={busy || state.scouts_left <= 0 || state.flagged.length >= state.defender_count} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[20px] bg-brand-blue text-sm font-black uppercase tracking-wide text-white disabled:opacity-40" style={poppins}>
                  <Eye className="size-4" /> {t("triviaMines.scout", { n: String(state.scouts_left) })}
                </button>
                <button type="button" onClick={cashout} disabled={busy || state.opened.length === 0} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[20px] bg-brand-green text-sm font-black uppercase tracking-wide text-white disabled:opacity-40" style={poppins}>
                  <CoinIcon size={16} /> {t("triviaMines.cashOut", { pot: state.pot_coins.toLocaleString() })}
                </button>
              </div>
            )}
            {error && !settled && <p className="mt-3 text-center text-xs font-bold text-brand-red-soft" style={poppins}>{error}</p>}

          </div>

          <div className="lg:sticky lg:top-4">
            <AnimatePresence>
              {state.phase === "question" && state.question && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 rounded-[20px] bg-brand-blue p-4 text-white lg:mt-0" style={{ boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }}>
                  <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-white/70" style={poppins}>
                    <span>{t("triviaMines.scoutQuestion")}</span><span className={cn("tabular-nums", qLeft <= 3 && "text-brand-red-soft")}>{qLeft}s</span>
                  </div>
                  <p className="mb-3 text-[14px] font-bold leading-snug text-white" style={poppins}>{text(state.question.prompt, locale)}</p>
                  <div className="grid gap-2">
                    {state.question.options.map((opt) => {
                      const st = !answerResult ? (selected === opt.id ? "picked" : "idle") : opt.id === answerResult.correct ? "correct" : selected === opt.id ? "wrong" : "dim";
                      return (
                        <button key={opt.id} type="button" disabled={Boolean(selected)} onClick={() => answer(opt.id)} className={cn("flex items-center justify-between rounded-xl border-2 px-3 py-2.5 text-left text-[13px] font-semibold transition-colors", st === "correct" ? "border-brand-green bg-brand-green text-white" : st === "wrong" ? "border-brand-red-soft bg-brand-red-soft text-white" : st === "picked" ? "border-brand-yellow bg-brand-yellow text-black" : st === "dim" ? "border-white/10 text-white/40" : "border-white/25 bg-white/10 text-white hover:border-white")} style={poppins}>
                          <span>{text(opt.text, locale)}</span>
                          {st === "correct" && <Check className="size-4 shrink-0 text-brand-green-light" />}{st === "wrong" && <X className="size-4 shrink-0 text-brand-red-soft" />}
                        </button>
                      );
                    })}
                  </div>
                  {answerResult && <p className="mt-2 text-center text-xs font-bold text-white/85" style={poppins}>{answerResult.outcome === "correct" ? t("triviaMines.scoutHit") : answerResult.outcome === "late" ? t("triviaMines.scoutLate") : t("triviaMines.scoutMiss")}</p>}
                </motion.div>
              )}
            </AnimatePresence>
            <RunsBoard runs={topRuns} className="mt-4" />
          </div>

            {settled && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 rounded-[20px] px-4 py-3 text-center text-white", state.status === "cashed" ? "bg-brand-green" : "bg-brand-blue")}>
                <p className="text-[11px] font-black uppercase tracking-wide text-white/85" style={poppins}>{state.status === "cashed" ? t("triviaMines.banked") : state.status === "lost" ? t("triviaMines.tackled") : t("triviaMines.refunded")}</p>
                <p className="mt-0.5 flex items-center justify-center gap-1.5 text-2xl font-black tabular-nums" style={poppins}><CoinIcon size={20} />{(state.status === "cashed" ? state.payout_coins ?? 0 : state.status === "expired" ? state.stake_coins : 0).toLocaleString()}</p>
                <button type="button" onClick={() => { setState(null); setError(null); }} className="font-poppins mt-3 h-12 w-full rounded-[20px] bg-brand-yellow text-[15px] font-black uppercase tracking-wide text-black transition-all active:translate-y-[2px]">
                  {t("triviaMines.playAgain")}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
