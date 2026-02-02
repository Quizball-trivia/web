import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

interface RealtimeResultsScreenProps {
  playerUsername: string;
  playerAvatar: string;
  opponentUsername: string;
  opponentAvatar: string;
  playerScore: number;
  opponentScore: number;
  playerCorrect: number;
  opponentCorrect: number;
  totalQuestions: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function RealtimeResultsScreen({
  playerUsername,
  playerAvatar,
  opponentUsername,
  opponentAvatar,
  playerScore,
  opponentScore,
  playerCorrect,
  opponentCorrect,
  totalQuestions,
  onPlayAgain,
  onMainMenu,
}: RealtimeResultsScreenProps) {
  const playerWon = playerScore > opponentScore;
  const isDraw = playerScore === opponentScore;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <Card className={`border-2 ${playerWon ? 'border-green-500/40' : isDraw ? 'border-yellow-500/40' : 'border-red-500/40'}`}>
          <CardContent className="pt-6 pb-6 text-center">
            <div className="text-5xl mb-3">{isDraw ? '🤝' : playerWon ? '🏆' : '😔'}</div>
            <h2 className="mb-1">{isDraw ? "It's a Draw" : playerWon ? 'Victory!' : 'Defeat'}</h2>
            <p className="text-sm text-muted-foreground">Final Score</p>

            <div className="mt-5 space-y-3">
              <div className={`bg-secondary rounded-lg p-3 ${playerWon ? 'ring-2 ring-green-500/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{playerAvatar}</span>
                    <div className="text-left">
                      <div className="text-sm flex items-center gap-2">
                        {playerUsername}
                        {playerWon && <Trophy className="size-4 text-yellow-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {playerCorrect} / {totalQuestions} correct
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{playerScore}</div>
                </div>
              </div>

              <div className={`bg-secondary rounded-lg p-3 ${!playerWon && !isDraw ? 'ring-2 ring-red-500/40' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{opponentAvatar}</span>
                    <div className="text-left">
                      <div className="text-sm flex items-center gap-2">
                        {opponentUsername}
                        {!playerWon && !isDraw && <Trophy className="size-4 text-yellow-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {opponentCorrect} / {totalQuestions} correct
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{opponentScore}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onMainMenu}>
            Main Menu
          </Button>
          <Button onClick={onPlayAgain}>Play Again</Button>
        </div>
      </div>
    </div>
  );
}
