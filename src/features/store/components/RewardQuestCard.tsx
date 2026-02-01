import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/components/ui/utils";
import { Check, Clock, Coins, Play, RefreshCw } from "lucide-react";

export interface RewardQuestProps {
  id: string;
  title: string;
  description: string;
  rewardAmount: number;
  type: 'ad' | 'daily' | 'social';
  status: 'ready' | 'cooldown' | 'completed';
  cooldownTime?: string;
  progress?: number;
}

export function RewardQuestCard({ title, description, rewardAmount, type, status, cooldownTime, progress }: RewardQuestProps) {
  const isReady = status === 'ready';
  const isCooldown = status === 'cooldown';

  return (
    <div className={cn(
       "relative flex flex-col p-4 rounded-xl border-2 transition-all bg-card",
       isReady ? "border-yellow-500/30 hover:border-yellow-500 hover:bg-muted/30 hover:scale-[1.02] shadow-sm cursor-pointer" : "border-border opacity-70"
    )}>
       {/* Reward Tag */}
       <div className="absolute top-3 right-3 flex items-center gap-1 font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded text-xs">
          <Coins className="size-3 fill-current" /> +{rewardAmount}
       </div>

       {/* Icon/Type */}
       <div className="mb-3">
          <div className={cn(
             "size-10 rounded-lg flex items-center justify-center border",
             type === 'ad' ? "bg-blue-500/10 border-blue-500/30 text-blue-500" : 
             type === 'daily' ? "bg-green-500/10 border-green-500/30 text-green-500" :
             "bg-purple-500/10 border-purple-500/30 text-purple-500"
          )}>
             {type === 'ad' ? <Play className="size-5 fill-current" /> :
              type === 'daily' ? <RefreshCw className="size-5" /> :
              <Clock className="size-5" />}
          </div>
       </div>

       {/* Content */}
       <div className="flex-1 space-y-1 mb-4">
          <h4 className="font-bold leading-none">{title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
       </div>

       {/* Action */}
       {isReady ? (
          <Button size="sm" className="w-full font-bold bg-secondary hover:bg-secondary/80 text-foreground">
             {type === 'ad' ? "Watch & Claim" : "Claim"}
          </Button>
       ) : isCooldown ? (
          <div className="w-full h-9 flex items-center justify-center text-xs font-mono text-muted-foreground bg-muted rounded">
             {cooldownTime}
          </div>
       ) : (
          <div className="w-full h-9 flex items-center justify-center gap-2 text-xs font-bold text-green-500 bg-green-500/10 rounded border border-green-500/20">
             <Check className="size-3" /> Completed
          </div>
       )}

       {/* Progress Bar (Optional) */}
       {progress !== undefined && status !== 'completed' && (
          <div className="mt-3">
             <Progress value={progress} className="h-1 bg-muted" />
          </div>
       )}
    </div>
  );
}
