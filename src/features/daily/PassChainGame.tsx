"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, Check, Route, Shield, Sparkles, UserRoundCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import { DailyGameStage } from "@/features/daily/components/DailyGameStage";
import { DailyChallengeHeader } from "@/features/daily/components/DailyChallengeHeader";
import { DailyAnswerInput } from "@/features/daily/components/DailyAnswerInput";
import { DailyChallengeCompleteModal } from "@/features/daily/components/DailyChallengeCompleteModal";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import { linkPassChain } from "@/lib/repositories/dailyChallenges.repo";
import { footballGridAssetUrl } from "@/lib/football-grid/assets";
import { optimizeSupabaseImage } from "@/lib/images/optimizeSupabaseImage";
import { playSfx } from "@/lib/sounds/gameSounds";
import type { PassChainLinkResult, PassChainPlayer, PassChainSession } from "@/lib/domain/dailyChallenge";

type LinkKind = "club" | "manager";
type Link = { player: PassChainPlayer; viaClub: string; kind: LinkKind };
type Locale = ReturnType<typeof useLocale>["locale"];
/** A solved chain: how many links the player used and who they went through (start/target excluded). */
type SolvedRoute = { links: number; via: string[] };
type ResolveLink = (fromPlayerId: string, text: string, targetId: string, puzzleId: string, locale: Locale) => Promise<PassChainLinkResult>;

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
const defaultResolveLink: ResolveLink = (fromPlayerId, text, _targetId, puzzleId, locale) =>
  linkPassChain({ puzzleId, fromPlayerId, text, locale });

function faceSrc(imageUrl: string | null): string | null {
  return optimizeSupabaseImage(footballGridAssetUrl(imageUrl), { width: 128, height: 128, quality: 75, format: "webp", resize: "cover" });
}
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const surname = (name: string) => name.split(" ").slice(-1)[0];

/** Pass Chain daily: link the start player to the target through team-mates who shared a club.
 *  Every typed link is validated by the API (the graph never ships to the client); a skip or
 *  timeout reveals one shortest chain and waits for the player before moving on. */
export function PassChainGame({
  session,
  onBack,
  onComplete,
  resolveLink = defaultResolveLink, practice = false, }: {
  session: PassChainSession;
  onBack: () => void;
  onComplete: (score: number, nextPath?: string) => void;
  /** Sample / training round: the completion modal shows no member prompts and runs no member queries. */
  practice?: boolean;
  /** Demo/prototype override: validate against a local graph instead of the API. */
  resolveLink?: ResolveLink;
}) {
  const { t, locale } = useLocale();
  const puzzles = session.puzzles;
  const [index, setIndex] = useState(0);
  const [chain, setChain] = useState<Link[]>([]);
  const [endClub, setEndClub] = useState<{ label: string; kind: LinkKind } | null>(null);
  const [state, setState] = useState<"playing" | "solved" | "revealed">("playing");
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(session.secondsPerPuzzle);
  const [solvedCount, setSolvedCount] = useState(0);
  const [solvedRoutes, setSolvedRoutes] = useState<Record<string, SolvedRoute>>({});
  const [showQuit, setShowQuit] = useState(false);
  const [done, setDone] = useState(false);

  // Warm every face the session can show (both puzzles' ends + their revealed chains, ~3 KB each)
  // so puzzle 2 and the skip reveal never pop in late. Linked players load on demand.
  useEffect(() => {
    for (const z of puzzles) {
      for (const player of [z.start, z.target, ...z.solution.map((step) => step.player)]) {
        const src = faceSrc(player.imageUrl);
        if (src) new Image().src = src;
      }
    }
  }, [puzzles]);

  const puzzle = puzzles[index];
  const last = chain.length ? chain[chain.length - 1].player : puzzle?.start;
  const links = chain.length + 1;

  // A reveal replaces the attempted chain: the solution's first bridge starts from the original start player.
  const reveal = useCallback(() => {
    setState("revealed");
    setChain([]);
    setAnswer("");
    setError(null);
  }, []);
  // Late link responses must not act on a later puzzle or a puzzle already solved/revealed.
  const puzzleIdRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  useEffect(() => { puzzleIdRef.current = puzzles[index]?.id ?? null; stateRef.current = state; }, [puzzles, index, state]);
  const revealRef = useRef(reveal);
  useEffect(() => { revealRef.current = reveal; });

  useEffect(() => {
    if (state !== "playing" || done) return;
    const id = window.setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          window.setTimeout(() => revealRef.current(), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state, done, index]);

  const advance = () => {
    if (index + 1 >= puzzles.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setChain([]);
    setEndClub(null);
    setState("playing");
    setAnswer("");
    setError(null);
    setTimeLeft(session.secondsPerPuzzle);
  };

  const submit = async () => {
    if (!puzzle || !last || state !== "playing" || pending || !answer.trim()) return;
    setPending(true);
    const requestPuzzleId = puzzle.id;
    try {
      const result = await resolveLink(last.id, answer, puzzle.target.id, puzzle.id, locale);
      if (puzzleIdRef.current !== requestPuzzleId || stateRef.current !== "playing") return;
      if (result.status === "unknown" || !result.player) {
        playSfx("wrongAnswer");
        setError(t("passChain.unknown"));
        return;
      }
      if (result.status === "noLink" || !result.viaClub) {
        playSfx("wrongAnswer");
        setError(t("passChain.noLink", { name: surname(result.player.name), last: surname(last.name) }));
        return;
      }
      if (result.player.id === puzzle.start.id || chain.some((l) => l.player.id === result.player!.id)) {
        setError(t("passChain.already"));
        return;
      }
      playSfx("dailyCorrect");
      setAnswer("");
      setError(null);
      if (result.reachesTarget) {
        // The target itself was typed: it is the chain's end, not a link before it.
        const viaKind = result.viaKind ?? "club";
        const nextChain = result.player.id === puzzle.target.id ? chain : [...chain, { player: result.player, viaClub: result.viaClub, kind: viaKind }];
        setChain(nextChain);
        setEndClub(result.player.id === puzzle.target.id ? { label: result.viaClub, kind: viaKind } : result.targetClub ? { label: result.targetClub, kind: result.targetKind ?? "club" } : null);
        setState("solved");
        setSolvedCount((n) => n + 1);
        setSolvedRoutes((routes) => ({ ...routes, [puzzle.id]: { links: nextChain.length + 1, via: nextChain.map((l) => l.player.name) } }));
      } else {
        setChain([...chain, { player: result.player, viaClub: result.viaClub, kind: result.viaKind ?? "club" }]);
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setPending(false);
    }
  };

  if (!puzzle || !last) return null;
  const finished = state !== "playing";

  return (
    <>
      <DailyGameStage
        header={
          <DailyChallengeHeader
            onQuit={() => setShowQuit(true)}
            currentIndex={index}
            total={puzzles.length}
            timeLeft={Math.max(0, timeLeft)}
            centerLabel={t("passChain.chainCounter", { current: String(index + 1), total: String(puzzles.length) })}
            className="px-0 pt-0"
          />
        }
        contentClassName="max-w-md"
      >
        <div className="mx-auto w-full max-w-md">
          {/* The rule, spelled out with tonight's names: what "link" means is not obvious. */}
          <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-[13px] font-semibold leading-snug text-white md:text-sm" style={poppins}>
              {t("passChain.rule", { start: surname(puzzle.start.name), target: surname(puzzle.target.name) })}
            </p>
            {/* What a win looks like tonight, in concrete terms: one bridge, or n bridges. */}
            <p className="mt-1.5 text-[12px] font-bold leading-snug text-brand-cyan" style={poppins}>
              {puzzle.par <= 2
                ? t("passChain.hintOne", { start: surname(puzzle.start.name), target: surname(puzzle.target.name) })
                : t("passChain.hintMany", { n: String(puzzle.par - 1) })}
            </p>
          </div>

          <div className="mt-4 flex flex-col items-center">
            <ChainNode player={puzzle.start} tone="start" caption={t("passChain.start")} />
            <AnimatePresence initial={false}>
              {chain.map((link) => (
                <motion.div key={link.player.id} initial={{ opacity: 0, y: -8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex w-full flex-col items-center">
                  <Connector club={link.viaClub} kind={link.kind} />
                  <ChainNode player={link.player} tone="mid" />
                </motion.div>
              ))}
              {state === "revealed" && solutionIntermediates(puzzle).map((step, i) => (
                <motion.div key={`solution-${step.player.id}`} initial={{ opacity: 0, y: -8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.25 + i * 0.35 }} className="flex w-full flex-col items-center">
                  <Connector club={step.via} kind={step.kind} />
                  <ChainNode player={step.player} tone="solution" />
                </motion.div>
              ))}
            </AnimatePresence>
            <Connector club={state === "solved" ? endClub?.label ?? null : state === "revealed" ? lastSolutionHop(puzzle)?.via ?? null : null} kind={state === "solved" ? endClub?.kind : state === "revealed" ? lastSolutionHop(puzzle)?.kind : undefined} pending={state === "playing"} />
            <ChainNode player={puzzle.target} tone={state === "solved" ? "end-done" : "end"} caption={t("passChain.target")} />
          </div>

          {state === "revealed" && (
            <p className="mt-3 text-center text-xs font-bold uppercase tracking-wide text-white/45" style={poppins}>{t("passChain.shortest")}</p>
          )}
          {state === "solved" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border-2 border-brand-green/40 bg-brand-green/10 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-lg font-black uppercase text-brand-green" style={poppins}>
                <Check className="size-5" /> {t("passChain.linked")}
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-3 text-xs font-bold text-white/60" style={poppins}>
                <span>{t("passChain.links", { n: String(links) })}</span>
                {links <= puzzle.par
                  ? <span className="rounded-full bg-brand-yellow/15 px-2 py-1 text-brand-yellow">{t("passChain.perfect")}</span>
                  : <span>{t("passChain.par", { par: String(puzzle.par) })}</span>}
              </div>
              {/* A longer route than needed: show one shortest route right away, as the improvement goal. */}
              {links > puzzle.par && (
                <p className="mt-2 text-[11px] font-semibold leading-snug text-white/55" style={poppins}>
                  {t("passChain.shortestRoute", { route: shortestRouteNames(puzzle).map(surname).join(" → ") })}
                </p>
              )}
            </motion.div>
          )}

          {error && <p className="mt-3 text-center text-sm font-semibold text-brand-red-soft" style={poppins}>{error}</p>}

          {!finished && (
            <>
              <DailyAnswerInput
                value={answer}
                onChange={(v) => { setAnswer(v); setError(null); }}
                onSubmit={submit}
                placeholder={t("passChain.whoLinks", { name: surname(last.name) })}
                submitLabel={t("common.submit")}
                disabled={pending}
              />
              <button type="button" onClick={reveal} className="mx-auto mt-3 block text-sm font-semibold text-white/45 underline-offset-4 transition-colors hover:text-white/80 hover:underline" style={poppins}>
                {t("passChain.skip")}
              </button>
            </>
          )}
          {finished && (
            <button
              type="button"
              onClick={advance}
              className="font-poppins mt-4 h-14 w-full rounded-[20px] bg-brand-blue uppercase text-white outline-none transition-colors hover:bg-brand-blue/90"
              style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }}
            >
              {index + 1 >= puzzles.length ? t("passChain.seeResults") : t("passChain.next")}
            </button>
          )}
        </div>
      </DailyGameStage>

      <QuitGameDialog open={showQuit} onOpenChange={setShowQuit} onQuit={onBack} />
      <DailyChallengeCompleteModal
        practice={practice}
        open={done}
        title={t("play.passChainTitle")}
        correct={solvedCount}
        total={puzzles.length}
        challengeType={session.challengeType}
        scoreLabel={t("passChain.resultLabel")}
        scoreValue={passChainHeadline(puzzles, solvedRoutes, t)}
        details={<PassChainRouteSummary puzzles={puzzles} solvedRoutes={solvedRoutes} />}
        onDone={(next) => onComplete(solvedCount, next)}
      />
    </>
  );
}

type SolutionStep = PassChainSession["puzzles"][number]["solution"][number];
type Translate = ReturnType<typeof useLocale>["t"];

/** Route efficiency over the chains the player linked: their links against the shortest possible. */
export function passChainRouteTotals(puzzles: PassChainSession["puzzles"], solvedRoutes: Record<string, SolvedRoute>) {
  const solved = puzzles.filter((z) => solvedRoutes[z.id]);
  const yourLinks = solved.reduce((sum, z) => sum + solvedRoutes[z.id].links, 0);
  const shortestLinks = solved.reduce((sum, z) => sum + z.par, 0);
  return { solved: solved.length, total: puzzles.length, yourLinks, shortestLinks, extra: Math.max(0, yourLinks - shortestLinks) };
}

function passChainHeadline(puzzles: PassChainSession["puzzles"], solvedRoutes: Record<string, SolvedRoute>, t: Translate): string {
  const totals = passChainRouteTotals(puzzles, solvedRoutes);
  return totals.solved > 0 ? t("passChain.links", { n: String(totals.yourLinks) }) : t("passChain.resultNone");
}

/** Results breakdown: efficiency against the shortest routes first, then each chain's route vs a shortest one.
 *  The solved count is shown last and small: route length is the achievement. */
function PassChainRouteSummary({ puzzles, solvedRoutes }: { puzzles: PassChainSession["puzzles"]; solvedRoutes: Record<string, SolvedRoute> }) {
  const { t } = useLocale();
  const totals = passChainRouteTotals(puzzles, solvedRoutes);
  return (
    <div data-testid="pass-chain-route-summary">
      {totals.solved > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          <span className="font-poppins text-sm font-semibold text-white/80">{t("passChain.resultShortest", { n: String(totals.shortestLinks) })}</span>
          {totals.extra === 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-yellow/20 px-2.5 py-1 font-poppins text-xs font-bold text-brand-yellow">
              <Sparkles className="size-3.5" aria-hidden /> {t("passChain.resultPerfect")}
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-poppins text-xs font-bold text-white/80">{t("passChain.resultExtra", { n: String(totals.extra) })}</span>
          )}
        </div>
      )}
      <ol className="mt-3 space-y-2">
        {puzzles.map((z, i) => {
          const mine = solvedRoutes[z.id];
          const ends = (via: string[]) => [z.start.name, ...via, z.target.name].map(surname).join(" → ");
          return (
            <li key={z.id} className="rounded-[14px] bg-black/18 px-3 py-2.5">
              <p className="flex items-center gap-1.5 font-poppins text-[11px] font-semibold uppercase tracking-wide text-white/55">
                <Route className="size-3.5" aria-hidden /> {t("passChain.resultChain", { n: String(i + 1) })} · {surname(z.start.name)} → {surname(z.target.name)}
              </p>
              <p className={cn("mt-1 font-poppins text-xs font-bold", mine ? (mine.links <= z.par ? "text-brand-yellow" : "text-white") : "text-brand-red-soft")}>
                {mine ? t("passChain.resultYou", { n: String(mine.links) }) : t("passChain.resultYouNone")}
                {mine && <span className="block text-[11px] font-medium text-white/70">{ends(mine.via)}</span>}
              </p>
              <p className="mt-1 font-poppins text-xs font-bold text-white/70">
                {t("passChain.resultBest", { n: String(z.par) })}
                <span className="block text-[11px] font-medium text-white/55">{ends(solutionIntermediates(z).map((step) => step.player.name))}</span>
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-center font-poppins text-[11px] font-medium text-white/50">
        {t("passChain.resultLinkedCount", { solved: String(totals.solved), total: String(totals.total) })}
      </p>
    </div>
  );
}

/** Start, every intermediate of the stored shortest chain, and the target. */
function shortestRouteNames(puzzle: PassChainSession["puzzles"][number]): string[] {
  return [puzzle.start.name, ...solutionIntermediates(puzzle).map((step) => step.player.name), puzzle.target.name];
}

/** The stored path lists every hop including the target itself; the target already has its own card. */
function solutionIntermediates(puzzle: PassChainSession["puzzles"][number]): SolutionStep[] {
  return puzzle.solution.filter((step) => step.player.id !== puzzle.target.id);
}

/** The hop that lands on the target: its `via` is the link between the last intermediate and the target. */
function lastSolutionHop(puzzle: PassChainSession["puzzles"][number]): SolutionStep | null {
  const last = puzzle.solution[puzzle.solution.length - 1];
  return last && last.player.id === puzzle.target.id ? last : null;
}

function ChainNode({ player, tone, caption }: { player: PassChainPlayer; tone: "start" | "mid" | "solution" | "end" | "end-done"; caption?: string }) {
  const [failed, setFailed] = useState(false);
  const src = faceSrc(player.imageUrl);
  const styles: Record<typeof tone, string> = {
    start: "border-brand-yellow bg-brand-yellow/10 text-brand-yellow",
    mid: "border-brand-cyan bg-brand-cyan/10 text-brand-cyan",
    solution: "border-white/25 bg-white/[0.05] text-white/70 border-dashed",
    end: "border-white/15 bg-white/[0.03] text-white/35",
    "end-done": "border-brand-green bg-brand-green/10 text-brand-green",
  };
  return (
    <div className={cn("flex w-full max-w-[320px] items-center gap-3 rounded-2xl border-2 px-3 py-2.5", styles[tone])}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={44} height={44} decoding="async" onError={() => setFailed(true)} className="size-11 shrink-0 rounded-full border border-white/20 object-cover" />
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black/30 text-sm font-black" style={poppins}>{initials(player.name)}</span>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-black text-white" style={poppins}>{player.name}</div>
        <div className="line-clamp-2 text-[10px] font-semibold leading-snug text-white/40" style={poppins}>
          {caption ? <span className="text-white/60">{caption} · </span> : null}
          {player.clubs.slice(0, caption ? 5 : 3).join(" · ")}
        </div>
      </div>
    </div>
  );
}

function Connector({ club, kind = "club", pending }: { club: string | null; kind?: LinkKind; pending?: boolean }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center py-1">
      <div className="h-3 w-0.5 bg-white/15" />
      {club ? (
        <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide", kind === "manager" ? "bg-brand-orange/15 text-brand-orange" : "bg-white/[0.08] text-white/70")} style={poppins}>
          {kind === "manager" ? <UserRoundCog className="size-3" /> : <Shield className="size-3" />}
          {kind === "manager" ? t("passChain.coach", { name: club }) : club}
        </span>
      ) : (
        <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase", pending ? "bg-white/[0.04] text-white/30" : "bg-white/[0.08] text-white/70")} style={poppins}>
          <ArrowDown className="size-3" /> ?
        </span>
      )}
      <div className="h-3 w-0.5 bg-white/15" />
    </div>
  );
}
