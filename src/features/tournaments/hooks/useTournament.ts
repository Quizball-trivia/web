import { useState } from 'react';
import type { Tournament } from '../TournamentsScreen';
import type { Screen } from '@/types/screens';

interface TournamentOpponent {
  username: string;
  avatar: string;
}

interface UseTournamentDeps {
  navigateToScreen: (screen: Screen) => void;
}

export type UseTournamentReturn = ReturnType<typeof useTournament>;

export function useTournament(deps: UseTournamentDeps) {
  const { navigateToScreen } = deps;

  // Tournament state
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [tournamentOpponent, setTournamentOpponent] = useState<TournamentOpponent | null>(null);
  const [tournamentRound, setTournamentRound] = useState<string>("Round of 32");
  const [tournamentPlayerScore, setTournamentPlayerScore] = useState<number>(0);
  const [tournamentOpponentScore, setTournamentOpponentScore] = useState<number>(0);

  // Handlers

  const handleEnterTournament = (tournament: Tournament) => {
    setCurrentTournament(tournament);
    setTournamentRound("Round of 32");
    setTournamentOpponent({
      username: "TriviaKing",
      avatar: "⚽",
    });
    navigateToScreen("tournamentWaiting");
  };

  const handleTournamentGameEnd = (_won: boolean, score: number, opponentScore: number) => {
    setTournamentPlayerScore(score);
    setTournamentOpponentScore(opponentScore);
    navigateToScreen("tournamentResults");
  };

  const handleAdvanceRound = () => {
    // Handle tournament completion after Finals
    if (tournamentRound === "Finals") {
      setTournamentRound("Champion");
      // Tournament complete - stay on results screen, don't generate new opponent
      return;
    }

    // Advance to next round
    if (tournamentRound === "Round of 32") {
      setTournamentRound("Round of 16");
    } else if (tournamentRound === "Round of 16") {
      setTournamentRound("Quarter Finals");
    } else if (tournamentRound === "Quarter Finals") {
      setTournamentRound("Semi Finals");
    } else if (tournamentRound === "Semi Finals") {
      setTournamentRound("Finals");
    }

    // Generate new opponent
    const opponents = ["ChampAce", "ProPlayer", "MVPro", "EliteGamer", "AllStar"];
    const avatars = ["🏆", "⭐", "👑", "💎", "🔥"];
    setTournamentOpponent({
      username: opponents[Math.floor(Math.random() * opponents.length)],
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
    });
    navigateToScreen("tournamentWaiting");
  };

  const handleExitTournament = () => {
    setCurrentTournament(null);
    setTournamentOpponent(null);
    setTournamentRound("Round of 32");
    navigateToScreen("tournaments");
  };

  const resetTournament = () => {
    setCurrentTournament(null);
    setTournamentOpponent(null);
    setTournamentRound("Round of 32");
    setTournamentPlayerScore(0);
    setTournamentOpponentScore(0);
  };

  return {
    // State
    currentTournament,
    tournamentOpponent,
    tournamentRound,
    tournamentPlayerScore,
    tournamentOpponentScore,

    // Handlers
    handleEnterTournament,
    handleTournamentGameEnd,
    handleAdvanceRound,
    handleExitTournament,
    resetTournament,
  };
}
