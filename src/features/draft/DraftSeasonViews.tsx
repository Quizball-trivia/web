"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Crown, Shirt, Snowflake, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { GreenButton, QuietButton, TopBar, poppins } from "@/features/wordgames/ui";
import { draftCopy, type DraftText } from "./draft.copy";
import { BenchRow, DraftPitch, LineBars, costOf } from "./DraftViews";
import { CAPTAIN_BONUS, CHEMISTRY_CAP, TACTICS, XI, fits, isBench, lines, spentOn, type ChemLink, type CupRun, type DraftPlayer, type MomentView, type Pick, type Slot, type TacticId } from "./draft.rules";
import type { PublicHalf, SeasonExtra } from "./draft.api";

const euros = (m: number) => `€${m}M`;
const surname = (name: string) => name.split(" ").slice(1).join(" ") || name;
const nameAt = (c: DraftText, slots: Slot[], picks: (Pick | null)[], slotId: string) => { const p = picks[slots.findIndex((s) => s.id === slotId)]; return !p || p.academy ? c.academy : p.player.name; };

/** What the team talk adds per place: chemistry (capped) and the armband. The server works out the same. */
export function boostView(slots: Slot[], picks: (Pick | null)[], links: ChemLink[] | null | undefined, captain: string | null | undefined) {
  const count = slots.map((s) => Math.min(CHEMISTRY_CAP, (links ?? []).filter((l) => l.a === s.id || l.b === s.id).length));
  return count.map((n, i) => n + (captain && slots[i].id === captain && picks[i] && !picks[i]!.academy ? CAPTAIN_BONUS : 0));
}

const SHIFT_KEYS = [["att", "att"], ["mid", "mid"], ["def", "def"], ["gk", "gk"]] as const;
function TacticCard({ c, id, on, onPick }: { c: DraftText; id: TacticId; on: boolean; onPick: () => void }) {
  const t = TACTICS[id];
  return (
    <button type="button" aria-pressed={on} onClick={onPick}
      className={cn("flex min-w-0 flex-col rounded-2xl border-b-4 px-3 py-2.5 text-left transition-colors", on ? "border-brand-green-deep bg-brand-green/20 ring-2 ring-brand-green" : "border-black/40 bg-surface-card hover:bg-white/10")}>
      <span className="text-sm font-black uppercase leading-tight" style={poppins}>{c.tacticNames[id]}</span>
      <span className="mt-0.5 text-[11px] font-semibold leading-snug text-white/70">{c.tacticNotes[id]}</span>
      <span className="mt-1.5 flex flex-wrap gap-1">
        {SHIFT_KEYS.filter(([k]) => t[k] !== 0).map(([k]) => (
          <span key={k} className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums", t[k] > 0 ? "bg-brand-green/25 text-brand-green-light" : "bg-brand-red-soft/25 text-brand-red-light")} style={poppins}>
            {t[k] > 0 ? "+" : "−"}{Math.abs(t[k])} {c.lineNames[k]}
          </span>
        ))}
      </span>
    </button>
  );
}

function Card({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-surface-card px-4 py-3", className)}>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/80" style={poppins}>{icon}{title}</h3>
      {children}
    </section>
  );
}

function ChemistryList({ c, slots, picks, links }: { c: DraftText; slots: Slot[]; picks: (Pick | null)[]; links: ChemLink[] }) {
  if (!links.length) return <p className="text-xs leading-snug text-white/70">{c.chemNone}</p>;
  return (
    <>
      <p className="text-sm font-bold text-brand-yellow">{c.chemLinks(links.length)}</p>
      <ul className="mt-1.5 space-y-1 text-xs text-white/80">
        {links.slice(0, 8).map((l) => <li key={`${l.a}-${l.b}`}>{c.chemPair(surname(nameAt(c, slots, picks, l.a)), surname(nameAt(c, slots, picks, l.b)), l.club, l.season)}</li>)}
      </ul>
    </>
  );
}

// ── The team talk: captain, tactic, chemistry ──────────────────────────────────────────────────────────────────────

export function TeamTalk({ locale, slots, picks, budget, tactics, tactic, captain, links, notice, pending, onCaptain, onTactic, onPlay, onExit }: {
  locale: string; slots: Slot[]; picks: (Pick | null)[]; budget?: number; tactics: TacticId[]; tactic: TacticId | null; captain: string | null; links: ChemLink[];
  notice?: string | null; pending?: boolean; onCaptain: (slotId: string) => void; onTactic: (t: TacticId) => void; onPlay: () => void; onExit: () => void;
}) {
  const c = draftCopy(locale);
  const xi = slots.filter((s) => !isBench(s));
  const perSlot = boostView(slots, picks, links, captain);
  const team = lines(xi, picks.slice(0, XI), { perSlot: perSlot.slice(0, XI), shift: tactic ? TACTICS[tactic] : null });
  const captainName = captain ? nameAt(c, slots, picks, captain) : null;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap />
      <h2 className="mt-3 text-center text-2xl font-black uppercase" style={poppins}>{c.teamTalk}</h2>
      {notice && <p role="status" className="mt-2 rounded-xl bg-surface-card px-3 py-2 text-center text-xs font-semibold text-white ring-1 ring-brand-yellow/60">{notice}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
        <div className="space-y-2">
          <DraftPitch slots={slots} picks={picks} academy={c.academy} links={links} captain={captain} onPlayer={onCaptain} className="aspect-[4/3.6]" />
          <p className={cn("flex items-center justify-center gap-1.5 text-center text-xs font-bold", captain ? "text-brand-yellow" : "text-white/75")}><Crown className="size-3.5" aria-hidden />{captainName ? c.captainSet(captainName) : c.chooseCaptain}</p>
          {slots.some(isBench) && <BenchRow c={c} slots={slots} picks={picks} />}
        </div>
        <div className="space-y-3">
          <Card title={c.chooseTactic}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {tactics.map((t) => <TacticCard key={t} c={c} id={t} on={tactic === t} onPick={() => onTactic(t)} />)}
            </div>
          </Card>
          <Card title={c.chemistry}><ChemistryList c={c} slots={slots} picks={picks} links={links} /></Card>
          <LineBars c={c} team={team} />
          {budget != null && <p className="text-center text-sm font-black text-brand-yellow tabular-nums" style={poppins}>{c.spent(spentOn(picks), budget)}</p>}
        </div>
      </div>
      <div className="mt-auto pt-4">
        <GreenButton onClick={onPlay} disabled={pending}>{c.kickOff}</GreenButton>
      </div>
    </div>
  );
}

// ── Moments ────────────────────────────────────────────────────────────────────────────────────────────────────────

export const momentText = (c: DraftText, m: MomentView) => (m.kind === "injury" ? c.injury(m.name ?? "", m.weeks ?? 1, m.cover ?? null) : m.kind === "red" ? c.red(m.name ?? "", m.cover ?? null) : c.derby(m.rival ?? ""));

export function MomentsList({ c, moments, derby, upTo }: { c: DraftText; moments: MomentView[]; derby?: string | null; upTo?: number }) {
  const shown = moments.filter((m) => upTo == null || m.round <= upTo);
  if (!shown.length && !derby) return null;
  return (
    <ul className="space-y-1.5 text-xs">
      {derby && <li className="rounded-lg bg-brand-red-soft/15 px-2.5 py-1.5 font-semibold text-white/90">{c.derby(derby)}</li>}
      {shown.map((m, i) => (
        <li key={`${m.round}-${m.slotId}-${i}`} className="flex gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
          <span className="shrink-0 font-black tabular-nums text-white/60" style={poppins}>{c.matchweek(m.round, 0).split("/")[0].trim()}</span>
          <span className="text-white/85">{momentText(c, m)}</span>
        </li>
      ))}
    </ul>
  );
}

// ── The winter break: first half, January window, second-half tactic ───────────────────────────────────────────────

export function WinterBreak({ locale, half, slots, picks, tactics, tactic, pending, onScout, onSign, onTactic, onPlay, onExit }: {
  locale: string; half: PublicHalf; slots: Slot[]; picks: (Pick | null)[]; tactics: TacticId[]; tactic: TacticId | null; pending?: boolean;
  onScout: () => void; onSign: (playerId: string, slotId: string) => void; onTactic: (t: TacticId) => void; onPlay: () => void; onExit: () => void;
}) {
  const c = draftCopy(locale);
  const [chosen, setChosen] = useState<string | null>(null);
  const w = half.window;
  const squad = (w.spin?.players ?? []) as Array<DraftPlayer & { price?: number }>;
  const player = squad.find((p) => p.id === chosen);
  const wins = half.matches.filter((m) => m.gf > m.ga).length, draws = half.matches.filter((m) => m.gf === m.ga).length;
  // Where he could play: any place he fits, filled or not (whoever is there is sold for half his price).
  // Selling whoever holds the place brings back half his price.
  const refundAt = (i: number) => { const p = picks[i]; return p && !p.academy ? Math.floor((p.price ?? 0) / 2) : 0; };
  const affordableAt = (i: number) => !!player && costOf(player) <= w.money + refundAt(i);
  const places = player ? slots.filter((s, i) => fits(player, s) && affordableAt(i)).map((s) => s.id) : [];
  const sign = (slot: Slot) => { if (player) { onSign(player.id, slot.id); setChosen(null); } };
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap />
      <div className="mt-3 rounded-3xl bg-gradient-to-br from-[#1b3b5a] to-surface-card px-4 py-4 text-center shadow-xl ring-1 ring-white/10">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-sky-200" style={poppins}><Snowflake className="size-4" aria-hidden />{c.winterBreak}</p>
        <p className="mt-1 text-3xl font-black tabular-nums" style={poppins}>{wins}–{draws}–{half.matches.length - wins - draws}</p>
        <p className="mt-0.5 text-sm font-semibold text-white/80">{half.position === 1 ? c.raceTop(half.gap, half.leader) : c.raceOff(half.position, half.gap, half.leader)}</p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-5">
        <div className="space-y-3">
          <Card title={c.january} icon={<Shirt className="size-3.5" aria-hidden />}>
            {w.signing ? (
              <p className="text-sm font-bold text-brand-green-light">{c.januaryDone(w.signing.in, w.signing.out, w.signing.refund)}</p>
            ) : (
              <>
                <p className="text-xs leading-snug text-white/75">{c.januaryHint}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-base font-black text-brand-yellow tabular-nums" style={poppins}>{c.januaryMoney(w.money)}</span>
                  {w.spinsLeft > 0 && <QuietButton onClick={onScout} className="h-10 w-auto px-4 text-xs">{w.spin ? c.januaryAgain : c.januaryScout}</QuietButton>}
                </div>
                {w.spin && (
                  <>
                    <p className="mt-2 text-xs font-bold text-white/80">{w.spin.club} · {w.spin.season}</p>
                    <ul className="mt-1.5 max-h-64 space-y-1 overflow-y-auto pr-1">
                      {squad.slice().sort((a, b) => (b.price ?? 0) - (a.price ?? 0)).map((p) => {
                        const on = chosen === p.id;
                        const dear = costOf(p) > w.money + Math.max(0, ...picks.map((_, i) => refundAt(i)));
                        return (
                          <li key={p.id}>
                            <button type="button" disabled={dear} onClick={() => setChosen(on ? null : p.id)}
                              className={cn("flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors disabled:opacity-40", on ? "bg-brand-yellow/20 ring-2 ring-brand-yellow" : "bg-black/20 hover:bg-white/10")}>
                              <span className="w-9 shrink-0 text-[10px] font-black text-white/60" style={poppins}>{c.posShort[p.pos]}</span>
                              <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                              <span className="shrink-0 text-sm font-black tabular-nums text-brand-yellow" style={poppins}>{euros(costOf(p))}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}
            {!w.signing && !w.spin && <p className="mt-2 text-[11px] font-semibold text-white/55">{c.januaryNone}</p>}
          </Card>
          {half.moments.length > 0 && <Card title={c.momentsTitle}><MomentsList c={c} moments={half.moments} /></Card>}
        </div>
        <div className="space-y-3">
          {player && <p role="status" className="rounded-xl bg-brand-yellow px-3 py-2 text-center text-sm font-black text-surface-page" style={poppins}>{c.januaryPlace(surname(player.name))}</p>}
          <DraftPitch slots={slots} picks={picks} academy={c.academy} highlight={places} onSlot={(slotId) => { const s = slots.find((x) => x.id === slotId); if (s) sign(s); }} className="aspect-[4/3.6]" />
          {slots.some(isBench) && <BenchRow c={c} slots={slots} picks={picks} selectable={places} onPick={sign} />}
          <Card title={c.secondTactic}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {tactics.map((t) => <TacticCard key={t} c={c} id={t} on={tactic === t} onPick={() => onTactic(t)} />)}
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-auto pt-4">
        <GreenButton onClick={onPlay} disabled={pending}>{c.playSecondHalf}</GreenButton>
      </div>
    </div>
  );
}

// ── After the season: trophies and awards ──────────────────────────────────────────────────────────────────────────

function CupLine({ c, run, name }: { c: DraftText; run: CupRun; name: string }) {
  const last = run.matches[run.matches.length - 1];
  const score = (m: CupRun["matches"][number]) => `${m.gf}–${m.ga}${m.pens ? ` (${c.penalties(m.pens[0], m.pens[1])})` : ""}`;
  return (
    <div className={cn("rounded-xl px-3 py-2", run.won ? "bg-brand-yellow text-surface-page" : "bg-black/20")}>
      <p className="flex items-center gap-1.5 text-sm font-black" style={poppins}>{run.won ? <Trophy className="size-4" aria-hidden /> : null}{name}{run.won && ` · ${run.kind === "cup" ? c.cupWon : c.europeWon}`}</p>
      {!run.won && last && <p className="mt-0.5 text-xs text-white/80">{c.outIn(c.stage(run.kind, last.stage, run.stages), last.opponent, score(last))}</p>}
      <ol className={cn("mt-1 space-y-0.5 text-[11px]", run.won ? "text-surface-page/80" : "text-white/65")}>
        {run.matches.map((m) => <li key={m.stage} className="flex justify-between gap-2"><span className="min-w-0 truncate">{c.stage(run.kind, m.stage, run.stages)} · {m.opponent}</span><span className="shrink-0 font-black tabular-nums">{score(m)}</span></li>)}
      </ol>
    </div>
  );
}

export function SeasonExtras({ locale, extra, slots, picks, finish, topScorer }: {
  locale: string; extra: SeasonExtra; slots: Slot[]; picks: (Pick | null)[]; finish: string; topScorer: { name: string; goals: number } | null;
}) {
  const c = draftCopy(locale);
  const reduce = useReducedMotion();
  const champions = finish === "champions" || finish === "perfect";
  const treble = champions && extra.cup.won && !!extra.europe?.won;
  return (
    <div className="space-y-3">
      <Card title={c.trophies} icon={<Trophy className="size-3.5" aria-hidden />}>
        {treble && <motion.p initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-2 rounded-xl bg-gradient-to-r from-brand-yellow to-[#ffb000] py-2 text-center text-xl font-black text-surface-page" style={poppins}>{c.treble}</motion.p>}
        <div className="space-y-2">
          <CupLine c={c} run={extra.cup} name={c.cupName} />
          {extra.europe ? <CupLine c={c} run={extra.europe} name={c.europeName} /> : <p className="rounded-xl bg-black/20 px-3 py-2 text-xs text-white/70">{c.noEurope}</p>}
        </div>
        {extra.cupCoins > 0 && <p className="mt-2 text-center text-sm font-black text-brand-yellow" style={poppins}>{c.trophyCoins(extra.cupCoins)}</p>}
      </Card>
      <Card title={c.awards}>
        <ul className="space-y-1.5 text-sm">
          {topScorer && extra.realTop && <li className="text-white/85">{c.goldenBootVs(topScorer.name, topScorer.goals, extra.realTop.name, extra.realTop.goals, extra.realTop.season)}</li>}
          {extra.captain && <li className="flex items-center gap-1.5 text-white/85"><Crown className="size-4 text-brand-yellow" aria-hidden />{c.captainSet(nameAt(c, slots, picks, extra.captain))}</li>}
          {extra.tactic && <li className="text-white/85">{c.chooseTactic}: <b>{c.tacticNames[extra.tactic]}</b>{extra.tactic2 && extra.tactic2 !== extra.tactic && <> → <b>{c.tacticNames[extra.tactic2]}</b></>}</li>}
          <li className="text-white/85">{c.januarySigning}: <b>{extra.january ? c.januaryDone(extra.january.in, extra.january.out, 0).replace(/ \(\+€0M\)$/, "") : c.januaryNone}</b></li>
        </ul>
      </Card>
      {(extra.links.length > 0 || extra.moments.length > 0 || extra.derby) && (
        <Card title={c.momentsTitle}>
          <MomentsList c={c} moments={extra.moments} derby={extra.derby} />
          {extra.links.length > 0 && <div className="mt-2 border-t border-white/10 pt-2"><ChemistryList c={c} slots={slots} picks={picks} links={extra.links} /></div>}
        </Card>
      )}
    </div>
  );
}
