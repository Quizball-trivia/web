import { useEffect } from 'react';
import type { Screen } from '@/types/screens';
import { TournamentsScreen } from '@/components/TournamentsScreen';
import { TournamentWaitingRoom } from '@/components/TournamentWaitingRoom';
import { TournamentGameScreen } from '@/components/TournamentGameScreen';
import { TournamentResultsScreen } from '@/components/TournamentResultsScreen';
import { useRouter } from 'next/navigation';
import type { useTournament } from './useTournament';

interface TournamentScreensProps {
  currentScreen: Screen;
  tournament: ReturnType<typeof useTournament>;
  playerStats: {
    coins: number;
    rankPoints: number;
    rankedTier: string;
    avatar: string;
  };
}

/**
 * Renders tournament-related screens. Returns null if currentScreen
 * is not a tournament screen, allowing the caller to fall through.
 */
export function TournamentScreens({
  currentScreen,
  tournament,
  playerStats,
}: TournamentScreensProps) {
  const router = useRouter();

  // Redirect to tournaments list when prerequisites are missing
  useEffect(() => {
    if (currentScreen === "tournamentWaiting" && !tournament.currentTournament) {
      router.replace("/events");
    }
    if (currentScreen === "tournamentGame" && (!tournament.currentTournament || !tournament.tournamentOpponent)) {
      router.replace("/events");
    }
    if (currentScreen === "tournamentResults" && (!tournament.currentTournament || !tournament.tournamentOpponent)) {
      router.replace("/events");
    }
  }, [currentScreen, tournament.currentTournament, tournament.tournamentOpponent, router]);

  switch (currentScreen) {
    case "tournaments":
      return (
        <TournamentsScreen
          playerCoins={playerStats.coins}
          playerRankPoints={playerStats.rankPoints || 1000}
          playerTier={playerStats.rankedTier || 'Bronze'}
          onEnterTournament={tournament.handleEnterTournament}
        />
      );

    case "tournamentWaiting":
      if (!tournament.currentTournament) {
        return null;
      }
      return (
        <TournamentWaitingRoom
          tournamentName={tournament.currentTournament.name}
          tournamentType={tournament.currentTournament.type}
          prizePool={tournament.currentTournament.prizePool}
          onStartMatch={() => router.push("/game")}
          onBack={() => router.push("/events")}
        />
      );

    case "tournamentGame":
      if (!tournament.currentTournament || !tournament.tournamentOpponent) {
        return null;
      }
      return (
        <TournamentGameScreen
          opponentName={tournament.tournamentOpponent.username}
          opponentAvatar={tournament.tournamentOpponent.avatar}
          currentPlayerAvatar={playerStats.avatar}
          onGameEnd={(won: boolean, score: number, opponentScore: number) => {
            tournament.handleTournamentGameEnd(won, score, opponentScore);
          }}
        />
      );

    case "tournamentResults":
      if (!tournament.currentTournament || !tournament.tournamentOpponent) {
        return null;
      }
      return (
        <TournamentResultsScreen
          won={tournament.tournamentPlayerScore > tournament.tournamentOpponentScore}
          playerScore={tournament.tournamentPlayerScore}
          opponentScore={tournament.tournamentOpponentScore}
          opponentName={tournament.tournamentOpponent.username}
          opponentAvatar={tournament.tournamentOpponent.avatar}
          currentPlayerAvatar={playerStats.avatar}
          tournamentName={tournament.currentTournament.name}
          round={tournament.tournamentRound}
          onContinue={tournament.handleAdvanceRound}
          onExit={tournament.handleExitTournament}
        />
      );

    default:
      return null;
  }
}
