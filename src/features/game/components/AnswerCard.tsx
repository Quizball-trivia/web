import { motion } from 'framer-motion';
import { cn } from '@/components/ui/utils';

interface AnswerCardProps {
  label: string;
  text: string;
  isSelected?: boolean;
  state?: 'default' | 'correct' | 'wrong' | 'disabled';
  onClick?: () => void;
  disabled?: boolean;
}

export function AnswerCard({
  label,
  text,
  isSelected,
  state = 'default',
  onClick,
  disabled
}: AnswerCardProps) {
  
  const variants = {
    default: "bg-card hover:border-primary/50 hover:bg-muted/50 border-border",
    correct: "bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_20px_-5px_rgba(34,197,94,0.4)]",
    wrong: "bg-red-500/20 border-red-500 text-red-500 opacity-80",
    disabled: "bg-muted/30 border-transparent opacity-40 cursor-not-allowed"
  };

  const labelVariants = {
    default: "bg-muted text-muted-foreground",
    correct: "bg-green-500 text-white",
    wrong: "bg-red-500 text-white",
    disabled: "bg-muted text-muted-foreground"
  };

  // If selected but not yet resolved, show active state
  const activeClass = isSelected && state === 'default' 
     ? "border-primary bg-primary/10 ring-1 ring-primary" 
     : variants[state];

  return (
    <motion.button
      whileHover={!disabled && state === 'default' ? { scale: 1.02 } : {}}
      whileTap={!disabled && state === 'default' ? { scale: 0.98 } : {}}
      className={cn(
        "relative w-full text-left rounded-xl border-2 p-1 transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-primary",
        activeClass
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <div className={cn(
          "flex items-center gap-4 p-3 rounded-lg bg-background/40 backdrop-blur-sm h-full w-full",
          state !== 'default' && "bg-transparent"
      )}>
         {/* Label (A, B, C, D) */}
         <div className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors",
            labelVariants[state],
            isSelected && state === 'default' && "bg-primary text-primary-foreground"
         )}>
            {label}
         </div>

         {/* Text */}
         <span className={cn(
            "text-base font-medium flex-1",
            state === 'correct' && "font-bold",
         )}>
            {text}
         </span>

         {/* Reveal Icon */}
         {state === 'correct' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0 text-green-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </motion.div>
         )}
         {state === 'wrong' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0 text-red-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </motion.div>
         )}
      </div>
    </motion.button>
  );
}
