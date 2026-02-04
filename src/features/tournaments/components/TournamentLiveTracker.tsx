import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, RefreshCw } from 'lucide-react';
import { LiveTournamentBracket, type TournamentMatch } from './LiveTournamentBracket';
import { generateTournamentData } from '../__mocks__/tournamentData';

interface TournamentLiveTrackerProps {
  onClose: () => void;
}

export function TournamentLiveTracker({ onClose }: TournamentLiveTrackerProps) {
  const [matches, setMatches] = useState<TournamentMatch[]>(generateTournamentData);
  const [currentRound] = useState(1);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMatches(generateTournamentData());
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setMatches(generateTournamentData());
    setLastUpdate(new Date());
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
