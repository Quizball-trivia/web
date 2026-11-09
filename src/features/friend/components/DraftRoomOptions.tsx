"use client";

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

const chip = (selected: boolean, canEdit: boolean) => cn("min-h-9 rounded-full px-3 text-xs font-bold transition-colors", selected ? "bg-brand-blue text-white" : "bg-white/[0.07] text-white/75", canEdit && !selected && "hover:bg-white/[0.12]", !canEdit && !selected && "opacity-45");

export function DraftRoomOptions({ options, canEdit, onChange, hostOnly }: { options: Record<string, unknown> | null; canEdit: boolean; onChange: (options: Record<string, unknown>) => void; hostOnly: string }) {
  const { locale } = useLocale();
  const c = draftCopy(locale);
  const value = readDraftOptions(options);
  const set = (patch: Partial<DraftRoomChoice>) => { if (canEdit) onChange({ ...value, ...patch }); };
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
