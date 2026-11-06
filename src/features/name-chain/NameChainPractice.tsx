"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { nameChainCopy, wordDailyCopy, wordSharedCopy } from "@/features/wordgames/copy";
import { AnswerBox, Chips, Frame, GreenButton, QuietButton, TopBar, poppins } from "@/features/wordgames/ui";
import { createDailyGameCall } from "@/lib/repositories/dailyGameApi";
import { cn } from "@/lib/utils";
import { Lettered } from "./Lettered";
import { nameChainPracticeCopy } from "./nameChainPractice.copy";
import { applyPractice, bestOf, emptyPractice, namedIn, practiceRequest, type PracticeRequest, type PracticeState, type PracticeStepResponse } from "./nameChainPractice.logic";

const call = createDailyGameCall("/api/v1/name-chain");
const step = (body: PracticeRequest) => call<PracticeStepResponse>("/practice", "POST", body, body.locale, { identity: "player", timeoutMs: 8_000 });

/**
 * Relaxed practice: the daily's chain with no clock and nothing scored or ranked. A refused answer can be tried again
 * for as long as the player likes; ending the chain shows the names that would have answered its letter.
 */
export function NameChainPractice({ locale, brand, onBack }: { locale: string; brand: readonly string[]; onBack: () => void }) {
  const c = wordSharedCopy(locale);
  const d = wordDailyCopy(locale);
  const g = nameChainCopy(locale);
  const p = nameChainPracticeCopy(locale);
  const [state, setState] = useState<PracticeState>(emptyPractice);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);
  const inFlight = useRef(false);

  const run = useCallback(async (action: { op: "start" } | { op: "pass" } | { op: "answer"; answer: string }) => {
    if (inFlight.current) return;
    const body = practiceRequest(latest.current, locale, action);
    if (!body) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(false);
    try {
      const res = await step(body);
      // One step in flight at a time, so latest.current is the state this step was built on; keep the updater pure.
      const next = applyPractice(latest.current, body.op, res);
      latest.current = next;
      setState(next);
    } catch {
      // Nothing is lost: the chain lives here, so the same step can simply be tried again.
      setFailed(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [locale]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run({ op: "start" });
  }, [run]);

  const current = state.links.at(-1) ?? null;
  const named = namedIn(state);
  const best = bestOf(state);
  const f = state.last;
  const feedback = f && (f.kind === "ok"
    ? { tone: "ok" as const, text: f.name ?? f.text }
    : { tone: "bad" as const, text: f.kind === "unknown" ? g.unknown(f.text) : f.kind === "repeat" ? g.repeat(f.name ?? f.text) : g.letter(f.name ?? f.text, f.starts.join(" / ") || "?", state.letter) });
  const open = current !== null && state.ended === null;
  // The letter the chain ended on: the "could have said" names answer it.
  const endedLetter = state.letter;

  return (
    <Frame lang={locale}>
      <div className="flex flex-1 flex-col" data-name-chain-practice>
        <TopBar brand={brand} seconds={null} exitLabel={c.exit} onExit={onBack}
          right={<span className="shrink-0 rounded-full bg-brand-yellow px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-black">{p.badge}</span>} />
        <p className="mt-3 rounded-2xl bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/70">{p.banner}</p>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-wide text-white/60">{p.inChain(named)}</span>
          {best > 0 && <span className="text-xs font-bold text-white/60">{p.best(best)}</span>}
        </div>
        {current && (
          <div className="mt-3 rounded-2xl border border-white/10 px-4 py-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-wide text-white/55">{current.given ? g.supplied : c.you}</p>
            <AnimatePresence mode="wait">
              <motion.div key={`${state.links.length}-${current.pid}`} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
                <Lettered name={current.game} className="mt-1 block break-words text-4xl font-black uppercase leading-tight" />
                {current.name !== current.game && <p className="mt-1 text-sm text-white/60">{current.name}</p>}
              </motion.div>
            </AnimatePresence>
            {state.letter && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-white/60">
                {g.nextLetter}<ArrowRight className="size-3.5" aria-hidden />
                <span data-chain-letter className="flex size-9 items-center justify-center rounded-xl bg-brand-yellow text-xl font-black text-black" style={poppins}>{state.letter}</span>
              </div>
            )}
          </div>
        )}
        {open && (
          <>
            <div className="mt-3 rounded-2xl bg-brand-green px-4 py-3 text-white shadow-lg shadow-black/20">
              <p className="text-sm font-black uppercase leading-snug tracking-wide" style={poppins}>{g.yourTurn(state.letter)}</p>
            </div>
            <div className="mt-3 min-h-6" aria-live="polite">
              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.p key={`a${state.attempt}`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: feedback.tone === "ok" ? 0 : [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }}
                    className={cn("flex items-center gap-1.5 text-sm font-bold", feedback.tone === "ok" ? "text-white" : "text-brand-red-light")}>
                    {feedback.tone === "ok" && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-green"><Check className="size-3.5" strokeWidth={3} /></span>}
                    {feedback.text}
                  </motion.p>
                )}
              </AnimatePresence>
              {state.links.length > 1 && current?.given && <p className="mt-1 text-xs font-semibold text-brand-yellow">{g.fresh}</p>}
            </div>
            <ul className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={g.chainTitle}>
              {state.links.slice(-10, -1).map((link, i) => (
                <li key={`${i}-${link.pid}`} className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold text-white", link.given ? "border-white/25 bg-white/10" : "border-brand-green/60 bg-brand-green/20")}>{link.game}</li>
              ))}
            </ul>
            <div className="flex-1" />
            <AnswerBox placeholder={c.placeholder} say={c.say} disabled={busy} note={busy ? g.sending : null} onSubmit={(text) => void run({ op: "answer", answer: text })} />
            <button type="button" disabled={busy} onClick={() => void run({ op: "pass" })} className="mx-auto mt-1 min-h-9 px-3 text-xs font-bold uppercase tracking-wide text-white/55 underline-offset-4 hover:text-white hover:underline disabled:opacity-50">{p.endChain}</button>
          </>
        )}
        {state.ended && (
          <div className="mt-4 rounded-2xl bg-brand-blue px-4 py-4 text-white shadow-lg shadow-black/20" role="status">
            <p className="text-2xl font-black" style={poppins}>{p.chainOver}</p>
            <p className="mt-1 text-lg font-black tabular-nums" style={poppins}>{p.inChain(state.ended.named)}</p>
            {state.ended.could.length > 0 && (
              <>
                <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/75">{g.could(endedLetter)}</p>
                <Chips className="mt-2" names={state.ended.could} />
              </>
            )}
            {current === null && <p className="mt-2 text-sm text-white/80">{p.nobodyLeft}</p>}
            {current !== null && <GreenButton className="mt-4" disabled={busy} onClick={() => void run({ op: "start" })}>{p.newChain}</GreenButton>}
            <QuietButton className="mt-3" onClick={onBack}>{p.back}</QuietButton>
          </div>
        )}
        {!current && !state.ended && busy && <p className="mt-6 animate-pulse text-center text-sm text-white/70">{d.loading}</p>}
        {failed && (
          <div className="mt-3 text-center">
            <p role="alert" className="text-sm font-semibold text-brand-red-light">{d.notices.actionError}</p>
            {!current && <GreenButton className="mt-3" disabled={busy} onClick={() => void run({ op: "start" })}>{d.retry}</GreenButton>}
          </div>
        )}
      </div>
    </Frame>
  );
}
