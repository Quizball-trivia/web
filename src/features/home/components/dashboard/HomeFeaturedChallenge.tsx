import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { ALL_CHALLENGES } from '@/features/home/challenges';
import type { DailyChallengeId } from '@/features/home/challenges';

interface HomeFeaturedChallengeProps {
    dailyChallengesCompleted: Map<string, number>;
    onSelectChallenge: (id: DailyChallengeId) => void;
}

export function HomeFeaturedChallenge({ dailyChallengesCompleted, onSelectChallenge }: HomeFeaturedChallengeProps) {
  const router = useRouter();

  // Pick the first incomplete challenge, or the first one if all done (to show completion state)
  const challenge = ALL_CHALLENGES.find(c => !dailyChallengesCompleted.has(c.id)) || ALL_CHALLENGES[0];
  const isCompleted = dailyChallengesCompleted.has(challenge.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="size-4 text-yellow-500" />
            Daily Challenge
         </h3>
      </div>

      <Card className={`border-border/60 hover:border-primary/30 transition-colors cursor-pointer ${isCompleted ? 'opacity-70' : ''}`} onClick={() => onSelectChallenge(challenge.id)}>
         <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-lg ${isCompleted ? 'bg-green-500/10 text-green-500' : 'bg-primary/10 text-primary'}`}>
                  <Zap className="size-6" />
               </div>
               <div>
                  <h4 className="font-bold">{challenge.title}</h4>
                  <p className="text-xs text-muted-foreground">{challenge.description}</p>
                  <p className="text-xs font-semibold text-yellow-500 mt-1">Reward: {challenge.coinReward} Coins</p>
               </div>
            </div>

            <Button size="sm" variant={isCompleted ? "outline" : "default"} disabled={isCompleted}>
               {isCompleted ? 'Completed' : 'Start'}
            </Button>
         </CardContent>
      </Card>
      
      <div className="text-center">
         <Button variant="link" size="sm" className="text-xs text-muted-foreground" onClick={() => router.push('/daily/challenges')}>
            View all challenges
         </Button>
      </div>
    </div>
  );
}
