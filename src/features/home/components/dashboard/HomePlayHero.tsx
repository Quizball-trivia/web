import { useRouter } from 'next/navigation';
import { Trophy, Users, User, Gamepad2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getRankInfo, getDivisionColor } from '@/utils/rankSystem';
import type { PlayerStats } from '@/types/game';

interface HomePlayHeroProps {
  playerStats: PlayerStats;
}

export function HomePlayHero({ playerStats }: HomePlayHeroProps) {
  const router = useRouter();
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
        <Card className="md:col-span-8 lg:col-span-7 relative overflow-hidden border-2 hover:border-primary/50 transition-all group cursor-pointer bg-gradient-to-br from-card to-card/50" onClick={() => router.push('/play')}>
           {/* Background decorative elements */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
           
           <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
              <div className="flex justify-between items-start">
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="p-3 rounded-xl bg-primary/20 text-primary">
                          <Trophy className="size-8" />
                       </div>
                       <div>
                          <h2 className="text-2xl font-bold">Play Ranked</h2>
                          <p className="text-muted-foreground">+5–15 RP per win</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-end">
                    <Badge variant="outline" className={`${divisionColors.text} ${divisionColors.border} bg-background/50 backdrop-blur px-3 py-1`}>
                       {rankInfo.division}
                    </Badge>
                 </div>
              </div>

              <div className="mt-8 space-y-3">
                 <div className="flex justify-between text-sm font-medium">
                    <span>Current Progress</span>
                    <span className="text-primary">{rankInfo.progress}%</span>
                 </div>
                 <Progress value={rankInfo.progress} className="h-2.5 bg-background/50" />
                 <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{playerStats.rankPoints} RP</span>
                    <span>{rankInfo.maxRP} RP to next division</span>
                 </div>
              </div>

              <div className="mt-8">
                 <Button size="lg" className="w-full md:w-auto text-lg px-8 py-6 shadow-xl shadow-primary/20 group-hover:scale-[1.02] transition-transform">
                    <Gamepad2 className="mr-2 size-5" />
                    Play Ranked Match
                 </Button>
              </div>
           </CardContent>
        </Card>

        {/* Secondary Cards Column */}
        <div className="md:col-span-4 lg:col-span-5 flex flex-col gap-4">
           {/* Friend Match */}
           <Card className="flex-1 cursor-pointer hover:bg-accent/5 transition-colors border-border/60" onClick={() => router.push('/play')}>
              <CardContent className="p-6 flex flex-col h-full justify-center">
                 <div className="flex items-center gap-4 mb-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                       <Users className="size-6" />
                    </div>
                    <div>
                       <h3 className="font-bold text-lg">Play with Friend</h3>
                       <p className="text-sm text-muted-foreground">Challenge a friend to a 1v1</p>
                    </div>
                 </div>
                 <Button variant="ghost" className="w-full justify-between mt-2 group">
                    Invite / Join
                    <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                 </Button>
              </CardContent>
           </Card>

           {/* Solo Practice */}
           <Card className="flex-1 cursor-pointer hover:bg-accent/5 transition-colors border-border/60" onClick={() => router.push('/play')}>
              <CardContent className="p-6 flex flex-col h-full justify-center">
                 <div className="flex items-center gap-4 mb-3">
                    <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-500">
                       <User className="size-6" />
                    </div>
                    <div>
                       <h3 className="font-bold text-lg">Solo Practice</h3>
                       <p className="text-sm text-muted-foreground">Sharpen your skills offline</p>
                    </div>
                 </div>
                 <Button variant="ghost" className="w-full justify-between mt-2 group">
                    Start Practice
                    <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
                 </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
