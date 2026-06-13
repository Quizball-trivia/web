'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

interface LoadingScreenProps {
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const LOADING_BALL_IMAGE_URL = '/assets/brand/goal-ball-small.webp';

function LoadingBallImage({ size = 64 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOADING_BALL_IMAGE_URL}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className="block object-contain"
      draggable={false}
    />
  );
}

export function LoadingScreen({
  text,
  className,
  fullScreen = true,
}: LoadingScreenProps) {
  const { t } = useLocale();
  const displayText = text ?? t('common.warmingUp');
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-surface-page-alt text-foreground',
        fullScreen
          ? 'fixed inset-0 z-50'
          : 'h-64 w-full',
        className
      )}
    >
      <div className="relative h-32 flex items-end justify-center">
        {/* Bouncing Ball */}
        <motion.div
          animate={{
            y: [0, -60, 0],
            scaleX: [1.1, 0.95, 1.1],
            scaleY: [0.9, 1.08, 0.9],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            ease: [0.33, 0, 0.67, 1],
            times: [0, 0.45, 1],
          }}
          className="relative z-10"
        >
          <LoadingBallImage size={56} />
        </motion.div>
      </div>

      {/* Shadow */}
      <motion.div
        animate={{
          scaleX: [1.2, 0.5, 1.2],
          opacity: [0.35, 0.1, 0.35],
        }}
        transition={{
          duration: 0.7,
          repeat: Infinity,
          ease: [0.33, 0, 0.67, 1],
          times: [0, 0.45, 1],
        }}
        className="w-14 h-3 rounded-[100%] bg-white/10 blur-[2px] mt-1"
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="mt-8 text-sm font-black uppercase tracking-[0.2em] text-white/40 font-fun"
      >
        {displayText}
      </motion.p>
    </div>
  );
}
