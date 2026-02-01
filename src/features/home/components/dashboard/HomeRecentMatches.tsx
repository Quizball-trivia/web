import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, XCircle, ArrowRight, Trophy, Zap } from 'lucide-react';

export function HomeRecentMatches() {
  const router = useRouter();

  // Mock data - replace with real history when available
  const matches = [
    { id: 1, result: 'win', opponent: 'Striker99', mode: 'Ranked', rp: '+15', time: '2h ago' },
    { id: 2, result: 'loss', opponent: 'GoalKeeper', mode: 'Buzzer', rp: '-8', time: '5h ago' },
    { id: 3, result: 'win', opponent: 'Captain10', mode: 'League', rp: '+12', time: '1d ago' },
  ];

  return (
    <Card className="h-full border-border/40 bg-card/40 backdrop-blur-sm relative overflow-hidden">
      <div className="p-6 h-full flex flex-col justify-between relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
               <Clock className="size-4" />
            </div>
            Recent Matches
          </h3>
          <Button variant="ghost" size="sm" className="h-8 shrink-0 text-muted-foreground hover:text-foreground font-semibold -mr-2" onClick={() => router.push('/profile')}>
            View All
            <ArrowRight className="ml-1 size-3.5" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-3 mt-4">
          {matches.map((match) => (
              <div key={match.id} className="flex items-center justify-between p-3.5 rounded-xl bg-background/40 border border-border/40 hover:bg-background/60 hover:border-border/60 transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3.5">
                    {match.result === 'win' ? (
                      <div className="p-1.5 rounded-full bg-green-500/10 text-green-500 ring-1 ring-green-500/20">
                         <CheckCircle2 className="size-4 shrink-0" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-full bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
                         <XCircle className="size-4 shrink-0" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-sm truncate max-w-[140px] leading-tight">
                         vs {match.opponent}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                         {match.mode === 'Ranked' ? <Trophy className="size-3" /> : <Zap className="size-3" />}
                         {match.mode} · {match.time}
                      </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className={`text-base font-black tracking-tight ${match.result === 'win' ? 'text-green-500' : 'text-red-500'}`}>
                      {match.rp}
                    </span>
                </div>
              </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
