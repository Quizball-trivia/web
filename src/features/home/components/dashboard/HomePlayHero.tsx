import { Trophy, Users, User, Gamepad2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getRankInfo, getDivisionColor } from '@/utils/rankSystem';
import type { PlayerStats } from '@/types/game';

interface HomePlayHeroProps {
  playerStats: PlayerStats;
  onStartRanked: () => void;
  onOpenFriend: () => void;
}

export function HomePlayHero({ playerStats, onStartRanked, onOpenFriend }: HomePlayHeroProps) {
  const rankInfo = getRankInfo(playerStats.rankPoints || 0);
  const divisionColors = getDivisionColor(rankInfo.division);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold">
          Good to see you, {playerStats.username} <span className="animate-wave inline-block origin-[70%_70%]">👋</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Primary Ranked Card */}
        {/* Full width on LG (12 cols) since secondary cards move to Rail. 7/5 split on MD. */}
        <Card
          className="md:col-span-8 lg:col-span-12 relative overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-colors duration-500 group cursor-pointer bg-gradient-to-br from-card to-card/50 shadow-[0_0_25px_-5px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_35px_-5px_hsl(var(--primary)/0.5)]"
          onClick={onStartRanked}
        >
           {/* Static ambient glow */}
           <div className="absolute inset-0 border-2 border-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

           {/* Background decorative elements */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-primary/10 transition-colors duration-500" />
           
           <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
              <div className="flex justify-between items-start">
                 <div className="space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="p-3.5 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform duration-500 group-hover:scale-105">
                          <Trophy className="size-9" />
                       </div>
                       <div>
                          <h2 className="text-3xl font-black tracking-tight group-hover:text-primary transition-colors duration-300">Play Ranked</h2>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-end">
                    <Badge variant="outline" className={`${divisionColors.text} ${divisionColors.border} bg-background/50 backdrop-blur px-4 py-1.5 text-sm font-bold shadow-sm`}>
                       {rankInfo.division}
                    </Badge>
                 </div>
              </div>

              <div className="mt-8 space-y-4">
                 <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-4xl font-black tracking-tighter text-foreground">{playerStats.rankPoints ?? 0}<span className="text-lg font-bold text-muted-foreground ml-1">RP</span></span>
                    </div>
                    <span className="text-sm font-bold text-primary mb-1">{(rankInfo.maxRP || 1000) - ((playerStats.rankPoints ?? 0) % 100)} RP to next division</span>
                 </div>
                 <Progress value={rankInfo.progress} className="h-3 bg-secondary/50 border border-primary/10 [&>div]:bg-primary [&>div]:shadow-[0_0_10px_hsl(var(--primary))]" />
              </div>

              <div className="mt-10">
                 <Button size="lg" className="w-full md:w-auto text-lg px-10 py-7 shadow-[0_0_25px_-5px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.7)] transition-all duration-300 font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Gamepad2 className="mr-2.5 size-6" />
                    Play Ranked Match
                 </Button>
              </div>
           </CardContent>
        </Card>

        {/* Secondary Cards Column - HIDDEN on LG (Desktop), Visible on Mobile/Tablet */}
        <div className="md:col-span-4 lg:hidden flex flex-col gap-4">
           {/* Friend Match */}
           <Card
              className="flex-1 cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300 border border-blue-500/20 bg-card group/card"
              onClick={onOpenFriend}
           >
              <CardContent className="p-5 flex flex-col h-full justify-center relative">
                 <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20">
                       <Users className="size-5" />
                    </div>
                    <div>
                       <h3 className="font-bold text-lg leading-tight">Play with Friend</h3>
                       <p className="text-xs text-muted-foreground font-medium mt-0.5">Challenge a friend to a 1v1</p>
                    </div>
                 </div>
                 <div className="flex justify-end mt-4">
                    <Button size="sm" className="h-8 px-4 text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-500/20 transition-all duration-300 shadow-sm">
                       Invite / Join
                       <ArrowRight className="ml-1.5 size-3" />
                    </Button>
                 </div>
              </CardContent>
           </Card>

           {/* Solo (Career Mode) */}
           <Card 
              className="flex-1 cursor-pointer hover:border-orange-500/30 hover:bg-orange-500/5 transition-all duration-300 border border-orange-500/20 bg-card group/card" 
              onClick={() => router.push('/career')}
           >
              <CardContent className="p-5 flex flex-col h-full justify-center relative">
                 <div className="flex items-center gap-4 mb-2">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20">
                       <User className="size-5" />
                    </div>
                    <div>
                       <h3 className="font-bold text-lg leading-tight">Solo</h3>
                       <p className="text-xs text-muted-foreground font-medium mt-0.5">Progress through your journey</p>
                    </div>
                 </div>
                 <div className="flex justify-end mt-4">
                    <Button size="sm" className="h-8 px-4 text-xs font-bold bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white border border-orange-500/20 transition-all duration-300 shadow-sm">
                       Continue Career
                       <ArrowRight className="ml-1.5 size-3" />
                    </Button>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
