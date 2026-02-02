import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, ArrowRight } from 'lucide-react';
import { ALL_CHALLENGES } from '@/features/home/challenges';
import type { DailyChallengeId } from '@/features/home/challenges';

interface HomeFeaturedChallengeProps {
    dailyChallengesCompleted: Map<string, number>;
    onSelectChallenge: (id: DailyChallengeId) => void;
}

export function HomeFeaturedChallenge({ dailyChallengesCompleted, onSelectChallenge }: HomeFeaturedChallengeProps) {
  // Pick the first incomplete challenge, or the first one if all done (to show completion state)
  const challenge = ALL_CHALLENGES.find(c => !dailyChallengesCompleted.has(c.id)) || ALL_CHALLENGES[0];
  const isCompleted = dailyChallengesCompleted.has(challenge.id);

  return (
    <div className="space-y-4">
      {/* Visual Header removed or integrated into card for compactness if desired, but user requested 'Update Money Drop card' */}
      
      <Card 
         className={`border-border/60 bg-gradient-to-br from-card to-yellow-500/5 hover:border-yellow-500/30 transition-all duration-300 cursor-pointer group relative overflow-hidden ${isCompleted ? 'opacity-70' : ''}`} 
         onClick={() => onSelectChallenge(challenge.id)}
      >
         {/* Background decorative elements */}
         <div className="absolute -right-6 -top-6 bg-yellow-500/10 w-24 h-24 rounded-full blur-xl group-hover:bg-yellow-500/20 transition-colors" />

         <CardContent className="p-5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'} ring-1 ring-white/10 shadow-sm`}>
                  <Coins className="size-6" />
               </div>
               <div>
                  <div className="flex items-center gap-2 mb-0.5">
                     <h4 className="font-bold text-lg leading-none">Money Drop</h4>
                     {isCompleted && <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-500/20 text-green-500">Done</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Daily Prize Pool</p>
               </div>
            </div>

            <div className="flex flex-col items-end gap-2">
               <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-bold shadow-[0_0_10px_-3px_hsl(var(--yellow-500)/0.3)]">
                  +{challenge.coinReward} Coins
               </Badge>
               
               <Button 
                  size="sm" 
                  variant="outline" 
                  className={`h-8 text-xs font-bold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-500/50 transition-all ${isCompleted ? 'opacity-0 pointer-events-none' : ''}`}
                  disabled={isCompleted}
               >
                  Start Run
                  <ArrowRight className="ml-1.5 size-3" />
               </Button>
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
