import { StageCard } from './StageCard';
import { cn } from '@/components/ui/utils';

export interface CareerLevel {
  id: number;
  name: string;
  stage: string;
  description: string;
  questionsCount: number;
  requiredScore: number;
  coinReward: number;
  icon: string;
  gradient: string;
  borderColor?: string;
  bgColor?: string;
}

interface CareerPathProps {
  levels: CareerLevel[];
  completedLevels: Set<number>;
  levelScores: Map<number, number>;
  currentLevelId: number;
  onLevelSelect: (level: CareerLevel) => void;
  selectedLevelId: number | null;
}

export function CareerPath({ 
  levels, 
  completedLevels, 
  levelScores, 
  currentLevelId,
  selectedLevelId,
  onLevelSelect 
}: CareerPathProps) {
  
  // Calculate path positions dynamically based on items
  // We'll alternate left/right positions for a "winding path" effect
  
  return (
    <div className="relative w-full max-w-2xl mx-auto py-10 px-4">
       
       {/* Central Path Line */}
       <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-gradient-to-b from-transparent via-primary/20 to-transparent rounded-full" />
       
       {/* Animated Progress Line (Fills down to current level) */}
       {/* Note: In a real implementation we'd calculate exact height. 
           For now, we can use a gradient mask or similar simple approach */}
       
       <div className="space-y-12 relative z-10">
          {levels.map((level, index) => {
             const isCompleted = completedLevels.has(level.id);
             const isUnlocked = level.id === 1 || completedLevels.has(level.id - 1);
             const isCurrent = level.id === currentLevelId; // Next playable level
             const isActive = selectedLevelId === level.id;
             
             // Alternating layout: even left, odd right
             const isLeft = index % 2 === 0;

             // Status logic
             let status: 'locked' | 'available' | 'completed' | 'active' = 'locked';
             if (isCompleted) status = 'completed';
             else if (isCurrent) status = 'active'; // The one to play next
             else if (isUnlocked) status = 'available'; // Replayable or skipped? (Usually linear, so available = completed or active)

             // Override visual status for locked items
             if (!isUnlocked) status = 'locked';

             return (
                <div key={level.id} className={cn(
                   "flex items-center w-full",
                   isLeft ? "justify-end md:pr-12" : "justify-start md:pl-12 flex-row-reverse"
                )}>
                   
                   {/* Timeline Connector Dot */}
                   <div className={cn(
                      "absolute left-1/2 -translate-x-1/2 size-4 rounded-full border-4 border-background z-20 transition-colors duration-500",
                      isCompleted ? "bg-green-500" : isCurrent ? "bg-primary animate-pulse" : "bg-muted"
                   )} />

                   {/* The Card */}
                   <div className={cn(
                      "w-full md:w-[45%] transition-all duration-500",
                      // Add some entrance animation delay based on index
                   )}>
                      <StageCard
                         {...level}
                         status={status}
                         isActive={isActive || (isCurrent && selectedLevelId === null && !isCompleted)}
                         onClick={() => onLevelSelect(level)}
                         bgGradient={`to-${level.gradient.split('to-')[1]}`} // Extract color from prop if possible, or simplified
                      />
                   </div>

                </div>
             );
          })}
       </div>

    </div>
  );
}
