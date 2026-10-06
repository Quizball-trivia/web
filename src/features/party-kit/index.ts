/**
 * The party-game UI kit (2–6 players): the standings model, the desktop sidebar, the phone "me vs leader" pill, the
 * score flights and the results screen. Party Quiz and Stat Sniper rooms are built on it; a new party game maps its own
 * state to `PartyStandingViewModel` and reuses the rest. See docs/PARTY-GAME-UI-BLUEPRINT.md.
 */
export type { PartyStandingViewModel, ScoreFlight } from "@/features/party/realtime/partyQuizScreen.types";
export { getRankStyle, isUsableScoreAnchor, PARTY_SUCCESS_FLIGHT_MS, PARTY_FAILED_FLIGHT_MS, type RankPalette } from "@/features/party/realtime/partyQuizScreen.helpers";
export { PartyQuizStandingsSidebar as PartyStandingsSidebar } from "@/features/party/realtime/PartyQuizStandingsSidebar";
export { PartyQuizScoreFlights as PartyScoreFlights } from "@/features/party/realtime/PartyQuizScoreFlights";
export { PartyQuizResultsScreen as PartyResultsScreen } from "@/features/party/PartyQuizResultsScreen";
export { PartyStandingsPill } from "./PartyStandingsPill";
