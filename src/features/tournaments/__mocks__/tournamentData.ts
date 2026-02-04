import type { TournamentMatch } from '../components/LiveTournamentBracket';

/**
 * Generates mock tournament bracket data for development/testing.
 * In production, this would be replaced with real API data.
 */
export function generateTournamentData(): TournamentMatch[] {
  // Round 1 - Quarter Finals (4 matches)
  const round1Matches: TournamentMatch[] = [
    {
      id: 'qf1',
      round: 1,
      status: 'completed',
      player1: {
        id: 'p1',
        username: 'You',
        avatar: '🎯',
        status: 'won',
        isCurrentUser: true,
      },
      player2: {
        id: 'p2',
        username: 'FootballKing',
        avatar: '⚽',
        status: 'eliminated',
        isCurrentUser: false,
      },
      winner: 'p1',
    },
    {
      id: 'qf2',
      round: 1,
      status: 'completed',
      player1: {
        id: 'p3',
        username: 'TriviaMaster',
        avatar: '🏆',
        status: 'won',
        isCurrentUser: false,
      },
      player2: {
        id: 'p4',
        username: 'GoalScorer',
        avatar: '👑',
        status: 'eliminated',
        isCurrentUser: false,
      },
      winner: 'p3',
    },
    {
      id: 'qf3',
      round: 1,
      status: 'live',
      player1: {
        id: 'p5',
        username: 'TacticsGuru',
        avatar: '⭐',
        status: 'playing',
        isCurrentUser: false,
      },
      player2: {
        id: 'p6',
        username: 'LegendHunter',
        avatar: '💎',
        status: 'playing',
        isCurrentUser: false,
      },
    },
    {
      id: 'qf4',
      round: 1,
      status: 'upcoming',
      player1: {
        id: 'p7',
        username: 'ChampionAce',
        avatar: '🔥',
        status: 'waiting',
        isCurrentUser: false,
      },
      player2: {
        id: 'p8',
        username: 'SkillMaster',
        avatar: '⚡',
        status: 'waiting',
        isCurrentUser: false,
      },
    },
  ];

  // Round 2 - Semi Finals (2 matches)
  const round2Matches: TournamentMatch[] = [
    {
      id: 'sf1',
      round: 2,
      status: 'upcoming',
      player1: {
        id: 'p1',
        username: 'You',
        avatar: '🎯',
        status: 'waiting',
        isCurrentUser: true,
      },
      player2: {
        id: 'p3',
        username: 'TriviaMaster',
        avatar: '🏆',
        status: 'waiting',
        isCurrentUser: false,
      },
    },
    {
      id: 'sf2',
      round: 2,
      status: 'upcoming',
      player1: {
        id: 'p5',
        username: 'TBD',
        avatar: '❓',
        status: 'waiting',
        isCurrentUser: false,
      },
      player2: {
        id: 'p7',
        username: 'TBD',
        avatar: '❓',
        status: 'waiting',
        isCurrentUser: false,
      },
    },
  ];

  // Round 3 - Final (1 match)
  const round3Matches: TournamentMatch[] = [
    {
      id: 'final',
      round: 3,
      status: 'upcoming',
      player1: {
        id: 'p1',
        username: 'TBD',
        avatar: '❓',
        status: 'waiting',
        isCurrentUser: false,
      },
      player2: {
        id: 'p2',
        username: 'TBD',
        avatar: '❓',
        status: 'waiting',
        isCurrentUser: false,
      },
    },
  ];

  return [...round1Matches, ...round2Matches, ...round3Matches];
}
