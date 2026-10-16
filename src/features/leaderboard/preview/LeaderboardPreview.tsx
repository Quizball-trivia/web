"use client";

import { useState } from "react";
import Link from "next/link";

import type { BoardKind, BoardScope, BoardView, LeaderboardEntry } from "@/lib/domain/leaderboard";
import type { LeaderboardMode } from "../boards";
import { LeaderboardView } from "../LeaderboardView";
import { BoardTrophyCard, BoardTrophyUnlockOverlay } from "@/components/shared/BoardTrophy";
import {
  BOARDS,
  CLUBS,
  GROUP_STANDING,
  GROUP_STANDING_COUNTS,
  ME,
  NATIONS,
  boardKey,
  boardStandingFor,
} from "./fixtures";

const SCENARIOS: Record<string, { label: string; scope: BoardScope; view?: BoardView; picker?: "country" | "club"; myClub?: string }> = {
  global: { label: "World", scope: { kind: "global" } },
  country: { label: "My country", scope: { kind: "country", country: "GE" } },
  visitor: { label: "Browse Argentina", scope: { kind: "country", country: "AR" } },
  club: { label: "My club", scope: { kind: "club", club: "fc-barcelona" } },
  "top-fan": { label: "I'm a top-3 fan", scope: { kind: "club", club: "liverpool" }, myClub: "liverpool" },
  "club-standings": { label: "Club wars", scope: { kind: "club", club: "fc-barcelona" }, view: "standings" },
  "nation-standings": { label: "Nations", scope: { kind: "country", country: "GE" }, view: "standings" },
  "picker-club": { label: "Club picker", scope: { kind: "club", club: "fc-barcelona" }, picker: "club" },
  "picker-country": { label: "Country picker", scope: { kind: "country", country: "GE" }, picker: "country" },
  trophies: { label: "Trophies", scope: { kind: "global" } },
};

/** Fixture-driven copy of the leaderboard so every state can be reviewed without a backend. */
export function LeaderboardPreview({ scenario, member }: { scenario: string; member: boolean }) {
  const start = SCENARIOS[scenario] ?? SCENARIOS.global;
  const guest = !member;
  const [mode, setMode] = useState<LeaderboardMode>("ranked");
  const [scope, setScope] = useState<BoardScope>(start.scope);
  const [view, setView] = useState<BoardView>(start.view ?? "players");
  const [pickerKind, setPickerKind] = useState<"country" | "club" | null>(start.picker ?? null);
  const [countryChoice, setCountryChoice] = useState<string | null>(start.scope.kind === "country" ? start.scope.country : ME.country);
  const [clubChoice, setClubChoice] = useState<string | null>(guest ? null : start.myClub ?? ME.club);

  const entries = (BOARDS[boardKey(scope)] ?? BOARDS["club:real-madrid-cf"]).map((row) =>
    guest && row.isCurrentUser ? { ...row, id: "guest-hidden", username: "SAMBA_10", isCurrentUser: false } : row,
  );
  const boardStanding = guest ? null : boardStandingFor(scope);
  const userEntry: LeaderboardEntry | null = guest || !boardStanding
    ? null
    : entries.find((row) => row.isCurrentUser) ?? {
        id: ME.id, rank: boardStanding.rank, username: ME.username, avatar: "avatar-2", avatarCustomization: null,
        country: ME.country, tier: "Captain", rankPoints: ME.points, isCurrentUser: true, trend: "same", trendValue: 0,
      };
  const kindForLists = pickerKind ?? (scope.kind === "global" ? "country" : scope.kind);

  const selectKind = (kind: BoardKind) => {
    if (kind === "global") setScope({ kind: "global" });
    if (kind === "country" && countryChoice) setScope({ kind: "country", country: countryChoice });
    if (kind === "club" && clubChoice) setScope({ kind: "club", club: clubChoice });
    if (kind === "global") setView("players");
  };
  const selectGroup = (kind: "country" | "club", value: string) => {
    if (kind === "country") setCountryChoice(value);
    else setClubChoice(value);
    setScope(kind === "country" ? { kind, country: value } : { kind, club: value });
    setView("players");
    setPickerKind(null);
  };

  return (
    <>
      <p className="bg-brand-blue px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-wide text-white">
        {guest ? "Preview · sample data · signed-out view" : "Preview · sample data · signed-in view"}{" · "}
        <Link href={`/dev/leaderboard?s=${scenario}${guest ? "&as=member" : ""}`} className="underline">
          {guest ? "show signed-in view" : "show signed-out view"}
        </Link>
      </p>
      <nav className="sticky top-0 z-40 flex gap-1.5 overflow-x-auto border-b border-white/10 bg-black/80 px-3 py-2 backdrop-blur">
        {Object.entries(SCENARIOS).map(([id, item]) => (
          <Link
            key={id}
            href={`/dev/leaderboard?s=${id}${member ? "&as=member" : ""}`}
            className={`shrink-0 rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${id === scenario ? "bg-brand-orange text-black" : "bg-white/10 text-white/70 hover:bg-white/20"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <LeaderboardView
        mode={mode}
        onModeChange={setMode}
        seasonOptions={[{ value: "current", label: "Season 3" }, { value: "s2", label: "Season 2" }]}
        seasonValue="current"
        onSeasonChange={() => {}}
        isArchivedView={false}
        scope={scope}
        view={view}
        countryChoice={countryChoice}
        clubChoice={clubChoice}
        myCountry={guest ? null : ME.country}
        myClub={guest ? null : start.myClub ?? ME.club}
        onSelectKind={selectKind}
        onSelectGroup={selectGroup}
        onViewChange={setView}
        pickerKind={pickerKind}
        onOpenPicker={setPickerKind}
        onClosePicker={() => setPickerKind(null)}
        pickerStandings={kindForLists === "club" ? CLUBS : NATIONS}
        standings={scope.kind === "club" ? CLUBS : NATIONS}
        standingsLoading={false}
        entries={entries}
        isLoading={false}
        isError={false}
        userEntry={userEntry}
        boardStanding={boardStanding}
        groupStanding={guest ? null : scope.kind === "club" ? GROUP_STANDING : GROUP_STANDING_COUNTS}
        currentPlayerId={guest ? undefined : ME.id}
        onEntryClick={() => {}}
        onSignIn={guest ? () => {} : undefined}
        isEventMode={false}
      />
    </>
  );
}

/** Profile achievement rows and the one-time unlock, as players see them after a season ends. */
export function TrophiesPreview() {
  const [open, setOpen] = useState(true);
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-4 py-6 font-fun">
      <p className="text-xl uppercase text-white" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>Profile achievements</p>
      <BoardTrophyCard trophy={{ season: 3, kind: "club", key: "fc-barcelona" }} place={1} />
      <BoardTrophyCard trophy={{ season: 3, kind: "country", key: "GE" }} place={2} />
      <BoardTrophyCard trophy={{ season: 2, kind: "club", key: "liverpool" }} place={3} />
      {open && <BoardTrophyUnlockOverlay trophy={{ season: 3, kind: "club", key: "fc-barcelona" }} place={1} onClose={() => setOpen(false)} />}
    </div>
  );
}
