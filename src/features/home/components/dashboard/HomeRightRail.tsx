import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, User, ArrowRight, Trophy, Gamepad2, Zap, Timer } from 'lucide-react';
import { ALL_CHALLENGES } from '@/features/home/challenges';

interface HomeRightRailProps {
  dailyChallengesCompleted: Map<string, number>;
  onOpenFriend: () => void;
}

export function HomeRightRail({ dailyChallengesCompleted, onOpenFriend }: HomeRightRailProps) {
  const router = useRouter();

  // Pick the first incomplete challenge, or the first one if all done
  const challenge = ALL_CHALLENGES.find(c => !dailyChallengesCompleted.has(c.id)) || ALL_CHALLENGES[0];
  const isChallengeCompleted = dailyChallengesCompleted.has(challenge.id);

  // Auto-start handler
  const handleStartChallenge = () => {
    if (isChallengeCompleted) return;
    router.push(`/daily/challenges/${challenge.id}`);
  };

  // Mock last match
  const lastMatch = {
    result: 'win',
    opponent: 'Striker99',
    rp: '+15',
    mode: 'Ranked',
  };

  return (
    <div className="space-y-6 sticky top-24">
      {/* 1. Today's Quests Module */}
      <Card className="border-border/40 bg-card/40 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/30">
           <h3 className="font-bold flex items-center gap-2 text-sm">
              <Zap className="size-4 text-yellow-500 fill-yellow-500/20" />
              Today&apos;s Quests
           </h3>
           <Badge variant="secondary" className="text-[10px] font-mono h-5 px-1.5 bg-background/50 text-muted-foreground border-border/50">
              <Timer className="size-3 mr-1" />
              6h 12m
           </Badge>
        </div>
        
        <CardContent className="p-0">
           {/* Featured / Top Objective (Daily Challenge) */}
           <div 
             className={`p-4 border-b border-border/40 hover:bg-card/40 transition-colors cursor-pointer group ${isChallengeCompleted ? 'opacity-70' : ''}`}
             onClick={handleStartChallenge}
           >
              <div className="flex justify-between items-start mb-2">
                 <div className="space-y-1">
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Daily Focus</span>
                    <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{challenge.title}</h4>
                 </div>
                 <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shadow-[0_0_10px_-3px_hsl(var(--yellow-500)/0.3)]">
                    +{challenge.coinReward}
                 </Badge>
              </div>
              <div className="space-y-1.5">
                 <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                    <span>{isChallengeCompleted ? 'Completed' : 'Ready to start'}</span>
                    <span className={`font-bold ${isChallengeCompleted ? 'text-green-500' : 'text-primary'}`}>
                        {isChallengeCompleted ? '1/1' : '0/1'}
                    </span>
                 </div>
                 <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full shadow-[0_0_8px_hsl(var(--green-500)/0.5)] transition-all duration-500 ${isChallengeCompleted ? 'bg-green-500 w-full' : 'bg-primary w-[5%]'}`} 
                    />
                 </div>
              </div>
           </div>

           {/* Compact Quest Rows */}
           <div className="divide-y divide-border/30">
               {/* Spin Daily Wheel Quest */}
              <div className="flex items-center justify-between p-3 hover:bg-card/40 transition-colors cursor-pointer group" onClick={() => router.push('/daily/rewards')}>
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-full bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/20 group-hover:scale-105 transition-transform">
                        <Zap className="size-3.5" /> 
                    </div>
                    <div>
                        <div className="text-xs font-bold leading-tight group-hover:text-yellow-400 transition-colors">Spin Daily Wheel</div>
                        <div className="text-[10px] text-muted-foreground">Claim free rewards</div>
                    </div>
                  </div>
                  <div className="text-right">
                      <Button variant="outline" size="sm" className="h-6 text-[10px] font-bold px-2 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400">
                        Spin
                      </Button>
                  </div>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-card/40 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:scale-105 transition-transform">
                       <Trophy className="size-3.5" />
                    </div>
                    <div>
                       <div className="text-xs font-bold leading-tight group-hover:text-primary transition-colors">Win Streak</div>
                       <div className="text-[10px] text-muted-foreground">Win 2 ranked games</div>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-[10px] font-bold text-yellow-600">+150</div>
                    <div className="text-[10px] text-muted-foreground">0/2</div>
                 </div>
              </div>

              <div className="flex items-center justify-between p-3 hover:bg-card/40 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-full bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20 group-hover:scale-105 transition-transform">
                       <Users className="size-3.5" />
                    </div>
                    <div>
                       <div className="text-xs font-bold leading-tight group-hover:text-blue-400 transition-colors">Social Butterfly</div>
                       <div className="text-[10px] text-muted-foreground">Play with a friend</div>
                    </div>
                 </div>
                 <div className="text-right">
                     <Badge variant="outline" className="h-5 px-1.5 bg-background/50 text-muted-foreground border-border/50">
                        +50 XP
                     </Badge>
                 </div>
              </div>
           </div>

           <div className="p-2 border-t border-border/40">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => router.push('/objectives')}
              >
                 View all objectives
                 <ArrowRight className="ml-1.5 size-3" />
              </Button>
           </div>
        </CardContent>
      </Card>

      {/* 2. Quick Actions */}
      <div className="space-y-3">
         <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Quick Actions</h4>
         
         <Button 
            variant="ghost" 
            className="w-full justify-start h-12 px-4 border border-border/40 bg-card/40 hover:bg-card/60 hover:border-primary/20 transition-all group"
            onClick={onOpenFriend}
         >
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 mr-3 group-hover:bg-blue-500/20 transition-colors">
               <Users className="size-4" />
            </div>
            <div className="text-left flex-1">
               <div className="text-sm font-bold group-hover:text-primary transition-colors">Invite Friend</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
         </Button>

         <Button 
            variant="ghost" 
            className="w-full justify-start h-12 px-4 border border-border/40 bg-card/40 hover:bg-card/60 hover:border-primary/20 transition-all group"
            onClick={() => router.push('/career')}
         >
             <div className="p-2 rounded-md bg-orange-500/10 text-orange-500 mr-3 group-hover:bg-orange-500/20 transition-colors">
               <User className="size-4" />
            </div>
            <div className="text-left flex-1">
               <div className="text-sm font-bold group-hover:text-primary transition-colors">Continue Career</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
         </Button>
      </div>

      {/* 3. Last Match Snapshot */}
      <div className="space-y-3">
         <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Last Match</h4>
         <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/20">
            <div className="flex items-center gap-3">
               <div className="p-1.5 rounded bg-green-500/10 text-green-500">
                  <Gamepad2 className="size-4" />
               </div>
               <div>
                  <div className="text-xs font-bold">vs {lastMatch.opponent}</div>
                  <div className="text-[10px] text-muted-foreground">{lastMatch.mode}</div>
               </div>
            </div>
            <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/5 text-xs font-bold">
               {lastMatch.rp} RP
            </Badge>
         </div>
      </div>
    </div>
  );
}
