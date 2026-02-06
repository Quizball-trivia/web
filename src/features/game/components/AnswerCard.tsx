import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const ANSWER_COLORS = [
  { bg: 'bg-emerald-500', borderSide: 'border-emerald-500', borderBottom: 'border-b-emerald-600', light: 'bg-emerald-500/15', text: 'text-emerald-400' },
  { bg: 'bg-blue-500', borderSide: 'border-blue-500', borderBottom: 'border-b-blue-600', light: 'bg-blue-500/15', text: 'text-blue-400' },
  { bg: 'bg-yellow-500', borderSide: 'border-yellow-500', borderBottom: 'border-b-yellow-600', light: 'bg-yellow-500/15', text: 'text-yellow-400' },
  { bg: 'bg-purple-500', borderSide: 'border-purple-500', borderBottom: 'border-b-purple-600', light: 'bg-purple-500/15', text: 'text-purple-400' },
] as const;

interface AnswerCardProps {
  label: string;
  text: string;
  index?: number;
  isSelected?: boolean;
  opponentPicked?: boolean;
  opponentPickCorrect?: boolean;
  state?: 'default' | 'correct' | 'wrong' | 'disabled';
  onClick?: () => void;
  disabled?: boolean;
}

export function AnswerCard({
  label,
  text,
  index = 0,
  isSelected,
  opponentPicked = false,
  opponentPickCorrect,
  state = 'default',
  onClick,
  disabled,
}: AnswerCardProps) {
  const color = ANSWER_COLORS[index % ANSWER_COLORS.length];

  const getButtonClasses = () => {
    if (state === 'correct') {
      return 'bg-emerald-500/15 border-2 border-emerald-500 border-b-4 border-b-emerald-600';
    }
    if (state === 'wrong') {
      return 'bg-red-500/15 border-2 border-red-500 border-b-4 border-b-red-600 animate-[shake_0.4s_ease-in-out]';
    }
    if (state === 'disabled') {
      return 'bg-white/[0.02] border-2 border-white/5 border-b-4 border-b-white/5 opacity-40';
    }
    if (isSelected) {
      return cn('border-2 border-b-4', color.light, color.borderSide, color.borderBottom);
    }
    return 'bg-white/[0.04] border-2 border-white/10 border-b-4 border-b-white/15 hover:bg-white/[0.07] active:border-b-2 active:translate-y-[2px]';
  };

  const getLabelClasses = () => {
    if (state === 'correct') return 'bg-emerald-500 text-white';
    if (state === 'wrong') return 'bg-red-500 text-white';
    if (state === 'disabled') return 'bg-white/10 text-white/30';
    if (isSelected) return cn(color.bg, 'text-white');
    return cn(color.light, color.text);
  };

  return (
    <motion.button
      whileTap={!disabled && state === 'default' ? { scale: 0.97 } : {}}
      className={cn(
        'relative w-full text-left rounded-2xl p-3 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary font-fun',
        getButtonClasses(),
        disabled && 'cursor-not-allowed'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {opponentPicked && (
        <div
          className={cn(
            'absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide',
            opponentPickCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
          )}
        >
          Opp picked
        </div>
      )}

      <div className="flex items-center gap-3">
        {/* Label badge */}
        <div className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black transition-colors',
          getLabelClasses()
        )}>
          {label}
        </div>

        {/* Text */}
        <span className={cn(
          'text-sm font-bold flex-1 text-white',
          state === 'disabled' && 'text-white/40',
          state === 'correct' && 'text-emerald-300',
          state === 'wrong' && 'text-red-300',
        )}>
          {text}
        </span>

        {/* Result icon */}
        {state === 'correct' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0">
            <svg className="size-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </motion.div>
        )}
        {state === 'wrong' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0">
            <svg className="size-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
