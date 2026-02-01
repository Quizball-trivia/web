import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/ui/utils';
import { motion } from 'framer-motion';

interface QuestionArenaProps {
  question: string;
  category: string;
  categoryIcon: string;
  difficulty: string;
}

export function QuestionArena({
  question,
  category,
  categoryIcon,
  difficulty
}: QuestionArenaProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto text-center"
    >
      <div className="relative">
         {/* Decorative Glow */}
         <div className="absolute inset-0 bg-primary/5 blur-3xl -z-10 rounded-full" />
         
         <Card className="border-2 border-primary/10 bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden">
            
            {/* Header / Metadata */}
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-white/5">
                <div className="flex items-center gap-2">
                   <Badge variant="secondary" className="bg-background/80 hover:bg-background/80 gap-1.5 pl-1.5 pr-2.5 h-6">
                      <span className="text-sm">{categoryIcon}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wide text-muted-foreground">{category}</span>
                   </Badge>
                </div>
                {/* Difficulty Dots (1-3) */}
                <div className="flex gap-0.5">
                    {[1, 2, 3].map(lvl => (
                        <div key={lvl} className={cn(
                           "h-1.5 w-4 rounded-full transition-colors",
                           // Primitive check for difficulty level string "Easy" | "Medium" | "Hard"
                           (difficulty === 'Hard' && lvl <= 3) || (difficulty === 'Medium' && lvl <= 2) || (difficulty === 'Easy' && lvl <= 1)
                              ? "bg-primary"
                              : "bg-muted" 
                        )} />
                    ))}
                </div>
            </div>

            <CardContent className="p-8 md:p-10 flex items-center justify-center min-h-[160px]">
               <h2 className="text-xl md:text-2xl font-medium leading-relaxed max-w-lg mx-auto">
                  {question}
               </h2>
            </CardContent>
            
         </Card>
      </div>
    </motion.div>
  );
}
