import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const ANSWER_COLORS = [
  { solid: '#38B60E', soft: 'rgba(56,182,14,0.12)', text: '#7BDA1A' },
  { solid: '#1CB0F6', soft: 'rgba(28,176,246,0.12)', text: '#5DC9FF' },
  { solid: '#FFE500', soft: 'rgba(255,229,0,0.12)', text: '#FFE500' },
  { solid: '#CE82FF', soft: 'rgba(206,130,255,0.14)', text: '#D8B8FF' },
] as const;

const CORRECT = '#38B60E';
const WRONG = '#FF4B4B';

interface AnswerCardProps {
  label: string;
  text: string;
  index?: number;
  isSelected?: boolean;
  opponentPicked?: boolean;
  opponentPickCorrect?: boolean;
  state?: 'default' | 'correct' | 'wrong' | 'disabled';
  fadeOut?: boolean;
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
  fadeOut = false,
  onClick,
  disabled,
}: AnswerCardProps) {
  const color = ANSWER_COLORS[index % ANSWER_COLORS.length];

  // Compute button background + label background using inline styles
  // (no chunky border-b-4, no nested borders — flat solid surfaces).
  let buttonStyle: React.CSSProperties;
  let labelStyle: React.CSSProperties;
  let textColorClass = 'text-white';

  if (state === 'correct') {
    buttonStyle = { backgroundColor: CORRECT, boxShadow: '0 0 32px rgba(56,182,14,0.35)' };
    labelStyle = { backgroundColor: '#FFFFFF', color: CORRECT };
  } else if (state === 'wrong') {
    buttonStyle = { backgroundColor: WRONG };
    labelStyle = { backgroundColor: '#FFFFFF', color: WRONG };
  } else if (state === 'disabled') {
    buttonStyle = { backgroundColor: 'rgba(255,255,255,0.03)' };
    labelStyle = { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' };
    textColorClass = 'text-white/40';
  } else if (isSelected) {
    buttonStyle = { backgroundColor: color.solid };
    labelStyle = { backgroundColor: '#FFFFFF', color: color.solid };
  } else {
    buttonStyle = { backgroundColor: 'rgba(255,255,255,0.04)' };
    labelStyle = { backgroundColor: color.soft, color: color.text };
  }

  const shouldFadeAway = fadeOut && state !== 'correct';

  return (
    <motion.button
      whileTap={!disabled && state === 'default' ? { scale: 0.97 } : {}}
      animate={
        shouldFadeAway
          ? {
              opacity: [1, 0.5, 0],
              filter: ['blur(0px)', 'blur(2px)', 'blur(4px)'],
              scale: [1, 0.96, 0.88],
            }
          : { opacity: 1, filter: 'blur(0px)', scale: 1 }
      }
      transition={shouldFadeAway ? { duration: 0.3, ease: 'easeOut' } : { duration: 0.2 }}
      className={cn(
        'relative h-full w-full overflow-hidden rounded-[10px] p-4 text-left font-fun outline-none transition-[background-color,box-shadow,transform] duration-150 active:translate-y-[2px] focus-visible:ring-2 focus-visible:ring-white/40 min-h-[88px]',
        disabled && 'cursor-not-allowed',
      )}
      style={buttonStyle}
      onClick={onClick}
      disabled={disabled}
    >
      {/* Player's pick notch */}
      {isSelected && (state === 'correct' || state === 'wrong') && (
        <motion.div
          initial={{ x: -14, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="absolute left-0 top-1/2 flex h-10 w-[6px] -translate-y-1/2 items-center justify-center rounded-r-md"
          style={{ backgroundColor: '#FFFFFF' }}
        />
      )}
      {/* Opponent's pick notch */}
      {opponentPicked && opponentPickCorrect !== undefined && (
        <motion.div
          initial={{ x: 14, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="absolute right-0 top-1/2 flex h-10 w-[6px] -translate-y-1/2 items-center justify-center rounded-l-md"
          style={{
            backgroundColor: opponentPickCorrect ? CORRECT : WRONG,
          }}
        />
      )}

      <div className="flex h-full items-center gap-3">
        {/* Label badge */}
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-[8px] text-base font-black"
          style={labelStyle}
        >
          {label}
        </div>

        {/* Text */}
        <span
          className={cn(
            'flex-1 text-sm font-black uppercase leading-tight tracking-wide md:text-base',
            textColorClass,
          )}
        >
          {text}
        </span>
      </div>
    </motion.button>
  );
}
