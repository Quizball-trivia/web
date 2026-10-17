"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Trophy } from "lucide-react";

import { profileHandle } from "@/lib/hooks/useProfileNavigation";
import {
  useBoard,
  useBoardRank,
  useLeaderboardSeasons,
  useStandings,
} from "@/lib/queries/leaderboard.queries";
import type {
  BoardKind,
  BoardScope,
  BoardStanding,
  BoardView,
  LeaderboardStanding,
} from "@/lib/domain/leaderboard";
import { normalizeCountryCode } from "@/lib/geo/countryCode";
import { useLocale } from "@/contexts/LocaleContext";
import { useActiveEventMode } from "@/lib/hooks/useActiveEventMode";
import { useAuthStore } from "@/stores/auth.store";
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import type { StandingsApiResponse } from "@/lib/repositories/leaderboard.repo";
import { boardSearch, clubOf, parseBoardParams, sameScope, type LeaderboardMode } from "./boards";
import { LeaderboardView } from "./LeaderboardView";
import type { LeaderboardSelectOption } from "./components/LeaderboardSelect";

interface LeaderboardScreenProps {
  currentPlayerId?: string;
}

/** Stands in for `seasonId === null` (the live season) inside the select. */
const CURRENT_SEASON_VALUE = "current";

function toStandings(data: StandingsApiResponse | undefined): LeaderboardStanding[] {
  return (data?.standings ?? []).map((row) => ({ ...row, isMine: row.key === data?.viewer?.mine }));
}

export function LeaderboardScreen({ currentPlayerId }: LeaderboardScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { isEventMode } = useActiveEventMode();
  const authStatus = useAuthStore((state) => state.status);
  const isGuest = authStatus !== "authenticated";
  const authUser = useAuthStore((state) => state.user);
  const openAuthPrompt = useAuthPromptStore((state) => state.open);

  // A shared link opens straight on its board; the URL then follows the screen.
  const [initial] = useState(() => parseBoardParams(new URLSearchParams(searchParams.toString())));
  const [mode, setMode] = useState<LeaderboardMode>(initial.mode);
  const [scope, setScope] = useState<BoardScope>(initial.scope ?? { kind: "global" });
  const [view, setView] = useState<BoardView>(initial.view);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [pickerKind, setPickerKind] = useState<"country" | "club" | null>(null);
  const [countryPick, setCountryPick] = useState<string | null>(initial.scope?.kind === "country" ? initial.scope.country : null);
  const [clubPick, setClubPick] = useState<string | null>(initial.scope?.kind === "club" ? initial.scope.club : null);

  // Navigation to another board link (a profile badge, back/forward) moves the
  // screen; when the URL is just echoing the screen, nothing changes.
  const search = searchParams.toString();
  const [syncedSearch, setSyncedSearch] = useState(search);
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    const parsed = parseBoardParams(new URLSearchParams(search));
    const nextScope = parsed.scope ?? { kind: "global" as const };
    if (parsed.mode !== mode) setMode(parsed.mode);
    if (!sameScope(nextScope, scope)) setScope(nextScope);
    if (parsed.view !== view) setView(parsed.view);
    if (nextScope.kind === "country") setCountryPick(nextScope.country);
    if (nextScope.kind === "club") setClubPick(nextScope.club);
  }

  useEffect(() => {
    const next = boardSearch({ mode, scope, view });
    if (next.slice(1) !== search) router.replace(`${pathname}${next}`, { scroll: false });
    // Only the screen's own changes write the URL; URL changes arrive through `search` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, scope, view]);

  const isRanked = mode === "ranked";
  const season = isRanked ? seasonId ?? undefined : undefined;
  const groupKind = scope.kind === "global" ? null : scope.kind;
  const showStandings = !!groupKind && view === "standings";

  const countryStandings = useStandings(mode, "country", currentPlayerId, groupKind === "country" || pickerKind === "country");
  const clubStandings = useStandings(mode, "club", currentPlayerId, !isGuest || groupKind === "club" || pickerKind === "club");

  const myCountry = isGuest ? null : normalizeCountryCode(authUser?.country)?.toUpperCase() ?? null;
  // The server's canonical club id wins; the catalogue lookup covers the first paint.
  const localClub = clubOf(authUser?.favorite_club);
  // Hidden catalogue entries ("Lyon" → wl-lyon) are not the server's id, so only public ones stand in.
  const myClub = isGuest ? null : clubStandings.data?.viewer?.mine ?? (localClub && !localClub.hidden ? localClub.id : null);
  const countryChoice = countryPick ?? myCountry;
  const clubChoice = clubPick ?? myClub;

  const board = useBoard(mode, scope, currentPlayerId, season, !showStandings);
  const rank = useBoardRank(mode, scope, currentPlayerId, season, !isGuest);

  const { data: seasonsData, isPending: seasonsPending } = useLeaderboardSeasons();
  const archivedSeasons = useMemo(() => seasonsData?.seasons ?? [], [seasonsData]);
  const currentSeasonNumber = seasonsData?.currentSeasonNumber ?? archivedSeasons.length + 1;
  const seasonOptions = useMemo<LeaderboardSelectOption<string>[]>(
    () => [
      { value: CURRENT_SEASON_VALUE, label: t("leaderboard.season", { n: currentSeasonNumber }) },
      ...[...archivedSeasons].reverse().map((item) => ({
        value: item.id,
        label: t("leaderboard.season", { n: item.seasonNumber }),
        icon: Trophy,
      })),
    ],
    [archivedSeasons, currentSeasonNumber, t],
  );

  const entries = board.data;
  const userEntry = entries?.find((entry) => entry.isCurrentUser || entry.id === currentPlayerId) ?? rank.data?.entry ?? null;
  // Until the session check ends nobody knows whether this is a member (rank strip) or a visitor (sign-in prompt).
  const viewerPending = authStatus === "loading" || (authStatus === "authenticated" && !!currentPlayerId && rank.isPending);
  const boardStanding: BoardStanding | null = rank.data
    ? { rank: rank.data.entry.rank, total: rank.data.entry.total, nextTarget: rank.data.nextTarget, topTenSlot: null, topTenGap: null }
    : null;

  const activeStandings = groupKind === "club" ? clubStandings : countryStandings;
  const pickerStandings = pickerKind === "club" ? clubStandings : countryStandings;
  const viewer = activeStandings.data?.viewer;
  const groupStanding: BoardStanding | null = viewer
    ? { rank: 0, total: 0, nextTarget: null, topTenSlot: viewer.slot, topTenGap: viewer.gap, livePoints: viewer.points }
    : null;

  const selectKind = (kind: BoardKind) => {
    if (kind === "global") {
      setScope({ kind: "global" });
      setView("players");
    } else if (kind === "country" && countryChoice) {
      setScope({ kind: "country", country: countryChoice });
    } else if (kind === "club" && clubChoice) {
      setScope({ kind: "club", club: clubChoice });
    }
  };

  const selectGroup = (kind: "country" | "club", value: string) => {
    if (kind === "country") setCountryPick(value);
    else setClubPick(value);
    setScope(kind === "country" ? { kind, country: value } : { kind, club: value });
    setView("players");
    setPickerKind(null);
  };

  const handleEntryClick = (userId: string) => {
    if (isGuest) {
      openAuthPrompt();
      return;
    }
    // Prefer the unique nickname for a shareable URL; ids keep working.
    const nickname = entries?.find((entry) => entry.id === userId)?.username;
    router.push(`/profile/${profileHandle(userId, nickname)}`);
  };

  return (
    <LeaderboardView
      mode={mode}
      onModeChange={setMode}
      seasonOptions={seasonOptions}
      seasonValue={seasonId ?? CURRENT_SEASON_VALUE}
      onSeasonChange={(value) => setSeasonId(value === CURRENT_SEASON_VALUE ? null : value)}
      isArchivedView={isRanked && seasonId !== null}
      seasonsPending={seasonsPending}
      scope={scope}
      view={view}
      countryChoice={countryChoice}
      clubChoice={clubChoice}
      myCountry={myCountry}
      myClub={myClub}
      onSelectKind={selectKind}
      onSelectGroup={selectGroup}
      onViewChange={setView}
      pickerKind={pickerKind}
      onOpenPicker={setPickerKind}
      onClosePicker={() => setPickerKind(null)}
      pickerStandings={toStandings(pickerStandings.data)}
      standings={toStandings(activeStandings.data)}
      standingsLoading={activeStandings.isLoading}
      entries={entries}
      isError={board.isError}
      userEntry={userEntry}
      viewerPending={viewerPending}
      boardStanding={boardStanding}
      groupStanding={groupStanding}
      currentPlayerId={currentPlayerId}
      onEntryClick={handleEntryClick}
      onSignIn={authStatus === "anonymous" ? openAuthPrompt : undefined}
      isEventMode={isEventMode}
    />
  );
}
