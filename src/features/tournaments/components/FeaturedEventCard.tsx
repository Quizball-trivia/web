import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, Trophy, Coins, Lock, Zap } from 'lucide-react';

export interface Tournament {
    id: string;
    name: string;
    type: 'weekly' | 'monthly' | 'seasonal';
    prizePool: string;
    entryCoins: number;
    minRank: number;
    minRankTier: string;
    participants: number;
    maxParticipants: number;
    endsIn: string;
    status: 'active' | 'upcoming' | 'ended';
    rewards: {
      first: string;
      second: string;
      third: string;
    };
}

interface FeaturedEventCardProps {
  event: Tournament;
  playerRankPoints: number;
  playerCoins: number;
  onEnter: (event: Tournament) => void;
}

export function FeaturedEventCard({ event, playerRankPoints, playerCoins, onEnter }: FeaturedEventCardProps) {
  const isRankLocked = playerRankPoints < event.minRank;
  const isCoinsLocked = playerCoins < event.entryCoins;
  const isLocked = isRankLocked || isCoinsLocked;
  
  const participationPercentage = (event.participants / event.maxParticipants) * 100;
  
  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="relative group">
       {/* Glow Effect */}
       <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/20 to-purple-600/20 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
       
       <Card className="relative border-2 border-primary/20 bg-card overflow-hidden">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />

          <CardContent className="relative p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
             
             {/* Left: Info */}
             <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                   <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 uppercase tracking-widest text-[10px] font-bold px-2 py-0.5">
                      Featured Event
                   </Badge>
                   <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                      <Clock className="size-3.5" />
                      <span>Ends in {event.endsIn}</span>
                   </div>
                </div>

                <div>
                   <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic">
                      {event.name}
                   </h2>
                   <p className="text-muted-foreground mt-1 max-w-lg">
                      Compete for a share of the <span className="text-yellow-500 font-bold">{event.prizePool}</span> prize pool. Top 3 players win exclusive rewards.
                   </p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm mt-4">
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border">
                      <Trophy className="size-4 text-purple-400" />
                      <span className="font-medium">1st: {event.rewards.first}</span>
                   </div>
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border">
                      <Coins className="size-4 text-yellow-500" />
                      <span className="font-medium">Entry: {formatNumber(event.entryCoins)}</span>
                   </div>
                </div>
             </div>

             {/* Right: Action & Progress */}
             <div className="w-full md:w-80 shrink-0 space-y-6 bg-card/50 p-6 rounded-xl border border-border/50 backdrop-blur-sm">
                
                {/* Progress Bar */}
                <div className="space-y-2">
                   <div className="flex justify-between text-xs font-medium">
                      <span className="text-muted-foreground">Registration Closing</span>
                      <span className={participationPercentage > 90 ? "text-red-500" : "text-primary"}>
                         {participationPercentage.toFixed(0)}% Full
                      </span>
                   </div>
                   <Progress value={participationPercentage} className="h-2" />
                   <div className="text-xs text-muted-foreground text-center">
                      {formatNumber(event.participants)} / {formatNumber(event.maxParticipants)} Players Registered
                   </div>
                </div>

                {/* Requirements / CTA */}
                <div className="space-y-3">
                   {isLocked ? (
                      <div className="space-y-3">
                         {isRankLocked && (
                            <div className="flex items-center justify-between text-sm p-2 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                               <span className="flex items-center gap-2"><Lock className="size-3" /> Minimum Rank</span>
                               <span className="font-bold">{event.minRank} RP</span>
                            </div>
                         )}
                         {isCoinsLocked && (
                            <div className="flex items-center justify-between text-sm p-2 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                               <span className="flex items-center gap-2"><Lock className="size-3" /> Entry Fee</span>
                               <span className="font-bold">{formatNumber(event.entryCoins)} Coins</span>
                            </div>
                         )}
                         <Button disabled className="w-full" variant="secondary">
                            <Lock className="size-4 mr-2" /> 
                            {isRankLocked ? `Reach ${event.minRank} RP to Unlock` : 'Insufficient Coins'}
                         </Button>
                      </div>
                   ) : (
                      <Button onClick={() => onEnter(event)} className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
                         <Zap className="size-5 mr-2 fill-current" />
                         Enter Tournament
                      </Button>
                   )}
                </div>
             </div>

          </CardContent>
       </Card>
    </div>
  );
}
