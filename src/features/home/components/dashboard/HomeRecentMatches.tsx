import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export function HomeRecentMatches() {
  const router = useRouter();

  // Mock data - replace with real history when available
  const matches = [
    { id: 1, result: 'win', opponent: 'Striker99', mode: 'Ranked', rp: '+15', time: '2h ago' },
    { id: 2, result: 'loss', opponent: 'GoalKeeper', mode: 'Buzzer', rp: '-8', time: '5h ago' },
    { id: 3, result: 'win', opponent: 'Captain10', mode: 'League', rp: '+12', time: '1d ago' },
  ];

  return (
    <Card className="h-full border-border/60 bg-transparent shadow-none">
      <div className="space-y-4 p-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            Recent Matches
          </h3>
          <Button variant="link" className="h-auto p-0 text-muted-foreground hover:text-foreground" onClick={() => router.push('/profile')}>
            View All
          </Button>
        </div>

        <div className="space-y-2">
          {matches.map((match) => (
              <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors cursor-default">
                <div className="flex items-center gap-3">
                    {match.result === 'win' ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : (
                      <XCircle className="size-5 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium text-sm">vs {match.opponent}</div>
                      <div className="text-xs text-muted-foreground">{match.mode} · {match.time}</div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${match.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                      {match.rp}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground/50" />
                </div>
              </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
