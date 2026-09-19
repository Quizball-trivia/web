import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Coins, TrendingUp } from 'lucide-react';

interface EventsStatusStripProps {
  playerCoins: number;
  playerRankPoints: number;
  playerTier: string;
}

export function EventsStatusStrip({ playerCoins, playerRankPoints, playerTier }: EventsStatusStripProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-4 flex items-center gap-4">
           <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <Coins className="size-5" />
           </div>
           <div>
              <div className="text-sm text-muted-foreground">Balance</div>
              <div className="text-xl font-bold">{formatNumber(playerCoins)} Coins</div>
           </div>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-4 flex items-center gap-4">
           <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="size-5" />
           </div>
           <div>
              <div className="text-sm text-muted-foreground">Rank Points</div>
              <div className="text-xl font-bold">{playerRankPoints} RP</div>
           </div>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border/50">
        <CardContent className="p-4 flex items-center gap-4">
           <div className="size-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Badge variant="outline" className="border-0 bg-transparent p-0">
                 {playerTier === 'Bronze' && '🥉'}
                 {playerTier === 'Silver' && '🥈'}
                 {playerTier === 'Gold' && '🥇'}
                 {playerTier === 'Platinum' && '💎'}
                 {playerTier === 'Diamond' && '💠'}
              </Badge>
           </div>
           <div>
              <div className="text-sm text-muted-foreground">Division</div>
              <div className="text-xl font-bold">{playerTier}</div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
