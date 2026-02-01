import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/components/ui/utils';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'rp' | 'xp' | 'speed' | 'score';
  side: 'player' | 'opponent';
}

interface MatchToastProps {
  toasts: ToastMessage[];
}

export function MatchToastContainer({ toasts }: MatchToastProps) {
  const playerToasts = toasts.filter(t => t.side === 'player');
  const opponentToasts = toasts.filter(t => t.side === 'opponent');

  return (
    <>
      <div className="fixed top-24 left-4 md:left-12 z-50 flex flex-col gap-2 pointer-events-none">
         <AnimatePresence>
            {playerToasts.map(toast => (
               <ToastItem key={toast.id} toast={toast} align="left" />
            ))}
         </AnimatePresence>
      </div>

      <div className="fixed top-24 right-4 md:right-12 z-50 flex flex-col gap-2 pointer-events-none">
         <AnimatePresence>
            {opponentToasts.map(toast => (
               <ToastItem key={toast.id} toast={toast} align="right" />
            ))}
         </AnimatePresence>
      </div>
    </>
  );
}

function ToastItem({ toast, align }: { toast: ToastMessage; align: 'left' | 'right' }) {
   const colors = {
      rp: "bg-purple-500/90 text-white shadow-purple-500/40",
      xp: "bg-blue-500/90 text-white shadow-blue-500/40",
      speed: "bg-yellow-500/90 text-white shadow-yellow-500/40",
      score: "bg-green-500/90 text-white shadow-green-500/40 font-bold text-lg" // Round win
   };
   
   return (
      <motion.div
         initial={{ opacity: 0, x: align === 'left' ? -20 : 20, y: 10 }}
         animate={{ opacity: 1, x: 0, y: 0 }}
         exit={{ opacity: 0, y: -20 }}
         className={cn(
            "px-4 py-1.5 rounded-full shadow-lg backdrop-blur text-sm font-semibold tracking-wide",
            colors[toast.type]
         )}
      >
         {toast.text}
      </motion.div>
   );
}
