interface MatchResult {
  id: string;
  opponent: string;
  gameMode: string;
  timeAgo: string;
  isWin: boolean;
  playerScore: number;
  opponentScore: number;
  rpChange: number;
}

interface GameHistorySectionProps {
  onViewAll?: () => void;
}

// Mock data - in production this would come from props/API
const RECENT_MATCHES: MatchResult[] = [
  {
    id: '1',
    opponent: 'TriviaKing',
    gameMode: 'QuizBall',
    timeAgo: '2 hours ago',
    isWin: true,
    playerScore: 5,
    opponentScore: 3,
    rpChange: 25,
  },
  {
    id: '2',
    opponent: 'ProPlayer',
    gameMode: 'Buzzer Battle',
    timeAgo: '5 hours ago',
    isWin: false,
    playerScore: 2,
    opponentScore: 4,
    rpChange: -15,
  },
  {
    id: '3',
    opponent: 'FootballFan',
    gameMode: 'QuizBall',
    timeAgo: 'Yesterday',
    isWin: true,
    playerScore: 6,
    opponentScore: 2,
    rpChange: 30,
  },
  {
    id: '4',
    opponent: 'SoccerStar',
    gameMode: 'QuizBall',
    timeAgo: 'Yesterday',
    isWin: true,
    playerScore: 4,
    opponentScore: 1,
    rpChange: 20,
  },
];

function MatchResultCard({ match }: { match: MatchResult }) {
  const resultLetter = match.isWin ? 'W' : 'L';
  const rpPrefix = match.rpChange > 0 ? '+' : '';

  return (
    <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`size-10 rounded-full flex items-center justify-center ${
            match.isWin
              ? 'bg-green-500/20 border-2 border-green-500/50'
              : 'bg-red-500/20 border-2 border-red-500/50'
          }`}
        >
          <span className={`text-lg font-bold ${match.isWin ? 'text-green-500' : 'text-red-500'}`}>
            {resultLetter}
          </span>
        </div>
        <div>
          <div className="text-sm font-medium">vs. {match.opponent}</div>
          <div className="text-xs text-muted-foreground">
            {match.gameMode} • {match.timeAgo}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${match.isWin ? 'text-green-500' : 'text-red-500'}`}>
          {match.playerScore} - {match.opponentScore}
        </div>
        <div className="text-xs text-muted-foreground">
          {rpPrefix}{match.rpChange} RP
        </div>
      </div>
    </div>
  );
}

export function GameHistorySection({ onViewAll }: GameHistorySectionProps) {
  return (
    <div className="px-4 mt-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Recent Matches</h2>
        <button
          onClick={onViewAll}
          className="text-sm text-primary hover:underline"
        >
          View All
        </button>
      </div>

      <div className="space-y-2">
        {RECENT_MATCHES.map((match) => (
          <MatchResultCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}
