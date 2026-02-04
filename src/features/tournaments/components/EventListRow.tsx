import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight, Lock, Trophy } from 'lucide-react';
import type { Tournament } from '../TournamentsScreen';

interface EventListRowProps {
  event: Tournament;
  playerRankPoints: number;
  onSelect: (event: Tournament) => void;
}

export function EventListRow({ event, playerRankPoints, onSelect }: EventListRowProps) {
  const isLocked = playerRankPoints < event.minRank;

  return (
    <div 
       role="button"
       onClick={() => onSelect(event)}
       className={`group relative grid grid-cols-12 gap-4 items-center p-4 rounded-xl border border-transparent hover:bg-card/60 hover:border-border/50 transition-all cursor-pointer ${isLocked ? 'opacity-60 grayscale-[0.5]' : ''}`}
    >
       {/* 1. Icon & Name */}
       <div className="col-span-12 md:col-span-5 flex items-center gap-4">
          <div className={`p-2.5 rounded-lg border bg-card ${isLocked ? 'border-border text-muted-foreground' : 'border-primary/20 text-primary bg-primary/5'}`}>
             {event.type === 'weekly' ? <Calendar className="size-5" /> : <Trophy className="size-5" />}
          </div>
          <div>
             <div className="flex items-center gap-2">
                <h4 className="font-bold text-base group-hover:text-primary transition-colors">{event.name}</h4>
                {isLocked && <Lock className="size-3 text-muted-foreground" />}
             </div>
             <p className="text-xs text-muted-foreground hidden md:block">{event.rewards.first} for 1st Place</p>
          </div>
       </div>

       {/* 2. Prize/Status (Hidden on mobile very small) */}
       <div className="col-span-4 md:col-span-3 hidden md:flex flex-col justify-center">
          <div className="text-sm font-medium text-yellow-500">{event.prizePool} Pool</div>
          <div className="text-xs text-muted-foreground">{event.endsIn} remaining</div>
       </div>

       {/* 3. Requirements Badge */}
       <div className="col-span-6 md:col-span-3 flex items-center">
          {isLocked ? (
             <Badge variant="outline" className="border-border text-muted-foreground font-mono text-xs">
                Requires {event.minRank} RP
             </Badge>
          ) : (
             <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                Open Entry
             </Badge>
          )}
       </div>

       {/* 4. Action Chevron */}
       <div className="col-span-6 md:col-span-1 flex justify-end">
          <ChevronRight className="size-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
       </div>
    </div>
  );
}
