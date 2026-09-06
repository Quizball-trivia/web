"use client";

/* eslint-disable @next/next/no-img-element -- player faces come from the first-party grid CDN */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, RotateCw, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { CoinIcon } from "@/features/store/components/CoinIcon";
import { useStoreWallet } from "@/lib/queries/store.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import { playCash } from "@/features/mini-games/lib/crowdAudio";
import { LiveActivityStrip } from "@/features/mini-games/components/LiveActivityStrip";
import { RunsBoard } from "@/features/mini-games/components/RunsBoard";
import { MoneyFlight, flightFrom, type MoneyFlightSpec } from "@/features/mini-games/components/MoneyFlight";
import { CriterionAsset } from "@/features/football-grid/components/CriterionAsset";
import { optimizeSupabaseImage } from "@/lib/images/optimizeSupabaseImage";
import clubsRegistry from "@/data/football-grid/launch-assets/clubs.json";
import countriesRegistry from "@/data/football-grid/launch-assets/countries.json";
import leaguesRegistry from "@/data/football-grid/launch-assets/leagues.json";
import managersRegistry from "@/data/football-grid/launch-assets/managers.json";
import competitionsRegistry from "@/data/football-grid/launch-assets/competitions.json";
import { settleOnce, trackMiniGameError, trackMiniGameRoundStarted } from "@/features/mini-games/analytics/coinGames.analytics";
import { squadSpinApi, SquadSpinApiError, type SquadSpinPlayer, type SquadSpinReel, type SquadSpinState } from "@/lib/repositories/squadSpin.repo";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
const STAKES = [50, 100, 250];
const MIN_STAKE = 5;
const MAX_STAKE = 500;
const HEARTBEAT_MS = 10_000;
const QUESTION_S = 15;
/**
 * Slot-style roll: each reel flicks through decoys from the artwork registries,
 * stops one after another and lands on the dealt item with a bounce. Purely
 * cosmetic — the server clock is already running, so the roll stays short.
 */
const ROLL_BASE_MS = 900;
const ROLL_STAGGER_MS = 260;
const ROLL_TICK_MS = 85;
type RegistryItem = { id: string; labelEn: string; labelKa: string };
const DECOYS: Record<SquadSpinReel["family"], SquadSpinReel[]> = {
  club: (clubsRegistry as RegistryItem[]).map((c) => ({ family: "club", id: c.id, key: c.id, label_en: c.labelEn, label_ka: c.labelKa, asset_key: c.id })),
  country: (countriesRegistry as RegistryItem[]).map((c) => ({ family: "country", id: c.id, key: c.id, label_en: c.labelEn, label_ka: c.labelKa, asset_key: c.id })),
  league: (leaguesRegistry as RegistryItem[]).map((c) => ({ family: "league", id: c.id, key: c.id, label_en: c.labelEn, label_ka: c.labelKa, asset_key: c.id })),
  manager: (managersRegistry as RegistryItem[]).map((c) => ({ family: "manager", id: c.id, key: c.id, label_en: c.labelEn, label_ka: c.labelKa, asset_key: c.id })),
  trophy_award: (competitionsRegistry as RegistryItem[]).map((c) => ({ family: "trophy_award", id: c.id, key: c.id, label_en: c.labelEn, label_ka: c.labelKa, asset_key: c.id })),
  position: (["GK", "DEF", "MID", "FWD"] as const).map((p) => ({ family: "position", id: p, key: p, label_en: p, label_ka: p, asset_key: null })),
};
/** A run the sweeper settled while the tab was away is still shown if it ended this recently. */
const RECENT_SETTLED_MS = 90_000;
const REEL_OPTIONS: Array<{ reels: 3 | 4 | 5; key: "reels3" | "reels4" | "reels5" }> = [{ reels: 3, key: "reels3" }, { reels: 4, key: "reels4" }, { reels: 5, key: "reels5" }];
const POSITION_COLOR: Record<string, string> = { GK: "#FFE500", DEF: "#1CB0F6", MID: "#38B60E", FWD: "#FB3101" };

type Locale = ReturnType<typeof useLocale>["locale"];
const reelLabel = (reel: SquadSpinReel, locale: Locale) => (locale === "ka" ? reel.label_ka : reel.label_en) || reel.label_en;
const playerName = (p: SquadSpinPlayer, locale: Locale) => (locale === "ka" && p.name_ka ? p.name_ka : p.name_en);
const faceSrc = (p: SquadSpinPlayer) => optimizeSupabaseImage(p.image_url, { width: 96, height: 96, resize: "cover", quality: 70, format: "webp" });

/** Squad Spin, live: the reels and the answer set are held server-side; every answer, spin and cash-out is a request. */
export function SquadSpinLive({ backHref = "/play" }: { backHref?: string }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: wallet } = useStoreWallet();
  const [state, setState] = useState<SquadSpinState | null>(null);
  const [resumed, setResumed] = useState(false);
  const [stake, setStake] = useState(100);
  const [stakeText, setStakeText] = useState("100");
  const [reels, setReels] = useState<3 | 4 | 5>(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [rolling, setRolling] = useState(false);
  const [lastHit, setLastHit] = useState<SquadSpinPlayer | null>(null);
  const [lastMiss, setLastMiss] = useState<"wrong" | "late" | null>(null);
  const [topRuns, setTopRuns] = useState<Array<{ nickname: string; run_mult: number }>>([]);
  const [flight, setFlight] = useState<MoneyFlightSpec | null>(null);
  const [left, setLeft] = useState(QUESTION_S);
  const nonceRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<SquadSpinState | null>(null);
  const reconcilingRef = useRef(false);
  const settledTrackedRef = useRef<string | null>(null);
  useEffect(() => { settleOnce(settledTrackedRef, "squad_spin", state, state?.spins_cleared); }, [state]);
  const fetchStats = useCallback(async () => { const s = await squadSpinApi.stats(); setTopRuns(s.top_runs ?? []); return s; }, []);

  // Responses may arrive out of order: never let an older version of the same round overwrite a newer one.
  const applyState = useCallback((next: SquadSpinState | null) => {
    if (!next) { stateRef.current = null; setState(null); return; }
    const cur = stateRef.current;
    if (cur && cur.round_id === next.round_id && next.state_version < cur.state_version) return;
    stateRef.current = next; setState(next);
  }, []);

  // Resume an open run (refresh, second tab); a run that just settled without us is shown too.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cur = await squadSpinApi.current();
        if (cur) { if (!cancelled) applyState(cur); return; }
        const last = await squadSpinApi.latest();
        if (last && last.status !== "active" && Date.now() - new Date(last.server_now).getTime() < RECENT_SETTLED_MS && !cancelled) applyState(last);
      } catch { /* start card */ }
      finally { if (!cancelled) setResumed(true); }
    })();
    return () => { cancelled = true; };
  }, [applyState]);

  const active = state?.status === "active";
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => { void squadSpinApi.heartbeat().catch(() => undefined); }, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [active]);

  // A fresh spin: short reel roll, then focus the input. The countdown follows the server deadline.
  const spinKey = state?.spin ? `${state.round_id}:${state.spin.index}` : null;
  useEffect(() => {
    if (!spinKey) return;
    setRolling(true); setInput(""); setLastMiss(null);
    const reelCount = stateRef.current?.spin?.reels.length ?? 3;
    const id = window.setTimeout(() => { setRolling(false); inputRef.current?.focus(); }, ROLL_BASE_MS + ROLL_STAGGER_MS * (reelCount - 1) + 200);
    return () => window.clearTimeout(id);
  }, [spinKey]);

  const refreshWallet = useCallback(() => void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() }), [queryClient]);

  /** Re-sync with the server; when our round is no longer active, fetch it in its settled form (sweeper, lost response). */
  const reconcile = useCallback(async () => {
    if (reconcilingRef.current) return;
    reconcilingRef.current = true;
    try {
      const cur = await squadSpinApi.current();
      if (cur) { applyState(cur); return; }
      const mine = stateRef.current;
      if (!mine) return;
      const last = await squadSpinApi.latest();
      if (last && last.round_id === mine.round_id) { applyState(last); if (last.status !== "active") refreshWallet(); }
    } catch { /* keep current state */ }
    finally { reconcilingRef.current = false; }
  }, [applyState, refreshWallet]);

  // Countdown from the server deadline; at zero, one reconcile per spin (the server may still be inside its grace).
  useEffect(() => {
    if (state?.phase !== "question" || !state.spin) return;
    const skew = new Date(state.server_now).getTime() - Date.now();
    const deadline = Math.min(new Date(state.spin.deadline_at).getTime() - skew, new Date(state.spin.dealt_at).getTime() - skew + QUESTION_S * 1000);
    let asked = false;
    const tick = () => {
      const remaining = Math.max(0, (deadline - Date.now()) / 1000);
      setLeft(remaining);
      if (remaining <= 0 && !asked) { asked = true; window.setTimeout(() => void reconcile(), 1_800); }
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, spinKey]);

  // A decision left open is banked by the server after its deadline; pick that up.
  useEffect(() => {
    if (state?.phase !== "decision" || !state.decision_deadline_at) return;
    const skew = new Date(state.server_now).getTime() - Date.now();
    const wait = Math.max(500, new Date(state.decision_deadline_at).getTime() - skew - Date.now() + 1_500);
    const id = window.setTimeout(() => void reconcile(), wait);
    return () => window.clearTimeout(id);
  }, [state?.phase, state?.decision_deadline_at, state?.server_now, reconcile]);

  const fail = (e: unknown) => { setError(e instanceof SquadSpinApiError ? e.message : t("common.error")); trackMiniGameError("squad_spin", "request", e instanceof SquadSpinApiError ? e.status : null); };
  const recover = async (e: unknown) => { if (e instanceof SquadSpinApiError && (e.status === 409 || e.status === 404)) await reconcile(); };
  const applyStake = (v: number) => { const next = Math.min(MAX_STAKE, Math.max(MIN_STAKE, Math.floor(v || MIN_STAKE))); setStake(next); setStakeText(String(next)); };

  const start = async () => {
    if (busy || !resumed) return;
    setBusy(true); setError(null); setLastHit(null); setLastMiss(null);
    const nonce = nonceRef.current ?? (nonceRef.current = crypto.randomUUID());
    try {
      const s = await squadSpinApi.start(stake, reels, nonce);
      nonceRef.current = null; applyState(s); refreshWallet();
      trackMiniGameRoundStarted("squad_spin", { roundId: s.round_id, stake: s.stake_coins, reels: s.reels });
    } catch (e) {
      await recover(e);
      if (e instanceof SquadSpinApiError && e.status < 500) nonceRef.current = null;
      fail(e);
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!state?.spin || busy || rolling || !input.trim()) return;
    setBusy(true); setError(null);
    try {
      const r = await squadSpinApi.answer(state.round_id, input.trim(), state.state_version);
      if (r.outcome === "correct") { setLastHit(r.player); setLastMiss(null); if (r.state.status === "cashed") { playCash(); refreshWallet(); } }
      else { setLastMiss(r.outcome); setLastHit(null); refreshWallet(); }
      applyState(r.state);
    } catch (e) { await recover(e); fail(e); }
    finally { setBusy(false); }
  };

  const spinAgain = async () => {
    if (!state || busy || state.phase !== "decision") return;
    setBusy(true); setError(null);
    try { applyState(await squadSpinApi.continue(state.round_id, state.state_version)); }
    catch (e) { await recover(e); fail(e); }
    finally { setBusy(false); }
  };

  const cashout = async (event: { currentTarget: HTMLElement }) => {
    if (!state || busy || state.phase !== "decision") return;
    const origin = event.currentTarget;
    setBusy(true); setError(null);
    try {
      const s = await squadSpinApi.cashout(state.round_id, state.state_version);
      playCash();
      setFlight(flightFrom(origin, (s.payout_coins ?? 0) * 17 + 3));
      window.setTimeout(() => setFlight(null), 1200);
      applyState(s); refreshWallet();
    } catch (e) { await recover(e); fail(e); }
    finally { setBusy(false); }
  };

  const balance = wallet?.coins ?? 0;
  const settled = state && state.status !== "active";
  const timerPct = Math.max(0, Math.min(100, (left / QUESTION_S) * 100));

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white">
      <MoneyFlight flight={flight} />
      <div className={cn("mx-auto flex w-full flex-1 flex-col px-4 pb-28 pt-4 md:pb-8", state ? "max-w-md lg:max-w-4xl" : "max-w-md")}>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => router.push(backHref)} aria-label={t("common.back")} className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white"><ArrowLeft className="size-5" /></button>
        </div>

        {/* Start card: stake + reel count, brand blue like the other coin games */}
        {!state && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 rounded-[20px] bg-brand-blue p-4 text-center text-white md:p-5">
            <p className="text-[11px] font-black uppercase tracking-wide text-white/75" style={poppins}>{t("squadSpin.stake")}</p>
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
            <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-white/75" style={poppins}>{t("squadSpin.reelsLabel")}</p>
            <div className="flex w-full gap-2">
              {REEL_OPTIONS.map((o) => (
                <button key={o.reels} type="button" onClick={() => setReels(o.reels)} className={cn("flex flex-1 flex-col items-center rounded-xl border-2 py-2 transition-colors", reels === o.reels ? "border-brand-yellow bg-brand-yellow text-black" : "border-white/30 bg-white/10 text-white")} style={poppins}>
                  <span className="text-base font-black">{o.reels}</span>
                  <span className="text-[9px] font-black uppercase tracking-wide opacity-75">{t(`squadSpin.${o.key}`)}</span>
                </button>
              ))}
            </div>
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

        {state && (
          <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
            <div>
              <div className="mb-3 grid grid-cols-3 text-center">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wide text-white/45" style={poppins}>{t("squadSpin.stake")}</div>
                  <div className="flex items-center justify-center gap-1 text-lg font-black tabular-nums text-white" style={poppins}><CoinIcon size={14} />{state.stake_coins.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wide text-white/45" style={poppins}>{settled ? (state.status === "cashed" ? t("squadSpin.banked") : t("squadSpin.lost")) : t("squadSpin.pot")}</div>
                  <div className={cn("flex items-center justify-center gap-1 text-lg font-black tabular-nums", state.status === "lost" ? "text-brand-red-soft" : "text-brand-green-light")} style={poppins}><CoinIcon size={14} />{(state.status === "lost" ? 0 : state.status === "cashed" ? state.payout_coins ?? state.pot_coins : state.pot_coins).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wide text-white/45" style={poppins}>{t("squadSpin.multiplier")}</div>
                  {state.spin && !settled ? (
                    <div className="flex items-baseline justify-center gap-1 text-lg font-black tabular-nums" style={poppins}>
                      <span className="text-white/60">{(state.mult_bp / 10000).toFixed(2)}×</span>
                      <span className="text-xs text-white/40">→</span>
                      <span className="text-brand-yellow">{((state.spin.next_pot_coins * 10000) / state.stake_coins / 10000).toFixed(2)}×</span>
                    </div>
                  ) : (
                    <div className="text-lg font-black tabular-nums text-white" style={poppins}>{(state.mult_bp / 10000).toFixed(2)}×</div>
                  )}
                </div>
              </div>

              {/* Reels */}
              {state.spin && (
                <div className="grid gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${state.spin.reels.length}, minmax(0, 1fr))` }}>
                  {state.spin.reels.map((reel, i) => (
                    <ReelCard key={`${spinKey}:${i}`} reel={reel} rolling={rolling} stopAt={ROLL_BASE_MS + i * ROLL_STAGGER_MS} locale={locale} family={t(`squadSpin.family_${reel.family}`)} />
                  ))}
                </div>
              )}

              {/* Timer + answer input */}
              {!settled && state.phase === "question" && state.spin && (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full rounded-full transition-[width] duration-200 ease-linear" style={{ width: `${timerPct}%`, background: left <= 3 ? "#FB3101" : "#FFE500" }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-white/60" style={poppins}>
                    <span>{t("squadSpin.spinN", { n: String(state.spin.index) })} · ×{(state.spin.step_bp / 10000).toFixed(2)}</span>
                    <span className={cn("tabular-nums", left <= 3 && "text-brand-red-soft")}>{Math.ceil(left)}s</span>
                  </div>
                  <div className="relative mt-3">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void submit()}
                      placeholder={t("squadSpin.placeholder")}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={rolling || busy}
                      className="h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pr-14 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] disabled:opacity-70"
                      style={{ ...poppins, fontWeight: 600 }}
                    />
                    <button type="button" onClick={submit} disabled={!input.trim() || rolling || busy} aria-label={t("squadSpin.submit")} className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 disabled:opacity-40">
                      <Send className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Decision: cash out or spin again (the next reels stay hidden until you commit) */}
              {!settled && state.phase === "decision" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
                  {lastHit && (
                    <div className="mb-3 flex items-center justify-center gap-3 rounded-[16px] bg-brand-green/15 px-3 py-2">
                      <Face player={lastHit} size={40} />
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-wide text-brand-green-light" style={poppins}>{t("squadSpin.correct")}</div>
                        <div className="text-sm font-black text-white" style={poppins}>{playerName(lastHit, locale)}</div>
                      </div>
                      <Check className="size-5 text-brand-green-light" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={cashout} disabled={busy} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[20px] bg-brand-green text-sm font-black uppercase tracking-wide text-white disabled:opacity-40" style={poppins}>
                      <CoinIcon size={16} /> {t("squadSpin.cashOut", { pot: state.pot_coins.toLocaleString() })}
                    </button>
                    <button type="button" onClick={spinAgain} disabled={busy} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[20px] bg-brand-blue text-sm font-black uppercase tracking-wide text-white disabled:opacity-40" style={poppins}>
                      <RotateCw className="size-4" /> {t("squadSpin.spinAgain")}
                    </button>
                  </div>
                  <p className="mt-2 text-center text-[10px] font-bold text-white/45" style={poppins}>{t("squadSpin.decisionHint")}</p>
                </motion.div>
              )}
              {error && !settled && <p className="mt-3 text-center text-xs font-bold text-brand-red-soft" style={poppins}>{error}</p>}
            </div>

            <div className="lg:sticky lg:top-4">
              <AnimatePresence>
                {settled && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 rounded-[20px] px-4 py-3 text-center text-white lg:mt-0", state.status === "cashed" ? "bg-brand-green" : "bg-brand-blue")}>
                    <p className="text-[11px] font-black uppercase tracking-wide text-white/85" style={poppins}>{state.status === "cashed" ? t("squadSpin.banked") : lastMiss === "late" ? t("squadSpin.late") : t("squadSpin.lost")}</p>
                    <p className="mt-0.5 flex items-center justify-center gap-1.5 text-2xl font-black tabular-nums" style={poppins}><CoinIcon size={20} />{(state.status === "cashed" ? state.payout_coins ?? 0 : 0).toLocaleString()}</p>
                    {state.status === "lost" && state.reveal && state.reveal.answers.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-white/70" style={poppins}>{t("squadSpin.answersWere")}</p>
                        <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                          {state.reveal.answers.slice(0, 6).map((p) => (
                            <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-white/15 py-1 pl-1 pr-2.5 text-xs font-bold text-white" style={poppins}><Face player={p} size={22} />{playerName(p, locale)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {lastMiss && <X className="mx-auto mt-2 size-5 text-white/70" />}
                    <button type="button" onClick={() => { applyState(null); setError(null); setLastHit(null); setLastMiss(null); }} className="font-poppins mt-3 h-12 w-full rounded-[20px] bg-brand-yellow text-[15px] font-black uppercase tracking-wide text-black transition-all active:translate-y-[2px]">
                      {t("squadSpin.playAgain")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <RunsBoard runs={topRuns} className="mt-4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Face({ player, size }: { player: SquadSpinPlayer; size: number }) {
  const src = faceSrc(player);
  if (!src) return <span className="rounded-full bg-white/15" style={{ width: size, height: size }} />;
  return <img src={src} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
}

/** One reel: family caption, artwork (crest / flag / league / manager / trophy or a position badge), label. Rolls through decoys, then lands. */
function ReelCard({ reel, rolling, stopAt, locale, family }: { reel: SquadSpinReel; rolling: boolean; stopAt: number; locale: Locale; family: string }) {
  const [shown, setShown] = useState<SquadSpinReel>(reel);
  const [landed, setLanded] = useState(!rolling);

  useEffect(() => {
    if (!rolling) { setShown(reel); setLanded(true); return; }
    const pool = DECOYS[reel.family];
    setLanded(false);
    const flick = window.setInterval(() => setShown(pool[Math.floor(Math.random() * pool.length)] ?? reel), ROLL_TICK_MS);
    const stop = window.setTimeout(() => { window.clearInterval(flick); setShown(reel); setLanded(true); }, stopAt);
    return () => { window.clearInterval(flick); window.clearTimeout(stop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling, stopAt, reel.id]);

  const item = landed ? reel : shown;
  const criterion = item.family === "position" ? null : { id: item.id, key: item.key, family: item.family, labelEn: item.label_en, labelKa: item.label_ka, assetKey: item.asset_key, difficulty: "normal" as const };
  return (
    <div className={cn("flex flex-col items-center gap-1.5 rounded-2xl border-2 px-0.5 py-3 transition-colors duration-300", landed ? "border-brand-yellow/60 bg-brand-yellow/[0.06]" : "border-white/10 bg-white/[0.04]")}>
      <span className="text-[9px] font-black uppercase tracking-wider text-white/40" style={poppins}>{family}</span>
      <motion.div
        key={landed ? "landed" : "rolling"}
        initial={landed ? { y: -22, scale: 0.9, opacity: 0.6 } : false}
        animate={landed ? { y: 0, scale: 1, opacity: 1 } : { y: [0, -3, 0], opacity: 0.85, filter: "blur(0.8px)" }}
        transition={landed ? { type: "spring", stiffness: 420, damping: 18 } : { duration: ROLL_TICK_MS / 1000, repeat: Infinity }}
        className="flex w-full flex-1 flex-col items-center gap-1"
        style={landed ? undefined : { filter: "blur(0.8px)" }}
      >
        <span className="flex min-h-11 w-full items-center justify-center">
          {criterion ? (
            <CriterionAsset criterion={criterion} className="size-10 sm:size-11" />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-xl text-sm font-black text-black sm:size-11" style={{ ...poppins, backgroundColor: POSITION_COLOR[item.id] ?? "#FFE500" }}>{item.id}</span>
          )}
        </span>
        <span className="flex min-h-[26px] w-full items-center justify-center">
          <span className="line-clamp-2 max-w-full text-center text-[9px] font-black uppercase leading-tight text-white sm:text-[10px]" style={poppins}>{landed ? reelLabel(reel, locale) : reelLabel(item, locale)}</span>
        </span>
      </motion.div>
    </div>
  );
}
