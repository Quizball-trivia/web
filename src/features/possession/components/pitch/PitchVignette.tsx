'use client';

/**
 * Camera-zoom vignette overlay. Fades in while `shouldZoomToGoal` is
 * true to draw the eye toward the goal area and hide the off-screen
 * pitch edges during the close-up.
 */

import { AnimatePresence, motion } from 'motion/react';

interface PitchVignetteProps {
  visible: boolean;
  gradient: string;
}

export function PitchVignette({ visible, gradient }: PitchVignetteProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: gradient }}
        />
      )}
    </AnimatePresence>
  );
}
