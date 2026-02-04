import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Lock, ChevronRight, Trophy, Gift } from "lucide-react";

export interface ChallengeTierProps {
  item: {
    id: string;
    title: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    status: 'locked' | 'open' | 'completed';
    rewards: string;
    requirement?: string;
  }
  onEnter: (id: string) => void;
}

export function ChallengeTierCard({ item, onEnter }: ChallengeTierProps) {
  const isLocked = item.status === 'locked';
  const isCompleted = item.status === 'completed';

  const tierColors = {
    bronze: "border-orange-700/50 bg-orange-950/10 text-orange-500",
    silver: "border-slate-400/50 bg-slate-900/10 text-slate-300",
    gold: "border-yellow-500/50 bg-yellow-900/10 text-yellow-500",
    platinum: "border-cyan-400/50 bg-cyan-950/10 text-cyan-400",
  };

  return (
    <div className={cn(
        "group relative flex items-center p-4 gap-4 rounded-xl border-2 transition-all duration-300",
        isLocked ? "border-border/50 opacity-60 bg-muted/20" : "border-border bg-card hover:border-primary/50 hover:bg-muted/50 shadow-sm hover:shadow-md hover:scale-[1.01]",
        isCompleted && "border-green-500/30 bg-green-500/5"
    )}>
       {/* Tier Indicator */}
       <div className={cn(
          "shrink-0 size-12 rounded-lg flex items-center justify-center border",
          tierColors[item.tier]
       )}>
          {isLocked ? <Lock className="size-5" /> : <Trophy className="size-5" />}
       </div>

       {/* Content */}
       <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
             <h3 className={cn("font-bold truncate", isCompleted && "text-green-500 line-through decoration-green-500/50")}>
                {item.title}
             </h3>
             {isCompleted && <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 text-[10px] h-5 px-1.5">Done</Badge>}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
             {isLocked ? (
                <span className="flex items-center gap-1.5 text-red-400 font-medium text-xs">
                   <Lock className="size-3" /> {item.requirement || "Locked"}
                </span>
             ) : (
                <span className="flex items-center gap-1.5 text-xs">
                   <Gift className="size-3 text-primary" /> {item.rewards}
                </span>
             )}
          </div>
       </div>

       {/* Action */}
       <div className="shrink-0">
          <Button 
            disabled={isLocked || isCompleted} 
            size="sm" 
            onClick={() => onEnter(item.id)}
            variant={isLocked ? "ghost" : "secondary"}
            className={cn("rounded-full size-10 p-0", !isLocked && "group-hover:bg-primary group-hover:text-primary-foreground")}
          >
             <ChevronRight className="size-5 ml-0.5" />
          </Button>
       </div>
    </div>
  );
}
