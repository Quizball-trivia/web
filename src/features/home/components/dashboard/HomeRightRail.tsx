import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, User, ArrowRight, Trophy, Gamepad2, Zap, Timer } from 'lucide-react';
import { useDailyChallenges } from '@/lib/queries/dailyChallenges.queries';
import { useObjectives } from '@/lib/queries/objectives.queries';
import { useLocale } from '@/contexts/LocaleContext';

interface HomeRightRailProps {
  onOpenFriend: () => void;
}

export function HomeRightRail({ onOpenFriend }: HomeRightRailProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { data: dailyChallenges = [] } = useDailyChallenges();
  const { data: objectivesData } = useObjectives();

  const challenge = dailyChallenges.find((item) => item.showOnHome && item.availableToday)
    ?? dailyChallenges.find((item) => item.availableToday)
    ?? dailyChallenges[0];
  const isActionable = challenge?.availableToday === true && !challenge.completedToday;
  const railObjectives = useMemo(() => {
    return [...(objectivesData?.daily.objectives ?? [])]
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const aPct = a.target > 0 ? a.progress / a.target : 0;
        const bPct = b.target > 0 ? b.progress / b.target : 0;
        return bPct - aPct;
      })
      .slice(0, 2);
  }, [objectivesData]);

  // Auto-start handler
  const handleStartChallenge = () => {
    if (!challenge || !isActionable) return;
    router.push(`/daily/challenges/${challenge.challengeType}`);
  };

  // Mock last match
  const lastMatch = {
    result: 'win',
    opponent: 'Striker99',
    rp: '+15',
    mode: 'Ranked',
  };

  return (
    <div className="sticky top-24 max-h-[calc(100dvh-7rem)] space-y-6 overflow-y-auto overscroll-contain pr-1">
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
             className={`p-4 border-b border-border/40 transition-colors ${isActionable ? 'hover:bg-card/40 cursor-pointer group' : 'opacity-70'}`}
             onClick={isActionable ? handleStartChallenge : undefined}
           >
              <div className="flex justify-between items-start mb-2">
                 <div className="space-y-1">
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">{t("home.dailyFocus")}</span>
                    <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{challenge?.title ?? "Daily challenge"}</h4>
                 </div>
                 <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 shadow-[0_0_10px_-3px_hsl(var(--yellow-500)/0.3)]">
                    +{challenge?.coinReward ?? 0}
                 </Badge>
              </div>
              <div className="space-y-1.5">
                 <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                    <span>{challenge?.completedToday ? 'Completed' : 'Ready to start'}</span>
                    <span className={`font-bold ${challenge?.completedToday ? 'text-green-500' : 'text-primary'}`}>
                        {challenge?.completedToday ? '1/1' : '0/1'}
                    </span>
                 </div>
                 <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full shadow-[0_0_8px_hsl(var(--green-500)/0.5)] transition-all duration-500 ${challenge?.completedToday ? 'bg-green-500 w-full' : 'bg-primary w-[5%]'}`} 
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
                        <div className="text-xs font-bold leading-tight group-hover:text-yellow-400 transition-colors">{t("home.spinDailyWheel")}</div>
                        <div className="text-[10px] text-muted-foreground">{t("home.claimFreeRewards")}</div>
                    </div>
                  </div>
                  <div className="text-right">
                      <Button variant="outline" size="sm" className="h-6 text-[10px] font-bold px-2 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400">
                        Spin
                      </Button>
                  </div>
              </div>

              {railObjectives.map((objective) => {
                const progressPercent = objective.target > 0
                  ? Math.min(100, Math.round((objective.progress / objective.target) * 100))
                  : 0;

                return (
                  <button
                    type="button"
                    key={objective.id}
                    className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-card/40 cursor-pointer group"
                    onClick={() => router.push('/objectives')}
                    aria-label={`Open objective: ${objective.title}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="p-1.5 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:scale-105 transition-transform">
                        <Trophy className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold leading-tight transition-colors group-hover:text-primary">{objective.title}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{objective.description}</div>
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <div className="text-[10px] font-bold text-yellow-600">+{objective.rewardCoins}</div>
                      <div className="text-[10px] text-muted-foreground">{objective.progress}/{objective.target}</div>
                      <div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-secondary/60">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
           </div>

           <div className="p-2 border-t border-border/40">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => router.push('/objectives')}
              >
                 {t("homeDashboard.viewAllObjectives")}
                 <ArrowRight className="ml-1.5 size-3" />
              </Button>
           </div>
        </CardContent>
      </Card>

      {/* 2. Quick Actions */}
      <div className="space-y-3">
         <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{t("home.quickActions")}</h4>
         
         <Button 
            variant="ghost" 
            className="w-full justify-start h-12 px-4 border border-border/40 bg-card/40 hover:bg-card/60 hover:border-primary/20 transition-all group"
            onClick={onOpenFriend}
         >
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-500 mr-3 group-hover:bg-blue-500/20 transition-colors">
               <Users className="size-4" />
            </div>
            <div className="text-left flex-1">
               <div className="text-sm font-bold group-hover:text-primary transition-colors">{t("home.inviteFriend")}</div>
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
               <div className="text-sm font-bold group-hover:text-primary transition-colors">{t("home.continueCareer")}</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
         </Button>
      </div>

      {/* 3. Last Match Snapshot */}
      <div className="space-y-3">
         <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">{t("home.lastMatch")}</h4>
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
