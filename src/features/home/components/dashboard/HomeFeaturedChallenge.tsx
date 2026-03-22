import type { KeyboardEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, ArrowRight } from 'lucide-react';
import { useDailyChallenges } from '@/lib/queries/dailyChallenges.queries';
import type { DailyChallengeType } from '@/lib/domain/dailyChallenge';

interface HomeFeaturedChallengeProps {
    onSelectChallenge: (id: DailyChallengeType) => void;
}

export function HomeFeaturedChallenge({ onSelectChallenge }: HomeFeaturedChallengeProps) {
  const { data: dailyChallenges = [] } = useDailyChallenges();
  const challenge = dailyChallenges.find((item) => item.showOnHome && item.availableToday)
    ?? dailyChallenges.find((item) => item.showOnHome)
    ?? dailyChallenges[0];

  if (!challenge) return null;

  const isAvailable = challenge.availableToday;
  const isCompleted = challenge.completedToday;
  const handleStartChallenge = () => {
    if (!isAvailable) return;

    onSelectChallenge(challenge.challengeType);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isAvailable) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleStartChallenge();
    }
  };

  return (
    <div className="space-y-4">
      {/* Visual Header removed or integrated into card for compactness if desired, but user requested 'Update Money Drop card' */}
      
      <Card 
         className={`border-border/60 bg-gradient-to-br from-card to-yellow-500/5 transition-all duration-300 group relative overflow-hidden ${
           isAvailable ? 'cursor-pointer hover:border-yellow-500/30' : 'cursor-not-allowed opacity-60'
         } ${isCompleted && isAvailable ? 'opacity-70' : ''}`} 
         role={isAvailable ? 'button' : undefined}
         aria-disabled={!isAvailable}
         tabIndex={isAvailable ? 0 : -1}
         onClick={isAvailable ? handleStartChallenge : undefined}
         onKeyDown={isAvailable ? handleCardKeyDown : undefined}
      >
         {/* Background decorative elements */}
         <div className="absolute -right-6 -top-6 bg-yellow-500/10 w-24 h-24 rounded-full blur-xl group-hover:bg-yellow-500/20 transition-colors" />

         <CardContent className="p-5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-500/10 text-green-500' : isAvailable ? 'bg-yellow-500/10 text-yellow-500' : 'bg-slate-500/10 text-slate-400'} ring-1 ring-white/10 shadow-sm`}>
                  <Coins className="size-6" />
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-0.5">
                     <h4 className="font-bold text-lg leading-none">{challenge.title}</h4>
                     {isCompleted && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-500/20 text-green-500">Done</Badge>}
                     {!isAvailable && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-slate-500/20 text-slate-400">Unavailable</Badge>}
                  </div>
                  <p className={`text-xs font-medium ${isAvailable ? 'text-muted-foreground' : 'text-slate-400'}`}>
                    {isAvailable ? 'Daily Prize Pool' : 'Not available today'}
                  </p>
               </div>
            </div>

            <div className="flex flex-col items-end gap-2">
               <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-bold shadow-[0_0_10px_-3px_hsl(var(--yellow-500)/0.3)]">
                  +{challenge.coinReward} Coins
               </Badge>
               
               {isAvailable ? (
                 <Button 
                    size="sm" 
                    variant="outline" 
                    className={`h-8 text-xs font-bold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/50 transition-all ${isCompleted ? 'opacity-0 pointer-events-none' : ''}`}
                    disabled={isCompleted}
                 >
                    Start Run
                    <ArrowRight className="ml-1.5 size-3" />
                 </Button>
               ) : (
                 <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-bold border-slate-500/30 text-slate-400 bg-slate-500/5"
                    disabled
                 >
                    Not available today
                 </Button>
               )}
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
