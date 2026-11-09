"use client";

import { useEffect, useState } from "react";
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
  // Quick taps must not undo each other, on the screen or on the server. The screen shows the newest choice at once;
  // the server gets one change at a time (the room applies each under a lock, so two in flight could land out of
  // order). `want` is the newest choice, `inFlight` the one sent and not yet confirmed by the room.
  const [q, setQ] = useState<{ want: DraftRoomChoice | null; inFlight: DraftRoomChoice | null }>({ want: null, inFlight: null });
  const [seenRefusal, setSeenRefusal] = useState(refusedVersion);
  let next = q;
  // Editing no longer allowed, or the lobby rolled its settings back (a refusal it already reported): all of it is over.
  if ((!canEdit || refusedVersion !== seenRefusal) && (next.want || next.inFlight)) next = { want: null, inFlight: null };
  // The room confirmed what was in flight.
  if (next.inFlight && sameChoice(next.inFlight, server)) next = { ...next, inFlight: null };
  // Nothing in flight: the newest choice goes out if the room does not show it yet, or is done if it does.
  if (!next.inFlight && next.want) next = sameChoice(next.want, server) ? { want: null, inFlight: null } : { ...next, inFlight: next.want };
  if (refusedVersion !== seenRefusal) setSeenRefusal(refusedVersion);
  if (next !== q) setQ(next);
  const pending = next.want !== null || next.inFlight !== null;
  const value = next.want ?? server;
  // Each change put in flight is sent once.
  useEffect(() => { if (q.inFlight) onChange({ ...q.inFlight }); }, [q.inFlight]); // eslint-disable-line react-hooks/exhaustive-deps
  // While a change is on its way the lobby treats the settings as saving: Ready and Start wait for the room's answer.
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  useEffect(() => () => onPendingChange?.(false), [onPendingChange]);
  // A change the room does not confirm within 3 s counts as refused, like any lobby setting: the room's value returns
  // and a held Ready is dropped. The wait belongs to the change in flight; changes from elsewhere do not extend it.
  useEffect(() => {
    if (!q.inFlight) return;
    const timer = setTimeout(() => { setQ({ want: null, inFlight: null }); onAbandoned?.(); }, 3_000);
    return () => clearTimeout(timer);
  }, [q.inFlight, onAbandoned]);
  const set = (patch: Partial<DraftRoomChoice>) => {
    if (!canEdit) return;
    setQ((current) => ({ ...current, want: { ...(current.want ?? server), ...patch } }));
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
