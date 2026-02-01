import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/components/ui/utils";
import { ArrowUp, Lock, Check, MapPin } from "lucide-react";

interface QuestNode {
  id: string;
  label: string;
  subLabel: string;
  status: 'completed' | 'active' | 'locked';
  progress?: number; // 0-100
}

interface QuestPathWidgetProps {
  steps: QuestNode[];
}

export function QuestPathWidget({ steps }: QuestPathWidgetProps) {
  return (
    <div className="w-full bg-card/50 border-y border-border backdrop-blur-sm">
       <div className="container mx-auto max-w-5xl py-4">
          <div className="flex items-center gap-2 mb-3 px-1 text-xs font-bold uppercase text-muted-foreground tracking-widest">
             <MapPin className="size-3" /> Your Path
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {steps.map((step, i) => {
                const isActive = step.status === 'active';
                const isCompleted = step.status === 'completed';
                const isLocked = step.status === 'locked';

                return (
                   <div 
                      key={step.id}
                      className={cn(
                        "relative flex items-center gap-3 p-3 rounded-xl border transition-all",
                        isActive ? "bg-primary/10 border-primary shadow-sm" : 
                        isCompleted ? "bg-card border-border opacity-60" :
                        "bg-muted/10 border-border border-dashed opacity-50"
                      )}
                   >
                      {/* Icon */}
                      <div className={cn(
                         "size-10 rounded-full flex items-center justify-center border-2 shrink-0",
                         isActive ? "bg-primary text-primary-foreground border-primary" :
                         isCompleted ? "bg-green-500 text-white border-green-500" :
                         "bg-muted text-muted-foreground border-transparent"
                      )}>
                         {isCompleted ? <Check className="size-5" /> : 
                          isLocked ? <Lock className="size-4" /> : 
                          <ArrowUp className="size-5 animate-bounce" />}
                      </div>

                      <div className="flex-1 min-w-0">
                         <div className="text-sm font-bold truncate">{step.label}</div>
                         <div className="text-xs text-muted-foreground truncate">{step.subLabel}</div>
                         
                         {isActive && step.progress !== undefined && (
                            <div className="mt-2 h-1.5 w-full bg-background rounded-full overflow-hidden">
                               <div className="h-full bg-primary transition-all" style={{ width: `${step.progress}%` }} />
                            </div>
                         )}
                      </div>
                   </div>
                );
             })}
          </div>
       </div>
    </div>
  );
}
