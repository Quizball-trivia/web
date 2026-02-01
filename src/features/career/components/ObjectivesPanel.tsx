import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Target, Trophy, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export interface StageObjective {
  id: string;
  description: string;
  isCompleted: boolean;
  reward?: string;
}

export interface ObjectivesPanelProps {
  level: {
    id: number;
    name: string;
    description: string;
    questionsCount: number;
    requiredScore: number;
    coinReward: number;
    bestScore?: number;
  };
  onStart: () => void;
  isOpen: boolean;
  objectives?: StageObjective[]; // Optional for now, can be added to data model later
}

export function ObjectivesPanel({ level, onStart, isOpen, objectives = [] }: ObjectivesPanelProps) {
  if (!isOpen) return null;

  // Mock objectives if none provided
  const displayObjectives = objectives.length > 0 ? objectives : [
    { id: '1', description: `Pass the level (Score ${level.requiredScore}+)`, isCompleted: (level.bestScore || 0) >= level.requiredScore },
    { id: '2', description: "Complete without using clues", isCompleted: false, reward: "+50 XP" },
    { id: '3', description: "Answer 3 questions in < 5s", isCompleted: false, reward: "Rare Badge" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="md:h-auto h-full flex flex-col bg-card/95 backdrop-blur-md md:rounded-2xl border-l md:border-2 border-border/50  overflow-hidden"
    >
      {/* Header with decorative header image substitute or gradient */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 via-purple-500/10 to-blue-500/20 p-6 flex flex-col justify-end">
        <div className="absolute top-4 right-4">
           <Badge variant="secondary" className="bg-background/50 backdrop-blur">
              Level {level.id}
           </Badge>
        </div>
        <h2 className="text-2xl font-black text-foreground leading-none">{level.name}</h2>
        <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wide">Mission Objectives</p>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          
          {/* Main Goal Section */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Target className="size-4" />
                <span>Completion Criteria</span>
             </div>
             <div className="p-4 rounded-xl bg-background/50 border border-border flex items-center justify-between">
                <div>
                   <div className="text-xs text-muted-foreground">Required Score</div>
                   <div className="text-xl font-bold">{level.requiredScore} <span className="text-xs font-normal text-muted-foreground">/ {level.questionsCount}</span></div>
                </div>
                <div className="h-8 w-px bg-border mx-2" />
                <div>
                   <div className="text-xs text-muted-foreground">Reward</div>
                   <div className="text-xl font-bold text-yellow-500 flex items-center gap-1">
                      <span className="text-base">💰</span> {level.coinReward}
                   </div>
                </div>
             </div>
          </div>

          {/* Quests List */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
                <Sparkles className="size-4" />
                <span>Side Quests</span>
             </div>
             
             <div className="space-y-2">
                {displayObjectives.map((obj) => (
                   <div 
                      key={obj.id} 
                      className={`group flex items-start gap-3 p-3 rounded-lg border transition-all ${
                         obj.isCompleted 
                            ? "bg-green-500/10 border-green-500/30" 
                            : "bg-secondary/20 border-border/50 hover:bg-secondary/40"
                      }`}
                   >
                      <div className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                         obj.isCompleted ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground/30"
                      }`}>
                         {obj.isCompleted && <Trophy className="size-3" />}
                      </div>
                      <div className="flex-1">
                         <p className={`text-sm ${obj.isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {obj.description}
                         </p>
                         {obj.reward && !obj.isCompleted && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-yellow-500 font-bold mt-1 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                               <Crown className="size-2.5" />
                               {obj.reward}
                            </span>
                         )}
                      </div>
                   </div>
                ))}
             </div>
          </div>
          
          {/* Tips or Lore */}
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-muted-foreground italic">
             <Clock className="size-3 inline mr-1 text-blue-400" />
             Time Attack Mode: Answer quickly to earn bonus score multiplier!
          </div>

        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background/50 backdrop-blur">
        <Button 
           size="lg" 
           className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-bold shadow-lg shadow-primary/25"
           onClick={onStart}
        >
           <Zap className="size-4 mr-2 fill-white" />
           Start Challenge
        </Button>
      </div>
    </motion.div>
  );
}
