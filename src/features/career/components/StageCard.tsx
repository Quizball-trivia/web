import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Lock, CheckCircle2, Star, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export interface StageCardProps {
  name: string;
  stage: string;
  description: string;
  icon: string;
  status: 'locked' | 'available' | 'completed' | 'active';
  isActive: boolean;
  stars?: number;
  questionsCount: number;
  onClick: () => void;
  bgGradient?: string;
}

export function StageCard({
  name,
  stage,
  icon,
  status,
  isActive,
  stars = 0,
  questionsCount,
  onClick,
  bgGradient = "from-primary/20 to-primary/5",
}: StageCardProps) {
  const isLocked = status === 'locked';
  const isCompleted = status === 'completed';

  return (
    <motion.div
      onClick={!isLocked ? onClick : undefined}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: isActive ? 1.05 : 1, 
        opacity: isLocked ? 0.6 : 1,
        y: isActive ? -5 : 0
      }}
      whileHover={!isLocked ? { scale: isActive ? 1.05 : 1.02 } : {}}
      className={cn(
        "relative w-full max-w-sm rounded-2xl overflow-hidden border-2 transition-all duration-300",
        isActive 
          ? "border-primary shadow-[0_0_30px_-5px_hsl(var(--primary)/0.5)] z-10" 
          : isLocked 
            ? "border-muted bg-muted/20 cursor-not-allowed" 
            : "border-primary/20 hover:border-primary/40 cursor-pointer bg-card/60 backdrop-blur-sm"
      )}
    >
      {/* Background Gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        isActive ? bgGradient : isLocked ? "from-gray-900 to-gray-800" : bgGradient
      )} />

      <div className="relative p-5 flex flex-col items-center text-center">
        {/* Stage Icon */}
        <div className={cn(
          "size-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-lg transition-transform duration-500",
          isActive ? "bg-background ring-4 ring-primary/20 scale-110" : "bg-background/80"
        )}>
          {isLocked ? <Lock className="size-6 text-muted-foreground" /> : icon}
          
          {/* Completed Checkmark */}
          {isCompleted && (
            <div className="absolute -top-1 -right-1 size-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-background animate-in zoom-in">
              <CheckCircle2 className="size-3 text-white stroke-[4]" />
            </div>
          )}
        </div>

        {/* Labels */}
        <div className="space-y-1 mb-4">
          <div className="flex items-center justify-center gap-2">
            <h3 className={cn("font-bold text-lg", isLocked && "text-muted-foreground")}>
              {name}
            </h3>
            {isActive && (
              <Badge className="bg-primary text-primary-foreground animate-pulse text-[10px] py-0 h-5">
                current
              </Badge>
            )}
          </div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {stage}
          </p>
        </div>

        {/* Stats / Action */}
        {!isLocked && (
          <div className="w-full flex items-center justify-between border-t border-white/10 pt-3 mt-1">
            {isCompleted ? (
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "size-4",
                      s <= stars ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            ) : (
                <div className="text-xs text-muted-foreground">
                    {questionsCount} Questions
                </div>
            )}

            <div className={cn(
              "flex items-center gap-1 text-xs font-bold transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              {isCompleted ? "REPLAY" : "START"} 
              <ChevronRight className="size-3" />
            </div>
          </div>
        )}
      </div>

      {/* Active Glow Overlay (Pulsing) */}
      {isActive && (
        <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
      )}
    </motion.div>
  );
}
