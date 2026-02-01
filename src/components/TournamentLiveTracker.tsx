import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { X, RefreshCw } from 'lucide-react';
import { LiveTournamentBracket, TournamentMatch } from './LiveTournamentBracket';

interface TournamentLiveTrackerProps {
  onClose: () => void;
}

// Mock function to generate tournament data
const generateTournamentData = () => {
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
};

export function TournamentLiveTracker({ onClose }: TournamentLiveTrackerProps) {
  const [matches] = useState<TournamentMatch[]>(generateTournamentData());
  const [currentRound] = useState(1);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // In a real app, this would fetch live data from the server
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLastUpdate(new Date());
    // In a real app, this would fetch fresh data
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl">Live Tournament</h1>
            <div className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="size-9"
            >
              <RefreshCw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-9"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <LiveTournamentBracket
          matches={matches}
          currentRound={currentRound}
          totalRounds={3}
        />
      </div>

      {/* Legend */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-4">
        <div className="text-xs text-muted-foreground mb-2">Status Legend:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary" />
            <span>Playing Now</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500" />
            <span>Won</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-muted" />
            <span>Waiting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-destructive" />
            <span>Eliminated</span>
          </div>
        </div>
      </div>
    </div>
  );
}
