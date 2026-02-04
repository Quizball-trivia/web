import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Clock, Lock, Skull } from "lucide-react";

export interface WorldEventProps {
  title: string;
  description: string;
  imageUrl?: string;
  expiryDate: Date;
  totalParticipants: number;
  maxParticipants: number;
  entryRequirement?: {
    type: 'rank' | 'rp';
    value: string | number;
    label: string;
    met: boolean;
  };
  rewards: {
    label: string;
    icon: React.ReactNode;
  }[];
  userProgress?: {
    current: number;
    total: number;
    label: string;
  };
}

export function WorldEventCard({
  title,
  description,
  expiryDate,
  totalParticipants,
  maxParticipants,
  entryRequirement,
  rewards,
  userProgress
}: WorldEventProps) {
  const isLocked = entryRequirement && !entryRequirement.met;
  const participationPercent = Math.min((totalParticipants / maxParticipants) * 100, 100);
  
  // Calculate time remaining (mock simple logic)
  const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-950/30 to-background shadow-2xl group">
      {/* Background Effect */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
      <div className="absolute -right-20 -top-20 size-64 rounded-full bg-yellow-500/10 blur-3xl animate-pulse" />
      
      <div className="relative p-6 md:p-8 flex flex-col md:flex-row gap-8">
        
        {/* Left: Content */}
        <div className="flex-1 space-y-6">
          {/* Header Badge */}
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-yellow-500/10 uppercase tracking-widest text-[10px] px-2 py-1">
                World Event
             </Badge>
             {daysLeft <= 2 && (
                <div className="flex items-center gap-1 text-red-400 text-xs font-bold animate-pulse">
                   <Clock className="size-3" /> Ends in {daysLeft}d
                </div>
             )}
          </div>

          {/* Title & Desc */}
          <div className="space-y-2">
             <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-600 drop-shadow-sm">
                {title}
             </h2>
             <p className="text-muted-foreground text-sm md:text-base max-w-lg leading-relaxed">
                {description}
             </p>
          </div>

          {/* Progress / Status */}
          <div className="space-y-3 max-w-md">
             {isLocked ? (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 flex items-center gap-3">
                   <div className="size-8 rounded bg-red-500/20 flex items-center justify-center text-red-500">
                      <Lock className="size-4" />
                   </div>
                   <div className="flex-1">
                      <div className="text-xs font-bold text-red-400 uppercase">Locked</div>
                      <div className="text-sm font-medium">Req: {entryRequirement?.label}</div>
                   </div>
                </div>
             ) : userProgress ? (
                 <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wide">
                       <span>{userProgress.label}</span>
                       <span className="text-yellow-500">{Math.floor((userProgress.current / userProgress.total) * 100)}%</span>
                    </div>
                    <Progress value={(userProgress.current / userProgress.total) * 100} className="h-2 bg-yellow-950/50" />
                    <div className="text-[10px] text-muted-foreground text-right">
                       {userProgress.current} / {userProgress.total}
                    </div>
                 </div>
             ) : (
                 <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
                       <span>Arena Capacity</span>
                       <span>{totalParticipants.toLocaleString()} / {maxParticipants.toLocaleString()}</span>
                    </div>
                    <Progress value={participationPercent} className="h-2 bg-muted/20" />
                 </div>
             )}
          </div>

          {/* Action */}
          <div className="flex items-center gap-4 pt-2">
             <Button 
                size="lg" 
                disabled={isLocked}
                className={cn(
                   "h-14 px-8 text-lg font-black uppercase tracking-wide shadow-lg transition-all",
                   isLocked 
                      ? "bg-muted text-muted-foreground" 
                      : "bg-yellow-500 hover:bg-yellow-400 text-black hover:scale-105 shadow-yellow-500/20"
                )}
             >
                {isLocked ? "Locked" : userProgress ? "Continue Quest" : "Enter Arena"}
             </Button>
             
             {/* Rewards Preview */}
             <div className="flex items-center -space-x-2">
                {rewards.map((reward, i) => (
                   <div key={i} className="size-10 rounded-full border-2 border-background bg-card flex items-center justify-center shadow-sm" title={reward.label}>
                      {reward.icon}
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right: Visual */}
        <div className="w-full md:w-1/3 flex items-center justify-center relative">
           <div className="relative size-48 md:size-64  animate-in zoom-in duration-700">
              {/* Skull Boss Icon Placeholder */}
              <div className="absolute inset-0 flex items-center justify-center text-yellow-500/20">
                 <Skull className="size-full" strokeWidth={1} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <Image
                   src="/boss-placeholder.png"
                   alt="Boss"
                   width={256}
                   height={256}
                   className="size-full object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.5)] opacity-0"
                 /> {/* Actual image would go here */}
                 <Skull className="size-32 text-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
