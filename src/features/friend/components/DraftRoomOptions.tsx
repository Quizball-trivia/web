"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { draftCopy } from "@/features/draft/draft.copy";
import { FORMATIONS, type Era, type FormationId, type Variant } from "@/features/draft/draft.rules";
import { cn } from "@/lib/utils";

/** What a Football Draft room plays: mirrors the backend's room options. */
export interface DraftRoomChoice { leagueId: string; era: Era; formation: FormationId; variant: Variant }
const LEAGUES: ReadonlyArray<readonly [string, string]> = [["pl", "Premier League"], ["laliga", "LaLiga"], ["seriea", "Serie A"], ["bundesliga", "Bundesliga"], ["ligue1", "Ligue 1"]];
const ERAS: readonly Era[] = ["all", "modern", "legends"];
const VARIANTS: readonly Variant[] = ["budget", "classic", "knowledge"];

export function readDraftOptions(raw: Record<string, unknown> | null | undefined): DraftRoomChoice {
  return {
    leagueId: LEAGUES.find(([id]) => id === raw?.leagueId)?.[0] ?? "pl",
    era: ERAS.find((e) => e === raw?.era) ?? "all",
    formation: (Object.keys(FORMATIONS) as FormationId[]).find((f) => f === raw?.formation) ?? "4-3-3",
    variant: VARIANTS.find((v) => v === raw?.variant) ?? "budget",
  };
}

const sameChoice = (a: DraftRoomChoice, b: DraftRoomChoice) => a.leagueId === b.leagueId && a.era === b.era && a.formation === b.formation && a.variant === b.variant;

const chip = (selected: boolean, canEdit: boolean) => cn("min-h-9 rounded-full px-3 text-xs font-bold transition-colors", selected ? "bg-brand-blue text-white" : "bg-white/[0.07] text-white/75", canEdit && !selected && "hover:bg-white/[0.12]", !canEdit && !selected && "opacity-45");

export function DraftRoomOptions({ options, canEdit, onChange, hostOnly, onPendingChange, onAbandoned, refusedVersion = 0 }: { options: Record<string, unknown> | null; canEdit: boolean; onChange: (options: Record<string, unknown>) => void; hostOnly: string; onPendingChange?: (pending: boolean) => void; onAbandoned?: () => void; refusedVersion?: number }) {
  const { locale } = useLocale();
  const c = draftCopy(locale);
  const server = readDraftOptions(options);
  const serverKey = `${server.variant}|${server.leagueId}|${server.era}|${server.formation}`;
  // Quick taps must not undo each other, on the screen or on the server. The screen shows the newest choice at once;
  // the server gets one change at a time (the room applies each under a lock, so two in flight could land out of
  // order), and the newest choice goes out once the room has confirmed the one before. When the room shows the newest
  // choice, or editing is no longer allowed, the room's own value is shown again.
  const [sent, setSent] = useState<DraftRoomChoice | null>(null);
  if (sent && (!canEdit || sameChoice(sent, server))) setSent(null);
  // The lobby rolled its settings back (a refusal it already reported): the change on its way is over, and so is its wait.
  const [seenRefusal, setSeenRefusal] = useState(refusedVersion);
  if (refusedVersion !== seenRefusal) {
    setSeenRefusal(refusedVersion);
    if (sent) setSent(null);
  }
  const pending = canEdit && sent && !sameChoice(sent, server) ? sent : null;
  const value = pending ?? server;
  const inFlight = useRef<DraftRoomChoice | null>(null);
  useEffect(() => { inFlight.current = null; }, [refusedVersion, canEdit]);
  useEffect(() => {
    if (inFlight.current && !sameChoice(inFlight.current, server)) return;
    inFlight.current = null;
    if (!pending) return;
    inFlight.current = pending;
    onChange({ ...pending });
    // serverKey stands for server; onChange is the lobby's stable sender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey, pending]);
  // While a change is on its way the lobby treats the settings as saving: Ready and Start wait for the room's answer.
  useEffect(() => { onPendingChange?.(pending !== null); }, [pending, onPendingChange]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);
  // No answer in 3 s counts as refused, like any lobby setting: the room's value returns and a held Ready is dropped.
  // Each tap and each confirmation restarts the wait.
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => { inFlight.current = null; setSent(null); onAbandoned?.(); }, 3_000);
    return () => clearTimeout(timer);
  }, [pending, serverKey, onAbandoned]);
  const set = (patch: Partial<DraftRoomChoice>) => {
    if (!canEdit) return;
    setSent({ ...value, ...patch });
  };
  const row = <T extends string>(label: string, items: ReadonlyArray<readonly [T, string]>, current: T, pick: (v: T) => void) => (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/55">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([id, name]) => <button key={id} type="button" aria-pressed={current === id} disabled={!canEdit} onClick={() => pick(id)} className={chip(current === id, canEdit)}>{name}</button>)}
      </div>
    </div>
  );
  return (
    <div className="mt-3 space-y-3">
      {row(c.setMode, VARIANTS.map((v) => [v, v === "budget" ? c.budget : v === "knowledge" ? c.knowledge : c.classic] as const), value.variant, (variant) => set({ variant }))}
      {row(c.setLeague, LEAGUES, value.leagueId, (leagueId) => set({ leagueId }))}
      {row(c.setEra, ERAS.map((e) => [e, e === "all" ? c.allTime : e === "modern" ? c.modern : c.legends] as const), value.era, (era) => set({ era }))}
      {row(c.setFormation, (Object.keys(FORMATIONS) as FormationId[]).map((f) => [f, f] as const), value.formation, (formation) => set({ formation }))}
      {!canEdit && <p className="text-[11px] text-white/50">{hostOnly}</p>}
    </div>
  );
}
